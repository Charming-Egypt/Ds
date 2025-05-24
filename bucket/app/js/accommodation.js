// Initialize Swiper
let swiper;
let currentVideoSlide = null;

// Global variables
let accommodationData = {};
let currentAccommodation = {};
let roomTypes = {};
let selectedRoomType = "";
let iti; // For phone input
const refNumber = generateReference();
let currentUserUid = '';
let accommodationOwnerId = '';
const MAX_ROOMS = 10;
const MAX_ADULTS_PER_ROOM = 4;
const MAX_CHILDREN_PER_ROOM = 2;
const FIXED_FEE = 3; // Fixed 3 EGP fee
const TAX_RATE = 0.03; // 3% tax
const TAX_ON_TAX_RATE = 0.14; // 14% on the 3%
let exchangeRate = 50; // Default exchange rate (will be updated from Firebase)
let currentStep = 0;

// Get accommodation name from URL parameter
function getAccommodationIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}
const accommodationId = getAccommodationIdFromURL();

// Utility Functions (same as before)
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
  setTimeout(() => {
    toast.remove();
  }, 4000);
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

// Form Navigation Functions (same as before)
function updateProgressBar() {
  const progressPercentage = (currentStep + 1) * 25;
  document.getElementById('progressBar').style.width = `${progressPercentage}%`;
  
  // Update step indicators
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}Indicator`);
    if (indicator) {
      indicator.dataset.active = (i === currentStep + 1) ? "true" : "false";
      if (indicator.dataset.active === "true") {
        indicator.classList.add('text-blue-500');
        indicator.classList.remove('text-gray-500');
      } else {
        indicator.classList.add('text-gray-500');
        indicator.classList.remove('text-blue-500');
      }
    }
  }
}

function nextStep() {
  if (!validateCurrentStep()) return;
  
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  
  // Show/hide appropriate buttons
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
  
  // Hide submit button when going back
  document.getElementById('submitBtn').classList.add('hidden');
  
  updateProgressBar();
}

// Exchange Rate Function (same as before)
async function fetchExchangeRate() {
  try {
    const snapshot = await db.ref('exchangeRates').once('value');
    const rateData = snapshot.val();
    if (rateData && rateData.rate) {
      exchangeRate = parseFloat(rateData.rate);
    }
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }
}

// Accommodation Data Functions
async function fetchAllAccommodationData() {
  try {
    showSpinner();
    const snapshot = await db.ref('accommodations').once('value');
    const allAccommodationsData = snapshot.val();
    
    if (!allAccommodationsData) {
      console.warn("No accommodation data found in Firebase.");
      showToast("No accommodations available at the moment. Please check back later.", 'error');
      return {};
    }
    
    accommodationData = allAccommodationsData;
    
    if (accommodationId && allAccommodationsData[accommodationId]) {
      currentAccommodation = allAccommodationsData[accommodationId];
      currentAccommodation.basePrice = currentAccommodation.price || 0;
      currentAccommodation.commissionRate = currentAccommodation.commission || 0.15;
      roomTypes = currentAccommodation.roomTypes || {};
      accommodationOwnerId = currentAccommodation.owner || '';
      
      populateRoomTypeDropdown(roomTypes);
      displayAccommodationInfo(currentAccommodation);
      
      // Load dynamic content
      loadMediaContent(currentAccommodation.media);
      loadAmenities(currentAccommodation.amenities);
      loadRoomTypes(currentAccommodation.roomTypes);
      loadPolicies(currentAccommodation.policies);
      updateRating(currentAccommodation.rating);
      
      // Update price display
      updatePriceDisplay();
    } else {
      showToast("Accommodation not found. Please check the URL.", 'error');
      console.error("Accommodation not found:", accommodationId);
    }
    
    return allAccommodationsData;
  } catch (error) {
    console.error("Error fetching accommodation data:", error);
    showToast("Failed to load accommodation data. Please refresh the page.", 'error');
    throw error;
  } finally {
    hideSpinner();
  }
}

function updatePriceDisplay() {
  const priceElement = document.getElementById('accommodationPrice');
  if (priceElement && currentAccommodation.price) {
    // Calculate total price for one night
    const totalPrice = calculateTotalWithTaxesAndCommission();
    const priceInUSD = (totalPrice / exchangeRate).toFixed(2);
    priceElement.innerHTML = `
      <span class="notranslate">${priceInUSD} $</span>
      <span class="text-sm text-gray-500 notranslate">(${Math.round(totalPrice)} EGP)</span>
    `;
  }
}

function updateRating(ratingData) {
  if (!ratingData) return;
  
  const ratingStars = document.getElementById('ratingStars');
  const ratingCount = document.getElementById('ratingCount');
  
  if (ratingStars && ratingCount) {
    // Clear existing stars
    ratingStars.innerHTML = '';
    
    const averageRating = ratingData.average || 0;
    const reviewCount = ratingData.count || 0;
    
    // Add full stars
    const fullStars = Math.floor(averageRating);
    for (let i = 0; i < fullStars; i++) {
      ratingStars.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (averageRating % 1 >= 0.5) {
      ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    const emptyStars = 5 - Math.ceil(averageRating);
    for (let i = 0; i < emptyStars; i++) {
      ratingStars.innerHTML += '<i class="far fa-star"></i>';
    }
    
    // Update review count
    ratingCount.textContent = `(${reviewCount} reviews)`;
  }
}

function loadMediaContent(mediaData) {
  if (!mediaData) return;

  const swiperWrapper = document.querySelector('.swiper-wrapper');
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');
  
  // Clear existing slides and thumbnails
  if (swiperWrapper) swiperWrapper.innerHTML = '';
  if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';

  // Calculate total price for one night
  const totalPrice = calculateTotalWithTaxesAndCommission();
  const priceInUSD = (totalPrice / exchangeRate).toFixed(2);

  // Add image slides
  if (mediaData.images && mediaData.images.length > 0) {
    mediaData.images.forEach((imageUrl, index) => {
      // Add main slide
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      // First slide gets special treatment (price tag and title)
      if (index === 0) {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentAccommodation.name}">
          <div class="price-tag notranslate">
            ${priceInUSD} $
          </div>
          <div class="accommodation-title-overlay">
            <h1>${currentAccommodation.name}</h1>
            <div class="accommodation-meta">
              <span class="accommodation-meta-item">
                <i class="fas fa-star"></i> ${currentAccommodation.rating?.average?.toFixed(1) || '4.9'}
              </span>
              <span class="accommodation-meta-item">
                <i class="fas fa-map-marker-alt"></i> ${currentAccommodation.location || 'Sharm El Sheikh'}
              </span>
              <span class="accommodation-meta-item">
                <i class="fas fa-bed"></i> ${Object.keys(currentAccommodation.roomTypes || {}).length} Room Types
              </span>
            </div>
          </div>
        `;
      } else {
        slide.innerHTML = `
          <img src="${imageUrl}" alt="${currentAccommodation.name}">
          <div class="accommodation-title-overlay">
            <h1>${currentAccommodation.name}</h1>
          </div>
        `;
      }
      
      swiperWrapper.appendChild(slide);
      
      // Add thumbnail
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
  
  // Add video slides
  if (mediaData.videos && mediaData.videos.length > 0) {
    mediaData.videos.forEach((video, index) => {
      const videoIndex = mediaData.images ? mediaData.images.length + index : index;
      
      // Create video slide
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="${currentAccommodation.name} video" class="video-thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
        <div class="accommodation-title-overlay">
          <h1>${currentAccommodation.name}</h1>
        </div>
      `;
      
      swiperWrapper.appendChild(slide);
      
      // Add video thumbnail
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
  
  // Initialize or update Swiper
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      on: {
        slideChange: function() {
          updateActiveThumbnail(this.realIndex);
          
          // Pause any playing video when changing slides
          if (currentVideoSlide) {
            const iframe = currentVideoSlide.querySelector('iframe');
            if (iframe) {
              iframe.src = ''; // This stops the video
              currentVideoSlide.innerHTML = `
                <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentAccommodation.name} video" class="video-thumbnail">
                <div class="play-button">
                  <i class="fas fa-play"></i>
                </div>
                <div class="accommodation-title-overlay">
                  <h1>${currentAccommodation.name}</h1>
                </div>
              `;
              currentVideoSlide = null;
            }
          }
        }
      }
    });
    
    // Add click handler for play buttons
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
  
  // Set first thumbnail as active
  if (thumbnailsContainer.firstChild) {
    thumbnailsContainer.firstChild.classList.add('active');
  }
}

function playVideo(slide) {
  if (currentVideoSlide) {
    // If another video is playing, stop it first
    const iframe = currentVideoSlide.querySelector('iframe');
    if (iframe) {
      iframe.src = '';
      currentVideoSlide.innerHTML = `
        <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentAccommodation.name} video" class="video-thumbnail">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
        <div class="accommodation-title-overlay">
          <h1>${currentAccommodation.name}</h1>
        </div>
      `;
    }
  }
  
  // Store the thumbnail for later
  const thumbnail = slide.querySelector('img').src;
  slide.dataset.thumbnail = thumbnail;
  
  // Extract video ID from URL (works for YouTube)
  const videoUrl = slide.dataset.videoUrl;
  let videoId;
  
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    // YouTube URL
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    videoId = (match && match[2].length === 11) ? match[2] : null;
    
    if (videoId) {
      slide.innerHTML = `
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        <div class="accommodation-title-overlay">
          <h1>${currentAccommodation.name}</h1>
        </div>
      `;
      currentVideoSlide = slide;
    }
  } else {
    // For other video providers, you might need different handling
    slide.innerHTML = `
      <video width="100%" height="100%" controls autoplay>
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      <div class="accommodation-title-overlay">
        <h1>${currentAccommodation.name}</h1>
      </div>
    `;
    currentVideoSlide = slide;
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

function loadAmenities(amenitiesData) {
  const amenitiesContainer = document.getElementById('amenitiesList');
  if (!amenitiesContainer || !amenitiesData) return;
  
  amenitiesContainer.innerHTML = '';
  
  amenitiesData.forEach(amenity => {
    const itemElement = document.createElement('div');
    itemElement.style.display = 'flex';
    itemElement.style.alignItems = 'center';
    itemElement.style.gap = '10px';
    itemElement.style.marginBottom = '10px';
    itemElement.innerHTML = `
      <i class="fas fa-check" style="color: #3b82f6;"></i>
      <span>${amenity}</span>
    `;
    amenitiesContainer.appendChild(itemElement);
  });
}

function loadRoomTypes(roomTypesData) {
  const roomTypesContainer = document.getElementById('roomTypesContainer');
  if (!roomTypesContainer || !roomTypesData) return;
  
  roomTypesContainer.innerHTML = '';
  
  Object.entries(roomTypesData).forEach(([roomType, price]) => {
    const roomTypeElement = document.createElement('div');
    roomTypeElement.className = 'room-type-item';
    
    roomTypeElement.innerHTML = `
      <div class="room-type-header">
        <h3>${roomType}</h3>
        <span class="room-price">${price} EGP/night</span>
      </div>
      <div class="room-type-features">
        <div class="feature">
          <i class="fas fa-user"></i> Max 2 Adults
        </div>
        <div class="feature">
          <i class="fas fa-child"></i> Max 2 Children
        </div>
      </div>
    `;
    
    roomTypesContainer.appendChild(roomTypeElement);
  });
}

function loadPolicies(policiesData) {
  const policiesList = document.getElementById('policiesList');
  if (!policiesList || !policiesData) return;
  
  policiesList.innerHTML = '';
  policiesData.forEach(policy => {
    const li = document.createElement('li');
    li.style.padding = '8px 0';
    li.style.borderBottom = '1px dashed #64748b';
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '10px';
    li.innerHTML = `
      <i class="fas fa-info-circle" style="color: #3b82f6;"></i> ${policy}
    `;
    policiesList.appendChild(li);
  });
}

function populateRoomTypeDropdown(roomTypesData) {
  const roomTypeSelect = document.getElementById('roomType');
  if (!roomTypeSelect) {
    console.error("Room type select element not found");
    return;
  }
  
  roomTypeSelect.innerHTML = '';
  
  if (roomTypesData && typeof roomTypesData === 'object') {
    Object.keys(roomTypesData).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${key} - ${roomTypesData[key]} EGP/night`;
      roomTypeSelect.appendChild(option);
    });
  }
}

