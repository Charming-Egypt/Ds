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
    const priceInUSD = (currentTrip.price / exchangeRate).toFixed(2);
    priceElement.innerHTML = `
      <span class="notranslate">${priceInUSD} $</span>
      <span class="text-sm text-gray-500 notranslate">(${currentTrip.price} EGP)</span>
    `;
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
        const priceInUSD = (currentTrip.price / exchangeRate).toFixed(2);
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}">
          <div class="price-tag notranslate">
            ${priceInUSD} $<br>
            <span class="text-xs">${currentTrip.price} EGP</span>
          </div>
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

// ... [Rest of the code remains exactly the same as in the previous version] ...

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

  // Inject CSS for date picker and price display
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

    /* Price tag styles */
    .price-tag {
      text-align: center;
      line-height: 1.2;
    }

    .price-tag span {
      font-size: 0.7em;
      opacity: 0.8;
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

  // Initialize components - fetch exchange rate first
  await fetchExchangeRate();
  await Promise.all([
    populateForm(),
    fetchAllTripData()
  ]);
  
  // Set initial summary values
  updateSummary();
};
