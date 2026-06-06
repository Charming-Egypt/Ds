// ==========================================================================
// DISCOVER SHARM - Tour Booking System
// Complete JavaScript Controller
// Compatible with new Creative Design
// ==========================================================================

// Initialize Swiper
let swiper;
let currentVideoSlide = null;

// Global variables
let tripData = {};
let currentTrip = {};
let tourTypes = {};
let selectedTripType = "";
let iti;
const refNumber = generateReference();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_ADULT = 2;
const MAX_TOTAL_INFANTS = 10;
const FIXED_FEE = 3;
const TAX_RATE = 0.03;
const TAX_ON_TAX_RATE = 0.14;
let currentStep = 0;

// Currency variables
let currentCurrency = 'EGP';
let exchangeRates = { EGP: 1 };
let ratesLoaded = false;

// Get trip ID from URL
function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// ========================================
// CURRENCY FUNCTIONS
// ========================================

function getCurrentCurrencyFromHeader() {
  if (window.SharmCurrency && typeof window.SharmCurrency.get === 'function') {
    return window.SharmCurrency.get();
  }
  return localStorage.getItem('preferredCurrency') || 'EGP';
}

function getExchangeRatesFromHeader() {
  if (window.SharmCurrency && window.SharmCurrency.rates) {
    return window.SharmCurrency.rates;
  }
  return null;
}

function formatPrice(priceEGP) {
  if (!ratesLoaded || currentCurrency === 'EGP') {
    return parseFloat(priceEGP).toFixed(2) + ' EGP';
  }
  
  var converted = priceEGP * exchangeRates[currentCurrency];
  var symbol = '';
  
  if (currentCurrency === 'USD') symbol = '$';
  else if (currentCurrency === 'EUR') symbol = '€';
  else if (currentCurrency === 'GBP') symbol = '£';
  else return parseFloat(priceEGP).toFixed(2) + ' EGP';
  
  return symbol + parseFloat(converted).toFixed(2);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'DS-' + result;
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/[<>]/g, "").trim();
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.style.borderColor = '#ef4444';
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

function clearError(elementId) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.style.borderColor = '';
    errorElement.classList.add('hidden');
  }
}

function showToast(message, type = 'success') {
  // Remove existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
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

// ========================================
// PRICE CALCULATION
// ========================================

function calculateBaseTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  
  if (!currentTrip.basePrice) return 0;
  
  const basePrice = parseFloat(currentTrip.basePrice);
  const childPrice = parseFloat(currentTrip.cprice) || basePrice * 0.5;
  return parseFloat(((adults * basePrice) + (childrenUnder12 * childPrice)).toFixed(2));
}

function calculateExtraServicesTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  
  if (selectedTripType && tourTypes[selectedTripType]) {
    const servicePrice = parseFloat(tourTypes[selectedTripType]);
    return parseFloat(((adults + childrenUnder12) * servicePrice).toFixed(2));
  }
  return 0;
}

function calculateNetTotal() {
  return parseFloat((calculateBaseTotal() + calculateExtraServicesTotal()).toFixed(2));
}

function calculateTaxesOnly() {
    const netTotal = calculateNetTotal();
    const threePercent = parseFloat((netTotal * 0.03).toFixed(2));
    const fourteenPercentOfThreePercent = parseFloat((threePercent * 0.14).toFixed(2));
    const fixedFee = 3;
    return parseFloat((threePercent + fourteenPercentOfThreePercent + fixedFee).toFixed(2));
}

function calculateTotalWithTaxes() {
    const netTotal = calculateNetTotal();
    const taxes = calculateTaxesOnly();
    return parseFloat((netTotal + taxes).toFixed(2));
}

// ========================================
// PRICE DISPLAY
// ========================================

function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  const mobilePricePreview = document.getElementById('mobilePricePreview');
  
  if (priceElement && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    const formattedPrice = formatPrice(netTotal);
    priceElement.innerHTML = formattedPrice;
    priceElement.setAttribute('data-price-egp', parseFloat(netTotal).toFixed(2));
    priceElement.setAttribute('data-currency', currentCurrency);
  }
  
  // Update mobile price preview
  if (mobilePricePreview && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    mobilePricePreview.textContent = 'From ' + formatPrice(netTotal);
  }
}

