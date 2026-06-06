// ==========================================================================
// DISCOVER SHARM - Tour Booking System v7.0 Final
// Desktop: Right Column Booking | Mobile: Below Reviews Booking
// ==========================================================================

// ==========================================================================
// GLOBAL VARIABLES
// ==========================================================================
let swiper;
let currentVideoSlide = null;
let tripData = {};
let currentTrip = {};
let tourTypes = {};
let selectedTripType = "";
let iti;
let mobileIti;
const refNumber = generateReference();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_ADULT = 2;
const MAX_TOTAL_INFANTS = 10;
let currentStep = 0;
let mobileCurrentStep = 0;
let currentCurrency = 'EGP';
let exchangeRates = { EGP: 1 };
let ratesLoaded = false;
let tripReviews = [];
let currentUserReview = null;

function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// ==========================================================================
// CURRENCY
// ==========================================================================
function getCurrentCurrencyFromHeader() {
  if (window.SharmCurrency && typeof window.SharmCurrency.get === 'function') return window.SharmCurrency.get();
  return localStorage.getItem('preferredCurrency') || 'EGP';
}

function getExchangeRatesFromHeader() {
  if (window.SharmCurrency && window.SharmCurrency.rates) return window.SharmCurrency.rates;
  return null;
}

function formatPrice(priceEGP) {
  if (!ratesLoaded || currentCurrency === 'EGP') return parseFloat(priceEGP).toFixed(2) + ' EGP';
  const converted = priceEGP * exchangeRates[currentCurrency];
  if (currentCurrency === 'USD') return '$' + parseFloat(converted).toFixed(2);
  if (currentCurrency === 'EUR') return '€' + parseFloat(converted).toFixed(2);
  if (currentCurrency === 'GBP') return '£' + parseFloat(converted).toFixed(2);
  return parseFloat(priceEGP).toFixed(2) + ' EGP';
}

// ==========================================================================
// UTILITY
// ==========================================================================
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'DS-' + result;
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/[<>]/g, "").trim();
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  const errEl = document.getElementById(`${elementId}Error`);
  if (el) el.style.borderColor = '#ef4444';
  if (errEl) { errEl.textContent = message; errEl.classList.remove('hidden'); }
}

function clearError(elementId) {
  const el = document.getElementById(elementId);
  const errEl = document.getElementById(`${elementId}Error`);
  if (el) el.style.borderColor = '';
  if (errEl) errEl.classList.add('hidden');
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1f35;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ${type==='success'?'#22c55e':'#ef4444'};white-space:nowrap;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(()=>toast.remove(),300); }, 4000);
}

function showSpinner() {
  const s = document.getElementById('spinner');
  const b = document.getElementById('submitBtn');
  if (s) s.classList.remove('hidden');
  if (b) b.disabled = true;
}

function hideSpinner() {
  const s = document.getElementById('spinner');
  const b = document.getElementById('submitBtn');
  if (s) s.classList.add('hidden');
  if (b) b.disabled = false;
}

function isMobile() { return window.innerWidth <= 768; }

// ==========================================================================
// PRICE CALCULATION (Desktop)
// ==========================================================================
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
    return parseFloat(((adults + childrenUnder12) * parseFloat(tourTypes[selectedTripType])).toFixed(2));
  }
  return 0;
}

function calculateNetTotal() {
  return parseFloat((calculateBaseTotal() + calculateExtraServicesTotal()).toFixed(2));
}

function calculateTaxesOnly() {
  const netTotal = calculateNetTotal();
  const threePercent = parseFloat((netTotal * 0.03).toFixed(2));
  const fourteenPercent = parseFloat((threePercent * 0.14).toFixed(2));
  return parseFloat((threePercent + fourteenPercent + 3).toFixed(2));
}

function calculateTotalWithTaxes() {
  return parseFloat((calculateNetTotal() + calculateTaxesOnly()).toFixed(2));
}

function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  if (priceElement && currentTrip.basePrice) {
    priceElement.innerHTML = formatPrice(calculateNetTotal());
  }
}

// ==========================================================================
// DESKTOP FORM NAVIGATION
// ==========================================================================
function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = ((currentStep + 1) * 25) + '%';
  document.querySelectorAll('#desktopBookingCard .progress-steps .step').forEach((s, i) => {
    s.classList.toggle('active', i === currentStep);
  });
}

function nextStep() {
  if (!validateCurrentStep()) return;
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  updateProgressBar();
  updateSummary();
}

function prevStep() {
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep--;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  updateProgressBar();
}

function validateCurrentStep() {
  let isValid = true;
  if (currentStep === 0) {
    if (!document.getElementById("username")?.value.trim()) { showError('username','Please enter your full name'); isValid = false; }
    else clearError('username');
    const email = document.getElementById("customerEmail")?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('customerEmail','Please enter a valid email'); isValid = false; }
    else clearError('customerEmail');
    if (iti && (!iti.getNumber() || !iti.isValidNumber())) { showError('phone','Please enter a valid phone number'); isValid = false; }
    else clearError('phone');
  } else if (currentStep === 1) {
    if (!document.getElementById("tripDate")?.value.trim()) { showError('tripDate','Please select a trip date'); isValid = false; }
    else clearError('tripDate');
    if (!document.getElementById("hotelName")?.value.trim()) { showError('hotelName','Please enter your hotel name'); isValid = false; }
    else clearError('hotelName');
    if (!document.getElementById("roomNumber")?.value.trim()) { showError('roomNumber','Please enter your room number'); isValid = false; }
    else clearError('roomNumber');
  }
  return isValid;
}

