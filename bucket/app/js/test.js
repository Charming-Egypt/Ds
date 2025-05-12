// Initialize Swiper
let swiper;
let currentVideoSlide = null;

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
  authDomain: "egypt-travels.firebaseapp.com",
  databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
  projectId: "egypt-travels",
  storageBucket: "egypt-travels.appspot.com",
  messagingSenderId: "477485386557",
  appId: "1:477485386557:web:755f9649043288db819354"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

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
let exchangeRate = 50; // Default exchange rate (will be updated from Firebase)
let currentStep = 0;

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
  
  // Update step indicators
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
  
  // Show/hide appropriate buttons
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
  
  // Hide submit button when going back
  document.getElementById('submitBtn').classList.add('hidden');
  
  updateProgressBar();
}

// Exchange Rate Function
async function fetchExchangeRate() {
  try {
    const snapshot = await database.ref('exchangeRates').once('value');
    const rateData = snapshot.val();
    if (rateData && rateData.rate) {
      exchangeRate = parseFloat(rateData.rate);
    }
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }
}

// Trip Data Functions
async function fetchAllTripData() {
  try {
    showSpinner();
    const snapshot = await database.ref('trips').once('value');
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
      
      // Load dynamic content
      loadMediaContent(currentTrip.media);
      loadIncludedNotIncluded(currentTrip);
      loadTimeline(currentTrip.timeline);
      loadWhatToBring(currentTrip.whatToBring);
      updateRating(currentTrip.rating);
      
      // Update price display
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
    priceElement.textContent = `EGP ${currentTrip.price}`;
  }
}