function displayAccommodationInfo(accommodationInfo) {
  const accommodationTitle = document.getElementById('accommodationTitle');
  const accommodationName = document.getElementById('accommodationName');
  
  if (accommodationTitle && accommodationInfo.name) {
    accommodationTitle.textContent = accommodationInfo.name;
  }
  
  if (accommodationName) {
    accommodationName.value = accommodationId;
  }
}

// Price Calculation Functions
function calculateBaseTotal() {
  const rooms = parseInt(document.getElementById('rooms').value) || 0;
  const selectedRoomType = document.getElementById('roomType').value;
  
  if (!selectedRoomType || !currentAccommodation.roomTypes || !currentAccommodation.roomTypes[selectedRoomType]) {
    return 0;
  }
  
  const roomPrice = parseInt(currentAccommodation.roomTypes[selectedRoomType]);
  return rooms * roomPrice;
}

function calculateNights() {
  const checkInDate = document.getElementById('checkInDate').value;
  const checkOutDate = document.getElementById('checkOutDate').value;
  
  if (!checkInDate || !checkOutDate) return 0;
  
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  
  // Calculate difference in days
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function calculateNetTotal() {
  const baseTotal = calculateBaseTotal();
  const nights = calculateNights();
  return baseTotal * nights;
}

function calculateTotalWithTaxesAndCommission() {
  const netTotal = calculateNetTotal();
  const baseTax = netTotal * TAX_RATE; // 3% of net total
  const taxOnTax = baseTax * TAX_ON_TAX_RATE; // 14% of the 3%
  const totalTax = baseTax + taxOnTax + FIXED_FEE;
  const subtotalWithTax = netTotal + totalTax;
  const commissionRate = currentAccommodation.commissionRate || 0.15;
  const commission = subtotalWithTax * commissionRate;
  return subtotalWithTax + commission;
}

function updateSummary() {
  const rooms = parseInt(document.getElementById('rooms').value) || 0;
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children = parseInt(document.getElementById('children').value) || 0;
  const selectedRoomType = document.getElementById('roomType').value;
  const specialRequests = document.getElementById('specialRequests').value;
  
  const checkInDate = document.getElementById('checkInDate').value;
  const checkOutDate = document.getElementById('checkOutDate').value;
  const nights = calculateNights();
  
  const summaryCheckIn = document.getElementById("summaryCheckIn");
  const summaryCheckOut = document.getElementById("summaryCheckOut");
  const summaryNights = document.getElementById("summaryNights");
  const summaryRef = document.getElementById("summaryRef");
  const summaryAccommodation = document.getElementById("summaryAccommodation");
  const summaryRoomType = document.getElementById("summaryRoomType");
  const summaryRooms = document.getElementById("summaryRooms");
  const summaryAdults = document.getElementById("summaryAdults");
  const summaryChildren = document.getElementById("summaryChildren");
  const summaryRequests = document.getElementById("summaryRequests");
  const totalPriceDisplay = document.getElementById("totalPriceDisplay");
  
  if (summaryCheckIn) summaryCheckIn.textContent = checkInDate || "Not specified";
  if (summaryCheckOut) summaryCheckOut.textContent = checkOutDate || "Not specified";
  if (summaryNights) summaryNights.textContent = nights || "0";
  if (summaryRef) summaryRef.textContent = refNumber;
  
  if (selectedRoomType && currentAccommodation.roomTypes && currentAccommodation.roomTypes[selectedRoomType]) {
    const roomPrice = parseInt(currentAccommodation.roomTypes[selectedRoomType]);
    
    if (summaryAccommodation) summaryAccommodation.textContent = `${currentAccommodation.name}`;
    if (summaryRoomType) summaryRoomType.textContent = `${selectedRoomType}`;
    if (summaryRooms) summaryRooms.textContent = `${rooms} Room${rooms !== 1 ? 's' : ''}`;
    if (summaryAdults) summaryAdults.textContent = `${adults} Adult${adults !== 1 ? 's' : ''}`;
    if (summaryChildren) summaryChildren.textContent = `${children} Child${children !== 1 ? 'ren' : ''}`;
    if (summaryRequests) summaryRequests.textContent = specialRequests || 'None';
    
    const total = calculateTotalWithTaxesAndCommission();
    const totalUSD = (total / exchangeRate).toFixed(2);
    
    if (totalPriceDisplay) {
      totalPriceDisplay.innerHTML = `
        <div class="font-bold text-xl notranslate">${totalUSD} $</div>
        <div class="text-sm text-blue-600 mt-1 notranslate">${total.toFixed(2)} EGP</div>
        <div class="text-xs text-gray-500">Exchange rate: 1 USD = ${exchangeRate} EGP</div>
        <div class="text-xs text-gray-500">all taxes included</div>
      `;
    }
  }
}

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
    const checkInDate = document.getElementById("checkInDate")?.value.trim();
    const checkOutDate = document.getElementById("checkOutDate")?.value.trim();
    
    if (!checkInDate) {
      showError('checkInDate', 'Please select a check-in date');
      isValid = false;
    } else {
      clearError('checkInDate');
    }
    
    if (!checkOutDate) {
      showError('checkOutDate', 'Please select a check-out date');
      isValid = false;
    } else {
      clearError('checkOutDate');
    }
    
    // Validate check-out is after check-in
    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      
      if (checkOut <= checkIn) {
        showError('checkOutDate', 'Check-out date must be after check-in date');
        isValid = false;
      } else {
        clearError('checkOutDate');
      }
    }
  } else if (currentStep === 2) {
    const roomType = document.getElementById("roomType")?.value;
    const rooms = parseInt(document.getElementById("rooms").value) || 0;
    const adults = parseInt(document.getElementById("adults").value) || 0;
    const children = parseInt(document.getElementById("children").value) || 0;
    
    if (!roomType) {
      showError('roomType', 'Please select a room type');
      isValid = false;
    } else {
      clearError('roomType');
    }
    
    if (rooms < 1) {
      showError('rooms', 'Please select at least 1 room');
      isValid = false;
    } else {
      clearError('rooms');
    }
    
    if (adults < 1) {
      showError('adults', 'Please specify at least 1 adult');
      isValid = false;
    } else {
      clearError('adults');
    }
    
    // Validate adults per room
    const adultsPerRoom = adults / rooms;
    if (adultsPerRoom > MAX_ADULTS_PER_ROOM) {
      showError('adults', `Maximum ${MAX_ADULTS_PER_ROOM} adults per room`);
      isValid = false;
    } else {
      clearError('adults');
    }
    
    // Validate children per room
    const childrenPerRoom = children / rooms;
    if (childrenPerRoom > MAX_CHILDREN_PER_ROOM) {
      showError('children', `Maximum ${MAX_CHILDREN_PER_ROOM} children per room`);
      isValid = false;
    } else {
      clearError('children');
    }
  }
  
  return isValid;
}

