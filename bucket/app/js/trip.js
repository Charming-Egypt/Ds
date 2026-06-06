// ==========================================================================
// DISCOVER SHARM - Tour Booking System
// Complete JavaScript Controller v5.0 Final
// With Fixed Booking Card, Mobile Bottom Sheet, Reviews & User Photos
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
const refNumber = generateReference();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_ADULT = 2;
const MAX_TOTAL_INFANTS = 10;
let currentStep = 0;
let currentCurrency = 'EGP';
let exchangeRates = { EGP: 1 };
let ratesLoaded = false;

// Reviews System
let tripReviews = [];
let currentUserReview = null;

function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// ==========================================================================
// CURRENCY FUNCTIONS
// ==========================================================================
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
  const converted = priceEGP * exchangeRates[currentCurrency];
  let symbol = '';
  if (currentCurrency === 'USD') symbol = '$';
  else if (currentCurrency === 'EUR') symbol = '€';
  else if (currentCurrency === 'GBP') symbol = '£';
  else return parseFloat(priceEGP).toFixed(2) + ' EGP';
  return symbol + parseFloat(converted).toFixed(2);
}

// ==========================================================================
// UTILITY FUNCTIONS
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
  toast.style.cssText = `
    position: fixed;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1f35;
    color: #fff;
    padding: 14px 24px;
    border-radius: 30px;
    z-index: 99999;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    border-left: 4px solid ${type === 'success' ? '#22c55e' : '#ef4444'};
    white-space: nowrap;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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

// ==========================================================================
// PRICE CALCULATION
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
  return parseFloat((calculateNetTotal() + calculateTaxesOnly()).toFixed(2));
}

// ==========================================================================
// PRICE DISPLAY
// ==========================================================================
function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  if (priceElement && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    priceElement.innerHTML = formatPrice(netTotal);
  }
}

// ==========================================================================
// FORM NAVIGATION
// ==========================================================================
function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = ((currentStep + 1) * 25) + '%';
  
  const steps = document.querySelectorAll('.booking-form-container .progress-steps .step');
  steps.forEach((s, i) => {
    if (i === currentStep) s.classList.add('active');
    else s.classList.remove('active');
  });
  
  const mobileBar = document.querySelector('#mobileBookingContent #progressBar');
  if (mobileBar) mobileBar.style.width = ((currentStep + 1) * 25) + '%';
  
  const mobileSteps = document.querySelectorAll('#mobileBookingContent .progress-steps .step');
  mobileSteps.forEach((s, i) => {
    if (i === currentStep) s.classList.add('active');
    else s.classList.remove('active');
  });
}

function nextStep() {
  if (!validateCurrentStep()) return;
  
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep++;
  const next = document.getElementById(`step${currentStep + 1}`);
  if (next) next.classList.add('active');
  
  updateProgressBar();
  updateSummary();
  syncMobileSteps();
}

function prevStep() {
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep--;
  const prev = document.getElementById(`step${currentStep + 1}`);
  if (prev) prev.classList.add('active');
  
  updateProgressBar();
  syncMobileSteps();
}

function syncMobileSteps() {
  const mobileContent = document.getElementById('mobileBookingContent');
  if (!mobileContent || mobileContent.children.length === 0) return;
  
  const mobileSteps = mobileContent.querySelectorAll('.form-step');
  mobileSteps.forEach((s, i) => {
    if (i === currentStep) s.classList.add('active');
    else s.classList.remove('active');
  });
}

// ==========================================================================
// VALIDATION
// ==========================================================================
function validateCurrentStep() {
  let isValid = true;
  
  if (currentStep === 0) {
    const username = document.getElementById("username")?.value.trim();
    const email = document.getElementById("customerEmail")?.value.trim();
    
    if (!username) { showError('username', 'Please enter your full name'); isValid = false; }
    else clearError('username');
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { 
      showError('customerEmail', 'Please enter a valid email'); 
      isValid = false; 
    } else clearError('customerEmail');
    
    if (iti) {
      const phoneNumber = iti.getNumber();
      if (!phoneNumber || !iti.isValidNumber()) { 
        showError('phone', 'Please enter a valid phone number'); 
        isValid = false; 
      } else clearError('phone');
    }
  } else if (currentStep === 1) {
    const tripDate = document.getElementById("tripDate")?.value.trim();
    const hotelName = document.getElementById("hotelName")?.value.trim();
    const roomNumber = document.getElementById("roomNumber")?.value.trim();
    
    if (!tripDate) { showError('tripDate', 'Please select a trip date'); isValid = false; }
    else clearError('tripDate');
    
    if (!hotelName) { showError('hotelName', 'Please enter your hotel name'); isValid = false; }
    else clearError('hotelName');
    
    if (!roomNumber) { showError('roomNumber', 'Please enter your room number'); isValid = false; }
    else clearError('roomNumber');
  }
  
  return isValid;
}

// ==========================================================================
// SUMMARY UPDATE
// ==========================================================================
function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('infants').value) || 0;
  
  const setVal = (id, val) => { 
    const el = document.getElementById(id); 
    if (el) el.textContent = val;
    const mobileEl = document.querySelector(`#mobileBookingContent #${id}`);
    if (mobileEl) mobileEl.textContent = val;
  };
  
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
    const html = `
      <div style="font-weight:bold;font-size:20px;">${formatPrice(netTotal)}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:4px;margin-top:4px;">
          <span>+ Taxes:</span><span>${formatPrice(taxes)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;">
          <span>Total at Payment:</span><span>${formatPrice(totalWithTaxes)}</span>
        </div>
      </div>`;
    totalDisplay.innerHTML = html;
    
    const mobileTotalDisplay = document.querySelector('#mobileBookingContent #totalPriceDisplay');
    if (mobileTotalDisplay) mobileTotalDisplay.innerHTML = html;
  }
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

