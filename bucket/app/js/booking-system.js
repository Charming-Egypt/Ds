// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// Complete - Custom Phone Input + Modal Country Selector
// Fixed: Error below input + Auto-load phone from database
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // STATE
  // ==========================================================================
  let refNumber = '';
  let selectedTripType = '';
  let currentStep = 0;
  let toastTimer = null;
  
  // Phone state
  let selectedCountryCode = '+20';
  let selectedCountryName = 'Egypt';
  let selectedCountryFlag = 'https://flagcdn.com/w40/eg.png';
  let countryModalOpen = false;

  // ==========================================================================
  // COUNTRIES DATA
  // ==========================================================================
  const countries = [
    { code: '+20', name: 'Egypt', flag: 'https://flagcdn.com/w40/eg.png' },
    { code: '+44', name: 'United Kingdom', flag: 'https://flagcdn.com/w40/gb.png' },
    { code: '+1', name: 'United States', flag: 'https://flagcdn.com/w40/us.png' },
    { code: '+49', name: 'Germany', flag: 'https://flagcdn.com/w40/de.png' },
    { code: '+7', name: 'Russia', flag: 'https://flagcdn.com/w40/ru.png' },
    { code: '+90', name: 'Turkey', flag: 'https://flagcdn.com/w40/tr.png' },
    { code: '+39', name: 'Italy', flag: 'https://flagcdn.com/w40/it.png' },
    { code: '+966', name: 'Saudi Arabia', flag: 'https://flagcdn.com/w40/sa.png' },
    { code: '+971', name: 'UAE', flag: 'https://flagcdn.com/w40/ae.png' },
    { code: '+33', name: 'France', flag: 'https://flagcdn.com/w40/fr.png' },
    { code: '+34', name: 'Spain', flag: 'https://flagcdn.com/w40/es.png' },
    { code: '+31', name: 'Netherlands', flag: 'https://flagcdn.com/w40/nl.png' },
    { code: '+46', name: 'Sweden', flag: 'https://flagcdn.com/w40/se.png' },
    { code: '+41', name: 'Switzerland', flag: 'https://flagcdn.com/w40/ch.png' },
    { code: '+81', name: 'Japan', flag: 'https://flagcdn.com/w40/jp.png' },
    { code: '+86', name: 'China', flag: 'https://flagcdn.com/w40/cn.png' },
    { code: '+91', name: 'India', flag: 'https://flagcdn.com/w40/in.png' },
    { code: '+61', name: 'Australia', flag: 'https://flagcdn.com/w40/au.png' },
    { code: '+55', name: 'Brazil', flag: 'https://flagcdn.com/w40/br.png' },
    { code: '+52', name: 'Mexico', flag: 'https://flagcdn.com/w40/mx.png' },
    { code: '+48', name: 'Poland', flag: 'https://flagcdn.com/w40/pl.png' },
    { code: '+380', name: 'Ukraine', flag: 'https://flagcdn.com/w40/ua.png' },
    { code: '+40', name: 'Romania', flag: 'https://flagcdn.com/w40/ro.png' },
    { code: '+30', name: 'Greece', flag: 'https://flagcdn.com/w40/gr.png' },
    { code: '+32', name: 'Belgium', flag: 'https://flagcdn.com/w40/be.png' },
    { code: '+43', name: 'Austria', flag: 'https://flagcdn.com/w40/at.png' },
    { code: '+45', name: 'Denmark', flag: 'https://flagcdn.com/w40/dk.png' },
    { code: '+47', name: 'Norway', flag: 'https://flagcdn.com/w40/no.png' },
    { code: '+358', name: 'Finland', flag: 'https://flagcdn.com/w40/fi.png' },
    { code: '+351', name: 'Portugal', flag: 'https://flagcdn.com/w40/pt.png' },
  ];

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

  function toast(msg, type) {
    if (toastTimer) clearTimeout(toastTimer);
    
    const old = document.querySelector('.bs-toast');
    if (old) old.remove();
    
    const t = document.createElement('div');
    t.className = 'bs-toast';
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#22c55e') + ';white-space:nowrap;opacity:1;transition:opacity 0.3s;';
    t.textContent = (type === 'error' ? '❌ ' : '✅ ') + msg;
    document.body.appendChild(t);
    
    toastTimer = setTimeout(function() {
      t.style.opacity = '0';
      setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
    }, 3000);
  }

  function showFieldError(inputId, msg) {
    // Remove existing error for this field
    const existing = document.querySelector('.field-error[data-field="' + inputId + '"]');
    if (existing) existing.remove();
    
    const input = $(inputId);
    if (!input) return;
    
    // Reset border
    input.style.borderColor = '#ef4444';
    
    // Find the phone wrapper if it's the phone field
    let targetParent = input.parentNode;
    if (inputId === 'phone') {
      targetParent = input.closest('.input-group') || targetParent;
    }
    
    // Create error element
    const error = document.createElement('div');
    error.className = 'field-error';
    error.setAttribute('data-field', inputId);
    error.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg;
    
    // Insert error AFTER the parent (phone wrapper or input group)
    if (inputId === 'phone') {
      const phoneWrapper = input.closest('.phone-input-wrapper');
      if (phoneWrapper) {
        phoneWrapper.after(error);
      } else {
        targetParent.appendChild(error);
      }
    } else {
      targetParent.appendChild(error);
    }
    
    // Remove error when user types
    input.addEventListener('input', function() {
      input.style.borderColor = '';
      if (error.parentNode) error.remove();
    }, { once: true });
  }

  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(e) { e.remove(); });
    document.querySelectorAll('.input-field, .phone-number-input').forEach(function(e) { e.style.borderColor = ''; });
  }

  function getPhoneNumber() {
    const phoneEl = $('phone');
    const phone = phoneEl ? toStr(phoneEl.value) : '';
    return selectedCountryCode + phone;
  }

  // ==========================================================================
  // COUNTRY MODAL
  // ==========================================================================
  function createCountryModal() {
    const existing = document.getElementById('countryModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'countryModal';
    modal.className = 'country-modal';
    modal.innerHTML = `
      <div class="country-modal-overlay"></div>
      <div class="country-modal-container">
        <div class="country-modal-header">
          <h3>🌍 Select Country</h3>
          <button class="country-modal-close" id="countryModalClose">&times;</button>
        </div>
        <input type="text" class="country-modal-search" id="countryModalSearch" placeholder="Search country..." />
        <div class="country-modal-list" id="countryModalList"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.country-modal-overlay').addEventListener('click', closeCountryModal);
    document.getElementById('countryModalClose').addEventListener('click', closeCountryModal);
    document.getElementById('countryModalSearch').addEventListener('input', function() {
      renderCountryList(this.value);
    });
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeCountryModal();
    });
  }

  function openCountryModal() {
    createCountryModal();
    const modal = document.getElementById('countryModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      renderCountryList('');
      setTimeout(function() {
        const search = document.getElementById('countryModalSearch');
        if (search) search.focus();
      }, 300);
    }
  }

  function closeCountryModal() {
    const modal = document.getElementById('countryModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function renderCountryList(filter) {
    const list = document.getElementById('countryModalList');
    if (!list) return;
    
    const filtered = filter ? countries.filter(function(c) {
      return c.name.toLowerCase().indexOf(filter.toLowerCase()) > -1 || c.code.indexOf(filter) > -1;
    }) : countries;
    
    list.innerHTML = '';
    
    filtered.forEach(function(country) {
      const div = document.createElement('div');
      div.className = 'country-modal-item' + (country.code === selectedCountryCode ? ' selected' : '');
      div.innerHTML = `
        <img src="${country.flag}" alt="${country.name}" class="country-modal-flag" />
        <span class="country-modal-name">${country.name}</span>
        <span class="country-modal-code">${country.code}</span>
      `;
      div.addEventListener('click', function() {
        selectCountry(country);
      });
      list.appendChild(div);
    });
  }

  function selectCountry(country) {
    selectedCountryCode = country.code;
    selectedCountryName = country.name;
    selectedCountryFlag = country.flag;
    
    const selectedCountry = document.getElementById('selectedCountry');
    if (selectedCountry) {
      selectedCountry.querySelector('img').src = country.flag;
      selectedCountry.querySelector('img').alt = country.name;
      selectedCountry.querySelector('span').textContent = country.code;
    }
    
    closeCountryModal();
  }

  // ==========================================================================
  // PARSE PHONE NUMBER - Extract code and number
  // ==========================================================================
  function parsePhoneNumber(fullPhone) {
    if (!fullPhone) return { code: '+20', number: '' };
    
    const phoneStr = String(fullPhone).trim();
    
    // Sort countries by code length (longest first) to match correctly
    const sortedCountries = [...countries].sort(function(a, b) {
      return b.code.length - a.code.length;
    });
    
    for (let i = 0; i < sortedCountries.length; i++) {
      if (phoneStr.startsWith(sortedCountries[i].code)) {
        return {
          code: sortedCountries[i].code,
          number: phoneStr.substring(sortedCountries[i].code.length)
        };
      }
    }
    
    // If no country code found, return default
    return { code: '+20', number: phoneStr };
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
    
    const phone = toStr($('phone')?.value);
    if (!phone || phone.length < 7) {
      showFieldError('phone', 'Please enter a valid phone number');
      valid = false;
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
      
      const phone = getPhoneNumber();
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
  // LOAD USER DATA - Fixed: Parse phone number correctly
  // ==========================================================================
  async function loadUserData() {
    if (!auth?.currentUser) return;
    try {
      const snap = await db.ref('egy_user/' + auth.currentUser.uid).once('value');
      const d = snap.val();
      if (!d) return;
      
      if (d.username) { 
        const e = $('username'); 
        if (e) e.value = String(d.username); 
      }
      
      if (d.email) { 
        const e = $('customerEmail'); 
        if (e) e.value = String(d.email); 
      }
      
      // Load phone number: parse country code and number
      if (d.phone) {
        const fullPhone = String(d.phone).trim();
        const parsed = parsePhoneNumber(fullPhone);
        
        // Set country code
        selectedCountryCode = parsed.code;
        
        // Find country info
        const country = countries.find(function(c) { return c.code === parsed.code; });
        if (country) {
          selectedCountryName = country.name;
          selectedCountryFlag = country.flag;
          
          // Update display
          const selectedCountry = document.getElementById('selectedCountry');
          if (selectedCountry) {
            selectedCountry.querySelector('img').src = country.flag;
            selectedCountry.querySelector('img').alt = country.name;
            selectedCountry.querySelector('span').textContent = country.code;
          }
        }
        
        // Set phone number
        const phoneInput = $('phone');
        if (phoneInput) {
          phoneInput.value = parsed.number;
        }
      }
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
    
    // Country selector - open modal on click
    const countryCodeSelect = $('countryCodeSelect');
    if (countryCodeSelect) {
      countryCodeSelect.addEventListener('click', function(e) {
        e.stopPropagation();
        openCountryModal();
      });
    }
    
    // Date picker
    const dateEl = document.querySelector('#tripDate');
    if (dateEl && typeof flatpickr !== 'undefined') {
      flatpickr(dateEl, { minDate: new Date().fp_incr(1), dateFormat: 'Y-m-d', disableMobile: true });
    }
    
    // Bind navigation
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    document.querySelectorAll('[data-stepper]').forEach(function(b) {
      b.onclick = function() { stepper(this.getAttribute('data-stepper'), parseInt(this.getAttribute('data-delta'))); };
    });
    
    // Bind submit
    const sb = $('submitBtn'); if (sb) sb.onclick = submitBooking;
    
    // Bind services
    const sv = $('openServicesBtn'); if (sv) sv.onclick = openServicesPopup;
    const cb = $('confirmServicesBtn'); if (cb) cb.onclick = confirmService;
    const cl = $('cancelServicesBtn'); if (cl) cl.onclick = closeServicesPopup;
    
    // Close popup
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(function(b) { b.onclick = closeServicesPopup; });
    const ov = document.querySelector('#extraServicesPopup .services-popup-overlay'); if (ov) ov.onclick = closeServicesPopup;
    
    // Escape key
    document.addEventListener('keydown', function(e) { 
      if (e.key === 'Escape') {
        closeServicesPopup();
        closeCountryModal();
      }
    });
    
    // Auth state
    auth.onAuthStateChanged(function(user) { if (user) setTimeout(loadUserData, 500); });
    
    // Initial summary
    setTimeout(updateSummary, 1500);
  }

  // ==========================================================================
  // PUBLIC API
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
    updateSummary: updateSummary,
    getRef: function() { return refNumber; },
    getPhone: getPhoneNumber
  };

  // ==========================================================================
  // AUTO START
  // ==========================================================================
  function tryInit() {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
      setTimeout(tryInit, 500);
      return;
    }
    init();
  }
  
  setTimeout(tryInit, 800);

})();