function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('infants').value) || 0;
  
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setVal('summaryDate', document.getElementById("tripDate")?.value || "Not specified");
  setVal('summaryHotel', sanitizeInput(document.getElementById("hotelName")?.value) || "Not specified yet");
  setVal('summaryRoom', sanitizeInput(document.getElementById("roomNumber")?.value) || "Not specified yet");
  setVal('summaryRef', refNumber);
  setVal('summaryTour', currentTrip.name || 'N/A');
  setVal('summaryAdults', `${adults} Adult${adults !== 1 ? 's' : ''}`);
  setVal('summaryChildrenUnder12', `${childrenUnder12} Child${childrenUnder12 !== 1 ? 'ren' : ''}`);
  setVal('summaryInfants', `${infants} Infant${infants !== 1 ? 's' : ''}`);
  setVal('summaryService', selectedTripType || 'None');
  
  const totalDisplay = document.getElementById('totalPriceDisplay');
  if (totalDisplay && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    const taxes = calculateTaxesOnly();
    const totalWithTaxes = calculateTotalWithTaxes();
    totalDisplay.innerHTML = `<div style="font-weight:bold;font-size:20px;">${formatPrice(netTotal)}</div><div style="font-size:11px;color:#94a3b8;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:4px;margin-top:4px;"><span>+ Taxes:</span><span>${formatPrice(taxes)}</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;"><span>Total at Payment:</span><span>${formatPrice(totalWithTaxes)}</span></div></div>`;
  }
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  if (!adultsInput || !infantsInput) return;
  const adults = parseInt(adultsInput.value) || 0;
  const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  if (parseInt(infantsInput.value) > maxInfants) infantsInput.value = maxInfants;
  infantsInput.max = maxInfants;
}

