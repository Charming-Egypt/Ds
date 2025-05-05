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

// Global variables
let tripData = {};
let currentTrip = {};
let tourTypes = {};
let selectedTripType = "";
let iti; // For phone input
const refNumber = generateReference();
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_2_ADULTS = 2;

// DOM Elements
const steps = document.querySelectorAll("[id^='step']");
const stepIndicators = document.querySelectorAll("[id$='Indicator']");
let currentStep = 0;

// Utility Functions
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'DS_' + Array.from({length: 10}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

function sanitizeInput(input) {
  return input ? input.toString().replace(/[<>]/g, "").trim() : '';
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
  setTimeout(() => toast.remove(), 4000);
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
    tripData = snapshot.val() || {};
    
    if (!tripData) {
      showToast("No trips available at the moment.", 'error');
      return {};
    }
    
    const tripPName = document.getElementById('tripName')?.value;
    if (tripPName && tripData[tripPName]) {
      currentTrip = tripData[tripPName];
      tourTypes = currentTrip.tourtype || {};
      populateTripTypeDropdown();
      displayTripInfo();
    }
    
    return tripData;
  } catch (error) {
    console.error("Error fetching trip data:", error);
    showToast("Failed to load trip data.", 'error');
    throw error;
  } finally {
    hideSpinner();
  }
}

