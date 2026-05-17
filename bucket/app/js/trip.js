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

// ========================================
// CURRENCY INTEGRATION (No fixed rates, no Firebase rates)
// ========================================

// Get current currency from header system
function getCurrentCurrency() {
    if (window.SharmCurrency && window.SharmCurrency.get) {
        return window.SharmCurrency.get();
    }
    return 'EGP'; // Default fallback
}

// Get exchange rates from header system
function getExchangeRates() {
    if (window.SharmCurrency && window.SharmCurrency.rates) {
        return window.SharmCurrency.rates;
    }
    return null;
}

// Format price based on selected currency from header
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
    
    // Fallback to EGP if rates not available
    return Math.round(priceEGP) + ' EGP';
}

// Get currency symbol only
function getCurrencySymbol() {
    var currency = getCurrentCurrency();
    if (currency === 'USD') return '$';
    if (currency === 'EUR') return '€';
    if (currency === 'GBP') return '£';
    return 'EGP';
}

// Get exchange rate value for calculations
function getExchangeRateValue() {
    var currency = getCurrentCurrency();
    if (currency === 'EGP') return 1;
    var rates = getExchangeRates();
    if (rates && rates[currency]) {
        return rates[currency];
    }
    return 1;
}

// Listen for currency changes from header
function listenToCurrencyChanges() {
    window.addEventListener('currencyChanged', function(event) {
        // Update all price displays
        updatePriceDisplay();
        updateSummary();
        
        // Update trip type dropdown prices
        if (tourTypes && Object.keys(tourTypes).length > 0) {
            populateTripTypeDropdown(tourTypes);
        }
    });
}

