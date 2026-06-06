// ==========================================================================
// DISCOVER SHARM - Tour Booking System v7.0 Final
// Desktop: Right Column | Mobile: Below Reviews
// ==========================================================================

let swiper, currentVideoSlide = null;
let tripData = {}, currentTrip = {}, tourTypes = {}, selectedTripType = "";
let iti, mobileIti;
const refNumber = generateReference();
let currentUserUid = '', tripOwnerId = '';
const MAX_PER_TYPE = 10, MAX_INFANTS_PER_ADULT = 2, MAX_TOTAL_INFANTS = 10;
let currentStep = 0, mobileCurrentStep = 0;
let currentCurrency = 'EGP', exchangeRates = { EGP: 1 }, ratesLoaded = false;
let tripReviews = [], currentUserReview = null;

function getTripIdFromURL() { return new URLSearchParams(window.location.search).get('trip-id'); }
const tripPName = getTripIdFromURL();

// ==========================================================================
// CURRENCY
// ==========================================================================
function getCurrentCurrencyFromHeader() {
  if (window.SharmCurrency?.get) return window.SharmCurrency.get();
  return localStorage.getItem('preferredCurrency') || 'EGP';
}
function getExchangeRatesFromHeader() {
  return window.SharmCurrency?.rates || null;
}
function formatPrice(priceEGP) {
  if (!ratesLoaded || currentCurrency === 'EGP') return parseFloat(priceEGP).toFixed(2) + ' EGP';
  const c = priceEGP * exchangeRates[currentCurrency];
  if (currentCurrency === 'USD') return '$' + parseFloat(c).toFixed(2);
  if (currentCurrency === 'EUR') return '€' + parseFloat(c).toFixed(2);
  if (currentCurrency === 'GBP') return '£' + parseFloat(c).toFixed(2);
  return parseFloat(priceEGP).toFixed(2) + ' EGP';
}

// ==========================================================================
// UTILITY
// ==========================================================================
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = ''; for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'DS-' + r;
}
function sanitizeInput(input) { return input ? input.toString().replace(/[<>]/g, "").trim() : ''; }
function isMobile() { return window.innerWidth <= 768; }

function showError(id, msg) {
  const el = document.getElementById(id), err = document.getElementById(id + 'Error');
  if (el) el.style.borderColor = '#ef4444';
  if (err) { err.textContent = msg; err.classList.remove('hidden'); }
}
function clearError(id) {
  const el = document.getElementById(id), err = document.getElementById(id + 'Error');
  if (el) el.style.borderColor = '';
  if (err) err.classList.add('hidden');
}

function showToast(msg, type = 'success') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1f35;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ${type==='success'?'#22c55e':'#ef4444'};white-space:nowrap;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 4000);
}

function showSpinner() { document.getElementById('spinner')?.classList.remove('hidden'); if (document.getElementById('submitBtn')) document.getElementById('submitBtn').disabled = true; }
function hideSpinner() { document.getElementById('spinner')?.classList.add('hidden'); if (document.getElementById('submitBtn')) document.getElementById('submitBtn').disabled = false; }

// ==========================================================================
// PRICE CALCULATION
// ==========================================================================
function getAdults() { return parseInt(document.getElementById('adults').value) || 0; }
function getChildren() { return parseInt(document.getElementById('childrenUnder12').value) || 0; }
function getInfants() { return parseInt(document.getElementById('infants').value) || 0; }

function calculateBaseTotal() {
  if (!currentTrip.basePrice) return 0;
  const ap = parseFloat(currentTrip.basePrice);
  const cp = parseFloat(currentTrip.cprice) || ap * 0.5;
  return parseFloat(((getAdults() * ap) + (getChildren() * cp)).toFixed(2));
}
function calculateExtraServicesTotal() {
  if (selectedTripType && tourTypes[selectedTripType]) {
    return parseFloat(((getAdults() + getChildren()) * parseFloat(tourTypes[selectedTripType])).toFixed(2));
  }
  return 0;
}
function calculateNetTotal() { return parseFloat((calculateBaseTotal() + calculateExtraServicesTotal()).toFixed(2)); }
function calculateTaxesOnly() {
  const n = calculateNetTotal();
  return parseFloat(((n * 0.03) + (n * 0.03 * 0.14) + 3).toFixed(2));
}
function calculateTotalWithTaxes() { return parseFloat((calculateNetTotal() + calculateTaxesOnly()).toFixed(2)); }

function updatePriceDisplay() {
  const el = document.getElementById('tourPrice');
  if (el && currentTrip.basePrice) el.innerHTML = formatPrice(calculateNetTotal());
}