// ==========================================================================
// FORM SUBMISSION
// ==========================================================================
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to complete your booking');

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: parseFloat(totalWithTaxes.toFixed(2)),
        currency: 'EGP'
      })
    });

    if (!response.ok) throw new Error('Payment processing failed');
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
    await db.ref('trip-bookings/' + refNumber).set({ ...bookingData, paymenturl: kashierUrl });

    if (tripOwnerId) {
      const notificationId = Date.now().toString();
      await db.ref(`notifications/${tripOwnerId}/${notificationId}`).set({
        id: notificationId,
        title: `New Booking: ${currentTrip.name}`,
        message: `${username} booked for ${adults} adults, ${childrenUnder12} children, ${infants} infants`,
        totalAmount: parseFloat(netTotal.toFixed(2)),
        bookingId: refNumber, tripId: tripPName, tripName: currentTrip.name,
        userName: username, userEmail: email, phone,
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
    console.error('Submission Error:', error);
    showToast('Error: ' + (error.message || 'Failed to process booking.'), 'error');
    hideSpinner();
  }
}

// ==========================================================================
// TRIP DATA LOADING
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
      currentTrip.commissionRate = currentTrip.commission || 0.10;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      currentTrip.supplierId = tripOwnerId;
      
      displayTripInfo(currentTrip);
      populateTripTypeDropdown(tourTypes);
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
  if (document.getElementById('tourTitle') && tripInfo.name) 
    document.getElementById('tourTitle').textContent = tripInfo.name;
  if (document.getElementById('tripName') && tripInfo.name) 
    document.getElementById('tripName').value = tripInfo.name;
  if (document.getElementById('tourDuration') && tripInfo.duration) 
    document.getElementById('tourDuration').textContent = tripInfo.duration;
}

function populateTripTypeDropdown(tourTypes) {
  const select = document.getElementById('tripType');
  if (!select) return;
  
  select.innerHTML = '<option value="">No extra services</option>';
  
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.setAttribute('data-price-egp', tourTypes[key]);
      option.textContent = `${key} - ${formatPrice(tourTypes[key])} (per person)`;
      select.appendChild(option);
    });
  }
  
  select.value = selectedTripType || '';
  select.onchange = function() {
    selectedTripType = this.value;
    updateSummary();
  };
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
    thumb.src = src;
    thumb.dataset.index = index;
    thumb.addEventListener('click', () => { 
      if (swiper) swiper.slideTo(index); 
      updateActiveThumbnail(index); 
    });
    thumbnailsOverlay.appendChild(thumb);
  };

  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `<img src="${imageUrl}" alt="${currentTrip.name || 'Tour image'}">`;
      swiperWrapper.appendChild(slide);
      addThumb(imageUrl, index);
    });
  }
  
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach((video, index) => {
      const videoIndex = mediaData.images ? mediaData.images.length + index : index;
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.dataset.thumbnail = video.thumbnail;
      slide.innerHTML = `<img src="${video.thumbnail}" alt="Video thumbnail"><div class="play-button"><i class="fas fa-play"></i></div>`;
      swiperWrapper.appendChild(slide);
      addThumb(video.thumbnail, videoIndex);
    });
  }
  
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1, spaceBetween: 0, loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: { 
        slideChange: function() { 
          updateActiveThumbnail(this.realIndex); 
          stopCurrentVideo(); 
        } 
      }
    });
    
    document.querySelector('.swiper')?.addEventListener('click', function(e) {
      const playButton = e.target.closest('.play-button');
      if (playButton) {
        const slide = playButton.closest('.swiper-slide');
        if (slide?.classList.contains('swiper-slide-video')) playVideo(slide);
      }
    });
  } else {
    swiper.update();
  }
  
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
      slide.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      currentVideoSlide = slide;
    }
  }
}