function updateRating(ratingData) {
  if (!ratingData) return;
  
  const ratingStars = document.getElementById('ratingStars');
  const ratingCount = document.getElementById('ratingCount');
  
  if (ratingStars && ratingCount) {
    // Clear existing stars
    ratingStars.innerHTML = '';
    
    const averageRating = ratingData.average || 0;
    const reviewCount = ratingData.count || 0;
    
    // Add full stars
    const fullStars = Math.floor(averageRating);
    for (let i = 0; i < fullStars; i++) {
      ratingStars.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (averageRating % 1 >= 0.5) {
      ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    const emptyStars = 5 - Math.ceil(averageRating);
    for (let i = 0; i < emptyStars; i++) {
      ratingStars.innerHTML += '<i class="far fa-star"></i>';
    }
    
    // Update review count
    ratingCount.textContent = `(${reviewCount} reviews)`;
  }
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;

  const swiperWrapper = document.querySelector('.swiper-wrapper');
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');
  
  // Clear existing slides and thumbnails
  if (swiperWrapper) swiperWrapper.innerHTML = '';
  if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
  
  // Add image slides
  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      // Add main slide
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      
      // First slide gets special treatment (price tag and title)
      if (index === 0) {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}">
          <div class="price-tag notranslate">EGP ${currentTrip.price}</div>
          <div class="tour-title-overlay">
            
            <div class="tour-meta">
              <span class="tour-meta-item">
                <i class="fas fa-star"></i> ${currentTrip.rating?.average?.toFixed(1) || '4.9'}
              </span>
              <span class="tour-meta-item">
                <i class="fas fa-clock"></i> Full day
              </span>
              <span class="tour-meta-item">
                <i class="fas fa-user-group"></i> Max 10
              </span>
            </div>
          </div>
        `;
      } else {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}">
          <div class="tour-title-overlay">
        
          </div>
        `;
      }
      
      swiperWrapper.appendChild(slide);
      
      // Add thumbnail
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
  
  // Add video slides
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach((video, index) => {
      const videoIndex = mediaData.images ? mediaData.images.length + index : index;
      
      // Create video slide
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
        <div class="tour-title-overlay">
          
        </div>
      `;
      
      swiperWrapper.appendChild(slide);
      
      // Add video thumbnail
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
  
  // Initialize or update Swiper
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      on: {
        slideChange: function() {
          updateActiveThumbnail(this.realIndex);
          
          // Pause any playing video when changing slides
          if (currentVideoSlide) {
            const iframe = currentVideoSlide.querySelector('iframe');
            if (iframe) {
              iframe.src = ''; // This stops the video
              currentVideoSlide.innerHTML = `
                <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
                <div class="play-button">
                  <i class="fas fa-play"></i>
                </div>
                <div class="tour-title-overlay">
                
                </div>
              `;
              currentVideoSlide = null;
            }
          }
        }
      }
    });
    
    // Add click handler for play buttons
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
  
  // Set first thumbnail as active
  if (thumbnailsContainer.firstChild) {
    thumbnailsContainer.firstChild.classList.add('active');
  }
}

function playVideo(slide) {
  if (currentVideoSlide) {
    // If another video is playing, stop it first
    const iframe = currentVideoSlide.querySelector('iframe');
    if (iframe) {
      iframe.src = '';
      currentVideoSlide.innerHTML = `
        <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
        <div class="tour-title-overlay">
          <h1>${currentTrip.name}</h1>
        </div>
      `;
    }
  }
  
  // Store the thumbnail for later
  const thumbnail = slide.querySelector('img').src;
  slide.dataset.thumbnail = thumbnail;
  
  // Extract video ID from URL (works for YouTube)
  const videoUrl = slide.dataset.videoUrl;
  let videoId;
  
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    // YouTube URL
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    videoId = (match && match[2].length === 11) ? match[2] : null;
    
    if (videoId) {
      slide.innerHTML = `
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        <div class="tour-title-overlay">
          <h1>${currentTrip.name}</h1>
        </div>
      `;
      currentVideoSlide = slide;
    }
  } else {
    // For other video providers, you might need different handling
    slide.innerHTML = `
      <video width="100%" height="100%" controls autoplay>
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      <div class="tour-title-overlay">
        <h1>${currentTrip.name}</h1>
      </div>
    `;
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
      itemElement.style.display = 'flex';
      itemElement.style.alignItems = 'center';
      itemElement.style.gap = '10px';
      itemElement.style.marginBottom = '10px';
      itemElement.innerHTML = `
        <i class="fas fa-check" style="color: #4CAF50;"></i>
        <span>${item}</span>
      `;
      includedContainer.appendChild(itemElement);
    });
  }
  
  if (notIncludedContainer && tripData.notIncluded) {
    notIncludedContainer.innerHTML = '';
    tripData.notIncluded.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.style.display = 'flex';
      itemElement.style.alignItems = 'center';
      itemElement.style.gap = '10px';
      itemElement.style.marginBottom = '10px';
      itemElement.innerHTML = `
        <i class="fas fa-times" style="color: #F44336;"></i>
        <span>${item}</span>
      `;
      notIncludedContainer.appendChild(itemElement);
    });
  }
}

function loadTimeline(timelineData) {
  const timelineContainer = document.getElementById('timelineContainer');
  if (!timelineContainer || !timelineData) return;
  
  timelineContainer.innerHTML = '';
  
  timelineData.forEach((item, index) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    
    timelineItem.innerHTML = `
      <div class="timeline-time"></div>
      <div class="timeline-content">
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-description">${item.description}</div>
      </div>
    `;
    
    // Add time if available
    if (item.time) {
      const timeElement = timelineItem.querySelector('.timeline-time');
      timeElement.setAttribute('title', item.time);
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
    li.style.padding = '8px 0';
    li.style.borderBottom = '1px dashed #64748b';
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '10px';
    li.innerHTML = `
      <i class="fas fa-check" style="color: #f59e0b;"></i> ${item}
    `;
    whatToBringList.appendChild(li);
  });
}

function populateTripTypeDropdown(tourTypes) {
  const tripTypeSelect = document.getElementById('tripType');
  if (!tripTypeSelect) {
    console.error("Trip type select element not found");
    return;
  }
  
  tripTypeSelect.innerHTML = '';
  
  // Add default "No extra services" option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'No extra services needed';
  defaultOption.selected = true;
  tripTypeSelect.appendChild(defaultOption);
  
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${tourTypes[key]} EGP (per person)`;
      tripTypeSelect.appendChild(option);
    });
  }
}

function displayTripInfo(tripInfo) {
  const tripTitle = document.getElementById('tourTitle');
  const tripName = document.getElementById('tripName');
  
  if (tripTitle && tripInfo.name) {
    tripTitle.textContent = tripInfo.name;
  }
  
  if (tripName) {
    tripName.value = tripPName;
  }
}

// Price Calculation Functions
function calculateBaseTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  
  if (!currentTrip.basePrice) return 0;
  
  const basePrice = parseInt(currentTrip.basePrice);
  return (adults * basePrice) + (childrenUnder12 * Math.round(basePrice * 0.7));
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