// ==========================================================================
// DESKTOP NAVIGATION
// ==========================================================================
function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = ((currentStep + 1) * 25) + '%';
  document.querySelectorAll('#desktopBookingCard .progress-steps .step').forEach((s, i) => s.classList.toggle('active', i === currentStep));
}
function nextStep() {
  if (!validateCurrentStep()) return;
  document.getElementById('step' + (currentStep + 1)).classList.remove('active');
  currentStep++;
  document.getElementById('step' + (currentStep + 1))?.classList.add('active');
  updateProgressBar(); updateSummary();
}
function prevStep() {
  document.getElementById('step' + (currentStep + 1)).classList.remove('active');
  currentStep--;
  document.getElementById('step' + (currentStep + 1))?.classList.add('active');
  updateProgressBar();
}
function validateCurrentStep() {
  let v = true;
  if (currentStep === 0) {
    if (!document.getElementById('username')?.value.trim()) { showError('username', 'Required'); v = false; } else clearError('username');
    const em = document.getElementById('customerEmail')?.value.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showError('customerEmail', 'Invalid email'); v = false; } else clearError('customerEmail');
    if (iti && (!iti.getNumber() || !iti.isValidNumber())) { showError('phone', 'Invalid phone'); v = false; } else clearError('phone');
  } else if (currentStep === 1) {
    if (!document.getElementById('tripDate')?.value.trim()) { showError('tripDate', 'Required'); v = false; } else clearError('tripDate');
    if (!document.getElementById('hotelName')?.value.trim()) { showError('hotelName', 'Required'); v = false; } else clearError('hotelName');
    if (!document.getElementById('roomNumber')?.value.trim()) { showError('roomNumber', 'Required'); v = false; } else clearError('roomNumber');
  }
  return v;
}

function updateSummary() {
  const a = getAdults(), c = getChildren(), inf = getInfants();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('summaryDate', document.getElementById('tripDate')?.value || 'Not specified');
  set('summaryHotel', sanitizeInput(document.getElementById('hotelName')?.value) || '-');
  set('summaryRoom', sanitizeInput(document.getElementById('roomNumber')?.value) || '-');
  set('summaryRef', refNumber);
  set('summaryTour', currentTrip.name || 'N/A');
  set('summaryAdults', a + ' Adult' + (a !== 1 ? 's' : ''));
  set('summaryChildrenUnder12', c + ' Child' + (c !== 1 ? 'ren' : ''));
  set('summaryInfants', inf + ' Infant' + (inf !== 1 ? 's' : ''));
  set('summaryService', selectedTripType || 'None');
  
  const td = document.getElementById('totalPriceDisplay');
  if (td && currentTrip.basePrice) {
    const net = calculateNetTotal(), tax = calculateTaxesOnly(), tot = calculateTotalWithTaxes();
    td.innerHTML = `<div style="font-weight:bold;font-size:20px;">${formatPrice(net)}</div><div style="font-size:11px;color:#94a3b8;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:4px;margin-top:4px;"><span>+ Taxes:</span><span>${formatPrice(tax)}</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;"><span>Total at Payment:</span><span>${formatPrice(tot)}</span></div></div>`;
  }
}

