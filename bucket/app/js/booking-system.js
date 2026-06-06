// ==========================================================================
// DISCOVER SHARM - Unified Booking & Payment System
// Clean Version - No Duplicate Events - Guaranteed Working
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
  let isInitialized = false;
  
  const MAX_PER_TYPE = 10;
  const MAX_INFANTS_PER_ADULT = 2;
  const MAX_TOTAL_INFANTS = 10;
  const TOTAL_STEPS = 4;

  // ==========================================================================
  // UTILITY
  // ==========================================================================
  function generateRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = 'DS-';
    for (let i = 0; i < 10; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
  }

  function sanitize(s) {
    return s ? String(s).replace(/[<>]/g, '').trim() : '';
  }

  function toast(msg, type) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#252526;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#22c55e') + ';white-space:nowrap;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 4000);
  }

  function showSpinner() {
    const s = document.getElementById('spinner');
    if (s) s.classList.remove('hidden');
  }

  function hideSpinner() {
    const s = document.getElementById('spinner');
    if (s) s.classList.add('hidden');
  }

  // ==========================================================================
  // TRIP DATA HELPERS
  // ==========================================================================
  function getTrip() {
    return (window.tripModule && window.tripModule.getCurrentTrip) ? window.tripModule.getCurrentTrip() : {};
  }

  function getTourTypes() {
    return (window.tripModule && window.tripModule.getTourTypes) ? window.tripModule.getTourTypes() : {};
  }

  function getTripOwner() {
    return (window.tripModule && window.tripModule.getTripOwnerId) ? window.tripModule.getTripOwnerId() : '';
  }

  function getTripId() {
    return (window.tripModule && window.tripModule.getTripPName) ? window.tripModule.getTripPName() : (new URLSearchParams(location.search).get('trip-id') || '');
  }

  function fmtPrice(p) {
    return (window.tripModule && window.tripModule.formatPrice) ? window.tripModule.formatPrice(p) : parseFloat(p).toFixed(2) + ' EGP';
  }

  // ==========================================================================
  // DOM GETTERS (always fresh from document)
  // ==========================================================================
  function el(id) { return document.getElementById(id); }

  function adults() { return parseInt(el('adults')?.value) || 0; }
  function children() { return parseInt(el('childrenUnder12')?.value) || 0; }
  function infants() { return parseInt(el('infants')?.value) || 0; }

  // ==========================================================================
  // PRICE MATH
  // ==========================================================================
  function calcBase() {
    const t = getTrip();
    if (!t.basePrice) return 0;
    const ap = parseFloat(t.basePrice);
    const cp = parseFloat(t.cprice) || ap * 0.5;
    return +((adults() * ap) + (children() * cp)).toFixed(2);
  }

  function calcExtra() {
    const tt = getTourTypes();
    if (selectedTripType && tt[selectedTripType]) {
      return +(((adults() + children()) * parseFloat(tt[selectedTripType])).toFixed(2));
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
    const inp = el(id);
    if (!inp) return;
    let v = parseInt(inp.value) || 0;
    const max = (id === 'infants') ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
    const min = (id === 'adults') ? 1 : 0;
    v = Math.max(min, Math.min(max, v + delta));
    inp.value = v;
    if (id === 'adults') {
      const inf = el('infants');
      if (inf) {
        const maxInf = Math.min(v * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
        if (parseInt(inf.value) > maxInf) inf.value = maxInf;
      }
    }
    updateSummary();
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function updateSummary() {
    const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
    set('summaryRef', refNumber);
    set('summaryTour', getTrip().name || '-');
    set('summaryDate', el('tripDate')?.value || '-');
    set('summaryHotel', sanitize(el('hotelName')?.value) || '-');
    set('summaryRoom', sanitize(el('roomNumber')?.value) || '-');
    set('summaryAdults', adults() + ' Adult' + (adults() !== 1 ? 's' : ''));
    set('summaryChildrenUnder12', children() + ' Child' + (children() !== 1 ? 'ren' : ''));
    set('summaryInfants', infants() + ' Infant' + (infants() !== 1 ? 's' : ''));
    set('summaryService', selectedTripType || 'None');

    const td = el('totalPriceDisplay');
    if (td && getTrip().basePrice) {
      td.innerHTML = fmtPrice(calcNet()) +
        '<div style="font-size:11px;color:#a0a0a0;margin-top:8px;">' +
        '<div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;margin-top:4px;">' +
        '<span>+ Taxes:</span><span>' + fmtPrice(calcTax()) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;font-weight:700;">' +
        '<span>Total:</span><span>' + fmtPrice(calcTotal()) + '</span></div></div>';
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  function goToStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    const next = document.querySelector('.form-step[data-step="' + step + '"]');
    if (next) next.classList.add('active');
    
    currentStep = step;
    
    // Progress bar
    const pb = el('progressBar');
    if (pb) pb.style.width = ((step + 1) / TOTAL_STEPS * 100) + '%';
    
    // Labels
    document.querySelectorAll('.steps-labels .step-label').forEach((l, i) => {
      l.classList.toggle('active', i === step);
    });
    
    if (step === 3) updateSummary();
  }

  function validateStep0() {
    if (!el('username')?.value.trim()) { toast('Enter your full name', 'error'); el('username')?.focus(); return false; }
    const em = el('customerEmail')?.value.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast('Valid email required', 'error'); el('customerEmail')?.focus(); return false; }
    if (iti) {
      if (!iti.getNumber() || !iti.isValidNumber()) { toast('Valid phone with country code required', 'error'); return false; }
    } else {
      const ph = el('phone')?.value.trim();
      if (!ph || ph.length < 8) { toast('Valid phone required', 'error'); el('phone')?.focus(); return false; }
    }
    return true;
  }

  function validateStep1() {
    if (!el('tripDate')?.value.trim()) { toast('Pick a date', 'error'); return false; }
    if (!el('hotelName')?.value.trim()) { toast('Enter hotel name', 'error'); el('hotelName')?.focus(); return false; }
    if (!el('roomNumber')?.value.trim()) { toast('Enter room number', 'error'); el('roomNumber')?.focus(); return false; }
    return true;
  }

  function nextStep() {
    if (currentStep === 0 && !validateStep0()) return;
    if (currentStep === 1 && !validateStep1()) return;
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
    const popup = el('extraServicesPopup');
    const content = el('servicesPopupContent');
    if (!popup || !content) return;
    
    tempService = selectedTripType;
    content.innerHTML = '';
    
    // No service
    buildServiceOpt('No extra services', 'Free', '');
    
    // Tour types
    const tt = getTourTypes();
    Object.keys(tt || {}).forEach(k => {
      buildServiceOpt(k, fmtPrice(tt[k]) + ' per person', k);
    });
    
    popup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function buildServiceOpt(name, price, value) {
    const content = el('servicesPopupContent');
    if (!content) return;
    
    const div = document.createElement('div');
    div.className = 'service-option' + (tempService === value ? ' selected' : '');
    div.innerHTML = '<div class="service-option-info"><div class="service-option-name">' + name + '</div><div class="service-option-price">' + price + '</div></div><div class="service-option-check"></div>';
    
    div.onclick = function() {
      tempService = value;
      content.querySelectorAll('.service-option').forEach(o => o.classList.remove('selected'));
      div.classList.add('selected');
    };
    
    content.appendChild(div);
  }

  function confirmService() {
    selectedTripType = tempService;
    const tt = el('tripType'); if (tt) tt.value = selectedTripType;
    const st = el('selectedServiceText'); if (st) st.textContent = selectedTripType || 'No extra services';
    closeServicesPopup();
    updateSummary();
  }

  function closeServicesPopup() {
    const popup = el('extraServicesPopup');
    if (popup) popup.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // SUBMIT
  // ==========================================================================
  async function submitBooking() {
    showSpinner();
    
    try {
      if (!auth || !auth.currentUser) {
        throw new Error('Please sign in first');
      }
      
      const user = auth.currentUser;
      const trip = getTrip();
      const tripId = getTripId();
      const ownerId = getTripOwner();
      
      let phoneNumber = '';
      if (iti) phoneNumber = iti.getNumber();
      if (!phoneNumber) phoneNumber = el('phone')?.value?.trim() || '';
      
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      const booking = {
        refNumber: refNumber,
        username: sanitize(el('username')?.value),
        email: sanitize(el('customerEmail')?.value),
        phone: phoneNumber,
        tour: trip.name || '',
        tripId: tripId,
        tripDate: el('tripDate')?.value || '',
        adults: adults(),
        childrenUnder12: children(),
        infants: infants(),
        hotelName: sanitize(el('hotelName')?.value),
        roomNumber: sanitize(el('roomNumber')?.value),
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
      
      // Get hash from worker
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
        throw new Error('Payment error: ' + txt);
      }
      
      const data = await resp.json();
      if (!data.hash) throw new Error('No payment hash');
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: total,
        currency: 'EGP',
        hash: data.hash,
        mode: 'live',
        merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
        failureRedirect: 'false',
        redirectMethod: 'get'
      }).toString();
      
      // Save to Firebase
      await db.ref('trip-bookings/' + refNumber).set({
        ...booking,
        paymenturl: paymentUrl
      });
      
      // Notify owner
      if (ownerId && ownerId !== user.uid) {
        await db.ref('notifications/' + ownerId + '/' + Date.now()).set({
          title: 'New Booking: ' + (trip.name || 'Trip'),
          message: booking.username + ' - ' + adults() + 'A/' + children() + 'C/' + infants() + 'I',
          totalAmount: net,
          bookingId: refNumber,
          tripId: tripId,
          tripName: trip.name || '',
          userName: booking.username,
          userEmail: booking.email,
          phone: booking.phone,
          adults: adults(),
          children: children(),
          infants: infants(),
          tripDate: booking.tripDate,
          read: false,
          timestamp: Date.now(),
          type: 'new_booking'
        });
      }
      
      // Session storage
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      sessionStorage.setItem('refNumber', refNumber);
      
      toast('Redirecting to payment...', 'success');
      
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1500);
      
    } catch (e) {
      console.error('Booking error:', e);
      toast('Error: ' + e.message, 'error');
      hideSpinner();
    }
  }

  // ==========================================================================
  // POPULATE USER DATA
  // ==========================================================================
  async function loadUserData() {
    try {
      if (!auth?.currentUser) return;
      const snap = await db.ref('egy_user/' + auth.currentUser.uid).once('value');
      const d = snap.val();
      if (!d) return;
      
      if (d.username) {
        const u = el('username'); if (u) u.value = d.username;
      }
      if (d.email) {
        const e = el('customerEmail'); if (e) e.value = d.email;
      }
      if (d.phone) {
        if (iti) {
          iti.setNumber(d.phone);
        } else {
          const p = el('phone'); if (p) p.value = d.phone;
        }
      }
      console.log('✅ User data loaded');
    } catch (e) {
      console.warn('User data load failed:', e);
    }
  }

  // ==========================================================================
  // MOBILE BOOKING
  // ==========================================================================
  function isMobile() {
    return window.innerWidth <= 768;
  }

  function moveBookingToMobile() {
    const mobileContainer = el('mobileBookingContainer');
    const mainCard = el('mainBookingCard');
    const mobileSection = el('mobileBookingSection');
    
    if (!mobileContainer || !mainCard || !mobileSection) return;
    
    if (isMobile()) {
      // Clone card to mobile
      mobileContainer.innerHTML = '';
      const clone = mainCard.cloneNode(true);
      clone.id = 'mobileBookingCard';
      mobileContainer.appendChild(clone);
      mobileSection.style.display = 'block';
      
      // Re-bind events on cloned elements
      bindMobileEvents();
    } else {
      mobileSection.style.display = 'none';
      mobileContainer.innerHTML = '';
    }
  }

  function bindMobileEvents() {
    const card = el('mobileBookingCard');
    if (!card) return;
    
    // Nav buttons
    card.querySelectorAll('[data-action="next"]').forEach(b => b.onclick = nextStep);
    card.querySelectorAll('[data-action="prev"]').forEach(b => b.onclick = prevStep);
    
    // Steppers
    card.querySelectorAll('[data-stepper]').forEach(b => {
      b.onclick = function() {
        stepper(this.dataset.stepper, parseInt(this.dataset.delta));
      };
    });
    
    // Submit
    const submit = card.querySelector('#submitBtn');
    if (submit) submit.onclick = submitBooking;
    
    // Services
    const svc = card.querySelector('#openServicesBtn');
    if (svc) svc.onclick = openServicesPopup;
  }

  function showMobileBooking() {
    moveBookingToMobile();
    const section = el('mobileBookingSection');
    if (section) {
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function init() {
    if (isInitialized) {
      console.warn('⚠️ BookingSystem already initialized');
      return;
    }
    
    const tripId = getTripId();
    if (!tripId) {
      console.warn('⚠️ No trip-id found');
      return;
    }
    
    isInitialized = true;
    refNumber = generateRef();
    
    // Set trip name
    const trip = getTrip();
    const tn = el('tripName');
    if (tn && trip.name) tn.value = trip.name;
    
    // Phone input
    const phoneEl = el('phone');
    if (phoneEl && window.intlTelInput) {
      iti = window.intlTelInput(phoneEl, {
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it', 'sa'],
        separateDialCode: true,
        initialCountry: 'eg',
        nationalMode: false,
      });
      console.log('✅ Phone input ready');
    }
    
    // Date picker
    const dateEl = el('tripDate');
    if (dateEl && window.flatpickr) {
      flatpickr(dateEl, {
        minDate: new Date().fp_incr(1),
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: updateSummary
      });
      console.log('✅ Date picker ready');
    }
    
    // Bind events (once)
    document.querySelectorAll('[data-action="next"]').forEach(b => b.onclick = nextStep);
    document.querySelectorAll('[data-action="prev"]').forEach(b => b.onclick = prevStep);
    document.querySelectorAll('[data-stepper]').forEach(b => {
      b.onclick = function() {
        stepper(this.dataset.stepper, parseInt(this.dataset.delta));
      };
    });
    
    const submitBtn = el('submitBtn');
    if (submitBtn) submitBtn.onclick = submitBooking;
    
    const servicesBtn = el('openServicesBtn');
    if (servicesBtn) servicesBtn.onclick = openServicesPopup;
    
    const confirmBtn = el('confirmServicesBtn');
    if (confirmBtn) confirmBtn.onclick = confirmService;
    
    const cancelBtn = el('cancelServicesBtn');
    if (cancelBtn) cancelBtn.onclick = closeServicesPopup;
    
    // Close popup buttons
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(b => {
      b.onclick = closeServicesPopup;
    });
    
    const overlay = document.querySelector('#extraServicesPopup .services-popup-overlay');
    if (overlay) overlay.onclick = closeServicesPopup;
    
    // Mobile book now
    const mobileBtn = el('mobileBookNowBtn');
    if (mobileBtn) mobileBtn.onclick = showMobileBooking;
    
    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeServicesPopup();
    });
    
    // Mobile layout
    moveBookingToMobile();
    window.addEventListener('resize', moveBookingToMobile);
    
    // Auth
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged(function(user) {
        if (user) loadUserData();
      });
    }
    
    // Initial summary
    setTimeout(updateSummary, 1500);
    
    console.log('✅ BookingSystem Ready - Ref:', refNumber);
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
    getRef: function() { return refNumber; },
    getTripType: function() { return selectedTripType; },
    getPhone: function() { return iti ? iti.getNumber() : ''; },
    updateSummary: updateSummary
  };

  // Auto init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 1000);
    });
  } else {
    setTimeout(init, 1000);
  }

  console.log('📦 Booking System module loaded');
})();