function stopCurrentVideo() {
  if (currentVideoSlide) {
    const thumbnail = currentVideoSlide.dataset.thumbnail;
    currentVideoSlide.innerHTML = `<img src="${thumbnail}" alt="Video thumbnail"><div class="play-button"><i class="fas fa-play"></i></div>`;
    currentVideoSlide = null;
  }
}

function updateActiveThumbnail(index) {
  document.querySelectorAll('.thumbnails-overlay img').forEach(thumb => {
    if (parseInt(thumb.dataset.index) === index) thumb.classList.add('active');
    else thumb.classList.remove('active');
  });
}

function loadIncludedNotIncluded(tripData) {
  const includedContainer = document.getElementById('includedItems');
  const notIncludedContainer = document.getElementById('notIncludedItems');
  
  if (includedContainer && tripData.included) {
    includedContainer.innerHTML = '';
    tripData.included.forEach(item => {
      const el = document.createElement('div');
      el.className = 'included-item';
      el.innerHTML = `<i class="fas fa-check" style="color:#22c55e;"></i><span>${item}</span>`;
      includedContainer.appendChild(el);
    });
  }
  
  if (notIncludedContainer && tripData.notIncluded) {
    notIncludedContainer.innerHTML = '';
    tripData.notIncluded.forEach(item => {
      const el = document.createElement('div');
      el.className = 'included-item';
      el.innerHTML = `<i class="fas fa-times" style="color:#ef4444;"></i><span>${item}</span>`;
      notIncludedContainer.appendChild(el);
    });
  }
}

function loadTimeline(timelineData) {
  const container = document.getElementById('timelineContainer');
  if (!container || !timelineData) return;
  
  container.innerHTML = '';
  timelineData.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'timeline-item';
    el.innerHTML = `<div class="timeline-time">${item.time}</div><div class="timeline-content"><h4>${item.title}</h4><p>${item.description}</p></div>`;
    container.appendChild(el);
  });
}

