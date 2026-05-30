// Initialize Swiper
let swiper;
let currentVideoSlide = null;

// Global variables
let tripData = {};
let currentTrip = {};
let tourTypes = {};
let selectedTripType = "";
let iti;
const refNumber = generateReference();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_ADULT = 2;
const MAX_TOTAL_INFANTS = 10;
const FIXED_FEE = 3;
const TAX_RATE = 0.03;
const TAX_ON_TAX_RATE = 0.14;
let currentStep = 0;

// Currency variables (from header)
let currentCurrency = 'EGP';
let exchangeRates = { EGP: 1 };
let ratesLoaded = false;

// Get trip ID from URL
function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// ========================================
// CURRENCY FUNCTIONS
// ========================================

function getCurrentCurrencyFromHeader() {
  if (window.SharmCurrency && typeof window.SharmCurrency.get === 'function') {
    return window.SharmCurrency.get();
  }
  return localStorage.getItem('preferredCurrency') || 'EGP';
}

function getExchangeRatesFromHeader() {
  if (window.SharmCurrency && window.SharmCurrency.rates) {
    return window.SharmCurrency.rates;
  }
  return null;
}

function formatPrice(priceEGP) {
  if (!ratesLoaded || currentCurrency === 'EGP') {
    return Math.round(priceEGP) + ' EGP';
  }
  
  var converted = priceEGP * exchangeRates[currentCurrency];
  var symbol = '';
  
  if (currentCurrency === 'USD') symbol = '$';
  else if (currentCurrency === 'EUR') symbol = '€';
  else if (currentCurrency === 'GBP') symbol = '£';
  else return Math.round(priceEGP) + ' EGP';
  
  return symbol + converted.toFixed(2);
}

function getCurrencySymbol() {
  if (currentCurrency === 'EGP') return 'EGP';
  if (currentCurrency === 'USD') return '$';
  if (currentCurrency === 'EUR') return '€';
  if (currentCurrency === 'GBP') return '£';
  return 'EGP';
}

function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  if (priceElement && currentTrip.basePrice) {
    const totalPrice = calculateTotalWithTaxes();
    const formattedPrice = formatPrice(totalPrice);
    priceElement.innerHTML = formattedPrice;
    priceElement.setAttribute('data-price-egp', totalPrice);
    priceElement.setAttribute('data-currency', currentCurrency);
  }
}

function updateTripTypeDropdownPrices() {
  const tripTypeSelect = document.getElementById('tripType');
  if (!tripTypeSelect) return;
  
  for (var i = 0; i < tripTypeSelect.options.length; i++) {
    var option = tripTypeSelect.options[i];
    var priceEGP = option.getAttribute('data-price-egp');
    if (priceEGP) {
      var key = option.value;
      if (key && tourTypes[key]) {
        option.textContent = `${key} - ${formatPrice(parseFloat(priceEGP))} (per person)`;
      }
    }
  }
}

function updateSelectedServiceText() {
  const textSpan = document.getElementById('selectedServiceText');
  if (textSpan) {
    if (selectedTripType && tourTypes[selectedTripType]) {
      const priceEGP = tourTypes[selectedTripType];
      const formattedPrice = formatPrice(priceEGP);
      textSpan.textContent = `${selectedTripType} (+${formattedPrice})`;
    } else {
      textSpan.textContent = 'No extra services';
    }
  }
}

function updateServiceTextOnCurrencyChange() {
  const textSpan = document.getElementById('selectedServiceText');
  if (textSpan && selectedTripType && tourTypes[selectedTripType]) {
    const priceEGP = tourTypes[selectedTripType];
    const formattedPrice = formatPrice(priceEGP);
    textSpan.textContent = `${selectedTripType} (+${formattedPrice})`;
  }
}

function initCurrencyFromHeader() {
  currentCurrency = getCurrentCurrencyFromHeader();
  const headerRates = getExchangeRatesFromHeader();
  
  if (headerRates) {
    exchangeRates = headerRates;
    ratesLoaded = true;
  }
  
  var checkInterval = setInterval(function() {
    var rates = getExchangeRatesFromHeader();
    if (rates) {
      exchangeRates = rates;
      ratesLoaded = true;
      clearInterval(checkInterval);
      updatePriceDisplay();
      updateSummary();
      updateTripTypeDropdownPrices();
      updateSelectedServiceText();
      updateServiceTextOnCurrencyChange();
    }
  }, 500);
  
  window.addEventListener('currencyChanged', function(event) {
    if (event.detail && event.detail.currency) {
      currentCurrency = event.detail.currency;
      if (event.detail.rates) {
        exchangeRates = event.detail.rates;
        ratesLoaded = true;
      }
      updatePriceDisplay();
      updateSummary();
      updateTripTypeDropdownPrices();
      updateSelectedServiceText();
      updateServiceTextOnCurrencyChange();
    }
  });
  
  setTimeout(function() {
    updatePriceDisplay();
    updateSummary();
  }, 100);
}