// ==========================================================================
// MOBILE BOOKING - Below Reviews
// ==========================================================================
function showMobileBooking() {
  const section = document.getElementById('mobileBookingSection');
  if (section) {
    section.style.display = 'block';
    setTimeout(() => { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  }
}

function mobileNextStep() {
  if (!validateMobileStep()) return;
  document.getElementById('mobileStep' + (mobileCurrentStep + 1)).classList.remove('active');
  mobileCurrentStep++;
  document.getElementById('mobileStep' + (mobileCurrentStep + 1))?.classList.add('active');
  updateMobileProgressBar(); updateMobileSummary();
  document.getElementById('mobileBookingSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function mobilePrevStep() {
  document.getElementById('mobileStep' + (mobileCurrentStep + 1)).classList.remove('active');
  mobileCurrentStep--;
  document.getElementById('mobileStep' + (mobileCurrentStep + 1))?.classList.add('active');
  updateMobileProgressBar();
  document.getElementById('mobileBookingSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function updateMobileProgressBar() {
  const bar = document.getElementById('mobileProgressBar');
  if (bar) bar.style.width = ((mobileCurrentStep + 1) * 25) + '%';
  document.querySelectorAll('#mobileBookingCard .progress-steps .step').forEach((s, i) => s.classList.toggle('active', i === mobileCurrentStep));
}
function validateMobileStep() {
  let v = true;
  if (mobileCurrentStep === 0) {
    if (!document.getElementById('mobileUsername')?.value.trim()) v = false;
    const em = document.getElementById('mobileCustomerEmail')?.value.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) v = false;
  } else if (mobileCurrentStep === 1) {
    if (!document.getElementById('mobileTripDate')?.value.trim()) v = false;
    if (!document.getElementById('mobileHotelName')?.value.trim()) v = false;
    if (!document.getElementById('mobileRoomNumber')?.value.trim()) v = false;
  }
  return v;
}

function getMAdults() { return parseInt(document.getElementById('mobileAdults').value) || 0; }
function getMChildren() { return parseInt(document.getElementById('mobileChildrenUnder12').value) || 0; }
function getMInfants() { return parseInt(document.getElementById('mobileInfants').value) || 0; }

function calculateMobileNetTotal() {
  if (!currentTrip.basePrice) return 0;
  const a = getMAdults(), c = getMChildren();
  const ap = parseFloat(currentTrip.basePrice), cp = parseFloat(currentTrip.cprice) || ap * 0.5;
  let total = (a * ap) + (c * cp);
  const sv = document.getElementById('mobileTripType')?.value;
  if (sv && tourTypes[sv]) total += (a + c) * parseFloat(tourTypes[sv]);
  return parseFloat(total.toFixed(2));
}
function calculateMobileTaxes() {
  const n = calculateMobileNetTotal();
  return parseFloat(((n * 0.03) + (n * 0.03 * 0.14) + 3).toFixed(2));
}

function updateMobileSummary() {
  const a = getMAdults(), c = getMChildren(), inf = getMInfants();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('mobileSummaryDate', document.getElementById('mobileTripDate')?.value || 'Not specified');
  set('mobileSummaryHotel', document.getElementById('mobileHotelName')?.value || '-');
  set('mobileSummaryRoom', document.getElementById('mobileRoomNumber')?.value || '-');
  set('mobileSummaryRef', refNumber);
  set('mobileSummaryTour', currentTrip.name || 'N/A');
  set('mobileSummaryAdults', a + ' Adult' + (a !== 1 ? 's' : ''));
  set('mobileSummaryChildrenUnder12', c + ' Child' + (c !== 1 ? 'ren' : ''));
  set('mobileSummaryInfants', inf + ' Infant' + (inf !== 1 ? 's' : ''));
  set('mobileSummaryService', document.getElementById('mobileTripType')?.value || 'None');
  
  const td = document.getElementById('mobileTotalPriceDisplay');
  if (td && currentTrip.basePrice) {
    const net = calculateMobileNetTotal(), tax = calculateMobileTaxes(), tot = net + tax;
    td.innerHTML = `<div style="font-weight:bold;font-size:20px;">${formatPrice(net)}</div><div style="font-size:11px;color:#94a3b8;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #334155;padding-top:4px;margin-top:4px;"><span>+ Taxes:</span><span>${formatPrice(tax)}</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;"><span>Total at Payment:</span><span>${formatPrice(tot)}</span></div></div>`;
  }
}

function mobileSubmitForm() {
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
  const d = document.getElementById('mobileTripDate');
  if (d) flatpickr(d, { minDate: new Date().fp_incr(1), dateFormat: "Y-m-d", disableMobile: true, onChange: updateMobileSummary });
  
  const s = document.getElementById('mobileTripType');
  if (s && tourTypes) {
    s.innerHTML = '<option value="">Select extra services...</option>';
    Object.keys(tourTypes).forEach(k => {
      const o = document.createElement('option'); o.value = k;
      o.textContent = k + ' - ' + formatPrice(tourTypes[k]) + ' (per person)';
      s.appendChild(o);
    });
    s.onclick = function(e) { e.preventDefault(); openServicesPopup(); };
    s.onmousedown = function(e) { e.preventDefault(); };
  }
  
  setupMStepper('mobileAdultsPlus', 'mobileAdultsMinus', 'mobileAdults', 1, MAX_PER_TYPE);
  setupMStepper('mobileChildrenPlus', 'mobileChildrenMinus', 'mobileChildrenUnder12', 0, MAX_PER_TYPE);
  setupMStepper('mobileInfantsPlus', 'mobileInfantsMinus', 'mobileInfants', 0, MAX_TOTAL_INFANTS);
  
  const mp = document.getElementById('mobilePhone');
  if (mp && window.intlTelInput) {
    mobileIti = window.intlTelInput(mp, {
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
      preferredCountries: ['eg','gb','de','ru','tr','it'], separateDialCode: true, initialCountry: "eg"
    });
  }
}
function setupMStepper(plusId, minusId, inputId, min, max) {
  const p = document.getElementById(plusId), m = document.getElementById(minusId), inp = document.getElementById(inputId);
  if (p && inp) p.addEventListener('click', (e) => { e.preventDefault(); const v = parseInt(inp.value); if (v < max) { inp.value = v + 1; updateMobileSummary(); } });
  if (m && inp) m.addEventListener('click', (e) => { e.preventDefault(); const v = parseInt(inp.value); if (v > min) { inp.value = v - 1; updateMobileSummary(); } });
}

// ==========================================================================
// FORM SUBMISSION
// ==========================================================================
async function submitForm() {
  showSpinner();
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in');

    const netTotal = calculateNetTotal(), taxes = calculateTaxesOnly(), totalWithTaxes = calculateTotalWithTaxes();
    const a = getAdults(), c = getChildren(), inf = getInfants();
    const tripDate = document.getElementById('tripDate').value;
    const hotelName = sanitizeInput(document.getElementById('hotelName').value);
    const roomNumber = sanitizeInput(document.getElementById('roomNumber').value);
    const username = sanitizeInput(document.getElementById('username').value);
    const email = sanitizeInput(document.getElementById('customerEmail').value);
    const phone = iti?.getNumber() || '';

    const bookingData = {
      refNumber, username, email, phone, tour: currentTrip.name, tripId: tripPName, tripDate,
      adults: a, childrenUnder12: c, infants: inf, hotelName, roomNumber,
      baseTotal: parseFloat(calculateBaseTotal().toFixed(2)),
      extraServicesTotal: parseFloat(calculateExtraServicesTotal().toFixed(2)),
      netTotal: parseFloat(netTotal.toFixed(2)), total: parseFloat(totalWithTaxes.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)), extraServices: selectedTripType || 'None',
      specialRequests: 'none', status: 'pending', resStatus: 'new',
      isPaid: false, paymentStatus: 'unpaid', uid: user.uid, owner: tripOwnerId || user.uid,
      pickuptime: '', createdAt: Date.now(), updatedAt: Date.now()
    };

    const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(totalWithTaxes.toFixed(2)), currency: 'EGP' })
    });
    if (!resp.ok) throw new Error('Payment failed');
    const data = await resp.json();
    
    const kashierUrl = `https://payments.kashier.io/?${new URLSearchParams({
      merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(totalWithTaxes.toFixed(2)),
      currency: 'EGP', hash: data.hash, mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false', redirectMethod: 'get'
    }).toString()}`;
    
    await db.ref('trip-bookings/' + refNumber).set({ ...bookingData, paymenturl: kashierUrl });

    if (tripOwnerId) {
      await db.ref(`notifications/${tripOwnerId}/${Date.now()}`).set({
        title: 'New Booking: ' + currentTrip.name,
        message: `${username} booked - ${a} adults, ${c} children, ${inf} infants`,
        totalAmount: parseFloat(netTotal.toFixed(2)), bookingId: refNumber, tripId: tripPName,
        tripName: currentTrip.name, userName: username, userEmail: email, phone,
        adults: a, children: c, infants: inf, tripDate, read: false, timestamp: Date.now(), type: 'new_booking'
      });
    }

    sessionStorage.setItem("username", username);
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("phone", phone);
    showToast('Redirecting to payment...');
    setTimeout(() => { window.location.href = kashierUrl; }, 1000);
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
    hideSpinner();
  }
}

