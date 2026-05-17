// Initialize Swiper
let swiper;
let currentVideoSlide = null;

// Global variables
let tripData = {};
let currentTrip = {};
let tourTypes = {};
let selectedTripType = "";
let iti; // For phone input
const refNumber = generateReference();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_ADULT = 2;
const MAX_TOTAL_INFANTS = 10;
const FIXED_FEE = 3; // Fixed 3 EGP fee
const TAX_RATE = 0.03; // 3% tax
const TAX_ON_TAX_RATE = 0.14; // 14% on the 3%
let currentStep = 0;
let currentTotalPriceEGP = 0;

// ========================================
// CURRENCY INTEGRATION WITH HEADER
// ========================================

// Get current currency from header system
function getCurrentCurrency() {
    if (window.SharmCurrency && window.SharmCurrency.get) {
        return window.SharmCurrency.get();
    }
    return 'EGP';
}

// Get exchange rates from header system
function getExchangeRates() {
    if (window.SharmCurrency && window.SharmCurrency.rates) {
        return window.SharmCurrency.rates;
    }
    return { USD: 50.5, EUR: 55.0, GBP: 65.0 };
}

// Format price based on selected currency
function formatPriceWithCurrency(priceEGP) {
    var currency = getCurrentCurrency();
    
    if (currency === 'EGP') {
        return Math.round(priceEGP) + ' EGP';
    }
    
    var rates = getExchangeRates();
    if (rates && rates[currency]) {
        var converted = priceEGP * rates[currency];
        var symbol = '';
        if (currency === 'USD') symbol = '$';
        else if (currency === 'EUR') symbol = '€';
        else if (currency === 'GBP') symbol = '£';
        else return Math.round(priceEGP) + ' EGP';
        
        return symbol + converted.toFixed(2);
    }
    
    return Math.round(priceEGP) + ' EGP';
}

// Update ALL price displays on the page
function updateAllPriceDisplays() {
    var totalPrice = calculateTotalWithTaxes();
    currentTotalPriceEGP = totalPrice;
    
    // 1. Update main tour price element
    var tourPriceEl = document.getElementById('tourPrice');
    if (tourPriceEl) {
        tourPriceEl.setAttribute('data-price-egp', totalPrice);
        tourPriceEl.innerHTML = formatPriceWithCurrency(totalPrice);
    }
    
    // 2. Update total price display in booking summary
    var totalDisplayEl = document.getElementById('totalPriceDisplay');
    if (totalDisplayEl) {
        totalDisplayEl.setAttribute('data-price-egp', totalPrice);
        totalDisplayEl.innerHTML = formatPriceWithCurrency(totalPrice);
    }
    
    // 3. Update price tag on swiper slide image
    var priceTag = document.querySelector('.price-tag');
    if (priceTag) {
        priceTag.setAttribute('data-price-egp', totalPrice);
        priceTag.innerHTML = formatPriceWithCurrency(totalPrice);
    }
    
    // 4. Update trip type dropdown options prices
    if (tourTypes && Object.keys(tourTypes).length > 0) {
        var tripTypeSelect = document.getElementById('tripType');
        if (tripTypeSelect && tripTypeSelect.options) {
            var currentSelection = tripTypeSelect.value;
            
            for (var i = 0; i < tripTypeSelect.options.length; i++) {
                var opt = tripTypeSelect.options[i];
                var optValue = opt.value;
                if (optValue && tourTypes[optValue]) {
                    var priceEGP = parseInt(tourTypes[optValue]);
                    var formattedPrice = formatPriceWithCurrency(priceEGP);
                    opt.textContent = optValue + ' - ' + formattedPrice + ' (per person)';
                }
            }
            
            tripTypeSelect.value = currentSelection;
        }
    }
    
    console.log('Prices updated to:', getCurrentCurrency(), 'Total EGP:', totalPrice);
}

// Listen for currency changes from header
function listenToCurrencyChanges() {
    window.addEventListener('currencyChanged', function(event) {
        console.log('Currency changed event received:', event.detail);
        updateAllPriceDisplays();
        
        // Force swiper to update if needed
        setTimeout(function() {
            if (swiper) swiper.update();
        }, 100);
    });
}

