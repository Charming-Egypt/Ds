// ==========================================================================
// DISCOVER SHARM - Tour Booking System
// Complete JavaScript Controller v3.0
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

function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// ========================================
// CURRENCY
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
// UTILITY
// ========================================
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
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1f35;color:#fff;padding:12px 24px;border-radius:30px;z-index:9999;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'success' ? '#22c55e' : '#ef4444') + ';';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
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
  return parseFloat((calculateNetTotal() + calculateTaxesOnly()).toFixed(2));
}

// ========================================
// PRICE DISPLAY
// ========================================
function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  if (priceElement && currentTrip.basePrice) {
    const netTotal = calculateNetTotal();
    priceElement.innerHTML = formatPrice(netTotal);
  }
}

// ========================================
// FORM NAVIGATION
// ========================================
function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = ((currentStep + 1) * 25) + '%';
  const steps = document.querySelectorAll('.progress-steps .step');
  steps.forEach((s, i) => {
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
}

function prevStep() {
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep--;
  const prev = document.getElementById(`step${currentStep + 1}`);
  if (prev) prev.classList.add('active');
  updateProgressBar();
}

// ========================================
// VALIDATION
// ========================================
function validateCurrentStep() {
  let isValid = true;
  if (currentStep === 0) {
    const username = document.getElementById("username")?.value.trim();
    const email = document.getElementById("customerEmail")?.value.trim();
    if (!username) { showError('username', 'Please enter your full name'); isValid = false; }
    else clearError('username');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('customerEmail', 'Please enter a valid email'); isValid = false; }
    else clearError('customerEmail');
    if (iti) {
      const phoneNumber = iti.getNumber();
      if (!phoneNumber || !iti.isValidNumber()) { showError('phone', 'Please enter a valid phone number'); isValid = false; }
      else clearError('phone');
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

// ========================================
// SUMMARY
// ========================================
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
    totalDisplay.innerHTML = `
      <div style="font-weight:bold;font-size:20px;">${formatPrice(netTotal)}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:4px;margin-top:4px;">
          <span>+ Taxes:</span><span>${formatPrice(taxes)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;">
          <span>Total at Payment:</span><span>${formatPrice(totalWithTaxes)}</span>
        </div>
      </div>`;
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

// ========================================
// FORM SUBMISSION
// ========================================
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(totalWithTaxes.toFixed(2)), currency: 'EGP' })
    });

    if (!response.ok) throw new Error('Payment processing failed');
    const data = await response.json();
    
    const paymentParams = new URLSearchParams({
      merchantId: 'MID-33260-3', orderId: refNumber,
      amount: parseFloat(totalWithTaxes.toFixed(2)), currency: 'EGP',
      hash: data.hash, mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false', redirectMethod: 'get'
    });

    const kashierUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;
    await db.ref('trip-bookings/' + refNumber).set({ ...bookingData, paymenturl: kashierUrl });

    if (tripOwnerId) {
      const notificationId = Date.now().toString();
      await db.ref(`notifications/${tripOwnerId}/${notificationId}`).set({
        id: notificationId, title: `New Booking: ${currentTrip.name}`,
        message: `${username} booked for ${adults} adults, ${childrenUnder12} children, ${infants} infants. Net Total: ${parseFloat(netTotal).toFixed(2)} EGP`,
        totalAmount: parseFloat(parseFloat(netTotal).toFixed(2)),
        bookingId: refNumber, tripId: tripPName, tripName: currentTrip.name,
        userName: username, userEmail: email, phone, adults, children: childrenUnder12, infants, tripDate,
        read: false, timestamp: Date.now(), type: 'new_booking'
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
    } else { showToast("Trip not found.", 'error'); }
    return allTripsData;
  } catch (error) {
    console.error("Error fetching trip data:", error);
    showToast("Failed to load trip data.", 'error');
    throw error;
  } finally { hideSpinner(); }
}

function displayTripInfo(tripInfo) {
  if (document.getElementById('tourTitle') && tripInfo.name) document.getElementById('tourTitle').textContent = tripInfo.name;
  if (document.getElementById('tripName') && tripInfo.name) document.getElementById('tripName').value = tripInfo.name;
  if (document.getElementById('tourDuration') && tripInfo.duration) document.getElementById('tourDuration').textContent = tripInfo.duration;
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
    thumb.addEventListener('click', () => { if (swiper) swiper.slideTo(index); updateActiveThumbnail(index); });
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
      on: { slideChange: function() { updateActiveThumbnail(this.realIndex); stopCurrentVideo(); } }
    });
    document.querySelector('.swiper')?.addEventListener('click', function(e) {
      const playButton = e.target.closest('.play-button');
      if (playButton) {
        const slide = playButton.closest('.swiper-slide');
        if (slide?.classList.contains('swiper-slide-video')) playVideo(slide);
      }
    });
  } else { swiper.update(); }
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
    const videoUrl = currentVideoSlide.dataset.videoUrl;
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

// ========================================
// NUMBER CONTROLS
// ========================================
function initNumberControls() {
  setupStepper('adultsPlus', 'adultsMinus', 'adults', 1, MAX_PER_TYPE, true);
  setupStepper('childrenUnder12Plus', 'childrenUnder12Minus', 'childrenUnder12', 0, MAX_PER_TYPE, false);
  setupStepper('infantsPlus', 'infantsMinus', 'infants', 0, MAX_TOTAL_INFANTS, false);
}

