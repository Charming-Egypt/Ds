// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// Complete - Payment Inside Card + Status Inside Card
// Booking saved ONLY after successful payment
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
  let pendingBooking = null; // Store booking data until payment confirmed
  let paymentPollingInterval = null;
  let savedPaymentUrl = null;
  
  // Phone state
  let selectedCountryCode = '+20';
  let selectedCountryName = 'Egypt';
  let selectedCountryFlag = 'https://flagcdn.com/w40/eg.png';

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
  function toStr(v) { if (v === null || v === undefined) return ''; return String(v).trim(); }
  function clean(v) { return toStr(v).replace(/[<>]/g, ''); }
  function generateRef() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = 'DS-'; for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length)); return r; }
  
  function toast(msg, type) {
    if (toastTimer) clearTimeout(toastTimer);
    const old = document.querySelector('.bs-toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'bs-toast';
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#22c55e') + ';white-space:nowrap;opacity:1;transition:opacity 0.3s;';
    t.textContent = (type === 'error' ? '❌ ' : '✅ ') + msg;
    document.body.appendChild(t);
    toastTimer = setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { if (t.parentNode) t.remove(); }, 300); }, 3000);
  }

  function showFieldError(inputId, msg) {
    const existing = document.querySelector('.field-error[data-field="' + inputId + '"]'); if (existing) existing.remove();
    const input = $(inputId); if (!input) return;
    input.style.borderColor = '#ef4444';
    const error = document.createElement('div'); error.className = 'field-error'; error.setAttribute('data-field', inputId);
    error.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg;
    if (inputId === 'phone') { const pw = input.closest('.phone-input-wrapper'); if (pw) { pw.after(error); } else { input.closest('.input-group').appendChild(error); } }
    else { input.parentNode.appendChild(error); }
    input.addEventListener('input', function() { input.style.borderColor = ''; if (error.parentNode) error.remove(); }, { once: true });
  }

  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(e) { e.remove(); });
    document.querySelectorAll('.input-field, .phone-number-input').forEach(function(e) { e.style.borderColor = ''; });
  }

  function getPhoneNumber() { const pe = $('phone'); return selectedCountryCode + (pe ? toStr(pe.value) : ''); }

  // ==========================================================================
  // COUNTRY MODAL (Same as before)
  // ==========================================================================
  function createCountryModal() {
    const existing = document.getElementById('countryModal'); if (existing) existing.remove();
    const modal = document.createElement('div'); modal.id = 'countryModal'; modal.className = 'country-modal';
    modal.innerHTML = '<div class="country-modal-overlay"></div><div class="country-modal-container"><div class="country-modal-header"><h3>🌍 Select Country</h3><button class="country-modal-close" id="countryModalClose">&times;</button></div><input type="text" class="country-modal-search" id="countryModalSearch" placeholder="Search country..." /><div class="country-modal-list" id="countryModalList"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.country-modal-overlay').addEventListener('click', closeCountryModal);
    document.getElementById('countryModalClose').addEventListener('click', closeCountryModal);
    document.getElementById('countryModalSearch').addEventListener('input', function() { renderCountryList(this.value); });
  }
  function openCountryModal() { createCountryModal(); const m = document.getElementById('countryModal'); if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; renderCountryList(''); setTimeout(function() { const s = document.getElementById('countryModalSearch'); if (s) s.focus(); }, 300); } }
  function closeCountryModal() { const m = document.getElementById('countryModal'); if (m) m.style.display = 'none'; document.body.style.overflow = ''; }
  function renderCountryList(filter) {
    const list = document.getElementById('countryModalList'); if (!list) return;
    const filtered = filter ? countries.filter(function(c) { return c.name.toLowerCase().indexOf(filter.toLowerCase()) > -1 || c.code.indexOf(filter) > -1; }) : countries;
    list.innerHTML = '';
    filtered.forEach(function(c) { const d = document.createElement('div'); d.className = 'country-modal-item' + (c.code === selectedCountryCode ? ' selected' : ''); d.innerHTML = '<img src="' + c.flag + '" alt="' + c.name + '" class="country-modal-flag" /><span class="country-modal-name">' + c.name + '</span><span class="country-modal-code">' + c.code + '</span>'; d.addEventListener('click', function() { selectCountry(c); }); list.appendChild(d); });
  }
  function selectCountry(c) { selectedCountryCode = c.code; selectedCountryName = c.name; selectedCountryFlag = c.flag; const sc = document.getElementById('selectedCountry'); if (sc) { sc.querySelector('img').src = c.flag; sc.querySelector('span').textContent = c.code; } closeCountryModal(); }

  function parsePhoneNumber(fullPhone) {
    if (!fullPhone) return { code: '+20', number: '' };
    const ps = String(fullPhone).trim();
    const sorted = [...countries].sort(function(a, b) { return b.code.length - a.code.length; });
    for (let i = 0; i < sorted.length; i++) { if (ps.startsWith(sorted[i].code)) return { code: sorted[i].code, number: ps.substring(sorted[i].code.length) }; }
    return { code: '+20', number: ps };
  }

  // ==========================================================================
  // TRIP DATA
  // ==========================================================================
  function getTrip() { try { return (window.tripModule?.getCurrentTrip?.()) || {}; } catch(e) { return {}; } }
  function getTourTypes() { try { return (window.tripModule?.getTourTypes?.()) || {}; } catch(e) { return {}; } }
  function getOwnerId() { try { return toStr(window.tripModule?.getTripOwnerId?.()); } catch(e) { return ''; } }
  function getTripId() { try { return toStr(window.tripModule?.getTripPName?.()); } catch(e) { return ''; } }
  function fmtPrice(p) { try { return window.tripModule?.formatPrice?.(p) || (parseFloat(p)||0).toFixed(2) + ' EGP'; } catch(e) { return (parseFloat(p)||0).toFixed(2) + ' EGP'; } }

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
  function calcBase() { const t = getTrip(); const bp = parseFloat(t.basePrice) || 0; if (!bp) return 0; const cp = parseFloat(t.cprice) || bp * 0.5; return parseFloat(((adults() * bp) + (children() * cp)).toFixed(2)); }
  function calcExtra() { const tt = getTourTypes(); if (selectedTripType && tt[selectedTripType]) { return parseFloat(((adults() + children()) * parseFloat(tt[selectedTripType])).toFixed(2)); } return 0; }
  function calcNet() { return parseFloat((calcBase() + calcExtra()).toFixed(2)); }
  function calcTax() { const n = calcNet(); return parseFloat((n * 0.03 + n * 0.03 * 0.14 + 3).toFixed(2)); }
  function calcTotal() { return parseFloat((calcNet() + calcTax()).toFixed(2)); }

  // ==========================================================================
  // STEPPER
  // ==========================================================================
  function stepper(id, delta) { const inp = $(id); if (!inp) return; let v = parseInt(inp.value) || 0; const max = id === 'infants' ? 2 : 10; const min = id === 'adults' ? 1 : 0; v = Math.max(min, Math.min(max, v + delta)); inp.value = v; if (currentStep === 3) updateSummary(); }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function setText(id, val) { const e = $(id); if (e) e.textContent = toStr(val); }
  function updateSummary() {
    setText('summaryRef', refNumber); setText('summaryTour', getTrip().name || '-'); setText('summaryDate', $('tripDate')?.value || '-'); setText('summaryHotel', clean($('hotelName')?.value) || '-'); setText('summaryRoom', clean($('roomNumber')?.value) || '-');
    setText('summaryAdults', adults() + ' Adult' + (adults() !== 1 ? 's' : '')); setText('summaryChildrenUnder12', children() + ' Child' + (children() !== 1 ? 'ren' : '')); setText('summaryInfants', infants() + ' Infant' + (infants() !== 1 ? 's' : '')); setText('summaryService', selectedTripType || 'None');
    const td = $('totalPriceDisplay');
    if (td && getTrip().basePrice) { td.innerHTML = fmtPrice(calcNet()) + '<div style="font-size:11px;color:#a0a0a0;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;"><span>+ Taxes:</span><span>' + fmtPrice(calcTax()) + '</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;color:#f59e0b;font-weight:700;"><span>Total:</span><span>' + fmtPrice(calcTotal()) + '</span></div></div>'; }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  function goToStep(n) {
    clearAllFieldErrors();
    document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
    const tgt = document.querySelector('.form-step[data-step="' + n + '"]'); if (tgt) tgt.classList.add('active');
    currentStep = n;
    const pb = $('progressBar'); if (pb) pb.style.width = ((n + 1) / 4 * 100) + '%';
    document.querySelectorAll('.steps-labels .step-label').forEach(function(l, i) { l.classList.toggle('active', i === n); });
    if (n === 3) updateSummary();
  }

  function validateStep1() {
    clearAllFieldErrors(); let valid = true;
    if (!toStr($('username')?.value)) { showFieldError('username', 'Please enter your full name'); valid = false; }
    const em = toStr($('customerEmail')?.value); if (!em || em.indexOf('@') < 0 || em.indexOf('.') < 0) { showFieldError('customerEmail', 'Please enter a valid email address'); valid = false; }
    const phone = toStr($('phone')?.value); if (!phone || phone.length < 7) { showFieldError('phone', 'Please enter a valid phone number'); valid = false; }
    return valid;
  }
  function validateStep2() {
    clearAllFieldErrors(); let valid = true;
    if (!toStr($('tripDate')?.value)) { showFieldError('tripDate', 'Please select a date for your trip'); valid = false; }
    if (!toStr($('hotelName')?.value)) { showFieldError('hotelName', 'Please enter your hotel name'); valid = false; }
    if (!toStr($('roomNumber')?.value)) { showFieldError('roomNumber', 'Please enter your room number'); valid = false; }
    return valid;
  }
  function nextStep() { if (currentStep === 0 && !validateStep1()) return; if (currentStep === 1 && !validateStep2()) return; if (currentStep < 3) goToStep(currentStep + 1); }
  function prevStep() { if (currentStep > 0) goToStep(currentStep - 1); }

  // ==========================================================================
  // SERVICES POPUP
  // ==========================================================================
  let tempService = '';
  function openServicesPopup() {
    const popup = $('extraServicesPopup'), content = $('servicesPopupContent'); if (!popup || !content) return;
    tempService = selectedTripType; content.innerHTML = '';
    const nd = document.createElement('div'); nd.className = 'service-option' + (!tempService ? ' selected' : ''); nd.innerHTML = '<div class="service-option-info"><div class="service-option-name">No extra services</div><div class="service-option-price">Free</div></div><div class="service-option-check"></div>';
    nd.onclick = function() { tempService = ''; content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); }); nd.classList.add('selected'); }; content.appendChild(nd);
    const types = getTourTypes();
    Object.keys(types || {}).forEach(function(key) { const d = document.createElement('div'); d.className = 'service-option' + (tempService === key ? ' selected' : ''); d.innerHTML = '<div class="service-option-info"><div class="service-option-name">' + key + '</div><div class="service-option-price">' + fmtPrice(types[key]) + ' per person</div></div><div class="service-option-check"></div>'; d.onclick = function() { tempService = key; content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); }); d.classList.add('selected'); }; content.appendChild(d); });
    popup.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  }
  function confirmService() { selectedTripType = tempService; const tt = $('tripType'); if (tt) tt.value = selectedTripType; const st = $('selectedServiceText'); if (st) st.textContent = selectedTripType || 'No extra services'; closeServicesPopup(); updateSummary(); }
  function closeServicesPopup() { const popup = $('extraServicesPopup'); if (popup) popup.classList.add('hidden'); document.body.style.overflow = ''; }

  // ==========================================================================
  // PAYMENT IFRAME - Inside Card
  // ==========================================================================
  function showPaymentIframe(paymentUrl) {
    savedPaymentUrl = paymentUrl;
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    
    const originalContent = bookingCard.innerHTML;
    bookingCard.setAttribute('data-original-content', originalContent);
    bookingCard.classList.add('payment-mode');
    
    bookingCard.innerHTML = `
      <div class="payment-iframe-container">
        <div class="payment-iframe-header">
          <h3><i class="fas fa-lock"></i> Secure Payment</h3>
          <p>Complete your payment to confirm booking</p>
          <button class="payment-back-btn" id="paymentBackBtn"><i class="fas fa-arrow-left"></i> Back</button>
        </div>
        <div class="payment-iframe-wrapper">
          <iframe src="${paymentUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <div class="payment-iframe-footer">
          <small><i class="fas fa-shield-alt"></i> Secured by Kashier</small>
        </div>
      </div>
    `;
    
    document.getElementById('paymentBackBtn').addEventListener('click', hidePaymentIframe);
    
    // Start polling for payment status
    startPaymentPolling();
  }

  function hidePaymentIframe() {
    stopPaymentPolling();
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    const originalContent = bookingCard.getAttribute('data-original-content');
    if (originalContent) { bookingCard.innerHTML = originalContent; bookingCard.classList.remove('payment-mode'); bookingCard.removeAttribute('data-original-content'); initEvents(); }
  }

  // ==========================================================================
  // PAYMENT POLLING - Check payment-status.html result
  // ==========================================================================
  function startPaymentPolling() {
    if (paymentPollingInterval) clearInterval(paymentPollingInterval);
    
    paymentPollingInterval = setInterval(async function() {
      try {
        const snap = await db.ref('trip-bookings/' + refNumber).once('value');
        const booking = snap.val();
        
        if (booking) {
          if (booking.paymentStatus === 'paid') {
            stopPaymentPolling();
            // Save session data now
            sessionStorage.setItem('username', booking.username || '');
            sessionStorage.setItem('email', booking.email || '');
            sessionStorage.setItem('phone', booking.phone || '');
            sessionStorage.setItem('refNumber', refNumber);
            showPaymentSuccess(booking);
          } else if (booking.paymentStatus === 'failed') {
            stopPaymentPolling();
            showPaymentFailed();
          }
        }
      } catch(e) {}
    }, 3000);
  }

  function stopPaymentPolling() {
    if (paymentPollingInterval) { clearInterval(paymentPollingInterval); paymentPollingInterval = null; }
  }

  // ==========================================================================
  // PAYMENT SUCCESS
  // ==========================================================================
  function showPaymentSuccess(booking) {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    
    bookingCard.classList.add('payment-mode');
    
    bookingCard.innerHTML = `
      <div class="payment-status-container">
        <div class="payment-status-icon success"><i class="fas fa-check-circle"></i></div>
        <h2 class="payment-status-title">Payment Successful! 🎉</h2>
        <p class="payment-status-message">Your booking has been confirmed.</p>
        <div class="payment-status-details">
          <div class="payment-status-line"><span>Booking Ref:</span><strong>${refNumber}</strong></div>
          <div class="payment-status-line"><span>Trip:</span><strong>${booking.tour || getTrip().name || 'Trip'}</strong></div>
          <div class="payment-status-line"><span>Date:</span><strong>${booking.tripDate || '-'}</strong></div>
        </div>
        <p class="payment-status-note">A confirmation has been sent to your WhatsApp and email.</p>
        <button class="btn-primary" onclick="location.reload()"><i class="fas fa-check"></i> Done</button>
      </div>
    `;
  }

  // ==========================================================================
  // PAYMENT FAILED
  // ==========================================================================
  function showPaymentFailed() {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    
    bookingCard.classList.add('payment-mode');
    
    bookingCard.innerHTML = `
      <div class="payment-status-container">
        <div class="payment-status-icon failed"><i class="fas fa-times-circle"></i></div>
        <h2 class="payment-status-title">Payment Failed</h2>
        <p class="payment-status-message">Your payment could not be processed.</p>
        <button class="btn-primary" id="retryPaymentBtn" style="margin-bottom:10px;"><i class="fas fa-redo"></i> Try Again</button>
        <button class="btn-secondary" id="backToFormBtn"><i class="fas fa-arrow-left"></i> Edit Details</button>
      </div>
    `;
    
    document.getElementById('retryPaymentBtn').addEventListener('click', function() { submitBooking(); });
    document.getElementById('backToFormBtn').addEventListener('click', hidePaymentIframe);
  }

  // ==========================================================================
  // SUBMIT - DON'T SAVE TO FIREBASE UNTIL PAYMENT CONFIRMED
  // ==========================================================================
  async function submitBooking() {
    const spinner = $('spinner');
    const submitBtn = $('submitBtn');
    if (spinner) spinner.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
      if (typeof auth === 'undefined') throw new Error('Authentication not loaded.');
      if (!auth.currentUser) throw new Error('Please sign in.');
      
      const user = auth.currentUser, trip = getTrip(), tripId = getTripId() || (new URLSearchParams(location.search).get('trip-id') || ''), ownerId = getOwnerId();
      const phone = getPhoneNumber(), net = calcNet(), tax = calcTax(), total = calcTotal();
      
      // Build booking object but DON'T save to Firebase yet
      pendingBooking = {
        refNumber, username: clean($('username')?.value), email: clean($('customerEmail')?.value),
        phone, tour: toStr(trip.name), tripId, tripDate: toStr($('tripDate')?.value),
        adults: adults(), childrenUnder12: children(), infants: infants(),
        hotelName: clean($('hotelName')?.value), roomNumber: clean($('roomNumber')?.value),
        baseTotal: calcBase(), extraServicesTotal: calcExtra(), netTotal: net, total, taxes: tax,
        extraServices: selectedTripType || 'None',
        status: 'pending', resStatus: 'new', isPaid: false, paymentStatus: 'unpaid',
        uid: user.uid, owner: ownerId || user.uid, createdAt: Date.now(), updatedAt: Date.now()
      };
      
      // Get payment hash
      const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP' }) });
      if (!resp.ok) throw new Error('Payment service unavailable.');
      const hashData = await resp.json();
      if (!hashData.hash) throw new Error('Payment verification failed.');
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP',
        hash: hashData.hash, mode: 'live',
        merchantRedirect: window.location.origin + '/p/payment-status.html?ref=' + refNumber,
        failureRedirect: window.location.origin + '/p/payment-status.html?ref=' + refNumber,
        redirectMethod: 'get'
      }).toString();
      
      // Save ONLY to sessionStorage as backup (NOT to Firebase)
      sessionStorage.setItem('pendingBooking', JSON.stringify(pendingBooking));
      sessionStorage.setItem('username', pendingBooking.username);
      sessionStorage.setItem('email', pendingBooking.email);
      sessionStorage.setItem('phone', pendingBooking.phone);
      sessionStorage.setItem('refNumber', refNumber);
      
      if (spinner) spinner.classList.add('hidden');
      
      // Show payment inside card
      showPaymentIframe(paymentUrl);
      
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
      const snap = await db.ref('egy_user/' + auth.currentUser.uid).once('value'), d = snap.val(); if (!d) return;
      if (d.username) { const e = $('username'); if (e) e.value = String(d.username); }
      if (d.email) { const e = $('customerEmail'); if (e) e.value = String(d.email); }
      if (d.phone) { const parsed = parsePhoneNumber(String(d.phone).trim()); selectedCountryCode = parsed.code; const c = countries.find(function(x) { return x.code === parsed.code; }); if (c) { const sc = document.getElementById('selectedCountry'); if (sc) { sc.querySelector('img').src = c.flag; sc.querySelector('span').textContent = c.code; } } const pi = $('phone'); if (pi) pi.value = parsed.number; }
    } catch(e) {}
  }

  // ==========================================================================
  // EVENT BINDING
  // ==========================================================================
  function initEvents() {
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    document.querySelectorAll('[data-stepper]').forEach(function(b) { b.onclick = function() { stepper(this.getAttribute('data-stepper'), parseInt(this.getAttribute('data-delta'))); }; });
    const sb = $('submitBtn'); if (sb) sb.onclick = submitBooking;
    const sv = $('openServicesBtn'); if (sv) sv.onclick = openServicesPopup;
    const cb = $('confirmServicesBtn'); if (cb) cb.onclick = confirmService;
    const cl = $('cancelServicesBtn'); if (cl) cl.onclick = closeServicesPopup;
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(function(b) { b.onclick = closeServicesPopup; });
    const ov = document.querySelector('#extraServicesPopup .services-popup-overlay'); if (ov) ov.onclick = closeServicesPopup;
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function init() {
    const tripId = getTripId() || (new URLSearchParams(location.search).get('trip-id') || '');
    if (!tripId) { toast('No trip specified in URL', 'error'); return; }
    refNumber = generateRef();
    
    const trip = getTrip(); const tn = $('tripName'); if (tn && trip.name) tn.value = String(trip.name);
    const ccs = $('countryCodeSelect'); if (ccs) { ccs.addEventListener('click', function(e) { e.stopPropagation(); openCountryModal(); }); }
    const de = document.querySelector('#tripDate'); if (de && typeof flatpickr !== 'undefined') { flatpickr(de, { minDate: new Date().fp_incr(1), dateFormat: 'Y-m-d', disableMobile: true }); }
    initEvents();
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeServicesPopup(); closeCountryModal(); } });
    auth.onAuthStateChanged(function(user) { if (user) setTimeout(loadUserData, 500); });
    setTimeout(updateSummary, 1500);
  }

  window.BookingSystem = { init, nextStep, prevStep, stepper, openServices: openServicesPopup, closeServices: closeServicesPopup, confirmService, submit: submitBooking, updateSummary, getRef: function() { return refNumber; }, getPhone: getPhoneNumber };

  function tryInit() { if (typeof auth === 'undefined' || typeof db === 'undefined') { setTimeout(tryInit, 500); return; } init(); }
  setTimeout(tryInit, 800);

})();
