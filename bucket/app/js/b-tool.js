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

// Initialize phone input
const phoneInput = document.querySelector("#phone");
const iti = window.intlTelInput(phoneInput, {
  utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
  preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
  separateDialCode: true,
  initialCountry: "eg",
  customPlaceholder: (selectedCountryPlaceholder, selectedCountryData) => "e.g. " + selectedCountryPlaceholder
});

// DOM Elements
const steps = [
  document.getElementById("step1"),
  document.getElementById("step2"),
  document.getElementById("step3"),
  document.getElementById("step4")
];
const stepIndicators = [
  document.getElementById("step1Indicator"),
  document.getElementById("step2Indicator"),
  document.getElementById("step3Indicator"),
  document.getElementById("step4Indicator")
];
let currentStep = 0;

// Trip configuration
const path = window.location.pathname;
const match = path.match(/\/p\/(.*?)\.html/);
let tripName = match && match[1] ? match[1] : '';
let tripsData = {};
let selectedTripType = "";
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_2_ADULTS = 2;

// Generate random reference
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'REF_' + result;
}
const refNumber = generateReference();

// Sanitize user input
function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/</g, "<").replace(/>/g, ">");
}

// Fetch trip types from Firebase with retry logic
async function fetchTripTypesWithRetry(retries = 3) {
  try {
    const snapshot = await database.ref(`trips/${tripName}/tourtype`).once('value');
    return snapshot.val();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchTripTypesWithRetry(retries - 1);
    }
    throw error;
  }
}