function loadWhatToBring(whatToBringData) {
  const list = document.getElementById('whatToBringList');
  if (!list || !whatToBringData) return;
  
  list.innerHTML = '';
  whatToBringData.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="fas fa-check"></i> ${item}`;
    list.appendChild(li);
  });
}

// ==========================================================================
// NUMBER CONTROLS
// ==========================================================================
function initNumberControls() {
  setupStepper('adultsPlus', 'adultsMinus', 'adults', 1, MAX_PER_TYPE, true);
  setupStepper('childrenUnder12Plus', 'childrenUnder12Minus', 'childrenUnder12', 0, MAX_PER_TYPE, false);
  setupStepper('infantsPlus', 'infantsMinus', 'infants', 0, MAX_TOTAL_INFANTS, false);
}

function setupStepper(plusId, minusId, inputId, min, max, updateInfants) {
  const plusBtn = document.getElementById(plusId);
  const minusBtn = document.getElementById(minusId);
  const input = document.getElementById(inputId);
  
  if (plusBtn && input) {
    plusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = parseInt(input.value);
      if (val < max) { input.value = val + 1; if (updateInfants) updateInfantsMax(); updateSummary(); }
    });
  }
  
  if (minusBtn && input) {
    minusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = parseInt(input.value);
      if (val > min) { input.value = val - 1; if (updateInfants) updateInfantsMax(); updateSummary(); }
    });
  }
}

// ==========================================================================
// FLATPICKR
// ==========================================================================
function initFlatpickr() {
  const dateInput = document.getElementById("tripDate");
  if (!dateInput) return;
  if (dateInput._flatpickr) dateInput._flatpickr.destroy();
  
  flatpickr(dateInput, {
    minDate: new Date().fp_incr(1),
    dateFormat: "Y-m-d",
    disableMobile: true,
    onChange: updateSummary
  });
}

// ==========================================================================
// MOBILE BOTTOM SHEET - COMPLETE WORKING VERSION
// ==========================================================================
function isMobile() { return window.innerWidth <= 768; }

function openMobileBottomSheet() {
  const overlay = document.getElementById('mobileBottomSheetOverlay');
  const sheet = document.getElementById('mobileBottomSheet');
  const content = document.getElementById('mobileBookingContent');
  
  if (!overlay || !sheet || !content) return;
  
  const bookingContainer = document.querySelector('.booking-form-container');
  if (!bookingContainer) return;
  
  // Clone the ENTIRE booking container
  content.innerHTML = '';
  const clone = bookingContainer.cloneNode(true);
  clone.style.cssText = 'position:relative;top:auto;max-height:none;display:block;box-shadow:none;border:none;padding:0;background:transparent;';
  content.appendChild(clone);
  
  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Initialize cloned elements
  setTimeout(() => {
    // Re-init flatpickr
    const clonedDateInput = content.querySelector('#tripDate');
    if (clonedDateInput) {
      if (clonedDateInput._flatpickr) clonedDateInput._flatpickr.destroy();
      flatpickr(clonedDateInput, {
        minDate: new Date().fp_incr(1),
        dateFormat: "Y-m-d",
        disableMobile: true,
        onChange: function(selectedDates, dateStr) {
          document.getElementById('tripDate').value = dateStr;
          updateSummary();
        }
      });
    }
    
    // Re-attach select
    const clonedSelect = content.querySelector('#tripType');
    if (clonedSelect) {
      clonedSelect.value = selectedTripType || '';
      clonedSelect.onchange = function() {
        selectedTripType = this.value;
        document.getElementById('tripType').value = selectedTripType;
        updateSummary();
      };
    }
    
    // Re-attach ALL buttons
    attachAllMobileButtonEvents(content);
    
    // Re-attach steppers
    attachMobileSteppers(content);
    
    // Sync steps
    syncMobileSteps();
    
  }, 200);
  
  setTimeout(() => { sheet.scrollTop = 0; }, 300);
  updateSummary();
}

function attachAllMobileButtonEvents(container) {
  if (!container) return;
  
  // Clone and replace all buttons to remove old events
  const allButtons = container.querySelectorAll('button');
  allButtons.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    if (btn.parentNode) btn.parentNode.replaceChild(newBtn, btn);
  });
  
  // Get fresh buttons
  const freshButtons = container.querySelectorAll('button');
  
  freshButtons.forEach(btn => {
    const btnText = (btn.textContent || '').trim();
    
    // NEXT/CONTINUE/REVIEW buttons
    if (btnText.includes('Continue') || btnText.includes('Next') || btnText.includes('Review')) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (validateCurrentStep()) {
          const mobileSteps = container.querySelectorAll('.form-step');
          let currentMobileStep = 0;
          mobileSteps.forEach((s, i) => {
            if (s.classList.contains('active')) currentMobileStep = i;
            s.classList.remove('active');
          });
          
          const nextStepIndex = currentMobileStep + 1;
          if (mobileSteps[nextStepIndex]) {
            mobileSteps[nextStepIndex].classList.add('active');
          }
          
          document.getElementById(`step${currentStep + 1}`)?.classList.remove('active');
          currentStep++;
          document.getElementById(`step${currentStep + 1}`)?.classList.add('active');
          
          updateProgressBar();
          updateSummary();
          
          const sheet = document.getElementById('mobileBottomSheet');
          if (sheet) sheet.scrollTop = 0;
        }
      });
    }
    
    // CONFIRM & PAY button
    if (btnText.includes('Confirm') || btnText.includes('Pay')) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        syncMobileToDesktop(container);
        submitForm();
      });
    }
    
    // BACK button
    if (btnText.includes('Back')) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const mobileSteps = container.querySelectorAll('.form-step');
        let currentMobileStep = 0;
        mobileSteps.forEach((s, i) => {
          if (s.classList.contains('active')) currentMobileStep = i;
          s.classList.remove('active');
        });
        
        const prevStepIndex = currentMobileStep - 1;
        if (mobileSteps[prevStepIndex]) {
          mobileSteps[prevStepIndex].classList.add('active');
        }
        
        document.getElementById(`step${currentStep + 1}`)?.classList.remove('active');
        currentStep--;
        document.getElementById(`step${currentStep + 1}`)?.classList.add('active');
        
        updateProgressBar();
        
        const sheet = document.getElementById('mobileBottomSheet');
        if (sheet) sheet.scrollTop = 0;
      });
    }
  });
  
  attachMobileSteppers(container);
}

function syncMobileToDesktop(container) {
  const fields = ['username', 'customerEmail', 'phone', 'tripDate', 'hotelName', 'roomNumber', 'adults', 'childrenUnder12', 'infants'];
  fields.forEach(fieldId => {
    const mobileField = container.querySelector(`#${fieldId}`);
    const desktopField = document.getElementById(fieldId);
    if (mobileField && desktopField) desktopField.value = mobileField.value;
  });
  
  const mobileSelect = container.querySelector('#tripType');
  if (mobileSelect) {
    selectedTripType = mobileSelect.value;
    document.getElementById('tripType').value = selectedTripType;
  }
}