// ==========================================================================
// MOBILE BOOKING - Below Reviews
// ==========================================================================
function showMobileBooking() {
  const section = document.getElementById('mobileBookingSection');
  if (section) {
    section.classList.remove('hidden');
    setTimeout(() => { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  }
}

function mobileNextStep() {
  if (!validateMobileStep()) return;
  document.getElementById(`mobileStep${mobileCurrentStep + 1}`).classList.remove('active');
  mobileCurrentStep++;
  document.getElementById(`mobileStep${mobileCurrentStep + 1}`).classList.add('active');
  updateMobileProgressBar();
  updateMobileSummary();
  document.getElementById('mobileBookingSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mobilePrevStep() {
  document.getElementById(`mobileStep${mobileCurrentStep + 1}`).classList.remove('active');
  mobileCurrentStep--;
  document.getElementById(`mobileStep${mobileCurrentStep + 1}`).classList.add('active');
  updateMobileProgressBar();
  document.getElementById('mobileBookingSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateMobileProgressBar() {
  const bar = document.getElementById('mobileProgressBar');
  if (bar) bar.style.width = ((mobileCurrentStep + 1) * 25) + '%';
  document.querySelectorAll('#mobileBookingCard .progress-steps .step').forEach((s, i) => {
    s.classList.toggle('active', i === mobileCurrentStep);
  });
}

function validateMobileStep() {
  let isValid = true;
  if (mobileCurrentStep === 0) {
    if (!document.getElementById("mobileUsername")?.value.trim()) isValid = false;
    const email = document.getElementById("mobileCustomerEmail")?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) isValid = false;
  } else if (mobileCurrentStep === 1) {
    if (!document.getElementById("mobileTripDate")?.value.trim()) isValid = false;
    if (!document.getElementById("mobileHotelName")?.value.trim()) isValid = false;
    if (!document.getElementById("mobileRoomNumber")?.value.trim()) isValid = false;
  }
  return isValid;
}

function updateMobileSummary() {
  const adults = parseInt(document.getElementById('mobileAdults').value) || 0;
  const children = parseInt(document.getElementById('mobileChildrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('mobileInfants').value) || 0;
  
  document.getElementById('mobileSummaryDate').textContent = document.getElementById('mobileTripDate')?.value || "Not specified";
  document.getElementById('mobileSummaryHotel').textContent = document.getElementById('mobileHotelName')?.value || "-";
  document.getElementById('mobileSummaryRoom').textContent = document.getElementById('mobileRoomNumber')?.value || "-";
  document.getElementById('mobileSummaryRef').textContent = refNumber;
  document.getElementById('mobileSummaryTour').textContent = currentTrip.name || 'N/A';
  document.getElementById('mobileSummaryAdults').textContent = `${adults} Adult${adults !== 1 ? 's' : ''}`;
  document.getElementById('mobileSummaryChildrenUnder12').textContent = `${children} Child${children !== 1 ? 'ren' : ''}`;
  document.getElementById('mobileSummaryInfants').textContent = `${infants} Infant${infants !== 1 ? 's' : ''}`;
  document.getElementById('mobileSummaryService').textContent = document.getElementById('mobileTripType')?.value || 'None';
  
  const totalDisplay = document.getElementById('mobileTotalPriceDisplay');
  if (totalDisplay && currentTrip.basePrice) {
    const netTotal = calculateMobileNetTotal();
    const taxes = calculateMobileTaxes();
    const totalWithTaxes = netTotal + taxes;
    totalDisplay.innerHTML = `<div style="font-weight:bold;font-size:20px;">${formatPrice(netTotal)}</div><div style="font-size:11px;color:#94a3b8;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:4px;margin-top:4px;"><span>+ Taxes:</span><span>${formatPrice(taxes)}</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;"><span>Total at Payment:</span><span>${formatPrice(totalWithTaxes)}</span></div></div>`;
  }
}

function calculateMobileNetTotal() {
  const adults = parseInt(document.getElementById('mobileAdults').value) || 0;
  const children = parseInt(document.getElementById('mobileChildrenUnder12').value) || 0;
  if (!currentTrip.basePrice) return 0;
  const basePrice = parseFloat(currentTrip.basePrice);
  const childPrice = parseFloat(currentTrip.cprice) || basePrice * 0.5;
  let total = (adults * basePrice) + (children * childPrice);
  const mobileService = document.getElementById('mobileTripType')?.value;
  if (mobileService && tourTypes[mobileService]) {
    total += (adults + children) * parseFloat(tourTypes[mobileService]);
  }
  return parseFloat(total.toFixed(2));
}

function calculateMobileTaxes() {
  const netTotal = calculateMobileNetTotal();
  const threePercent = parseFloat((netTotal * 0.03).toFixed(2));
  const fourteenPercent = parseFloat((threePercent * 0.14).toFixed(2));
  return parseFloat((threePercent + fourteenPercent + 3).toFixed(2));
}

function mobileSubmitForm() {
  // Sync mobile to desktop
  document.getElementById('username').value = document.getElementById('mobileUsername').value;
  document.getElementById('customerEmail').value = document.getElementById('mobileCustomerEmail').value;
  document.getElementById('tripDate').value = document.getElementById('mobileTripDate').value;
  document.getElementById('hotelName').value = document.getElementById('mobileHotelName').value;
  document.getElementById('roomNumber').value = document.getElementById('mobileRoomNumber').value;
  document.getElementById('adults').value = document.getElementById('mobileAdults').value;
  document.getElementById('childrenUnder12').value = document.getElementById('mobileChildrenUnder12').value;
  document.getElementById('infants').value = document.getElementById('mobileInfants').value;
  selectedTripType = document.getElementById('mobileTripType')?.value || '';
  document.getElementById('tripType').value = selectedTripType;
  submitForm();
}

function initMobileBooking() {
  const mobileDateInput = document.getElementById('mobileTripDate');
  if (mobileDateInput) {
    flatpickr(mobileDateInput, {
      minDate: new Date().fp_incr(1),
      dateFormat: "Y-m-d",
      disableMobile: true,
      onChange: updateMobileSummary
    });
  }
  
  const mobileSelect = document.getElementById('mobileTripType');
  if (mobileSelect && tourTypes) {
    mobileSelect.innerHTML = '<option value="">Select extra services...</option>';
    Object.keys(tourTypes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${formatPrice(tourTypes[key])} (per person)`;
      mobileSelect.appendChild(option);
    });
    mobileSelect.onclick = function(e) { e.preventDefault(); openServicesPopup(); };
    mobileSelect.onmousedown = function(e) { e.preventDefault(); };
  }
  
  setupMobileStepper('mobileAdultsPlus', 'mobileAdultsMinus', 'mobileAdults', 1, MAX_PER_TYPE);
  setupMobileStepper('mobileChildrenPlus', 'mobileChildrenMinus', 'mobileChildrenUnder12', 0, MAX_PER_TYPE);
  setupMobileStepper('mobileInfantsPlus', 'mobileInfantsMinus', 'mobileInfants', 0, MAX_TOTAL_INFANTS);
  
  // Init mobile phone
  const mobilePhoneInput = document.getElementById('mobilePhone');
  if (mobilePhoneInput && window.intlTelInput) {
    mobileIti = window.intlTelInput(mobilePhoneInput, {
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
      preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
      separateDialCode: true,
      initialCountry: "eg",
    });
  }
}

function setupMobileStepper(plusId, minusId, inputId, min, max) {
  const plusBtn = document.getElementById(plusId);
  const minusBtn = document.getElementById(minusId);
  const input = document.getElementById(inputId);
  if (plusBtn && input) plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const val = parseInt(input.value);
    if (val < max) { input.value = val + 1; updateMobileSummary(); }
  });
  if (minusBtn && input) minusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const val = parseInt(input.value);
    if (val > min) { input.value = val - 1; updateMobileSummary(); }
  });
}

// ==========================================================================
// FORM SUBMISSION
// ==========================================================================
async function submitForm() {
  if (!validateCurrentStep() && isMobile() && !validateMobileStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to complete your booking');

    const netTotal = isMobile() ? calculateMobileNetTotal() : calculateNetTotal();
    const taxes = isMobile() ? calculateMobileTaxes() : calculateTaxesOnly();
    const totalWithTaxes = netTotal + taxes;
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
      refNumber, username, email, phone,
      tour: currentTrip.name, tripId: tripPName, tripDate,
      adults, childrenUnder12, infants, hotelName, roomNumber,
      baseTotal: parseFloat(calculateBaseTotal().toFixed(2)),
      extraServicesTotal: parseFloat(calculateExtraServicesTotal().toFixed(2)),
      netTotal: parseFloat(netTotal.toFixed(2)),
      total: parseFloat(totalWithTaxes.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      extraServices: selectedTripType || 'None',
      specialRequests: 'none', status: 'pending', resStatus: 'new',
      isPaid: false, paymentStatus: 'unpaid',
      uid: user.uid, owner: tripOwnerId || user.uid,
      pickuptime: '', createdAt: Date.now(), updatedAt: Date.now()
    };

    const response = await fetch('https://kashier-hash.gm-093.workers.dev/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(totalWithTaxes.toFixed(2)), currency: 'EGP' })
    });

    if (!response.ok) throw new Error('Payment processing failed');
    const data = await response.json();
    
    const kashierUrl = `https://payments.kashier.io/?${new URLSearchParams({
      merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(totalWithTaxes.toFixed(2)),
      currency: 'EGP', hash: data.hash, mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false', redirectMethod: 'get'
    }).toString()}`;
    
    await db.ref('trip-bookings/' + refNumber).set({ ...bookingData, paymenturl: kashierUrl });

    if (tripOwnerId) {
      await db.ref(`notifications/${tripOwnerId}/${Date.now()}`).set({
        title: `New Booking: ${currentTrip.name}`,
        message: `${username} booked for ${adults} adults, ${childrenUnder12} children, ${infants} infants`,
        totalAmount: parseFloat(netTotal.toFixed(2)), bookingId: refNumber, tripId: tripPName,
        tripName: currentTrip.name, userName: username, userEmail: email, phone,
        adults, children: childrenUnder12, infants, tripDate,
        read: false, timestamp: Date.now(), type: 'new_booking'
      });
    }

    sessionStorage.setItem("username", username);
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("phone", phone);
    showToast('Redirecting to payment...');
    setTimeout(() => { window.location.href = kashierUrl; }, 1000);
  } catch (error) {
    showToast('Error: ' + (error.message || 'Failed to process booking.'), 'error');
    hideSpinner();
  }
}

// ==========================================================================
// TRIP DATA
// ==========================================================================
async function fetchAllTripData() {
  try {
    showSpinner();
    const snapshot = await db.ref('trips').once('value');
    const allTripsData = snapshot.val();
    if (!allTripsData) { showToast("No trips available.", 'error'); return {}; }
    tripData = allTripsData;
    if (tripPName && allTripsData[tripPName]) {
      currentTrip = allTripsData[tripPName];
      currentTrip.basePrice = currentTrip.price || 0;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      displayTripInfo(currentTrip);
      populateTripTypeDropdown(tourTypes);
      loadMediaContent(currentTrip.media);
      loadIncludedNotIncluded(currentTrip);
      loadTimeline(currentTrip.timeline);
      loadWhatToBring(currentTrip.whatToBring);
      updatePriceDisplay();
    }
    return allTripsData;
  } catch (error) { showToast("Failed to load trip data.", 'error'); throw error; }
  finally { hideSpinner(); }
}

function displayTripInfo(tripInfo) {
  if (document.getElementById('tourTitle')) document.getElementById('tourTitle').textContent = tripInfo.name || '';
  if (document.getElementById('tripName')) document.getElementById('tripName').value = tripInfo.name || '';
  if (document.getElementById('mobileTripName')) document.getElementById('mobileTripName').value = tripInfo.name || '';
  if (document.getElementById('tourDuration')) document.getElementById('tourDuration').textContent = tripInfo.duration || '';
}

function populateTripTypeDropdown(tourTypes) {
  const select = document.getElementById('tripType');
  if (!select) return;
  select.innerHTML = '<option value="">Select extra services...</option>';
  if (tourTypes) {
    Object.keys(tourTypes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${formatPrice(tourTypes[key])} (per person)`;
      select.appendChild(option);
    });
  }
  select.value = selectedTripType || '';
  select.onclick = function(e) { e.preventDefault(); openServicesPopup(); };
  select.onmousedown = function(e) { e.preventDefault(); };
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;
  const swiperWrapper = document.querySelector('.swiper-wrapper');
  const thumbnailsOverlay = document.getElementById('thumbnailsOverlay');
  if (swiperWrapper) swiperWrapper.innerHTML = '';
  if (thumbnailsOverlay) thumbnailsOverlay.innerHTML = '';

  const addThumb = (src, index) => {
    if (!thumbnailsOverlay) return;
    const thumb = document.createElement('img');
    thumb.src = src; thumb.dataset.index = index;
    thumb.addEventListener('click', () => { if (swiper) swiper.slideTo(index); updateActiveThumbnail(index); });
    thumbnailsOverlay.appendChild(thumb);
  };

  if (mediaData.images) {
    mediaData.images.forEach((img, i) => {
      const slide = document.createElement('div'); slide.className = 'swiper-slide';
      slide.innerHTML = `<img src="${img}" alt="">`; swiperWrapper.appendChild(slide); addThumb(img, i);
    });
  }
  if (mediaData.videos) {
    mediaData.videos.forEach((vid, i) => {
      const idx = (mediaData.images?.length || 0) + i;
      const slide = document.createElement('div'); slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = vid.videoUrl; slide.dataset.thumbnail = vid.thumbnail;
      slide.innerHTML = `<img src="${vid.thumbnail}" alt=""><div class="play-button"><i class="fas fa-play"></i></div>`;
      swiperWrapper.appendChild(slide); addThumb(vid.thumbnail, idx);
    });
  }
  
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1, loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: { slideChange: function() { updateActiveThumbnail(this.realIndex); stopCurrentVideo(); } }
    });
  } else { swiper.update(); }
  updateActiveThumbnail(0);
}

