// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// Isolated Module - No Trip Data Logic
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
  let _mobileCurrentStep = 0;
  
  const MAX_PER_TYPE = 10;
  const MAX_INFANTS_PER_ADULT = 2;
  const MAX_TOTAL_INFANTS = 10;

  // ==========================================================================
  // HELPERS
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
    return str ? str.toString().replace(/[<>]/g, '').trim() : '';
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 100px; left: 50%;
      transform: translateX(-50%);
      background: #252526; color: #fff;
      padding: 14px 24px; border-radius: 30px;
      z-index: 99999; font-size: 14px; font-weight: 600;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      border-left: 4px solid ${type === 'success' ? '#22c55e' : '#ef4444'};
      white-space: nowrap;
      animation: bookingSlideUp 0.3s ease;
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
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.remove('hidden');
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = true;
  }

  function hideSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.add('hidden');
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = false;
  }

  // ==========================================================================
  // TRIP DATA ACCESS (via tripModule)
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
  // STEPPER
  // ==========================================================================
  function changeValue(id, delta) {
    const input = document.getElementById(id);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    const max = id === 'infants' ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
    const min = id === 'adults' ? 1 : 0;
    val = Math.max(min, Math.min(max, val + delta));
    input.value = val;
    if (id === 'adults') updateInfantsMax();
    updateSummary();
  }

  function changeMobileValue(id, delta) {
    const input = document.getElementById(id);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    const max = id === 'mobileInfants' ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
    const min = id === 'mobileAdults' ? 1 : 0;
    val = Math.max(min, Math.min(max, val + delta));
    input.value = val;
    updateMobileSummary();
  }

  function updateInfantsMax() {
    const adultsInput = document.getElementById('adults');
    const infantsInput = document.getElementById('infants');
    if (!adultsInput || !infantsInput) return;
    const max = Math.min(
      (parseInt(adultsInput.value) || 0) * MAX_INFANTS_PER_ADULT,
      MAX_TOTAL_INFANTS
    );
    if (parseInt(infantsInput.value) > max) {
      infantsInput.value = max;
    }
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================
  function getA() { return parseInt(document.getElementById('adults')?.value) || 0; }
  function getC() { return parseInt(document.getElementById('childrenUnder12')?.value) || 0; }
  function getI() { return parseInt(document.getElementById('infants')?.value) || 0; }
  function getMA() { return parseInt(document.getElementById('mobileAdults')?.value) || 0; }
  function getMC() { return parseInt(document.getElementById('mobileChildren')?.value) || 0; }
  function getMI() { return parseInt(document.getElementById('mobileInfants')?.value) || 0; }

  // ==========================================================================
  // PRICE CALCULATION
  // ==========================================================================
  function calcBase() {
    const trip = getCurrentTrip();
    if (!trip.basePrice) return 0;
    const adultPrice = parseFloat(trip.basePrice);
    const childPrice = parseFloat(trip.cprice) || adultPrice * 0.5;
    return parseFloat(((getA() * adultPrice) + (getC() * childPrice)).toFixed(2));
  }

  function calcExtra() {
    const tourTypes = getTourTypes();
    if (_selectedTripType && tourTypes[_selectedTripType]) {
      return parseFloat(
        ((getA() + getC()) * parseFloat(tourTypes[_selectedTripType])).toFixed(2)
      );
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

  function calcMobileBase() {
    const trip = getCurrentTrip();
    if (!trip.basePrice) return 0;
    const adultPrice = parseFloat(trip.basePrice);
    const childPrice = parseFloat(trip.cprice) || adultPrice * 0.5;
    return parseFloat(((getMA() * adultPrice) + (getMC() * childPrice)).toFixed(2));
  }

  function calcMobileExtra() {
    const tourTypes = getTourTypes();
    if (_selectedTripType && tourTypes[_selectedTripType]) {
      return parseFloat(
        ((getMA() + getMC()) * parseFloat(tourTypes[_selectedTripType])).toFixed(2)
      );
    }
    return 0;
  }

  function calcMobileNet() {
    return parseFloat((calcMobileBase() + calcMobileExtra()).toFixed(2));
  }

  function calcMobileTax() {
    const net = calcMobileNet();
    return parseFloat((net * 0.03 + net * 0.03 * 0.14 + 3).toFixed(2));
  }

  function calcMobileTotal() {
    return parseFloat((calcMobileNet() + calcMobileTax()).toFixed(2));
  }

  // ==========================================================================
  // UPDATE DISPLAYS
  // ==========================================================================
  function updateSummary() {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    set('summaryDate', document.getElementById('tripDate')?.value || '-');
    set('summaryHotel', sanitizeInput(document.getElementById('hotelName')?.value) || '-');
    set('summaryRoom', sanitizeInput(document.getElementById('roomNumber')?.value) || '-');
    set('summaryRef', _refNumber);
    set('summaryTour', getCurrentTrip().name || '-');
    set('summaryAdults', getA() + ' Adult' + (getA() !== 1 ? 's' : ''));
    set('summaryChildrenUnder12', getC() + ' Child' + (getC() !== 1 ? 'ren' : ''));
    set('summaryInfants', getI() + ' Infant' + (getI() !== 1 ? 's' : ''));
    set('summaryService', _selectedTripType || 'None');

    const totalDisplay = document.getElementById('totalPriceDisplay');
    if (totalDisplay && getCurrentTrip().basePrice) {
      totalDisplay.innerHTML = `
        ${formatPrice(calcNet())}
        <div style="font-size:11px;color:#a0a0a0;margin-top:8px;">
          <div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;margin-top:4px;">
            <span>+ Taxes:</span>
            <span>${formatPrice(calcTax())}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;">
            <span>Total at Payment:</span>
            <span>${formatPrice(calcTotal())}</span>
          </div>
        </div>
      `;
    }
  }

  function updateMobileSummary() {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    set('mobileSummaryDate', document.getElementById('mobileTripDate')?.value || '-');
    set('mobileSummaryHotel', document.getElementById('mobileHotelName')?.value || '-');
    set('mobileSummaryRoom', document.getElementById('mobileRoomNumber')?.value || '-');
    set('mobileSummaryRef', _refNumber);
    set('mobileSummaryTour', getCurrentTrip().name || '-');
    set('mobileSummaryAdults', getMA() + ' Adult' + (getMA() !== 1 ? 's' : ''));
    set('mobileSummaryChildren', getMC() + ' Child' + (getMC() !== 1 ? 'ren' : ''));
    set('mobileSummaryInfants', getMI() + ' Infant' + (getMI() !== 1 ? 's' : ''));
    set('mobileSummaryService', _selectedTripType || 'None');

    const totalDisplay = document.getElementById('mobileTotalPrice');
    if (totalDisplay && getCurrentTrip().basePrice) {
      totalDisplay.innerHTML = `
        ${formatPrice(calcMobileNet())}
        <div style="font-size:11px;color:#a0a0a0;margin-top:8px;">
          <div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;">
            + Taxes: ${formatPrice(calcMobileTax())}
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;color:#f59e0b;">
            Total: ${formatPrice(calcMobileTotal())}
          </div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // FORM NAVIGATION - DESKTOP
  // ==========================================================================
  function nextStep() {
    if (!validateStep()) return;
    document.getElementById('step' + (_currentStep + 1))?.classList.remove('active');
    _currentStep++;
    document.getElementById('step' + (_currentStep + 1))?.classList.add('active');
    updateProgressBar();
    updateSummary();
  }

  function prevStep() {
    document.getElementById('step' + (_currentStep + 1))?.classList.remove('active');
    _currentStep--;
    document.getElementById('step' + (_currentStep + 1))?.classList.add('active');
    updateProgressBar();
  }

  function updateProgressBar() {
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = ((_currentStep + 1) * 25) + '%';
    document.querySelectorAll('.desktop-booking .step-label').forEach((label, i) => {
      label.classList.toggle('active', i === _currentStep);
    });
  }

  function validateStep() {
    if (_currentStep === 0) {
      const name = document.getElementById('username')?.value.trim();
      if (!name) { showToast('Enter your name', 'error'); return false; }
      
      const email = document.getElementById('customerEmail')?.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Enter valid email', 'error');
        return false;
      }
      
      if (_iti && (!_iti.getNumber() || !_iti.isValidNumber())) {
        showToast('Enter valid phone', 'error');
        return false;
      }
    } else if (_currentStep === 1) {
      if (!document.getElementById('tripDate')?.value.trim()) {
        showToast('Select date', 'error');
        return false;
      }
      if (!document.getElementById('hotelName')?.value.trim()) {
        showToast('Enter hotel name', 'error');
        return false;
      }
      if (!document.getElementById('roomNumber')?.value.trim()) {
        showToast('Enter room number', 'error');
        return false;
      }
    }
    return true;
  }

  // ==========================================================================
  // FORM NAVIGATION - MOBILE
  // ==========================================================================
  function mobileNextStep() {
    if (!validateMobileStep()) return;
    document.getElementById('mobileStep' + (_mobileCurrentStep + 1))?.classList.remove('active');
    _mobileCurrentStep++;
    document.getElementById('mobileStep' + (_mobileCurrentStep + 1))?.classList.add('active');
    updateMobileProgressBar();
    updateMobileSummary();
    document.getElementById('mobileBookingSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function mobilePrevStep() {
    document.getElementById('mobileStep' + (_mobileCurrentStep + 1))?.classList.remove('active');
    _mobileCurrentStep--;
    document.getElementById('mobileStep' + (_mobileCurrentStep + 1))?.classList.add('active');
    updateMobileProgressBar();
  }

  function updateMobileProgressBar() {
    const bar = document.getElementById('mobileProgressBar');
    if (bar) bar.style.width = ((_mobileCurrentStep + 1) * 25) + '%';
    document.querySelectorAll('#mobileBookingSection .step-label').forEach((label, i) => {
      label.classList.toggle('active', i === _mobileCurrentStep);
    });
  }

  function validateMobileStep() {
    if (_mobileCurrentStep === 0) {
      const name = document.getElementById('mobileUsername')?.value.trim();
      if (!name) { showToast('Enter your name', 'error'); return false; }
      
      const email = document.getElementById('mobileCustomerEmail')?.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Enter valid email', 'error');
        return false;
      }
    } else if (_mobileCurrentStep === 1) {
      if (!document.getElementById('mobileTripDate')?.value.trim()) {
        showToast('Select date', 'error');
        return false;
      }
      if (!document.getElementById('mobileHotelName')?.value.trim()) {
        showToast('Enter hotel name', 'error');
        return false;
      }
      if (!document.getElementById('mobileRoomNumber')?.value.trim()) {
        showToast('Enter room number', 'error');
        return false;
      }
    }
    return true;
  }

  function showMobileBooking() {
    const section = document.getElementById('mobileBookingSection');
    if (section) {
      section.style.display = 'block';
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

  // ==========================================================================
  // EXTRA SERVICES POPUP
  // ==========================================================================
  let _tempService = '';

  function openServicesPopup() {
    const popup = document.getElementById('extraServicesPopup');
    const content = document.getElementById('servicesPopupContent');
    if (!popup || !content) return;
    
    _tempService = _selectedTripType;
    content.innerHTML = '';
    
    buildServiceOption('No extra services', 'Free', '');
    
    const tourTypes = getTourTypes();
    if (tourTypes) {
      Object.keys(tourTypes).forEach(key => {
        buildServiceOption(key, formatPrice(tourTypes[key]) + ' (per person)', key);
      });
    }
    
    popup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function buildServiceOption(name, price, value) {
    const content = document.getElementById('servicesPopupContent');
    if (!content) return;
    
    const div = document.createElement('div');
    div.className = 'service-option' + (_tempService === value ? ' selected' : '');
    div.innerHTML = `
      <div class="service-option-info">
        <div class="service-option-name">${name}</div>
        <div class="service-option-price">${price}</div>
      </div>
      <div class="service-option-check"></div>
    `;
    
    div.onclick = () => {
      _tempService = value;
      document.querySelectorAll('#servicesPopupContent .service-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      div.classList.add('selected');
    };
    
    content.appendChild(div);
  }

  function confirmServiceSelection() {
    _selectedTripType = _tempService;
    
    const tripType = document.getElementById('tripType');
    if (tripType) tripType.value = _selectedTripType;
    
    const mobileTripType = document.getElementById('mobileTripType');
    if (mobileTripType) mobileTripType.value = _selectedTripType;
    
    const serviceText = document.getElementById('selectedServiceText');
    if (serviceText) serviceText.textContent = _selectedTripType || 'No extra services';
    
    const mobileServiceText = document.getElementById('mobileSelectedServiceText');
    if (mobileServiceText) mobileServiceText.textContent = _selectedTripType || 'No extra services';
    
    closeServicesPopup();
    updateSummary();
    updateMobileSummary();
  }

  function closeServicesPopup() {
    const popup = document.getElementById('extraServicesPopup');
    if (popup) popup.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // SUBMISSION & PAYMENT
  // ==========================================================================
  function mobileSubmitForm() {
    const fields = [
      ['mobileUsername', 'username'],
      ['mobileCustomerEmail', 'customerEmail'],
      ['mobileTripDate', 'tripDate'],
      ['mobileHotelName', 'hotelName'],
      ['mobileRoomNumber', 'roomNumber'],
      ['mobileAdults', 'adults'],
      ['mobileChildren', 'childrenUnder12'],
      ['mobileInfants', 'infants']
    ];
    
    fields.forEach(([from, to]) => {
      const fromEl = document.getElementById(from);
      const toEl = document.getElementById(to);
      if (fromEl && toEl) toEl.value = fromEl.value;
    });
    
    _selectedTripType = document.getElementById('mobileTripType')?.value || '';
    const tripType = document.getElementById('tripType');
    if (tripType) tripType.value = _selectedTripType;
    
    submitForm();
  }

  async function submitForm() {
    showSpinner();
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please sign in to complete booking');
      
      const trip = getCurrentTrip();
      const tripPName = getTripPName();
      const tripOwnerId = getTripOwnerId();
      
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      const booking = {
        refNumber: _refNumber,
        username: sanitizeInput(document.getElementById('username')?.value || ''),
        email: sanitizeInput(document.getElementById('customerEmail')?.value || ''),
        phone: _iti?.getNumber() || '',
        tour: trip.name,
        tripId: tripPName,
        tripDate: document.getElementById('tripDate')?.value || '',
        adults: getA(),
        childrenUnder12: getC(),
        infants: getI(),
        hotelName: sanitizeInput(document.getElementById('hotelName')?.value || ''),
        roomNumber: sanitizeInput(document.getElementById('roomNumber')?.value || ''),
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
      
      // Generate payment hash
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
      
      if (!response.ok) throw new Error('Payment preparation failed');
      
      const data = await response.json();
      const paymentUrl = `https://payments.kashier.io/?${new URLSearchParams({
        merchantId: 'MID-33260-3',
        orderId: _refNumber,
        amount: parseFloat(total.toFixed(2)),
        currency: 'EGP',
        hash: data.hash,
        mode: 'live',
        merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
        failureRedirect: 'false',
        redirectMethod: 'get'
      }).toString()}`;
      
      // Save booking
      await db.ref('trip-bookings/' + _refNumber).set({
        ...booking,
        paymenturl: paymentUrl
      });
      
      // Notify trip owner
      if (tripOwnerId) {
        await db.ref(`notifications/${tripOwnerId}/${Date.now()}`).set({
          title: 'New Booking: ' + trip.name,
          message: `${booking.username} - ${getA()}A/${getC()}C/${getI()}I`,
          totalAmount: parseFloat(net.toFixed(2)),
          bookingId: _refNumber,
          tripId: tripPName,
          tripName: trip.name,
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
      
      // Store session data
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      
      showToast('Redirecting to payment gateway...');
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1000);
      
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
      hideSpinner();
    }
  }

  // ==========================================================================
  // FORM AUTO-POPULATE
  // ==========================================================================
  async function populateForm() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const snap = await db.ref('egy_user/' + user.uid).once('value');
      const userData = snap.val();
      
      if (userData) {
        const fields = {
          username: userData.username || '',
          mobileUsername: userData.username || '',
          customerEmail: userData.email || '',
          mobileCustomerEmail: userData.email || ''
        };
        
        Object.entries(fields).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.value = value;
        });
        
        if (userData.phone && _iti) {
          const phoneInput = document.getElementById('phone');
          if (phoneInput) {
            phoneInput.value = userData.phone;
            _iti.setNumber(userData.phone);
          }
        }
      }
    } catch (error) {
      console.warn('Could not populate form:', error);
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    const tripPName = getTripPName();
    
    if (!tripPName) {
      console.warn('BookingSystem: No trip-id found');
      return;
    }
    
    _refNumber = generateReference();
    
    // Phone input
    const phoneInput = document.querySelector('#phone');
    if (phoneInput && window.intlTelInput) {
      _iti = window.intlTelInput(phoneInput, {
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: 'eg'
      });
    }
    
    // Date pickers
    if (window.flatpickr) {
      flatpickr('#tripDate', {
        minDate: new Date().fp_incr(1),
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: updateSummary
      });
      
      flatpickr('#mobileTripDate', {
        minDate: new Date().fp_incr(1),
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: updateMobileSummary
      });
    }
    
    // Event listeners
    document.getElementById('submitBtn')?.addEventListener('click', submitForm);
    document.getElementById('mobileBookNowBtn')?.addEventListener('click', showMobileBooking);
    document.getElementById('openServicesBtn')?.addEventListener('click', openServicesPopup);
    document.getElementById('mobileServicesBtn')?.addEventListener('click', openServicesPopup);
    
    // Auth listener
    auth.onAuthStateChanged((user) => {
      if (user) populateForm();
    });
    
    // Initial summary update
    setTimeout(() => {
      updateSummary();
      updateMobileSummary();
    }, 1500);
    
    console.log('✅ BookingSystem initialized - Ref:', _refNumber);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  return {
    init,
    
    // Navigation
    nextStep,
    prevStep,
    mobileNextStep,
    mobilePrevStep,
    showMobileBooking,
    
    // Stepper
    changeValue,
    changeMobileValue,
    
    // Services
    openServicesPopup,
    buildServiceOption,
    confirmServiceSelection,
    closeServicesPopup,
    
    // Submission
    submitForm,
    mobileSubmitForm,
    
    // Utilities
    formatPrice,
    showToast,
    showSpinner,
    hideSpinner,
    
    // State
    getRefNumber: () => _refNumber,
    getSelectedTripType: () => _selectedTripType,
    
    // Updates
    updateSummary,
    updateMobileSummary
  };

})();

// ==========================================================================
// AUTO-INIT
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    BookingSystem.init();
  }, 800); // Wait for trip module to load first
});

window.BookingSystem = BookingSystem;

console.log('📦 Booking & Payment System loaded');