// Form Submission
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in to complete your booking');
    }

    const total = calculateTotalWithTaxesAndCommission();
    const netTotal = calculateNetTotal();
    const baseTax = netTotal * TAX_RATE;
    const taxOnTax = baseTax * TAX_ON_TAX_RATE;
    const totalTax = baseTax + taxOnTax + FIXED_FEE;
    const subtotalWithTax = netTotal + totalTax;
    const commissionRate = currentAccommodation.commissionRate || 0.15;
    const commission = subtotalWithTax * commissionRate;
    const nights = calculateNights();

    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      checkInDate: document.getElementById("checkInDate").value,
      checkOutDate: document.getElementById("checkOutDate").value,
      nights: nights,
      roomType: document.getElementById("roomType").value,
      roomTypePrice: currentAccommodation.roomTypes[document.getElementById("roomType").value],
      basePrice: currentAccommodation.price,
      rooms: parseInt(document.getElementById('rooms').value) || 0,
      adults: parseInt(document.getElementById('adults').value) || 0,
      children: parseInt(document.getElementById('children').value) || 0,
      specialRequests: sanitizeInput(document.getElementById("specialRequests").value),
      timestamp: Date.now(),
      status: "pending",
      accommodation: accommodationId,
      currency: 'EGP',
      total: total.toFixed(2),
      netTotal: netTotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      commission: commission.toFixed(2),
      uid: user.uid,
      owner: accommodationOwnerId,
      exchangeRate: exchangeRate
    };

    // Generate payment hash
    const response = await fetch('https://api.discover-sharm.com/.netlify/functions/generate-hash', {
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
    
    // Construct payment URL
    const paymentParams = new URLSearchParams({
      merchantId: 'MID-33260-3',
      orderId: refNumber,
      amount: formData.total,
      currency: 'EGP',
      hash: data.hash,
      mode: 'live',
      merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html',
      failureRedirect: 'false',
      redirectMethod: 'get'
    });

    const kashierUrl = `https://payments.kashier.io/?${paymentParams.toString()}`;

    // Save complete booking to Firebase
    await db.ref('accommodation-bookings').child(refNumber).set({
      ...formData,
      paymenturl: kashierUrl,
    });

    // Store user data in session
    sessionStorage.setItem("username", formData.username);
    sessionStorage.setItem("email", formData.email);
    sessionStorage.setItem("phone", formData.phone);

    showToast('Booking submitted! Redirecting to payment...');
    
    // Redirect to payment page in the same window
    window.location.href = kashierUrl;
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
  }
}