function playVideo(slide) {
  stopCurrentVideo();
  const videoUrl = slide.dataset.videoUrl;
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const match = videoUrl.match(/(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]{11})/);
    if (match) {
      slide.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1" frameborder="0" allowfullscreen></iframe>`;
      currentVideoSlide = slide;
    }
  }
}

function stopCurrentVideo() {
  if (currentVideoSlide) {
    currentVideoSlide.innerHTML = `<img src="${currentVideoSlide.dataset.thumbnail}" alt=""><div class="play-button"><i class="fas fa-play"></i></div>`;
    currentVideoSlide = null;
  }
}

function updateActiveThumbnail(index) {
  document.querySelectorAll('.thumbnails-overlay img').forEach(t => t.classList.toggle('active', parseInt(t.dataset.index) === index));
}

function loadIncludedNotIncluded(data) {
  ['includedItems','notIncludedItems'].forEach(id => {
    const container = document.getElementById(id);
    if (container && data[id === 'includedItems' ? 'included' : 'notIncluded']) {
      container.innerHTML = '';
      const icon = id === 'includedItems' ? 'fa-check' : 'fa-times';
      const color = id === 'includedItems' ? '#22c55e' : '#ef4444';
      data[id === 'includedItems' ? 'included' : 'notIncluded'].forEach(item => {
        const el = document.createElement('div'); el.className = 'included-item';
        el.innerHTML = `<i class="fas ${icon}" style="color:${color};"></i><span>${item}</span>`;
        container.appendChild(el);
      });
    }
  });
}

