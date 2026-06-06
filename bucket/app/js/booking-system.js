// ==========================================================================
// DISCOVER SHARM - Booking System with VISUAL DEBUG
// All errors and logs shown on screen
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // VISUAL DEBUG PANEL
  // ==========================================================================
  let debugLines = [];
  let debugPanel = null;

  function createDebugPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('bsDebugPanel');
    if (existing) existing.remove();

    debugPanel = document.createElement('div');
    debugPanel.id = 'bsDebugPanel';
    debugPanel.style.cssText = [
      'position:fixed;top:10px;right:10px;z-index:99999;',
      'background:rgba(0,0,0,0.9);color:#0f0;',
      'padding:12px;border-radius:8px;',
      'font-family:monospace;font-size:11px;',
      'max-width:350px;max-height:250px;overflow-y:auto;',
      'border:1px solid #333;',
      'line-height:1.5;'
    ].join('');
    
    // Title
    const title = document.createElement('div');
    title.textContent = '🔍 Booking Debug';
    title.style.cssText = 'color:#f59e0b;font-weight:bold;margin-bottom:6px;font-size:12px;border-bottom:1px solid #333;padding-bottom:4px;';
    debugPanel.appendChild(title);
    
    // Log container
    const logContainer = document.createElement('div');
    logContainer.id = 'bsDebugLog';
    debugPanel.appendChild(logContainer);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:4px;right:8px;background:none;border:none;color:#888;cursor:pointer;font-size:14px;';
    closeBtn.onclick = function() { debugPanel.style.display = 'none'; };
    debugPanel.appendChild(closeBtn);
    
    document.body.appendChild(debugPanel);
    
    // Show stored lines
    updateDebugPanel();
  }

  function debug(msg, color) {
    color = color || '#0f0';
    const time = new Date().toLocaleTimeString();
    debugLines.push({ text: '[' + time + '] ' + msg, color: color });
    
    // Keep only last 30 lines
    if (debugLines.length > 30) debugLines.shift();
    
    updateDebugPanel();
  }

  function updateDebugPanel() {
    const logContainer = document.getElementById('bsDebugLog');
    if (!logContainer) return;
    
    logContainer.innerHTML = debugLines.map(function(line) {
      return '<div style="color:' + line.color + ';">' + line.text + '</div>';
    }).join('');
    
    // Auto scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Create panel immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(createDebugPanel, 300);
    });
  } else {
    setTimeout(createDebugPanel, 300);
  }

  // ==========================================================================
  // SCREEN TOAST (in addition to debug panel)
  // ==========================================================================
  function screenError(msg) {
    // Show in debug panel
    debug('❌ ' + msg, '#ff4444');
    
    // Also show big error on screen
    const existing = document.querySelector('.bs-screen-error');
    if (existing) existing.remove();
    
    const errDiv = document.createElement('div');
    errDiv.className = 'bs-screen-error';
    errDiv.style.cssText = [
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:#1e1e1e;color:#ff4444;padding:20px 30px;border-radius:12px;',
      'z-index:99999;font-size:16px;font-weight:600;text-align:center;',
      'border:2px solid #ff4444;box-shadow:0 10px 40px rgba(0,0,0,0.7);',
      'max-width:90%;'
    ].join('');
    errDiv.innerHTML = '❌ ' + msg + '<br><small style="color:#888;font-size:12px;">Check debug panel (top-right) for details</small>';
    document.body.appendChild(errDiv);
    
    setTimeout(function() {
      errDiv.style.opacity = '0';
      errDiv.style.transition = 'opacity 0.5s';
      setTimeout(function() { errDiv.remove(); }, 500);
    }, 5000);
  }

  function screenSuccess(msg) {
    const existing = document.querySelector('.bs-screen-success');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = 'bs-screen-success';
    div.style.cssText = [
      'position:fixed;top:20px;left:50%;transform:translateX(-50%);',
      'background:#1e1e1e;color:#22c55e;padding:14px 24px;border-radius:30px;',
      'z-index:99999;font-size:14px;font-weight:600;',
      'border:1px solid #22c55e;box-shadow:0 8px 30px rgba(0,0,0,0.5);',
      'white-space:nowrap;'
    ].join('');
    div.textContent = '✅ ' + msg;
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
  let iti = null;
  let refNumber = '';
  let selectedTripType = '';
  let currentStep = 0;

  // ==========================================================================
  // ELEMENT GETTER
  // ==========================================================================
  function $(id) {
    return document.getElementById(id);
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================
  function generateRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = 'DS-';
    for (let i = 0; i < 10; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
  }

  function clean(str) {
    if (!str) return '';
    return String(str).replace(/[<>]/g, '').trim();
  }

  // ==========================================================================
  // TRIP DATA
  // ==========================================================================
  function getTripData() {
    if (window.tripModule?.getCurrentTrip) {
      return window.tripModule.getCurrentTrip();
    }
    return {};
  }

  function getTourTypes() {
    if (window.tripModule?.getTourTypes) {
      return window.tripModule.getTourTypes();
    }
    return {};
  }

  function getOwnerId() {
    if (window.tripModule?.getTripOwnerId) {
      return window.tripModule.getTripOwnerId();
    }
    return '';
  }

  function getTripPName() {
    if (window.tripModule?.getTripPName) {
      return window.tripModule.getTripPName();
    }
    return new URLSearchParams(location.search).get('trip-id') || '';
  }

  function fmtPrice(p) {
    if (window.tripModule?.formatPrice) {
      return window.tripModule.formatPrice(p);
    }
    return parseFloat(p).toFixed(2) + ' EGP';
  }

  // ==========================================================================
  // GUEST COUNTERS
  // ==========================================================================
  function getAdults() { const e = $('adults'); return e ? parseInt(e.value) || 0 : 0; }
  function getChildren() { const e = $('childrenUnder12'); return e ? parseInt(e.value) || 0 : 0; }
  function getInfants() { const e = $('infants'); return e ? parseInt(e.value) || 0 : 0; }

  // ==========================================================================
  // PRICE
  // ==========================================================================
  function calcBase() {
    const t = getTripData();
    if (!t.basePrice) return 0;
    const ap = parseFloat(t.basePrice);
    const cp = parseFloat(t.cprice) || ap * 0.5;
    return +((getAdults() * ap) + (getChildren() * cp)).toFixed(2);
  }
  function calcExtra() {
    const tt = getTourTypes();
    if (selectedTripType && tt[selectedTripType]) {
      return +(((getAdults() + getChildren()) * parseFloat(tt[selectedTripType])).toFixed(2));
    }
    return 0;
  }
  function calcNet() { return +(calcBase() + calcExtra()).toFixed(2); }
  function calcTax() { const n = calcNet(); return +(n * 0.03 + n * 0.03 * 0.14 + 3).toFixed(2); }
  function calcTotal() { return +(calcNet() + calcTax()).toFixed(2); }

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
  function updateSummary() {
    const set = function(id, val) { const e = $(id); if (e) e.textContent = val; };
    set('summaryRef', refNumber);
    set('summaryTour', getTripData().name || '-');
    set('summaryDate', $('tripDate')?.value || '-');
    set('summaryHotel', clean($('hotelName')?.value) || '-');
    set('summaryRoom', clean($('roomNumber')?.value) || '-');
    set('summaryAdults', getAdults() + ' Adult' + (getAdults() !== 1 ? 's' : ''));
    set('summaryChildrenUnder12', getChildren() + ' Child' + (getChildren() !== 1 ? 'ren' : ''));
    set('summaryInfants', getInfants() + ' Infant' + (getInfants() !== 1 ? 's' : ''));
    set('summaryService', selectedTripType || 'None');

    const td = $('totalPriceDisplay');
    if (td && getTripData().basePrice) {
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
  function goToStep(stepNum) {
    debug('Navigate to step: ' + (stepNum + 1), '#ffa500');
    
    document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
    const target = document.querySelector('.form-step[data-step="' + stepNum + '"]');
    if (target) target.classList.add('active');
    
    currentStep = stepNum;
    
    const pb = $('progressBar');
    if (pb) pb.style.width = ((stepNum + 1) / 4 * 100) + '%';
    
    document.querySelectorAll('.steps-labels .step-label').forEach(function(l, i) {
      l.classList.toggle('active', i === stepNum);
    });
    
    if (stepNum === 3) updateSummary();
  }

  function validateStep1() {
    const name = $('username')?.value?.trim();
    if (!name) {
      screenError('Please enter your full name');
      $('username')?.focus();
      return false;
    }
    
    const email = $('customerEmail')?.value?.trim();
    if (!email || !email.includes('@')) {
      screenError('Please enter a valid email');
      $('customerEmail')?.focus();
      return false;
    }
    
    if (iti) {
      const num = iti.getNumber();
      const valid = iti.isValidNumber();
      debug('Phone: ' + num + ' | Valid: ' + valid, valid ? '#0f0' : '#ff4444');
      if (!num || !valid) {
        screenError('Please enter a valid phone with country code');
        return false;
      }
    } else {
      const phone = $('phone')?.value?.trim();
      if (!phone || phone.length < 8) {
        screenError('Please enter a valid phone number');
        return false;
      }
    }
    
    return true;
  }

  function validateStep2() {
    if (!$('tripDate')?.value?.trim()) {
      screenError('Please select a trip date');
      return false;
    }
    if (!$('hotelName')?.value?.trim()) {
      screenError('Please enter hotel name');
      $('hotelName')?.focus();
      return false;
    }
    if (!$('roomNumber')?.value?.trim()) {
      screenError('Please enter room number');
      $('roomNumber')?.focus();
      return false;
    }
    return true;
  }

  function nextStep() {
    debug('nextStep clicked, current: ' + currentStep, '#ffa500');
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
    if (!popup || !content) {
      screenError('Services popup not found');
      return;
    }
    
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
    
    // Tour types
    const types = getTourTypes();
    Object.keys(types || {}).forEach(function(key) {
      const div = document.createElement('div');
      div.className = 'service-option' + (tempService === key ? ' selected' : '');
      div.innerHTML = '<div class="service-option-info"><div class="service-option-name">' + key + '</div><div class="service-option-price">' + fmtPrice(types[key]) + ' per person</div></div><div class="service-option-check"></div>';
      div.onclick = function() {
        tempService = key;
        content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); });
        div.classList.add('selected');
      };
      content.appendChild(div);
    });
    
    popup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    debug('Services popup opened', '#ffa500');
  }

  function confirmService() {
    selectedTripType = tempService;
    const tt = $('tripType'); if (tt) tt.value = selectedTripType;
    const st = $('selectedServiceText'); if (st) st.textContent = selectedTripType || 'No extra services';
    closeServicesPopup();
    updateSummary();
    debug('Service confirmed: ' + (selectedTripType || 'None'), '#0f0');
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
    debug('🚀 Submit started', '#ffa500');
    screenSuccess('Processing your booking...');
    
    // Show spinner
    const spinner = $('spinner');
    if (spinner) {
      spinner.classList.remove('hidden');
      debug('Spinner shown', '#ffa500');
    }
    
    const submitBtn = $('submitBtn');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
      // Check auth
      if (typeof auth === 'undefined') {
        throw new Error('Firebase Auth not loaded. Please refresh page.');
      }
      
      if (!auth.currentUser) {
        throw new Error('You must be logged in to book. Please sign in first.');
      }
      
      debug('✅ User authenticated: ' + auth.currentUser.uid, '#0f0');
      
      const user = auth.currentUser;
      
      // Get phone
      let phone = '';
      if (iti) {
        phone = iti.getNumber();
        debug('📱 Phone from intl-tel-input: ' + phone, '#0f0');
      }
      if (!phone) {
        phone = $('phone')?.value?.trim() || '';
        debug('📱 Phone from input: ' + phone, '#ffa500');
      }
      
      const trip = getTripData();
      const tripId = getTripPName();
      const ownerId = getOwnerId();
      
      debug('🏷️ Trip: ' + (trip.name || 'Unknown'), '#0f0');
      debug('📋 Trip ID: ' + tripId, '#0f0');
      
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      debug('💰 Net: ' + net + ' | Tax: ' + tax + ' | Total: ' + total, '#0f0');
      
      // Booking object
      const booking = {
        refNumber: refNumber,
        username: clean($('username')?.value),
        email: clean($('customerEmail')?.value),
        phone: phone,
        tour: trip.name || '',
        tripId: tripId,
        tripDate: $('tripDate')?.value || '',
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
      
      debug('📦 Booking object ready', '#0f0');
      
      // Get payment hash
      debug('🔐 Requesting payment hash...', '#ffa500');
      
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
      
      if (!resp.ok) {
        const txt = await resp.text();
        debug('❌ Payment API error: ' + txt, '#ff4444');
        throw new Error('Payment service error');
      }
      
      const hashData = await resp.json();
      debug('✅ Hash received', '#0f0');
      
      if (!hashData.hash) {
        throw new Error('No payment hash');
      }
      
      // Payment URL
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
      
      // Save to Firebase
      debug('💾 Saving to Firebase...', '#ffa500');
      
      if (typeof db === 'undefined') {
        throw new Error('Firebase Database not loaded');
      }
      
      await db.ref('trip-bookings/' + refNumber).set({
        ...booking,
        paymenturl: paymentUrl
      });
      
      debug('✅ Saved to Firebase', '#0f0');
      
      // Notify owner
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
          debug('✅ Owner notified', '#0f0');
        } catch (e) {
          debug('⚠️ Notification failed: ' + e.message, '#ffa500');
        }
      }
      
      // Session
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      sessionStorage.setItem('refNumber', refNumber);
      
      screenSuccess('Redirecting to payment gateway...');
      debug('🔀 Redirecting in 1.5s...', '#ffa500');
      
      setTimeout(function() {
        window.location.href = paymentUrl;
      }, 1500);
      
    } catch (error) {
      debug('❌ ERROR: ' + error.message, '#ff4444');
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
      if (!auth?.currentUser) {
        debug('No user logged in', '#ffa500');
        return;
      }
      
      const user = auth.currentUser;
      debug('Loading data for: ' + user.uid, '#ffa500');
      
      const snap = await db.ref('egy_user/' + user.uid).once('value');
      const data = snap.val();
      
      if (!data) {
        debug('No user profile in database', '#ffa500');
        screenError('User profile not found. Please complete your profile.');
        return;
      }
      
      debug('User data found: ' + JSON.stringify({ name: data.username, email: data.email, phone: data.phone ? '***' : 'none' }), '#0f0');
      
      if (data.username) {
        const el = $('username');
        if (el) { el.value = data.username; debug('✅ Name loaded: ' + data.username, '#0f0'); }
      }
      
      if (data.email) {
        const el = $('customerEmail');
        if (el) { el.value = data.email; debug('✅ Email loaded: ' + data.email, '#0f0'); }
      }
      
      if (data.phone) {
        debug('📱 Setting phone: ' + data.phone, '#ffa500');
        if (iti) {
          iti.setNumber(data.phone);
          debug('✅ Phone set via intl-tel-input', '#0f0');
        } else {
          const el = $('phone');
          if (el) { el.value = data.phone; debug('✅ Phone set directly', '#0f0'); }
        }
      } else {
        debug('⚠️ No phone in profile', '#ffa500');
      }
      
      screenSuccess('Your data has been loaded');
      
    } catch (error) {
      debug('❌ Load error: ' + error.message, '#ff4444');
      screenError('Failed to load your data: ' + error.message);
    }
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
      
      // Re-bind
      const card = $('mobileBookingCard');
      if (card) {
        card.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
        card.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
        card.querySelectorAll('[data-stepper]').forEach(function(b) {
          b.onclick = function() { stepper(this.dataset.stepper, parseInt(this.dataset.delta)); };
        });
        const sb = card.querySelector('#submitBtn');
        if (sb) sb.onclick = submitBooking;
        const sv = card.querySelector('#openServicesBtn');
        if (sv) sv.onclick = openServicesPopup;
      }
      debug('📱 Mobile layout', '#0f0');
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
    debug('🚀 Init started', '#ffa500');
    
    // Check dependencies
    if (typeof auth === 'undefined') {
      screenError('Firebase Auth not loaded! Check cof.js');
      debug('❌ auth is undefined', '#ff4444');
      return;
    }
    if (typeof db === 'undefined') {
      screenError('Firebase Database not loaded! Check cof.js');
      debug('❌ db is undefined', '#ff4444');
      return;
    }
    
    debug('✅ Firebase OK', '#0f0');
    
    const tripId = getTripPName();
    if (!tripId) {
      screenError('No trip-id in URL!');
      debug('❌ No trip-id', '#ff4444');
      return;
    }
    
    debug('🏷️ Trip ID: ' + tripId, '#0f0');
    
    refNumber = generateRef();
    debug('📋 Ref: ' + refNumber, '#0f0');
    
    // Trip name
    const trip = getTripData();
    const tn = $('tripName');
    if (tn && trip.name) { tn.value = trip.name; debug('✅ Trip name set: ' + trip.name, '#0f0'); }
    
    // Phone input
    const phoneEl = $('phone');
    if (phoneEl && window.intlTelInput) {
      iti = window.intlTelInput(phoneEl, {
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it', 'sa'],
        separateDialCode: true,
        initialCountry: 'eg',
        nationalMode: false,
      });
      debug('✅ intl-tel-input ready', '#0f0');
    } else {
      debug('⚠️ intl-tel-input not available', '#ffa500');
    }
    
    // Date picker
    const dateEl = $('tripDate');
    if (dateEl && typeof flatpickr !== 'undefined') {
      flatpickr(dateEl, {
        minDate: new Date().fp_incr(1),
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: function() { if (currentStep === 3) updateSummary(); }
      });
      debug('✅ flatpickr ready', '#0f0');
    } else {
      debug('⚠️ flatpickr not available', '#ffa500');
    }
    
    // Bind events
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    document.querySelectorAll('[data-stepper]').forEach(function(b) {
      b.onclick = function() { stepper(this.dataset.stepper, parseInt(this.dataset.delta)); };
    });
    
    const submitBtn = $('submitBtn');
    if (submitBtn) { submitBtn.onclick = submitBooking; debug('✅ Submit bound', '#0f0'); }
    
    const servicesBtn = $('openServicesBtn');
    if (servicesBtn) { servicesBtn.onclick = openServicesPopup; debug('✅ Services bound', '#0f0'); }
    
    const confirmBtn = $('confirmServicesBtn');
    if (confirmBtn) confirmBtn.onclick = confirmService;
    
    const cancelBtn = $('cancelServicesBtn');
    if (cancelBtn) cancelBtn.onclick = closeServicesPopup;
    
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(function(b) { b.onclick = closeServicesPopup; });
    const overlay = document.querySelector('#extraServicesPopup .services-popup-overlay');
    if (overlay) overlay.onclick = closeServicesPopup;
    
    const mobileBtn = $('mobileBookNowBtn');
    if (mobileBtn) { mobileBtn.onclick = showMobileBooking; debug('✅ Mobile btn bound', '#0f0'); }
    
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeServicesPopup(); });
    
    // Auth listener
    auth.onAuthStateChanged(function(user) {
      if (user) {
        debug('👤 Logged in: ' + user.uid, '#0f0');
        setTimeout(loadUserData, 500);
      } else {
        debug('👤 Not logged in', '#ffa500');
        screenError('Please sign in to book');
      }
    });
    
    // Mobile
    moveBookingToMobile();
    window.addEventListener('resize', moveBookingToMobile);
    
    setTimeout(updateSummary, 1500);
    
    debug('✅ Init complete!', '#0f0');
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
    getPhone: function() { return iti ? iti.getNumber() : ''; },
    debug: debug
  };

  // ==========================================================================
  // AUTO START
  // ==========================================================================
  function tryInit() {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
      debug('⏳ Waiting for Firebase...', '#ffa500');
      setTimeout(tryInit, 500);
      return;
    }
    if (!window.tripModule?.getCurrentTrip) {
      debug('⏳ Waiting for tripModule...', '#ffa500');
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

  debug('📦 Script loaded', '#0f0');

})();