// Initialize currency from header
function initCurrencyIntegration() {
    // Wait for header currency system to be ready
    var checkInterval = setInterval(function() {
        if (window.SharmCurrency && window.SharmCurrency.get) {
            clearInterval(checkInterval);
            console.log('Currency system connected. Current currency:', getCurrentCurrency());
            listenToCurrencyChanges();
            updatePriceDisplay();
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(function() {
        clearInterval(checkInterval);
        if (!window.SharmCurrency) {
            console.log('Currency system not available, using EGP only');
        }
    }, 5000);
}

// Get trip name from URL parameter
function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// Utility Functions
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'DS_' + result;
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/[<>]/g, "").trim();
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.classList.add('border-red-500');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

function clearError(elementId) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.classList.remove('border-red-500');
    errorElement.classList.add('hidden');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement("div");
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function showSpinner() {
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  if (spinner) spinner.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = true;
}

function hideSpinner() {
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  if (spinner) spinner.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = false;
}

// Form Navigation Functions
function updateProgressBar() {
  const progressPercentage = (currentStep + 1) * 25;
  document.getElementById('progressBar').style.width = `${progressPercentage}%`;
  
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}Indicator`);
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
  
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  
  if (currentStep === 3) {
    document.getElementById('submitBtn').classList.remove('hidden');
  } else {
    document.getElementById('submitBtn').classList.add('hidden');
  }
  
  updateProgressBar();
  updateSummary();
}

function prevStep() {
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep--;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  
  document.getElementById('submitBtn').classList.add('hidden');
  updateProgressBar();
}

// Trip Data Functions
async function fetchAllTripData() {
  try {
    showSpinner();
    const snapshot = await db.ref('trips').once('value');
    const allTripsData = snapshot.val();
    
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
      
      updatePriceDisplay();
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

function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  if (priceElement && currentTrip.price) {
    const totalPrice = calculateTotalWithTaxes();
    priceElement.innerHTML = formatPriceWithCurrency(totalPrice);
    priceElement.setAttribute('data-price-egp', totalPrice);
  }
}

function updateRating(ratingData) {
  if (!ratingData) return;
  
  const ratingStars = document.getElementById('ratingStars');
  const ratingCount = document.getElementById('ratingCount');
  
  if (ratingStars && ratingCount) {
    ratingStars.innerHTML = '';
    const averageRating = ratingData.average || 0;
    const reviewCount = ratingData.count || 0;
    
    const fullStars = Math.floor(averageRating);
    for (let i = 0; i < fullStars; i++) {
      ratingStars.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    if (averageRating % 1 >= 0.5) {
      ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(averageRating);
    for (let i = 0; i < emptyStars; i++) {
      ratingStars.innerHTML += '<i class="far fa-star"></i>';
    }
    
    ratingCount.textContent = `(${reviewCount} reviews)`;
  }
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;

  const swiperWrapper = document.querySelector('.swiper-wrapper');
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');
  
  if (swiperWrapper) swiperWrapper.innerHTML = '';
  if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';

  const totalPrice = calculateTotalWithTaxes();

  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      if (index === 0) {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}">
          <div class="price-tag notranslate">
            ${formatPriceWithCurrency(totalPrice)}
          </div>
          <div class="tour-title-overlay">
            <div class="tour-meta">
              <span class="tour-meta-item">
                <i class="fas fa-star"></i> ${currentTrip.rating?.toFixed(1) || '4.9'}
              </span>
              <span class="tour-meta-item">
                <i class="fas fa-clock"></i> ${currentTrip.duration || ''}
              </span>
            </div>
          </div>
        `;
      } else {
        slide.innerHTML = `<img src="${imageUrl}" alt="${currentTrip.name}">`;
      }
      swiperWrapper.appendChild(slide);
      
      const thumb = document.createElement('img');
      thumb.src = imageUrl;
      thumb.alt = `Thumbnail ${index + 1}`;
      thumb.className = 'thumbnail';
      thumb.dataset.index = index;
      thumb.addEventListener('click', () => {
        swiper.slideTo(index);
        updateActiveThumbnail(index);
      });
      thumbnailsContainer.appendChild(thumb);
    });
  }
  
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach((video, index) => {
      const videoIndex = mediaData.images ? mediaData.images.length + index : index;
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
      `;
      swiperWrapper.appendChild(slide);
      
      const thumb = document.createElement('img');
      thumb.src = video.thumbnail;
      thumb.alt = `Video ${index + 1}`;
      thumb.className = 'thumbnail';
      thumb.dataset.index = videoIndex;
      thumb.addEventListener('click', () => {
        swiper.slideTo(videoIndex);
        updateActiveThumbnail(videoIndex);
      });
      thumbnailsContainer.appendChild(thumb);
    });
  }
  
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
            const iframe = currentVideoSlide.querySelector('iframe');
            if (iframe) {
              iframe.src = '';
              currentVideoSlide.innerHTML = `
                <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
                <div class="play-button"><i class="fas fa-play"></i></div>
              `;
              currentVideoSlide = null;
            }
          }
        }
      }
    });
    
    document.querySelector('.swiper').addEventListener('click', function(e) {
      const playButton = e.target.closest('.play-button');
      if (playButton) {
        const slide = playButton.closest('.swiper-slide');
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
    const iframe = currentVideoSlide.querySelector('iframe');
    if (iframe) {
      iframe.src = '';
      currentVideoSlide.innerHTML = `
        <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
        <div class="play-button"><i class="fas fa-play"></i></div>
      `;
    }
  }
  
  const thumbnail = slide.querySelector('img').src;
  slide.dataset.thumbnail = thumbnail;
  const videoUrl = slide.dataset.videoUrl;
  let videoId;
  
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    videoId = (match && match[2].length === 11) ? match[2] : null;
    
    if (videoId) {
      slide.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      currentVideoSlide = slide;
    }
  } else {
    slide.innerHTML = `<video width="100%" height="100%" controls autoplay><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
    currentVideoSlide = slide;
  }
}

function updateActiveThumbnail(index) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach((thumb, i) => {
    if (parseInt(thumb.dataset.index) === index) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

function loadIncludedNotIncluded(tripData) {
  const includedContainer = document.getElementById('includedItems');
  const notIncludedContainer = document.getElementById('notIncludedItems');
  
  if (includedContainer && tripData.included) {
    includedContainer.innerHTML = '';
    tripData.included.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px';
      itemElement.innerHTML = `<i class="fas fa-check" style="color:#4CAF50;"></i><span>${item}</span>`;
      includedContainer.appendChild(itemElement);
    });
  }
  
  if (notIncludedContainer && tripData.notIncluded) {
    notIncludedContainer.innerHTML = '';
    tripData.notIncluded.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px';
      itemElement.innerHTML = `<i class="fas fa-times" style="color:#F44336;"></i><span>${item}</span>`;
      notIncludedContainer.appendChild(itemElement);
    });
  }
}