function attachMobileSteppers(container) {
  if (!container) return;
  
  const setupMobileStepper = (plusSel, minusSel, inputSel, min, max, updateInfantsFn) => {
    const plusBtn = container.querySelector(plusSel);
    const minusBtn = container.querySelector(minusSel);
    const input = container.querySelector(inputSel);
    
    if (plusBtn && input) {
      const newPlusBtn = plusBtn.cloneNode(true);
      plusBtn.parentNode.replaceChild(newPlusBtn, plusBtn);
      newPlusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const val = parseInt(input.value);
        if (val < max) {
          input.value = val + 1;
          const desktopInput = document.querySelector(inputSel);
          if (desktopInput) desktopInput.value = input.value;
          if (updateInfantsFn) updateInfantsMax();
          updateSummary();
        }
      });
    }
    
    if (minusBtn && input) {
      const newMinusBtn = minusBtn.cloneNode(true);
      minusBtn.parentNode.replaceChild(newMinusBtn, minusBtn);
      newMinusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const val = parseInt(input.value);
        if (val > min) {
          input.value = val - 1;
          const desktopInput = document.querySelector(inputSel);
          if (desktopInput) desktopInput.value = input.value;
          if (updateInfantsFn) updateInfantsMax();
          updateSummary();
        }
      });
    }
  };
  
  setupMobileStepper('#adultsPlus', '#adultsMinus', '#adults', 1, MAX_PER_TYPE, true);
  setupMobileStepper('#childrenUnder12Plus', '#childrenUnder12Minus', '#childrenUnder12', 0, MAX_PER_TYPE, false);
  setupMobileStepper('#infantsPlus', '#infantsMinus', '#infants', 0, MAX_TOTAL_INFANTS, false);
}

function closeMobileBottomSheet() {
  const overlay = document.getElementById('mobileBottomSheetOverlay');
  const sheet = document.getElementById('mobileBottomSheet');
  if (overlay) overlay.classList.add('hidden');
  if (sheet) sheet.classList.add('hidden');
  document.body.style.overflow = '';
}

// ==========================================================================
// REVIEWS SYSTEM - WITH USER PHOTOS
// ==========================================================================

function getUserPhotoUrl(userId) {
  if (!userId) return null;
  return `/app/photos/${userId}.jpg`;
}