function populateTripTypeDropdown() {
  const tripTypeSelect = document.getElementById('tripType');
  if (!tripTypeSelect) return;
  
  tripTypeSelect.innerHTML = '<option value="" disabled selected>Select additional services</option>';
  
  Object.entries(tourTypes).forEach(([key, value]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${key} - ${value} EGP per person`;
    tripTypeSelect.appendChild(option);
  });
}

function displayTripInfo() {
  const tripTitle = document.getElementById('trip-title');
  const tripImage = document.getElementById('trip-image');
  const basePriceDisplay = document.getElementById('basePriceDisplay');
  
  if (tripTitle && currentTrip.name) tripTitle.textContent = currentTrip.name;
  if (tripImage && currentTrip.image) {
    tripImage.src = currentTrip.image;
    tripImage.alt = currentTrip.description || 'Trip image';
  }
  if (basePriceDisplay && currentTrip.price) {
    basePriceDisplay.textContent = `${currentTrip.price} EGP per adult`;
  }
}

// Price Calculation
function calculateTotalPrice() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children = parseInt(document.getElementById('childrenUnder12').value) || 0;
  
  if (!currentTrip.price) return 0;
  
  const adultPrice = parseInt(currentTrip.price);
  const childPrice = Math.round(adultPrice * 0.7);
  let total = (adults * adultPrice) + (children * childPrice);
  
  if (selectedTripType && tourTypes[selectedTripType]) {
    total += (adults + children) * parseInt(tourTypes[selectedTripType]);
  }
  
  return total;
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  if (!adultsInput || !infantsInput) return;
  
  const adults = parseInt(adultsInput.value) || 0;
  const infants = parseInt(infantsInput.value) || 0;
  const maxInfants = Math.floor(adults / 2) * MAX_INFANTS_PER_2_ADULTS;
  
  if (infants > maxInfants) {
    infantsInput.value = maxInfants;
  }
}

// Form Handling
function populateForm() {
  const getCookie = name => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };
  
  const username = getCookie("username") || "";
  const email = getCookie("email") || "";
  const phone = getCookie("phone") || "";
  const uid = getCookie("uid") || "";
  
  if (username) document.getElementById("username").value = username;
  if (email) document.getElementById("customerEmail").value = email;
  if (uid) document.getElementById("uid").value = uid;
  if (phone && iti) {
    document.getElementById("phone").value = phone;
    iti.setNumber(phone);
  }
}

// Navigation
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
  }
}

function validateCurrentStep() {
  let isValid = true;
  
  if (currentStep === 0) {
    const username = document.getElementById("username")?.value.trim();
    const email = document.getElementById("customerEmail")?.value.trim();
    const phoneNumber = iti?.getNumber();
    
    if (!username) {
      showError('username', 'Full name required');
      isValid = false;
    } else {
      clearError('username');
    }
    
    if (!email) {
      showError('customerEmail', 'Email required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('customerEmail', 'Invalid email');
      isValid = false;
    } else {
      clearError('customerEmail');
    }
    
    if (!phoneNumber || !iti?.isValidNumber()) {
      showError('phone', 'Valid phone number required');
      isValid = false;
    } else {
      clearError('phone');
      document.getElementById("phone").value = phoneNumber;
    }
  } else if (currentStep === 1) {
    const tripDate = document.getElementById("tripDate")?.value.trim();
    const hotelName = document.getElementById("hotelName")?.value.trim();
    const roomNumber = document.getElementById("roomNumber")?.value.trim();
    
    if (!tripDate) {
      showError('tripDate', 'Trip date required');
      isValid = false;
    } else {
      clearError('tripDate');
    }
    
    if (!hotelName) {
      showError('hotelName', 'Hotel name required');
      isValid = false;
    } else {
      clearError('hotelName');
    }
    
    if (!roomNumber) {
      showError('roomNumber', 'Room number required');
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
  document.getElementById('adultsPlus')?.addEventListener('click', (e) => {
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
  
  document.getElementById('adultsMinus')?.addEventListener('click', (e) => {
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

  // Children controls
  document.getElementById('childrenUnder12Plus')?.addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('childrenUnder12');
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    if (currentValue < MAX_PER_TYPE) {
      input.value = currentValue + 1;
      updateSummary();
    }
  });
  
  document.getElementById('childrenUnder12Minus')?.addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('childrenUnder12');
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    if (currentValue > 0) {
      input.value = currentValue - 1;
      updateSummary();
    }
  });

  // Infants controls
  document.getElementById('infantsPlus')?.addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('infants');
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const maxInfants = Math.floor(adults / 2) * MAX_INFANTS_PER_2_ADULTS;
    
    const currentValue = parseInt(input.value);
    if (currentValue < maxInfants && currentValue < MAX_PER_TYPE) {
      input.value = currentValue + 1;
      updateSummary();
    }
  });
  
  document.getElementById('infantsMinus')?.addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('infants');
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    if (currentValue > 0) {
      input.value = currentValue - 1;
      updateSummary();
    }
  });

  // Trip type change
  document.getElementById('tripType')?.addEventListener('change', function() {
    selectedTripType = this.value;
    updateSummary();
  });
}

// Date Picker
function initDatePicker() {
  const dateInput = document.getElementById('tripDate');
  if (!dateInput) return;

  flatpickr(dateInput, {
    dateFormat: "Y-m-d",
    minDate: "today",
    onChange: updateSummary
  });
}

// Summary and Payment
function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('infants').value) || 0;
  
  const summaryElements = {
    date: document.getElementById("summaryDate"),
    hotel: document.getElementById("summaryHotel"),
    room: document.getElementById("summaryRoom"),
    ref: document.getElementById("summaryRef"),
    tour: document.getElementById("summaryTour"),
    adults: document.getElementById("summaryAdults"),
    children: document.getElementById("summaryChildrenUnder12"),
    infants: document.getElementById("summaryInfants"),
    extras: document.getElementById("summaryExtras"),
    total: document.getElementById("totalPriceDisplay")
  };
  
  if (!currentTrip.price) return;
  
  const adultPrice = parseInt(currentTrip.price);
  const childPrice = Math.round(adultPrice * 0.7);
  const totalParticipants = adults + children;
  
  // Update summary display
  if (summaryElements.date) summaryElements.date.textContent = document.getElementById("tripDate").value || "Not specified";
  if (summaryElements.hotel) summaryElements.hotel.textContent = sanitizeInput(document.getElementById("hotelName").value) || "Not specified";
  if (summaryElements.room) summaryElements.room.textContent = sanitizeInput(document.getElementById("roomNumber").value) || "Not specified";
  if (summaryElements.ref) summaryElements.ref.textContent = refNumber;
  if (summaryElements.tour) summaryElements.tour.textContent = currentTrip.name;
  
  if (summaryElements.adults) summaryElements.adults.textContent = `${adults} Adults × ${adultPrice} EGP = ${(adults * adultPrice).toFixed(2)} EGP`;
  if (summaryElements.children) summaryElements.children.textContent = `${children} Children × ${childPrice} EGP = ${(children * childPrice).toFixed(2)} EGP`;
  if (summaryElements.infants) summaryElements.infants.textContent = `${infants} Infants (Free)`;
  
  // Handle extras
  if (selectedTripType && tourTypes[selectedTripType]) {
    const extraFee = parseInt(tourTypes[selectedTripType]);
    if (summaryElements.extras) {
      summaryElements.extras.textContent = `${selectedTripType}: ${totalParticipants} × ${extraFee} EGP = ${(totalParticipants * extraFee).toFixed(2)} EGP`;
      summaryElements.extras.classList.remove('hidden');
    }
  } else if (summaryElements.extras) {
    summaryElements.extras.classList.add('hidden');
  }
  
  if (summaryElements.total) summaryElements.total.textContent = `${calculateTotalPrice().toFixed(2)} EGP`;
}

async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    // Prepare form data
    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      tripDate: document.getElementById("tripDate").value,
      basePrice: currentTrip.price,
      tripType: selectedTripType,
      tripTypeExtra: selectedTripType ? tourTypes[selectedTripType] : 0,
      hotelName: sanitizeInput(document.getElementById("hotelName").value),
      roomNumber: sanitizeInput(document.getElementById("roomNumber").value),
      adults: parseInt(document.getElementById('adults').value) || 0,
      childrenUnder12: parseInt(document.getElementById('childrenUnder12').value) || 0,
      infants: parseInt(document.getElementById('infants').value) || 0,
      currency: 'EGP',
      total: calculateTotalPrice(),
      metaData: {
        internalData: {
          bookingRef: refNumber,
          userId: document.getElementById("uid")?.value || "guest",
          agent: "website",
          timestamp: new Date().toISOString()
        },
        displayNotes: {
          "Tour Name": currentTrip.name,
          "Trip Date": document.getElementById("tripDate").value,
          "Hotel Name": sanitizeInput(document.getElementById("hotelName").value),
          "Room Number": sanitizeInput(document.getElementById("roomNumber").value),
          "Group Composition": `${formData.adults} Adults, ${formData.childrenUnder12} Children, ${formData.infants} Infants`,
          "Phone Number": formData.phone,
          "Additional Services": selectedTripType || "None",
          "Total Amount": `${formData.total.toFixed(2)} EGP`
        }
      }
    };

    // Generate payment hash
    const hashResponse = await fetch('https://api.discover-sharm.com/.netlify/functions/generate-hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: formData.refNumber,
        amount: formData.total,
        currency: formData.currency,
        metaData: encodeURIComponent(JSON.stringify(formData.metaData))
      }),
    });

    if (!hashResponse.ok) {
      throw new Error('Failed to generate payment hash');
    }

    const hashData = await hashResponse.json();
    
    // Create payment URL
    const paymentParams = new URLSearchParams({
      merchantId: 'MID-33260-3',
      orderId: formData.refNumber,
      amount: formData.total,
      currency: formData.currency,
      hash: hashData.hash,
      mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false',
      redirectMethod: 'get',
      enable3DS: 'true',
      allowedMethods: 'card,wallet',
      metaData: encodeURIComponent(JSON.stringify(formData.metaData)),
      notes: 'DISCOVER SHARM - THANK YOU FOR BOOKING WITH US !',
      interactionSource: 'Ecommerce'
    });

    const paymentUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;

    // Save booking to Firebase
    await database.ref('trip-bookings').child(formData.refNumber).set({
      ...formData,
      paymentUrl,
      status: "pending",
      timestamp: new Date().toISOString()
    });

    // Store user data in session
    sessionStorage.setItem("username", formData.username);
    sessionStorage.setItem("email", formData.email);
    sessionStorage.setItem("phone", formData.phone);

    // Redirect to payment
    showToast('Redirecting to payment...');
    setTimeout(() => window.location.href = paymentUrl, 1500);
    
  } catch (error) {
    console.error('Payment Error:', error);
    showToast(`Payment failed: ${error.message}`, 'error');
  } finally {
    hideSpinner();
  }
}

// Initialize Application
window.onload = async function() {
  // Initialize phone input
  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
      preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
      separateDialCode: true,
      initialCountry: "eg",
      customPlaceholder: (_, country) => `e.g. ${country.placeholder}`
    });
  }

  // Set default values
  document.getElementById('adults').value = 1;
  document.getElementById('childrenUnder12').value = 0;
  document.getElementById('infants').value = 0;

  // Initialize components
  populateForm();
  initNumberControls();
  initDatePicker();
  
  // Fetch trip data
  try {
    await fetchAllTripData();
  } catch (error) {
    console.error("Initialization failed:", error);
  }
  
  // Set phone number if available
  if (iti && document.getElementById("phone").value) {
    iti.setNumber(document.getElementById("phone").value);
  }
  
  updateProgressBar();
  
  // Add event listeners
  ['adults', 'childrenUnder12', 'infants', 'tripDate', 'hotelName', 'roomNumber'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateSummary);
  });
};