// Initialize currency integration
function initCurrencyIntegration() {
    // Check if header currency system is already available
    if (window.SharmCurrency && window.SharmCurrency.get) {
        console.log('Currency system available. Current currency:', getCurrentCurrency());
        listenToCurrencyChanges();
        updateAllPriceDisplays();
        return;
    }
    
    // Wait for header currency system to be ready
    var checkInterval = setInterval(function() {
        if (window.SharmCurrency && window.SharmCurrency.get) {
            clearInterval(checkInterval);
            console.log('Currency system connected. Current currency:', getCurrentCurrency());
            listenToCurrencyChanges();
            updateAllPriceDisplays();
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(function() {
        clearInterval(checkInterval);
        if (!window.SharmCurrency) {
            console.log('Currency system not available, using EGP only');
            updateAllPriceDisplays();
        }
    }, 5000);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Get trip name from URL parameter
function getTripIdFromURL() {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('trip-id');
}
var tripPName = getTripIdFromURL();

function generateReference() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var result = '';
    for (var i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'DS_' + result;
}

function sanitizeInput(input) {
    if (!input) return '';
    return input.toString().replace(/[<>]/g, "").trim();
}

function showError(elementId, message) {
    var element = document.getElementById(elementId);
    var errorElement = document.getElementById(elementId + 'Error');
    if (element && errorElement) {
        element.classList.add('border-red-500');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

function clearError(elementId) {
    var element = document.getElementById(elementId);
    var errorElement = document.getElementById(elementId + 'Error');
    if (element && errorElement) {
        element.classList.remove('border-red-500');
        errorElement.classList.add('hidden');
    }
}

function showToast(message, type) {
    var toast = document.createElement("div");
    toast.className = "toast " + (type === 'success' ? 'toast-success' : 'toast-error');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.remove();
    }, 4000);
}

function showSpinner() {
    var spinner = document.getElementById('spinner');
    var submitBtn = document.getElementById('submitBtn');
    if (spinner) spinner.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
}

function hideSpinner() {
    var spinner = document.getElementById('spinner');
    var submitBtn = document.getElementById('submitBtn');
    if (spinner) spinner.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
}

// ========================================
// FORM NAVIGATION
// ========================================

function updateProgressBar() {
    var progressPercentage = (currentStep + 1) * 25;
    var progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = progressPercentage + '%';
    
    for (var i = 1; i <= 4; i++) {
        var indicator = document.getElementById('step' + i + 'Indicator');
        if (indicator) {
            indicator.dataset.active = (i === currentStep + 1) ? "true" : "false";
            if (indicator.dataset.active === "true") {
                indicator.classList.add('text-yellow-500');
                indicator.classList.remove('text-gray-500');
            } else {
                indicator.classList.add('text-gray-500');
                indicator.classList.remove('text-yellow-500');
            }
        }
    }
}

function nextStep() {
    if (!validateCurrentStep()) return;
    
    var currentStepDiv = document.getElementById('step' + (currentStep + 1));
    if (currentStepDiv) currentStepDiv.classList.remove('active');
    
    currentStep++;
    
    var nextStepDiv = document.getElementById('step' + (currentStep + 1));
    if (nextStepDiv) nextStepDiv.classList.add('active');
    
    var submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        if (currentStep === 3) {
            submitBtn.classList.remove('hidden');
        } else {
            submitBtn.classList.add('hidden');
        }
    }
    
    updateProgressBar();
    updateSummary();
}

function prevStep() {
    var currentStepDiv = document.getElementById('step' + (currentStep + 1));
    if (currentStepDiv) currentStepDiv.classList.remove('active');
    
    currentStep--;
    
    var prevStepDiv = document.getElementById('step' + (currentStep + 1));
    if (prevStepDiv) prevStepDiv.classList.add('active');
    
    var submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.classList.add('hidden');
    
    updateProgressBar();
}

// ========================================
// TRIP DATA FUNCTIONS
// ========================================

async function fetchAllTripData() {
    try {
        showSpinner();
        var snapshot = await db.ref('trips').once('value');
        var allTripsData = snapshot.val();
        
        if (!allTripsData) {
            console.warn("No trip data found in Firebase.");
            showToast("No trips available at the moment. Please check back later.", 'error');
            return {};
        }
        
        tripData = allTripsData;
        
        if (tripPName && allTripsData[tripPName]) {
            currentTrip = allTripsData[tripPName];
            currentTrip.basePrice = currentTrip.price || 0;
            currentTrip.commissionRate = currentTrip.commission || 0.15;
            tourTypes = currentTrip.tourtype || {};
            tripOwnerId = currentTrip.owner || '';
            
            populateTripTypeDropdown(tourTypes);
            displayTripInfo(currentTrip);
            loadMediaContent(currentTrip.media);
            loadIncludedNotIncluded(currentTrip);
            loadTimeline(currentTrip.timeline);
            loadWhatToBring(currentTrip.whatToBring);
            updateRating(currentTrip.rating);
            updateAllPriceDisplays();
        } else {
            showToast("Trip not found. Please check the URL.", 'error');
            console.error("Trip not found:", tripPName);
        }
        
        return allTripsData;
    } catch (error) {
        console.error("Error fetching trip data:", error);
        showToast("Failed to load trip data. Please refresh the page.", 'error');
        throw error;
    } finally {
        hideSpinner();
    }
}

function updateRating(ratingData) {
    if (!ratingData) return;
    
    var ratingStars = document.getElementById('ratingStars');
    var ratingCount = document.getElementById('ratingCount');
    var ratingContainer = document.querySelector('.rating-container');
    
    if (ratingStars && ratingCount && ratingContainer) {
        ratingStars.innerHTML = '';
        var averageRating = ratingData.average || 0;
        var reviewCount = ratingData.count || 0;
        
        var fullStars = Math.floor(averageRating);
        for (var i = 0; i < fullStars; i++) {
            ratingStars.innerHTML += '<i class="fas fa-star"></i>';
        }
        
        if (averageRating % 1 >= 0.5) {
            ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        var emptyStars = 5 - Math.ceil(averageRating);
        for (var i = 0; i < emptyStars; i++) {
            ratingStars.innerHTML += '<i class="far fa-star"></i>';
        }
        
        ratingCount.textContent = '(' + reviewCount + ' reviews)';
        ratingContainer.classList.remove('hidden');
    }
}

function loadMediaContent(mediaData) {
    if (!mediaData) return;

    var swiperWrapper = document.querySelector('.swiper-wrapper');
    var thumbnailsContainer = document.getElementById('thumbnailsContainer');
    
    if (swiperWrapper) swiperWrapper.innerHTML = '';
    if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';

    var totalPrice = calculateTotalWithTaxes();
    var formattedPrice = formatPriceWithCurrency(totalPrice);

    // Add images
    if (mediaData.images && mediaData.images.length > 0) {
        mediaData.images.forEach(function(imageUrl, index) {
            var slide = document.createElement('div');
            slide.className = 'swiper-slide';
            
            if (index === 0) {
                slide.innerHTML = '<img src="' + imageUrl + '" alt="' + (currentTrip.name || 'Trip') + '">' +
                    '<div class="price-tag notranslate" data-price-egp="' + totalPrice + '">' + formattedPrice + '</div>' +
                    '<div class="tour-title-overlay">' +
                    '<div class="tour-meta">' +
                    '<span class="tour-meta-item"><i class="fas fa-star"></i> ' + (currentTrip.rating ? currentTrip.rating.toFixed(1) : '4.9') + '</span>' +
                    '<span class="tour-meta-item"><i class="fas fa-clock"></i> ' + (currentTrip.duration || '') + '</span>' +
                    '</div></div>';
            } else {
                slide.innerHTML = '<img src="' + imageUrl + '" alt="' + (currentTrip.name || 'Trip') + '">';
            }
            swiperWrapper.appendChild(slide);
            
            var thumb = document.createElement('img');
            thumb.src = imageUrl;
            thumb.alt = 'Thumbnail ' + (index + 1);
            thumb.className = 'thumbnail';
            thumb.dataset.index = index;
            thumb.addEventListener('click', function() {
                swiper.slideTo(parseInt(this.dataset.index));
                updateActiveThumbnail(parseInt(this.dataset.index));
            });
            thumbnailsContainer.appendChild(thumb);
        });
    }
    
    // Add videos
    if (mediaData.videos && mediaData.videos.length > 0) {
        mediaData.videos.forEach(function(video, index) {
            var videoIndex = mediaData.images ? mediaData.images.length + index : index;
            var slide = document.createElement('div');
            slide.className = 'swiper-slide swiper-slide-video';
            slide.dataset.videoUrl = video.videoUrl;
            slide.innerHTML = '<img src="' + video.thumbnail + '" alt="' + (currentTrip.name || 'Trip') + ' video" class="video-thumbnail">' +
                '<div class="play-button"><i class="fas fa-play"></i></div>';
            swiperWrapper.appendChild(slide);
            
            var thumb = document.createElement('img');
            thumb.src = video.thumbnail;
            thumb.alt = 'Video ' + (index + 1);
            thumb.className = 'thumbnail';
            thumb.dataset.index = videoIndex;
            thumb.addEventListener('click', function() {
                swiper.slideTo(parseInt(this.dataset.index));
                updateActiveThumbnail(parseInt(this.dataset.index));
            });
            thumbnailsContainer.appendChild(thumb);
        });
    }
    
    // Initialize Swiper
    if (!swiper) {
        swiper = new Swiper('.swiper', {
            slidesPerView: 1,
            spaceBetween: 0,
            loop: true,
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            on: {
                slideChange: function() {
                    updateActiveThumbnail(this.realIndex);
                    if (currentVideoSlide) {
                        var iframe = currentVideoSlide.querySelector('iframe');
                        if (iframe) {
                            iframe.src = '';
                            currentVideoSlide.innerHTML = '<img src="' + currentVideoSlide.dataset.thumbnail + '" alt="' + (currentTrip.name || 'Trip') + ' video" class="video-thumbnail">' +
                                '<div class="play-button"><i class="fas fa-play"></i></div>';
                            currentVideoSlide = null;
                        }
                    }
                }
            }
        });
        
        // Play video on click
        document.querySelector('.swiper').addEventListener('click', function(e) {
            var playButton = e.target.closest('.play-button');
            if (playButton) {
                var slide = playButton.closest('.swiper-slide');
                if (slide && slide.classList.contains('swiper-slide-video')) {
                    playVideo(slide);
                }
            }
        });
    } else {
        swiper.update();
    }
    
    if (thumbnailsContainer.firstChild) {
        thumbnailsContainer.firstChild.classList.add('active');
    }
}

function playVideo(slide) {
    if (currentVideoSlide) {
        var oldIframe = currentVideoSlide.querySelector('iframe');
        if (oldIframe) {
            oldIframe.src = '';
            currentVideoSlide.innerHTML = '<img src="' + currentVideoSlide.dataset.thumbnail + '" alt="' + (currentTrip.name || 'Trip') + ' video" class="video-thumbnail">' +
                '<div class="play-button"><i class="fas fa-play"></i></div>';
        }
    }
    
    var thumbnail = slide.querySelector('img').src;
    slide.dataset.thumbnail = thumbnail;
    var videoUrl = slide.dataset.videoUrl;
    var videoId = null;
    
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        var match = videoUrl.match(regExp);
        videoId = (match && match[2] && match[2].length === 11) ? match[2] : null;
        
        if (videoId) {
            slide.innerHTML = '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
            currentVideoSlide = slide;
        }
    } else if (videoUrl) {
        slide.innerHTML = '<video width="100%" height="100%" controls autoplay><source src="' + videoUrl + '" type="video/mp4">Your browser does not support the video tag.</video>';
        currentVideoSlide = slide;
    }
}

function updateActiveThumbnail(index) {
    var thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(function(thumb, i) {
        if (parseInt(thumb.dataset.index) === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

function loadIncludedNotIncluded(tripData) {
    var includedContainer = document.getElementById('includedItems');
    var notIncludedContainer = document.getElementById('notIncludedItems');
    
    if (includedContainer && tripData.included && tripData.included.length) {
        includedContainer.innerHTML = '';
        tripData.included.forEach(function(item) {
            var itemElement = document.createElement('div');
            itemElement.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px';
            itemElement.innerHTML = '<i class="fas fa-check" style="color:#4CAF50;"></i><span>' + item + '</span>';
            includedContainer.appendChild(itemElement);
        });
    }
    
    if (notIncludedContainer && tripData.notIncluded && tripData.notIncluded.length) {
        notIncludedContainer.innerHTML = '';
        tripData.notIncluded.forEach(function(item) {
            var itemElement = document.createElement('div');
            itemElement.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px';
            itemElement.innerHTML = '<i class="fas fa-times" style="color:#F44336;"></i><span>' + item + '</span>';
            notIncludedContainer.appendChild(itemElement);
        });
    }
}

function loadTimeline(timelineData) {
    var timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer || !timelineData) return;
    
    timelineContainer.innerHTML = '';
    timelineData.forEach(function(item) {
        var timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.innerHTML = '<div class="timeline-time"></div>' +
            '<div class="timeline-content">' +
            '<div class="timeline-title">' + (item.title || '') + '</div>' +
            '<div class="timeline-description">' + (item.description || '') + '</div></div>';
        if (item.time) {
            var timeDiv = timelineItem.querySelector('.timeline-time');
            if (timeDiv) timeDiv.setAttribute('title', item.time);
        }
        timelineContainer.appendChild(timelineItem);
    });
}

function loadWhatToBring(whatToBringData) {
    var whatToBringList = document.getElementById('whatToBringList');
    if (!whatToBringList || !whatToBringData) return;
    
    whatToBringList.innerHTML = '';
    whatToBringData.forEach(function(item) {
        var li = document.createElement('li');
        li.style.cssText = 'padding:8px 0;border-bottom:1px dashed #64748b;display:flex;align-items:center;gap:10px';
        li.innerHTML = '<i class="fas fa-check" style="color:#f59e0b;"></i> ' + item;
        whatToBringList.appendChild(li);
    });
}

function populateTripTypeDropdown(tourTypes) {
    var tripTypeSelect = document.getElementById('tripType');
    if (!tripTypeSelect) return;
    
    var currentSelection = tripTypeSelect.value;
    tripTypeSelect.innerHTML = '';
    
    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'No extra services needed';
    defaultOption.selected = true;
    tripTypeSelect.appendChild(defaultOption);
    
    if (tourTypes && typeof tourTypes === 'object') {
        Object.keys(tourTypes).forEach(function(key) {
            var priceEGP = parseInt(tourTypes[key]);
            var formattedPrice = formatPriceWithCurrency(priceEGP);
            var option = document.createElement('option');
            option.value = key;
            option.textContent = key + ' - ' + formattedPrice + ' (per person)';
            if (currentSelection === key) option.selected = true;
            tripTypeSelect.appendChild(option);
        });
    }
}

function displayTripInfo(tripInfo) {
    var tripTitle = document.getElementById('tourTitle');
    var tripNameInput = document.getElementById('tripName');
    if (tripTitle && tripInfo.name) tripTitle.textContent = tripInfo.name;
    if (tripNameInput) tripNameInput.value = tripInfo.name || '';
}

// ========================================
// PRICE CALCULATION (All in EGP)
// ========================================

function calculateBaseTotal() {
    var adults = parseInt(document.getElementById('adults').value) || 0;
    var childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    if (!currentTrip.basePrice) return 0;
    var basePrice = parseInt(currentTrip.basePrice);
    var childPrice = parseInt(currentTrip.cprice) || Math.round(basePrice * 0.5);
    return (adults * basePrice) + (childrenUnder12 * childPrice);
}

function calculateExtraServicesTotal() {
    var adults = parseInt(document.getElementById('adults').value) || 0;
    var childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    var selectedService = document.getElementById('tripType').value;
    if (selectedService && tourTypes[selectedService]) {
        var servicePrice = parseInt(tourTypes[selectedService]);
        return (adults + childrenUnder12) * servicePrice;
    }
    return 0;
}

function calculateNetTotal() {
    return calculateBaseTotal() + calculateExtraServicesTotal();
}

function calculateTotalWithTaxes() {
    var netTotal = calculateNetTotal();
    var baseTax = netTotal * TAX_RATE;
    var taxOnTax = baseTax * TAX_ON_TAX_RATE;
    var totalTax = baseTax + taxOnTax + FIXED_FEE;
    var subtotalWithTax = netTotal + totalTax;
    var commissionRate = currentTrip.commissionRate || 0.10;
    var commission = subtotalWithTax * commissionRate;
    var finalTotal = subtotalWithTax + commission;
    currentTotalPriceEGP = finalTotal;
    return finalTotal;
}

function updateInfantsMax() {
    var adultsInput = document.getElementById('adults');
    var infantsInput = document.getElementById('infants');
    if (!adultsInput || !infantsInput) return;
    var adults = parseInt(adultsInput.value) || 0;
    var currentInfants = parseInt(infantsInput.value) || 0;
    var maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
    if (currentInfants > maxInfants) infantsInput.value = maxInfants;
    infantsInput.max = maxInfants;
}

function updateSummary() {
    var adults = parseInt(document.getElementById('adults').value) || 0;
    var childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    var infants = parseInt(document.getElementById('infants').value) || 0;
    var selectedService = document.getElementById('tripType').value;
    
    var summaryDate = document.getElementById("summaryDate");
    var summaryHotel = document.getElementById("summaryHotel");
    var summaryRoom = document.getElementById("summaryRoom");
    var summaryRef = document.getElementById("summaryRef");
    var summaryTour = document.getElementById("summaryTour");
    var summaryAdults = document.getElementById("summaryAdults");
    var summaryChildrenUnder12 = document.getElementById("summaryChildrenUnder12");
    var summaryInfants = document.getElementById("summaryInfants");
    var summaryService = document.getElementById("summaryService");
    
    if (summaryDate) summaryDate.textContent = document.getElementById("tripDate").value || "Not specified";
    if (summaryHotel) summaryHotel.textContent = sanitizeInput(document.getElementById("hotelName").value) || "Not specified yet";
    if (summaryRoom) summaryRoom.textContent = sanitizeInput(document.getElementById("roomNumber").value) || "Not specified yet";
    if (summaryRef) summaryRef.textContent = refNumber;
    
    if (currentTrip.basePrice) {
        if (summaryTour) summaryTour.textContent = currentTrip.name || 'N/A';
        if (summaryAdults) summaryAdults.textContent = adults + ' Adult' + (adults !== 1 ? 's' : '');
        if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = childrenUnder12 + ' Child' + (childrenUnder12 !== 1 ? 'ren' : '');
        if (summaryInfants) summaryInfants.textContent = infants + ' Infant' + (infants !== 1 ? 's' : '');
        
        if (summaryService) {
            if (selectedService && tourTypes[selectedService]) {
                summaryService.textContent = selectedService;
            } else {
                summaryService.textContent = 'None';
            }
        }
    }
    
    updateAllPriceDisplays();
}

// ========================================
// FORM VALIDATION & SUBMISSION
// ========================================

async function populateForm() {
    var user = auth.currentUser;
    if (!user) return;

    try {
        var userSnapshot = await db.ref('egy_user').child(user.uid).once('value');
        var userData = userSnapshot.val();

        if (userData) {
            var usernameField = document.getElementById("username");
            var emailField = document.getElementById("customerEmail");
            var uidField = document.getElementById("uid");
            var phoneField = document.getElementById("phone");
            
            if (usernameField) usernameField.value = userData.username || "";
            if (emailField) emailField.value = userData.email || "";
            if (uidField) uidField.value = user.uid || "";
            if (userData.phone && iti && phoneField) {
                phoneField.value = userData.phone;
                iti.setNumber(userData.phone);
            }
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

function validateCurrentStep() {
    var isValid = true;
    
    if (currentStep === 0) {
        var username = document.getElementById("username")?.value.trim();
        var email = document.getElementById("customerEmail")?.value.trim();
        
        if (!username) {
            showError('username', 'Please enter your full name');
            isValid = false;
        } else {
            clearError('username');
        }
        
        if (!email) {
            showError('customerEmail', 'Please enter your email address');
            isValid = false;
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).toLowerCase())) {
            showError('customerEmail', 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError('customerEmail');
        }
        
        var phoneNumber = iti?.getNumber();
        if (!phoneNumber || !iti?.isValidNumber()) {
            showError('phone', 'Please enter a valid phone number with country code');
            isValid = false;
        } else {
            clearError('phone');
            var phoneField = document.getElementById("phone");
            if (phoneField) phoneField.value = phoneNumber;
        }
    } else if (currentStep === 1) {
        var tripDate = document.getElementById("tripDate")?.value.trim();
        var hotelName = document.getElementById("hotelName")?.value.trim();
        var roomNumber = document.getElementById("roomNumber")?.value.trim();
        
        if (!tripDate) {
            showError('tripDate', 'Please select a trip date');
            isValid = false;
        } else {
            clearError('tripDate');
        }
        
        if (!hotelName) {
            showError('hotelName', 'Please enter your hotel name');
            isValid = false;
        } else {
            clearError('hotelName');
        }
        
        if (!roomNumber) {
            showError('roomNumber', 'Please enter your room number');
            isValid = false;
        } else {
            clearError('roomNumber');
        }
    }
    
    return isValid;
}

async function submitForm() {
    if (!validateCurrentStep()) return;
    showSpinner();
    
    try {
        var user = auth.currentUser;
        if (!user) throw new Error('Please sign in to complete your booking');

        var total = calculateTotalWithTaxes();
        var netTotal = calculateNetTotal();
        var baseTax = netTotal * TAX_RATE;
        var taxOnTax = baseTax * TAX_ON_TAX_RATE;
        var totalTax = baseTax + taxOnTax + FIXED_FEE;
        var subtotalWithTax = netTotal + totalTax;
        var commissionRate = currentTrip.commissionRate || 0.10;
        var commission = subtotalWithTax * commissionRate;
        var finalTotal = subtotalWithTax + commission;

        var formData = {
            refNumber: refNumber,
            username: sanitizeInput(document.getElementById("username").value),
            email: sanitizeInput(document.getElementById("customerEmail").value),
            phone: iti.getNumber(),
            tripDate: document.getElementById("tripDate").value,
            tripType: selectedTripType || 'None',
            tripTypePrice: selectedTripType ? tourTypes[selectedTripType] : 0,
            hotelName: sanitizeInput(document.getElementById("hotelName").value),
            roomNumber: sanitizeInput(document.getElementById("roomNumber").value),
            timestamp: Date.now(),
            status: "pending",
            tour: currentTrip.name,
            id: tripPName,
            adults: parseInt(document.getElementById('adults').value) || 0,
            childrenUnder12: parseInt(document.getElementById('childrenUnder12').value) || 0,
            infants: parseInt(document.getElementById('infants').value) || 0,
            total: finalTotal.toFixed(2),
            netTotal: netTotal,
            totalTax: totalTax.toFixed(2),
            uid: user.uid,
            owner: tripOwnerId,
            currency: getCurrentCurrency()
        };

        var response = await fetch('https://www.discover-sharm.com/hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchantId: 'MID-33260-3',
                orderId: refNumber,
                amount: formData.total,
                currency: 'EGP',
            }),
        });

        if (!response.ok) {
            var errorData = await response.json();
            throw new Error(errorData.message || 'Payment processing failed');
        }

        var data = await response.json();
        
        var paymentParams = new URLSearchParams({
            merchantId: 'MID-33260-3',
            orderId: refNumber,
            amount: formData.total,
            currency: 'EGP',
            hash: data.hash,
            mode: 'live',
            merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
            failureRedirect: 'false',
            redirectMethod: 'get'
        });

        var kashierUrl = 'https://payments.kashier.io/?' + paymentParams.toString();

        await db.ref('trip-bookings').child(refNumber).set({
            ...formData,
            paymenturl: kashierUrl,
        });

        sessionStorage.setItem("username", formData.username);
        sessionStorage.setItem("email", formData.email);
        sessionStorage.setItem("phone", formData.phone);

        showToast('Booking submitted! Redirecting to payment...');
        window.location.href = kashierUrl;
        
    } catch (error) {
        console.error('Submission Error:', error);
        showToast('Error: ' + (error.message || 'Failed to process booking. Please try again.'), 'error');
        hideSpinner();
    }
}

// ========================================
// NUMBER CONTROLS INITIALIZATION
// ========================================

function initNumberControls() {
    var adultsPlus = document.getElementById('adultsPlus');
    var adultsMinus = document.getElementById('adultsMinus');
    
    if (adultsPlus) {
        adultsPlus.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById('adults');
            if (input) {
                var currentValue = parseInt(input.value);
                if (currentValue < MAX_PER_TYPE) {
                    input.value = currentValue + 1;
                    updateInfantsMax();
                    updateSummary();
                }
            }
            return false;
        });
    }
    
    if (adultsMinus) {
        adultsMinus.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById('adults');
            if (input) {
                var currentValue = parseInt(input.value);
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                    updateInfantsMax();
                    updateSummary();
                }
            }
            return false;
        });
    }

    var childrenPlus = document.getElementById('childrenUnder12Plus');
    var childrenMinus = document.getElementById('childrenUnder12Minus');
    
    if (childrenPlus) {
        childrenPlus.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById('childrenUnder12');
            if (input) {
                var currentValue = parseInt(input.value);
                if (currentValue < MAX_PER_TYPE) {
                    input.value = currentValue + 1;
                    updateSummary();
                }
            }
            return false;
        });
    }
    
    if (childrenMinus) {
        childrenMinus.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById('childrenUnder12');
            if (input) {
                var currentValue = parseInt(input.value);
                if (currentValue > 0) {
                    input.value = currentValue - 1;
                    updateSummary();
                }
            }
            return false;
        });
    }

    var infantsPlus = document.getElementById('infantsPlus');
    var infantsMinus = document.getElementById('infantsMinus');
    
    if (infantsPlus) {
        infantsPlus.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById('infants');
            if (input) {
                var currentValue = parseInt(input.value);
                if (currentValue < input.max) {
                    input.value = currentValue + 1;
                    updateSummary();
                }
            }
            return false;
        });
    }
    
    if (infantsMinus) {
        infantsMinus.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById('infants');
            if (input) {
                var currentValue = parseInt(input.value);
                if (currentValue > 0) {
                    input.value = currentValue - 1;
                    updateSummary();
                }
            }
            return false;
        });
    }
}

