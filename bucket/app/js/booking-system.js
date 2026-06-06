// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// Fixed Version - All Events Working
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
  // DOM ELEMENTS CACHE
  // ==========================================================================
  let _elements = {};

  function cacheElements() {
    _elements = {
      // Desktop form
      bookingForm: document.getElementById('bookingForm'),
      step1: document.getElementById('step1'),
      step2: document.getElementById('step2'),
      step3: document.getElementById('step3'),
      step4: document.getElementById('step4'),
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
      
      // Mobile form
      mobileBookingSection: document.getElementById('mobileBookingSection'),
      mobileStep1: document.getElementById('mobileStep1'),
      mobileStep2: document.getElementById('mobileStep2'),
      mobileStep3: document.getElementById('mobileStep3'),
      mobileStep4: document.getElementById('mobileStep4'),
      mobileUsername: document.getElementById('mobileUsername'),
      mobileCustomerEmail: document.getElementById('mobileCustomerEmail'),
      mobilePhone: document.getElementById('mobilePhone'),
      mobileTripDate: document.getElementById('mobileTripDate'),
      mobileHotelName: document.getElementById('mobileHotelName'),
      mobileRoomNumber: document.getElementById('mobileRoomNumber'),
      mobileAdults: document.getElementById('mobileAdults'),
      mobileChildren: document.getElementById('mobileChildren'),
      mobileInfants: document.getElementById('mobileInfants'),
      mobileTripType: document.getElementById('mobileTripType'),
      mobileTripName: document.getElementById('mobileTripName'),
      
      // Buttons
      submitBtn: document.getElementById('submitBtn'),
      mobileBookNowBtn: document.getElementById('mobileBookNowBtn'),
      openServicesBtn: document.getElementById('openServicesBtn'),
      mobileServicesBtn: document.getElementById('mobileServicesBtn'),
      
      // Services popup
      extraServicesPopup: document.getElementById('extraServicesPopup'),
      servicesPopupContent: document.getElementById('servicesPopupContent'),
      cancelServicesBtn: document.getElementById('cancelServicesBtn'),
      confirmServicesBtn: document.getElementById('confirmServicesBtn'),
      
      // Progress
      progressBar: document.getElementById('progressBar'),
      mobileProgressBar: document.getElementById('mobileProgressBar'),
      
      // Display
      selectedServiceText: document.getElementById('selectedServiceText'),
      mobileSelectedServiceText: document.getElementById('mobileSelectedServiceText'),
      totalPriceDisplay: document.getElementById('totalPriceDisplay'),
      mobileTotalPrice: document.getElementById('mobileTotalPrice'),
      
      // Spinner
      spinner: document.getElementById('spinner'),
    };
  }

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
    if (!str) return '';
    return str.toString().replace(/[<>]/g, '').trim();
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      position: fixed; 
      bottom: 100px; 
      left: 50%;
      transform: translateX(-50%);
      background: #252526; 
      color: #fff;
      padding: 14px 24px; 
      border-radius: 30px;
      z-index: 99999; 
      font-size: 14px; 
      font-weight: 600;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      border-left: 4px solid ${type === 'success' ? '#22c55e' : '#ef4444'};
      white-space: nowrap;
      animation: bsSlideUp 0.3s ease;
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
    if (_elements.spinner) _elements.spinner.classList.remove('hidden');
    if (_elements.submitBtn) _elements.submitBtn.disabled = true;
  }

  function hideSpinner() {
    if (_elements.spinner) _elements.spinner.classList.add('hidden');
    if (_elements.submitBtn) _elements.submitBtn.disabled = false;
  }

  // ==========================================================================
  // TRIP DATA ACCESS (via tripModule)
  // ==========================================================================
  function getCurrentTrip() {
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

  function getTripOwnerId() {
    if (window.tripModule?.getTripOwnerId) {
      return window.tripModule.getTripOwnerId();
    }
    return '';
  }

  function getTripPName() {
    if (window.tripModule?.getTripPName) {
      return window.tripModule.getTripPName();
    }
    return new URLSearchParams(window.location.search).get('trip-id') || '';
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

  function changeMobileValue(id, delta) {
    const input = document.getElementById(id);
    if (!input) return;
    
    let val = parseInt(input.value) || 0;
    const max = (id === 'mobileInfants') ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
    const min = (id === 'mobileAdults') ? 1 : 0;
    
    val = Math.max(min, Math.min(max, val + delta));
    input.value = val;
    
    updateMobileSummary();
  }

  function updateInfantsMax() {
    const adultsInput = _elements.adults;
    const infantsInput = _elements.infants;
    if (!adultsInput || !infantsInput) return;
    
    const maxInfants = Math.min(
      (parseInt(adultsInput.value) || 0) * MAX_INFANTS_PER_ADULT,
      MAX_TOTAL_INFANTS
    );
    
    if (parseInt(infantsInput.value) > maxInfants) {
      infantsInput.value = maxInfants;
    }
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================
  function getA() { return parseInt(_elements.adults?.value) || 0; }
  function getC() { return parseInt(_elements.childrenUnder12?.value) || 0; }
  function getI() { return parseInt(_elements.infants?.value) || 0; }
  function getMA() { return parseInt(_elements.mobileAdults?.value) || 0; }
  function getMC() { return parseInt(_elements.mobileChildren?.value) || 0; }
  function getMI() { return parseInt(_elements.mobileInfants?.value) || 0; }

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
    const childPrice = parseFloat(trip.cprice) || (adultPrice * 0.5);
    
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
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    setText('summaryDate', _elements.tripDate?.value || '-');
    setText('summaryHotel', sanitizeInput(_elements.hotelName?.value) || '-');
    setText('summaryRoom', sanitizeInput(_elements.roomNumber?.value) || '-');
    setText('summaryRef', _refNumber);
    setText('summaryTour', getCurrentTrip().name || '-');
    setText('summaryAdults', getA() + ' Adult' + (getA() !== 1 ? 's' : ''));
    setText('summaryChildrenUnder12', getC() + ' Child' + (getC() !== 1 ? 'ren' : ''));
    setText('summaryInfants', getI() + ' Infant' + (getI() !== 1 ? 's' : ''));
    setText('summaryService', _selectedTripType || 'None');

    if (_elements.totalPriceDisplay && getCurrentTrip().basePrice) {
      _elements.totalPriceDisplay.innerHTML = `
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
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    setText('mobileSummaryDate', _elements.mobileTripDate?.value || '-');
    setText('mobileSummaryHotel', _elements.mobileHotelName?.value || '-');
    setText('mobileSummaryRoom', _elements.mobileRoomNumber?.value || '-');
    setText('mobileSummaryRef', _refNumber);
    setText('mobileSummaryTour', getCurrentTrip().name || '-');
    setText('mobileSummaryAdults', getMA() + ' Adult' + (getMA() !== 1 ? 's' : ''));
    setText('mobileSummaryChildren', getMC() + ' Child' + (getMC() !== 1 ? 'ren' : ''));
    setText('mobileSummaryInfants', getMI() + ' Infant' + (getMI() !== 1 ? 's' : ''));
    setText('mobileSummaryService', _selectedTripType || 'None');

    if (_elements.mobileTotalPrice && getCurrentTrip().basePrice) {
      _elements.mobileTotalPrice.innerHTML = `
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
    
    // Hide current step
    const currentStepEl = document.getElementById('step' + (_currentStep + 1));
    if (currentStepEl) currentStepEl.classList.remove('active');
    
    _currentStep++;
    
    // Show next step
    const nextStepEl = document.getElementById('step' + (_currentStep + 1));
    if (nextStepEl) nextStepEl.classList.add('active');
    
    updateProgressBar();
    updateSummary();
  }

  function prevStep() {
    const currentStepEl = document.getElementById('step' + (_currentStep + 1));
    if (currentStepEl) currentStepEl.classList.remove('active');
    
    _currentStep--;
    
    const prevStepEl = document.getElementById('step' + (_currentStep + 1));
    if (prevStepEl) prevStepEl.classList.add('active');
    
    updateProgressBar();
  }

  function updateProgressBar() {
    if (_elements.progressBar) {
      _elements.progressBar.style.width = ((_currentStep + 1) * 25) + '%';
    }
    
    document.querySelectorAll('.desktop-booking .step-label').forEach((label, i) => {
      label.classList.toggle('active', i === _currentStep);
    });
  }

  function validateStep() {
    if (_currentStep === 0) {
      // Validate name
      const name = _elements.username?.value?.trim();
      if (!name) {
        showToast('Please enter your full name', 'error');
        return false;
      }
      
      // Validate email
      const email = _elements.customerEmail?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
      }
      
      // Validate phone (with intl-tel-input)
      if (_iti) {
        const phoneNumber = _iti.getNumber();
        if (!phoneNumber || !_iti.isValidNumber()) {
          showToast('Please enter a valid phone number', 'error');
          return false;
        }
      } else {
        // Fallback if intl-tel-input not loaded
        const phone = _elements.phone?.value?.trim();
        if (!phone || phone.length < 8) {
          showToast('Please enter a valid phone number', 'error');
          return false;
        }
      }
    } else if (_currentStep === 1) {
      // Validate date
      if (!_elements.tripDate?.value?.trim()) {
        showToast('Please select a trip date', 'error');
        return false;
      }
      
      // Validate hotel name
      if (!_elements.hotelName?.value?.trim()) {
        showToast('Please enter your hotel name', 'error');
        return false;
      }
      
      // Validate room number
      if (!_elements.roomNumber?.value?.trim()) {
        showToast('Please enter your room number', 'error');
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
    
    const currentStepEl = document.getElementById('mobileStep' + (_mobileCurrentStep + 1));
    if (currentStepEl) currentStepEl.classList.remove('active');
    
    _mobileCurrentStep++;
    
    const nextStepEl = document.getElementById('mobileStep' + (_mobileCurrentStep + 1));
    if (nextStepEl) nextStepEl.classList.add('active');
    
    updateMobileProgressBar();
    updateMobileSummary();
    
    // Scroll to booking section
    if (_elements.mobileBookingSection) {
      _elements.mobileBookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function mobilePrevStep() {
    const currentStepEl = document.getElementById('mobileStep' + (_mobileCurrentStep + 1));
    if (currentStepEl) currentStepEl.classList.remove('active');
    
    _mobileCurrentStep--;
    
    const prevStepEl = document.getElementById('mobileStep' + (_mobileCurrentStep + 1));
    if (prevStepEl) prevStepEl.classList.add('active');
    
    updateMobileProgressBar();
  }

  function updateMobileProgressBar() {
    if (_elements.mobileProgressBar) {
      _elements.mobileProgressBar.style.width = ((_mobileCurrentStep + 1) * 25) + '%';
    }
    
    document.querySelectorAll('#mobileBookingSection .step-label').forEach((label, i) => {
      label.classList.toggle('active', i === _mobileCurrentStep);
    });
  }

  function validateMobileStep() {
    if (_mobileCurrentStep === 0) {
      const name = _elements.mobileUsername?.value?.trim();
      if (!name) {
        showToast('Please enter your full name', 'error');
        return false;
      }
      
      const email = _elements.mobileCustomerEmail?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
      }
      
      // Check phone on mobile
      const phone = _elements.mobilePhone?.value?.trim();
      if (!phone || phone.length < 8) {
        showToast('Please enter a valid phone number', 'error');
        return false;
      }
    } else if (_mobileCurrentStep === 1) {
      if (!_elements.mobileTripDate?.value?.trim()) {
        showToast('Please select a trip date', 'error');
        return false;
      }
      if (!_elements.mobileHotelName?.value?.trim()) {
        showToast('Please enter your hotel name', 'error');
        return false;
      }
      if (!_elements.mobileRoomNumber?.value?.trim()) {
        showToast('Please enter your room number', 'error');
        return false;
      }
    }
    
    return true;
  }

  function showMobileBooking() {
    if (_elements.mobileBookingSection) {
      _elements.mobileBookingSection.style.display = 'block';
      setTimeout(() => {
        _elements.mobileBookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  // ==========================================================================
  // EXTRA SERVICES POPUP
  // ==========================================================================
  let _tempService = '';

  function openServicesPopup() {
    if (!_elements.extraServicesPopup || !_elements.servicesPopupContent) return;
    
    _tempService = _selectedTripType;
    _elements.servicesPopupContent.innerHTML = '';
    
    // Option: No extra services
    buildServiceOption('No extra services', 'Free', '');
    
    // Options from tour types
    const tourTypes = getTourTypes();
    if (tourTypes && Object.keys(tourTypes).length > 0) {
      Object.keys(tourTypes).forEach(key => {
        buildServiceOption(
          key,
          formatPrice(tourTypes[key]) + ' per person',
          key
        );
      });
    }
    
    _elements.extraServicesPopup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function buildServiceOption(name, price, value) {
    if (!_elements.servicesPopupContent) return;
    
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
      
      // Update UI
      document.querySelectorAll('#servicesPopupContent .service-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      div.classList.add('selected');
    });
    
    _elements.servicesPopupContent.appendChild(div);
  }

  function confirmServiceSelection() {
    _selectedTripType = _tempService;
    
    // Update hidden inputs
    if (_elements.tripType) _elements.tripType.value = _selectedTripType;
    if (_elements.mobileTripType) _elements.mobileTripType.value = _selectedTripType;
    
    // Update button texts
    if (_elements.selectedServiceText) {
      _elements.selectedServiceText.textContent = _selectedTripType || 'No extra services';
    }
    if (_elements.mobileSelectedServiceText) {
      _elements.mobileSelectedServiceText.textContent = _selectedTripType || 'No extra services';
    }
    
    closeServicesPopup();
    updateSummary();
    updateMobileSummary();
  }

  function closeServicesPopup() {
    if (_elements.extraServicesPopup) {
      _elements.extraServicesPopup.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // SUBMISSION & PAYMENT
  // ==========================================================================
  function mobileSubmitForm() {
    // Sync mobile values to desktop fields
    const fieldMap = [
      ['mobileUsername', 'username'],
      ['mobileCustomerEmail', 'customerEmail'],
      ['mobileTripDate', 'tripDate'],
      ['mobileHotelName', 'hotelName'],
      ['mobileRoomNumber', 'roomNumber'],
      ['mobileAdults', 'adults'],
      ['mobileChildren', 'childrenUnder12'],
      ['mobileInfants', 'infants'],
    ];
    
    fieldMap.forEach(([fromId, toId]) => {
      const fromEl = document.getElementById(fromId);
      const toEl = document.getElementById(toId);
      if (fromEl && toEl) {
        toEl.value = fromEl.value;
      }
    });
    
    // Sync phone number (mobile doesn't use intl-tel-input)
    const mobilePhone = document.getElementById('mobilePhone');
    if (mobilePhone && _iti) {
      // Try to set the phone in intl-tel-input
      _iti.setNumber(mobilePhone.value);
    }
    
    // Sync selected service
    _selectedTripType = _elements.mobileTripType?.value || '';
    if (_elements.tripType) _elements.tripType.value = _selectedTripType;
    
    // Submit
    submitForm();
  }

  async function submitForm() {
    showSpinner();
    
    try {
      // Check authentication
      if (!auth || !auth.currentUser) {
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
      } else {
        phoneNumber = _elements.phone?.value?.trim() || '';
      }
      
      // Calculate totals
      const net = calcNet();
      const tax = calcTax();
      const total = calcTotal();
      
      // Build booking object
      const booking = {
        refNumber: _refNumber,
        username: sanitizeInput(_elements.username?.value || ''),
        email: sanitizeInput(_elements.customerEmail?.value || ''),
        phone: phoneNumber,
        tour: trip.name || '',
        tripId: tripPName,
        tripDate: _elements.tripDate?.value || '',
        adults: getA(),
        childrenUnder12: getC(),
        infants: getI(),
        hotelName: sanitizeInput(_elements.hotelName?.value || ''),
        roomNumber: sanitizeInput(_elements.roomNumber?.value || ''),
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
      
      // Generate payment hash from Kashier
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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Payment preparation failed: ' + errorText);
      }
      
      const data = await response.json();
      
      if (!data.hash) {
        throw new Error('Invalid payment hash received');
      }
      
      // Build payment URL
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
      
      // Save booking to Firebase
      await db.ref('trip-bookings/' + _refNumber).set({
        ...booking,
        paymenturl: paymentUrl
      });
      
      // Send notification to trip owner
      if (tripOwnerId && tripOwnerId !== user.uid) {
        await db.ref('notifications/' + tripOwnerId + '/' + Date.now()).set({
          title: 'New Booking: ' + (trip.name || 'Trip'),
          message: booking.username + ' - ' + getA() + 'A/' + getC() + 'C/' + getI() + 'I',
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
      
      // Store session data for payment status page
      sessionStorage.setItem('username', booking.username);
      sessionStorage.setItem('email', booking.email);
      sessionStorage.setItem('phone', booking.phone);
      sessionStorage.setItem('refNumber', _refNumber);
      
      // Redirect to payment
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
  // FORM AUTO-POPULATE FROM USER PROFILE
  // ==========================================================================
  async function populateForm() {
    try {
      if (!auth || !auth.currentUser) return;
      
      const user = auth.currentUser;
      const snap = await db.ref('egy_user/' + user.uid).once('value');
      const userData = snap.val();
      
      if (userData) {
        // Desktop fields
        if (_elements.username && userData.username) {
          _elements.username.value = userData.username;
        }
        if (_elements.customerEmail && userData.email) {
          _elements.customerEmail.value = userData.email;
        }
        
        // Mobile fields
        if (_elements.mobileUsername && userData.username) {
          _elements.mobileUsername.value = userData.username;
        }
        if (_elements.mobileCustomerEmail && userData.email) {
          _elements.mobileCustomerEmail.value = userData.email;
        }
        
        // Phone number
        if (userData.phone) {
          if (_iti) {
            _iti.setNumber(userData.phone);
          } else if (_elements.phone) {
            _elements.phone.value = userData.phone;
          }
          
          // Also set mobile phone
          if (_elements.mobilePhone) {
            _elements.mobilePhone.value = userData.phone;
          }
        }
      }
    } catch (error) {
      console.warn('Could not populate form from profile:', error);
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
    
    // Cache all DOM elements
    cacheElements();
    
    // Generate reference number
    _refNumber = generateReference();
    
    // Set trip name in hidden inputs
    const trip = getCurrentTrip();
    if (trip.name) {
      if (_elements.tripName) _elements.tripName.value = trip.name;
      if (_elements.mobileTripName) _elements.mobileTripName.value = trip.name;
    }
    
    // ==========================================================================
    // INITIALIZE PHONE INPUT (intl-tel-input)
    // ==========================================================================
    const phoneInput = document.querySelector('#phone');
    if (phoneInput && window.intlTelInput) {
      _iti = window.intlTelInput(phoneInput, {
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: 'eg',
        autoPlaceholder: 'aggressive',
      });
      
      console.log('✅ Phone input initialized');
    } else {
      console.warn('⚠️ intl-tel-input not loaded, using plain input');
    }
    
    // ==========================================================================
    // INITIALIZE DATE PICKERS (flatpickr)
    // ==========================================================================
    if (window.flatpickr) {
      // Desktop date picker
      const tripDateEl = document.querySelector('#tripDate');
      if (tripDateEl) {
        flatpickr(tripDateEl, {
          minDate: new Date().fp_incr(1),
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: function(selectedDates, dateStr) {
            updateSummary();
          }
        });
      }
      
      // Mobile date picker
      const mobileTripDateEl = document.querySelector('#mobileTripDate');
      if (mobileTripDateEl) {
        flatpickr(mobileTripDateEl, {
          minDate: new Date().fp_incr(1),
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: function(selectedDates, dateStr) {
            updateMobileSummary();
          }
        });
      }
      
      console.log('✅ Date pickers initialized');
    }
    
    // ==========================================================================
    // ATTACH EVENT LISTENERS
    // ==========================================================================
    
    // Submit button
    if (_elements.submitBtn) {
      _elements.submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        submitForm();
      });
    }
    
    // Mobile Book Now button
    if (_elements.mobileBookNowBtn) {
      _elements.mobileBookNowBtn.addEventListener('click', function(e) {
        e.preventDefault();
        showMobileBooking();
      });
    }
    
    // Services buttons
    if (_elements.openServicesBtn) {
      _elements.openServicesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openServicesPopup();
      });
    }
    
    if (_elements.mobileServicesBtn) {
      _elements.mobileServicesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openServicesPopup();
      });
    }
    
    // Services popup buttons
    if (_elements.confirmServicesBtn) {
      _elements.confirmServicesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        confirmServiceSelection();
      });
    }
    
    if (_elements.cancelServicesBtn) {
      _elements.cancelServicesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeServicesPopup();
      });
    }
    
    // Close popup on overlay click
    const popupOverlay = document.querySelector('#extraServicesPopup .services-popup-overlay');
    if (popupOverlay) {
      popupOverlay.addEventListener('click', closeServicesPopup);
    }
    
    // Close popup on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeServicesPopup();
      }
    });
    
    // ==========================================================================
    // ATTACH NAVIGATION TO EXISTING ONCLICK HANDLERS
    // ==========================================================================
    // Expose functions globally for onclick handlers in HTML
    window._bsNextStep = nextStep;
    window._bsPrevStep = prevStep;
    window._bsMobileNextStep = mobileNextStep;
    window._bsMobilePrevStep = mobilePrevStep;
    window._bsChangeValue = changeValue;
    window._bsChangeMobileValue = changeMobileValue;
    window._bsOpenServicesPopup = openServicesPopup;
    window._bsConfirmServiceSelection = confirmServiceSelection;
    window._bsCloseServicesPopup = closeServicesPopup;
    window._bsMobileSubmitForm = mobileSubmitForm;
    
    // ==========================================================================
    // LISTEN FOR AUTH STATE
    // ==========================================================================
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) {
          populateForm();
        }
      });
    }
    
    // ==========================================================================
    // INITIAL SUMMARY UPDATE
    // ==========================================================================
    setTimeout(() => {
      updateSummary();
      updateMobileSummary();
    }, 1500);
    
    console.log('✅ BookingSystem initialized successfully');
    console.log('   Reference:', _refNumber);
    console.log('   Trip:', tripPName);
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
    
    // Getters
    getRefNumber: () => _refNumber,
    getSelectedTripType: () => _selectedTripType,
    getPhoneNumber: () => _iti ? _iti.getNumber() : '',
    
    // Updates
    updateSummary,
    updateMobileSummary,
    
    // Re-cache elements (useful after DOM changes)
    cacheElements,
  };

})();

// ==========================================================================
// AUTO-INITIALIZATION
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase and trip data to be ready
  setTimeout(() => {
    BookingSystem.init();
  }, 1000);
});

// Expose globally
window.BookingSystem = BookingSystem;

console.log('📦 Booking & Payment System module loaded (fixed version)');