function loadTimeline(data) {
  const container = document.getElementById('timelineContainer');
  if (container && data) {
    container.innerHTML = data.map(item => `<div class="timeline-item"><div class="timeline-time">${item.time}</div><div class="timeline-content"><h4>${item.title}</h4><p>${item.description}</p></div></div>`).join('');
  }
}

function loadWhatToBring(data) {
  const list = document.getElementById('whatToBringList');
  if (list && data) {
    list.innerHTML = data.map(item => `<li><i class="fas fa-check"></i> ${item}</li>`).join('');
  }
}

// ==========================================================================
// NUMBER CONTROLS
// ==========================================================================
function initNumberControls() {
  setupStepper('adultsPlus','adultsMinus','adults',1,MAX_PER_TYPE,true);
  setupStepper('childrenUnder12Plus','childrenUnder12Minus','childrenUnder12',0,MAX_PER_TYPE,false);
  setupStepper('infantsPlus','infantsMinus','infants',0,MAX_TOTAL_INFANTS,false);
}

function setupStepper(plusId, minusId, inputId, min, max, updateInfants) {
  const plus = document.getElementById(plusId), minus = document.getElementById(minusId), input = document.getElementById(inputId);
  if (plus && input) plus.addEventListener('click', (e) => { e.preventDefault(); const v = parseInt(input.value); if (v < max) { input.value = v + 1; if (updateInfants) updateInfantsMax(); updateSummary(); } });
  if (minus && input) minus.addEventListener('click', (e) => { e.preventDefault(); const v = parseInt(input.value); if (v > min) { input.value = v - 1; if (updateInfants) updateInfantsMax(); updateSummary(); } });
}

// ==========================================================================
// FLATPICKR
// ==========================================================================
function initFlatpickr() {
  const input = document.getElementById("tripDate");
  if (input) flatpickr(input, { minDate: new Date().fp_incr(1), dateFormat: "Y-m-d", disableMobile: true, onChange: updateSummary });
}

