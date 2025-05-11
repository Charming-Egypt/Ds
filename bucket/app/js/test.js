// booking.js

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
  authDomain: "egypt-travels.firebaseapp.com",
  databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com ",
  projectId: "egypt-travels",
  storageBucket: "egypt-travels.appspot.com",
  messagingSenderId: "477485386557",
  appId: "1:477485386557:web:755f9649043288db819354"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Global variables
let tripData = {};
let currentTrip = {};
let tourTypes = {};
let selectedTripType = "";
let iti; // For phone input
const refNumber = generateReference();
let currentUserUid = '';
let tripOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_INFANTS_PER_ADULT = 2;
const MAX_TOTAL_INFANTS = 10;
const FIXED_FEE = 3; // Fixed 3 EGP fee
const TAX_RATE = 0.03; // 3% tax
const TAX_ON_TAX_RATE = 0.14; // 14% on the 3%
let exchangeRate = 50; // Default exchange rate (will be updated from Firebase)

function getTripIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('trip-id');
}
const tripPName = getTripIdFromURL();

// Utility Functions
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'DS_' + result;
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/[<>]/g, "").trim();
}

async function fetchExchangeRate() {
  try {
    const snapshot = await database.ref('exchangeRates').once('value');
    const rateData = snapshot.val();
    if (rateData && rateData.rate) {
      exchangeRate = parseFloat(rateData.rate);
    }
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }
}

async function fetchAllTripData() {
  try {
    showSpinner();
    const snapshot = await database.ref('trips').once('value');
    const allTripsData = snapshot.val();
    if (!allTripsData) {
      console.warn("No trip data found in Firebase.");
      showToast("No trips available at the moment. Please check back later.", 'error');
      return {};
    }
    tripData = allTripsData;
    if (tripPName && allTripsData[tripPName]) {
      currentTrip = allTripsData[tripPName];
      currentTrip.basePrice = currentTrip.price || 0;
      currentTrip.commissionRate = currentTrip.commission || 0.15;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      populateTripTypeDropdown(tourTypes);
      displayTripInfo(currentTrip);
      loadMediaContent(currentTrip.media);
      loadIncludedNotIncluded(currentTrip);
      loadTimeline(currentTrip.timeline);
      loadWhatToBring(currentTrip.whatToBring);
      updateRating(currentTrip.rating);
      updatePriceDisplay();
    } else {
      showToast("Trip not found. Please check the URL.", 'error');
      console.error("Trip not found:", tripPName);
    }
    return allTripsData;
  } catch (error) {
    console.error("Error fetching trip data:", error);
    showToast("Failed to load trip data. Please refresh the page.", 'error');
    throw error;
  } finally {
    hideSpinner();
  }
}

function updatePriceDisplay() {
  const priceElement = document.getElementById('tourPrice');
  if (priceElement && currentTrip.price) {
    priceElement.textContent = `$${currentTrip.price}`;
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
          <div class="price-tag">$${currentTrip.price}</div>
          <div class="tour-title-overlay">
            <h1>${currentTrip.name}</h1>
            <div class="tour-meta">
              <span class="tour-meta-item"><i class="fas fa-star"></i> ${currentTrip.rating?.average?.toFixed(1) || '4.9'}</span>
              <span class="tour-meta-item"><i class="fas fa-clock"></i> Full day</span>
              <span class="tour-meta-item"><i class="fas fa-user-group"></i> Max 10</span>
            </div>
          </div>`;
      } else {
        slide.innerHTML = `<img src="${imageUrl}" alt="${currentTrip.name}"><div class="tour-title-overlay"><h1>${currentTrip.name}</h1></div>`;
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
        <div class="tour-title-overlay"><h1>${currentTrip.name}</h1></div>`;
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
      loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: {
        slideChange: function () {
          updateActiveThumbnail(this.realIndex);
          if (currentVideoSlide) {
            const iframe = currentVideoSlide.querySelector('iframe');
            if (iframe) {
              iframe.src = '';
              currentVideoSlide.innerHTML = `
                <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
                <div class="play-button"><i class="fas fa-play"></i></div>
                <div class="tour-title-overlay"><h1>${currentTrip.name}</h1></div>`;
              currentVideoSlide = null;
            }
          }
        }
      }
    });

    document.querySelector('.swiper').addEventListener('click', function (e) {
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
        <div class="tour-title-overlay"><h1>${currentTrip.name}</h1></div>`;
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
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/ ${videoId}?autoplay=1&mute=1" frameborder="0" allowfullscreen></iframe>
        <div class="tour-title-overlay"><h1>${currentTrip.name}</h1></div>`;
      currentVideoSlide = slide;
    }
  } else {
    slide.innerHTML = `
      <video width="100%" height="100%" controls autoplay><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>
      <div class="tour-title-overlay"><h1>${currentTrip.name}</h1></div>`;
    currentVideoSlide = slide;
  }
}