// ==========================================================================
// TRIP DATA
// ==========================================================================
async function fetchAllTripData() {
  try {
    showSpinner();
    const snap = await db.ref('trips').once('value');
    const data = snap.val();
    if (!data) { showToast("No trips available.", 'error'); return {}; }
    tripData = data;
    if (tripPName && data[tripPName]) {
      currentTrip = data[tripPName];
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
    return data;
  } catch (e) { showToast("Failed to load trip data.", 'error'); throw e; }
  finally { hideSpinner(); }
}

function displayTripInfo(t) {
  if (document.getElementById('tourTitle')) document.getElementById('tourTitle').textContent = t.name || '';
  if (document.getElementById('tripName')) document.getElementById('tripName').value = t.name || '';
  if (document.getElementById('mobileTripName')) document.getElementById('mobileTripName').value = t.name || '';
  if (document.getElementById('tourDuration')) document.getElementById('tourDuration').textContent = t.duration || '';
}

function populateTripTypeDropdown(types) {
  const s = document.getElementById('tripType');
  if (!s) return;
  s.innerHTML = '<option value="">Select extra services...</option>';
  if (types) Object.keys(types).forEach(k => {
    const o = document.createElement('option'); o.value = k;
    o.textContent = k + ' - ' + formatPrice(types[k]) + ' (per person)';
    s.appendChild(o);
  });
  s.value = selectedTripType || '';
  s.onclick = function(e) { e.preventDefault(); openServicesPopup(); };
  s.onmousedown = function(e) { e.preventDefault(); };
}

function loadMediaContent(media) {
  if (!media) return;
  const wrap = document.querySelector('.swiper-wrapper'), thumbs = document.getElementById('thumbnailsOverlay');
  if (wrap) wrap.innerHTML = '';
  if (thumbs) thumbs.innerHTML = '';
  
  const addThumb = (src, idx) => {
    if (!thumbs) return;
    const img = document.createElement('img'); img.src = src; img.dataset.index = idx;
    img.addEventListener('click', () => { if (swiper) swiper.slideTo(idx); updateActiveThumbnail(idx); });
    thumbs.appendChild(img);
  };
  
  if (media.images) media.images.forEach((img, i) => {
    const s = document.createElement('div'); s.className = 'swiper-slide';
    s.innerHTML = `<img src="${img}" alt="">`; wrap.appendChild(s); addThumb(img, i);
  });
  if (media.videos) media.videos.forEach((v, i) => {
    const idx = (media.images?.length || 0) + i;
    const s = document.createElement('div'); s.className = 'swiper-slide swiper-slide-video';
    s.dataset.videoUrl = v.videoUrl; s.dataset.thumbnail = v.thumbnail;
    s.innerHTML = `<img src="${v.thumbnail}" alt=""><div class="play-button"><i class="fas fa-play"></i></div>`;
    wrap.appendChild(s); addThumb(v.thumbnail, idx);
  });
  
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1, loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: { slideChange: function() { updateActiveThumbnail(this.realIndex); stopCurrentVideo(); } }
    });
    document.querySelector('.swiper')?.addEventListener('click', function(e) {
      const pb = e.target.closest('.play-button');
      if (pb) { const sl = pb.closest('.swiper-slide'); if (sl?.classList.contains('swiper-slide-video')) playVideo(sl); }
    });
  } else swiper.update();
  updateActiveThumbnail(0);
}