function setupStepper(plusId, minusId, inputId, min, max, updateInfants) {
  const plusBtn = document.getElementById(plusId);
  const minusBtn = document.getElementById(minusId);
  const input = document.getElementById(inputId);
  if (plusBtn && input) plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const val = parseInt(input.value);
    if (val < max) { input.value = val + 1; if (updateInfants) updateInfantsMax(); updateSummary(); }
  });
  if (minusBtn && input) minusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const val = parseInt(input.value);
    if (val > min) { input.value = val - 1; if (updateInfants) updateInfantsMax(); updateSummary(); }
  });
}

// ========================================
// FLATPICKR
// ========================================
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

// ========================================
// MOBILE BOTTOM SHEET
// ========================================
function isMobile() { return window.innerWidth <= 768; }

function openMobileBottomSheet() {
  const overlay = document.getElementById('mobileBottomSheetOverlay');
  const sheet = document.getElementById('mobileBottomSheet');
  const content = document.getElementById('mobileBookingContent');
  if (!overlay || !sheet || !content) return;
  
  const bookingContainer = document.querySelector('.booking-form-container');
  if (!bookingContainer) return;
  
  content.innerHTML = '';
  const clone = bookingContainer.cloneNode(true);
  clone.style.cssText = 'position:relative;top:auto;max-height:none;display:block;box-shadow:none;border:none;padding:0;background:transparent;';
  content.appendChild(clone);
  
  setTimeout(() => {
    const clonedDateInput = content.querySelector('#tripDate');
    if (clonedDateInput) {
      if (clonedDateInput._flatpickr) clonedDateInput._flatpickr.destroy();
      flatpickr(clonedDateInput, {
        minDate: new Date().fp_incr(1),
        dateFormat: "Y-m-d",
        disableMobile: true,
        onChange: function(selectedDates, dateStr) {
          const orig = document.getElementById('tripDate');
          if (orig) orig.value = dateStr;
          updateSummary();
        }
      });
    }
    
    const clonedSelect = content.querySelector('#tripType');
    if (clonedSelect) {
      clonedSelect.onchange = function() {
        selectedTripType = this.value;
        document.getElementById('tripType').value = selectedTripType;
        updateSummary();
      };
    }
    
    // Re-attach buttons
    content.querySelectorAll('.btn-primary').forEach(btn => {
      if (btn.textContent.includes('Continue') || btn.textContent.includes('Next') || btn.textContent.includes('Review')) {
        btn.onclick = (e) => { e.preventDefault(); if (validateCurrentStep()) { nextStep(); syncMobileSteps(); } };
      }
      if (btn.textContent.includes('Confirm') || btn.textContent.includes('Pay')) {
        btn.onclick = (e) => { e.preventDefault(); submitForm(); };
      }
    });
    
    content.querySelectorAll('.btn-secondary').forEach(btn => {
      if (btn.textContent.includes('Back')) {
        btn.onclick = (e) => { e.preventDefault(); prevStep(); syncMobileSteps(); };
      }
    });
    
    // Re-attach steppers
    attachMobileSteppers(content);
  }, 150);
  
  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { sheet.scrollTop = 0; }, 200);
}

function syncMobileSteps() {
  const mobileSteps = document.querySelectorAll('#mobileBookingContent .form-step');
  const desktopSteps = document.querySelectorAll('.booking-form-container .form-step');
  mobileSteps.forEach((s, i) => {
    if (i === currentStep) s.classList.add('active');
    else s.classList.remove('active');
  });
  desktopSteps.forEach((s, i) => {
    if (i === currentStep) s.classList.add('active');
    else s.classList.remove('active');
  });
  const mobileBar = document.querySelector('#mobileBookingContent #progressBar');
  if (mobileBar) mobileBar.style.width = ((currentStep + 1) * 25) + '%';
}

function attachMobileSteppers(container) {
  const setup = (plusSel, minusSel, inputSel, min, max, updateInfantsFn) => {
    const plusBtn = container.querySelector(plusSel);
    const minusBtn = container.querySelector(minusSel);
    const input = container.querySelector(inputSel);
    if (plusBtn && input) plusBtn.onclick = (e) => {
      e.preventDefault();
      const val = parseInt(input.value);
      if (val < max) {
        input.value = val + 1;
        const origInput = document.querySelector(inputSel);
        if (origInput && origInput !== input) origInput.value = input.value;
        if (updateInfantsFn) updateInfantsMax();
        updateSummary();
      }
    };
    if (minusBtn && input) minusBtn.onclick = (e) => {
      e.preventDefault();
      const val = parseInt(input.value);
      if (val > min) {
        input.value = val - 1;
        const origInput = document.querySelector(inputSel);
        if (origInput && origInput !== input) origInput.value = input.value;
        if (updateInfantsFn) updateInfantsMax();
        updateSummary();
      }
    };
  };
  setup('#adultsPlus', '#adultsMinus', '#adults', 1, MAX_PER_TYPE, true);
  setup('#childrenUnder12Plus', '#childrenUnder12Minus', '#childrenUnder12', 0, MAX_PER_TYPE, false);
  setup('#infantsPlus', '#infantsMinus', '#infants', 0, MAX_TOTAL_INFANTS, false);
}

function closeMobileBottomSheet() {
  const overlay = document.getElementById('mobileBottomSheetOverlay');
  const sheet = document.getElementById('mobileBottomSheet');
  if (overlay) overlay.classList.add('hidden');
  if (sheet) sheet.classList.add('hidden');
  document.body.style.overflow = '';
}

// ========================================
// USER DATA
// ========================================
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

// ========================================
// INITIALIZATION
// ========================================
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
  setTimeout(() => { updatePriceDisplay(); updateSummary(); }, 500);
  setTimeout(() => { updatePriceDisplay(); updateSummary(); }, 1500);
};

console.log('✅ Tour Booking System Initialized v3.0');