function updateActiveThumbnail(index) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach((thumb, i) => {
    thumb.classList.toggle('active', parseInt(thumb.dataset.index) === index);
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
  timelineData.forEach((item, index) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    timelineItem.innerHTML = `
      <div class="timeline-time"></div>
      <div class="timeline-content">
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-description">${item.description}</div>
      </div>`;
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
    li.style.padding = '8px 0';
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
  tripTypeSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'No extra services needed';
  defaultOption.selected = true;
  tripTypeSelect.appendChild(defaultOption);
  if (tourTypes && typeof tourTypes === 'object') {
    Object.keys(tourTypes).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${tourTypes[key]} EGP (per person)`;
      tripTypeSelect.appendChild(option);
    });
  }
}

function displayTripInfo(tripInfo) {
  const tripTitle = document.getElementById('tourTitle');
  const tripName = document.getElementById('tripName');
  if (tripTitle && tripInfo.name) tripTitle.textContent = tripInfo.name;
  if (tripName) tripName.value = tripPName;
}

// Form Validation & Submission

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

function calculateBaseTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  if (!currentTrip.basePrice) return 0;
  const basePrice = parseInt(currentTrip.basePrice);
  return (adults * basePrice) + (childrenUnder12 * Math.round(basePrice * 0.7));
}

function calculateExtraServicesTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const selectedService = document.getElementById('tripType').value;
  if (selectedService && tourTypes[selectedService]) {
    const servicePrice = parseInt(tourTypes[selectedService]);
    return (adults + childrenUnder12) * servicePrice;
  }
  return 0;
}

function calculateNetTotal() {
  return calculateBaseTotal() + calculateExtraServicesTotal();
}

function calculateTotalWithTaxesAndCommission() {
  const netTotal = calculateNetTotal();
  const baseTax = netTotal * TAX_RATE;
  const taxOnTax = baseTax * TAX_ON_TAX_RATE;
  const totalTax = baseTax + taxOnTax + FIXED_FEE;
  const subtotalWithTax = netTotal + totalTax;
  const commissionRate = currentTrip.commissionRate || 0.15;
  const commission = subtotalWithTax * commissionRate;
  return subtotalWithTax + commission;
}

function updateInfantsMax() {
  const adultsInput = document.getElementById('adults');
  const infantsInput = document.getElementById('infants');
  if (!adultsInput || !infantsInput) return;
  const adults = parseInt(adultsInput.value) || 0;
  const maxInfants = Math.min(adults * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  infantsInput.max = maxInfants;
  if (parseInt(infantsInput.value) > maxInfants) {
    infantsInput.value = maxInfants;
  }
}

let debounceTimer;

function updateSummary() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    const infants = parseInt(document.getElementById('infants').value) || 0;
    const selectedService = document.getElementById('tripType').value;
    const totalPriceDisplay = document.getElementById("totalPriceDisplay");

    const total = calculateTotalWithTaxesAndCommission();
    const totalUSD = (total / exchangeRate).toFixed(2);
    if (totalPriceDisplay) {
      totalPriceDisplay.innerHTML = `
        <div class="font-bold text-xl notranslate">${totalUSD} $</div>
        <div class="text-sm text-green-600 mt-1 notranslate">${total.toFixed(2)} EGP</div>
        <div class="text-xs text-gray-500">Exchange rate: 1 USD = ${exchangeRate} EGP</div>
        <div class="text-xs text-gray-500">all taxes included</div>`;
    }
  }, 300);
}

async function populateForm() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  try {
    const userSnapshot = await firebase.database().ref('egy_user').child(user.uid).once('value');
    const userData = userSnapshot.val();
    if (userData) {
      document.getElementById("username").value = userData.username || "";
      document.getElementById("customerEmail").value = userData.email || "";
      document.getElementById("uid").value = user.uid || "";
      if (userData.phone && iti && document.getElementById("phone")) {
        document.getElementById("phone").value = userData.phone;
        iti.setNumber(userData.phone);
      }
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}

async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Please sign in to complete your booking');

    const total = calculateTotalWithTaxesAndCommission();
    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      timestamp: Date.now(),
      status: "pending",
      tour: getTripIdFromURL(),
      adults: parseInt(document.getElementById('adults').value) || 0,
      childrenUnder12: parseInt(document.getElementById('childrenUnder12').value) || 0,
      infants: parseInt(document.getElementById('infants').value) || 0,
      currency: 'EGP',
      total: total,
      uid: user.uid,
      owner: tripOwnerId,
      exchangeRate: exchangeRate
    };

    const response = await fetch('https://api.discover-sharm.com/.netlify/functions/generate-hash ', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: formData.total,
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
      amount: formData.total,
      currency: 'EGP',
      hash: data.hash,
      mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html ',
      failureRedirect: 'false',
      redirectMethod: 'get'
    });

    const kashierUrl = `https://checkout.kashier.io/? ${paymentParams.toString()}`;
    await firebase.database().ref('trip-bookings').child(refNumber).set(formData);

    sessionStorage.setItem("username", formData.username);
    sessionStorage.setItem("email", formData.email);
    sessionStorage.setItem("phone", formData.phone);

    showToast('Booking submitted! Opening payment window...');

    const width = Math.min(window.screen.width, 1200);
    const height = Math.min(window.screen.height, 800);
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const paymentWindow = window.open(
      kashierUrl,
      'PaymentWindow',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,location=no,status=no,menubar=no`
    );

    if (paymentWindow) {
      paymentWindow.focus();
      const checkWindowClosed = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkWindowClosed);
          window.location.reload();
        }
      }, 1000);
    } else {
      showToast('Popup was blocked. Please allow popups or click below.', 'error');
      const proceedBtn = document.createElement('button');
      proceedBtn.textContent = 'Proceed to Payment';
      proceedBtn.onclick = () => window.location.href = kashierUrl;
      const toast = document.querySelector('.toast-error');
      if (toast) toast.appendChild(proceedBtn);
      else window.location.href = kashierUrl;
    }
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    hideSpinner();
  }
}

function validateCurrentStep() {
  let isValid = true;
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

  return isValid;
}

document.addEventListener('DOMContentLoaded', async () => {
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.min.js "
    });
  }

  await fetchExchangeRate();
  await fetchAllTripData();
});