// Initialize Number Controls
function initNumberControls() {
  // Rooms controls
  const roomsPlus = document.getElementById('roomsPlus');
  const roomsMinus = document.getElementById('roomsMinus');
  
  if (roomsPlus && roomsMinus) {
    roomsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('rooms');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue < MAX_ROOMS) {
        input.value = currentValue + 1;
        updateSummary();
      }
      return false;
    });
    
    roomsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('rooms');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue > 1) {
        input.value = currentValue - 1;
        updateSummary();
      }
      return false;
    });
  }

  // Adults controls
  const adultsPlus = document.getElementById('adultsPlus');
  const adultsMinus = document.getElementById('adultsMinus');
  
  if (adultsPlus && adultsMinus) {
    adultsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('adults');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      const rooms = parseInt(document.getElementById('rooms').value) || 1;
      const maxAdults = rooms * MAX_ADULTS_PER_ROOM;
      
      if (currentValue < maxAdults) {
        input.value = currentValue + 1;
        updateSummary();
      }
      return false;
    });
    
    adultsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('adults');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue > 1) {
        input.value = currentValue - 1;
        updateSummary();
      }
      return false;
    });
  }

  // Children controls
  const childrenPlus = document.getElementById('childrenPlus');
  const childrenMinus = document.getElementById('childrenMinus');
  
  if (childrenPlus && childrenMinus) {
    childrenPlus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('children');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      const rooms = parseInt(document.getElementById('rooms').value) || 1;
      const maxChildren = rooms * MAX_CHILDREN_PER_ROOM;
      
      if (currentValue < maxChildren) {
        input.value = currentValue + 1;
        updateSummary();
      }
      return false;
    });
    
    childrenMinus.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('children');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue > 0) {
        input.value = currentValue - 1;
        updateSummary();
      }
      return false;
    });
  }
}