// ========================================
// FORM NAVIGATION
// ========================================

function updateProgressBar() {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    const progressPercentage = (currentStep + 1) * 25;
    progressBar.style.width = `${progressPercentage}%`;
  }
  
  // Update step indicators
  const steps = document.querySelectorAll('.progress-steps .step');
  steps.forEach((step, index) => {
    if (index === currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}

function nextStep() {
  if (!validateCurrentStep()) return;
  
  const currentStepElement = document.getElementById(`step${currentStep + 1}`);
  if (currentStepElement) currentStepElement.classList.remove('active');
  
  currentStep++;
  
  const nextStepElement = document.getElementById(`step${currentStep + 1}`);
  if (nextStepElement) nextStepElement.classList.add('active');
  
  updateProgressBar();
  updateSummary();
}

function prevStep() {
  const currentStepElement = document.getElementById(`step${currentStep + 1}`);
  if (currentStepElement) currentStepElement.classList.remove('active');
  
  currentStep--;
  
  const prevStepElement = document.getElementById(`step${currentStep + 1}`);
  if (prevStepElement) prevStepElement.classList.add('active');
  
  updateProgressBar();
}

// ========================================
// EXTRA SERVICES POPUP (NEW)
// ========================================

function openServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  const content = document.getElementById('servicesPopupContent');
  
  if (!popup || !content) return;
  
  // Build services list
  content.innerHTML = '';
  
  // "No extra services" option
  const noServiceDiv = document.createElement('div');
  noServiceDiv.className = `service-option ${!selectedTripType ? 'selected' : ''}`;
  noServiceDiv.innerHTML = `
    <div class="service-option-info">
      <strong>🚫 No Extra Services</strong>
      <span>Free</span>
    </div>
    <div class="service-option-check"></div>
  `;
  noServiceDiv.onclick = function() { 
    selectedTripType = '';
    renderServiceOptions();
  };
  content.appendChild(noServiceDiv);
  
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(key => {
      const priceEGP = tourTypes[key];
      const formattedPrice = formatPrice(priceEGP);
      const serviceDiv = document.createElement('div');
      serviceDiv.className = `service-option ${selectedTripType === key ? 'selected' : ''}`;
      serviceDiv.innerHTML = `
        <div class="service-option-info">
          <strong>✨ ${key}</strong>
          <span>+${formattedPrice} per person</span>
        </div>
        <div class="service-option-check"></div>
      `;
      serviceDiv.onclick = function() { 
        selectedTripType = key;
        renderServiceOptions();
      };
      content.appendChild(serviceDiv);
    });
  }
  
  popup.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderServiceOptions() {
  const options = document.querySelectorAll('#servicesPopupContent .service-option');
  let index = 0;
  options.forEach(opt => {
    const isNoService = index === 0 && !selectedTripType;
    const isThisService = index > 0 && opt.querySelector('strong').textContent.includes(selectedTripType);
    
    if ((index === 0 && !selectedTripType) || (index > 0 && opt.querySelector('strong').textContent.includes(selectedTripType))) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
    index++;
  });
}

function confirmServiceSelection() {
  const serviceText = document.getElementById('selectedServiceText');
  if (serviceText) {
    if (selectedTripType && tourTypes[selectedTripType]) {
      serviceText.textContent = selectedTripType;
    } else {
      serviceText.textContent = 'No extra services';
    }
  }
  
  closeServicesPopup();
  updateSummary();
}

function closeServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  if (popup) {
    popup.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ========================================
// MOBILE BOTTOM SHEET (NEW)
// ========================================

function isMobile() {
  return window.innerWidth <= 768;
}

function openMobileBottomSheet() {
  const overlay = document.getElementById('mobileBottomSheetOverlay');
  const sheet = document.getElementById('mobileBottomSheet');
  const content = document.getElementById('mobileBookingContent');
  
  if (!overlay || !sheet || !content) return;
  
  // Clone booking form to mobile sheet if empty
  if (content.children.length === 0) {
    const bookingForm = document.getElementById('bookingForm');
    const progressContainer = document.querySelector('.booking-form-container .progress-container');
    const formHeader = document.querySelector('.booking-form-container .form-header');
    
    if (bookingForm) {
      const clone = bookingForm.cloneNode(true);
      clone.id = 'mobileBookingForm';
      
      // Clear and rebuild
      content.innerHTML = '';
      
      if (formHeader) {
        content.appendChild(formHeader.cloneNode(true));
      }
      if (progressContainer) {
        content.appendChild(progressContainer.cloneNode(true));
      }
      content.appendChild(clone);
      
      // Re-attach event listeners to cloned buttons
      attachMobileFormEvents();
    }
  }
  
  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Scroll to top
  setTimeout(() => {
    sheet.scrollTop = 0;
  }, 100);
  
  updateSummary();
}

function closeMobileBottomSheet() {
  const overlay = document.getElementById('mobileBottomSheetOverlay');
  const sheet = document.getElementById('mobileBottomSheet');
  
  if (overlay) overlay.classList.add('hidden');
  if (sheet) sheet.classList.add('hidden');
  document.body.style.overflow = '';
}

function attachMobileFormEvents() {
  // Re-attach next/prev buttons
  const nextBtns = document.querySelectorAll('#mobileBookingContent [onclick*="nextStep"]');
  const prevBtns = document.querySelectorAll('#mobileBookingContent [onclick*="prevStep"]');
  
  nextBtns.forEach(btn => {
    btn.onclick = function() {
      nextStepMobile();
    };
  });
  
  prevBtns.forEach(btn => {
    btn.onclick = function() {
      prevStepMobile();
    };
  });
  
  // Re-attach submit button
  const submitBtn = document.querySelector('#mobileBookingContent #submitBtn');
  if (submitBtn) {
    submitBtn.onclick = submitForm;
  }
  
  // Re-attach number controls
  initMobileNumberControls();
  
  // Re-attach extra services trigger
  const servicesTrigger = document.querySelector('#mobileBookingContent #extraServicesTrigger');
  if (servicesTrigger) {
    servicesTrigger.onclick = openServicesPopup;
  }
  
  const openServicesBtn = document.querySelector('#mobileBookingContent #openServicesBtn');
  if (openServicesBtn) {
    openServicesBtn.onclick = openServicesPopup;
  }
}

function nextStepMobile() {
  if (!validateCurrentStep()) return;
  
  const steps = document.querySelectorAll('#mobileBookingContent .form-step');
  steps[currentStep].classList.remove('active');
  
  currentStep++;
  
  if (steps[currentStep]) {
    steps[currentStep].classList.add('active');
  }
  
  updateProgressBarMobile();
  updateSummary();
  
  // Scroll to top of sheet
  const sheet = document.getElementById('mobileBottomSheet');
  if (sheet) sheet.scrollTop = 0;
}

function prevStepMobile() {
  const steps = document.querySelectorAll('#mobileBookingContent .form-step');
  if (steps[currentStep]) steps[currentStep].classList.remove('active');
  
  currentStep--;
  
  if (steps[currentStep]) steps[currentStep].classList.add('active');
  
  updateProgressBarMobile();
}

function updateProgressBarMobile() {
  const progressBar = document.querySelector('#mobileBookingContent #progressBar');
  if (progressBar) {
    const progressPercentage = (currentStep + 1) * 25;
    progressBar.style.width = `${progressPercentage}%`;
  }
  
  const steps = document.querySelectorAll('#mobileBookingContent .progress-steps .step');
  steps.forEach((step, index) => {
    if (index === currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}

function initMobileNumberControls() {
  const container = document.getElementById('mobileBookingContent');
  if (!container) return;
  
  // Adults
  const adultsPlus = container.querySelector('#adultsPlus');
  const adultsMinus = container.querySelector('#adultsMinus');
  if (adultsPlus) {
    adultsPlus.onclick = function(e) {
      e.preventDefault();
      const input = container.querySelector('#adults');
      if (input && parseInt(input.value) < MAX_PER_TYPE) {
        input.value = parseInt(input.value) + 1;
        updateInfantsMax();
        updateSummary();
      }
    };
  }
  if (adultsMinus) {
    adultsMinus.onclick = function(e) {
      e.preventDefault();
      const input = container.querySelector('#adults');
      if (input && parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
        updateInfantsMax();
        updateSummary();
      }
    };
  }
  
  // Children
  const childrenPlus = container.querySelector('#childrenUnder12Plus');
  const childrenMinus = container.querySelector('#childrenUnder12Minus');
  if (childrenPlus) {
    childrenPlus.onclick = function(e) {
      e.preventDefault();
      const input = container.querySelector('#childrenUnder12');
      if (input && parseInt(input.value) < MAX_PER_TYPE) {
        input.value = parseInt(input.value) + 1;
        updateSummary();
      }
    };
  }
  if (childrenMinus) {
    childrenMinus.onclick = function(e) {
      e.preventDefault();
      const input = container.querySelector('#childrenUnder12');
      if (input && parseInt(input.value) > 0) {
        input.value = parseInt(input.value) - 1;
        updateSummary();
      }
    };
  }
  
  // Infants
  const infantsPlus = container.querySelector('#infantsPlus');
  const infantsMinus = container.querySelector('#infantsMinus');
  if (infantsPlus) {
    infantsPlus.onclick = function(e) {
      e.preventDefault();
      const input = container.querySelector('#infants');
      if (input && parseInt(input.value) < parseInt(input.max)) {
        input.value = parseInt(input.value) + 1;
        updateSummary();
      }
    };
  }
  if (infantsMinus) {
    infantsMinus.onclick = function(e) {
      e.preventDefault();
      const input = container.querySelector('#infants');
      if (input && parseInt(input.value) > 0) {
        input.value = parseInt(input.value) - 1;
        updateSummary();
      }
    };
  }
}

// ========================================
// SUMMARY UPDATE
// ========================================

function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('infants').value) || 0;
  
  // Update all summary elements (both desktop and mobile)
  updateSummaryElement('summaryDate', document.getElementById("tripDate")?.value || "Not specified");
  updateSummaryElement('summaryHotel', sanitizeInput(document.getElementById("hotelName")?.value) || "Not specified yet");
  updateSummaryElement('summaryRoom', sanitizeInput(document.getElementById("roomNumber")?.value) || "Not specified yet");
  updateSummaryElement('summaryRef', refNumber);
  updateSummaryElement('summaryTour', currentTrip.name || 'N/A');
  updateSummaryElement('summaryAdults', `${adults} Adult${adults !== 1 ? 's' : ''}`);
  updateSummaryElement('summaryChildrenUnder12', `${childrenUnder12} Child${childrenUnder12 !== 1 ? 'ren' : ''}`);
  updateSummaryElement('summaryInfants', `${infants} Infant${infants !== 1 ? 's' : ''}`);
  updateSummaryElement('summaryService', selectedTripType || 'None');
  
  // Update total price display
  const totalPriceDisplay = document.getElementById('totalPriceDisplay');
  if (totalPriceDisplay && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    const taxes = calculateTaxesOnly();
    const totalWithTaxes = calculateTotalWithTaxes();
    
    totalPriceDisplay.innerHTML = `
      <div class="font-bold text-xl notranslate">${formatPrice(netTotal)}</div>
      <div class="text-xs text-gray-400 mt-2 space-y-1">
        <div class="flex justify-between border-t border-gray-600 pt-1 mt-1">
          <span class="font-semibold">+ Taxes:</span>
          <span class="font-semibold">${formatPrice(taxes)}</span>
        </div>
        <div class="flex justify-between border-t border-orange-500 pt-1 mt-1 text-orange-400">
          <span class="font-semibold">Total at Payment:</span>
          <span class="font-semibold">${formatPrice(totalWithTaxes)}</span>
        </div>
      </div>
    `;
  }
  
  // Also update mobile summary if open
  updateMobileSummary();
}

function updateSummaryElement(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
  
  // Also update mobile version
  const mobileElement = document.querySelector(`#mobileBookingContent #${id}`);
  if (mobileElement) mobileElement.textContent = value;
}

function updateMobileSummary() {
  const mobileContent = document.getElementById('mobileBookingContent');
  if (!mobileContent || mobileContent.children.length === 0) return;
  
  const totalDisplay = mobileContent.querySelector('#totalPriceDisplay');
  if (totalDisplay && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    const taxes = calculateTaxesOnly();
    const totalWithTaxes = calculateTotalWithTaxes();
    
    totalDisplay.innerHTML = `
      <div class="font-bold text-xl notranslate">${formatPrice(netTotal)}</div>
      <div class="text-xs text-gray-400 mt-2 space-y-1">
        <div class="flex justify-between border-t border-gray-600 pt-1 mt-1">
          <span class="font-semibold">+ Taxes:</span>
          <span class="font-semibold">${formatPrice(taxes)}</span>
        </div>
        <div class="flex justify-between border-t border-orange-500 pt-1 mt-1 text-orange-400">
          <span class="font-semibold">Total at Payment:</span>
          <span class="font-semibold">${formatPrice(totalWithTaxes)}</span>
        </div>
      </div>
    `;
  }
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  
  if (!adultsInput || !infantsInput) return;
  
  const adults = parseInt(adultsInput.value) || 0;
  const currentInfants = parseInt(infantsInput.value) || 0;
  const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  
  if (currentInfants > maxInfants) {
    infantsInput.value = maxInfants;
  }
  infantsInput.max = maxInfants;
}

// ========================================
// VALIDATION
// ========================================

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
    
    if (iti) {
      const phoneNumber = iti.getNumber();
      if (!phoneNumber || !iti.isValidNumber()) {
        showError('phone', 'Please enter a valid phone number with country code');
        isValid = false;
      } else {
        clearError('phone');
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

// ========================================
// FORM SUBMISSION
// ========================================

async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in to complete your booking');
    }

    const netTotal = calculateNetTotal();
    const totalWithTaxes = calculateTotalWithTaxes();
    const taxes = calculateTaxesOnly();
    
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    const infants = parseInt(document.getElementById('infants').value) || 0;
    const tripDate = document.getElementById("tripDate").value;
    const hotelName = sanitizeInput(document.getElementById("hotelName").value);
    const roomNumber = sanitizeInput(document.getElementById("roomNumber").value);
    const username = sanitizeInput(document.getElementById("username").value);
    const email = sanitizeInput(document.getElementById("customerEmail").value);
    const phone = iti ? iti.getNumber() : '';
    
    const bookingData = {
      refNumber: refNumber,
      username: username,
      email: email,
      phone: phone,
      tour: currentTrip.name,
      tripId: tripPName,
      tripDate: tripDate,
      adults: adults,
      childrenUnder12: childrenUnder12,
      infants: infants,
      hotelName: hotelName,
      roomNumber: roomNumber,
      baseTotal: parseFloat(calculateBaseTotal().toFixed(2)),
      extraServicesTotal: parseFloat(calculateExtraServicesTotal().toFixed(2)),
      netTotal: parseFloat(netTotal.toFixed(2)),
      total: parseFloat(totalWithTaxes.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      extraServices: selectedTripType || 'None',
      specialRequests: 'none',
      status: 'pending',
      resStatus: 'new',
      isPaid: false,
      paymentStatus: 'unpaid',
      uid: user.uid,
      owner: tripOwnerId || user.uid,
      pickuptime: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Kashier Payment
    const response = await fetch('https://kashier-hash.gm-093.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: parseFloat(totalWithTaxes.toFixed(2)),
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
      amount: parseFloat(totalWithTaxes.toFixed(2)),
      currency: 'EGP',
      hash: data.hash,
      mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false',
      redirectMethod: 'get'
    });

    const kashierUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;

    // Save to Firebase
    await db.ref('trip-bookings/' + refNumber).set({
      ...bookingData,
      paymenturl: kashierUrl
    });

    // Send notification
    if (currentTrip.supplierId || tripOwnerId) {
      const notificationId = Date.now().toString();
      const notificationRef = db.ref(`notifications/${tripOwnerId || currentTrip.supplierId}/${notificationId}`);
      
      await notificationRef.set({
        id: notificationId,
        title: `New Booking: ${currentTrip.name}`,
        message: `${username} booked for ${adults} adults, ${childrenUnder12} children, ${infants} infants. Net Total: ${parseFloat(netTotal).toFixed(2)} EGP`,
        totalAmount: parseFloat(parseFloat(netTotal).toFixed(2)),
        bookingId: refNumber,
        tripId: tripPName,
        tripName: currentTrip.name,
        userName: username,
        userEmail: email,
        phone: phone,
        adults: adults,
        children: childrenUnder12,
        infants: infants,
        tripDate: tripDate,
        read: false,
        timestamp: Date.now(),
        type: 'new_booking'
      });
    }

    sessionStorage.setItem("username", username);
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("phone", phone);

    showToast('Booking submitted! Redirecting to payment...');
    window.location.href = kashierUrl;
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast('Error: ' + (error.message || 'Failed to process booking.'), 'error');
    hideSpinner();
  }
}

// ========================================
// TRIP DATA LOADING
// ========================================

async function fetchAllTripData() {
  try {
    showSpinner();
    const snapshot = await db.ref('trips').once('value');
    const allTripsData = snapshot.val();
    
    if (!allTripsData) {
      showToast("No trips available at the moment.", 'error');
      return {};
    }
    
    tripData = allTripsData;
    
    if (tripPName && allTripsData[tripPName]) {
      currentTrip = allTripsData[tripPName];
      currentTrip.basePrice = currentTrip.price || 0;
      currentTrip.commissionRate = currentTrip.commission || 0.10;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      currentTrip.supplierId = tripOwnerId;
      
      displayTripInfo(currentTrip);
      loadMediaContent(currentTrip.media);
      loadIncludedNotIncluded(currentTrip);
      loadTimeline(currentTrip.timeline);
      loadWhatToBring(currentTrip.whatToBring);
      
      updatePriceDisplay();
    } else {
      showToast("Trip not found.", 'error');
    }
    
    return allTripsData;
  } catch (error) {
    console.error("Error fetching trip data:", error);
    showToast("Failed to load trip data.", 'error');
    throw error;
  } finally {
    hideSpinner();
  }
}

function displayTripInfo(tripInfo) {
  const tripTitle = document.getElementById('tourTitle');
  const tripName = document.getElementById('tripName');
  const tourDuration = document.getElementById('tourDuration');
  
  if (tripTitle && tripInfo.name) tripTitle.textContent = tripInfo.name;
  if (tripName && tripInfo.name) tripName.value = tripInfo.name;
  if (tourDuration && tripInfo.duration) tourDuration.textContent = tripInfo.duration;
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;

  const swiperWrapper = document.querySelector('.swiper-wrapper');
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');
  const thumbnailsOverlay = document.getElementById('thumbnailsOverlay');
  
  if (swiperWrapper) swiperWrapper.innerHTML = '';
  if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
  if (thumbnailsOverlay) thumbnailsOverlay.innerHTML = '';

  // Load images
  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      // Swiper slide
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `<img src="${imageUrl}" alt="${currentTrip.name || 'Tour image'}">`;
      swiperWrapper.appendChild(slide);
      
      // Thumbnail (for both desktop and overlay)
      const createThumb = (container) => {
        if (!container) return;
        const thumb = document.createElement('img');
        thumb.src = imageUrl;
        thumb.alt = `Thumbnail ${index + 1}`;
        thumb.dataset.index = index;
        thumb.addEventListener('click', () => {
          if (swiper) swiper.slideTo(index);
          updateActiveThumbnail(index);
        });
        container.appendChild(thumb);
      };
      
      createThumb(thumbnailsContainer);
      createThumb(thumbnailsOverlay);
    });
  }
  
  // Load videos
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach((video, index) => {
      const videoIndex = mediaData.images ? mediaData.images.length + index : index;
      
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.dataset.thumbnail = video.thumbnail;
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="Video thumbnail">
        <div class="play-button"><i class="fas fa-play"></i></div>
      `;
      swiperWrapper.appendChild(slide);
      
      const createThumb = (container) => {
        if (!container) return;
        const thumb = document.createElement('img');
        thumb.src = video.thumbnail;
        thumb.alt = `Video ${index + 1}`;
        thumb.dataset.index = videoIndex;
        thumb.addEventListener('click', () => {
          if (swiper) swiper.slideTo(videoIndex);
          updateActiveThumbnail(videoIndex);
        });
        container.appendChild(thumb);
      };
      
      createThumb(thumbnailsContainer);
      createThumb(thumbnailsOverlay);
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
        clickable: true 
      },
      navigation: { 
        nextEl: '.swiper-button-next', 
        prevEl: '.swiper-button-prev' 
      },
      on: {
        slideChange: function() {
          updateActiveThumbnail(this.realIndex);
          stopCurrentVideo();
        }
      }
    });
    
    // Video play handler
    document.querySelector('.swiper')?.addEventListener('click', function(e) {
      const playButton = e.target.closest('.play-button');
      if (playButton) {
        const slide = playButton.closest('.swiper-slide');
        if (slide?.classList.contains('swiper-slide-video')) {
          playVideo(slide);
        }
      }
    });
  } else {
    swiper.update();
  }
  
  // Set first thumbnail as active
  updateActiveThumbnail(0);
}

function playVideo(slide) {
  stopCurrentVideo();
  
  const videoUrl = slide.dataset.videoUrl;
  let videoId;
  
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    videoId = (match && match[2].length === 11) ? match[2] : null;
    
    if (videoId) {
      slide.innerHTML = `
        <iframe width="100%" height="100%" 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
      currentVideoSlide = slide;
    }
  }
}