function calculateTotalWithTaxesAndCommission() {
  const netTotal = calculateNetTotal();
  const baseTax = netTotal * TAX_RATE; // 3% of net total
  const taxOnTax = baseTax * TAX_ON_TAX_RATE; // 14% of the 3%
  const totalTax = baseTax + taxOnTax + FIXED_FEE;
  const subtotalWithTax = netTotal + totalTax;
  const commissionRate = currentTrip.commissionRate || 0.15;
  const commission = subtotalWithTax * commissionRate;
  return subtotalWithTax + commission;
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  
  if (!adultsInput || !infantsInput) return;
  
  const adults = parseInt(adultsInput.value) || 0;
  const currentInfants = parseInt(infantsInput.value) || 0;
  
  // Calculate maximum allowed infants (2 per adult, but no more than 10 total)
  const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  
  // If current infants exceed the new maximum, adjust it
  if (currentInfants > maxInfants) {
    infantsInput.value = maxInfants;
  }
  
  // Update the max attribute to prevent manual entry beyond limit
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
    const basePrice = parseInt(currentTrip.basePrice);
    const childPriceUnder12 = Math.round(basePrice * 0.7);
    
    if (summaryTour) summaryTour.textContent = `${currentTrip.name}`;
    if (summaryAdults) summaryAdults.textContent = `${adults} Adult${adults !== 1 ? 's' : ''}`;
    if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = `${childrenUnder12} Child${childrenUnder12 !== 1 ? 'ren' : ''}`;
    if (summaryInfants) summaryInfants.textContent = `${infants} Infant${infants !== 1 ? 's' : ''}`;
    
    if (selectedService && tourTypes[selectedService]) {
      const servicePrice = parseInt(tourTypes[selectedService]);
      const serviceTotal = (adults + childrenUnder12) * servicePrice;
      if (summaryService) {
        summaryService.textContent = `${selectedService}`;
      }
    } else {
      if (summaryService) summaryService.textContent = 'None';
    }
    
    const total = calculateTotalWithTaxesAndCommission();
    const totalUSD = (total / exchangeRate).toFixed(2);
    
    if (totalPriceDisplay) {
      totalPriceDisplay.innerHTML = `
        <div class="font-bold text-xl notranslate">${totalUSD} $</div>
        <div class="text-sm text-green-600 mt-1 notranslate">${total.toFixed(2)} EGP</div>
        <div class="text-xs text-gray-500">Exchange rate: 1 USD = ${exchangeRate} EGP</div>
        <div class="text-xs text-gray-500">all taxes included</div>
      `;
    }
  }
}

async function populateForm() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userSnapshot = await database.ref('egy_user').child(user.uid).once('value');
    const userData = userSnapshot.val();

    if (userData) {
      if (document.getElementById("username")) {
        document.getElementById("username").value = userData.username || "";
      }
      if (document.getElementById("customerEmail")) {
        document.getElementById("customerEmail").value = userData.email || "";
      }
      if (document.getElementById("uid")) {
        document.getElementById("uid").value = user.uid || "";
      }
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
    
    const phoneNumber = iti?.getNumber();
    if (!phoneNumber || !iti?.isValidNumber()) {
      showError('phone', 'Please enter a valid phone number with country code');
      isValid = false;
    } else {
      clearError('phone');
      if (document.getElementById("phone")) {
        document.getElementById("phone").value = phoneNumber;
      }
    }
  } else if (currentStep === 1) {
    const tripDate = document.getElementById("tripDate")?.value.trim();
    const hotelName = document.getElementById("hotelName")?.value.trim();
    const roomNumber = document.getElementById("roomNumber")?.value.trim();
    
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

// Form Submission
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in to complete your booking');
    }

    const total = calculateTotalWithTaxesAndCommission();
    const netTotal = calculateNetTotal();
    const baseTax = netTotal * TAX_RATE;
    const taxOnTax = baseTax * TAX_ON_TAX_RATE;
    const totalTax = baseTax + taxOnTax + FIXED_FEE;
    const subtotalWithTax = netTotal + totalTax;
    const commissionRate = currentTrip.commissionRate || 0.15;
    const commission = subtotalWithTax * commissionRate;

    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      tripDate: document.getElementById("tripDate").value,
      tripType: selectedTripType || 'None',
      tripTypePrice: selectedTripType ? tourTypes[selectedTripType] : 0,
      basePrice: currentTrip.basePrice,
      hotelName: sanitizeInput(document.getElementById("hotelName").value),
      roomNumber: sanitizeInput(document.getElementById("roomNumber").value),
      timestamp: Date.now(),
      status: "pending",
      tour: tripPName,
      adults: parseInt(document.getElementById('adults').value) || 0,
      childrenUnder12: parseInt(document.getElementById('childrenUnder12').value) || 0,
      infants: parseInt(document.getElementById('infants').value) || 0,
      currency: 'EGP',
      total: total,
      netTotal: netTotal,
      baseTax: baseTax,
      taxOnTax: taxOnTax,
      fixedFee: FIXED_FEE,
      totalTax: totalTax,
      commissionRate: commissionRate,
      commission: commission,
      uid: user.uid,
      owner: tripOwnerId,
      exchangeRate: exchangeRate
    };

    // Generate payment hash
    const response = await fetch('https://api.discover-sharm.com/.netlify/functions/generate-hash', {
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
    
    // Construct payment URL
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

    const kashierUrl = `https://checkout.kashier.io/?${paymentParams.toString()}`;

    // Save complete booking to Firebase
    await database.ref('trip-bookings').child(refNumber).set({
      ...formData,
      paymenturl: kashierUrl,
    });

    // Store user data in session
    sessionStorage.setItem("username", formData.username);
    sessionStorage.setItem("email", formData.email);
    sessionStorage.setItem("phone", formData.phone);

    showToast('Booking submitted! Redirecting to payment...');
    
    // Redirect to payment page in the same window
    window.location.href = kashierUrl;
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
  }
}