// ========================================
// Extra Services Popup Functions
// ========================================

let tempSelectedService = '';

function openServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  const content = document.getElementById('servicesPopupContent');
  
  if (!popup || !content) return;
  
  content.innerHTML = '';
  tempSelectedService = selectedTripType;
  
  const noServiceDiv = document.createElement('div');
  noServiceDiv.className = `service-option ${tempSelectedService === '' ? 'selected' : ''}`;
  noServiceDiv.setAttribute('data-value', '');
  noServiceDiv.innerHTML = `
    <div class="service-option-info">
      <div class="service-option-name">No extra services</div>
      <div class="service-option-price">Free</div>
    </div>
    <div class="service-option-check"></div>
  `;
  noServiceDiv.onclick = function() { selectServiceInPopup(''); };
  content.appendChild(noServiceDiv);
  
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(key => {
      const priceEGP = tourTypes[key];
      const formattedPrice = formatPrice(priceEGP);
      const serviceDiv = document.createElement('div');
      serviceDiv.className = `service-option ${tempSelectedService === key ? 'selected' : ''}`;
      serviceDiv.setAttribute('data-value', key);
      serviceDiv.setAttribute('data-price-egp', priceEGP);
      serviceDiv.innerHTML = `
        <div class="service-option-info">
          <div class="service-option-name">${key}</div>
          <div class="service-option-price">${formattedPrice} (per person)</div>
        </div>
        <div class="service-option-check"></div>
      `;
      serviceDiv.onclick = function() { selectServiceInPopup(key); };
      content.appendChild(serviceDiv);
    });
  }
  
  popup.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function selectServiceInPopup(value) {
  tempSelectedService = value;
  
  const options = document.querySelectorAll('#servicesPopupContent .service-option');
  options.forEach(opt => {
    if (opt.getAttribute('data-value') === value) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

function confirmServiceSelection() {
  selectedTripType = tempSelectedService;
  
  const tripTypeSelect = document.getElementById('tripType');
  if (tripTypeSelect) {
    tripTypeSelect.value = selectedTripType;
  }
  
  updateSelectedServiceText();
  updateSummary();
  closeServicesPopup();
}

function closeServicesPopup() {
  const popup = document.getElementById('extraServicesPopup');
  if (popup) {
    popup.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ========================================
// Utility Functions
// ========================================

function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'DS-' + result;
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/[<>]/g, "").trim();
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.classList.add('border-red-500');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

function clearError(elementId) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.classList.remove('border-red-500');
    errorElement.classList.add('hidden');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement("div");
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showSpinner() {
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  if (spinner) spinner.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = true;
}

function hideSpinner() {
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  if (spinner) spinner.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = false;
}

// ========================================
// NOTIFICATION FUNCTIONS
// ========================================

async function sendBookingNotificationToSupplier(bookingData, tripInfo) {
  // 1. التحقق من وجود معرف المورد
  if (!tripInfo || !tripInfo.supplierId) {
    console.warn("No supplierId found for this trip. Notification not sent.");
    return;
  }

  const notificationId = Date.now().toString();
  const notificationRef = db.ref(`notifications/${tripInfo.supplierId}/${notificationId}`);

  // 2. المبلغ الإجمالي بالضرائب القادم من الحجز (مثال: 540.784)
  const totalAmountWithTax = parseFloat(bookingData.totalAmount) || 0;
  
  // 3. الحسبة العكسية الدقيقة لإخراج الصافي للمورد (النتيجة هنا لـ 540.784 هتبقي 520 بالظبط)
  // تم استخدام .toFixed(2) ثم parseFloat لمنع مشاكل الكسور العشرية اللانهائية في جافاسكريبت
  const totalBeforeTax = parseFloat(((totalAmountWithTax - 3) / 1.0342).toFixed(2));

  // 4. بناء نص الإشعار (هيجيب 520 EGP)
  const notificationMessage = `${bookingData.userName} booked for ${bookingData.adults} adults, ${bookingData.childrenUnder12} children, ${bookingData.infants} infants. Total: ${totalBeforeTax} EGP`;

  // 5. بيانات الإشعار
  const notificationData = {
    id: notificationId,
    title: `New Booking: ${tripInfo.name}`,
    message: notificationMessage,
    
    // المبالغ المحفوظة في قاعدة البيانات
    totalAmountWithTax: totalAmountWithTax, // المبلغ الإجمالي بالضرائب (540.784)
    totalAmountBeforeTax: totalBeforeTax,   // المبلغ الصافي للمورد (520)
    totalAmount: totalBeforeTax,            // القيمة الصافية مباشرة بدون Math.round عشان متقلش لـ 500
    
    bookingId: bookingData.bookingId,
    tripId: bookingData.tripId || tripInfo.id || "unknown",
    tripName: tripInfo.name,
    userName: bookingData.userName,
    userEmail: bookingData.userEmail,
    phone: bookingData.phone,
    adults: bookingData.adults,
    children: bookingData.childrenUnder12,
    infants: bookingData.infants,
    tripDate: bookingData.tripDate,
    read: false,
    timestamp: Date.now(),
    type: 'new_booking'
  };

  try {
    await notificationRef.set(notificationData);
    console.log(`✅ Notification sent to supplier: ${tripInfo.supplierId} | Net: ${totalBeforeTax} EGP`);
  } catch (error) {
    console.error("❌ Error sending notification:", error);
  }
}



// ========================================
// Form Navigation
// ========================================

function updateProgressBar() {
  const progressPercentage = (currentStep + 1) * 25;
  document.getElementById('progressBar').style.width = `${progressPercentage}%`;
  
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}Indicator`);
    if (indicator) {
      indicator.dataset.active = (i === currentStep + 1) ? "true" : "false";
      if (indicator.dataset.active === "true") {
        indicator.classList.add('text-yellow-500');
        indicator.classList.remove('text-gray-500');
      } else {
        indicator.classList.add('text-gray-500');
        indicator.classList.remove('text-yellow-500');
      }
    }
  }
}

function nextStep() {
  if (!validateCurrentStep()) return;
  
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  
  if (currentStep === 3) {
    document.getElementById('submitBtn').classList.remove('hidden');
  } else {
    document.getElementById('submitBtn').classList.add('hidden');
  }
  
  updateProgressBar();
  updateSummary();
}

function prevStep() {
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep--;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  document.getElementById('submitBtn').classList.add('hidden');
  updateProgressBar();
}

// ========================================
// Trip Data Functions
// ========================================

async function fetchAllTripData() {
  try {
    showSpinner();
    const snapshot = await db.ref('trips').once('value');
    const allTripsData = snapshot.val();
    
    if (!allTripsData) {
      showToast("No trips available at the moment.", 'error');
      return {};
    }
    
    tripData = allTripsData;
    
    if (tripPName && allTripsData[tripPName]) {
      currentTrip = allTripsData[tripPName];
      currentTrip.basePrice = currentTrip.price || 0;
      currentTrip.commissionRate = currentTrip.commission || 0.10;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      
      // Add supplierId to currentTrip for easy access
      currentTrip.supplierId = tripOwnerId;
      
      populateTripTypeDropdown(tourTypes);
      displayTripInfo(currentTrip);
      
      loadMediaContent(currentTrip.media);
      loadIncludedNotIncluded(currentTrip);
      loadTimeline(currentTrip.timeline);
      loadWhatToBring(currentTrip.whatToBring);
      updateRating(currentTrip.rating);
      
      updatePriceDisplay();
    } else {
      showToast("Trip not found.", 'error');
    }
    
    return allTripsData;
  } catch (error) {
    console.error("Error fetching trip data:", error);
    showToast("Failed to load trip data.", 'error');
    throw error;
  } finally {
    hideSpinner();
  }
}

function updateRating(ratingData) {
  if (!ratingData) return;
  
  const ratingStars = document.getElementById('ratingStars');
  const ratingCount = document.getElementById('ratingCount');
  
  if (ratingStars && ratingCount) {
    ratingStars.innerHTML = '';
    
    const averageRating = ratingData.average || 0;
    const reviewCount = ratingData.count || 0;
    
    const fullStars = Math.floor(averageRating);
    for (let i = 0; i < fullStars; i++) {
      ratingStars.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    if (averageRating % 1 >= 0.5) {
      ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(averageRating);
    for (let i = 0; i < emptyStars; i++) {
      ratingStars.innerHTML += '<i class="far fa-star"></i>';
    }
    
    ratingCount.textContent = `(${reviewCount} reviews)`;
  }
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;

  const swiperWrapper = document.querySelector('.swiper-wrapper');
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');
  
  if (swiperWrapper) swiperWrapper.innerHTML = '';
  if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';

  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      if (index === 0) {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentTrip.name}">
          <div class="tour-title-overlay">
            <div class="tour-meta">
               <span class="tour-meta-item"><i class="fas fa-clock"></i> ${currentTrip.duration || ''}</span>
            </div>
          </div>
        `;
      } else {
        slide.innerHTML = `<img src="${imageUrl}" alt="${currentTrip.name}">`;
      }
      swiperWrapper.appendChild(slide);
      
      const thumb = document.createElement('img');
      thumb.src = imageUrl;
      thumb.alt = `Thumbnail ${index + 1}`;
      thumb.className = 'thumbnail';
      thumb.dataset.index = index;
      
      thumb.addEventListener('click', () => {
        swiper.slideTo(index);
        updateActiveThumbnail(index);
      });
      
      thumbnailsContainer.appendChild(thumb);
    });
  }
  
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach((video, index) => {
      const videoIndex = mediaData.images ? mediaData.images.length + index : index;
      
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
        <div class="play-button"><i class="fas fa-play"></i></div>
      `;
      swiperWrapper.appendChild(slide);
      
      const thumb = document.createElement('img');
      thumb.src = video.thumbnail;
      thumb.alt = `Video ${index + 1}`;
      thumb.className = 'thumbnail';
      thumb.dataset.index = videoIndex;
      
      thumb.addEventListener('click', () => {
        swiper.slideTo(videoIndex);
        updateActiveThumbnail(videoIndex);
      });
      
      thumbnailsContainer.appendChild(thumb);
    });
  }
  
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: {
        slideChange: function() {
          updateActiveThumbnail(this.realIndex);
          if (currentVideoSlide) {
            const iframe = currentVideoSlide.querySelector('iframe');
            if (iframe) {
              iframe.src = '';
              currentVideoSlide.innerHTML = `
                <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
                <div class="play-button"><i class="fas fa-play"></i></div>
              `;
              currentVideoSlide = null;
            }
          }
        }
      }
    });
    
    document.querySelector('.swiper').addEventListener('click', function(e) {
      const playButton = e.target.closest('.play-button');
      if (playButton) {
        const slide = playButton.closest('.swiper-slide');
        if (slide && slide.classList.contains('swiper-slide-video')) {
          playVideo(slide);
        }
      }
    });
  } else {
    swiper.update();
  }
  
  if (thumbnailsContainer.firstChild) {
    thumbnailsContainer.firstChild.classList.add('active');
  }
}

function playVideo(slide) {
  if (currentVideoSlide) {
    const iframe = currentVideoSlide.querySelector('iframe');
    if (iframe) {
      iframe.src = '';
      currentVideoSlide.innerHTML = `
        <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
        <div class="play-button"><i class="fas fa-play"></i></div>
      `;
    }
  }
  
  const thumbnail = slide.querySelector('img').src;
  slide.dataset.thumbnail = thumbnail;
  
  const videoUrl = slide.dataset.videoUrl;
  let videoId;
  
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    videoId = (match && match[2].length === 11) ? match[2] : null;
    
    if (videoId) {
      slide.innerHTML = `
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      `;
      currentVideoSlide = slide;
    }
  }
}

function updateActiveThumbnail(index) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach((thumb, i) => {
    if (parseInt(thumb.dataset.index) === index) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

function loadIncludedNotIncluded(tripData) {
  const includedContainer = document.getElementById('includedItems');
  const notIncludedContainer = document.getElementById('notIncludedItems');
  
  if (includedContainer && tripData.included) {
    includedContainer.innerHTML = '';
    tripData.included.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.style.display = 'flex';
      itemElement.style.alignItems = 'center';
      itemElement.style.gap = '10px';
      itemElement.style.marginBottom = '10px';
      itemElement.innerHTML = `<i class="fas fa-check" style="color: #4CAF50;"></i><span>${item}</span>`;
      includedContainer.appendChild(itemElement);
    });
  }
  
  if (notIncludedContainer && tripData.notIncluded) {
    notIncludedContainer.innerHTML = '';
    tripData.notIncluded.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.style.display = 'flex';
      itemElement.style.alignItems = 'center';
      itemElement.style.gap = '10px';
      itemElement.style.marginBottom = '10px';
      itemElement.innerHTML = `<i class="fas fa-times" style="color: #F44336;"></i><span>${item}</span>`;
      notIncludedContainer.appendChild(itemElement);
    });
  }
}

function loadTimeline(timelineData) {
  const timelineContainer = document.getElementById('timelineContainer');
  if (!timelineContainer || !timelineData) return;
  
  timelineContainer.innerHTML = '';
  timelineData.forEach((item) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    timelineItem.innerHTML = `
      <div class="timeline-time">${item.time}</div>
      <div class="timeline-content">
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-description">${item.description}</div>
      </div>
    `;
    if (item.time) {
      const timeElement = timelineItem.querySelector('.timeline-time');
      timeElement.setAttribute('title', item.time);
    }
    timelineContainer.appendChild(timelineItem);
  });
}

function loadWhatToBring(whatToBringData) {
  const whatToBringList = document.getElementById('whatToBringList');
  if (!whatToBringList || !whatToBringData) return;
  
  whatToBringList.innerHTML = '';
  whatToBringData.forEach(item => {
    const li = document.createElement('li');
    
    li.style.borderBottom = '1px dashed #64748b';
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '10px';
    li.innerHTML = `<i class="fas fa-check" style="color: #f59e0b;"></i> ${item}`;
    whatToBringList.appendChild(li);
  });
}

function populateTripTypeDropdown(tourTypes) {
  const tripTypeSelect = document.getElementById('tripType');
  if (!tripTypeSelect) return;
  
  tripTypeSelect.style.display = 'none';
  
  const existingButton = document.getElementById('openServicesBtn');
  if (existingButton) existingButton.remove();
  
  const selectButton = document.createElement('button');
  selectButton.id = 'openServicesBtn';
  selectButton.type = 'button';
  selectButton.className = 'form-control';
  selectButton.style.cssText = 'display: flex; align-items: center; justify-content: space-between; cursor: pointer;';
  selectButton.innerHTML = `
    <span id="selectedServiceText">No extra services</span>
    <i class="fas fa-chevron-down"></i>
  `;
  
  selectButton.onclick = openServicesPopup;
  tripTypeSelect.parentNode.insertBefore(selectButton, tripTypeSelect.nextSibling);
  
  selectedTripType = '';
  updateSelectedServiceText();
}

function displayTripInfo(tripInfo) {
  const tripTitle = document.getElementById('tourTitle');
  const tripName = document.getElementById('tripName');
  
  if (tripTitle && tripInfo.name) tripTitle.textContent = tripInfo.name;
  if (tripName && tripInfo.name) tripName.value = tripInfo.name;
}

// ========================================
// Price Calculation (All in EGP)
// ========================================

function calculateBaseTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  
  if (!currentTrip.basePrice) return 0;
  
  const basePrice = parseFloat(currentTrip.basePrice);
  const childPrice = parseFloat(currentTrip.cprice) || basePrice * 0.5;
  return (adults * basePrice) + (childrenUnder12 * childPrice);
}

function calculateExtraServicesTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  
  if (selectedTripType && tourTypes[selectedTripType]) {
    const servicePrice = parseFloat(tourTypes[selectedTripType]);
    return (adults + childrenUnder12) * servicePrice;
  }
  return 0;
}

function calculateNetTotal() {
  return calculateBaseTotal() + calculateExtraServicesTotal();
}

function calculateTotalWithTaxes() {
    // 1. نحسب إجمالي المبلغ (أساسي + خدمات إضافية)
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    
    // السعر الأساسي للبالغين
    let baseTotal = 0;
    if (currentTrip.basePrice) {
        baseTotal += adults * parseFloat(currentTrip.basePrice);
    }
    
    // سعر الأطفال (لو موجود)
    if (currentTrip.cprice) {
        baseTotal += childrenUnder12 * parseFloat(currentTrip.cprice);
    } else if (currentTrip.basePrice) {
        baseTotal += childrenUnder12 * (parseFloat(currentTrip.basePrice) * 0.5);
    }
    
    // الخدمات الإضافية
    let extraServicesTotal = 0;
    if (selectedTripType && tourTypes[selectedTripType]) {
        const servicePrice = parseFloat(tourTypes[selectedTripType]);
        extraServicesTotal = (adults + childrenUnder12) * servicePrice;
    }
    
    // الإجمالي قبل الضريبة = الأساسي + الخدمات
    const totalBeforeTax = baseTotal + extraServicesTotal;
    
    // 2. نفس معادلة صفحة البطاقات بالضبط، لكن مطبقة على totalBeforeTax
    const threePercent = totalBeforeTax * 0.03;           // 3% من الإجمالي
    const fourteenPercentOfThreePercent = threePercent * 0.14;  // 14% من الـ 3%
    const fixedFee = 3;                                  // 3 جنيه ثابت
    
    const finalPrice = totalBeforeTax + threePercent + fourteenPercentOfThreePercent + fixedFee;
    
    console.log("💰 Price breakdown:", {
        baseTotal: baseTotal,
        extraServices: extraServicesTotal,
        totalBeforeTax: totalBeforeTax,
        threePercent: threePercent,
        fourteenPercent: fourteenPercentOfThreePercent,
        fixedFee: fixedFee,
        finalPrice: finalPrice
    });
    
    return finalPrice;
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  
  if (!adultsInput || !infantsInput) return;
  
  const adults = parseInt(adultsInput.value) || 0;
  const currentInfants = parseInt(infantsInput.value) || 0;
  const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  
  if (currentInfants > maxInfants) {
    infantsInput.value = maxInfants;
  }
  infantsInput.max = maxInfants;
}

function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const infants = parseInt(document.getElementById('infants').value) || 0;
  
  const summaryDate = document.getElementById("summaryDate");
  const summaryHotel = document.getElementById("summaryHotel");
  const summaryRoom = document.getElementById("summaryRoom");
  const summaryRef = document.getElementById("summaryRef");
  const summaryTour = document.getElementById("summaryTour");
  const summaryAdults = document.getElementById("summaryAdults");
  const summaryChildrenUnder12 = document.getElementById("summaryChildrenUnder12");
  const summaryInfants = document.getElementById("summaryInfants");
  const summaryService = document.getElementById("summaryService");
  const totalPriceDisplay = document.getElementById("totalPriceDisplay");
  
  if (summaryDate) summaryDate.textContent = document.getElementById("tripDate").value || "Not specified";
  if (summaryHotel) summaryHotel.textContent = sanitizeInput(document.getElementById("hotelName").value) || "Not specified yet";
  if (summaryRoom) summaryRoom.textContent = sanitizeInput(document.getElementById("roomNumber").value) || "Not specified yet";
  if (summaryRef) summaryRef.textContent = refNumber;
  
  if (currentTrip.basePrice) {
    if (summaryTour) summaryTour.textContent = currentTrip.name;
    if (summaryAdults) summaryAdults.textContent = `${adults} Adult${adults !== 1 ? 's' : ''}`;
    if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = `${childrenUnder12} Child${childrenUnder12 !== 1 ? 'ren' : ''}`;
    if (summaryInfants) summaryInfants.textContent = `${infants} Infant${infants !== 1 ? 's' : ''}`;
    
    if (selectedTripType && tourTypes[selectedTripType]) {
      if (summaryService) summaryService.textContent = selectedTripType;
    } else {
      if (summaryService) summaryService.textContent = 'None';
    }
    
    const totalEGP = calculateTotalWithTaxes();
    const nettotalEGP = calculateNetTotal();
    const formattedTotal = formatPrice(totalEGP);
    const formatedtax = formatPrice(totalEGP - nettotalEGP);
    
    if (totalPriceDisplay) {
      totalPriceDisplay.innerHTML = `
        <div class="font-bold text-xl notranslate">${formattedTotal}</div>
        <div class="text-xs text-gray-500 mt-1">taxes ${formatedtax}</div>
      `;
    }
  }
}

// ========================================
// Form Validation & Submission
// ========================================

async function populateForm() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userSnapshot = await db.ref('egy_user').child(user.uid).once('value');
    const userData = userSnapshot.val();

    if (userData) {
      if (document.getElementById("username")) {
        document.getElementById("username").value = userData.username || "";
      }
      if (document.getElementById("customerEmail")) {
        document.getElementById("customerEmail").value = userData.email || "";
      }
      if (document.getElementById("uid")) {
        document.getElementById("uid").value = user.uid || "";
      }
      if (userData.phone && iti && document.getElementById("phone")) {
        document.getElementById("phone").value = userData.phone;
        iti.setNumber(userData.phone);
      }
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}

function validateCurrentStep() {
  let isValid = true;
  
  if (currentStep === 0) {
    const username = document.getElementById("username")?.value.trim();
    const email = document.getElementById("customerEmail")?.value.trim();
    
    if (!username) {
      showError('username', 'Please enter your full name');
      isValid = false;
    } else {
      clearError('username');
    }
    
    if (!email) {
      showError('customerEmail', 'Please enter your email address');
      isValid = false;
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).toLowerCase())) {
      showError('customerEmail', 'Please enter a valid email address');
      isValid = false;
    } else {
      clearError('customerEmail');
    }
    
    const phoneNumber = iti?.getNumber();
    if (!phoneNumber || !iti?.isValidNumber()) {
      showError('phone', 'Please enter a valid phone number with country code');
      isValid = false;
    } else {
      clearError('phone');
      if (document.getElementById("phone")) {
        document.getElementById("phone").value = phoneNumber;
      }
    }
  } else if (currentStep === 1) {
    const tripDate = document.getElementById("tripDate")?.value.trim();
    const hotelName = document.getElementById("hotelName")?.value.trim();
    const roomNumber = document.getElementById("roomNumber")?.value.trim();
    
    if (!tripDate) {
      showError('tripDate', 'Please select a trip date');
      isValid = false;
    } else {
      clearError('tripDate');
    }
    
    if (!hotelName) {
      showError('hotelName', 'Please enter your hotel name');
      isValid = false;
    } else {
      clearError('hotelName');
    }
    
    if (!roomNumber) {
      showError('roomNumber', 'Please enter your room number');
      isValid = false;
    } else {
      clearError('roomNumber');
    }
  }
  
  return isValid;
}

async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in to complete your booking');
    }

    const totalEGP = calculateTotalWithTaxes();
    const nettotalEGP= calculateNetTotal();
    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      tripDate: document.getElementById("tripDate").value,
      tripType: selectedTripType || 'None',
      tripTypePrice: selectedTripType ? tourTypes[selectedTripType] : 0,
      hotelName: sanitizeInput(document.getElementById("hotelName").value),
      roomNumber: sanitizeInput(document.getElementById("roomNumber").value),
      timestamp: Date.now(),
      status: "pending",
      tour: currentTrip.name,
      id: tripPName,
      adults: parseInt(document.getElementById('adults').value) || 0,
      childrenUnder12: parseInt(document.getElementById('childrenUnder12').value) || 0,
      infants: parseInt(document.getElementById('infants').value) || 0,
      total: totalEGP,
      netTotal: nettotalEGP,
      uid: user.uid,
      owner: tripOwnerId
    };

    // ========================================
    // KASHIER PAYMENT (UNCHANGED)
    // ========================================
    const response = await fetch('https://kashier-hash.gm-093.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: totalEGP,
        currency: 'EGP',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment processing failed');
    }

    const data = await response.json();
    
    const paymentParams = new URLSearchParams({
      merchantId: 'MID-33260-3',
      orderId: refNumber,
      amount: totalEGP,
      currency: 'EGP',
      hash: data.hash,
      mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false',
      redirectMethod: 'get'
    });

    const kashierUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;

    await db.ref('trip-bookings').child(refNumber).set({
      ...formData,
      paymenturl: kashierUrl,
    });

    // ========================================
    // SEND NOTIFICATION TO SUPPLIER (ADDED)
    // ========================================
    const bookingDataForNotification = {
      bookingId: refNumber,
      userName: formData.username,
      userEmail: formData.email,
      phone: formData.phone,
      totalAmount: nettotalEGP,
      adults: formData.adults,
      childrenUnder12: formData.childrenUnder12,
      infants: formData.infants,
      tripDate: formData.tripDate
    };
    
    await sendBookingNotificationToSupplier(bookingDataForNotification, currentTrip);

    sessionStorage.setItem("username", formData.username);
    sessionStorage.setItem("email", formData.email);
    sessionStorage.setItem("phone", formData.phone);

    showToast('Booking submitted! Redirecting to payment...');
    window.location.href = kashierUrl;
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking.'}`, 'error');
    hideSpinner();
  }
}

