// ==========================================================================
// DISCOVER SHARM - Unified Booking & Payment System
// Single System for Desktop & Mobile
// Phone Input with Country Code - Fully Working
// ==========================================================================

const BookingSystem = (function() {
  'use strict';

  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================
  let _iti = null;
  let _refNumber = '';
  let _selectedTripType = '';
  let _currentStep = 0;
  
  const MAX_PER_TYPE = 10;
  const MAX_INFANTS_PER_ADULT = 2;
  const MAX_TOTAL_INFANTS = 10;
  const TOTAL_STEPS = 4;

  // ==========================================================================
  // DOM REFERENCES (cached on init)
  // ==========================================================================
  let $ = {};

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================
  function generateReference() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'DS-' + result;
  }

  function sanitizeInput(str) {
    if (!str) return '';
    return String(str).replace(/[<>]/g, '').trim();
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
      background:#252526;color:#fff;padding:14px 24px;border-radius:30px;
      z-index:99999;font-size:14px;font-weight:600;
      box-shadow:0 10px 40px rgba(0,0,0,0.5);
      border-left:4px solid ${type === 'success' ? '#22c55e' : '#ef4444'};
      white-space:nowrap;animation:bsSlideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function showSpinner() {
    if ($.spinner) $.spinner.classList.remove('hidden');
    if ($.submitBtn) $.submitBtn.disabled = true;
  }

  function hideSpinner() {
    if ($.spinner) $.spinner.classList.add('hidden');
    if ($.submitBtn) $.submitBtn.disabled = false;
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  // ==========================================================================
  // TRIP DATA ACCESS
  // ==========================================================================
  function getCurrentTrip() {
    return window.tripModule?.getCurrentTrip?.() || {};
  }

  function getTourTypes() {
    return window.tripModule?.getTourTypes?.() || {};
  }

  function getTripOwnerId() {
    return window.tripModule?.getTripOwnerId?.() || '';
  }

  function getTripPName() {
    return window.tripModule?.getTripPName?.() || 
           new URLSearchParams(window.location.search).get('trip-id') || '';
  }

  function formatPrice(price) {
    if (window.tripModule?.formatPrice) {
      return window.tripModule.formatPrice(price);
    }
    return parseFloat(price).toFixed(2) + ' EGP';
  }

  // ==========================================================================
  // STEPPER LOGIC
  // ==========================================================================
  function changeValue(id, delta) {
    const input = document.getElementById(id);
    if (!input) return;
    
    let val = parseInt(input.value) || 0;
    const max = (id === 'infants') ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
    const min = (id === 'adults') ? 1 : 0;
    
    val = Math.max(min, Math.min(max, val + delta));
    input.value = val;
    
    if (id === 'adults') updateInfantsMax();
    updateSummary();
  }

  function updateInfantsMax() {
    const adultsVal = parseInt($.adults?.value) || 0;
    const infantsVal = parseInt($.infants?.value) || 0;
    const maxInfants = Math.min(adultsVal * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
    
    if (infantsVal > maxInfants && $.infants) {
      $.infants.value = maxInfants;
    }
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================
  function getA() { return parseInt($.adults?.value) || 0; }
  function getC() { return parseInt($.childrenUnder12?.value) || 0; }
  function getI() { return parseInt($.infants?.value) || 0; }

  // ==========================================================================
  // PRICE CALCULATION
  // ==========================================================================
  function calcBase() {
    const trip = getCurrentTrip();
    if (!trip.basePrice) return 0;
    const adultPrice = parseFloat(trip.basePrice);
    const childPrice = parseFloat(trip.cprice) || (adultPrice * 0.5);
    return parseFloat(((getA() * adultPrice) + (getC() * childPrice)).toFixed(2));
  }

  function calcExtra() {
    const tourTypes = getTourTypes();
    if (_selectedTripType && tourTypes[_selectedTripType]) {
      return parseFloat(((getA() + getC()) * parseFloat(tourTypes[_selectedTripType])).toFixed(2));
    }
    return 0;
  }

  function calcNet() {
    return parseFloat((calcBase() + calcExtra()).toFixed(2));
  }

  function calcTax() {
    const net = calcNet();
    return parseFloat((net * 0.03 + net * 0.03 * 0.14 + 3).toFixed(2));
  }

  function calcTotal() {
    return parseFloat((calcNet() + calcTax()).toFixed(2));
  }

  // ==========================================================================
  // UPDATE SUMMARY DISPLAY
  // ==========================================================================
  function updateSummary() {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    setText('summaryRef', _refNumber);
    setText('summaryTour', getCurrentTrip().name || '-');
    setText('summaryDate', $.tripDate?.value || '-');
    setText('summaryHotel', sanitizeInput($.hotelName?.value) || '-');
    setText('summaryRoom', sanitizeInput($.roomNumber?.value) || '-');
    setText('summaryAdults', getA() + ' Adult' + (getA() !== 1 ? 's' : ''));
    setText('summaryChildrenUnder12', getC() + ' Child' + (getC() !== 1 ? 'ren' : ''));
    setText('summaryInfants', getI() + ' Infant' + (getI() !== 1 ? 's' : ''));
    setText('summaryService', _selectedTripType || 'None');

    if ($.totalPriceDisplay && getCurrentTrip().basePrice) {
      $.totalPriceDisplay.innerHTML = `
        ${formatPrice(calcNet())}
        <div style="font-size:11px;color:#a0a0a0;margin-top:8px;">
          <div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;margin-top:4px;">
            <span>+ Taxes & Fees:</span>
            <span>${formatPrice(calcTax())}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;font-weight:700;">
            <span>Total at Payment:</span>
            <span>${formatPrice(calcTotal())}</span>
          </div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // STEP NAVIGATION
  // ==========================================================================
  function navigateStep(direction) {
    // Hide current step
    const currentEl = document.querySelector(`.form-step[data-step="${_currentStep}"]`);
    if (currentEl) currentEl.classList.remove('active');

    // Update step index
    _currentStep += direction;

    // Show new step
    const nextEl = document.querySelector(`.form-step[data-step="${_currentStep}"]`);
    if (nextEl) nextEl.classList.add('active');

    // Update progress bar
    updateProgressBar();
    
    // Update summary on step 4
    if (_currentStep === 3) {
      updateSummary();
    }
  }

  function nextStep() {
    if (!validateStep()) return;
    navigateStep(1);
  }

  function prevStep() {
    if (_currentStep > 0) {
      navigateStep(-1);
    }
  }

  function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.width = ((_currentStep + 1) / TOTAL_STEPS * 100) + '%';
    }
    
    document.querySelectorAll('.steps-labels .step-label').forEach((label, i) => {
      label.classList.toggle('active', i === _currentStep);
    });
  }

  function validateStep() {
    if (_currentStep === 0) {
      // Validate name
      if (!$.username?.value?.trim()) {
        showToast('Please enter your full name', 'error');
        $.username?.focus();
        return false;
      }
      
      // Validate email
      const email = $.customerEmail?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address', 'error');
        $.customerEmail?.focus();
        return false;
      }
      
      // Validate phone with intl-tel-input
      if (_iti) {
        if (!_iti.getNumber() || !_iti.isValidNumber()) {
          showToast('Please enter a valid phone number with country code', 'error');
          return false;
        }
      } else {
        const phone = $.phone?.value?.trim();
        if (!phone || phone.length < 8) {
          showToast('Please enter a valid phone number', 'error');
          $.phone?.focus();
          return false;
        }
      }
    } else if (_currentStep === 1) {
      if (!$.tripDate?.value?.trim()) {
        showToast('Please select a trip date', 'error');
        return false;
      }
      if (!$.hotelName?.value?.trim()) {
        showToast('Please enter your hotel name', 'error');
        $.hotelName?.focus();
        return false;
      }
      if (!$.roomNumber?.value?.trim()) {
        showToast('Please enter your room number', 'error');
        $.roomNumber?.focus();
        return false;
      }
    }
    
    return true;
  }

  // ==========================================================================
  // MOBILE BOOKING CARD MANAGEMENT
  // ==========================================================================
  function moveBookingCardToMobile() {
    const mobileContainer = document.getElementById('mobileBookingContainer');
    const mainCard = document.getElementById('mainBookingCard');
    const mobileSection = document.getElementById('mobileBookingSection');
    
    if (!mobileContainer || !mainCard || !mobileSection) return;
    
    // Clone or move card
    if (isMobile()) {
      mobileContainer.innerHTML = '';
      const clone = mainCard.cloneNode(true);
      clone.id = 'mobileBookingCard';
      mobileContainer.appendChild(clone);
      mobileSection.style.display = 'block';
      
      // Re-cache elements for mobile
      cacheMobileElements();
      // Re-attach events for mobile
      attachAllEvents();
    } else {
      mobileSection.style.display = 'none';
      if (mobileContainer) mobileContainer.innerHTML = '';
    }
  }

  function cacheMobileElements() {
    // Update references to point to mobile elements if on mobile
    if (isMobile()) {
      const prefix = '#mobileBookingCard ';
      $.submitBtn = document.querySelector(prefix + '#submitBtn') || $.submitBtn;
      // ... other elements if needed
    }
  }

  function showMobileBooking() {
    const mobileSection = document.getElementById('mobileBookingSection');
    if (mobileSection) {
      moveBookingCardToMobile();
      setTimeout(() => {
        mobileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  // ==========================================================================
  // EXTRA SERVICES POPUP
  // ==========================================================================
  let _tempService = '';

  function openServicesPopup() {
    if (!$.extraServicesPopup || !$.servicesPopupContent) return;
    
    _tempService = _selectedTripType;
    $.servicesPopupContent.innerHTML = '';
    
    // No service option
    buildServiceOption('No extra services', 'Free', '');
    
    // Tour type options
    const tourTypes = getTourTypes();
    if (tourTypes && Object.keys(tourTypes).length > 0) {
      Object.keys(tourTypes).forEach(key => {
        buildServiceOption(key, formatPrice(tourTypes[key]) + ' per person', key);
      });
    }
    
    $.extraServicesPopup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function buildServiceOption(name, price, value) {
    if (!$.servicesPopupContent) return;
    
    const div = document.createElement('div');
    div.className = 'service-option' + (_tempService === value ? ' selected' : '');
    div.innerHTML = `
      <div class="service-option-info">
        <div class="service-option-name">${name}</div>
        <div class="service-option-price">${price}</div>
      </div>
      <div class="service-option-check"></div>
    `;
    
    div.addEventListener('click', () => {
      _tempService = value;
      document.querySelectorAll('#servicesPopupContent .service-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      div.classList.add('selected');
    });
    
    $.servicesPopupContent.appendChild(div);
  }

  function confirmServiceSelection() {
    _selectedTripType = _tempService;
    
    if ($.tripType) $.tripType.value = _selectedTripType;
    if ($.selectedServiceText) {
      $.selectedServiceText.textContent = _selectedTripType || 'No extra services';
    }
    
    closeServicesPopup();
    updateSummary();
  }

  function closeServicesPopup() {
    if ($.extraServicesPopup) {
      $.extraServicesPopup.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // SUBMISSION & PAYMENT
  // ==========================================================================
  async function submitForm() {
    showSpinner();
    
    try {
      if (!auth?.currentUser) {
        throw new Error('Please sign in to complete your booking');
      }
      
      const user = auth.currentUser;
      const trip = getCurrentTrip();
      const tripPName = getTripPName();
      const tripOwnerId = getTripOwnerId();
      
      // Get phone number
      let phoneNumber = '';
      if (_iti) {
        phoneNumber = _iti.getNumber();
      }
      if (!phoneNumber && $.phone) {
        phoneNumber = $.phone.value.trim();
      }
      
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      const booking = {
        refNumber: _refNumber,
        username: sanitizeInput($.username?.value || ''),
        email: sanitizeInput($.customerEmail?.value || ''),
        phone: phoneNumber,
        tour: trip.name || '',
        tripId: tripPName,
        tripDate: $.tripDate?.value || '',
        adults: getA(),
        childrenUnder12: getC(),
        infants: getI(),
        hotelName: sanitizeInput($.hotelName?.value || ''),
        roomNumber: sanitizeInput($.roomNumber?.value || ''),
        baseTotal: parseFloat(calcBase().toFixed(2)),
        extraServicesTotal: parseFloat(calcExtra().toFixed(2)),
        netTotal: parseFloat(net.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        taxes: parseFloat(tax.toFixed(2)),
        extraServices: _selectedTripType || 'None',
        status: 'pending',
        resStatus: 'new',
        isPaid: false,
        paymentStatus: 'unpaid',
        uid: user.uid,
        owner: tripOwnerId || user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Get payment hash
      const response = await fetch('https://kashier-hash.gm-093.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: 'MID-33260-3',
          orderId: _refNumber,
          amount: parseFloat(total.toFixed(2)),
          currency: 'EGP'
        })
      });
      
      if (!response.ok) throw new Error('Payment service unavailable');
      
      const data = await response.json();
      if (!data.hash) throw new Error('Invalid payment response');
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3',
        orderId: _refNumber,
        amount: parseFloat(total.toFixed(2)),
        currency: 'EGP',
        hash: data.hash,
        mode: 'live',
        merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
        failureRedirect: 'false',
        redirectMethod: 'get'
      }).toString();
      
      // Save booking
      await db.ref('trip-bookings/' + _refNumber).set({
        ...booking,
        paymenturl: paymentUrl
      });
      
      // Notify owner
      if (tripOwnerId && tripOwnerId !== user.uid) {
        await db.ref('notifications/' + tripOwnerId + '/' + Date.now()).set({
          title: 'New Booking: ' + (trip.name || 'Trip'),
          message: `${booking.username} - ${getA()}A/${getC()}C/${getI()}I`,
          totalAmount: parseFloat(net.toFixed(2)),
          bookingId: _refNumber,
          tripId: tripPName,
          tripName: trip.name || '',
          userName: booking.username,
          userEmail: booking.email,
          phone: booking.phone,
          adults: getA(),
          children: getC(),
          infants: getI(),
          tripDate: booking.tripDate,
          read: false,
          timestamp: Date.now(),
          type: 'new_booking'
        });
      }
      
      // Store session
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      sessionStorage.setItem('refNumber', _refNumber);
      
      showToast('Redirecting to payment gateway...', 'success');
      
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1500);
      
    } catch (error) {
      console.error('Booking error:', error);
      showToast('Error: ' + error.message, 'error');
      hideSpinner();
    }
  }

  // ==========================================================================
  // POPULATE FORM FROM USER PROFILE
  // ==========================================================================
  async function populateForm() {
    try {
      if (!auth?.currentUser) return;
      
      const user = auth.currentUser;
      const snap = await db.ref('egy_user/' + user.uid).once('value');
      const userData = snap.val();
      
      if (userData) {
        if ($.username && userData.username) {
          $.username.value = userData.username;
        }
        
        if ($.customerEmail && userData.email) {
          $.customerEmail.value = userData.email;
        }
        
        // Set phone number with country code
        if (userData.phone) {
          if (_iti) {
            _iti.setNumber(userData.phone);
          } else if ($.phone) {
            $.phone.value = userData.phone;
          }
        }
        
        console.log('✅ Form populated from user profile');
      }
    } catch (error) {
      console.warn('Could not populate form:', error);
    }
  }

  // ==========================================================================
  // ATTACH ALL EVENT LISTENERS
  // ==========================================================================
  function attachAllEvents() {
    // Navigation buttons
    document.querySelectorAll('[data-action="next"]').forEach(btn => {
      btn.removeEventListener('click', nextStep);
      btn.addEventListener('click', nextStep);
    });
    
    document.querySelectorAll('[data-action="prev"]').forEach(btn => {
      btn.removeEventListener('click', prevStep);
      btn.addEventListener('click', prevStep);
    });
    
    // Stepper buttons
    document.querySelectorAll('[data-stepper]').forEach(btn => {
      btn.removeEventListener('click', stepperHandler);
      btn.addEventListener('click', stepperHandler);
    });
    
    // Submit button
    if ($.submitBtn) {
      $.submitBtn.removeEventListener('click', submitForm);
      $.submitBtn.addEventListener('click', submitForm);
    }
    
    // Services button
    if ($.openServicesBtn) {
      $.openServicesBtn.removeEventListener('click', openServicesPopup);
      $.openServicesBtn.addEventListener('click', openServicesPopup);
    }
    
    // Services popup buttons
    if ($.confirmServicesBtn) {
      $.confirmServicesBtn.removeEventListener('click', confirmServiceSelection);
      $.confirmServicesBtn.addEventListener('click', confirmServiceSelection);
    }
    
    if ($.cancelServicesBtn) {
      $.cancelServicesBtn.removeEventListener('click', closeServicesPopup);
      $.cancelServicesBtn.addEventListener('click', closeServicesPopup);
    }
    
    // Close popup buttons
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(btn => {
      btn.removeEventListener('click', closeServicesPopup);
      btn.addEventListener('click', closeServicesPopup);
    });
    
    // Overlay click
    const overlay = document.querySelector('#extraServicesPopup .services-popup-overlay');
    if (overlay) {
      overlay.removeEventListener('click', closeServicesPopup);
      overlay.addEventListener('click', closeServicesPopup);
    }
    
    // Mobile book now button
    if ($.mobileBookNowBtn) {
      $.mobileBookNowBtn.removeEventListener('click', showMobileBooking);
      $.mobileBookNowBtn.addEventListener('click', showMobileBooking);
    }
    
    // Escape key
    document.removeEventListener('keydown', escapeHandler);
    document.addEventListener('keydown', escapeHandler);
    
    // Window resize
    window.removeEventListener('resize', moveBookingCardToMobile);
    window.addEventListener('resize', moveBookingCardToMobile);
  }

  function stepperHandler(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.stepper;
    const delta = parseInt(btn.dataset.delta);
    if (id && !isNaN(delta)) {
      changeValue(id, delta);
    }
  }

  function escapeHandler(e) {
    if (e.key === 'Escape') {
      closeServicesPopup();
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    const tripPName = getTripPName();
    
    if (!tripPName) {
      console.warn('⚠️ BookingSystem: No trip-id found in URL');
      return;
    }
    
    _refNumber = generateReference();
    
    // Cache all DOM elements
    $ = {
      bookingForm: document.getElementById('bookingForm'),
      username: document.getElementById('username'),
      customerEmail: document.getElementById('customerEmail'),
      phone: document.getElementById('phone'),
      tripDate: document.getElementById('tripDate'),
      hotelName: document.getElementById('hotelName'),
      roomNumber: document.getElementById('roomNumber'),
      adults: document.getElementById('adults'),
      childrenUnder12: document.getElementById('childrenUnder12'),
      infants: document.getElementById('infants'),
      tripType: document.getElementById('tripType'),
      tripName: document.getElementById('tripName'),
      submitBtn: document.getElementById('submitBtn'),
      openServicesBtn: document.getElementById('openServicesBtn'),
      selectedServiceText: document.getElementById('selectedServiceText'),
      totalPriceDisplay: document.getElementById('totalPriceDisplay'),
      extraServicesPopup: document.getElementById('extraServicesPopup'),
      servicesPopupContent: document.getElementById('servicesPopupContent'),
      confirmServicesBtn: document.getElementById('confirmServicesBtn'),
      cancelServicesBtn: document.getElementById('cancelServicesBtn'),
      mobileBookNowBtn: document.getElementById('mobileBookNowBtn'),
      spinner: document.getElementById('spinner'),
    };
    
    // Set trip name
    const trip = getCurrentTrip();
    if (trip.name && $.tripName) {
      $.tripName.value = trip.name;
    }
    
    // ==========================================================================
    // INITIALIZE PHONE INPUT (intl-tel-input)
    // ==========================================================================
    if ($.phone && window.intlTelInput) {
      _iti = window.intlTelInput($.phone, {
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it', 'sa', 'ae'],
        separateDialCode: true,
        initialCountry: 'eg',
        autoPlaceholder: 'aggressive',
        formatOnDisplay: true,
        nationalMode: false,
      });
      
      console.log('✅ Phone input initialized with country code');
    } else {
      console.warn('⚠️ intl-tel-input not available');
    }
    
    // ==========================================================================
    // INITIALIZE DATE PICKER
    // ==========================================================================
    if ($.tripDate && window.flatpickr) {
      flatpickr($.tripDate, {
        minDate: new Date().fp_incr(1),
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: function(selectedDates, dateStr) {
          updateSummary();
        }
      });
      
      console.log('✅ Date picker initialized');
    }
    
    // ==========================================================================
    // ATTACH EVENTS
    // ==========================================================================
    attachAllEvents();
    
    // ==========================================================================
    // HANDLE MOBILE LAYOUT
    // ==========================================================================
    moveBookingCardToMobile();
    
    // ==========================================================================
    // AUTH LISTENER
    // ==========================================================================
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) {
          populateForm();
        }
      });
    }
    
    // ==========================================================================
    // INITIAL SUMMARY
    // ==========================================================================
    setTimeout(() => {
      updateSummary();
    }, 1500);
    
    console.log('✅ BookingSystem initialized successfully');
    console.log('   📋 Reference:', _refNumber);
    console.log('   🏷️ Trip:', tripPName);
    console.log('   📱 Mode:', isMobile() ? 'Mobile' : 'Desktop');
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  return {
    init,
    nextStep,
    prevStep,
    changeValue,
    openServicesPopup,
    closeServicesPopup,
    confirmServiceSelection,
    submitForm,
    showMobileBooking,
    formatPrice,
    showToast,
    getRefNumber: () => _refNumber,
    getSelectedTripType: () => _selectedTripType,
    getPhoneNumber: () => _iti ? _iti.getNumber() : '',
    updateSummary,
  };

})();

// ==========================================================================
// AUTO-INIT
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    BookingSystem.init();
  }, 1000);
});

window.BookingSystem = BookingSystem;

console.log('📦 Unified Booking & Payment System loaded');
