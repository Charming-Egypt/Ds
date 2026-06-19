// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// Complete Version with Enhanced Gallery & Thumbnails
// ==========================================================================

const TripDisplay = (() => {
  // ==========================================================================
  // CONSTANTS
  // ==========================================================================
  const SELECTORS = {
    tripName: '#tripName',
    spinner: '#spinner',
    tourTitle: '#tourTitle',
    tourDuration: '#tourDuration',
    tourPrice: '#tourPrice',
    tourDescription: '#tourDescription',
    descriptionContainer: '#descriptionContainer',
    swiperWrapper: '.swiper-wrapper',
    swiperContainer: '.swiper',
    swiperPagination: '.swiper-pagination',
    swiperNext: '.swiper-button-next',
    swiperPrev: '.swiper-button-prev',
    thumbnailsOverlay: '#thumbnailsOverlay',
    includedItems: '#includedItems',
    notIncludedItems: '#notIncludedItems',
    timelineContainer: '#timelineContainer',
    whatToBringList: '#whatToBringList',
    reviewModal: '#reviewModal',
    openReviewBtn: '#openReviewBtn',
    submitReviewBtn: '#submitReviewBtn',
    starSelector: '#starSelector',
    ratingValue: '#ratingValue',
    commentInput: '#commentInput',
    charCount: '#charCount',
    voucherInput: '#voucherInput',
    avgStars: '#avgStars',
    reviewsCountText: '#reviewsCountText',
    reviewsListContainer: '#reviewsListContainer',
    cancelReviewBtn: '#cancelReviewBtn',
    closePopupBtn: '.close-popup-btn',
    reviewOverlay: '.services-popup-overlay'
  };

  const VOUCHER_PATTERN = /^DS_[A-Z0-9]{8,}$/;
  const MIN_COMMENT_LENGTH = 5;
  const MAX_COMMENT_LENGTH = 500;
  const TOAST_DURATION = 4000;
  const DEFAULT_CURRENCY = 'EGP';

  // ==========================================================================
  // GLOBAL STATE
  // ==========================================================================
  let swiper = null;
  let currentVideoSlide = null;
  let tripData = {};
  let currentTrip = {};
  let tourTypes = {};
  let tripOwnerId = '';
  let tripReviews = [];
  let currentUserReview = null;
  let currentUserUid = '';

  // Currency
  let currentCurrency = DEFAULT_CURRENCY;
  let exchangeRates = { EGP: 1 };
  let ratesLoaded = false;
  let currencyChangeHandler = null;

  // ==========================================================================
  // UTILITY
  // ==========================================================================
  function getTripIdFromURL() {
    return new URLSearchParams(window.location.search).get('trip-id');
  }

  const tripSlug = getTripIdFromURL();

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
      animation: tripSlideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
  }

  // ==========================================================================
  // CURRENCY
  // ==========================================================================
  function getCurrentCurrencyFromHeader() {
    if (window.SharmCurrency?.get) return window.SharmCurrency.get();
    return localStorage.getItem('preferredCurrency') || DEFAULT_CURRENCY;
  }

  function getExchangeRatesFromHeader() {
    return window.SharmCurrency?.rates || null;
  }

  function formatPrice(price) {
    if (!ratesLoaded || currentCurrency === DEFAULT_CURRENCY) {
      return parseFloat(price).toFixed(2) + ' EGP';
    }
    const converted = price * exchangeRates[currentCurrency];
    switch (currentCurrency) {
      case 'USD': return '$' + converted.toFixed(2);
      case 'EUR': return '€' + converted.toFixed(2);
      case 'GBP': return '£' + converted.toFixed(2);
      default: return price.toFixed(2) + ' EGP';
    }
  }

  function handleCurrencyChange(e) {
    if (e.detail?.currency) {
      currentCurrency = e.detail.currency;
      if (e.detail.rates) {
        exchangeRates = e.detail.rates;
        ratesLoaded = true;
      }
      updatePriceDisplay();
    }
  }

  function initCurrency() {
    currentCurrency = getCurrentCurrencyFromHeader();
    const rates = getExchangeRatesFromHeader();
    if (rates) {
      exchangeRates = rates;
      ratesLoaded = true;
    }
    
    currencyChangeHandler = handleCurrencyChange;
    window.addEventListener('currencyChanged', currencyChangeHandler);
  }

  // ==========================================================================
  // DEPENDENCY CHECKS
  // ==========================================================================
  function checkFirebaseDependencies() {
    if (typeof auth === 'undefined') {
      console.error('❌ Firebase Auth not loaded');
      return false;
    }
    if (typeof db === 'undefined') {
      console.error('❌ Firebase Database not loaded');
      return false;
    }
    return true;
  }

  function checkSwiperDependency() {
    if (typeof Swiper === 'undefined') {
      console.error('❌ Swiper library not loaded');
      return false;
    }
    return true;
  }

  // ==========================================================================
  // TRIP DATA FETCHING
  // ==========================================================================
  function showSpinner() {
    const spinner = document.querySelector(SELECTORS.spinner);
    if (spinner) spinner.classList.remove('hidden');
  }

  function hideSpinner() {
    const spinner = document.querySelector(SELECTORS.spinner);
    if (spinner) spinner.classList.add('hidden');
  }

  async function fetchAllTripData() {
    if (!checkFirebaseDependencies()) {
      showToast('System not fully loaded. Please refresh the page.', 'error');
      return {};
    }

    try {
      showSpinner();
      
      const snap = await db.ref('trips').once('value');
      const data = snap.val();
      
      if (!data) {
        showToast('No trips available.', 'error');
        return {};
      }
      
      tripData = data;
      
      if (tripSlug && data[tripSlug]) {
        currentTrip = data[tripSlug];
        currentTrip.basePrice = currentTrip.price || 0;
        tourTypes = currentTrip.tourtype || {};
        tripOwnerId = currentTrip.owner || '';
        
        console.log('📊 Trip Data:', {
          name: currentTrip.name,
          media: currentTrip.media ? {
            images: currentTrip.media.images?.length || 0,
            videos: currentTrip.media.videos?.length || 0
          } : 'No media'
        });
        
        displayTripInfo(currentTrip);
        displayDescription(currentTrip.description);
        await loadMediaContent(currentTrip.media);
        loadIncludedNotIncluded(currentTrip);
        loadTimeline(currentTrip.timeline);
        loadWhatToBring(currentTrip.whatToBring);
        updatePriceDisplay();
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching trip data:', error);
      showToast('Failed to load trip data.', 'error');
      return {};
    } finally {
      hideSpinner();
    }
  }

  // ==========================================================================
  // DISPLAY FUNCTIONS
  // ==========================================================================
  function displayTripInfo(trip) {
    const titleEl = document.querySelector(SELECTORS.tourTitle);
    if (titleEl) titleEl.textContent = trip.name || '';
    
    const durationEl = document.querySelector(SELECTORS.tourDuration);
    if (durationEl) durationEl.textContent = trip.duration || 'Full Day';
    
    if (trip.name) {
      document.title = trip.name + ' - Discover Sharm';
    }
    
    const tripNameInput = document.querySelector(SELECTORS.tripName);
    if (tripNameInput) tripNameInput.value = trip.name || '';
  }

  function displayDescription(description) {
    const descContainer = document.querySelector(SELECTORS.descriptionContainer);
    const descContent = document.querySelector(SELECTORS.tourDescription);
    
    if (!descContainer) return;
    
    if (description && description.trim()) {
      const paragraphs = description
        .split('\n')
        .filter(p => p.trim())
        .map(p => {
          const trimmed = p.trim();
          if (trimmed.startsWith('!') || trimmed.startsWith('IMPORTANT:')) {
            const text = trimmed.replace(/^!/, '').replace(/^IMPORTANT:/, '').trim();
            return `<div class="highlight-note">
              <i class="fas fa-star" style="color: var(--gold); margin-right: 8px; font-size: 12px;"></i>
              ${sanitizeHTML(text)}
            </div>`;
          }
          return `<p>${sanitizeHTML(trimmed)}</p>`;
        })
        .join('');
      
      if (descContent) descContent.innerHTML = paragraphs;
      descContainer.style.display = 'block';
    } else {
      descContainer.style.display = 'none';
    }
  }

  function updatePriceDisplay() {
    const el = document.querySelector(SELECTORS.tourPrice);
    if (el && currentTrip.basePrice) {
      el.innerHTML = formatPrice(currentTrip.basePrice);
    }
  }

  // ==========================================================================
  // MEDIA GALLERY - ENHANCED VERSION
  // ==========================================================================
  
  function extractYouTubeId(url) {
    if (!url) return null;
    
    url = url.trim();
    
    // إذا كان الرابط عبارة عن ID مباشر (11 حرف)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    // محاولة استخراج ID من الرابط
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  function createImageSlide(imageUrl, index) {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.setAttribute('data-type', 'image');
    slide.setAttribute('data-index', index);
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Photo ${index + 1}`;
    img.loading = 'lazy';
    
    slide.appendChild(img);
    return slide;
  }

  function createVideoSlide(videoData, index) {
    const videoUrl = videoData.videoUrl || videoData.url || '';
    const videoId = extractYouTubeId(videoUrl);
    
    if (!videoId) {
      console.error('❌ Invalid video URL:', videoUrl);
      return null;
    }
    
    const thumbnailUrl = videoData.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    const slide = document.createElement('div');
    slide.className = 'swiper-slide swiper-slide-video';
    slide.setAttribute('data-type', 'video');
    slide.setAttribute('data-video-id', videoId);
    slide.setAttribute('data-thumbnail', thumbnailUrl);
    slide.setAttribute('data-index', index);
    
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = `Video ${index + 1}`;
    img.loading = 'lazy';
    img.className = 'video-thumbnail';
    
    const playBtn = document.createElement('div');
    playBtn.className = 'play-button';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    playBtn.setAttribute('aria-label', 'Play video');
    
    slide.appendChild(img);
    slide.appendChild(playBtn);
    
    slide.addEventListener('click', function(e) {
      if (swiper && swiper.animating) return;
      e.preventDefault();
      e.stopPropagation();
      playVideoInSlide(slide);
    });
    
    return slide;
  }

  function playVideoInSlide(slide) {
    const videoId = slide.getAttribute('data-video-id');
    
    if (!videoId) {
      console.error('❌ No video ID');
      return;
    }
    
    // إيقاف أي فيديو آخر
    stopAllVideos();
    
    currentVideoSlide = slide;
    
    if (swiper && swiper.autoplay) {
      swiper.autoplay.stop();
    }
    
    slide.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'YouTube video player';
    iframe.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: none;
    `;
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'video-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.setAttribute('aria-label', 'Close video');
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      stopVideoInSlide(slide);
    });
    
    slide.appendChild(iframe);
    slide.appendChild(closeBtn);
  }

  function stopVideoInSlide(slide) {
    if (!slide) return;
    
    const videoId = slide.getAttribute('data-video-id');
    const thumbnailUrl = slide.getAttribute('data-thumbnail');
    const index = slide.getAttribute('data-index');
    
    if (!videoId || !thumbnailUrl) return;
    
    slide.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = `Video ${parseInt(index) + 1}`;
    img.loading = 'lazy';
    img.className = 'video-thumbnail';
    
    const playBtn = document.createElement('div');
    playBtn.className = 'play-button';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    playBtn.setAttribute('aria-label', 'Play video');
    
    slide.appendChild(img);
    slide.appendChild(playBtn);
    
    if (swiper && swiper.autoplay) {
      swiper.autoplay.start();
    }
    
    currentVideoSlide = null;
  }

  function stopAllVideos() {
    if (currentVideoSlide) {
      stopVideoInSlide(currentVideoSlide);
    }
  }

  function createThumbnails() {
    const thumbsContainer = document.querySelector(SELECTORS.thumbnailsOverlay);
    if (!thumbsContainer) return;
    
    thumbsContainer.innerHTML = '';
    
    const slides = document.querySelectorAll(`${SELECTORS.swiperWrapper} .swiper-slide`);
    
    if (slides.length === 0) return;
    
    slides.forEach((slide, index) => {
      const type = slide.getAttribute('data-type');
      const isVideo = type === 'video';
      
      let thumbnailSrc;
      
      if (isVideo) {
        thumbnailSrc = slide.getAttribute('data-thumbnail');
      } else {
        const img = slide.querySelector('img');
        thumbnailSrc = img ? img.src : '';
      }
      
      if (!thumbnailSrc) return;
      
      const thumbWrapper = document.createElement('div');
      thumbWrapper.className = 'thumbnail-wrapper';
      thumbWrapper.setAttribute('data-index', index);
      thumbWrapper.setAttribute('data-type', type);
      
      const thumbImg = document.createElement('img');
      thumbImg.src = thumbnailSrc;
      thumbImg.alt = `${isVideo ? 'Video' : 'Photo'} ${index + 1}`;
      thumbImg.loading = 'lazy';
      thumbImg.className = 'thumbnail-image';
      
      thumbWrapper.appendChild(thumbImg);
      
      if (isVideo) {
        const videoIndicator = document.createElement('div');
        videoIndicator.className = 'video-indicator';
        videoIndicator.innerHTML = '<i class="fas fa-play"></i>';
        videoIndicator.setAttribute('aria-label', 'Video thumbnail');
        thumbWrapper.appendChild(videoIndicator);
        
        const duration = document.createElement('span');
        duration.className = 'video-duration';
        duration.textContent = 'VIDEO';
        thumbWrapper.appendChild(duration);
      }
      
      thumbWrapper.addEventListener('click', () => {
        if (swiper) {
          stopAllVideos();
          swiper.slideTo(index);
          updateActiveThumbnail(index);
        }
      });
      
      thumbsContainer.appendChild(thumbWrapper);
    });
    
    updateActiveThumbnail(0);
  }

  function updateActiveThumbnail(index) {
    const thumbWrappers = document.querySelectorAll(`${SELECTORS.thumbnailsOverlay} .thumbnail-wrapper`);
    
    thumbWrappers.forEach(wrapper => {
      const wrapperIndex = parseInt(wrapper.getAttribute('data-index'));
      
      if (wrapperIndex === index) {
        wrapper.classList.add('active');
        wrapper.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      } else {
        wrapper.classList.remove('active');
      }
    });
  }

  async function loadMediaContent(media) {
    if (!checkSwiperDependency()) return;
    
    const wrapper = document.querySelector(SELECTORS.swiperWrapper);
    const thumbsContainer = document.querySelector(SELECTORS.thumbnailsOverlay);
    
    if (!wrapper) return;
    
    wrapper.innerHTML = '';
    if (thumbsContainer) thumbsContainer.innerHTML = '';
    
    if (swiper) {
      stopAllVideos();
      swiper.destroy(true, true);
      swiper = null;
    }
    
    let slideIndex = 0;
    const allSlides = [];
    
    // إضافة الصور
    if (media?.images && Array.isArray(media.images) && media.images.length > 0) {
      media.images.forEach((imageUrl, i) => {
        if (!imageUrl) return;
        const slide = createImageSlide(imageUrl, slideIndex);
        wrapper.appendChild(slide);
        allSlides.push({ type: 'image', index: slideIndex });
        slideIndex++;
      });
    }
    
    // إضافة الفيديوهات
    if (media?.videos && Array.isArray(media.videos) && media.videos.length > 0) {
      media.videos.forEach((videoData, i) => {
        const slide = createVideoSlide(videoData, slideIndex);
        if (slide) {
          wrapper.appendChild(slide);
          allSlides.push({ type: 'video', index: slideIndex });
          slideIndex++;
        }
      });
    }
    
    // شريحة افتراضية إذا لم تكن هناك شرائح
    if (allSlides.length === 0) {
      const defaultSlide = document.createElement('div');
      defaultSlide.className = 'swiper-slide';
      defaultSlide.setAttribute('data-type', 'placeholder');
      defaultSlide.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #fff;
        font-size: 18px;
      `;
      defaultSlide.innerHTML = `
        <div style="text-align:center;">
          <i class="fas fa-image" style="font-size:48px;opacity:0.3;margin-bottom:16px;display:block;"></i>
          <p style="opacity:0.7;">No images available</p>
        </div>
      `;
      wrapper.appendChild(defaultSlide);
      allSlides.push({ type: 'placeholder', index: 0 });
    }
    
    // إنشاء السلايدر
    try {
      swiper = new Swiper(SELECTORS.swiperContainer, {
        slidesPerView: 1,
        loop: allSlides.length > 1,
        spaceBetween: 0,
        speed: 400,
        
        pagination: {
          el: SELECTORS.swiperPagination,
          clickable: true,
        },
        
        navigation: {
          nextEl: SELECTORS.swiperNext,
          prevEl: SELECTORS.swiperPrev,
        },
        
        on: {
          init: function() {
            createThumbnails();
          },
          
          slideChange: function() {
            stopAllVideos();
            updateActiveThumbnail(this.realIndex);
          },
          
          slideChangeTransitionStart: function() {
            stopAllVideos();
          }
        },
      });
      
    } catch (error) {
      console.error('❌ Swiper error:', error);
      createThumbnails();
    }
  }

  // ==========================================================================
  // INCLUDED / NOT INCLUDED
  // ==========================================================================
  function loadIncludedNotIncluded(data) {
    const sections = [
      { containerId: SELECTORS.includedItems, key: 'included', icon: 'fa-check', color: '#22c55e' },
      { containerId: SELECTORS.notIncludedItems, key: 'notIncluded', icon: 'fa-times', color: '#ef4444' }
    ];
    
    sections.forEach(({ containerId, key, icon, color }) => {
      const container = document.querySelector(containerId);
      const items = data[key];
      
      if (container && items && Array.isArray(items) && items.length > 0) {
        container.innerHTML = items.map(item => `
          <div class="included-item">
            <i class="fas ${icon}" style="color:${color};"></i>
            <span>${sanitizeHTML(item)}</span>
          </div>
        `).join('');
      }
    });
  }

  // ==========================================================================
  // TIMELINE
  // ==========================================================================
  function loadTimeline(timelineData) {
    const container = document.querySelector(SELECTORS.timelineContainer);
    
    if (container && timelineData && Array.isArray(timelineData) && timelineData.length > 0) {
      container.innerHTML = timelineData.map(item => `
        <div class="timeline-item">
          <div class="timeline-time">${sanitizeHTML(item.time || '')}</div>
          <div class="timeline-content">
            <h4>${sanitizeHTML(item.title || '')}</h4>
            <p>${sanitizeHTML(item.description || '')}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // ==========================================================================
  // WHAT TO BRING
  // ==========================================================================
  function loadWhatToBring(items) {
    const list = document.querySelector(SELECTORS.whatToBringList);
    
    if (list && items && Array.isArray(items) && items.length > 0) {
      list.innerHTML = items.map(item => `
        <li><i class="fas fa-check"></i> ${sanitizeHTML(item)}</li>
      `).join('');
    }
  }

  // ==========================================================================
  // REVIEWS SYSTEM
  // ==========================================================================
  function getUserPhotoUrl(uid) {
    return uid ? `/app/photos/${uid}.jpg` : null;
  }

  function showReviewSkeletons() {
    const container = document.querySelector(SELECTORS.reviewsListContainer);
    if (!container) return;
    
    container.innerHTML = Array(3).fill(`
      <div class="review-card" style="opacity: 0.5;">
        <div class="review-card-header">
          <div class="review-card-user">
            <div class="review-card-avatar" style="background: #3a3a3a;"></div>
            <div>
              <div style="width: 100px; height: 14px; background: #3a3a3a; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 80px; height: 12px; background: #3a3a3a; border-radius: 4px;"></div>
            </div>
          </div>
        </div>
        <div style="width: 100%; height: 40px; background: #3a3a3a; border-radius: 4px;"></div>
      </div>
    `).join('');
  }

  async function loadReviews() {
    if (!tripSlug || !checkFirebaseDependencies()) return;
    
    showReviewSkeletons();
    
    try {
      const snap = await db.ref('trip-reviews/' + tripSlug).once('value');
      const data = snap.val();
      
      if (data?.reviews) {
        tripReviews = Object.entries(data.reviews)
          .map(([id, review]) => ({ id, ...review }))
          .filter(r => r.approved)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        updateStarsSummary(data.average || 0, data.count || 0);
      } else {
        tripReviews = [];
        updateStarsSummary(0, 0);
      }
      
      renderReviews();
      
      if (typeof auth !== 'undefined' && auth.currentUser) {
        currentUserReview = tripReviews.find(r => r.userId === auth.currentUser.uid);
        const btn = document.querySelector(SELECTORS.openReviewBtn);
        if (btn) {
          btn.innerHTML = currentUserReview
            ? '<i class="fas fa-edit"></i> <span>Edit Review</span>'
            : '<i class="fas fa-pen-alt"></i> <span>Write a Review</span>';
        }
      }
    } catch (error) {
      console.error('❌ Failed to load reviews:', error);
      renderReviews();
    }
  }

  function updateStarsSummary(average, count) {
    const container = document.querySelector(SELECTORS.avgStars);
    if (!container) return;
    
    const fullStars = Math.floor(average);
    const hasHalfStar = average % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }
    
    container.innerHTML = starsHTML;
    
    const countEl = document.querySelector(SELECTORS.reviewsCountText);
    if (countEl) {
      countEl.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
    }
  }

  function renderReviews() {
    const container = document.querySelector(SELECTORS.reviewsListContainer);
    if (!container) return;
    
    if (!tripReviews.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <p>No reviews yet</p>
          <span>Be the first to review this trip</span>
        </div>
      `;
      return;
    }
    
    container.innerHTML = tripReviews.map(review => {
      const date = new Date(review.date);
      const dateStr = isNaN(date.getTime()) ? 'N/A' : 
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const userName = review.userName || 'Traveler';
      const initial = userName.charAt(0).toUpperCase();
      const photoUrl = getUserPhotoUrl(review.userId);
      
      const starsHtml = Array(5).fill().map((_, i) => 
        i < review.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
      ).join('');
      
      return `
        <div class="review-card">
          <div class="review-card-header">
            <div class="review-card-user">
              <div class="review-card-avatar">
                <img src="${sanitizeHTML(photoUrl)}" 
                     onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" 
                     loading="lazy" 
                     alt="${sanitizeHTML(userName)}">
                <div class="avatar-fallback" style="display:none;">${sanitizeHTML(initial)}</div>
              </div>
              <div>
                <div class="review-card-user-name">${sanitizeHTML(userName)}</div>
                <div class="review-card-stars">${starsHtml}</div>
              </div>
            </div>
            <span class="review-card-date">${dateStr}</span>
          </div>
          <p class="review-card-comment">${sanitizeHTML(review.comment || '')}</p>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // REVIEW MODAL
  // ==========================================================================
  function openReviewModal() {
    if (typeof auth === 'undefined' || !auth.currentUser) {
      showToast('Please sign in to write a review', 'error');
      return;
    }
    
    const modal = document.querySelector(SELECTORS.reviewModal);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeReviewModal() {
    const modal = document.querySelector(SELECTORS.reviewModal);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function setupStars() {
    const starsContainer = document.querySelector(SELECTORS.starSelector);
    if (!starsContainer) return;
    
    starsContainer.querySelectorAll('i').forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        document.querySelector(SELECTORS.ratingValue).value = rating;
        
        starsContainer.querySelectorAll('i').forEach((s, i) => {
          if (i < rating) {
            s.classList.add('active', 'fas');
            s.classList.remove('far');
          } else {
            s.classList.remove('active', 'fas');
            s.classList.add('far');
          }
        });
      });
    });
    
    const commentInput = document.querySelector(SELECTORS.commentInput);
    const charCount = document.querySelector(SELECTORS.charCount);
    if (commentInput && charCount) {
      commentInput.addEventListener('input', () => {
        let length = commentInput.value.length;
        if (length > MAX_COMMENT_LENGTH) {
          commentInput.value = commentInput.value.substring(0, MAX_COMMENT_LENGTH);
          length = MAX_COMMENT_LENGTH;
        }
        charCount.textContent = length;
      });
    }
  }

  async function submitReview() {
    if (!checkFirebaseDependencies()) {
      showToast('System not fully loaded.', 'error');
      return;
    }

    const voucher = document.querySelector(SELECTORS.voucherInput)?.value?.trim()?.toUpperCase();
    
    if (!voucher || !VOUCHER_PATTERN.test(voucher)) {
      showToast('Please enter a valid voucher number (DS_XXXXXXXX)', 'error');
      return;
    }
    
    const rating = parseInt(document.querySelector(SELECTORS.ratingValue)?.value || '0');
    if (!rating || rating < 1 || rating > 5) {
      showToast('Please select a rating', 'error');
      return;
    }
    
    const comment = document.querySelector(SELECTORS.commentInput)?.value?.trim();
    if (!comment || comment.length < MIN_COMMENT_LENGTH) {
      showToast(`Review must be at least ${MIN_COMMENT_LENGTH} characters`, 'error');
      return;
    }
    
    try {
      const snap = await db.ref('trip-bookings/' + voucher).once('value');
      const booking = snap.val();
      
      if (!booking || booking.uid !== auth.currentUser.uid) {
        showToast('Invalid voucher number.', 'error');
        return;
      }
      
      const user = auth.currentUser;
      let userName = 'Traveler';
      
      try {
        const userSnap = await db.ref('egy_user/' + user.uid).once('value');
        const userData = userSnap.val();
        if (userData) userName = userData.username || 'Traveler';
      } catch (e) {}
      
      const reviewData = {
        userId: user.uid,
        userName: sanitizeHTML(userName),
        rating,
        comment: sanitizeHTML(comment),
        date: new Date().toISOString(),
        approved: true,
        voucher
      };
      
      const reviewRef = db.ref('trip-reviews/' + tripSlug);
      const currentData = (await reviewRef.once('value')).val() || { reviews: {}, count: 0, average: 0 };
      
      let count = currentData.count || 0;
      let totalRating = (currentData.average || 0) * count;
      
      if (currentUserReview && currentData.reviews[currentUserReview.id]) {
        totalRating = totalRating - (currentData.reviews[currentUserReview.id].rating || 0) + rating;
        await reviewRef.child('reviews/' + currentUserReview.id).update(reviewData);
      } else {
        await reviewRef.child('reviews/' + Date.now()).set(reviewData);
        count++;
        totalRating += rating;
      }
      
      await reviewRef.update({
        count: count,
        average: parseFloat((totalRating / count).toFixed(1))
      });
      
      closeReviewModal();
      resetReviewForm();
      
      await loadReviews();
      showToast('Thank you for your review!', 'success');
      
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      showToast('Failed to submit review.', 'error');
    }
  }

  function resetReviewForm() {
    const voucherInput = document.querySelector(SELECTORS.voucherInput);
    const commentInput = document.querySelector(SELECTORS.commentInput);
    const ratingValue = document.querySelector(SELECTORS.ratingValue);
    const charCount = document.querySelector(SELECTORS.charCount);
    
    if (voucherInput) voucherInput.value = '';
    if (commentInput) commentInput.value = '';
    if (ratingValue) ratingValue.value = '0';
    if (charCount) charCount.textContent = '0';
    
    document.querySelectorAll(`${SELECTORS.starSelector} i`).forEach(s => {
      s.classList.remove('active', 'fas');
      s.classList.add('far');
    });
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    const openReviewBtn = document.querySelector(SELECTORS.openReviewBtn);
    if (openReviewBtn) openReviewBtn.addEventListener('click', openReviewModal);
    
    const submitReviewBtn = document.querySelector(SELECTORS.submitReviewBtn);
    if (submitReviewBtn) submitReviewBtn.addEventListener('click', submitReview);
    
    const reviewOverlay = document.querySelector(`${SELECTORS.reviewModal} ${SELECTORS.reviewOverlay}`);
    if (reviewOverlay) reviewOverlay.addEventListener('click', closeReviewModal);
    
    document.querySelectorAll(`${SELECTORS.reviewModal} ${SELECTORS.closePopupBtn}`).forEach(btn => {
      btn.addEventListener('click', closeReviewModal);
    });
    
    const cancelBtn = document.querySelector(SELECTORS.cancelReviewBtn);
    if (cancelBtn) cancelBtn.addEventListener('click', closeReviewModal);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.querySelector(SELECTORS.reviewModal);
        if (modal && !modal.classList.contains('hidden')) {
          closeReviewModal();
        }
      }
      
      if (!swiper) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stopAllVideos();
        swiper.slidePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stopAllVideos();
        swiper.slideNext();
      }
    });
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  function cleanup() {
    if (currencyChangeHandler) {
      window.removeEventListener('currencyChanged', currencyChangeHandler);
    }
    
    stopAllVideos();
    
    if (swiper) {
      swiper.destroy(true, true);
      swiper = null;
    }
    
    const thumbsContainer = document.querySelector(SELECTORS.thumbnailsOverlay);
    if (thumbsContainer) {
      thumbsContainer.innerHTML = '';
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async function init() {
    if (!tripSlug) {
      console.error('❌ No trip ID in URL');
      showToast('No trip specified in URL.', 'error');
      return;
    }
    
    console.log('🚀 Initializing Trip Display');
    console.log('📋 Trip Slug:', tripSlug);
    console.log('📱 Is Mobile:', isMobile());
    console.log('🔧 Swiper Available:', typeof Swiper !== 'undefined');
    
    initCurrency();
    setupStars();
    setupEventListeners();
    
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) {
          currentUserUid = user.uid;
        }
      });
    }
    
    await Promise.all([
      fetchAllTripData(),
      tripSlug ? loadReviews() : Promise.resolve()
    ]);
    
    window.addEventListener('beforeunload', cleanup);
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAllVideos();
      }
    });
    
    console.log('✅ System Ready');
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  return {
    init,
    getCurrentTrip: () => currentTrip,
    getTourTypes: () => tourTypes,
    getTripOwnerId: () => tripOwnerId,
    getTripSlug: () => tripSlug,
    formatPrice,
    showToast,
    cleanup,
    refreshReviews: loadReviews,
    openReviewModal,
    closeReviewModal
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TripDisplay.init);
} else {
  TripDisplay.init();
}

window.tripModule = TripDisplay;

console.log('📦 Trip Module loaded');