function playVideo(slide) {
  stopCurrentVideo();
  const url = slide.dataset.videoUrl;
  const m = url.match(/(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]{11})/);
  if (m) {
    slide.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1" frameborder="0" allowfullscreen></iframe>`;
    currentVideoSlide = slide;
  }
}
function stopCurrentVideo() {
  if (currentVideoSlide) {
    currentVideoSlide.innerHTML = `<img src="${currentVideoSlide.dataset.thumbnail}" alt=""><div class="play-button"><i class="fas fa-play"></i></div>`;
    currentVideoSlide = null;
  }
}
function updateActiveThumbnail(idx) {
  document.querySelectorAll('.thumbnails-overlay img').forEach(t => t.classList.toggle('active', parseInt(t.dataset.index) === idx));
}

function loadIncludedNotIncluded(d) {
  ['includedItems','notIncludedItems'].forEach(id => {
    const c = document.getElementById(id);
    if (c && d[id === 'includedItems' ? 'included' : 'notIncluded']) {
      c.innerHTML = '';
      const icon = id === 'includedItems' ? 'fa-check' : 'fa-times', color = id === 'includedItems' ? '#22c55e' : '#ef4444';
      d[id === 'includedItems' ? 'included' : 'notIncluded'].forEach(item => {
        const el = document.createElement('div'); el.className = 'included-item';
        el.innerHTML = `<i class="fas ${icon}" style="color:${color};"></i><span>${item}</span>`;
        c.appendChild(el);
      });
    }
  });
}
function loadTimeline(d) {
  const c = document.getElementById('timelineContainer');
  if (c && d) c.innerHTML = d.map(i => `<div class="timeline-item"><div class="timeline-time">${i.time}</div><div class="timeline-content"><h4>${i.title}</h4><p>${i.description}</p></div></div>`).join('');
}
function loadWhatToBring(d) {
  const l = document.getElementById('whatToBringList');
  if (l && d) l.innerHTML = d.map(i => `<li><i class="fas fa-check"></i> ${i}</li>`).join('');
}

