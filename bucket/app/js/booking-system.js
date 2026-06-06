// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// NO EXTERNAL DEPENDENCIES VERSION
// Phone: Manual input with country code prefix
// Date: Native HTML date picker
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // DEBUG PANEL
  // ==========================================================================
  let debugLines = [];
  let debugPanel = null;

  function createDebugPanel() {
    const existing = document.getElementById('bsDebugPanel');
    if (existing) existing.remove();

    debugPanel = document.createElement('div');
    debugPanel.id = 'bsDebugPanel';
    debugPanel.style.cssText = [
      'position:fixed;top:10px;right:10px;z-index:99999;',
      'background:rgba(0,0,0,0.92);color:#0f0;',
      'padding:10px;border-radius:8px;',
      'font-family:monospace;font-size:10px;',
      'max-width:320px;max-height:200px;overflow-y:auto;',
      'border:1px solid #444;line-height:1.4;'
    ].join('');
    
    const title = document.createElement('div');
    title.textContent = '🔍 Debug';
    title.style.cssText = 'color:#f59e0b;font-weight:bold;margin-bottom:4px;font-size:11px;border-bottom:1px solid #444;padding-bottom:3px;';
    debugPanel.appendChild(title);
    
    const logContainer = document.createElement('div');
    logContainer.id = 'bsDebugLog';
    debugPanel.appendChild(logContainer);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:4px;right:6px;background:#333;border:none;color:#fff;cursor:pointer;font-size:10px;padding:2px 5px;border-radius:3px;';
    closeBtn.onclick = function() { debugPanel.style.display = 'none'; };
    debugPanel.appendChild(closeBtn);
    
    document.body.appendChild(debugPanel);
    updateDebugPanel();
  }

  function debug(msg, color) {
    color = color || '#0f0';
    const time = new Date().toLocaleTimeString();
    debugLines.push({ text: '[' + time + '] ' + String(msg), color: color });
    if (debugLines.length > 30) debugLines.shift();
    updateDebugPanel();
  }

  function updateDebugPanel() {
    const logContainer = document.getElementById('bsDebugLog');
    if (!logContainer) return;
    logContainer.innerHTML = debugLines.map(function(line) {
      return '<div style="color:' + line.color + ';">' + 
             line.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
             '</div>';
    }).join('');
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(createDebugPanel, 200); });
  } else {
    setTimeout(createDebugPanel, 200);
  }

  // ==========================================================================
  // SCREEN MESSAGES
  // ==========================================================================
  function screenError(msg) {
    debug('❌ ' + String(msg), '#ff4444');
    const existing = document.querySelector('.bs-screen-msg');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = 'bs-screen-msg';
    div.style.cssText = [
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:#1e1e1e;color:#ff4444;padding:20px 30px;border-radius:12px;',
      'z-index:99998;font-size:15px;font-weight:600;text-align:center;',
      'border:2px solid #ff4444;box-shadow:0 10px 40px rgba(0,0,0,0.7);max-width:90%;'
    ].join('');
    div.innerHTML = '❌ ' + String(msg).replace(/</g, '&lt;') + 
                    '<br><small style="color:#888;font-size:11px;">Check debug panel (top-right)</small>';
    document.body.appendChild(div);
    
    setTimeout(function() { 
      div.style.opacity = '0'; 
      div.style.transition = 'opacity 0.5s'; 
      setTimeout(function() { div.remove(); }, 500); 
    }, 6000);
  }

  function screenSuccess(msg) {
    debug('✅ ' + String(msg), '#22c55e');
    const existing = document.querySelector('.bs-screen-success');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = 'bs-screen-success';
    div.style.cssText = [
      'position:fixed;top:20px;left:50%;transform:translateX(-50%);',
      'background:#1e1e1e;color:#22c55e;padding:14px 24px;border-radius:30px;',
      'z-index:99998;font-size:14px;font-weight:600;',
      'border:1px solid #22c55e;box-shadow:0 8px 30px rgba(0,0,0,0.5);white-space:nowrap;'
    ].join('');
    div.textContent = '✅ ' + String(msg);
    document.body.appendChild(div);
    
    setTimeout(function() { 
      div.style.opacity = '0'; 
      div.style.transition = 'opacity 0.3s'; 
      setTimeout(function() { div.remove(); }, 300); 
    }, 3000);
  }

  // ==========================================================================
  // STATE
  // ==========================================================================
  let refNumber = '';
  let selectedTripType = '';
  let currentStep = 0;

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  function $(id) {
    return document.getElementById(id);
  }

  function toStr(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
  }

  function clean(val) {
    return toStr(val).replace(/[<>]/g, '');
  }

  function generateRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = 'DS-';
    for (let i = 0; i < 10; i++) {
      r += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return r;
  }

  // ==========================================================================
  // TRIP DATA
  // ==========================================================================
  function getTripData() {
    try {
      if (window.tripModule && typeof window.tripModule.getCurrentTrip === 'function') {
        return window.tripModule.getCurrentTrip() || {};
      }
    } catch(e) {}
    return {};
  }

  function getTourTypes() {
    try {
      if (window.tripModule && typeof window.tripModule.getTourTypes === 'function') {
        return window.tripModule.getTourTypes() || {};
      }
    } catch(e) {}
    return {};
  }

  function getOwnerId() {
    try {
      if (window.tripModule && typeof window.tripModule.getTripOwnerId === 'function') {
        return toStr(window.tripModule.getTripOwnerId());
      }
    } catch(e) {}
    return '';
  }

  function getTripPName() {
    try {
      if (window.tripModule && typeof window.tripModule.getTripPName === 'function') {
        return toStr(window.tripModule.getTripPName());
      }
    } catch(e) {}
    return toStr(new URLSearchParams(window.location.search).get('trip-id'));
  }

  function fmtPrice(p) {
    try {
      if (window.tripModule && typeof window.tripModule.formatPrice === 'function') {
        return window.tripModule.formatPrice(p);
      }
    } catch(e) {}
    p = parseFloat(p) || 0;
    return p.toFixed(2) + ' EGP';
  }

  // ==========================================================================
  // GUEST COUNTERS
  // ==========================================================================
  function getVal(id) {
    const el = $(id);
    if (!el) return 0;
    const v = parseInt(el.value);
    return isNaN(v) ? 0 : v;
  }
  function getAdults() { return getVal('adults'); }
  function getChildren() { return getVal('childrenUnder12'); }
  function getInfants() { return getVal('infants'); }

  // ==========================================================================
  // PRICE
  // ==========================================================================
  function calcBase() {
    const t = getTripData();
    const bp = parseFloat(t.basePrice) || 0;
    if (bp <= 0) return 0;
    const cp = parseFloat(t.cprice) || bp * 0.5;
    return parseFloat(((getAdults() * bp) + (getChildren() * cp)).toFixed(2));
  }
  function calcExtra() {
    const tt = getTourTypes();
    if (selectedTripType && tt[selectedTripType]) {
      return parseFloat(((getAdults() + getChildren()) * parseFloat(tt[selectedTripType])).toFixed(2));
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
    const max = (id === 'infants') ? 2 : 10;
    const min = (id === 'adults') ? 1 : 0;
    v = Math.max(min, Math.min(max, v + delta));
    inp.value = v;
    if (currentStep === 3) updateSummary();
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function setText(id, val) {
    const el = $(id);
    if (el) el.textContent = toStr(val);
  }

  function updateSummary() {
    setText('summaryRef', refNumber);
    setText('summaryTour', getTripData().name || '-');
    setText('summaryDate', $('tripDate')?.value || '-');
    setText('summaryHotel', clean($('hotelName')?.value) || '-');
    setText('summaryRoom', clean($('roomNumber')?.value) || '-');
    setText('summaryAdults', getAdults() + ' Adult' + (getAdults() !== 1 ? 's' : ''));
    setText('summaryChildrenUnder12', getChildren() + ' Child' + (getChildren() !== 1 ? 'ren' : ''));
    setText('summaryInfants', getInfants() + ' Infant' + (getInfants() !== 1 ? 's' : ''));
    setText('summaryService', selectedTripType || 'None');

    const td = $('totalPriceDisplay');
    if (td && getTripData().basePrice) {
      td.innerHTML = 
        fmtPrice(calcNet()) +
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
  function goToStep(stepNum) {
    document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
    const target = document.querySelector('.form-step[data-step="' + stepNum + '"]');
    if (target) target.classList.add('active');
    
    currentStep = stepNum;
    
    const pb = $('progressBar');
    if (pb) pb.style.width = ((stepNum + 1) / 4 * 100) + '%';
    
    document.querySelectorAll('.steps-labels .step-label').forEach(function(l, i) {
      if (i === stepNum) l.classList.add('active');
      else l.classList.remove('active');
    });
    
    if (stepNum === 3) updateSummary();
  }

  function validateStep1() {
    const name = toStr($('username')?.value);
    if (!name) {
      screenError('Please enter your full name');
      try { $('username')?.focus(); } catch(e) {}
      return false;
    }
    
    const email = toStr($('customerEmail')?.value);
    if (!email || email.indexOf('@') < 0 || email.indexOf('.') < 0) {
      screenError('Please enter a valid email');
      try { $('customerEmail')?.focus(); } catch(e) {}
      return false;
    }
    
    const phone = toStr($('phone')?.value);
    if (!phone || phone.length < 8) {
      screenError('Please enter a valid phone number with country code');
      return false;
    }
    
    return true;
  }

  function validateStep2() {
    if (!toStr($('tripDate')?.value)) {
      screenError('Please select a trip date');
      return false;
    }
    if (!toStr($('hotelName')?.value)) {
      screenError('Please enter hotel name');
      try { $('hotelName')?.focus(); } catch(e) {}
      return false;
    }
    if (!toStr($('roomNumber')?.value)) {
      screenError('Please enter room number');
      try { $('roomNumber')?.focus(); } catch(e) {}
      return false;
    }
    return true;
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
    
    // None
    (function() {
      const div = document.createElement('div');
      div.className = 'service-option' + (tempService === '' ? ' selected' : '');
      div.innerHTML = '<div class="service-option-info"><div class="service-option-name">No extra services</div><div class="service-option-price">Free</div></div><div class="service-option-check"></div>';
      div.onclick = function() {
        tempService = '';
        content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); });
        div.classList.add('selected');
      };
      content.appendChild(div);
    })();
    
    // Types
    const types = getTourTypes();
    if (types) {
      Object.keys(types).forEach(function(key) {
        const div = document.createElement('div');
        div.className = 'service-option' + (tempService === key ? ' selected' : '');
        div.innerHTML = '<div class="service-option-info"><div class="service-option-name">' + String(key) + '</div><div class="service-option-price">' + fmtPrice(types[key]) + ' per person</div></div><div class="service-option-check"></div>';
        div.onclick = function() {
          tempService = key;
          content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); });
          div.classList.add('selected');
        };
        content.appendChild(div);
      });
    }
    
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
    if (spinner) spinner.classList.remove('hidden');
    
    const submitBtn = $('submitBtn');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
      if (typeof auth === 'undefined') throw new Error('Auth not loaded');
      if (typeof db === 'undefined') throw new Error('Database not loaded');
      if (!auth.currentUser) throw new Error('Please sign in first');
      
      const user = auth.currentUser;
      const trip = getTripData();
      const tripId = getTripPName();
      const ownerId = getOwnerId();
      
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      const booking = {
        refNumber: refNumber,
        username: clean($('username')?.value),
        email: clean($('customerEmail')?.value),
        phone: toStr($('phone')?.value),
        tour: toStr(trip.name),
        tripId: tripId,
        tripDate: toStr($('tripDate')?.value),
        adults: getAdults(),
        childrenUnder12: getChildren(),
        infants: getInfants(),
        hotelName: clean($('hotelName')?.value),
        roomNumber: clean($('roomNumber')?.value),
        baseTotal: calcBase(),
        extraServicesTotal: calcExtra(),
        netTotal: net,
        total: total,
        taxes: tax,
        extraServices: selectedTripType || 'None',
        status: 'pending',
        resStatus: 'new',
        isPaid: false,
        paymentStatus: 'unpaid',
        uid: user.uid,
        owner: ownerId || user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Payment hash
      const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: 'MID-33260-3',
          orderId: refNumber,
          amount: total,
          currency: 'EGP'
        })
      });
      
      if (!resp.ok) throw new Error('Payment service error');
      
      const hashData = await resp.json();
      if (!hashData.hash) throw new Error('No payment hash');
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: total,
        currency: 'EGP',
        hash: hashData.hash,
        mode: 'live',
        merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
        failureRedirect: 'false',
        redirectMethod: 'get'
      }).toString();
      
      // Save
      await db.ref('trip-bookings/' + refNumber).set({
        ...booking,
        paymenturl: paymentUrl
      });
      
      // Notify
      if (ownerId && ownerId !== user.uid) {
        try {
          await db.ref('notifications/' + ownerId + '/' + Date.now()).set({
            title: 'New Booking: ' + (trip.name || 'Trip'),
            message: booking.username + ' - ' + getAdults() + 'A/' + getChildren() + 'C/' + getInfants() + 'I',
            totalAmount: net,
            bookingId: refNumber,
            tripId: tripId,
            tripName: trip.name || '',
            userName: booking.username,
            userEmail: booking.email,
            phone: booking.phone,
            adults: getAdults(),
            children: getChildren(),
            infants: getInfants(),
            tripDate: booking.tripDate,
            read: false,
            timestamp: Date.now(),
            type: 'new_booking'
          });
        } catch(e) {}
      }
      
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      sessionStorage.setItem('refNumber', refNumber);
      
      screenSuccess('Redirecting to payment...');
      
      setTimeout(function() {
        window.location.href = paymentUrl;
      }, 1500);
      
    } catch (error) {
      debug('❌ ' + error.message, '#ff4444');
      screenError(error.message);
      if (spinner) spinner.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ==========================================================================
  // LOAD USER DATA
  // ==========================================================================
  async function loadUserData() {
    try {
      if (!auth?.currentUser) return;
      
      const user = auth.currentUser;
      const snap = await db.ref('egy_user/' + user.uid).once('value');
      const data = snap.val();
      
      if (!data) {
        debug('No profile found', '#ffa500');
        return;
      }
      
      if (data.username) {
        const el = $('username');
        if (el) el.value = String(data.username);
      }
      
      if (data.email) {
        const el = $('customerEmail');
        if (el) el.value = String(data.email);
      }
      
      if (data.phone) {
        const el = $('phone');
        if (el) el.value = String(data.phone);
        debug('✅ Phone loaded: ' + data.phone, '#0f0');
      }
      
      screenSuccess('Your data loaded');
      
    } catch (error) {
      debug('Load error: ' + error.message, '#ff4444');
    }
  }

  // ==========================================================================
  // DATE PICKER SETUP
  // ==========================================================================
  function setupDatePicker() {
    const dateEl = $('tripDate');
    if (!dateEl) return;
    
    // Use native date input
    dateEl.type = 'date';
    dateEl.removeAttribute('readonly');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    dateEl.setAttribute('min', minDate);
    dateEl.value = minDate;
    
    // Dark theme for date picker
    dateEl.style.cssText = [
      'width:100%;padding:13px 16px;',
      'background:#1a1a1a;',
      'border:1.5px solid #2e2e2e;border-radius:12px;',
      'color:#fff;font-size:14px;',
      'color-scheme:dark;',
      'cursor:pointer;'
    ].join('');
    
    dateEl.addEventListener('change', function() {
      if (currentStep === 3) updateSummary();
      debug('📅 Date: ' + dateEl.value, '#0f0');
    });
    
    debug('✅ Date picker ready (native)', '#0f0');
  }

  // ==========================================================================
  // MOBILE
  // ==========================================================================
  function isMobile() { return window.innerWidth <= 768; }

  function moveBookingToMobile() {
    const mc = $('mobileBookingContainer');
    const main = $('mainBookingCard');
    const ms = $('mobileBookingSection');
    
    if (!mc || !main || !ms) return;
    
    if (isMobile()) {
      mc.innerHTML = '';
      const clone = main.cloneNode(true);
      clone.id = 'mobileBookingCard';
      mc.appendChild(clone);
      ms.style.display = 'block';
      
      const card = $('mobileBookingCard');
      if (card) {
        card.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
        card.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
        card.querySelectorAll('[data-stepper]').forEach(function(b) {
          b.onclick = function() { stepper(this.getAttribute('data-stepper'), parseInt(this.getAttribute('data-delta'))); };
        });
        const sb = card.querySelector('#submitBtn');
        if (sb) sb.onclick = submitBooking;
        const sv = card.querySelector('#openServicesBtn');
        if (sv) sv.onclick = openServicesPopup;
      }
    } else {
      ms.style.display = 'none';
      mc.innerHTML = '';
    }
  }

  function showMobileBooking() {
    moveBookingToMobile();
    const ms = $('mobileBookingSection');
    if (ms) setTimeout(function() { ms.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function init() {
    debug('🚀 Init', '#ffa500');
    
    if (typeof auth === 'undefined') { screenError('Auth missing'); return; }
    if (typeof db === 'undefined') { screenError('DB missing'); return; }
    
    const tripId = getTripPName();
    if (!tripId) { screenError('No trip-id'); return; }
    
    debug('✅ Trip: ' + tripId, '#0f0');
    
    refNumber = generateRef();
    debug('📋 Ref: ' + refNumber, '#0f0');
    
    const trip = getTripData();
    const tn = $('tripName');
    if (tn && trip.name) tn.value = String(trip.name);
    
    // Setup phone input
    const phoneEl = $('phone');
    if (phoneEl) {
      phoneEl.setAttribute('placeholder', '+20 1XX XXX XXXX');
      phoneEl.setAttribute('type', 'tel');
      debug('✅ Phone ready', '#0f0');
    }
    
    // Setup date picker
    setupDatePicker();
    
    // Bind events
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    document.querySelectorAll('[data-stepper]').forEach(function(b) {
      b.onclick = function() {
        stepper(this.getAttribute('data-stepper'), parseInt(this.getAttribute('data-delta')));
      };
    });
    
    const sb = $('submitBtn');
    if (sb) sb.onclick = submitBooking;
    
    const sv = $('openServicesBtn');
    if (sv) sv.onclick = openServicesPopup;
    
    const cb = $('confirmServicesBtn');
    if (cb) cb.onclick = confirmService;
    
    const cl = $('cancelServicesBtn');
    if (cl) cl.onclick = closeServicesPopup;
    
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(function(b) { b.onclick = closeServicesPopup; });
    const ov = document.querySelector('#extraServicesPopup .services-popup-overlay');
    if (ov) ov.onclick = closeServicesPopup;
    
    const mb = $('mobileBookNowBtn');
    if (mb) mb.onclick = showMobileBooking;
    
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeServicesPopup(); });
    
    // Auth
    auth.onAuthStateChanged(function(user) {
      if (user) {
        debug('👤 Logged in', '#0f0');
        setTimeout(loadUserData, 500);
      }
    });
    
    // Mobile
    moveBookingToMobile();
    window.addEventListener('resize', moveBookingToMobile);
    
    setTimeout(updateSummary, 1500);
    
    debug('✅ Ready!', '#0f0');
    screenSuccess('Booking system ready');
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================
  window.BookingSystem = {
    init: init,
    nextStep: nextStep,
    prevStep: prevStep,
    stepper: stepper,
    openServices: openServicesPopup,
    closeServices: closeServicesPopup,
    confirmService: confirmService,
    submit: submitBooking,
    showMobile: showMobileBooking,
    updateSummary: updateSummary,
    getRef: function() { return refNumber; },
    getTripType: function() { return selectedTripType; },
    getPhone: function() { return toStr($('phone')?.value); }
  };

  // ==========================================================================
  // AUTO START
  // ==========================================================================
  function tryInit() {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
      debug('⏳ Waiting...', '#ffa500');
      setTimeout(tryInit, 500);
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 800); });
  } else {
    setTimeout(tryInit, 800);
  }

  debug('📦 Script loaded', '#888');

})();
