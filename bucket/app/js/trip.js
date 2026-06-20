// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// Fixed Video Controller
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
  let currentPlayer = null;
  let progressInterval = null;
  let tripData = {};
  let currentTrip = {};
  let tourTypes = {};
  let tripOwnerId = '';
  let tripReviews = [];
  let currentUserReview = null;
  let currentUserUid = '';
  let controlsVisible = true;
  let hideControlsTimeout = null;
  let activeKeyHandler = null;

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
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
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
    return typeof auth !== 'undefined' && typeof db !== 'undefined';
  }

  function checkSwiperDependency() {
    return typeof Swiper !== 'undefined';
  }

  // ==========================================================================
  // CONTROLS TOGGLE
  // ==========================================================================
  function hideControls() {
    const swiperEl = document.querySelector('.swiper');
    if (swiperEl) swiperEl.classList.add('swiper-controls-hidden');
    controlsVisible = false;
  }

  function showControls() {
    const swiperEl = document.querySelector('.swiper');
    if (swiperEl) swiperEl.classList.remove('swiper-controls-hidden');
    controlsVisible = true;
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = setTimeout(hideControls, 3000);
  }

  function toggleControls() {
    controlsVisible ? hideControls() : showControls();
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
      showToast('System not fully loaded.', 'error');
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
        
        displayTripInfo(currentTrip);
        displayDescription(currentTrip.description);
        initGallery(currentTrip.media);
        loadIncludedNotIncluded(currentTrip);
        loadTimeline(currentTrip.timeline);
        loadWhatToBring(currentTrip.whatToBring);
        updatePriceDisplay();
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching trip data:', error);
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
    
    if (trip.name) document.title = trip.name + ' - Discover Sharm';
    
    const tripNameInput = document.querySelector(SELECTORS.tripName);
    if (tripNameInput) tripNameInput.value = trip.name || '';
  }

  function displayDescription(description) {
    const descContainer = document.querySelector(SELECTORS.descriptionContainer);
    const descContent = document.querySelector(SELECTORS.tourDescription);
    
    if (!descContainer) return;
    
    if (description && description.trim()) {
      const paragraphs = description.split('\n').filter(p => p.trim()).map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('!') || trimmed.startsWith('IMPORTANT:')) {
          const text = trimmed.replace(/^!/, '').replace(/^IMPORTANT:/, '').trim();
          return `<div class="highlight-note"><i class="fas fa-star" style="color: var(--gold); margin-right: 8px; font-size: 12px;"></i>${sanitizeHTML(text)}</div>`;
        }
        return `<p>${sanitizeHTML(trimmed)}</p>`;
      }).join('');
      
      if (descContent) descContent.innerHTML = paragraphs;
      descContainer.style.display = 'block';
    } else {
      descContainer.style.display = 'none';
    }
  }

  function updatePriceDisplay() {
    const el = document.querySelector(SELECTORS.tourPrice);
    if (el && currentTrip.basePrice) el.innerHTML = formatPrice(currentTrip.basePrice);
  }

  // ==========================================================================
  // YOUTUBE HELPERS
  // ==========================================================================
  function extractYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  function getVideoThumbnail(videoData, videoId) {
    if (videoData.thumbnail && videoData.thumbnail.trim()) return videoData.thumbnail.trim();
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // ==========================================================================
  // CUSTOM VIDEO PLAYER - FIXED
  // ==========================================================================
  function createVideoPlayer(slide, videoId) {
    const container = document.createElement('div');
    container.className = 'video-container';
    
    // IFrame - بدون controls=0 عشان API يشتغل
    const iframe = document.createElement('iframe');
    const playerId = 'yt-' + Date.now();
    iframe.id = playerId;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
    
    // Big play button
    const bigPlay = document.createElement('div');
    bigPlay.className = 'video-big-play';
    bigPlay.innerHTML = '<i class="fas fa-play"></i>';
    
    // Controls bar
    const controlsBar = document.createElement('div');
    controlsBar.className = 'video-controls-bar';
    
    // Play/Pause
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'video-play-pause';
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Progress
    const progressContainer = document.createElement('div');
    progressContainer.className = 'video-progress-container';
    const progressFill = document.createElement('div');
    progressFill.className = 'video-progress-fill';
    progressFill.style.width = '0%';
    progressContainer.appendChild(progressFill);
    
    // Time
    const timeDisplay = document.createElement('span');
    timeDisplay.className = 'video-time';
    timeDisplay.textContent = '00:00 / 00:00';
    
    // Volume
    const volumeBtn = document.createElement('button');
    volumeBtn.className = 'video-volume-btn';
    volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    
    // Fullscreen
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'video-fullscreen-btn';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    
    controlsBar.appendChild(playPauseBtn);
    controlsBar.appendChild(progressContainer);
    controlsBar.appendChild(timeDisplay);
    controlsBar.appendChild(volumeBtn);
    controlsBar.appendChild(fullscreenBtn);
    
    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'video-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    
    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'video-toggle-controls';
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Controls';
    
    container.appendChild(iframe);
    container.appendChild(bigPlay);
    container.appendChild(controlsBar);
    container.appendChild(closeBtn);
    container.appendChild(toggleBtn);
    
    // YouTube Player
    let player;
    let updateInterval;
    let isMuted = false;
    let isPlaying = true;
    
    function initPlayer() {
      try {
        player = new YT.Player(playerId, {
          events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
          }
        });
      } catch(e) {
        console.error('Failed to init YT player:', e);
      }
    }
    
    function onPlayerReady(event) {
      event.target.playVideo();
      event.target.unMute();
      startProgressUpdate();
    }
    
    function onPlayerStateChange(event) {
      switch(event.data) {
        case YT.PlayerState.PLAYING:
          isPlaying = true;
          bigPlay.classList.add('hidden');
          playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
          startProgressUpdate();
          break;
          
        case YT.PlayerState.PAUSED:
          isPlaying = false;
          bigPlay.classList.remove('hidden');
          playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
          stopProgressUpdate();
          break;
          
        case YT.PlayerState.ENDED:
          isPlaying = false;
          bigPlay.classList.remove('hidden');
          playPauseBtn.innerHTML = '<i class="fas fa-redo"></i>';
          stopProgressUpdate();
          break;
      }
    }
    
    function startProgressUpdate() {
      stopProgressUpdate();
      updateInterval = setInterval(updateProgress, 200);
    }
    
    function stopProgressUpdate() {
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
    }
    
    function updateProgress() {
      if (!player || !player.getCurrentTime || !player.getDuration) return;
      
      try {
        const current = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;
        
        if (duration > 0) {
          const percent = (current / duration) * 100;
          progressFill.style.width = Math.min(100, percent) + '%';
          timeDisplay.textContent = formatTime(current) + ' / ' + formatTime(duration);
        }
      } catch(e) {
        // Ignore errors during update
      }
    }
    
    // Button Events
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      
      try {
        if (isPlaying) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } catch(e) {}
    });
    
    bigPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      try { player.playVideo(); } catch(e) {}
    });
    
    progressContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player || !player.getDuration) return;
      
      try {
        const rect = progressContainer.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        player.seekTo(player.getDuration() * percent);
      } catch(e) {}
    });
    
    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      
      try {
        isMuted = !isMuted;
        if (isMuted) {
          player.mute();
          volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
          player.unMute();
          volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
      } catch(e) {}
    });
    
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
      } catch(e) {}
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopVideoInSlide(slide);
    });
    
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleControls();
      toggleBtn.innerHTML = controlsVisible ? 
        '<i class="fas fa-eye-slash"></i> Hide Controls' : 
        '<i class="fas fa-eye"></i> Show Controls';
    });
    
    // Keyboard handler
    function keyHandler(e) {
      // Only handle if video is active and no input is focused
      if (document.activeElement !== document.body) return;
      if (!currentVideoSlide) return;
      
      try {
        switch(e.key.toLowerCase()) {
          case ' ':
            e.preventDefault();
            if (!player) return;
            isPlaying ? player.pauseVideo() : player.playVideo();
            break;
          case 'arrowleft':
            e.preventDefault();
            if (player && player.getCurrentTime) player.seekTo((player.getCurrentTime() || 0) - 10);
            break;
          case 'arrowright':
            e.preventDefault();
            if (player && player.getCurrentTime) player.seekTo((player.getCurrentTime() || 0) + 10);
            break;
          case 'm':
            e.preventDefault();
            if (!player) return;
            isMuted = !isMuted;
            isMuted ? player.mute() : player.unMute();
            volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
            break;
        }
      } catch(e) {}
    }
    
    // Remove old key handler
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
    }
    activeKeyHandler = keyHandler;
    document.addEventListener('keydown', keyHandler);
    
    // Store cleanup
    slide._videoCleanup = function() {
      stopProgressUpdate();
      if (activeKeyHandler) {
        document.removeEventListener('keydown', activeKeyHandler);
        activeKeyHandler = null;
      }
      if (player) {
        try { player.destroy(); } catch(e) {}
        player = null;
      }
    };
    
    // Initialize player - wait for API
    if (window.YT && window.YT.Player && window.YT.loaded) {
      initPlayer();
    } else {
      const origCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function() {
        if (origCallback) origCallback();
        initPlayer();
      };
    }
    
    return container;
  }

  function playVideoInSlide(slide) {
    if (!slide) return;
    
    const videoId = slide.getAttribute('data-video-id');
    if (!videoId) return;
    
    stopAllVideos();
    
    currentVideoSlide = slide;
    
    if (swiper && swiper.autoplay) swiper.autoplay.stop();
    
    hideControls();
    
    slide.innerHTML = '';
    
    const playerContainer = createVideoPlayer(slide, videoId);
    slide.appendChild(playerContainer);
  }

  function stopVideoInSlide(slide) {
    if (!slide) return;
    
    if (slide._videoCleanup) {
      slide._videoCleanup();
      slide._videoCleanup = null;
    }
    
    stopProgressUpdate();
    
    const videoId = slide.getAttribute('data-video-id');
    const thumbnailUrl = slide.getAttribute('data-thumbnail');
    const index = slide.getAttribute('data-index');
    
    if (!videoId || !thumbnailUrl) return;
    
    showControls();
    
    slide.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = `Video ${parseInt(index) + 1}`;
    img.loading = 'lazy';
    
    const playBtn = document.createElement('div');
    playBtn.className = 'play-button';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    playBtn.onclick = function(e) {
      e.stopPropagation();
      e.preventDefault();
      playVideoInSlide(slide);
    };
    
    slide.appendChild(img);
    slide.appendChild(playBtn);
    
    if (swiper && swiper.autoplay) swiper.autoplay.start();
    
    currentVideoSlide = null;
  }

  function stopAllVideos() {
    if (currentVideoSlide) {
      stopVideoInSlide(currentVideoSlide);
    }
  }

  function stopProgressUpdate() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  // ==========================================================================
  // GALLERY
  // ==========================================================================
  function createSlideElement(type, data, index) {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    if (type === 'video') slide.classList.add('swiper-slide-video');
    
    slide.setAttribute('data-type', type);
    slide.setAttribute('data-index', index);
    
    if (type === 'video') {
      const videoUrl = data.videoUrl || data.url || '';
      const videoId = extractYouTubeId(videoUrl);
      
      if (!videoId) return null;
      
      const thumbnailUrl = getVideoThumbnail(data, videoId);
      
      slide.setAttribute('data-video-id', videoId);
      slide.setAttribute('data-thumbnail', thumbnailUrl);
      
      if (data.thumbnail && data.thumbnail.trim()) {
        slide.setAttribute('data-custom-thumbnail', 'true');
      }
      
      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.alt = `Video ${index + 1}`;
      img.loading = 'lazy';
      
      img.onerror = function() {
        if (slide.getAttribute('data-custom-thumbnail') === 'true') {
          img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          slide.setAttribute('data-custom-thumbnail', 'false');
          slide.setAttribute('data-thumbnail', img.src);
        }
      };
      
      slide.appendChild(img);
      
      const playBtn = document.createElement('div');
      playBtn.className = 'play-button';
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
      playBtn.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        playVideoInSlide(slide);
      };
      slide.appendChild(playBtn);
      
    } else {
      const img = document.createElement('img');
      img.src = data;
      img.alt = `Photo ${index + 1}`;
      img.loading = 'lazy';
      slide.appendChild(img);
    }
    
    return slide;
  }

  function createThumbnails() {
    const thumbsContainer = document.querySelector(SELECTORS.thumbnailsOverlay);
    if (!thumbsContainer) return;
    
    thumbsContainer.innerHTML = '';
    
    const slides = document.querySelectorAll('.swiper-slide');
    if (!slides.length) return;
    
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
      
      const wrapper = document.createElement('div');
      wrapper.className = 'thumbnail-wrapper';
      wrapper.setAttribute('data-index', index);
      wrapper.setAttribute('data-type', type || 'image');
      
      const img = document.createElement('img');
      img.src = thumbnailSrc;
      img.alt = `Thumbnail ${index + 1}`;
      img.loading = 'lazy';
      img.className = 'thumbnail-image';
      
      wrapper.appendChild(img);
      
      if (isVideo) {
        const indicator = document.createElement('div');
        indicator.className = 'video-indicator';
        indicator.innerHTML = '<i class="fas fa-play"></i>';
        wrapper.appendChild(indicator);
        
        const badge = document.createElement('span');
        badge.className = 'video-duration';
        badge.textContent = 'VIDEO';
        wrapper.appendChild(badge);
      }
      
      wrapper.onclick = function() {
        if (swiper) {
          stopAllVideos();
          swiper.slideTo(index);
          updateActiveThumbnail(index);
        }
      };
      
      thumbsContainer.appendChild(wrapper);
    });
    
    updateActiveThumbnail(0);
  }

  function updateActiveThumbnail(index) {
    const wrappers = document.querySelectorAll('.thumbnail-wrapper');
    wrappers.forEach(w => {
      const wIndex = parseInt(w.getAttribute('data-index'));
      w.classList.toggle('active', wIndex === index);
    });
  }

  function initGallery(media) {
    if (!checkSwiperDependency()) return;
    
    const swiperEl = document.querySelector('.swiper');
    const wrapper = document.querySelector('.swiper-wrapper');
    
    if (!swiperEl || !wrapper) return;
    
    if (swiper) {
      stopAllVideos();
      swiper.destroy(true, true);
      swiper = null;
    }
    
    wrapper.innerHTML = '';
    
    let slideCount = 0;
    
    if (media?.images && Array.isArray(media.images)) {
      media.images.forEach((imgSrc) => {
        if (!imgSrc) return;
        const slide = createSlideElement('image', imgSrc, slideCount);
        if (slide) { wrapper.appendChild(slide); slideCount++; }
      });
    }
    
    if (media?.videos && Array.isArray(media.videos)) {
      media.videos.forEach((videoData) => {
        if (!videoData.videoUrl && !videoData.url) return;
        const slide = createSlideElement('video', videoData, slideCount);
        if (slide) { wrapper.appendChild(slide); slideCount++; }
      });
    }
    
    if (slideCount === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'swiper-slide';
      placeholder.setAttribute('data-type', 'placeholder');
      placeholder.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#fff;';
      placeholder.innerHTML = '<div style="text-align:center;"><i class="fas fa-image" style="font-size:48px;opacity:0.3;"></i><p style="margin-top:16px;">No images available</p></div>';
      wrapper.appendChild(placeholder);
      slideCount = 1;
    }
    
    try {
      swiper = new Swiper('.swiper', {
        slidesPerView: 1,
        loop: slideCount > 1,
        spaceBetween: 0,
        speed: 400,
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        on: {
          init: function() { createThumbnails(); },
          slideChange: function() { stopAllVideos(); updateActiveThumbnail(this.realIndex); },
          slideChangeTransitionStart: function() { stopAllVideos(); }
        },
      });
    } catch (error) {
      console.error('Swiper init error:', error);
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
      console.error('Failed to load reviews:', error);
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
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';
    
    container.innerHTML = starsHTML;
    
    const countEl = document.querySelector(SELECTORS.reviewsCountText);
    if (countEl) countEl.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
  }

  function renderReviews() {
    const container = document.querySelector(SELECTORS.reviewsListContainer);
    if (!container) return;
    
    if (!tripReviews.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p><span>Be the first to review this trip</span></div>';
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
                <img src="${sanitizeHTML(photoUrl)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy" alt="${sanitizeHTML(userName)}">
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
    if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  }

  function closeReviewModal() {
    const modal = document.querySelector(SELECTORS.reviewModal);
    if (modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; }
  }

  function setupStars() {
    const starsContainer = document.querySelector(SELECTORS.starSelector);
    if (!starsContainer) return;
    
    starsContainer.querySelectorAll('i').forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        document.querySelector(SELECTORS.ratingValue).value = rating;
        starsContainer.querySelectorAll('i').forEach((s, i) => {
          s.classList.toggle('active', i < rating);
          s.classList.toggle('fas', i < rating);
          s.classList.toggle('far', i >= rating);
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
    if (!checkFirebaseDependencies()) { showToast('System not fully loaded.', 'error'); return; }

    const voucher = document.querySelector(SELECTORS.voucherInput)?.value?.trim()?.toUpperCase();
    if (!voucher || !VOUCHER_PATTERN.test(voucher)) { showToast('Please enter a valid voucher number (DS_XXXXXXXX)', 'error'); return; }
    
    const rating = parseInt(document.querySelector(SELECTORS.ratingValue)?.value || '0');
    if (!rating || rating < 1 || rating > 5) { showToast('Please select a rating', 'error'); return; }
    
    const comment = document.querySelector(SELECTORS.commentInput)?.value?.trim();
    if (!comment || comment.length < MIN_COMMENT_LENGTH) { showToast(`Review must be at least ${MIN_COMMENT_LENGTH} characters`, 'error'); return; }
    
    try {
      const snap = await db.ref('trip-bookings/' + voucher).once('value');
      const booking = snap.val();
      if (!booking || booking.uid !== auth.currentUser.uid) { showToast('Invalid voucher number.', 'error'); return; }
      
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
      
      await reviewRef.update({ count, average: parseFloat((totalRating / count).toFixed(1)) });
      
      closeReviewModal();
      resetReviewForm();
      await loadReviews();
      showToast('Thank you for your review!', 'success');
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('Failed to submit review.', 'error');
    }
  }

  function resetReviewForm() {
    ['voucherInput', 'commentInput'].forEach(id => {
      const el = document.querySelector(SELECTORS[id]);
      if (el) el.value = '';
    });
    const ratingEl = document.querySelector(SELECTORS.ratingValue);
    if (ratingEl) ratingEl.value = '0';
    const charCountEl = document.querySelector(SELECTORS.charCount);
    if (charCountEl) charCountEl.textContent = '0';
    document.querySelectorAll(`${SELECTORS.starSelector} i`).forEach(s => {
      s.classList.remove('active', 'fas');
      s.classList.add('far');
    });
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    document.querySelector(SELECTORS.openReviewBtn)?.addEventListener('click', openReviewModal);
    document.querySelector(SELECTORS.submitReviewBtn)?.addEventListener('click', submitReview);
    document.querySelector(`${SELECTORS.reviewModal} ${SELECTORS.reviewOverlay}`)?.addEventListener('click', closeReviewModal);
    document.querySelectorAll(`${SELECTORS.reviewModal} ${SELECTORS.closePopupBtn}`).forEach(btn => btn.addEventListener('click', closeReviewModal));
    document.querySelector(SELECTORS.cancelReviewBtn)?.addEventListener('click', closeReviewModal);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.querySelector(SELECTORS.reviewModal);
        if (modal && !modal.classList.contains('hidden')) {
          closeReviewModal();
        }
      }
    });
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  function cleanup() {
    if (currencyChangeHandler) window.removeEventListener('currencyChanged', currencyChangeHandler);
    if (activeKeyHandler) document.removeEventListener('keydown', activeKeyHandler);
    clearTimeout(hideControlsTimeout);
    stopAllVideos();
    if (swiper) { swiper.destroy(true, true); swiper = null; }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async function init() {
    if (!tripSlug) { showToast('No trip specified in URL.', 'error'); return; }
    
    initCurrency();
    setupStars();
    setupEventListeners();
    
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => { currentUserUid = user?.uid || ''; });
    }
    
    await Promise.all([
      fetchAllTripData(),
      tripSlug ? loadReviews() : Promise.resolve()
    ]);
    
    window.addEventListener('beforeunload', cleanup);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAllVideos(); });
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
    refreshReviews: loadReviews
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TripDisplay.init);
} else {
  TripDisplay.init();
}

window.tripModule = TripDisplay;