async function loadReviews() {
    const tripId = tripPName;
    if (!tripId) return;
    
    try {
        const snapshot = await db.ref(`trip-reviews/${tripId}`).once('value');
        const data = snapshot.val();
        
        if (data && data.reviews) {
            tripReviews = Object.entries(data.reviews).map(([id, review]) => ({ id, ...review }))
                .filter(r => r.approved === true)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            updateStarsSummary(data.average || 0, data.count || 0);
            renderReviews();
        } else {
            updateStarsSummary(0, 0);
            renderReviews();
        }
        
        const user = auth.currentUser;
        if (user) {
            currentUserReview = tripReviews.find(r => r.userId === user.uid);
            const btn = document.getElementById('openReviewBtn');
            if (btn) {
                if (currentUserReview) {
                    btn.innerHTML = '<i class="fas fa-edit"></i><span>Edit Your Review</span>';
                } else {
                    btn.innerHTML = '<i class="fas fa-pen-alt"></i><span>Write a Review</span>';
                }
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function updateStarsSummary(average, count) {
    const container = document.getElementById('avgStars');
    const countSpan = document.getElementById('reviewsCountText');
    
    if (container) {
        container.innerHTML = '';
        const full = Math.floor(average);
        const half = (average % 1) >= 0.5;
        
        for (let i = 0; i < full; i++) container.innerHTML += '<i class="fas fa-star"></i>';
        if (half) container.innerHTML += '<i class="fas fa-star-half-alt"></i>';
        for (let i = container.children.length; i < 5; i++) container.innerHTML += '<i class="far fa-star"></i>';
    }
    
    if (countSpan) {
        countSpan.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
    }
}

function renderReviews() {
    const container = document.getElementById('reviewsListContainer');
    if (!container) return;
    
    if (tripReviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>No reviews yet</p>
                <span>Be the first to review this trip</span>
            </div>`;
        return;
    }
    
    container.innerHTML = tripReviews.map(review => {
        const date = new Date(review.date);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const initial = (review.userName || 'U').charAt(0).toUpperCase();
        const photoUrl = getUserPhotoUrl(review.userId);
        
        return `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #FF6B35, #FFA630);">
                            <img src="${photoUrl}" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy">
                            <div class="photo-fallback" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #fff;">${initial}</div>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #fff; font-size: 14px;">${escapeHtml(review.userName || 'User')}</div>
                            <div style="display: flex; gap: 2px; font-size: 11px; margin-top: 2px;">
                                ${Array(5).fill().map((_, i) => i < review.rating ? '<i class="fas fa-star" style="color: #f59e0b;"></i>' : '<i class="far fa-star" style="color: #64748b;"></i>').join('')}
                            </div>
                        </div>
                    </div>
                    <span style="font-size: 11px; color: #64748b; white-space: nowrap;">${formattedDate}</span>
                </div>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">${escapeHtml(review.comment)}</p>
            </div>`;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================================================
// REVIEW MODAL
// ==========================================================================
function createReviewModal() {
    const existingModal = document.getElementById('reviewModal');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
    <div id="reviewModal" class="hidden" style="position: fixed; inset: 0; z-index: 99999; display: none; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);" id="reviewModalOverlay"></div>
        <div style="position: relative; background: #1a1f35; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; width: 90%; max-width: 460px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); z-index: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <h3 style="font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; margin: 0;">
                    <i class="fas fa-star" style="color: #f59e0b;"></i>
                    <span>Write a Review</span>
                </h3>
                <button id="closeModalBtn" style="background: none; border: none; color: #94a3b8; font-size: 28px; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: 0.2s; line-height: 1;">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
                        <i class="fas fa-ticket-alt" style="color: #f59e0b; margin-right: 4px;"></i> Booking Voucher Number
                    </label>
                    <input type="text" id="voucherInput" placeholder="Example: DS_XXXXXXXXXX" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 13px; box-sizing: border-box;">
                    <p style="font-size: 10px; color: #64748b; margin-top: 4px;">Found in your confirmation email</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">Your Rating</label>
                    <div style="display: flex; gap: 6px; font-size: 30px;" id="starSelector">
                        <i class="far fa-star" data-rating="1" style="color: #64748b; cursor: pointer; transition: 0.15s;"></i>
                        <i class="far fa-star" data-rating="2" style="color: #64748b; cursor: pointer; transition: 0.15s;"></i>
                        <i class="far fa-star" data-rating="3" style="color: #64748b; cursor: pointer; transition: 0.15s;"></i>
                        <i class="far fa-star" data-rating="4" style="color: #64748b; cursor: pointer; transition: 0.15s;"></i>
                        <i class="far fa-star" data-rating="5" style="color: #64748b; cursor: pointer; transition: 0.15s;"></i>
                    </div>
                    <input type="hidden" id="ratingValue" value="0">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">Your Review</label>
                    <textarea id="commentInput" rows="4" placeholder="Share your experience with this trip..." style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 13px; resize: none; box-sizing: border-box;"></textarea>
                    <div style="text-align: right; font-size: 10px; color: #64748b; margin-top: 4px;"><span id="charCount">0</span>/500</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="cancelReviewBtn" style="flex: 1; padding: 12px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #fff; font-weight: 600; flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; transition: 0.2s;">Cancel</button>
                    <button id="submitReviewBtn" style="flex: 1; padding: 12px; border-radius: 30px; border: none; background: linear-gradient(135deg, #FF6B35, #FFA630); color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;"><i class="fas fa-paper-plane"></i> Submit</button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function verifyVoucher(voucherNumber) {
    const user = auth.currentUser;
    if (!user) { showToast('Please login first', 'error'); return false; }
    
    try {
        const snapshot = await db.ref('trip-bookings/' + voucherNumber).once('value');
        const booking = snapshot.val();
        
        if (!booking) { showToast('Invalid voucher number.', 'error'); return false; }
        if (booking.uid !== user.uid) { showToast('This voucher belongs to another user.', 'error'); return false; }
        
        const bookingTripId = booking.tripId || booking.Id || '';
        if (bookingTripId !== tripPName) { showToast('This voucher is for a different trip.', 'error'); return false; }
        
        return true;
    } catch (error) {
        console.error('Voucher verification error:', error);
        showToast('Error verifying voucher.', 'error');
        return false;
    }
}

async function submitReviewHandler() {
    const voucher = document.getElementById('voucherInput')?.value?.trim()?.toUpperCase();
    if (!voucher) { showToast('Please enter your voucher number', 'error'); return; }
    
    const rating = parseInt(document.getElementById('ratingValue')?.value || '0');
    if (rating === 0) { showToast('Please select a rating', 'error'); return; }
    
    const comment = document.getElementById('commentInput')?.value?.trim();
    if (!comment) { showToast('Please write your review', 'error'); return; }
    if (comment.length < 5) { showToast('Review must be at least 5 characters', 'error'); return; }
    
    const isValid = await verifyVoucher(voucher);
    if (!isValid) return;
    
    const submitBtn = document.getElementById('submitReviewBtn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const user = auth.currentUser;
        let userName = 'Traveler';
        try {
            const userSnapshot = await db.ref('egy_user/' + user.uid).once('value');
            const userData = userSnapshot.val();
            if (userData) userName = userData.username || userData.name || user.email?.split('@')[0] || 'Traveler';
            else userName = user.email?.split('@')[0] || 'Traveler';
        } catch (e) { userName = user.email?.split('@')[0] || 'Traveler'; }
        
        const reviewData = {
            userId: user.uid, userName, rating, comment,
            date: new Date().toISOString(), approved: true, voucher
        };
        
        const reviewsRef = db.ref('trip-reviews/' + tripPName);
        const snapshot = await reviewsRef.once('value');
        const current = snapshot.val() || { reviews: {}, count: 0, average: 0 };
        
        let newCount = current.count || 0;
        let totalRating = (current.average || 0) * newCount;
        
        if (currentUserReview && current.reviews[currentUserReview.id]) {
            const oldRating = current.reviews[currentUserReview.id].rating || 0;
            totalRating = totalRating - oldRating + rating;
            await reviewsRef.child('reviews/' + currentUserReview.id).update(reviewData);
        } else {
            const newId = Date.now().toString();
            await reviewsRef.child('reviews/' + newId).set(reviewData);
            newCount++;
            totalRating += rating;
        }
        
        const newAverage = newCount > 0 ? totalRating / newCount : 0;
        await reviewsRef.update({ count: newCount, average: parseFloat(newAverage.toFixed(1)) });
        
        closeReviewModal();
        resetReviewForm();
        await loadReviews();
        showToast(currentUserReview ? 'Review updated!' : 'Thank you for your review!', 'success');
        
    } catch (error) {
        console.error('Review submission error:', error);
        showToast('Error: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
    }
}

function resetReviewForm() {
    const vi = document.getElementById('voucherInput');
    const ci = document.getElementById('commentInput');
    const rv = document.getElementById('ratingValue');
    const cc = document.getElementById('charCount');
    if (vi) vi.value = '';
    if (ci) ci.value = '';
    if (rv) rv.value = '0';
    if (cc) cc.textContent = '0';
    document.querySelectorAll('#starSelector i').forEach(s => { s.className = 'far fa-star'; s.style.color = '#64748b'; });
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
    document.body.style.overflow = '';
}

function openReviewModal() {
    const user = auth.currentUser;
    if (!user) { showToast('Please login first', 'error'); return; }
    
    if (!document.getElementById('reviewModal')) { createReviewModal(); setupReviewModalEvents(); }
    
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        if (currentUserReview) {
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Your Review';
            document.getElementById('voucherInput').value = currentUserReview.voucher || '';
            document.getElementById('commentInput').value = currentUserReview.comment || '';
            document.getElementById('ratingValue').value = currentUserReview.rating || 0;
            document.getElementById('charCount').textContent = (currentUserReview.comment || '').length;
            const stars = document.querySelectorAll('#starSelector i');
            stars.forEach((s, i) => {
                if (i < (currentUserReview.rating || 0)) { s.className = 'fas fa-star'; s.style.color = '#f59e0b'; }
                else { s.className = 'far fa-star'; s.style.color = '#64748b'; }
            });
        } else {
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-star"></i> Write a Review';
            resetReviewForm();
        }
    }
}

function setupReviewModalEvents() {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    
    const stars = document.querySelectorAll('#starSelector i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            document.getElementById('ratingValue').value = rating;
            stars.forEach((s, i) => {
                if (i < rating) { s.className = 'fas fa-star'; s.style.color = '#f59e0b'; }
                else { s.className = 'far fa-star'; s.style.color = '#64748b'; }
            });
        });
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => { if (i < rating) s.style.color = '#fbbf24'; });
        });
        star.addEventListener('mouseleave', () => {
            const currentRating = parseInt(document.getElementById('ratingValue').value) || 0;
            stars.forEach((s, i) => { if (i >= currentRating) s.style.color = '#64748b'; });
        });
    });
    
    const commentInput = document.getElementById('commentInput');
    const charCount = document.getElementById('charCount');
    if (commentInput && charCount) {
        commentInput.addEventListener('input', () => {
            let len = commentInput.value.length;
            if (len > 500) { commentInput.value = commentInput.value.substring(0, 500); len = 500; }
            charCount.textContent = len;
        });
    }
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeReviewModal);
    document.getElementById('cancelReviewBtn')?.addEventListener('click', closeReviewModal);
    document.getElementById('reviewModalOverlay')?.addEventListener('click', closeReviewModal);
    document.getElementById('submitReviewBtn')?.addEventListener('click', submitReviewHandler);
    document.getElementById('openReviewBtn')?.addEventListener('click', openReviewModal);
}

// ==========================================================================
// USER DATA
// ==========================================================================
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
  } catch (error) { console.error("Error fetching user data:", error); }
}

function initCurrencyFromHeader() {
  currentCurrency = getCurrentCurrencyFromHeader();
  const headerRates = getExchangeRatesFromHeader();
  if (headerRates) { exchangeRates = headerRates; ratesLoaded = true; }
  
  window.addEventListener('currencyChanged', function(event) {
    if (event.detail && event.detail.currency) {
      currentCurrency = event.detail.currency;
      if (event.detail.rates) { exchangeRates = event.detail.rates; ratesLoaded = true; }
      updatePriceDisplay();
      updateSummary();
    }
  });
}

// ==========================================================================
// APPLICATION INITIALIZATION
// ==========================================================================
window.onload = async function () {
  if (!tripPName) { showToast("No trip specified.", 'error'); return; }

  initCurrencyFromHeader();

  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    try {
      iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: "eg",
      });
    } catch (error) { console.error("intlTelInput initialization failed:", error); }
  }

  initNumberControls();
  initFlatpickr();

  document.getElementById('submitBtn')?.addEventListener('click', submitForm);
  document.getElementById('mobileBookNowBtn')?.addEventListener('click', openMobileBottomSheet);
  document.getElementById('mobileBottomSheetOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeMobileBottomSheet();
  });

  const mobileSheet = document.getElementById('mobileBottomSheet');
  if (mobileSheet) {
    let touchStartY = 0;
    mobileSheet.addEventListener('touchstart', (e) => { touchStartY = e.changedTouches[0].screenY; }, { passive: true });
    mobileSheet.addEventListener('touchend', (e) => {
      if (e.changedTouches[0].screenY > touchStartY + 80 && mobileSheet.scrollTop <= 0) closeMobileBottomSheet();
    }, { passive: true });
  }

  auth.onAuthStateChanged((user) => {
    if (user) { currentUserUid = user.uid; populateForm(); }
    else { currentUserUid = 'anonymous'; }
  });

  await fetchAllTripData();
  updateSummary();
  
  setTimeout(() => {
    if (tripPName) {
      createReviewModal();
      setupReviewModalEvents();
      loadReviews();
    }
  }, 2000);
  
  setTimeout(() => { updatePriceDisplay(); updateSummary(); }, 500);
  setTimeout(() => { updatePriceDisplay(); updateSummary(); }, 1500);
};

console.log('✅ Discover Sharm - Booking System v5.0 Final');