// Initialize Number Controls
function initNumberControls() {
  // Adults controls
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

  // Children under 12 controls
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

  // Infants controls
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
  // Check if trip ID is provided
  if (!tripPName) {
    showToast("No trip specified. Please access this page through a valid trip link.", 'error');
    return;
  }

  // Initialize phone input
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

  // Initialize number controls
  initNumberControls();

  // Initialize date picker
  flatpickr("#tripDate", {
    locale: "en",
    minDate: new Date().fp_incr(1), // Tomorrow's date
    dateFormat: "Y-m-d",
    inline: false,
    disableMobile: true,
    onReady: function(selectedDates, dateStr, instance) {
        // Add translate='no' to prevent auto-translation
        const elements = [
            instance.calendarContainer,
            ...instance.calendarContainer.querySelectorAll('.flatpickr-weekdays, .flatpickr-current-month, .flatpickr-day')
        ];
        elements.forEach(el => el?.setAttribute('translate', 'no'));
    },
    onChange: updateSummary
  });

  // Inject CSS for date picker
  const style = document.createElement('style');
  style.textContent = `
    /* Flatpickr Dark Theme Overrides */
    .flatpickr-calendar {
      background: #222 !important;
      color: #ffc207 !important;
      border-radius: 10px !important;
      border: 1px solid #333 !important;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) !important;
    }

    /* Month header */
    .flatpickr-months,
    .flatpickr-weekdays {
      background: #222 !important;
    }

    .flatpickr-month,
    .flatpickr-weekday {
      color: #ffc207 !important;
    }

    /* Navigation arrows */
    .flatpickr-prev-month,
    .flatpickr-next-month,
    .flatpickr-prev-month svg,
    .flatpickr-next-month svg {
      color: #ffc107 !important;
      fill: #ffc107 !important;
    }

    /* Day cells */
    .flatpickr-day {
      color: #ffc207 !important;
      background: #333 !important;
      border-radius: 8px !important;
      border: none !important;
    }

    /* Hover state */
    .flatpickr-day:not(.flatpickr-disabled):hover {
      background: #444 !important;
      color: #ffc207 !important;
    }

    /* Selected day */
    .flatpickr-day.selected {
      background: #ffc207 !important;
      color: #111 !important;
      font-weight: bold !important;
    }

    /* Adjacent month days */
    .flatpickr-day.prevMonthDay,
    .flatpickr-day.nextMonthDay {
      color: #666 !important;
      background: transparent !important;
    }

    /* Today */
    .flatpickr-day.today {
      border: 1px solid #ffc107 !important;
    }

    .flatpickr-day.today.flatpickr-disabled {
      background: #333 !important;
      color: #fff !important;
      border-color: #E64A19 !important;
    }

    .flatpickr-day.today.selected {
      background: #388E3C !important;
      color: #fff !important;
    }

    /* Disabled days */
    .flatpickr-day.flatpickr-disabled,
    .flatpickr-day.flatpickr-disabled:hover,
    .prev-day-disabled {
      background: #333 !important;
      color: #666 !important;
      opacity: 0.4 !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
    }

    /* Time input */
    .flatpickr-time input,
    .flatpickr-time .flatpickr-time-separator,
    .flatpickr-time .flatpickr-am-pm {
      color: #ffc207 !important;
    }
  `;
  document.head.appendChild(style);

  // Trip type change handler
  document.getElementById('tripType').addEventListener('change', function() {
    selectedTripType = this.value;
    updateSummary();
  });

  // Form submission handler
  document.getElementById('submitBtn').addEventListener('click', submitForm);

  // Initialize user authentication
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserUid = user.uid;
      populateForm();
    } else {
      currentUserUid = 'anonymous';
    }
  });

  // Initialize components
  await Promise.all([
    populateForm(),
    fetchExchangeRate(),
    fetchAllTripData()
  ]);
  
  // Set initial summary values
  updateSummary();
};