// ==========================================================================
// EXTRA SERVICES POPUP
// ==========================================================================
function openServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  const content = document.getElementById('servicesPopupContent');
  if (!popup || !content) return;
  content.innerHTML = '';
  
  const addOption = (name, price, value) => {
    const div = document.createElement('div');
    div.className = `service-option ${selectedTripType === value ? 'selected' : ''}`;
    div.innerHTML = `<div class="service-option-info"><div class="service-option-name">${name}</div><div class="service-option-price">${price}</div></div><div class="service-option-check"></div>`;
    div.onclick = () => { selectedTripType = value; document.getElementById('tripType').value = value; document.getElementById('mobileTripType').value = value; renderServiceOptions(); };
    content.appendChild(div);
  };
  
  addOption('No extra services', 'Free', '');
  if (tourTypes) Object.keys(tourTypes).forEach(k => addOption(k, `${formatPrice(tourTypes[k])} (per person)`, k));
  
  popup.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderServiceOptions() {
  document.querySelectorAll('#servicesPopupContent .service-option').forEach(opt => {
    const name = opt.querySelector('.service-option-name').textContent;
    opt.classList.toggle('selected', name === 'No extra services' ? !selectedTripType : name === selectedTripType);
  });
}

function confirmServiceSelection() {
  document.getElementById('tripType').value = selectedTripType || '';
  document.getElementById('mobileTripType').value = selectedTripType || '';
  closeServicesPopup();
  updateSummary();
  updateMobileSummary();
}

function closeServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  if (popup) { popup.classList.add('hidden'); document.body.style.overflow = ''; }
}

// ==========================================================================
// REVIEWS
// ==========================================================================
function getUserPhotoUrl(userId) { return userId ? `/app/photos/${userId}.jpg` : null; }

async function loadReviews() {
  if (!tripPName) return;
  try {
    const snapshot = await db.ref(`trip-reviews/${tripPName}`).once('value');
    const data = snapshot.val();
    if (data?.reviews) {
      tripReviews = Object.entries(data.reviews).map(([id, r]) => ({ id, ...r })).filter(r => r.approved).sort((a, b) => new Date(b.date) - new Date(a.date));
      updateStarsSummary(data.average || 0, data.count || 0);
      renderReviews();
    } else { updateStarsSummary(0, 0); renderReviews(); }
    
    const user = auth.currentUser;
    if (user) {
      currentUserReview = tripReviews.find(r => r.userId === user.uid);
      const btn = document.getElementById('openReviewBtn');
      if (btn) btn.innerHTML = currentUserReview ? '<i class="fas fa-edit"></i><span>Edit Your Review</span>' : '<i class="fas fa-pen-alt"></i><span>Write a Review</span>';
    }
  } catch (e) { console.error('Error loading reviews:', e); }
}

function updateStarsSummary(average, count) {
  const container = document.getElementById('avgStars');
  if (container) {
    container.innerHTML = '';
    for (let i = 0; i < Math.floor(average); i++) container.innerHTML += '<i class="fas fa-star"></i>';
    if (average % 1 >= 0.5) container.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = container.children.length; i < 5; i++) container.innerHTML += '<i class="far fa-star"></i>';
  }
  const countSpan = document.getElementById('reviewsCountText');
  if (countSpan) countSpan.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
}

