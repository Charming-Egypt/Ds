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
const refNumber = 'DS_' + Math.random().toString(36).substr(2, 10).toUpperCase();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_2_ADULTS = 2;

// Get trip name from hidden input
const tripNameElement = document.getElementById('tripName');
let tripPName = tripNameElement ? tripNameElement.value : '';

// DOM Elements
const steps = Array.from({length: 4}, (_, i) => document.getElementById(`step${i+1}`));
const stepIndicators = Array.from({length: 4}, (_, i) => document.getElementById(`step${i+1}Indicator`));
let currentStep = 0;

// Utility Functions
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
    const allTripsData = snapshot.val();
    
    if (!allTripsData) {
      showToast("No trips available at the moment. Please check back later.", 'error');
      return {};
    }
    
    tripData = allTripsData;
    
    if (tripPName && allTripsData[tripPName]) {
      currentTrip = allTripsData[tripPName];
      currentTrip.basePrice = currentTrip.price || 0;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      populateTripTypeDropdown(tourTypes);
      displayTripInfo(currentTrip);
    }
  } catch (error) {
    console.error("Error fetching trip data:", error);
    showToast("Failed to load trip data. Please refresh the page.", 'error');
  } finally {
    hideSpinner();
  }
}

function populateTripTypeDropdown(tourTypes) {
  const tripTypeSelect = document.getElementById('tripType');
  if (!tripTypeSelect) return;
  
  tripTypeSelect.innerHTML = '<option value="" selected>No extra services needed</option>';
  
  if (tourTypes && typeof tourTypes === 'object') {
    Object.entries(tourTypes).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${value} EGP (per person)`;
      tripTypeSelect.appendChild(option);
    });
  }
}

function displayTripInfo(tripInfo) {
  const tripTitle = document.getElementById('trip-title');
  const tripImage = document.getElementById('trip-image');
  if (tripTitle && tripInfo.name) tripTitle.textContent = tripInfo.name;
  if (tripImage && tripInfo.image) {
    tripImage.src = tripInfo.image;
    tripImage.alt = tripInfo.description || 'Trip image';
  }
}

// Price Calculation
function calculateTotalPrice() {
  if (!currentTrip.basePrice) return 0;
  
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const basePrice = parseInt(currentTrip.basePrice);
  let total = (adults * basePrice) + (children * Math.round(basePrice * 0.7));
  
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

// Navigation
function nextStep() {
  if (!validateCurrentStep()) return;
  steps[currentStep].classList.add("hidden");
  stepIndicators[currentStep]?.setAttribute("data-active", "false");
  currentStep++;
  steps[currentStep].classList.remove("hidden");
  stepIndicators[currentStep]?.setAttribute("data-active", "true");
  updateProgressBar();
  if (currentStep === 3) updateSummary();
}

function prevStep() {
  steps[currentStep].classList.add("hidden");
  stepIndicators[currentStep]?.setAttribute("data-active", "false");
  currentStep--;
  steps[currentStep].classList.remove("hidden");
  stepIndicators[currentStep]?.setAttribute("data-active", "true");
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

// Form Submission
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to complete your booking');

    const userRole = await getUserRole(user.uid);
    if (!['admin', 'moderator', 'user'].includes(userRole)) {
      throw new Error('Your account does not have booking permissions');
    }

    const bookingData = {
      refNumber,
      username: String(sanitizeInput(document.getElementById("username").value)),
      email: String(sanitizeInput(document.getElementById("customerEmail").value)),
      phone: String(iti.getNumber()),
      tripDate: String(document.getElementById("tripDate").value),
      tripType: String(document.getElementById("tripType").value || 'None'),
      tripTypePrice: Number(selectedTripType ? tourTypes[selectedTripType] : 0),
      basePrice: Number(currentTrip.basePrice || 0),
      hotelName: String(sanitizeInput(document.getElementById("hotelName").value)),
      roomNumber: String(sanitizeInput(document.getElementById("roomNumber").value)),
      timestamp: Number(Date.now()),
      status: "pending",
      tour: String(tripPName),
      adults: Number(document.getElementById('adults').value) || 0,
      childrenUnder12: Number(document.getElementById('childrenUnder12').value) || 0,
      infants: Number(document.getElementById('infants').value) || 0,
      currency: 'EGP',
      total: Number(calculateTotalPrice()),
      uid: String(user.uid),
      owner: userRole === 'moderator' ? String(user.uid) : String(tripOwnerId || user.uid)
    };

    // Generate payment hash
    const response = await fetch('https://api.discover-sharm.com/.netlify/functions/generate-hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: bookingData.total,
        currency: 'EGP',
      }),
    });

    if (!response.ok) throw new Error('Payment processing failed');

    const paymentData = await response.json();
    bookingData.paymenturl = `https://payments.kashier.io/?${new URLSearchParams({
      merchantId: 'MID-33260-3',
      orderId: refNumber,
      amount: bookingData.total,
      currency: 'EGP',
      hash: paymentData.hash,
      mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false',
      redirectMethod: 'get'
    }).toString()}`;

    await database.ref('trip-bookings').child(refNumber).set(bookingData);
    
    sessionStorage.setItem("username", bookingData.username);
    sessionStorage.setItem("email", bookingData.email);
    sessionStorage.setItem("phone", bookingData.phone);

    showToast('Booking submitted! Redirecting to payment...');
    setTimeout(() => window.location.href = bookingData.paymenturl, 1500);
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking'}`, 'error');
  } finally {
    hideSpinner();
  }
}

// Initialize
window.onload = async function() {
  // Initialize phone input
  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
      preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
      separateDialCode: true,
      initialCountry: "eg"
    });
  }

  // Initialize form values
  document.getElementById('adults').value = 1;
  document.getElementById('childrenUnder12').value = 0;
  document.getElementById('infants').value = 0;

  // Initialize components
  populateForm();
  initNumberControls();
  initDatePicker();
  await fetchAllTripData();
  updateProgressBar();

  // Event listeners
  document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm();
  });
};