// ========================================
// Number Controls
// ========================================

function initNumberControls() {
  const adultsPlus = document.getElementById('adultsPlus');
  const adultsMinus = document.getElementById('adultsMinus');
  
  if (adultsPlus && adultsMinus) {
    adultsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('adults');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue < MAX_PER_TYPE) {
        input.value = currentValue + 1;
        updateInfantsMax();
        updateSummary();
      }
    });
    
    adultsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('adults');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue > 1) {
        input.value = currentValue - 1;
        updateInfantsMax();
        updateSummary();
      }
    });
  }

  const childrenPlus = document.getElementById('childrenUnder12Plus');
  const childrenMinus = document.getElementById('childrenUnder12Minus');
  
  if (childrenPlus && childrenMinus) {
    childrenPlus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('childrenUnder12');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue < MAX_PER_TYPE) {
        input.value = currentValue + 1;
        updateSummary();
      }
    });
    
    childrenMinus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('childrenUnder12');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
        updateSummary();
      }
    });
  }

  const infantsPlus = document.getElementById('infantsPlus');
  const infantsMinus = document.getElementById('infantsMinus');
  
  if (infantsPlus && infantsMinus) {
    infantsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('infants');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue < input.max) {
        input.value = currentValue + 1;
        updateSummary();
      }
    });
    
    infantsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('infants');
      if (!input) return;
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
        updateSummary();
      }
    });
  }
}