function renderReviews() {
  const container = document.getElementById('reviewsListContainer');
  if (!container) return;
  if (!tripReviews.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p><span>Be the first to review this trip</span></div>';
    return;
  }
  container.innerHTML = tripReviews.map(r => {
    const d = new Date(r.date);
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const initial = (r.userName||'U').charAt(0).toUpperCase();
    return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#FF6B35,#FFA630);flex-shrink:0;">
            <img src="${getUserPhotoUrl(r.userId)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy">
            <div class="photo-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;">${initial}</div>
          </div>
          <div><div style="font-weight:600;color:#fff;font-size:14px;">${r.userName||'User'}</div>
            <div style="display:flex;gap:2px;font-size:11px;margin-top:2px;">${Array(5).fill().map((_,i)=>i<r.rating?'<i class="fas fa-star" style="color:#f59e0b;"></i>':'<i class="far fa-star" style="color:#64748b;"></i>').join('')}</div>
          </div>
        </div>
        <span style="font-size:11px;color:#64748b;">${date}</span>
      </div>
      <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0;">${r.comment||''}</p>
    </div>`;
  }).join('');
}

// Review Modal
function createReviewModal() {
  const existing = document.getElementById('reviewModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', `<div id="reviewModal" class="hidden" style="position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;"><div style="position:absolute;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);" id="reviewModalOverlay"></div><div style="position:relative;background:#1a1f35;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:90%;max-width:460px;box-shadow:0 20px 50px rgba(0,0,0,0.6);z-index:1;"><div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.08);"><h3 style="font-size:18px;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px;margin:0;"><i class="fas fa-star" style="color:#f59e0b;"></i><span id="modalTitle">Write a Review</span></h3><button id="closeModalBtn" style="background:none;border:none;color:#94a3b8;font-size:28px;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;line-height:1;">&times;</button></div><div style="padding:20px;"><div style="margin-bottom:16px;"><label style="display:block;font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;"><i class="fas fa-ticket-alt" style="color:#f59e0b;margin-right:4px;"></i>Booking Voucher Number</label><input type="text" id="voucherInput" placeholder="Example: DS_XXXXXXXXXX" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;box-sizing:border-box;"><p style="font-size:10px;color:#64748b;margin-top:4px;">Found in your confirmation email</p></div><div style="margin-bottom:16px;"><label style="display:block;font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;">Your Rating</label><div style="display:flex;gap:6px;font-size:30px;" id="starSelector">${Array(5).fill().map((_,i)=>`<i class="far fa-star" data-rating="${i+1}" style="color:#64748b;cursor:pointer;transition:0.15s;"></i>`).join('')}</div><input type="hidden" id="ratingValue" value="0"></div><div style="margin-bottom:20px;"><label style="display:block;font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;">Your Review</label><textarea id="commentInput" rows="4" placeholder="Share your experience..." style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;resize:none;box-sizing:border-box;"></textarea><div style="text-align:right;font-size:10px;color:#64748b;margin-top:4px;"><span id="charCount">0</span>/500</div></div><div style="display:flex;gap:10px;"><button id="cancelReviewBtn" style="flex:1;padding:12px;border-radius:30px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Cancel</button><button id="submitReviewBtn" style="flex:1;padding:12px;border-radius:30px;border:none;background:linear-gradient(135deg,#FF6B35,#FFA630);color:#fff;font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"><i class="fas fa-paper-plane"></i>Submit</button></div></div></div></div>`);
}

async function verifyVoucher(v) {
  const user = auth.currentUser;
  if (!user) { showToast('Please login first','error'); return false; }
  try {
    const snap = await db.ref('trip-bookings/'+v).once('value');
    const b = snap.val();
    if (!b) { showToast('Invalid voucher','error'); return false; }
    if (b.uid !== user.uid) { showToast('This voucher belongs to another user','error'); return false; }
    if ((b.tripId||b.Id||'') !== tripPName) { showToast('Wrong trip','error'); return false; }
    return true;
  } catch(e) { showToast('Error verifying','error'); return false; }
}

async function submitReviewHandler() {
  const voucher = document.getElementById('voucherInput')?.value?.trim()?.toUpperCase();
  if (!voucher) { showToast('Enter voucher number','error'); return; }
  const rating = parseInt(document.getElementById('ratingValue')?.value||'0');
  if (!rating) { showToast('Select rating','error'); return; }
  const comment = document.getElementById('commentInput')?.value?.trim();
  if (!comment || comment.length < 5) { showToast('Review must be 5+ characters','error'); return; }
  if (!await verifyVoucher(voucher)) return;
  
  const btn = document.getElementById('submitReviewBtn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  btn.disabled = true;
  
  try {
    const user = auth.currentUser;
    let userName = 'Traveler';
    try {
      const snap = await db.ref('egy_user/'+user.uid).once('value');
      const d = snap.val();
      if (d) userName = d.username || user.email?.split('@')[0] || 'Traveler';
    } catch(e) {}
    
    const reviewData = { userId: user.uid, userName, rating, comment, date: new Date().toISOString(), approved: true, voucher };
    const ref = db.ref('trip-reviews/'+tripPName);
    const snap = await ref.once('value');
    const cur = snap.val() || { reviews:{}, count:0, average:0 };
    let count = cur.count||0, total = (cur.average||0)*count;
    
    if (currentUserReview && cur.reviews[currentUserReview.id]) {
      total = total - (cur.reviews[currentUserReview.id].rating||0) + rating;
      await ref.child('reviews/'+currentUserReview.id).update(reviewData);
    } else {
      await ref.child('reviews/'+Date.now()).set(reviewData);
      count++; total += rating;
    }
    await ref.update({ count, average: parseFloat((total/count).toFixed(1)) });
    closeReviewModal(); resetReviewForm(); await loadReviews();
    showToast(currentUserReview?'Review updated!':'Thank you!','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
  finally { btn.innerHTML = orig; btn.disabled = false; }
}

function resetReviewForm() {
  ['voucherInput','commentInput'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('ratingValue').value = '0';
  document.getElementById('charCount').textContent = '0';
  document.querySelectorAll('#starSelector i').forEach(s => { s.className='far fa-star'; s.style.color='#64748b'; });
}

function closeReviewModal() {
  const m = document.getElementById('reviewModal');
  if (m) { m.style.display='none'; m.classList.add('hidden'); }
  document.body.style.overflow = '';
}

function openReviewModal() {
  if (!auth.currentUser) { showToast('Please login first','error'); return; }
  if (!document.getElementById('reviewModal')) { createReviewModal(); setupReviewModalEvents(); }
  const m = document.getElementById('reviewModal');
  if (m) {
    m.style.display='flex'; m.classList.remove('hidden'); document.body.style.overflow='hidden';
    if (currentUserReview) {
      document.getElementById('modalTitle').innerHTML='<i class="fas fa-edit"></i> Edit Your Review';
      document.getElementById('voucherInput').value=currentUserReview.voucher||'';
      document.getElementById('commentInput').value=currentUserReview.comment||'';
      document.getElementById('ratingValue').value=currentUserReview.rating||0;
      document.getElementById('charCount').textContent=(currentUserReview.comment||'').length;
      document.querySelectorAll('#starSelector i').forEach((s,i)=>{ if(i<(currentUserReview.rating||0)){s.className='fas fa-star';s.style.color='#f59e0b';}else{s.className='far fa-star';s.style.color='#64748b';} });
    } else { document.getElementById('modalTitle').innerHTML='<i class="fas fa-star"></i> Write a Review'; resetReviewForm(); }
  }
}

function setupReviewModalEvents() {
  document.querySelectorAll('#starSelector i').forEach(s => {
    s.addEventListener('click',()=>{
      const r=parseInt(s.dataset.rating);
      document.getElementById('ratingValue').value=r;
      document.querySelectorAll('#starSelector i').forEach((st,i)=>{ if(i<r){st.className='fas fa-star';st.style.color='#f59e0b';}else{st.className='far fa-star';st.style.color='#64748b';} });
    });
  });
  const ci=document.getElementById('commentInput'), cc=document.getElementById('charCount');
  if(ci&&cc) ci.addEventListener('input',()=>{ let l=ci.value.length; if(l>500){ci.value=ci.value.substring(0,500);l=500;} cc.textContent=l; });
  document.getElementById('closeModalBtn')?.addEventListener('click',closeReviewModal);
  document.getElementById('cancelReviewBtn')?.addEventListener('click',closeReviewModal);
  document.getElementById('reviewModalOverlay')?.addEventListener('click',closeReviewModal);
  document.getElementById('submitReviewBtn')?.addEventListener('click',submitReviewHandler);
  document.getElementById('openReviewBtn')?.addEventListener('click',openReviewModal);
}

// ==========================================================================
// USER DATA
// ==========================================================================
async function populateForm() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await db.ref('egy_user/'+user.uid).once('value');
    const d = snap.val();
    if (d) {
      if (document.getElementById("username")) document.getElementById("username").value = d.username || "";
      if (document.getElementById("mobileUsername")) document.getElementById("mobileUsername").value = d.username || "";
      if (document.getElementById("customerEmail")) document.getElementById("customerEmail").value = d.email || "";
      if (document.getElementById("mobileCustomerEmail")) document.getElementById("mobileCustomerEmail").value = d.email || "";
      if (d.phone && iti) { document.getElementById("phone").value = d.phone; iti.setNumber(d.phone); }
      if (d.phone && mobileIti) { document.getElementById("mobilePhone").value = d.phone; mobileIti.setNumber(d.phone); }
    }
  } catch(e) {}
}

function initCurrencyFromHeader() {
  currentCurrency = getCurrentCurrencyFromHeader();
  const rates = getExchangeRatesFromHeader();
  if (rates) { exchangeRates = rates; ratesLoaded = true; }
  window.addEventListener('currencyChanged', (e) => {
    if (e.detail?.currency) {
      currentCurrency = e.detail.currency;
      if (e.detail.rates) { exchangeRates = e.detail.rates; ratesLoaded = true; }
      updatePriceDisplay(); updateSummary(); updateMobileSummary();
    }
  });
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
window.onload = async function () {
  if (!tripPName) { showToast("No trip specified.", 'error'); return; }

  initCurrencyFromHeader();

  // Desktop phone
  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    try { iti = window.intlTelInput(phoneInput, { utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js", preferredCountries: ['eg','gb','de','ru','tr','it'], separateDialCode: true, initialCountry: "eg" }); } catch(e) {}
  }

  initNumberControls();
  initFlatpickr();

  // Mobile
  if (isMobile()) initMobileBooking();
  
  document.getElementById('submitBtn')?.addEventListener('click', submitForm);
  document.getElementById('mobileBookNowBtn')?.addEventListener('click', showMobileBooking);

  // Services popup
  document.getElementById('cancelServicesBtn')?.addEventListener('click', closeServicesPopup);
  document.getElementById('confirmServicesBtn')?.addEventListener('click', confirmServiceSelection);
  document.getElementById('closeServicesPopup')?.addEventListener('click', closeServicesPopup);
  document.getElementById('extraServicesPopup')?.addEventListener('click', function(e) { if (e.target === this || e.target.classList.contains('services-popup-overlay')) closeServicesPopup(); });

  auth.onAuthStateChanged((user) => { if (user) { currentUserUid = user.uid; populateForm(); } else currentUserUid = 'anonymous'; });

  await fetchAllTripData();
  updateSummary();
  if (isMobile()) updateMobileSummary();
  
  setTimeout(() => { if (tripPName) { createReviewModal(); setupReviewModalEvents(); loadReviews(); } }, 2000);
  setTimeout(() => { updatePriceDisplay(); updateSummary(); if (isMobile()) updateMobileSummary(); }, 1500);
};

console.log('✅ Discover Sharm - Booking System v7.0 Ready');