function stopCurrentVideo() {
  if (currentVideoSlide) {
    const thumbnail = currentVideoSlide.dataset.thumbnail;
    const videoUrl = currentVideoSlide.dataset.videoUrl;
    currentVideoSlide.innerHTML = `
      <img src="${thumbnail}" alt="Video thumbnail">
      <div class="play-button"><i class="fas fa-play"></i></div>
    `;
    currentVideoSlide = null;
  }
}

function updateActiveThumbnail(index) {
  // Update both thumbnail containers
  document.querySelectorAll('.thumbnail, .thumbnails-overlay img').forEach(thumb => {
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
      itemElement.className = 'included-item';
      itemElement.innerHTML = `<i class="fas fa-check" style="color: #22c55e;"></i><span>${item}</span>`;
      includedContainer.appendChild(itemElement);
    });
  }
  
  if (notIncludedContainer && tripData.notIncluded) {
    notIncludedContainer.innerHTML = '';
    tripData.notIncluded.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'included-item';
      itemElement.innerHTML = `<i class="fas fa-times" style="color: #ef4444;"></i><span>${item}</span>`;
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
      <div class="timeline-time">${item.time}</div>
      <div class="timeline-content">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
      </div>
    `;
    timelineContainer.appendChild(timelineItem);
  });
}

function loadWhatToBring(whatToBringData) {
  const whatToBringList = document.getElementById('whatToBringList');
  if (!whatToBringList || !whatToBringData) return;
  
  whatToBringList.innerHTML = '';
  whatToBringData.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="fas fa-check"></i> ${item}`;
    whatToBringList.appendChild(li);
  });
}