// ==========================================================================
// NUMBER CONTROLS
// ==========================================================================
function initNumberControls() {
  setupStepper('adultsPlus','adultsMinus','adults',1,MAX_PER_TYPE,true);
  setupStepper('childrenUnder12Plus','childrenUnder12Minus','childrenUnder12',0,MAX_PER_TYPE,false);
  setupStepper('infantsPlus','infantsMinus','infants',0,MAX_TOTAL_INFANTS,false);
}
function setupStepper(pId, mId, iId, min, max, updInf) {
  const p = document.getElementById(pId), m = document.getElementById(mId), inp = document.getElementById(iId);
  if (p && inp) p.addEventListener('click', (e) => { e.preventDefault(); const v = parseInt(inp.value); if (v < max) { inp.value = v + 1; if (updInf) updateInfantsMax(); updateSummary(); } });
  if (m && inp) m.addEventListener('click', (e) => { e.preventDefault(); const v = parseInt(inp.value); if (v > min) { inp.value = v - 1; if (updInf) updateInfantsMax(); updateSummary(); } });
}
function updateInfantsMax() {
  const a = document.getElementById('adults'), inf = document.getElementById('infants');
  if (!a || !inf) return;
  const max = Math.min((parseInt(a.value) || 0) * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  if (parseInt(inf.value) > max) inf.value = max;
  inf.max = max;
}

// ==========================================================================
// FLATPICKR
// ==========================================================================
function initFlatpickr() {
  const d = document.getElementById('tripDate');
  if (d) flatpickr(d, { minDate: new Date().fp_incr(1), dateFormat: "Y-m-d", disableMobile: true, onChange: updateSummary });
}

// ==========================================================================
// EXTRA SERVICES POPUP - FIXED
// ==========================================================================
function openServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  const content = document.getElementById('servicesPopupContent');
  
  if (!popup || !content) return;
  
  content.innerHTML = '';
  
  // No extra services option
  const noServiceDiv = document.createElement('div');
  noServiceDiv.className = 'service-option' + (selectedTripType === '' ? ' selected' : '');
  noServiceDiv.innerHTML = `
    <div class="service-option-info">
      <div class="service-option-name">No extra services</div>
      <div class="service-option-price">Free</div>
    </div>
    <div class="service-option-check"></div>
  `;
  noServiceDiv.onclick = function() {
    selectedTripType = '';
    // Update both selects
    const desktopSelect = document.getElementById('tripType');
    const mobileSelect = document.getElementById('mobileTripType');
    if (desktopSelect) desktopSelect.value = '';
    if (mobileSelect) mobileSelect.value = '';
    renderServiceOptions();
  };
  content.appendChild(noServiceDiv);
  
  // Tour type options
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(function(key) {
      const priceEGP = tourTypes[key];
      const formattedPrice = formatPrice(priceEGP);
      
      const serviceDiv = document.createElement('div');
      serviceDiv.className = 'service-option' + (selectedTripType === key ? ' selected' : '');
      serviceDiv.innerHTML = `
        <div class="service-option-info">
          <div class="service-option-name">${key}</div>
          <div class="service-option-price">${formattedPrice} (per person)</div>
        </div>
        <div class="service-option-check"></div>
      `;
      serviceDiv.onclick = function() {
        selectedTripType = key;
        // Update both selects
        const desktopSelect = document.getElementById('tripType');
        const mobileSelect = document.getElementById('mobileTripType');
        if (desktopSelect) desktopSelect.value = key;
        if (mobileSelect) mobileSelect.value = key;
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
  options.forEach(function(opt) {
    const nameEl = opt.querySelector('.service-option-name');
    if (!nameEl) return;
    
    const name = nameEl.textContent;
    if (name === 'No extra services' && selectedTripType === '') {
      opt.classList.add('selected');
    } else if (name === selectedTripType) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

function confirmServiceSelection() {
  // Update desktop select
  const desktopSelect = document.getElementById('tripType');
  if (desktopSelect) {
    desktopSelect.value = selectedTripType || '';
  }
  
  // Update mobile select
  const mobileSelect = document.getElementById('mobileTripType');
  if (mobileSelect) {
    mobileSelect.value = selectedTripType || '';
  }
  
  // Close popup
  closeServicesPopup();
  
  // Update summaries
  updateSummary();
  if (isMobile()) {
    updateMobileSummary();
  }
}

function closeServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  if (popup) {
    popup.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// REVIEWS
// ==========================================================================
function getUserPhotoUrl(uid) { return uid ? `/app/photos/${uid}.jpg` : null; }

async function loadReviews() {
  if (!tripPName) return;
  try {
    const snap = await db.ref('trip-reviews/' + tripPName).once('value');
    const d = snap.val();
    if (d?.reviews) {
      tripReviews = Object.entries(d.reviews).map(([id, r]) => ({ id, ...r })).filter(r => r.approved).sort((a, b) => new Date(b.date) - new Date(a.date));
      updateStarsSummary(d.average || 0, d.count || 0);
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

function updateStarsSummary(avg, cnt) {
  const c = document.getElementById('avgStars');
  if (c) {
    c.innerHTML = '';
    for (let i = 0; i < Math.floor(avg); i++) c.innerHTML += '<i class="fas fa-star"></i>';
    if (avg % 1 >= 0.5) c.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = c.children.length; i < 5; i++) c.innerHTML += '<i class="far fa-star"></i>';
  }
  const s = document.getElementById('reviewsCountText');
  if (s) s.textContent = `(${cnt} ${cnt === 1 ? 'review' : 'reviews'})`;
}

function renderReviews() {
  const c = document.getElementById('reviewsListContainer');
  if (!c) return;
  if (!tripReviews.length) {
    c.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p><span>Be the first to review this trip</span></div>';
    return;
  }
  c.innerHTML = tripReviews.map(r => {
    const d = new Date(r.date);
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const init = (r.userName||'U').charAt(0).toUpperCase();
    return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#FF6B35,#FFA630);flex-shrink:0;">
            <img src="${getUserPhotoUrl(r.userId)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy">
            <div class="photo-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;">${init}</div>
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

function createReviewModal() {
  document.getElementById('reviewModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', 
    `<div id="reviewModal" class="hidden" style="position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);" id="reviewModalOverlay"></div>
      <div style="position:relative;background:#1a1f35;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:90%;max-width:460px;box-shadow:0 20px 50px rgba(0,0,0,0.6);z-index:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <h3 style="font-size:18px;font-weight:700;color:#fff;margin:0;"><i class="fas fa-star" style="color:#f59e0b;"></i> <span id="modalTitle">Write a Review</span></h3>
          <button id="closeModalBtn" style="background:none;border:none;color:#94a3b8;font-size:28px;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;line-height:1;">&times;</button>
        </div>
        <div style="padding:20px;">
          <div style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;color:#94a3b8;"><i class="fas fa-ticket-alt" style="color:#f59e0b;"></i> Voucher Number</label><input id="voucherInput" placeholder="DS_XXXXXXXXXX" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;box-sizing:border-box;margin-top:6px;"></div>
          <div style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;color:#94a3b8;">Rating</label><div id="starSelector" style="display:flex;gap:6px;font-size:30px;margin-top:6px;">${Array(5).fill().map((_,i)=>`<i class="far fa-star" data-rating="${i+1}" style="color:#64748b;cursor:pointer;"></i>`).join('')}</div><input id="ratingValue" type="hidden" value="0"></div>
          <div style="margin-bottom:20px;"><label style="font-size:12px;font-weight:600;color:#94a3b8;">Review</label><textarea id="commentInput" rows="4" placeholder="Share your experience..." style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;resize:none;box-sizing:border-box;margin-top:6px;"></textarea><div style="text-align:right;font-size:10px;color:#64748b;margin-top:4px;"><span id="charCount">0</span>/500</div></div>
          <div style="display:flex;gap:10px;"><button id="cancelReviewBtn" style="flex:1;padding:12px;border-radius:30px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Cancel</button><button id="submitReviewBtn" style="flex:1;padding:12px;border-radius:30px;border:none;background:linear-gradient(135deg,#FF6B35,#FFA630);color:#fff;font-weight:600;font-size:13px;cursor:pointer;"><i class="fas fa-paper-plane"></i> Submit</button></div>
        </div>
      </div>
    </div>`);
}

async function verifyVoucher(v) {
  if (!auth.currentUser) { showToast('Please login','error'); return false; }
  try {
    const snap = await db.ref('trip-bookings/'+v).once('value');
    const b = snap.val();
    if (!b) { showToast('Invalid voucher','error'); return false; }
    if (b.uid !== auth.currentUser.uid) { showToast('Not your voucher','error'); return false; }
    if ((b.tripId||b.Id||'') !== tripPName) { showToast('Wrong trip','error'); return false; }
    return true;
  } catch(e) { showToast('Error verifying','error'); return false; }
}

async function submitReviewHandler() {
  const voucher = document.getElementById('voucherInput')?.value?.trim()?.toUpperCase();
  if (!voucher) { showToast('Enter voucher','error'); return; }
  const rating = parseInt(document.getElementById('ratingValue')?.value||'0');
  if (!rating) { showToast('Select rating','error'); return; }
  const comment = document.getElementById('commentInput')?.value?.trim();
  if (!comment || comment.length < 5) { showToast('Min 5 characters','error'); return; }
  if (!await verifyVoucher(voucher)) return;
  
  const btn = document.getElementById('submitReviewBtn'), orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
  
  try {
    const user = auth.currentUser;
    let userName = 'Traveler';
    try { const s = await db.ref('egy_user/'+user.uid).once('value'); const d = s.val(); if (d) userName = d.username || user.email?.split('@')[0] || 'Traveler'; } catch(e) {}
    
    const rd = { userId: user.uid, userName, rating, comment, date: new Date().toISOString(), approved: true, voucher };
    const ref = db.ref('trip-reviews/'+tripPName);
    const snap = await ref.once('value');
    const cur = snap.val() || { reviews:{}, count:0, average:0 };
    let cnt = cur.count||0, tot = (cur.average||0)*cnt;
    
    if (currentUserReview && cur.reviews[currentUserReview.id]) {
      tot = tot - (cur.reviews[currentUserReview.id].rating||0) + rating;
      await ref.child('reviews/'+currentUserReview.id).update(rd);
    } else {
      await ref.child('reviews/'+Date.now()).set(rd);
      cnt++; tot += rating;
    }
    await ref.update({ count: cnt, average: parseFloat((tot/cnt).toFixed(1)) });
    closeReviewModal(); resetReviewForm(); await loadReviews();
    showToast(currentUserReview?'Updated!':'Thank you!','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
  finally { btn.innerHTML = orig; btn.disabled = false; }
}

function resetReviewForm() {
  ['voucherInput','commentInput'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  document.getElementById('ratingValue').value = '0';
  document.getElementById('charCount').textContent = '0';
  document.querySelectorAll('#starSelector i').forEach(s => { s.className = 'far fa-star'; s.style.color = '#64748b'; });
}
function closeReviewModal() {
  const m = document.getElementById('reviewModal');
  if (m) { m.style.display = 'none'; m.classList.add('hidden'); }
  document.body.style.overflow = '';
}
function openReviewModal() {
  if (!auth.currentUser) { showToast('Please login','error'); return; }
  if (!document.getElementById('reviewModal')) { createReviewModal(); setupReviewModalEvents(); }
  const m = document.getElementById('reviewModal');
  if (m) {
    m.style.display = 'flex'; m.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    if (currentUserReview) {
      document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Your Review';
      document.getElementById('voucherInput').value = currentUserReview.voucher||'';
      document.getElementById('commentInput').value = currentUserReview.comment||'';
      document.getElementById('ratingValue').value = currentUserReview.rating||0;
      document.getElementById('charCount').textContent = (currentUserReview.comment||'').length;
      document.querySelectorAll('#starSelector i').forEach((s,i) => { if (i<(currentUserReview.rating||0)) { s.className='fas fa-star'; s.style.color='#f59e0b'; } });
    } else { document.getElementById('modalTitle').innerHTML = '<i class="fas fa-star"></i> Write a Review'; resetReviewForm(); }
  }
}
function setupReviewModalEvents() {
  document.querySelectorAll('#starSelector i').forEach(s => {
    s.addEventListener('click', () => {
      const r = parseInt(s.dataset.rating);
      document.getElementById('ratingValue').value = r;
      document.querySelectorAll('#starSelector i').forEach((st,i) => { if (i<r) { st.className='fas fa-star'; st.style.color='#f59e0b'; } else { st.className='far fa-star'; st.style.color='#64748b'; } });
    });
  });
  const ci = document.getElementById('commentInput'), cc = document.getElementById('charCount');
  if (ci&&cc) ci.addEventListener('input', () => { let l = ci.value.length; if (l>500) { ci.value = ci.value.substring(0,500); l=500; } cc.textContent = l; });
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
  const u = auth.currentUser;
  if (!u) return;
  try {
    const s = await db.ref('egy_user/'+u.uid).once('value');
    const d = s.val();
    if (d) {
      ['username','mobileUsername'].forEach(id => { const e = document.getElementById(id); if (e) e.value = d.username || ''; });
      ['customerEmail','mobileCustomerEmail'].forEach(id => { const e = document.getElementById(id); if (e) e.value = d.email || ''; });
      if (d.phone && iti) { document.getElementById('phone').value = d.phone; iti.setNumber(d.phone); }
      if (d.phone && mobileIti) { document.getElementById('mobilePhone').value = d.phone; mobileIti.setNumber(d.phone); }
    }
  } catch(e) {}
}
function initCurrencyFromHeader() {
  currentCurrency = getCurrentCurrencyFromHeader();
  const r = getExchangeRatesFromHeader();
  if (r) { exchangeRates = r; ratesLoaded = true; }
  window.addEventListener('currencyChanged', (e) => {
    if (e.detail?.currency) {
      currentCurrency = e.detail.currency;
      if (e.detail.rates) { exchangeRates = e.detail.rates; ratesLoaded = true; }
      updatePriceDisplay(); updateSummary(); if (isMobile()) updateMobileSummary();
    }
  });
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
window.onload = async function () {
  if (!tripPName) { showToast("No trip specified.", 'error'); return; }
  initCurrencyFromHeader();
  
  const pi = document.querySelector("#phone");
  if (pi) try { iti = window.intlTelInput(pi, { utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js", preferredCountries: ['eg','gb','de','ru','tr','it'], separateDialCode: true, initialCountry: "eg" }); } catch(e) {}
  
  initNumberControls();
  initFlatpickr();
  if (isMobile()) initMobileBooking();
  
  document.getElementById('submitBtn')?.addEventListener('click', submitForm);
  document.getElementById('mobileBookNowBtn')?.addEventListener('click', showMobileBooking);
  
  document.getElementById('cancelServicesBtn')?.addEventListener('click', closeServicesPopup);
  document.getElementById('confirmServicesBtn')?.addEventListener('click', confirmServiceSelection);
  document.getElementById('closeServicesPopup')?.addEventListener('click', closeServicesPopup);
  document.getElementById('extraServicesPopup')?.addEventListener('click', function(e) { if (e.target === this || e.target.classList.contains('services-popup-overlay')) closeServicesPopup(); });
  
  auth.onAuthStateChanged((u) => { if (u) { currentUserUid = u.uid; populateForm(); } else currentUserUid = 'anonymous'; });
  
  await fetchAllTripData();
  updateSummary();
  if (isMobile()) updateMobileSummary();
  
  setTimeout(() => { if (tripPName) { createReviewModal(); setupReviewModalEvents(); loadReviews(); } }, 2000);
  setTimeout(() => { updatePriceDisplay(); updateSummary(); if (isMobile()) updateMobileSummary(); }, 1500);
};

console.log('✅ Discover Sharm - Booking System v7.0 Ready');