function loadTimeline(timelineData) {
  const timelineContainer = document.getElementById('timelineContainer');
  if (!timelineContainer || !timelineData) return;
  
  timelineContainer.innerHTML = '';
  timelineData.forEach((item) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    timelineItem.innerHTML = `
      <div class="timeline-time"></div>
      <div class="timeline-content">
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-description">${item.description}</div>
      </div>
    `;
    if (item.time) {
      timelineItem.querySelector('.timeline-time').setAttribute('title', item.time);
    }
    timelineContainer.appendChild(timelineItem);
  });
}

function loadWhatToBring(whatToBringData) {
  const whatToBringList = document.getElementById('whatToBringList');
  if (!whatToBringList || !whatToBringData) return;
  
  whatToBringList.innerHTML = '';
  whatToBringData.forEach(item => {
    const li = document.createElement('li');
    li.style.cssText = 'padding:8px 0;border-bottom:1px dashed #64748b;display:flex;align-items:center;gap:10px';
    li.innerHTML = `<i class="fas fa-check" style="color:#f59e0b;"></i> ${item}`;
    whatToBringList.appendChild(li);
  });
}

function populateTripTypeDropdown(tourTypes) {
  const tripTypeSelect = document.getElementById('tripType');
  if (!tripTypeSelect) return;
  
  tripTypeSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'No extra services needed';
  defaultOption.selected = true;
  tripTypeSelect.appendChild(defaultOption);
  
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(key => {
      const priceEGP = parseInt(tourTypes[key]);
      const formattedPrice = formatPriceWithCurrency(priceEGP);
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${formattedPrice} (per person)`;
      tripTypeSelect.appendChild(option);
    });
  }
}

function displayTripInfo(tripInfo) {
  const tripTitle = document.getElementById('tourTitle');
  const tripName = document.getElementById('tripName');
  if (tripTitle && tripInfo.name) tripTitle.textContent = tripInfo.name;
  if (tripName) tripName.value = tripInfo.name;
}

// Price Calculation Functions (ALL in EGP)
function calculateBaseTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  if (!currentTrip.basePrice) return 0;
  const basePrice = parseInt(currentTrip.basePrice);
  const childPrice = parseInt(currentTrip.cprice) || Math.round(basePrice * 0.5);
  return (adults * basePrice) + (childrenUnder12 * childPrice);
}

function calculateExtraServicesTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const selectedService = document.getElementById('tripType').value;
  if (selectedService && tourTypes[selectedService]) {
    const servicePrice = parseInt(tourTypes[selectedService]);
    return (adults + childrenUnder12) * servicePrice;
  }
  return 0;
}

function calculateNetTotal() {
  return calculateBaseTotal() + calculateExtraServicesTotal();
}

function calculateTotalWithTaxes() {
  const netTotal = calculateNetTotal();
  const baseTax = netTotal * TAX_RATE;
  const taxOnTax = baseTax * TAX_ON_TAX_RATE;
  const totalTax = baseTax + taxOnTax + FIXED_FEE;
  const subtotalWithTax = netTotal + totalTax;
  const commissionRate = currentTrip.commissionRate || 0.10;
  const commission = subtotalWithTax * commissionRate;
  return subtotalWithTax + commission;
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  if (!adultsInput || !infantsInput) return;
  const adults = parseInt(adultsInput.value) || 0;
  const currentInfants = parseInt(infantsInput.value) || 0;
  const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  if (currentInfants > maxInfants) infantsInput.value = maxInfants;
  infantsInput.max = maxInfants;
}

function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('infants').value) || 0;
  const selectedService = document.getElementById('tripType').value;
  
  const summaryDate = document.getElementById("summaryDate");
  const summaryHotel = document.getElementById("summaryHotel");
  const summaryRoom = document.getElementById("summaryRoom");
  const summaryRef = document.getElementById("summaryRef");
  const summaryTour = document.getElementById("summaryTour");
  const summaryAdults = document.getElementById("summaryAdults");
  const summaryChildrenUnder12 = document.getElementById("summaryChildrenUnder12");
  const summaryInfants = document.getElementById("summaryInfants");
  const summaryService = document.getElementById("summaryService");
  const totalPriceDisplay = document.getElementById("totalPriceDisplay");
  
  if (summaryDate) summaryDate.textContent = document.getElementById("tripDate").value || "Not specified";
  if (summaryHotel) summaryHotel.textContent = sanitizeInput(document.getElementById("hotelName").value) || "Not specified yet";
  if (summaryRoom) summaryRoom.textContent = sanitizeInput(document.getElementById("roomNumber").value) || "Not specified yet";
  if (summaryRef) summaryRef.textContent = refNumber;
  
  if (currentTrip.basePrice) {
    if (summaryTour) summaryTour.textContent = `${currentTrip.name}`;
    if (summaryAdults) summaryAdults.textContent = `${adults} Adult${adults !== 1 ? 's' : ''}`;
    if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = `${childrenUnder12} Child${childrenUnder12 !== 1 ? 'ren' : ''}`;
    if (summaryInfants) summaryInfants.textContent = `${infants} Infant${infants !== 1 ? 's' : ''}`;
    
    if (selectedService && tourTypes[selectedService]) {
      if (summaryService) summaryService.textContent = `${selectedService}`;
    } else {
      if (summaryService) summaryService.textContent = 'None';
    }
    
    const total = calculateTotalWithTaxes();
    if (totalPriceDisplay) {
      totalPriceDisplay.innerHTML = formatPriceWithCurrency(total);
    }
  }
}

async function populateForm() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userSnapshot = await db.ref('egy_user').child(user.uid).once('value');
    const userData = userSnapshot.val();

    if (userData) {
      if (document.getElementById("username")) document.getElementById("username").value = userData.username || "";
      if (document.getElementById("customerEmail")) document.getElementById("customerEmail").value = userData.email || "";
      if (document.getElementById("uid")) document.getElementById("uid").value = user.uid || "";
      if (userData.phone && iti && document.getElementById("phone")) {
        document.getElementById("phone").value = userData.phone;
        iti.setNumber(userData.phone);
      }
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}

function validateCurrentStep() {
  let isValid = true;
  
  if (currentStep === 0) {
    const username = document.getElementById("username")?.value.trim();
    const email = document.getElementById("customerEmail")?.value.trim();
    
    if (!username) { showError('username', 'Please enter your full name'); isValid = false; }
    else { clearError('username'); }
    
    if (!email) { showError('customerEmail', 'Please enter your email address'); isValid = false; }
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).toLowerCase())) {
      showError('customerEmail', 'Please enter a valid email address');
      isValid = false;
    } else { clearError('customerEmail'); }
    
    const phoneNumber = iti?.getNumber();
    if (!phoneNumber || !iti?.isValidNumber()) {
      showError('phone', 'Please enter a valid phone number with country code');
      isValid = false;
    } else {
      clearError('phone');
      if (document.getElementById("phone")) document.getElementById("phone").value = phoneNumber;
    }
  } else if (currentStep === 1) {
    const tripDate = document.getElementById("tripDate")?.value.trim();
    const hotelName = document.getElementById("hotelName")?.value.trim();
    const roomNumber = document.getElementById("roomNumber")?.value.trim();
    
    if (!tripDate) { showError('tripDate', 'Please select a trip date'); isValid = false; }
    else { clearError('tripDate'); }
    
    if (!hotelName) { showError('hotelName', 'Please enter your hotel name'); isValid = false; }
    else { clearError('hotelName'); }
    
    if (!roomNumber) { showError('roomNumber', 'Please enter your room number'); isValid = false; }
    else { clearError('roomNumber'); }
  }
  
  return isValid;
}

// Form Submission
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to complete your booking');

    const total = calculateTotalWithTaxes();
    const netTotal = calculateNetTotal();
    const baseTax = netTotal * TAX_RATE;
    const taxOnTax = baseTax * TAX_ON_TAX_RATE;
    const totalTax = baseTax + taxOnTax + FIXED_FEE;
    const subtotalWithTax = netTotal + totalTax;
    const commissionRate = currentTrip.commissionRate || 0.10;
    const commission = subtotalWithTax * commissionRate;

    const formData = {
      refNumber,
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
      total: total.toFixed(2),
      netTotal: netTotal,
      totalTax: totalTax.toFixed(2),
      uid: user.uid,
      owner: tripOwnerId,
      currency: getCurrentCurrency(),
      currencyRate: getExchangeRateValue()
    };

    const response = await fetch('https://www.discover-sharm.com/hash', {
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment processing failed');
    }

    const data = await response.json();
    
    const paymentParams = new URLSearchParams({
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

    const kashierUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;

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
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
  }
}

// Initialize Number Controls
function initNumberControls() {
  const adultsPlus = document.getElementById('adultsPlus');
  const adultsMinus = document.getElementById('adultsMinus');
  
  if (adultsPlus && adultsMinus) {
    adultsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('adults');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue < MAX_PER_TYPE) {
        input.value = currentValue + 1;
        updateInfantsMax();
        updateSummary();
      }
      return false;
    });
    
    adultsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('adults');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue > 1) {
        input.value = currentValue - 1;
        updateInfantsMax();
        updateSummary();
      }
      return false;
    });
  }

  const childrenPlus = document.getElementById('childrenUnder12Plus');
  const childrenMinus = document.getElementById('childrenUnder12Minus');
  
  if (childrenPlus && childrenMinus) {
    childrenPlus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('childrenUnder12');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue < MAX_PER_TYPE) {
        input.value = currentValue + 1;
        updateSummary();
      }
      return false;
    });
    
    childrenMinus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('childrenUnder12');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
        updateSummary();
      }
      return false;
    });
  }

  const infantsPlus = document.getElementById('infantsPlus');
  const infantsMinus = document.getElementById('infantsMinus');
  
  if (infantsPlus && infantsMinus) {
    infantsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('infants');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue < input.max) {
        input.value = currentValue + 1;
        updateSummary();
      }
      return false;
    });
    
    infantsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('infants');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
        updateSummary();
      }
      return false;
    });
  }
}

// Initialize the application
window.onload = async function () {
  if (!tripPName) {
    showToast("No trip specified. Please access this page through a valid trip link.", 'error');
    return;
  }

  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    try {
      iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: "eg",
        customPlaceholder: (selectedCountryPlaceholder, selectedCountryData) => "e.g. " + selectedCountryPlaceholder
      });
    } catch (error) {
      console.error("intlTelInput initialization failed:", error);
    }
  }

  initNumberControls();

  flatpickr("#tripDate", {
    locale: "en",
    minDate: new Date().fp_incr(1),
    dateFormat: "Y-m-d",
    inline: false,
    disableMobile: true,
    onReady: function(selectedDates, dateStr, instance) {
      const elements = [
        instance.calendarContainer,
        ...instance.calendarContainer.querySelectorAll('.flatpickr-weekdays, .flatpickr-current-month, .flatpickr-day')
      ];
      elements.forEach(el => el?.setAttribute('translate', 'no'));
    },
    onChange: updateSummary
  });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .flatpickr-calendar { background: #222 !important; color: #ffc207 !important; border-radius: 10px !important; border: 1px solid #333 !important; }
    .flatpickr-months, .flatpickr-weekdays { background: #222 !important; }
    .flatpickr-month, .flatpickr-weekday { color: #ffc207 !important; }
    .flatpickr-prev-month, .flatpickr-next-month, .flatpickr-prev-month svg, .flatpickr-next-month svg { color: #ffc107 !important; fill: #ffc107 !important; }
    .flatpickr-day { color: #ffc207 !important; background: #333 !important; border-radius: 8px !important; border: none !important; }
    .flatpickr-day:hover { background: #444 !important; color: #ffc207 !important; }
    .flatpickr-day.selected { background: #ffc207 !important; color: #111 !important; font-weight: bold !important; }
    .flatpickr-day.prevMonthDay, .flatpickr-day.nextMonthDay { color: #666 !important; background: transparent !important; }
    .flatpickr-day.today { border: 1px solid #ffc107 !important; }
    .flatpickr-day.flatpickr-disabled, .prev-day-disabled { background: #333 !important; color: #666 !important; opacity: 0.4 !important; cursor: not-allowed !important; pointer-events: none !important; }
    .flatpickr-time input, .flatpickr-time .flatpickr-time-separator, .flatpickr-time .flatpickr-am-pm { color: #ffc207 !important; }
  `;
  document.head.appendChild(style);

  document.getElementById('tripType').addEventListener('change', function() {
    selectedTripType = this.value;
    updateSummary();
  });

  document.getElementById('submitBtn').addEventListener('click', submitForm);

  // Initialize currency integration FIRST
  initCurrencyIntegration();

  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserUid = user.uid;
      populateForm();
    } else {
      currentUserUid = 'anonymous';
    }
  });

  await populateForm();
  await fetchAllTripData();
  updateSummary();
};
