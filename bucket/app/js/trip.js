// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// ==========================================================================

const TripDisplay = (() => {
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

  const VOUCHER_PATTERN = /^DS_[A-Z0-9]{8,}$/;
  const MIN_COMMENT_LENGTH = 5;
  const MAX_COMMENT_LENGTH = 500;
  const TOAST_DURATION = 4000;
  const DEFAULT_CURRENCY = 'EGP';

  let swiper = null;
  let currentVideoSlide = null;
  let tripData = {};
  let currentTrip = {};
  let tourTypes = {};
  let tripOwnerId = '';
  let tripReviews = [];
  let currentUserReview = null;
  let currentUserUid = '';

  let currentCurrency = DEFAULT_CURRENCY;
  let exchangeRates = { EGP: 1 };
  let ratesLoaded = false;
  let currencyChangeHandler = null;

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
    if (rates) { exchangeRates = rates; ratesLoaded = true; }
    currencyChangeHandler = handleCurrencyChange;
    window.addEventListener('currencyChanged', currencyChangeHandler);
  }

  function checkFirebaseDependencies() {
    return typeof auth !== 'undefined' && typeof db !== 'undefined';
  }

  function checkSwiperDependency() {
    return typeof Swiper !== 'undefined';
  }

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
      if (!data) { showToast('No trips available.', 'error'); return {}; }
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
      console.error('Error:', error);
      showToast('Failed to load trip data.', 'error');
      return {};
    } finally {
      hideSpinner();
    }
  }

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
          return `<div class="highlight-note"><i class="fas fa-star" style="color: var(--gold); margin-right: 8px;"></i>${sanitizeHTML(text)}</div>`;
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
  // SIMPLE VIDEO PLAYER - WORKS 100%
  // ==========================================================================
  function playVideoInSlide(slide) {
    if (!slide) return;
    const videoId = slide.getAttribute('data-video-id');
    if (!videoId) return;
    
    stopAllVideos();
    currentVideoSlide = slide;
    
    // Save original content
    slide._originalContent = slide.innerHTML;
    
    // Clear and add video
    slide.innerHTML = '';
    
    // Container
    const container = document.createElement('div');
    container.className = 'video-player-wrapper';
    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#000;';
    
    // IFrame - YouTube with controls hidden via CSS
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=0&showinfo=0&enablejsapi=1&origin=${window.location.origin}&playsinline=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;pointer-events:none;';
    
    // Overlay to capture clicks
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;cursor:pointer;';
    
    // Play/Pause on click
    overlay.addEventListener('click', function(e) {
      e.stopPropagation();
      togglePlayPause();
    });
    
    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'video-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:20;width:44px;height:44px;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:20px;transition:all 0.3s;';
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      stopVideoInSlide(slide);
    });
    closeBtn.addEventListener('mouseenter', function() {
      this.style.background = '#ff0000';
      this.style.transform = 'scale(1.1)';
    });
    closeBtn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(0,0,0,0.7)';
      this.style.transform = 'scale(1)';
    });
    
    // Big play/pause indicator
    const bigIndicator = document.createElement('div');
    bigIndicator.className = 'video-big-indicator';
    bigIndicator.innerHTML = '<i class="fas fa-pause"></i>';
    bigIndicator.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);border:3px solid rgba(255,255,255,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;z-index:15;pointer-events:none;transition:all 0.3s;opacity:0;';
    
    container.appendChild(iframe);
    container.appendChild(overlay);
    container.appendChild(bigIndicator);
    container.appendChild(closeBtn);
    
    slide.appendChild(container);
    
    // YouTube API
    let player;
    let isPlaying = true;
    
    function initPlayer() {
      try {
        player = new YT.Player(iframe, {
          events: {
            'onReady': function(e) {
              e.target.playVideo();
              e.target.unMute();
            },
            'onStateChange': function(e) {
              if (e.data === YT.PlayerState.PLAYING) {
                isPlaying = true;
                bigIndicator.style.opacity = '0';
                bigIndicator.innerHTML = '<i class="fas fa-pause"></i>';
              } else if (e.data === YT.PlayerState.PAUSED) {
                isPlaying = false;
                bigIndicator.style.opacity = '1';
                bigIndicator.innerHTML = '<i class="fas fa-play"></i>';
              } else if (e.data === YT.PlayerState.ENDED) {
                isPlaying = false;
                bigIndicator.style.opacity = '1';
                bigIndicator.innerHTML = '<i class="fas fa-redo"></i>';
              }
            }
          }
        });
      } catch(e) {
        console.log('YT Player init error, using fallback');
      }
    }
    
    function togglePlayPause() {
      if (!player) return;
      try {
        if (isPlaying) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } catch(e) {}
    }
    
    // Show indicator briefly
    overlay.addEventListener('mouseenter', function() {
      bigIndicator.style.opacity = '1';
      setTimeout(() => { if (isPlaying) bigIndicator.style.opacity = '0'; }, 1500);
    });
    
    // Keyboard control
    function keyHandler(e) {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePlayPause();
      }
    }
    document.addEventListener('keydown', keyHandler);
    
    slide._videoCleanup = function() {
      document.removeEventListener('keydown', keyHandler);
      if (player) { try { player.destroy(); } catch(e) {} }
    };
    
    // Init
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const oldCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function() {
        if (oldCallback) oldCallback();
        initPlayer();
      };
    }
  }

  function stopVideoInSlide(slide) {
    if (!slide) return;
    
    if (slide._videoCleanup) {
      slide._videoCleanup();
      slide._videoCleanup = null;
    }
    
    const videoId = slide.getAttribute('data-video-id');
    const thumbnailUrl = slide.getAttribute('data-thumbnail');
    const index = slide.getAttribute('data-index');
    
    if (!videoId || !thumbnailUrl) return;
    
    slide.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = `Video ${parseInt(index) + 1}`;
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    
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
    
    currentVideoSlide = null;
  }

  function stopAllVideos() {
    if (currentVideoSlide) {
      stopVideoInSlide(currentVideoSlide);
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
      
      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.alt = `Video ${index + 1}`;
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
        e.preventDefault();
        playVideoInSlide(slide);
      };
      slide.appendChild(playBtn);
    } else {
      const img = document.createElement('img');
      img.src = data;
      img.alt = `Photo ${index + 1}`;
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
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
      let thumbnailSrc = isVideo ? slide.getAttribute('data-thumbnail') : slide.querySelector('img')?.src;
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
    document.querySelectorAll('.thumbnail-wrapper').forEach(w => {
      w.classList.toggle('active', parseInt(w.getAttribute('data-index')) === index);
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
        const slide = createSlideElement('image', imgSrc, slideCount);
        if (slide) { wrapper.appendChild(slide); slideCount++; }
      });
    }
    
    if (media?.videos && Array.isArray(media.videos)) {
      media.videos.forEach(videoData => {
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
      placeholder.innerHTML = '<div><i class="fas fa-image" style="font-size:48px;opacity:0.3;"></i><p style="margin-top:16px;">No images</p></div>';
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
          slideChange: function() { stopAllVideos(); updateActiveThumbnail(this.realIndex); },
          slideChangeTransitionStart: stopAllVideos
        }
      });
    } catch(e) {
      createThumbnails();
    }
  }

  // ==========================================================================
  // CONTENT LOADERS
  // ==========================================================================
  function loadIncludedNotIncluded(data) {
    [{ containerId: SELECTORS.includedItems, key: 'included', icon: 'fa-check', color: '#22c55e' },
     { containerId: SELECTORS.notIncludedItems, key: 'notIncluded', icon: 'fa-times', color: '#ef4444' }]
    .forEach(({ containerId, key, icon, color }) => {
      const container = document.querySelector(containerId);
      const items = data[key];
      if (container && items && Array.isArray(items) && items.length > 0) {
        container.innerHTML = items.map(item => `<div class="included-item"><i class="fas ${icon}" style="color:${color};"></i><span>${sanitizeHTML(item)}</span></div>`).join('');
      }
    });
  }

  function loadTimeline(timelineData) {
    const container = document.querySelector(SELECTORS.timelineContainer);
    if (container && timelineData && Array.isArray(timelineData) && timelineData.length > 0) {
      container.innerHTML = timelineData.map(item => `
        <div class="timeline-item">
          <div class="timeline-time">${sanitizeHTML(item.time || '')}</div>
          <div class="timeline-content"><h4>${sanitizeHTML(item.title || '')}</h4><p>${sanitizeHTML(item.description || '')}</p></div>
        </div>`).join('');
    }
  }

  function loadWhatToBring(items) {
    const list = document.querySelector(SELECTORS.whatToBringList);
    if (list && items && Array.isArray(items) && items.length > 0) {
      list.innerHTML = items.map(item => `<li><i class="fas fa-check"></i> ${sanitizeHTML(item)}</li>`).join('');
    }
  }

  // ==========================================================================
  // REVIEWS
  // ==========================================================================
  function getUserPhotoUrl(uid) { return uid ? `/app/photos/${uid}.jpg` : null; }

  function showReviewSkeletons() {
    const container = document.querySelector(SELECTORS.reviewsListContainer);
    if (!container) return;
    container.innerHTML = Array(3).fill(`<div class="review-card" style="opacity:0.5;"><div class="review-card-header"><div class="review-card-user"><div class="review-card-avatar" style="background:#3a3a3a;"></div><div><div style="width:100px;height:14px;background:#3a3a3a;border-radius:4px;margin-bottom:6px;"></div><div style="width:80px;height:12px;background:#3a3a3a;border-radius:4px;"></div></div></div></div><div style="width:100%;height:40px;background:#3a3a3a;border-radius:4px;"></div></div>`).join('');
  }

  async function loadReviews() {
    if (!tripSlug || !checkFirebaseDependencies()) return;
    showReviewSkeletons();
    try {
      const snap = await db.ref('trip-reviews/' + tripSlug).once('value');
      const data = snap.val();
      if (data?.reviews) {
        tripReviews = Object.entries(data.reviews).map(([id, r]) => ({ id, ...r })).filter(r => r.approved).sort((a, b) => new Date(b.date) - new Date(a.date));
        updateStarsSummary(data.average || 0, data.count || 0);
      } else {
        tripReviews = [];
        updateStarsSummary(0, 0);
      }
      renderReviews();
      if (typeof auth !== 'undefined' && auth.currentUser) {
        currentUserReview = tripReviews.find(r => r.userId === auth.currentUser.uid);
        const btn = document.querySelector(SELECTORS.openReviewBtn);
        if (btn) btn.innerHTML = currentUserReview ? '<i class="fas fa-edit"></i> <span>Edit Review</span>' : '<i class="fas fa-pen-alt"></i> <span>Write a Review</span>';
      }
    } catch(e) { renderReviews(); }
  }

  function updateStarsSummary(average, count) {
    const container = document.querySelector(SELECTORS.avgStars);
    if (!container) return;
    const full = Math.floor(average), half = average % 1 >= 0.5, empty = 5 - full - (half ? 1 : 0);
    container.innerHTML = '<i class="fas fa-star"></i>'.repeat(full) + (half ? '<i class="fas fa-star-half-alt"></i>' : '') + '<i class="far fa-star"></i>'.repeat(empty);
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
    container.innerHTML = tripReviews.map(r => {
      const d = new Date(r.date), dateStr = isNaN(d) ? 'N/A' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const name = r.userName || 'Traveler', initial = name.charAt(0).toUpperCase(), photo = getUserPhotoUrl(r.userId);
      const stars = Array(5).fill().map((_,i) => i < r.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>').join('');
      return `<div class="review-card"><div class="review-card-header"><div class="review-card-user"><div class="review-card-avatar"><img src="${sanitizeHTML(photo)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy" alt="${sanitizeHTML(name)}"><div class="avatar-fallback" style="display:none;">${sanitizeHTML(initial)}</div></div><div><div class="review-card-user-name">${sanitizeHTML(name)}</div><div class="review-card-stars">${stars}</div></div></div><span class="review-card-date">${dateStr}</span></div><p class="review-card-comment">${sanitizeHTML(r.comment || '')}</p></div>`;
    }).join('');
  }

  // ==========================================================================
  // REVIEW MODAL
  // ==========================================================================
  function openReviewModal() {
    if (typeof auth === 'undefined' || !auth.currentUser) { showToast('Please sign in', 'error'); return; }
    const modal = document.querySelector(SELECTORS.reviewModal);
    if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  }

  function closeReviewModal() {
    const modal = document.querySelector(SELECTORS.reviewModal);
    if (modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; }
  }

  function setupStars() {
    const container = document.querySelector(SELECTORS.starSelector);
    if (!container) return;
    container.querySelectorAll('i').forEach(s => {
      s.addEventListener('click', () => {
        const rating = parseInt(s.dataset.rating);
        document.querySelector(SELECTORS.ratingValue).value = rating;
        container.querySelectorAll('i').forEach((star, i) => {
          star.classList.toggle('active', i < rating);
          star.classList.toggle('fas', i < rating);
          star.classList.toggle('far', i >= rating);
        });
      });
    });
    const commentInput = document.querySelector(SELECTORS.commentInput);
    const charCount = document.querySelector(SELECTORS.charCount);
    if (commentInput && charCount) {
      commentInput.addEventListener('input', () => {
        let len = commentInput.value.length;
        if (len > MAX_COMMENT_LENGTH) { commentInput.value = commentInput.value.substring(0, MAX_COMMENT_LENGTH); len = MAX_COMMENT_LENGTH; }
        charCount.textContent = len;
      });
    }
  }

  async function submitReview() {
    if (!checkFirebaseDependencies()) { showToast('System error', 'error'); return; }
    const voucher = document.querySelector(SELECTORS.voucherInput)?.value?.trim()?.toUpperCase();
    if (!voucher || !VOUCHER_PATTERN.test(voucher)) { showToast('Invalid voucher (DS_XXXXXXXX)', 'error'); return; }
    const rating = parseInt(document.querySelector(SELECTORS.ratingValue)?.value || '0');
    if (!rating || rating < 1 || rating > 5) { showToast('Select rating', 'error'); return; }
    const comment = document.querySelector(SELECTORS.commentInput)?.value?.trim();
    if (!comment || comment.length < MIN_COMMENT_LENGTH) { showToast(`Min ${MIN_COMMENT_LENGTH} characters`, 'error'); return; }
    
    try {
      const snap = await db.ref('trip-bookings/' + voucher).once('value');
      const booking = snap.val();
      if (!booking || booking.uid !== auth.currentUser.uid) { showToast('Invalid voucher', 'error'); return; }
      
      const user = auth.currentUser;
      let userName = 'Traveler';
      try { const us = await db.ref('egy_user/' + user.uid).once('value'); if (us.val()) userName = us.val().username || 'Traveler'; } catch(e) {}
      
      const reviewData = { userId: user.uid, userName: sanitizeHTML(userName), rating, comment: sanitizeHTML(comment), date: new Date().toISOString(), approved: true, voucher };
      const ref = db.ref('trip-reviews/' + tripSlug);
      const curr = (await ref.once('value')).val() || { reviews: {}, count: 0, average: 0 };
      let count = curr.count || 0, total = (curr.average || 0) * count;
      
      if (currentUserReview && curr.reviews[currentUserReview.id]) {
        total = total - (curr.reviews[currentUserReview.id].rating || 0) + rating;
        await ref.child('reviews/' + currentUserReview.id).update(reviewData);
      } else {
        await ref.child('reviews/' + Date.now()).set(reviewData);
        count++; total += rating;
      }
      await ref.update({ count, average: parseFloat((total / count).toFixed(1)) });
      closeReviewModal();
      resetReviewForm();
      await loadReviews();
      showToast('Thank you!', 'success');
    } catch(e) { showToast('Error submitting', 'error'); }
  }

  function resetReviewForm() {
    ['voucherInput', 'commentInput'].forEach(id => { const el = document.querySelector(SELECTORS[id]); if (el) el.value = ''; });
    const rv = document.querySelector(SELECTORS.ratingValue); if (rv) rv.value = '0';
    const cc = document.querySelector(SELECTORS.charCount); if (cc) cc.textContent = '0';
    document.querySelectorAll(`${SELECTORS.starSelector} i`).forEach(s => { s.classList.remove('active', 'fas'); s.classList.add('far'); });
  }

  function setupEventListeners() {
    document.querySelector(SELECTORS.openReviewBtn)?.addEventListener('click', openReviewModal);
    document.querySelector(SELECTORS.submitReviewBtn)?.addEventListener('click', submitReview);
    document.querySelector(`${SELECTORS.reviewModal} .services-popup-overlay`)?.addEventListener('click', closeReviewModal);
    document.querySelectorAll(`${SELECTORS.reviewModal} .close-popup-btn`).forEach(b => b.addEventListener('click', closeReviewModal));
    document.querySelector(SELECTORS.cancelReviewBtn)?.addEventListener('click', closeReviewModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const m = document.querySelector(SELECTORS.reviewModal);
        if (m && !m.classList.contains('hidden')) closeReviewModal();
      }
    });
  }

  function cleanup() {
    if (currencyChangeHandler) window.removeEventListener('currencyChanged', currencyChangeHandler);
    stopAllVideos();
    if (swiper) { swiper.destroy(true, true); swiper = null; }
  }

  async function init() {
    if (!tripSlug) { showToast('No trip specified', 'error'); return; }
    initCurrency();
    setupStars();
    setupEventListeners();
    if (typeof auth !== 'undefined') auth.onAuthStateChanged(u => { currentUserUid = u?.uid || ''; });
    await Promise.all([fetchAllTripData(), tripSlug ? loadReviews() : Promise.resolve()]);
    window.addEventListener('beforeunload', cleanup);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAllVideos(); });
  }

  return { init, getCurrentTrip: () => currentTrip, getTourTypes: () => tourTypes, getTripOwnerId: () => tripOwnerId, getTripSlug: () => tripSlug, formatPrice, showToast, cleanup, refreshReviews: loadReviews };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TripDisplay.init);
} else {
  TripDisplay.init();
}
window.tripModule = TripDisplay;
