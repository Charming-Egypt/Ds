// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// Complete with Custom Video Controller
// ==========================================================================

const TripDisplay = (() => {
  // ==========================================================================
  // SELECTORS
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
    cancelReviewBtn: '#cancelReviewBtn'
  };

  // ==========================================================================
  // STATE
  // ==========================================================================
  let swiper = null;
  let currentVideoSlide = null;
  let videoProgressInterval = null;
  let tripData = {};
  let currentTrip = {};
  let tourTypes = {};
  let tripOwnerId = '';
  let tripReviews = [];
  let currentUserReview = null;
  let currentUserUid = '';
  let currentCurrency = 'EGP';
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

  function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
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
    }, 4000);
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  function getVideoThumbnail(videoData, videoId) {
    if (videoData.thumbnail && videoData.thumbnail.trim()) {
      return videoData.thumbnail.trim();
    }
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // ==========================================================================
  // CURRENCY
  // ==========================================================================
  function getCurrentCurrencyFromHeader() {
    if (window.SharmCurrency?.get) return window.SharmCurrency.get();
    return localStorage.getItem('preferredCurrency') || 'EGP';
  }

  function getExchangeRatesFromHeader() {
    return window.SharmCurrency?.rates || null;
  }

  function formatPrice(price) {
    if (!ratesLoaded || currentCurrency === 'EGP') {
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
  // CUSTOM VIDEO PLAYER
  // ==========================================================================
  function playVideo(slide) {
    if (!slide) return;

    const videoId = slide.getAttribute('data-video-id');
    if (!videoId) return;

    stopAllVideos();
    currentVideoSlide = slide;

    if (swiper && swiper.autoplay) swiper.autoplay.stop();
    if (swiper && swiper.allowTouchMove !== undefined) swiper.allowTouchMove = false;

    slide.innerHTML = '';

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-video-wrapper';

    // IFrame
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=0&enablejsapi=1&playsinline=1`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'custom-video-iframe';

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'custom-video-overlay';

    // Controls bar
    const controls = document.createElement('div');
    controls.className = 'custom-video-controls';

    // Play/Pause
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'vc-btn vc-play';
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';

    // Progress
    const progressWrap = document.createElement('div');
    progressWrap.className = 'vc-progress-wrap';
    const progressBar = document.createElement('div');
    progressBar.className = 'vc-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'vc-progress-fill';
    progressBar.appendChild(progressFill);
    progressWrap.appendChild(progressBar);

    // Time
    const timeDisplay = document.createElement('span');
    timeDisplay.className = 'vc-time';
    timeDisplay.textContent = '00:00 / 00:00';

    // Volume
    const volumeBtn = document.createElement('button');
    volumeBtn.className = 'vc-btn vc-volume';
    volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';

    // Fullscreen
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'vc-btn vc-fullscreen';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.className = 'vc-btn vc-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';

    // Assemble
    controls.appendChild(playPauseBtn);
    controls.appendChild(progressWrap);
    controls.appendChild(timeDisplay);
    controls.appendChild(volumeBtn);
    controls.appendChild(fullscreenBtn);
    controls.appendChild(closeBtn);

    // Big play button
    const bigBtn = document.createElement('div');
    bigBtn.className = 'vc-big-play';
    bigBtn.innerHTML = '<i class="fas fa-pause"></i>';

    wrapper.appendChild(iframe);
    wrapper.appendChild(overlay);
    wrapper.appendChild(bigBtn);
    wrapper.appendChild(controls);
    slide.appendChild(wrapper);

    // YouTube Player
    let player;
    let isPlaying = true;
    let isMuted = false;
    let hideTimer;

    function initPlayer() {
      player = new YT.Player(iframe, {
        events: {
          onReady: function(event) {
            event.target.playVideo();
            event.target.unMute();
            startProgress();
          },
          onStateChange: function(event) {
            if (event.data === 1) {
              isPlaying = true;
              bigBtn.classList.add('hidden');
              playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
              startProgress();
            } else if (event.data === 2) {
              isPlaying = false;
              bigBtn.classList.remove('hidden');
              bigBtn.innerHTML = '<i class="fas fa-play"></i>';
              playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
              stopProgress();
            } else if (event.data === 0) {
              isPlaying = false;
              bigBtn.classList.remove('hidden');
              bigBtn.innerHTML = '<i class="fas fa-redo"></i>';
              playPauseBtn.innerHTML = '<i class="fas fa-redo"></i>';
              stopProgress();
            }
          }
        }
      });
    }

    function startProgress() {
      stopProgress();
      videoProgressInterval = setInterval(updateProgress, 300);
    }

    function stopProgress() {
      if (videoProgressInterval) {
        clearInterval(videoProgressInterval);
        videoProgressInterval = null;
      }
    }

    function updateProgress() {
      if (!player || !player.getCurrentTime || !player.getDuration) return;
      try {
        const current = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;
        if (duration > 0) {
          progressFill.style.width = Math.min(100, (current / duration) * 100) + '%';
          timeDisplay.textContent = formatTime(current) + ' / ' + formatTime(duration);
        }
      } catch (e) {}
    }

    function showControlsTemp() {
      controls.classList.add('visible');
      bigBtn.classList.add('shift-up');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (isPlaying) {
          controls.classList.remove('visible');
          bigBtn.classList.remove('shift-up');
        }
      }, 3000);
    }

    // Events
    overlay.addEventListener('click', () => {
      if (!player) return;
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
      showControlsTemp();
    });

    overlay.addEventListener('mousemove', showControlsTemp);

    overlay.addEventListener('dblclick', () => {
      try {
        if (wrapper.requestFullscreen) wrapper.requestFullscreen();
        else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
      } catch (e) {}
    });

    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
    });

    bigBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
    });

    progressWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player || !player.getDuration) return;
      const rect = progressWrap.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      player.seekTo(player.getDuration() * percent);
      updateProgress();
    });

    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      isMuted = !isMuted;
      if (isMuted) {
        player.mute();
        volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      } else {
        player.unMute();
        volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      }
    });

    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        if (wrapper.requestFullscreen) wrapper.requestFullscreen();
        else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
      } catch (e) {}
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopVideo(slide);
    });

    // Keyboard
    function keyHandler(e) {
      if (!currentVideoSlide) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (player) isPlaying ? player.pauseVideo() : player.playVideo();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (player) player.seekTo((player.getCurrentTime() || 0) - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (player) player.seekTo((player.getCurrentTime() || 0) + 10);
          break;
        case 'm':
          e.preventDefault();
          if (player) {
            isMuted = !isMuted;
            if (isMuted) player.mute();
            else player.unMute();
            volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
          }
          break;
        case 'f':
          e.preventDefault();
          try { if (wrapper.requestFullscreen) wrapper.requestFullscreen(); } catch (e) {}
          break;
      }
    }
    document.addEventListener('keydown', keyHandler);

    // Cleanup
    slide._cleanup = function() {
      document.removeEventListener('keydown', keyHandler);
      stopProgress();
      clearTimeout(hideTimer);
      if (player) { try { player.destroy(); } catch (e) {} }
      if (swiper && swiper.allowTouchMove !== undefined) swiper.allowTouchMove = true;
    };

    // Init
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const orig = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function() {
        if (orig) orig();
        initPlayer();
      };
    }
  }

  function stopVideo(slide) {
    if (!slide) return;

    if (slide._cleanup) {
      slide._cleanup();
      slide._cleanup = null;
    }

    const videoId = slide.getAttribute('data-video-id');
    const thumbnailUrl = slide.getAttribute('data-thumbnail');
    const index = slide.getAttribute('data-index');

    if (!videoId || !thumbnailUrl) return;

    if (swiper && swiper.autoplay) swiper.autoplay.start();
    if (swiper && swiper.allowTouchMove !== undefined) swiper.allowTouchMove = true;

    slide.innerHTML = '';

    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = 'Video ' + (parseInt(index) + 1);
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';

    const playBtn = document.createElement('div');
    playBtn.className = 'play-button';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    playBtn.onclick = function(e) {
      e.stopPropagation();
      playVideo(slide);
    };

    slide.appendChild(img);
    slide.appendChild(playBtn);
    currentVideoSlide = null;
  }

  function stopAllVideos() {
    if (currentVideoSlide) stopVideo(currentVideoSlide);
  }

  // ==========================================================================
  // GALLERY
  // ==========================================================================
  function createSlide(type, data, index) {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    if (type === 'video') slide.classList.add('swiper-slide-video');
    slide.setAttribute('data-type', type);
    slide.setAttribute('data-index', index);

    if (type === 'video') {
      const videoId = extractYouTubeId(data.videoUrl || data.url || '');
      if (!videoId) return null;

      const thumbnailUrl = getVideoThumbnail(data, videoId);
      slide.setAttribute('data-video-id', videoId);
      slide.setAttribute('data-thumbnail', thumbnailUrl);

      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.alt = 'Video ' + (index + 1);
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';

      img.onerror = function() {
        img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        slide.setAttribute('data-thumbnail', img.src);
      };

      slide.appendChild(img);

      const playBtn = document.createElement('div');
      playBtn.className = 'play-button';
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
      playBtn.onclick = function(e) {
        e.stopPropagation();
        playVideo(slide);
      };
      slide.appendChild(playBtn);

    } else {
      const img = document.createElement('img');
      img.src = data;
      img.alt = 'Photo ' + (index + 1);
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      slide.appendChild(img);
    }

    return slide;
  }

  function createThumbnails() {
    const container = document.querySelector(SELECTORS.thumbnailsOverlay);
    if (!container) return;
    container.innerHTML = '';

    const slides = document.querySelectorAll('.swiper-slide');
    if (!slides.length) return;

    slides.forEach((slide, index) => {
      const type = slide.getAttribute('data-type');
      const isVideo = type === 'video';
      const thumbnailSrc = isVideo
        ? slide.getAttribute('data-thumbnail')
        : slide.querySelector('img')?.src;

      if (!thumbnailSrc) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'thumbnail-wrapper';
      wrapper.setAttribute('data-index', index);
      wrapper.setAttribute('data-type', type || 'image');

      const img = document.createElement('img');
      img.src = thumbnailSrc;
      img.alt = 'Thumbnail ' + (index + 1);
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

      container.appendChild(wrapper);
    });

    updateActiveThumbnail(0);
  }

  function updateActiveThumbnail(index) {
    document.querySelectorAll('.thumbnail-wrapper').forEach(w => {
      const wIndex = parseInt(w.getAttribute('data-index'));
      w.classList.toggle('active', wIndex === index);
    });
  }

  function initGallery(media) {
    if (!checkSwiperDependency()) return;

    const wrapper = document.querySelector(SELECTORS.swiperWrapper);
    if (!wrapper) return;

    if (swiper) {
      stopAllVideos();
      swiper.destroy(true, true);
      swiper = null;
    }

    wrapper.innerHTML = '';
    let slideCount = 0;

    if (media?.images && Array.isArray(media.images)) {
      media.images.forEach(imgSrc => {
        if (!imgSrc) return;
        const slide = createSlide('image', imgSrc, slideCount);
        if (slide) { wrapper.appendChild(slide); slideCount++; }
      });
    }

    if (media?.videos && Array.isArray(media.videos)) {
      media.videos.forEach(videoData => {
        if (!videoData.videoUrl && !videoData.url) return;
        const slide = createSlide('video', videoData, slideCount);
        if (slide) { wrapper.appendChild(slide); slideCount++; }
      });
    }

    if (slideCount === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'swiper-slide';
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
          init: createThumbnails,
          slideChange: function() {
            stopAllVideos();
            updateActiveThumbnail(this.realIndex);
          },
          slideChangeTransitionStart: stopAllVideos
        }
      });
    } catch (error) {
      console.error('Swiper init error:', error);
      createThumbnails();
    }
  }

  // ==========================================================================
  // CONTENT LOADERS
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
    const container = document.querySelector(SELECTORS.descriptionContainer);
    const content = document.querySelector(SELECTORS.tourDescription);
    if (!container) return;

    if (description && description.trim()) {
      const paragraphs = description
        .split('\n')
        .filter(p => p.trim())
        .map(p => {
          const trimmed = p.trim();
          if (trimmed.startsWith('!') || trimmed.startsWith('IMPORTANT:')) {
            const text = trimmed.replace(/^!/, '').replace(/^IMPORTANT:/, '').trim();
            return `<div class="highlight-note"><i class="fas fa-star" style="color: var(--gold); margin-right: 8px;"></i>${sanitizeHTML(text)}</div>`;
          }
          return `<p>${sanitizeHTML(trimmed)}</p>`;
        })
        .join('');

      if (content) content.innerHTML = paragraphs;
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  }

  function updatePriceDisplay() {
    const el = document.querySelector(SELECTORS.tourPrice);
    if (el && currentTrip.basePrice) {
      el.innerHTML = formatPrice(currentTrip.basePrice);
    }
  }

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

  function loadWhatToBring(items) {
    const list = document.querySelector(SELECTORS.whatToBringList);
    if (list && items && Array.isArray(items) && items.length > 0) {
      list.innerHTML = items.map(item => `
        <li><i class="fas fa-check"></i> ${sanitizeHTML(item)}</li>
      `).join('');
    }
  }

  // ==========================================================================
  // REVIEWS
  // ==========================================================================
  function getUserPhotoUrl(uid) {
    return uid ? `/app/photos/${uid}.jpg` : null;
  }

  function showReviewSkeletons() {
    const container = document.querySelector(SELECTORS.reviewsListContainer);
    if (!container) return;
    container.innerHTML = Array(3).fill(`
      <div class="review-card" style="opacity:0.5;">
        <div class="review-card-header">
          <div class="review-card-user">
            <div class="review-card-avatar" style="background:#3a3a3a;"></div>
            <div>
              <div style="width:100px;height:14px;background:#3a3a3a;border-radius:4px;margin-bottom:6px;"></div>
              <div style="width:80px;height:12px;background:#3a3a3a;border-radius:4px;"></div>
            </div>
          </div>
        </div>
        <div style="width:100%;height:40px;background:#3a3a3a;border-radius:4px;"></div>
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

    const full = Math.floor(average);
    const half = average % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);

    container.innerHTML =
      '<i class="fas fa-star"></i>'.repeat(full) +
      (half ? '<i class="fas fa-star-half-alt"></i>' : '') +
      '<i class="far fa-star"></i>'.repeat(empty);

    const countEl = document.querySelector(SELECTORS.reviewsCountText);
    if (countEl) {
      countEl.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
    }
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
        if (length > 500) {
          commentInput.value = commentInput.value.substring(0, 500);
          length = 500;
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
    if (!voucher || !/^DS_[A-Z0-9]{8,}$/.test(voucher)) {
      showToast('Please enter a valid voucher number (DS_XXXXXXXX)', 'error');
      return;
    }

    const rating = parseInt(document.querySelector(SELECTORS.ratingValue)?.value || '0');
    if (!rating || rating < 1 || rating > 5) {
      showToast('Please select a rating', 'error');
      return;
    }

    const comment = document.querySelector(SELECTORS.commentInput)?.value?.trim();
    if (!comment || comment.length < 5) {
      showToast('Review must be at least 5 characters', 'error');
      return;
    }

    try {
      const snap = await db.ref('trip-bookings/' + voucher).once('value');
      const booking = snap.val();

      if (!booking || booking.uid !== auth.currentUser.uid) {
        showToast('Invalid voucher number', 'error');
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
      console.error('Error submitting review:', error);
      showToast('Failed to submit review', 'error');
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
    document.querySelector(SELECTORS.openReviewBtn)?.addEventListener('click', openReviewModal);
    document.querySelector(SELECTORS.submitReviewBtn)?.addEventListener('click', submitReview);
    document.querySelector(`${SELECTORS.reviewModal} .services-popup-overlay`)?.addEventListener('click', closeReviewModal);
    document.querySelectorAll(`${SELECTORS.reviewModal} .close-popup-btn`).forEach(btn => {
      btn.addEventListener('click', closeReviewModal);
    });
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
    if (currencyChangeHandler) {
      window.removeEventListener('currencyChanged', currencyChangeHandler);
    }

    stopAllVideos();

    if (swiper) {
      swiper.destroy(true, true);
      swiper = null;
    }
  }

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  async function fetchAllTripData() {
    if (!checkFirebaseDependencies()) return;

    try {
      const snap = await db.ref('trips').once('value');
      const data = snap.val();

      if (data && data[tripSlug]) {
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
    } catch (error) {
      console.error('Error fetching trip data:', error);
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async function init() {
    if (!tripSlug) {
      showToast('No trip specified in URL.', 'error');
      return;
    }

    initCurrency();
    setupStars();
    setupEventListeners();

    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged(user => {
        currentUserUid = user?.uid || '';
      });
    }

    await Promise.all([
      fetchAllTripData(),
      tripSlug ? loadReviews() : Promise.resolve()
    ]);

    window.addEventListener('beforeunload', cleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAllVideos();
    });
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  const publicAPI = {
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

  return publicAPI;

})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TripDisplay.init);
} else {
  TripDisplay.init();
}

// Expose globally
window.tripModule = TripDisplay;
window.formatPrice = TripDisplay.formatPrice;
window.showToast = TripDisplay.showToast;