// Initialize the application
window.onload = async function () {
  // Check if accommodation ID is provided
  if (!accommodationId) {
    showToast("No accommodation specified. Please access this page through a valid accommodation link.", 'error');
    return;
  }

  // Initialize phone input
  const phoneInput = document.querySelector("#phone");
  if (phoneInput) {
    try {
      iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ['eg', 'gb', 'de', 'ru', 'tr', 'it'],
        separateDialCode: true,
        initialCountry: "eg",
        customPlaceholder: (selectedCountryPlaceholder, selectedCountryData) => "e.g. " + selectedCountryPlaceholder
      });
    } catch (error) {
      console.error("intlTelInput initialization failed:", error);
    }
  }

  // Initialize number controls
  initNumberControls();

  // Initialize date pickers
  flatpickr("#checkInDate", {
    locale: "en",
    minDate: new Date().fp_incr(1), // Tomorrow's date
    dateFormat: "Y-m-d",
    inline: false,
    disableMobile: true,
    onChange: function(selectedDates, dateStr, instance) {
      // Set minimum check-out date to one day after check-in
      const checkOutPicker = document.getElementById('checkOutDate')._flatpickr;
      if (checkOutPicker) {
        checkOutPicker.set('minDate', new Date(selectedDates[0].getTime() + 86400000);
      }
      updateSummary();
    }
  });

  flatpickr("#checkOutDate", {
    locale: "en",
    minDate: new Date().fp_incr(2), // Day after tomorrow by default
    dateFormat: "Y-m-d",
    inline: false,
    disableMobile: true,
    onChange: updateSummary
  });

  // Room type change handler
  document.getElementById('roomType').addEventListener('change', function() {
    selectedRoomType = this.value;
    updateSummary();
  });

  // Form submission handler
  document.getElementById('submitBtn').addEventListener('click', submitForm);

  // Initialize user authentication
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserUid = user.uid;
      populateForm();
    } else {
      currentUserUid = 'anonymous';
    }
  });

  // Initialize components
  await Promise.all([
    populateForm(),
    fetchExchangeRate(),
    fetchAllAccommodationData()
  ]);
  
  // Set initial summary values
  updateSummary();
};