// ========================================
// NUMBER CONTROLS INIT
// ========================================

function initNumberControls() {
  // Desktop
  setupStepper('adultsPlus', 'adultsMinus', 'adults', 1, MAX_PER_TYPE, true);
  setupStepper('childrenUnder12Plus', 'childrenUnder12Minus', 'childrenUnder12', 0, MAX_PER_TYPE, false);
  setupStepper('infantsPlus', 'infantsMinus', 'infants', 0, MAX_TOTAL_INFANTS, false);
}

function setupStepper(plusId, minusId, inputId, min, max, updateInfants) {
  const plusBtn = document.getElementById(plusId);
  const minusBtn = document.getElementById(minusId);
  const input = document.getElementById(inputId);
  
  if (plusBtn && input) {
    plusBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const currentValue = parseInt(input.value);
      if (currentValue < max) {
        input.value = currentValue + 1;
        if (updateInfants) updateInfantsMax();
        updateSummary();
      }
    });
  }
  
  if (minusBtn && input) {
    minusBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const currentValue = parseInt(input.value);
      if (currentValue > min) {
        input.value = currentValue - 1;
        if (updateInfants) updateInfantsMax();
        updateSummary();
      }
    });
  }
}

// ========================================
// POPULATE FORM FROM USER DATA
// ========================================