// ========================================
// INITIALIZATION
// ========================================

window.onload = async function() {
    if (!tripPName) {
        showToast("No trip specified. Please access this page through a valid trip link.", 'error');
        return;
    }

    // Initialize phone input
    var phoneInput = document.querySelector("#phone");
    if (phoneInput) {
        try {
            iti = window.intlTelInput(phoneInput, {
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
                separateDialCode: true,
                initialCountry: "eg",
                customPlaceholder: function(selectedCountryPlaceholder, selectedCountryData) {
                    return "e.g. " + selectedCountryPlaceholder;
                }
            });
        } catch (error) {
            console.error("intlTelInput initialization failed:", error);
        }
    }

    // Initialize number controls
    initNumberControls();

    // Initialize date picker
    flatpickr("#tripDate", {
        locale: "en",
        minDate: new Date().fp_incr(1),
        dateFormat: "Y-m-d",
        inline: false,
        disableMobile: true,
        onReady: function(selectedDates, dateStr, instance) {
            var elements = [
                instance.calendarContainer,
                ...instance.calendarContainer.querySelectorAll('.flatpickr-weekdays, .flatpickr-current-month, .flatpickr-day')
            ];
            elements.forEach(function(el) {
                if (el) el.setAttribute('translate', 'no');
            });
        },
        onChange: updateSummary
    });

    // Add Flatpickr styles
    var style = document.createElement('style');
    style.textContent = '.flatpickr-calendar { background: #222 !important; color: #ffc207 !important; border-radius: 10px !important; border: 1px solid #333 !important; }' +
        '.flatpickr-months, .flatpickr-weekdays { background: #222 !important; }' +
        '.flatpickr-month, .flatpickr-weekday { color: #ffc207 !important; }' +
        '.flatpickr-prev-month, .flatpickr-next-month, .flatpickr-prev-month svg, .flatpickr-next-month svg { color: #ffc107 !important; fill: #ffc107 !important; }' +
        '.flatpickr-day { color: #ffc207 !important; background: #333 !important; border-radius: 8px !important; border: none !important; }' +
        '.flatpickr-day:hover { background: #444 !important; color: #ffc207 !important; }' +
        '.flatpickr-day.selected { background: #ffc207 !important; color: #111 !important; font-weight: bold !important; }' +
        '.flatpickr-day.prevMonthDay, .flatpickr-day.nextMonthDay { color: #666 !important; background: transparent !important; }' +
        '.flatpickr-day.today { border: 1px solid #ffc107 !important; }' +
        '.flatpickr-day.flatpickr-disabled, .prev-day-disabled { background: #333 !important; color: #666 !important; opacity: 0.4 !important; cursor: not-allowed !important; pointer-events: none !important; }' +
        '.flatpickr-time input, .flatpickr-time .flatpickr-time-separator, .flatpickr-time .flatpickr-am-pm { color: #ffc207 !important; }';
    document.head.appendChild(style);

    // Trip type change handler
    var tripTypeSelect = document.getElementById('tripType');
    if (tripTypeSelect) {
        tripTypeSelect.addEventListener('change', function() {
            selectedTripType = this.value;
            updateSummary();
        });
    }

    // Submit button handler
    var submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitForm);
    }

    // Initialize currency integration FIRST
    initCurrencyIntegration();

    // Auth state handler
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUserUid = user.uid;
            populateForm();
        } else {
            currentUserUid = 'anonymous';
        }
    });

    // Load data
    await populateForm();
    await fetchAllTripData();
    updateSummary();
};
