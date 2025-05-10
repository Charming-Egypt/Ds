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

// Get trip name from URL parameter
function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

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
      currentTrip.commissionRate = currentTrip.commission || 0.15; // Default to 15% if not specified
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      populateTripTypeDropdown(tourTypes);
      displayTripInfo(currentTrip);
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
  const commissionRate = currentTrip.commissionRate || 0.15; // Use trip's commission rate or default to 15%
  const commission = subtotalWithTax * commissionRate;
  return {
    total: subtotalWithTax + commission,
    breakdown: {
      baseTotal: calculateBaseTotal(),
      extraServices: calculateExtraServicesTotal(),
      netTotal: netTotal,
      baseTax: baseTax,
      taxOnTax: taxOnTax,
      fixedFee: FIXED_FEE,
      totalTax: totalTax,
      subtotalWithTax: subtotalWithTax,
      commissionRate: commissionRate,
      commission: commission
    }
  };
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
      if (summaryAdults) summaryAdults.textContent = `${adults} = ${(adults * basePrice).toFixed(2)} EGP`;
      if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = `${childrenUnder12} = ${(childrenUnder12 * childPriceUnder12).toFixed(2)} EGP`;
      if (summaryInfants) summaryInfants.textContent = `${infants} Infants (Free)`;
      
      // Show extra service if selected
      if (selectedService && tourTypes[selectedService]) {
        const servicePrice = parseInt(tourTypes[selectedService]);
        const serviceTotal = (adults + childrenUnder12) * servicePrice;
        if (summaryService) {
          summaryService.textContent = `${selectedService}: ${adults + childrenUnder12} = ${serviceTotal.toFixed(2)} EGP`;
          summaryService.classList.remove('hidden');
        }
      } else {
        if (summaryService) summaryService.classList.add('hidden');
      }
      
      const { total, breakdown } = calculateTotalWithTaxesAndCommission();
      
      if (totalPriceDisplay) {
        totalPriceDisplay.innerHTML = `
          <div class="text-sm">Base Price: ${breakdown.baseTotal.toFixed(2)} EGP</div>
          ${breakdown.extraServices > 0 ? 
            `<div class="text-sm">Extra Services: +${breakdown.extraServices.toFixed(2)} EGP</div>` : ''}
          <div class="text-sm">Taxes and Fees: ${breakdown.totalTax.toFixed(2)} EGP</div>
          <div class="text-sm">Commission (${(breakdown.commissionRate * 100).toFixed(0)}%): ${breakdown.commission.toFixed(2)} EGP</div>
          <div class="font-bold text-xl mt-2">Total: ${total.toFixed(2)} EGP</div>
        `;
      }
    }
  }, 300);
}

// Updated populateForm function to fetch from egy_user
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

// Navigation Functions
function nextStep() {
  if (!validateCurrentStep()) return;
  steps[currentStep].classList.add("hidden");
  if (stepIndicators[currentStep]) {
    stepIndicators[currentStep].setAttribute("data-active", "false");
  }
  currentStep++;
  steps[currentStep].classList.remove("hidden");
  if (stepIndicators[currentStep]) {
    stepIndicators[currentStep].setAttribute("data-active", "true");
  }
  updateProgressBar();
  if (currentStep === 3) updateSummary();
}

function prevStep() {
  steps[currentStep].classList.add("hidden");
  if (stepIndicators[currentStep]) {
    stepIndicators[currentStep].setAttribute("data-active", "false");
  }
  currentStep--;
  steps[currentStep].classList.remove("hidden");
  if (stepIndicators[currentStep]) {
    stepIndicators[currentStep].setAttribute("data-active", "true");
  }
  updateProgressBar();
}

function updateProgressBar() {
  const progress = document.getElementById("progressBar");
  if (progress) {
    const progressPercentage = (currentStep / (steps.length - 1)) * 100;
    progress.style.width = `${progressPercentage}%`;
    progress.setAttribute('aria-valuenow', progressPercentage);
    progress.setAttribute('aria-valuetext', `Step ${currentStep + 1} of ${steps.length}`);
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

// Number Controls
function initNumberControls() {
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
      }
    });
    
    childrenMinus.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.getElementById('childrenUnder12');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
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
      }
    });
    
    infantsMinus.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.getElementById('infants');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
      }
    });
  }

  // Trip type change
  const tripTypeSelect = document.getElementById('tripType');
  if (tripTypeSelect) {
    tripTypeSelect.addEventListener('change', function() {
      selectedTripType = this.value;
      if (currentStep === 3) updateSummary();
    });
  }
}

// Date Picker
function initDatePicker() {
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
      }],
    onChange: function(selectedDates, dateStr, instance) {
      updateSummary();
    }
  });
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

    const { total, breakdown } = calculateTotalWithTaxesAndCommission();

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
      ...breakdown, // Include all breakdown details
      uid: user.uid,
      owner: tripOwnerId
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

    const kashierUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;

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
    setTimeout(() => {
      window.location.href = kashierUrl;
    }, 1500);
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
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
  await populateForm();
  initNumberControls();
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
  
  updateProgressBar();
  
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
