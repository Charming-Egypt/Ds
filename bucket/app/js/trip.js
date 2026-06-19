// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// Handles: Data Fetching, Gallery, Timeline, Reviews
// ==========================================================================

const TripDisplay = (() => {
  // ==========================================================================
  // CONSTANTS
  // ==========================================================================
  const SELECTORS = {
    tripName: '#tripName',
    tripNameInput: '#tripName',
    mobileTripNameInput: '#mobileTripName',
    spinner: '#spinner',
    tourTitle: '#tourTitle',
    tourDuration: '#tourDuration',
    tourPrice: '#tourPrice',
    swiperWrapper: '.swiper-wrapper',
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
  };

  const VOUCHER_PATTERN = /^[A-Z0-9]{6,20}$/;
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
  // FIREBASE DEPENDENCY CHECKS
  // ==========================================================================
  function checkFirebaseDependencies() {
    if (typeof auth === 'undefined') {
      console.error('Firebase Auth not loaded');
      return false;
    }
    if (typeof db === 'undefined') {
      console.error('Firebase Database not loaded');
      return false;
    }
    return true;
  }

  function checkSwiperDependency() {
    if (typeof Swiper === 'undefined') {
      console.warn('Swiper library not loaded - gallery will be disabled');
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
        
        // Display everything
        displayTripInfo(currentTrip);
        loadMediaContent(currentTrip.media);
        loadIncludedNotIncluded(currentTrip);
        loadTimeline(currentTrip.timeline);
        loadWhatToBring(currentTrip.whatToBring);
        updatePriceDisplay();
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch trip data:', error);
      showToast('Failed to load trip data.', 'error');
      return {};
    } finally {
      hideSpinner();
    }
  }

  // ==========================================================================
  // DISPLAY TRIP INFO
  // ==========================================================================
  function displayTripInfo(trip) {
    const titleEl = document.querySelector(SELECTORS.tourTitle);
    if (titleEl) titleEl.textContent = trip.name || '';
    
    const durationEl = document.querySelector(SELECTORS.tourDuration);
    if (durationEl) durationEl.textContent = trip.duration || 'Full Day';
    
    if (trip.name) {
      document.title = sanitizeHTML(trip.name) + ' - Discover Sharm';
    }
    
    // Set trip name in booking forms (if they exist)
    const tripNameInput = document.querySelector(SELECTORS.tripNameInput);
    if (tripNameInput) tripNameInput.value = trip.name || '';
    
    const mobileTripNameInput = document.querySelector(SELECTORS.mobileTripNameInput);
    if (mobileTripNameInput) mobileTripNameInput.value = trip.name || '';
  }

  function updatePriceDisplay() {
    const el = document.querySelector(SELECTORS.tourPrice);
    if (el && currentTrip.basePrice) {
      el.innerHTML = formatPrice(currentTrip.basePrice);
    }
  }

  // ==========================================================================
  // MEDIA GALLERY (SWIPER)
  // ==========================================================================
  function extractVideoId(url) {
    // Handle multiple video platforms
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function loadMediaContent(media) {
    if (!media || !checkSwiperDependency()) return;
    
    const wrapper = document.querySelector(SELECTORS.swiperWrapper);
    const thumbs = document.querySelector(SELECTORS.thumbnailsOverlay);
    
    if (wrapper) wrapper.innerHTML = '';
    if (thumbs) thumbs.innerHTML = '';
    
    function addThumb(src, idx) {
      if (!thumbs) return;
      const img = document.createElement('img');
      img.src = src;
      img.dataset.index = idx;
      img.alt = `Thumbnail ${idx + 1}`;
      img.loading = 'lazy';
      img.addEventListener('click', () => {
        if (swiper) swiper.slideTo(idx);
        updateActiveThumbnail(idx);
      });
      thumbs.appendChild(img);
    }
    
    // Images
    if (media.images) {
      media.images.forEach((imgSrc, i) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `Trip photo ${i + 1}`;
        img.loading = 'lazy';
        slide.appendChild(img);
        wrapper.appendChild(slide);
        addThumb(imgSrc, i);
      });
    }
    
    // Videos
    if (media.videos) {
      media.videos.forEach((video, i) => {
        const idx = (media.images?.length || 0) + i;
        const slide = document.createElement('div');
        slide.className = 'swiper-slide swiper-slide-video';
        slide.dataset.videoUrl = video.videoUrl;
        slide.dataset.thumbnail = video.thumbnail;
        
        const img = document.createElement('img');
        img.src = video.thumbnail;
        img.alt = 'Video thumbnail';
        img.loading = 'lazy';
        slide.appendChild(img);
        
        const playButton = document.createElement('div');
        playButton.className = 'play-button';
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.setAttribute('aria-label', 'Play video');
        slide.appendChild(playButton);
        
        wrapper.appendChild(slide);
        addThumb(video.thumbnail, idx);
      });
    }
    
    // Swiper initialization
    if (!swiper) {
      swiper = new Swiper('.swiper', {
        slidesPerView: 1,
        loop: true,
        pagination: {
          el: '.swiper-pagination',
          clickable: true
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        on: {
          slideChange: function() {
            updateActiveThumbnail(this.realIndex);
            stopVideo();
          }
        }
      });
      
      const swiperEl = document.querySelector('.swiper');
      if (swiperEl) {
        swiperEl.addEventListener('click', function(e) {
          const playBtn = e.target.closest('.play-button');
          if (playBtn) {
            const slide = playBtn.closest('.swiper-slide');
            if (slide?.classList.contains('swiper-slide-video')) {
              playVideo(slide);
            }
          }
        });
      }
    } else {
      swiper.update();
    }
    
    updateActiveThumbnail(0);
  }

  function playVideo(slide) {
    stopVideo();
    
    const videoUrl = slide.dataset.videoUrl;
    const videoId = extractVideoId(videoUrl);
    
    if (videoId) {
      slide.innerHTML = `
        <iframe 
          width="100%" height="100%" 
          src="https://www.youtube.com/embed/${sanitizeHTML(videoId)}?autoplay=1&mute=1" 
          frameborder="0" 
          allow="autoplay; encrypted-media" 
          allowfullscreen
          title="Video player"
        ></iframe>
      `;
      currentVideoSlide = slide;
    }
  }

  function stopVideo() {
    if (currentVideoSlide) {
      const thumbnail = currentVideoSlide.dataset.thumbnail;
      currentVideoSlide.innerHTML = `
        <img src="${thumbnail}" alt="Video thumbnail">
        <div class="play-button" aria-label="Play video"><i class="fas fa-play"></i></div>
      `;
      currentVideoSlide = null;
    }
  }

  function updateActiveThumbnail(index) {
    document.querySelectorAll(`${SELECTORS.thumbnailsOverlay} img`).forEach(thumb => {
      thumb.classList.toggle('active', parseInt(thumb.dataset.index) === index);
    });
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
      
      if (container && items && Array.isArray(items)) {
        container.innerHTML = '';
        items.forEach(item => {
          const el = document.createElement('div');
          el.className = 'included-item';
          const iconEl = document.createElement('i');
          iconEl.className = `fas ${icon}`;
          iconEl.style.color = color;
          const span = document.createElement('span');
          span.textContent = item;
          el.appendChild(iconEl);
          el.appendChild(span);
          container.appendChild(el);
        });
      }
    });
  }

  // ==========================================================================
  // TIMELINE
  // ==========================================================================
  function loadTimeline(timelineData) {
    const container = document.querySelector(SELECTORS.timelineContainer);
    
    if (container && timelineData && Array.isArray(timelineData)) {
      container.innerHTML = timelineData.map(item => {
        const div = document.createElement('div');
        div.className = 'timeline-item';
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'timeline-time';
        timeDiv.textContent = item.time;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'timeline-content';
        
        const h4 = document.createElement('h4');
        h4.textContent = item.title;
        
        const p = document.createElement('p');
        p.textContent = item.description;
        
        contentDiv.appendChild(h4);
        contentDiv.appendChild(p);
        div.appendChild(timeDiv);
        div.appendChild(contentDiv);
        
        return div.outerHTML;
      }).join('');
    }
  }

  // ==========================================================================
  // WHAT TO BRING
  // ==========================================================================
  function loadWhatToBring(items) {
    const list = document.querySelector(SELECTORS.whatToBringList);
    
    if (list && items && Array.isArray(items)) {
      list.innerHTML = items.map(item => {
        const li = document.createElement('li');
        const icon = document.createElement('i');
        icon.className = 'fas fa-check';
        li.appendChild(icon);
        li.appendChild(document.createTextNode(' ' + item));
        return li.outerHTML;
      }).join('');
    }
  }

  // ==========================================================================
  // REVIEWS SYSTEM
  // ==========================================================================
  function getUserPhotoUrl(uid) {
    return uid ? `/app/photos/${sanitizeHTML(uid)}.jpg` : null;
  }

  function showReviewSkeletons() {
    const container = document.querySelector(SELECTORS.reviewsListContainer);
    if (!container) return;
    
    container.innerHTML = Array(3).fill(`
      <div class="review-skeleton">
        <div class="skeleton-header">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-text"></div>
        </div>
        <div class="skeleton-body"></div>
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
        renderReviews();
      } else {
        updateStarsSummary(0, 0);
        renderReviews();
      }
      
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
    if (container) {
      container.innerHTML = '';
      
      for (let i = 0; i < Math.floor(average); i++) {
        const star = document.createElement('i');
        star.className = 'fas fa-star';
        container.appendChild(star);
      }
      
      if (average % 1 >= 0.5) {
        const halfStar = document.createElement('i');
        halfStar.className = 'fas fa-star-half-alt';
        container.appendChild(halfStar);
      }
      
      for (let i = container.children.length; i < 5; i++) {
        const emptyStar = document.createElement('i');
        emptyStar.className = 'far fa-star';
        container.appendChild(emptyStar);
      }
    }
    
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
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const initial = (review.userName || 'U').charAt(0).toUpperCase();
      const photoUrl = getUserPhotoUrl(review.userId);
      
      const starsHtml = Array(5).fill().map((_, i) => {
        if (i < review.rating) {
          return '<i class="fas fa-star" style="color:#f59e0b;"></i>';
        }
        return '<i class="far fa-star" style="color:#989b9f;"></i>';
      }).join('');
      
      return `
        <div class="review-card">
          <div class="review-card-header">
            <div class="review-card-user">
              <div class="review-card-avatar">
                <img src="${sanitizeHTML(photoUrl)}" 
                     onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" 
                     loading="lazy" 
                     alt="${sanitizeHTML(review.userName || 'User')}">
                <div class="avatar-fallback" style="display:none;">${sanitizeHTML(initial)}</div>
              </div>
              <div>
                <div class="review-card-user-name">${sanitizeHTML(review.userName || 'User')}</div>
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
      showToast('System not fully loaded. Please try again.', 'error');
      return;
    }

    const voucher = document.querySelector(SELECTORS.voucherInput)?.value?.trim()?.toUpperCase();
    
    if (!voucher || !VOUCHER_PATTERN.test(voucher)) {
      showToast('Please enter a valid voucher number', 'error');
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
        showToast('Invalid voucher number', 'error');
        return;
      }
      
      const user = auth.currentUser;
      let userName = 'Traveler';
      
      try {
        const userSnap = await db.ref('egy_user/' + user.uid).once('value');
        const userData = userSnap.val();
        if (userData) userName = userData.username || 'Traveler';
      } catch (e) {
        console.warn('Could not fetch user data:', e);
      }
      
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
      showToast('Failed to submit review. Please try again.', 'error');
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
  // CLEANUP
  // ==========================================================================
  function cleanup() {
    // Remove event listeners
    if (currencyChangeHandler) {
      window.removeEventListener('currencyChanged', currencyChangeHandler);
    }
    
    // Destroy swiper
    if (swiper) {
      swiper.destroy(true, true);
      swiper = null;
    }
    
    // Stop any playing video
    stopVideo();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async function init() {
    if (!tripSlug) {
      showToast('No trip specified in URL.', 'error');
      return;
    }
    
    // Initialize currency
    initCurrency();
    
    // Setup stars selector
    setupStars();
    
    // Attach event listeners
    const openReviewBtn = document.querySelector(SELECTORS.openReviewBtn);
    if (openReviewBtn) openReviewBtn.addEventListener('click', openReviewModal);
    
    const submitReviewBtn = document.querySelector(SELECTORS.submitReviewBtn);
    if (submitReviewBtn) submitReviewBtn.addEventListener('click', submitReview);
    
    const reviewOverlay = document.querySelector(`${SELECTORS.reviewModal} .services-popup-overlay`);
    if (reviewOverlay) reviewOverlay.addEventListener('click', closeReviewModal);
    
    // Listen for auth changes
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) {
          currentUserUid = user.uid;
        }
      });
    }
    
    // Fetch trip data and reviews in parallel
    await Promise.all([
      fetchAllTripData(),
      tripSlug ? loadReviews() : Promise.resolve()
    ]);
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    console.log('✅ Trip Display & Reviews System Ready');
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
    cleanup
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TripDisplay.init);
} else {
  TripDisplay.init();
}

// Expose for booking system integration
window.tripModule = TripDisplay;

console.log('📦 Trip Module loaded');
