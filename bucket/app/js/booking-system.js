// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// Clean Production Version
// Inline validation errors + Auto-hiding toasts
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // STATE
  // ==========================================================================
  let iti = null;
  let refNumber = '';
  let selectedTripType = '';
  let currentStep = 0;
  let toastTimer = null;

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  function $(id) { return document.getElementById(id); }
  
  function toStr(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }

  function clean(v) {
    return toStr(v).replace(/[<>]/g, '');
  }

  function generateRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = 'DS-';
    for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    return r;
  }

  // Toast - guaranteed to auto-hide
  function toast(msg, type) {
    // Clear any existing timer
    if (toastTimer) clearTimeout(toastTimer);
    
    // Remove existing toast
    const old = document.querySelector('.bs-toast');
    if (old) old.remove();
    
    const t = document.createElement('div');
    t.className = 'bs-toast';
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#22c55e') + ';white-space:nowrap;opacity:1;transition:opacity 0.3s;';
    t.textContent = (type === 'error' ? '❌ ' : '✅ ') + msg;
    document.body.appendChild(t);
    
    // Auto remove after 3 seconds
    toastTimer = setTimeout(function() {
      t.style.opacity = '0';
      setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
    }, 3000);
  }

  // Inline error under input
  function showFieldError(inputId, msg) {
    // Remove existing error
    const existing = document.querySelector('.field-error[data-field="' + inputId + '"]');
    if (existing) existing.remove();
    
    const input = $(inputId);
    if (!input) return;
    
    const error = document.createElement('div');
    error.className = 'field-error';
    error.setAttribute('data-field', inputId);
    error.style.cssText = 'color:#ef4444;font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;animation:fadeIn 0.2s ease;';
    error.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg;
    
    input.style.borderColor = '#ef4444';
    input.parentNode.appendChild(error);
    
    // Remove error when user types
    input.addEventListener('input', function() {
      input.style.borderColor = '';
      if (error.parentNode) error.remove();
    }, { once: true });
  }

  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(e) { e.remove(); });
    document.querySelectorAll('.input-field').forEach(function(e) { e.style.borderColor = ''; });
  }

  // ==========================================================================
  // TRIP DATA
  // ==========================================================================
  function getTrip() {
    try { return (window.tripModule?.getCurrentTrip?.()) || {}; } catch(e) { return {}; }
  }
  
  function getTourTypes() {
    try { return (window.tripModule?.getTourTypes?.()) || {}; } catch(e) { return {}; }
  }
  
  function getOwnerId() {
    try { return toStr(window.tripModule?.getTripOwnerId?.()); } catch(e) { return ''; }
  }
  
  function getTripId() {
    try { return toStr(window.tripModule?.getTripPName?.()); } catch(e) { return ''; }
  }
  
  function fmtPrice(p) {
    try { return window.tripModule?.formatPrice?.(p) || (parseFloat(p)||0).toFixed(2) + ' EGP'; } catch(e) { return (parseFloat(p)||0).toFixed(2) + ' EGP'; }
  }

  // ==========================================================================
  // GUEST COUNTERS
  // ==========================================================================
  function gv(id) { const e = $(id); if (!e) return 0; const v = parseInt(e.value); return isNaN(v) ? 0 : v; }
  function adults() { return gv('adults'); }
  function children() { return gv('childrenUnder12'); }
  function infants() { return gv('infants'); }

  // ==========================================================================
  // PRICE
  // ==========================================================================
  function calcBase() {
    const t = getTrip();
    const bp = parseFloat(t.basePrice) || 0;
    if (!bp) return 0;
    const cp = parseFloat(t.cprice) || bp * 0.5;
    return parseFloat(((adults() * bp) + (children() * cp)).toFixed(2));
  }
  
  function calcExtra() {
    const tt = getTourTypes();
    if (selectedTripType && tt[selectedTripType]) {
      return parseFloat(((adults() + children()) * parseFloat(tt[selectedTripType])).toFixed(2));
    }
    return 0;
  }
  
  function calcNet() { return parseFloat((calcBase() + calcExtra()).toFixed(2)); }
  function calcTax() { const n = calcNet(); return parseFloat((n * 0.03 + n * 0.03 * 0.14 + 3).toFixed(2)); }
  function calcTotal() { return parseFloat((calcNet() + calcTax()).toFixed(2)); }

  // ==========================================================================
  // STEPPER
  // ==========================================================================
  function stepper(id, delta) {
    const inp = $(id);
    if (!inp) return;
    let v = parseInt(inp.value) || 0;
    const max = id === 'infants' ? 2 : 10;
    const min = id === 'adults' ? 1 : 0;
    v = Math.max(min, Math.min(max, v + delta));
    inp.value = v;
    if (currentStep === 3) updateSummary();
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function setText(id, val) { const e = $(id); if (e) e.textContent = toStr(val); }

  function updateSummary() {
    setText('summaryRef', refNumber);
    setText('summaryTour', getTrip().name || '-');
    setText('summaryDate', $('tripDate')?.value || '-');
    setText('summaryHotel', clean($('hotelName')?.value) || '-');
    setText('summaryRoom', clean($('roomNumber')?.value) || '-');
    setText('summaryAdults', adults() + ' Adult' + (adults() !== 1 ? 's' : ''));
    setText('summaryChildrenUnder12', children() + ' Child' + (children() !== 1 ? 'ren' : ''));
    setText('summaryInfants', infants() + ' Infant' + (infants() !== 1 ? 's' : ''));
    setText('summaryService', selectedTripType || 'None');

    const td = $('totalPriceDisplay');
    if (td && getTrip().basePrice) {
      td.innerHTML = fmtPrice(calcNet()) +
        '<div style="font-size:11px;color:#a0a0a0;margin-top:8px;">' +
        '<div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;">' +
        '<span>+ Taxes:</span><span>' + fmtPrice(calcTax()) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;color:#f59e0b;font-weight:700;">' +
        '<span>Total:</span><span>' + fmtPrice(calcTotal()) + '</span></div></div>';
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  function goToStep(n) {
    clearAllFieldErrors();
    
    document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
    const tgt = document.querySelector('.form-step[data-step="' + n + '"]');
    if (tgt) tgt.classList.add('active');
    currentStep = n;
    
    const pb = $('progressBar');
    if (pb) pb.style.width = ((n + 1) / 4 * 100) + '%';
    
    document.querySelectorAll('.steps-labels .step-label').forEach(function(l, i) {
      l.classList.toggle('active', i === n);
    });
    
    if (n === 3) updateSummary();
  }

  function validateStep1() {
    clearAllFieldErrors();
    let valid = true;
    
    if (!toStr($('username')?.value)) {
      showFieldError('username', 'Please enter your full name');
      valid = false;
    }
    
    const em = toStr($('customerEmail')?.value);
    if (!em || em.indexOf('@') < 0 || em.indexOf('.') < 0) {
      showFieldError('customerEmail', 'Please enter a valid email address');
      valid = false;
    }
    
    if (iti) {
      if (!iti.getNumber() || !iti.isValidNumber()) {
        showFieldError('phone', 'Please enter a valid phone number with country code');
        valid = false;
      }
    } else {
      if (toStr($('phone')?.value).length < 8) {
        showFieldError('phone', 'Please enter a valid phone number');
        valid = false;
      }
    }
    
    return valid;
  }

  function validateStep2() {
    clearAllFieldErrors();
    let valid = true;
    
    if (!toStr($('tripDate')?.value)) {
      showFieldError('tripDate', 'Please select a date for your trip');
      valid = false;
    }
    
    if (!toStr($('hotelName')?.value)) {
      showFieldError('hotelName', 'Please enter your hotel name');
      valid = false;
    }
    
    if (!toStr($('roomNumber')?.value)) {
      showFieldError('roomNumber', 'Please enter your room number');
      valid = false;
    }
    
    return valid;
  }

  function nextStep() {
    if (currentStep === 0 && !validateStep1()) return;
    if (currentStep === 1 && !validateStep2()) return;
    if (currentStep < 3) goToStep(currentStep + 1);
  }

  function prevStep() {
    if (currentStep > 0) goToStep(currentStep - 1);
  }

  // ==========================================================================
  // SERVICES POPUP
  // ==========================================================================
  let tempService = '';

  function openServicesPopup() {
    const popup = $('extraServicesPopup');
    const content = $('servicesPopupContent');
    if (!popup || !content) return;
    
    tempService = selectedTripType;
    content.innerHTML = '';
    
    const noneDiv = document.createElement('div');
    noneDiv.className = 'service-option' + (!tempService ? ' selected' : '');
    noneDiv.innerHTML = '<div class="service-option-info"><div class="service-option-name">No extra services</div><div class="service-option-price">Free</div></div><div class="service-option-check"></div>';
    noneDiv.onclick = function() { tempService = ''; content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); }); noneDiv.classList.add('selected'); };
    content.appendChild(noneDiv);
    
    const types = getTourTypes();
    Object.keys(types || {}).forEach(function(key) {
      const div = document.createElement('div');
      div.className = 'service-option' + (tempService === key ? ' selected' : '');
      div.innerHTML = '<div class="service-option-info"><div class="service-option-name">' + key + '</div><div class="service-option-price">' + fmtPrice(types[key]) + ' per person</div></div><div class="service-option-check"></div>';
      div.onclick = function() { tempService = key; content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); }); div.classList.add('selected'); };
      content.appendChild(div);
    });
    
    popup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function confirmService() {
    selectedTripType = tempService;
    const tt = $('tripType'); if (tt) tt.value = selectedTripType;
    const st = $('selectedServiceText'); if (st) st.textContent = selectedTripType || 'No extra services';
    closeServicesPopup();
    updateSummary();
  }

  function closeServicesPopup() {
    const popup = $('extraServicesPopup');
    if (popup) popup.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // SUBMIT
  // ==========================================================================
  async function submitBooking() {
    const spinner = $('spinner');
    const submitBtn = $('submitBtn');
    
    if (spinner) spinner.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
      if (typeof auth === 'undefined') throw new Error('Authentication not loaded. Please refresh the page.');
      if (typeof db === 'undefined') throw new Error('Database not loaded. Please refresh the page.');
      if (!auth.currentUser) throw new Error('Please sign in to complete your booking.');
      
      const user = auth.currentUser;
      const trip = getTrip();
      const tripId = getTripId() || (new URLSearchParams(location.search).get('trip-id') || '');
      const ownerId = getOwnerId();
      
      let phone = '';
      if (iti) phone = iti.getNumber();
      if (!phone) phone = toStr($('phone')?.value);
      
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      const booking = {
        refNumber, username: clean($('username')?.value), email: clean($('customerEmail')?.value),
        phone, tour: toStr(trip.name), tripId, tripDate: toStr($('tripDate')?.value),
        adults: adults(), childrenUnder12: children(), infants: infants(),
        hotelName: clean($('hotelName')?.value), roomNumber: clean($('roomNumber')?.value),
        baseTotal: calcBase(), extraServicesTotal: calcExtra(), netTotal: net, total, taxes: tax,
        extraServices: selectedTripType || 'None',
        status: 'pending', resStatus: 'new', isPaid: false, paymentStatus: 'unpaid',
        uid: user.uid, owner: ownerId || user.uid, createdAt: Date.now(), updatedAt: Date.now()
      };
      
      const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP' })
      });
      
      if (!resp.ok) throw new Error('Payment service temporarily unavailable. Please try again.');
      const hashData = await resp.json();
      if (!hashData.hash) throw new Error('Payment verification failed. Please try again.');
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP',
        hash: hashData.hash, mode: 'live',
        merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
        failureRedirect: 'false', redirectMethod: 'get'
      }).toString();
      
      await db.ref('trip-bookings/' + refNumber).set({ ...booking, paymenturl: paymentUrl });
      
      if (ownerId && ownerId !== user.uid) {
        try {
          await db.ref('notifications/' + ownerId + '/' + Date.now()).set({
            title: 'New Booking: ' + (trip.name || 'Trip'),
            message: booking.username + ' - ' + adults() + 'A/' + children() + 'C/' + infants() + 'I',
            totalAmount: net, bookingId: refNumber, tripId, tripName: trip.name || '',
            userName: booking.username, userEmail: booking.email, phone: booking.phone,
            adults: adults(), children: children(), infants: infants(), tripDate: booking.tripDate,
            read: false, timestamp: Date.now(), type: 'new_booking'
          });
        } catch(e) {}
      }
      
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      sessionStorage.setItem('refNumber', refNumber);
      
      toast('Redirecting to payment gateway...', 'success');
      setTimeout(function() { window.location.href = paymentUrl; }, 1500);
      
    } catch(e) {
      toast(e.message, 'error');
      if (spinner) spinner.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ==========================================================================
  // LOAD USER DATA
  // ==========================================================================
  async function loadUserData() {
    if (!auth?.currentUser) return;
    try {
      const snap = await db.ref('egy_user/' + auth.currentUser.uid).once('value');
      const d = snap.val();
      if (!d) return;
      
      if (d.username) { const e = $('username'); if (e) e.value = String(d.username); }
      if (d.email) { const e = $('customerEmail'); if (e) e.value = String(d.email); }
      if (d.phone && iti) { iti.setNumber(String(d.phone)); }
    } catch(e) {}
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function init() {
    const tripId = getTripId() || (new URLSearchParams(location.search).get('trip-id') || '');
    if (!tripId) { toast('No trip specified in URL', 'error'); return; }
    
    refNumber = generateRef();
    
    const trip = getTrip();
    const tn = $('tripName'); if (tn && trip.name) tn.value = String(trip.name);
    
    const phoneEl = document.querySelector('#phone');
    if (phoneEl && window.intlTelInput) {
      iti = window.intlTelInput(phoneEl, {
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it', 'sa'],
        separateDialCode: true,
        initialCountry: 'eg',
        nationalMode: false,
      });
    }
    
    const dateEl = document.querySelector('#tripDate');
    if (dateEl && typeof flatpickr !== 'undefined') {
      flatpickr(dateEl, { minDate: new Date().fp_incr(1), dateFormat: 'Y-m-d', disableMobile: true });
    }
    
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    document.querySelectorAll('[data-stepper]').forEach(function(b) {
      b.onclick = function() { stepper(this.getAttribute('data-stepper'), parseInt(this.getAttribute('data-delta'))); };
    });
    
    const sb = $('submitBtn'); if (sb) sb.onclick = submitBooking;
    const sv = $('openServicesBtn'); if (sv) sv.onclick = openServicesPopup;
    const cb = $('confirmServicesBtn'); if (cb) cb.onclick = confirmService;
    const cl = $('cancelServicesBtn'); if (cl) cl.onclick = closeServicesPopup;
    
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(function(b) { b.onclick = closeServicesPopup; });
    const ov = document.querySelector('#extraServicesPopup .services-popup-overlay'); if (ov) ov.onclick = closeServicesPopup;
    
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeServicesPopup(); });
    
    auth.onAuthStateChanged(function(user) { if (user) setTimeout(loadUserData, 500); });
    
    setTimeout(updateSummary, 1500);
  }

  window.BookingSystem = {
    init, nextStep, prevStep, stepper,
    openServices: openServicesPopup, closeServices: closeServicesPopup, confirmService,
    submit: submitBooking, updateSummary,
    getRef: function() { return refNumber; },
    getPhone: function() { return iti ? iti.getNumber() : ''; }
  };

  function tryInit() {
    if (typeof auth === 'undefined' || typeof db === 'undefined') { setTimeout(tryInit, 500); return; }
    init();
  }
  setTimeout(tryInit, 800);

})();