// ========================================
// Application Initialization
// ========================================

window.onload = async function () {
  if (!tripPName) {
    showToast("No trip specified.", 'error');
    return;
  }

  initCurrencyFromHeader();

  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    try {
      iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: "eg",
      });
    } catch (error) {
      console.error("intlTelInput initialization failed:", error);
    }
  }

  initNumberControls();

  flatpickr("#tripDate", {
    locale: "en",
    minDate: new Date().fp_incr(1),
    dateFormat: "Y-m-d",
    inline: false,
    disableMobile: true,
    onReady: function(selectedDates, dateStr, instance) {
      const elements = [
        instance.calendarContainer,
        ...instance.calendarContainer.querySelectorAll('.flatpickr-weekdays, .flatpickr-current-month, .flatpickr-day')
      ];
      elements.forEach(el => el?.setAttribute('translate', 'no'));
    },
    onChange: updateSummary
  });

  const style = document.createElement('style');
  style.textContent = `
    .flatpickr-calendar { background: #222 !important; color: #ffc207 !important; border-radius: 10px !important; border: 1px solid #333 !important; }
    .flatpickr-months, .flatpickr-weekdays { background: #222 !important; }
    .flatpickr-month, .flatpickr-weekday { color: #ffc207 !important; }
    .flatpickr-prev-month, .flatpickr-next-month, .flatpickr-prev-month svg, .flatpickr-next-month svg { color: #ffc107 !important; fill: #ffc107 !important; }
    .flatpickr-day { color: #ffc207 !important; background: #333 !important; border-radius: 8px !important; border: none !important; }
    .flatpickr-day:not(.flatpickr-disabled):hover { background: #444 !important; color: #ffc207 !important; }
    .flatpickr-day.selected { background: #ffc207 !important; color: #111 !important; font-weight: bold !important; }
    .flatpickr-day.prevMonthDay, .flatpickr-day.nextMonthDay { color: #666 !important; background: transparent !important; }
    .flatpickr-day.today { border: 1px solid #ffc107 !important; }
    .flatpickr-day.flatpickr-disabled, .flatpickr-day.flatpickr-disabled:hover { background: #333 !important; color: #666 !important; opacity: 0.4 !important; cursor: not-allowed !important; }
    .flatpickr-time input, .flatpickr-time .flatpickr-time-separator, .flatpickr-time .flatpickr-am-pm { color: #ffc207 !important; }
  `;
  document.head.appendChild(style);

  document.getElementById('submitBtn').addEventListener('click', submitForm);

  document.getElementById('cancelServicesBtn')?.addEventListener('click', closeServicesPopup);
  document.getElementById('confirmServicesBtn')?.addEventListener('click', confirmServiceSelection);
  document.getElementById('closeServicesPopup')?.addEventListener('click', closeServicesPopup);
  document.getElementById('extraServicesPopup')?.addEventListener('click', function(e) {
    if (e.target === this) closeServicesPopup();
  });

  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserUid = user.uid;
      populateForm();
    } else {
      currentUserUid = 'anonymous';
    }
  });

  await fetchAllTripData();
  updateSummary();
  
  setTimeout(function() {
    updatePriceDisplay();
    updateSummary();
    updateTripTypeDropdownPrices();
    updateSelectedServiceText();
  }, 500);
  
  setTimeout(function() {
    updatePriceDisplay();
    updateSummary();
  }, 1500);
};