async function populateForm() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userSnapshot = await db.ref('egy_user').child(user.uid).once('value');
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

// ========================================
// CURRENCY INIT
// ========================================

function initCurrencyFromHeader() {
  currentCurrency = getCurrentCurrencyFromHeader();
  const headerRates = getExchangeRatesFromHeader();
  
  if (headerRates) {
    exchangeRates = headerRates;
    ratesLoaded = true;
  }
  
  // Listen for currency changes
  window.addEventListener('currencyChanged', function(event) {
    if (event.detail && event.detail.currency) {
      currentCurrency = event.detail.currency;
      if (event.detail.rates) {
        exchangeRates = event.detail.rates;
        ratesLoaded = true;
      }
      updatePriceDisplay();
      updateSummary();
    }
  });
}

// ========================================
// APPLICATION INITIALIZATION
// ========================================

window.onload = async function () {
  if (!tripPName) {
    showToast("No trip specified.", 'error');
    return;
  }

  // Initialize currency
  initCurrencyFromHeader();

  // Initialize phone input
  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    try {
      iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: "eg",
      });
    } catch (error) {
      console.error("intlTelInput initialization failed:", error);
    }
  }

  // Initialize number controls
  initNumberControls();

  // Initialize date picker
  flatpickr("#tripDate", {
    minDate: new Date().fp_incr(1),
    dateFormat: "Y-m-d",
    disableMobile: true,
    onChange: updateSummary
  });

  // Attach event listeners
  document.getElementById('submitBtn')?.addEventListener('click', submitForm);
  
  // Extra Services Popup
  document.getElementById('extraServicesTrigger')?.addEventListener('click', openServicesPopup);
  document.getElementById('openServicesBtn')?.addEventListener('click', openServicesPopup);
  document.getElementById('cancelServicesBtn')?.addEventListener('click', closeServicesPopup);
  document.getElementById('confirmServicesBtn')?.addEventListener('click', confirmServiceSelection);
  document.getElementById('closeServicesPopup')?.addEventListener('click', closeServicesPopup);
  
  // Close popup on overlay click
  document.getElementById('extraServicesPopup')?.addEventListener('click', function(e) {
    if (e.target === this || e.target.classList.contains('services-popup-overlay')) {
      closeServicesPopup();
    }
  });
  
  // Mobile Bottom Sheet
  document.getElementById('mobileBookNowBtn')?.addEventListener('click', openMobileBottomSheet);
  document.getElementById('mobileBottomSheetOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeMobileBottomSheet();
  });
  
  // Touch swipe to close mobile sheet
  const mobileSheet = document.getElementById('mobileBottomSheet');
  if (mobileSheet) {
    let touchStartY = 0;
    mobileSheet.addEventListener('touchstart', function(e) {
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    mobileSheet.addEventListener('touchend', function(e) {
      const touchEndY = e.changedTouches[0].screenY;
      if (touchEndY > touchStartY + 80 && mobileSheet.scrollTop <= 0) {
        closeMobileBottomSheet();
      }
    }, { passive: true });
  }

  // Auth state listener
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserUid = user.uid;
      populateForm();
    } else {
      currentUserUid = 'anonymous';
    }
  });

  // Load trip data
  await fetchAllTripData();
  updateSummary();
  
  // Delayed price updates
  setTimeout(() => {
    updatePriceDisplay();
    updateSummary();
  }, 500);
  
  setTimeout(() => {
    updatePriceDisplay();
    updateSummary();
  }, 1500);
};

// ========================================
// ADDITIONAL CSS FOR TOAST ANIMATIONS
// ========================================
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(toastStyle);

console.log('✅ Tour Booking System Initialized - Creative Design v2.0');