// Fetch trip types
async function fetchTripTypes() {
  try {
    tripsData = await fetchTripTypesWithRetry();
    const tripTypeSelect = document.getElementById('tripType');
    tripTypeSelect.innerHTML = '<option value="" disabled selected>Select trip type</option>';
    if (tripsData) {
      Object.keys(tripsData).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${key} - ${tripsData[key]} EGP`;
        tripTypeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error fetching trip types:", error);
    showToast("Failed to load trip types. Please refresh the page.", 'error');
  }
}

// Calculate total price
function calculateTotalPrice() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children12Plus = parseInt(document.getElementById('children12Plus').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  if (!selectedTripType || !tripsData[selectedTripType]) return 0;
  const adultPrice = parseInt(tripsData[selectedTripType]);
  return (adults * adultPrice) + 
         (children12Plus * adultPrice) + 
         (childrenUnder12 * Math.round(adultPrice * 0.7));
}

// Update summary with debounce
let debounceTimer;
function updateSummary() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children12Plus = parseInt(document.getElementById('children12Plus').value) || 0;
    const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    const infants = parseInt(document.getElementById('infants').value) || 0;
    document.getElementById("summaryDate").textContent = document.getElementById("tripDate").value || "Not specified";
    document.getElementById("summaryHotel").textContent = sanitizeInput(document.getElementById("hotelName").value) || "Not specified yet";
    document.getElementById("summaryRoom").textContent = sanitizeInput(document.getElementById("roomNumber").value) || "Not specified yet";
    document.getElementById("summaryRef").textContent = refNumber;
    if (selectedTripType && tripsData[selectedTripType]) {
      const adultPrice = parseInt(tripsData[selectedTripType]);
      const childPriceUnder12 = Math.round(adultPrice * 0.7);
      document.getElementById("summaryTour").textContent = `${tripName} - ${selectedTripType}`;
      document.getElementById("summaryAdults").textContent = `${adults} X ${adultPrice} EGP = ${(adults * adultPrice).toFixed(2)} EGP`;
      document.getElementById("summaryChildren12Plus").textContent = `${children12Plus} X ${adultPrice} EGP = ${(children12Plus * adultPrice).toFixed(2)} EGP`;
      document.getElementById("summaryChildrenUnder12").textContent = `${childrenUnder12} X ${childPriceUnder12} EGP = ${(childrenUnder12 * childPriceUnder12).toFixed(2)} EGP`;
      document.getElementById("summaryInfants").textContent = `${infants} (Free)`;
      document.getElementById("totalPriceDisplay").textContent = `${calculateTotalPrice().toFixed(2)} EGP`;
    }
  }, 300);
}

// Form navigation
function nextStep() {
  if (!validateCurrentStep()) return;
  steps[currentStep].classList.add("hidden");
  stepIndicators[currentStep].setAttribute("data-active", "false");
  currentStep++;
  steps[currentStep].classList.remove("hidden");
  stepIndicators[currentStep].setAttribute("data-active", "true");
  updateProgressBar();
  if (currentStep === 3) updateSummary();
}

function prevStep() {
  steps[currentStep].classList.add("hidden");
  stepIndicators[currentStep].setAttribute("data-active", "false");
  currentStep--;
  steps[currentStep].classList.remove("hidden");
  stepIndicators[currentStep].setAttribute("data-active", "true");
  updateProgressBar();
}

// Form validation
function validateCurrentStep() {
  let isValid = true;
  if (currentStep === 0) {
    // Validate personal info
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
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
    const phoneNumber = iti.getNumber();
    if (!phoneNumber || !iti.isValidNumber()) {
      showError('phone', 'Please enter a valid phone number with country code');
      isValid = false;
    } else {
      clearError('phone');
      document.getElementById("phone").value = phoneNumber;
    }
  } else if (currentStep === 1) {
    // Validate trip details
    const tripDate = document.getElementById("tripDate").value.trim();
    const tripType = document.getElementById("tripType").value;
    const hotelName = document.getElementById("hotelName").value.trim();
    const roomNumber = document.getElementById("roomNumber").value.trim();
    if (!tripDate) {
      showError('tripDate', 'Please select a trip date');
      isValid = false;
    } else {
      clearError('tripDate');
    }
    if (!tripType) {
      showError('tripType', 'Please select a trip type');
      isValid = false;
    } else {
      selectedTripType = tripType;
      clearError('tripType');
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

// Update progress bar with accessibility
function updateProgressBar() {
  const progress = document.getElementById("progressBar");
  if (progress) {
    const progressPercentage = (currentStep / (steps.length - 1)) * 100;
    progress.style.width = `${progressPercentage}%`;
    progress.setAttribute('aria-valuenow', progressPercentage);
    progress.setAttribute('aria-valuetext', `Step ${currentStep + 1} of ${steps.length}`);
  }
}

// Error handling
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

// Toast notifications
function showToast(message, type = 'success') {
  const toast = document.createElement("div");
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Loading spinner
function showSpinner() {
  document.getElementById('spinner').classList.remove('hidden');
  document.getElementById('submitBtn').disabled = true;
}

function hideSpinner() {
  document.getElementById('spinner').classList.add('hidden');
  document.getElementById('submitBtn').disabled = false;
}

// Update max infants based on adults count
function updateInfantsMax() {
  const adults = parseInt(document.getElementById('adults').value);
  const infants = parseInt(document.getElementById('infants').value);
  const maxInfants = Math.floor(adults / 2) * MAX_INFANTS_PER_2_ADULTS;
  if (infants > maxInfants) {
    document.getElementById('infants').value = maxInfants;
  }
}

// Initialize number input controls
function initNumberControls() {
  // Adults controls (max 10, min 2)
  document.getElementById('adultsPlus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('adults');
    const currentValue = parseInt(input.value);
    if (currentValue < MAX_PER_TYPE) {
      input.value = currentValue + 1;
      updateInfantsMax();
    }
  });
  document.getElementById('adultsMinus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('adults');
    const currentValue = parseInt(input.value);
    if (currentValue > 1) {
      input.value = currentValue - 1;
      updateInfantsMax();
    }
  });

  // Children 12+ controls
  document.getElementById('children12PlusPlus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('children12Plus');
    const currentValue = parseInt(input.value);
    if (currentValue < MAX_PER_TYPE) {
      input.value = currentValue + 1;
    }
  });
  document.getElementById('children12PlusMinus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('children12Plus');
    const currentValue = parseInt(input.value);
    if (currentValue > 0) {
      input.value = currentValue - 1;
    }
  });

  // Children under 12 controls
  document.getElementById('childrenUnder12Plus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('childrenUnder12');
    const currentValue = parseInt(input.value);
    if (currentValue < 2) {
      input.value = currentValue + 1;
    }
  });
  document.getElementById('childrenUnder12Minus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('childrenUnder12');
    const currentValue = parseInt(input.value);
    if (currentValue > 0) {
      input.value = currentValue - 1;
    }
  });

  // Infants controls
  document.getElementById('infantsPlus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('infants');
    const currentValue = parseInt(input.value);
    const adults = parseInt(document.getElementById('adults').value);
    const maxInfants = Math.floor(adults / 2) * MAX_INFANTS_PER_2_ADULTS;
    if (currentValue < maxInfants && currentValue < MAX_PER_TYPE) {
      input.value = currentValue + 1;
    }
  });
  document.getElementById('infantsMinus').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('infants');
    const currentValue = parseInt(input.value);
    if (currentValue > 0) {
      input.value = currentValue - 1;
    }
  });

  // Update trip type change
  document.getElementById('tripType').addEventListener('change', function() {
    selectedTripType = this.value;
    if (currentStep === 3) updateSummary();
  });
}

// Form submission with enhanced error handling
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  try {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children12Plus = parseInt(document.getElementById('children12Plus').value) || 0;
    const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    const infants = parseInt(document.getElementById('infants').value) || 0;
    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      tripDate: document.getElementById("tripDate").value,
      tripType: selectedTripType,
      tripPrice: tripsData[selectedTripType],
      hotelName: sanitizeInput(document.getElementById("hotelName").value),
      roomNumber: sanitizeInput(document.getElementById("roomNumber").value),
      timestamp: new Date().toISOString(),
      status: "pending",
      tour: `${tripName} - ${selectedTripType}`,
      adults,
      children12Plus,
      childrenUnder12,
      infants,
      currency: 'EGP',
      total: calculateTotalPrice()
    };

    // Generate payment hash
    const response = await fetch('https://api.discover-sharm.com/.netlify/functions/generate-hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: formData.total,
        currency: formData.currency
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment processing failed');
    }
    const data = await response.json();
    const kashierUrl = `https://payments.kashier.io/?merchantId=MID-33260-3&orderId=${refNumber}&amount=${formData.total}&currency=${formData.currency}&hash=${data.hash}&mode=live&merchantRedirect=https://www.discover-sharm.com/p/thank-you.html&failureRedirect=false&redirectMethod=get`;

    // Save to Firebase
    const bookingsRef = database.ref('trip-bookings');
    await bookingsRef.child(refNumber).set({
      ...formData,
      paymenturl: kashierUrl
    });

    // Store user data in sessionStorage
    sessionStorage.setItem("username", formData.username);
    sessionStorage.setItem("email", formData.email);
    sessionStorage.setItem("phone", formData.phone);
    showToast('Booking submitted! Redirecting to payment...');
    setTimeout(() => {
      window.location.href = kashierUrl;
    }, 1500);
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
  }
}

// Initialize date picker
const dateInput = document.getElementById('tripDate');
flatpickr(dateInput, {
  locale: "en",
  dateFormat: "Y-m-d",
  inline: false,
  theme: "dark",
  disableMobile: false,
  minDate: "today",
  disable: [
    function(date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    }
  ],
  onChange: function(selectedDates, dateStr, instance) {
    console.log("Date selected:", dateStr);
    calculateTotalPrice();
  },
  onDayCreate: function(dObj, dStr, fp, dayElem) {
    const date = dayElem.dateObj;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fp.currentMonth === date.getMonth() && fp.currentYear === date.getFullYear()) {
      // Disable past dates relative to today
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
      } else {
        console.warn(".fp-weekdays element not found inside container.");
      }
    } else {
      console.error("Fp calendarContainer not found onReady.");
    }
  }
});

// Initialize the application
window.onload = function() {
  initNumberControls();
  // Set default values
  document.getElementById('adults').value = 1;
  document.getElementById('children12Plus').value = 0;
  document.getElementById('childrenUnder12').value = 0;
  document.getElementById('infants').value = 0;
  // Fetch trip types
  fetchTripTypes();
  // Initialize phone input
  iti.promise.then(() => {
    const phoneValue = document.getElementById("phone").value;
    if (phoneValue) {
      iti.setNumber(phoneValue);
    }
  });
  // Update progress bar
  updateProgressBar();
};
