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
  const priceElement = document.getElementById('Price');
  if (priceElement && currentTrip.price) {
    priceElement.textContent = `$${currentTrip.price}`;
  }
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;

  const swiperWrapper = document.querySelector('.swiper-wrapper');
  if (!swiperWrapper) return;

  // Clear existing slides
  swiperWrapper.innerHTML = '';

  // Add image slides
  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      
      // First slide gets special treatment (price tag)
      if (index === 0) {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}" class="w-full h-full object-cover">
          <div class="absolute top-0 left-0 right-0 z-10 p-8">
            <span class="inline-block px-4 py-2 bg-amber-500/90 text-black rounded-full text-xl font-bold mb-3 glow-effect" id="Price">$${currentTrip.price}</span>
          </div>
          <div class="absolute bottom-10 left-0 right-0 z-10 p-8">
            <div class="max-w-4xl">
              <h1 class="text-4xl md:text-5xl font-bold mb-4">${currentTrip.name}</h1>
              <div class="flex items-center gap-4">
                <span class="flex items-center text-white gap-1">
                  <i class="fas fa-star text-amber-400"></i>
                  <span>4.9</span>
                </span>
                <span class="flex items-center text-white gap-1">
                  <i class="fas fa-clock text-amber-400"></i>
                  <span>Full day</span>
                </span>
                <span class="flex items-center text-white gap-1">
                  <i class="fas fa-user-group text-amber-400"></i>
                  <span>(max 10)</span>
                </span>
              </div>
            </div>
          </div>
        `;
      } else {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}" class="w-full h-full object-cover">
          <div class="absolute bottom-0 left-0 right-0 z-10 p-8">
            <h2 class="text-3xl font-bold mb-2">${currentTrip.name}</h2>
            <p class="text-lg max-w-2xl">${currentTrip.description || ''}</p>
          </div>
        `;
      }
      
      swiperWrapper.appendChild(slide);
    });
  }

  // Add video slides
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach(video => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="${currentTrip.name} video" class="w-full h-full object-cover">
        <div class="absolute inset-0 flex items-center justify-center">
          <button class="play-button relative z-20 bg-amber-500/90 hover:bg-amber-600 text-dark-900 rounded-full w-16 h-16 flex items-center justify-center transition-all glow-effect">
            <i class="fas fa-play text-2xl"></i>
          </button>
        </div>
      `;
      
      // Add click handler for video play
      const playButton = slide.querySelector('.play-button');
      if (playButton) {
        playButton.addEventListener('click', function() {
          window.open(video.videoUrl, '_blank');
        });
      }
      
      swiperWrapper.appendChild(slide);
    });
  }

  // Reinitialize Swiper if needed
  if (window.swiper) {
    window.swiper.update();
  }
}

function loadIncludedNotIncluded(tripData) {
  const includedList = document.querySelector('.info-card:first-of-type ul');
  const notIncludedList = document.querySelector('.info-card:last-of-type ul');
  
  if (includedList && tripData.included) {
    includedList.innerHTML = '';
    tripData.included.forEach(item => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3';
      li.innerHTML = `
        <i class="fas fa-check-circle text-amber-400 mt-1"></i>
        <span>${item}</span>
      `;
      includedList.appendChild(li);
    });
  }
  
  if (notIncludedList && tripData.notIncluded) {
    notIncludedList.innerHTML = '';
    tripData.notIncluded.forEach(item => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3';
      li.innerHTML = `
        <i class="fas fa-times-circle text-red-400 mt-1"></i>
        <span>${item}</span>
      `;
      notIncludedList.appendChild(li);
    });
  }
}

function loadTimeline(timelineData) {
  const timelineContainer = document.querySelector('.info-card.rounded-3xl .space-y-6');
  if (!timelineContainer || !timelineData) return;
  
  timelineContainer.innerHTML = '';
  
  timelineData.forEach((item, index) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'flex gap-4 relative pl-10';
    
    // Add connector line except for last item
    if (index < timelineData.length - 1) {
      timelineItem.innerHTML = '<div class="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/30"></div>';
    }
    
    timelineItem.innerHTML += `
      <div class="absolute left-0 top-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center -ml-3">
        <div class="w-3 h-3 rounded-full bg-dark-900"></div>
      </div>
      <div>
        <div class="text-amber-400 font-mono text-sm mb-1">${item.time}</div>
        <h3 class="font-bold text-lg">${item.title}</h3>
        <p class="text-gray-300 mt-1">${item.description}</p>
      </div>
    `;
    
    timelineContainer.appendChild(timelineItem);
  });
}

function loadWhatToBring(whatToBringData) {
  const whatToBringList = document.querySelector('.info-card:last-of-type ul');
  if (!whatToBringList || !whatToBringData) return;
  
  whatToBringList.innerHTML = '';
  whatToBringData.forEach(item => {
    const li = document.createElement('li');
    li.className = 'flex items-start gap-2';
    li.innerHTML = `
      <i class="fas fa-check text-amber-400 mt-1"></i>
      <span>${item}</span>
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
  const tripTitle = document.getElementById('trip-title');
  if (tripTitle && tripInfo.name) {
    tripTitle.textContent = tripInfo.name;
  }
  
  const tripImage = document.getElementById('trip-image');
  if (tripImage && tripInfo.image) {
    tripImage.src = tripInfo.image;
    tripImage.alt = tripInfo.description || 'Trip image';
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

let debounceTimer;
function updateSummary() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
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
      if (summaryAdults) summaryAdults.textContent = `${adults} Adult's`;
      if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = `${childrenUnder12} Children's`;
      if (summaryInfants) summaryInfants.textContent = `${infants} Infant's`;
      
      if (selectedService && tourTypes[selectedService]) {
        const servicePrice = parseInt(tourTypes[selectedService]);
        const serviceTotal = (adults + childrenUnder12) * servicePrice;
        if (summaryService) {
          summaryService.textContent = `${selectedService}`;
          summaryService.classList.remove('hidden');
        }
      } else {
        if (summaryService) summaryService.classList.add('hidden');
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
  }, 300);
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

  // Initialize form values
  if (document.getElementById('adults')) {
    document.getElementById('adults').value = 1;
  }
  if (document.getElementById('childrenUnder12')) {
    document.getElementById('childrenUnder12').value = 0;
  }
  if (document.getElementById('infants')) {
    document.getElementById('infants').value = 0;
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserUid = user.uid;
    } else {
      currentUserUid = 'anonymous';
    }
  });

  // Initialize components
  await Promise.all([
    populateForm(),
    fetchExchangeRate()
  ]);
  
  // Initialize Swiper
  const swiper = new Swiper('.swiper', {
    effect: 'creative',
    creativeEffect: {
      prev: {
        shadow: true,
        translate: ['-120%', 0, -500],
        opacity: 0.5,
        scale: 0.85
      },
      next: {
        shadow: true,
        translate: ['120%', 0, -500],
        opacity: 0.5,
        scale: 0.85
      },
    },
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    speed: 800,
    grabCursor: true,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    a11y: {
      prevSlideMessage: 'Previous slide',
      nextSlideMessage: 'Next slide',
      paginationBulletMessage: 'Go to slide {{index}}',
    },
    breakpoints: {
      640: {
        creativeEffect: {
          prev: {
            translate: ['-100%', 0, -400],
          },
          next: {
            translate: ['100%', 0, -400],
          }
        }
      },
      1024: {
        creativeEffect: {
          prev: {
            translate: ['-80%', 0, -300],
          },
          next: {
            translate: ['80%', 0, -300],
          }
        }
      }
    }
  });
  window.swiper = swiper;

  // Initialize number controls
  const initNumberControls = () => {
    // Adults controls
    const adultsPlus = document.getElementById('adultsPlus');
    const adultsMinus = document.getElementById('adultsMinus');
    
    if (adultsPlus && adultsMinus) {
      adultsPlus.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('adults');
        if (!input) return;
        
        const currentValue = parseInt(input.value);
        if (currentValue < MAX_PER_TYPE) {
          input.value = currentValue + 1;
          updateInfantsMax();
          updateSummary();
        }
      });
      
      adultsMinus.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('adults');
        if (!input) return;
        
        const currentValue = parseInt(input.value);
        if (currentValue > 1) {
          input.value = currentValue - 1;
          updateInfantsMax();
          updateSummary();
        }
      });
    }

    // Children under 12 controls
    const childrenPlus = document.getElementById('childrenUnder12Plus');
    const childrenMinus = document.getElementById('childrenUnder12Minus');
    
    if (childrenPlus && childrenMinus) {
      childrenPlus.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('childrenUnder12');
        if (!input) return;
        
        const currentValue = parseInt(input.value);
        if (currentValue < MAX_PER_TYPE) {
          input.value = currentValue + 1;
          updateSummary();
        }
      });
      
      childrenMinus.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('childrenUnder12');
        if (!input) return;
        
        const currentValue = parseInt(input.value);
        if (currentValue > 0) {
          input.value = currentValue - 1;
          updateSummary();
        }
      });
    }

    // Infants controls
    const infantsPlus = document.getElementById('infantsPlus');
    const infantsMinus = document.getElementById('infantsMinus');
    
    if (infantsPlus && infantsMinus) {
      infantsPlus.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('infants');
        const adultsInput = document.getElementById('adults');
        if (!input || !adultsInput) return;
        
        const currentValue = parseInt(input.value);
        const adults = parseInt(adultsInput.value);
        
        // Calculate maximum allowed infants (2 per adult, but no more than 10 total)
        const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
        
        if (currentValue < maxInfants) {
          input.value = currentValue + 1;
          updateSummary();
        }
      });
      
      infantsMinus.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('infants');
        if (!input) return;
        
        const currentValue = parseInt(input.value);
        if (currentValue > 0) {
          input.value = currentValue - 1;
          updateSummary();
        }
      });
    }

    // Trip type change
    const tripTypeSelect = document.getElementById('tripType');
    if (tripTypeSelect) {
      tripTypeSelect.addEventListener('change', function() {
        selectedTripType = this.value;
        updateSummary();
      });
    }
  };
  initNumberControls();

  // Initialize date picker
  const initDatePicker = () => {
    const dateInput = document.getElementById('tripDate');
    if (!dateInput) return;

    flatpickr(dateInput, {
      locale: "en",
      dateFormat: "Y-m-d",
      inline: false,
      theme: "dark",
      disableMobile: true,
      disable: [
        function(date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return date <= today;
        }
      ],
      onChange: function(selectedDates, dateStr, instance) {
        updateSummary();
      },
      onDayCreate: function(dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (fp.currentMonth === date.getMonth() && fp.currentYear === date.getFullYear()) {
          if (flatpickr.compareDates(date, today) < 0) {
            dayElem.classList.add("prev-day-disabled");
          }
        }

        if (flatpickr.compareDates(date, today) === 0) {
          dayElem.classList.add("today");
        }
      },
      onReady: function(selectedDates, dateStr, instance) {
        if (instance.calendarContainer) {
          instance.calendarContainer.setAttribute('translate', 'no');
          const weekdaysElement = instance.calendarContainer.querySelector('.flatpickr-weekdays');
          if (weekdaysElement) {
            weekdaysElement.setAttribute('translate', 'no');
          }
        }
      }
    });
  };
  initDatePicker();

  // Fetch trip data
  try {
    await fetchAllTripData();
  } catch (error) {
    console.error("Initialization failed:", error);
  }
  
  // Initialize phone input value if available
  if (iti) {
    iti.promise.then(() => {
      const phoneValue = document.getElementById("phone")?.value;
      if (phoneValue) {
        iti.setNumber(phoneValue);
      }
    }).catch(error => {
      console.error("Phone input initialization failed:", error);
    });
  }
  
  // Add event listeners for input changes
  const inputsToWatch = ['adults', 'childrenUnder12', 'infants', 'tripDate', 'hotelName', 'roomNumber', 'tripType'];
  inputsToWatch.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', updateSummary);
    }
  });

  // Add event listener for form submission
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitForm();
    });
  }
};

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

    showToast('Booking submitted! Opening payment window...');
    
    // Open payment in full-screen popup
    const width = Math.min(window.screen.width, 1200);
    const height = Math.min(window.screen.height, 800);
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const paymentWindow = window.open(
      kashierUrl,
      'PaymentWindow',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,location=no,status=no,menubar=no`
    );
    
    // Focus the window if it exists
    if (paymentWindow) {
      paymentWindow.focus();
      
      // Check if the window is closed every second
      const checkWindowClosed = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkWindowClosed);
          // Refresh the page when payment window is closed
          window.location.reload();
        }
      }, 1000);
    } else {
      // If popup was blocked, show error and provide alternative
      showToast('Popup was blocked. Please allow popups or click the button below to proceed.', 'error');
      const proceedBtn = document.createElement('button');
      proceedBtn.textContent = 'Proceed to Payment';
      proceedBtn.className = 'btn btn-primary mt-2';
      proceedBtn.onclick = () => window.location.href = kashierUrl;
      
      const toast = document.querySelector('.toast-error');
      if (toast) {
        toast.appendChild(proceedBtn);
      } else {
        window.location.href = kashierUrl;
      }
    }
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
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
