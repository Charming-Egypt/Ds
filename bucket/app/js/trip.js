// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// With Working Custom Video Controller
// ==========================================================================

const TripDisplay = (() => {
  const SELECTORS = {
    tripName: '#tripName', spinner: '#spinner', tourTitle: '#tourTitle',
    tourDuration: '#tourDuration', tourPrice: '#tourPrice',
    tourDescription: '#tourDescription', descriptionContainer: '#descriptionContainer',
    swiperWrapper: '.swiper-wrapper', swiperContainer: '.swiper',
    thumbnailsOverlay: '#thumbnailsOverlay', includedItems: '#includedItems',
    notIncludedItems: '#notIncludedItems', timelineContainer: '#timelineContainer',
    whatToBringList: '#whatToBringList', reviewModal: '#reviewModal',
    openReviewBtn: '#openReviewBtn', submitReviewBtn: '#submitReviewBtn',
    starSelector: '#starSelector', ratingValue: '#ratingValue',
    commentInput: '#commentInput', charCount: '#charCount',
    voucherInput: '#voucherInput', avgStars: '#avgStars',
    reviewsCountText: '#reviewsCountText', reviewsListContainer: '#reviewsListContainer',
    cancelReviewBtn: '#cancelReviewBtn'
  };

  let swiper = null, currentVideoSlide = null, videoProgressInterval = null;
  let tripData = {}, currentTrip = {}, tourTypes = {}, tripOwnerId = '';
  let tripReviews = [], currentUserReview = null, currentUserUid = '';
  let currentCurrency = 'EGP', exchangeRates = { EGP: 1 }, ratesLoaded = false;

  function getTripIdFromURL() { return new URLSearchParams(window.location.search).get('trip-id'); }
  const tripSlug = getTripIdFromURL();

  function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function showToast(msg, type = 'success') {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#252526;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ${type==='success'?'#22c55e':'#ef4444'};white-space:nowrap;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 4000);
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function getVideoThumbnail(data, videoId) {
    if (data.thumbnail && data.thumbnail.trim()) return data.thumbnail.trim();
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // ==========================================================================
  // CUSTOM VIDEO PLAYER - WORKS 100%
  // ==========================================================================
  function playVideo(slide) {
    if (!slide) return;
    const videoId = slide.getAttribute('data-video-id');
    if (!videoId) return;

    stopAllVideos();
    currentVideoSlide = slide;

    // Pause swiper
    if (swiper?.autoplay) swiper.autoplay.stop();
    if (swiper?.allowTouchMove !== undefined) swiper.allowTouchMove = false;

    slide.innerHTML = '';

    // Container
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-video-wrapper';

    // IFrame
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=0&showinfo=0&enablejsapi=1&playsinline=1`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'custom-video-iframe';
    iframe.setAttribute('data-video-id', videoId);

    // Click overlay (for play/pause)
    const overlay = document.createElement('div');
    overlay.className = 'custom-video-overlay';

    // Controls bar
    const controls = document.createElement('div');
    controls.className = 'custom-video-controls';

    // Play/Pause
    const playPause = document.createElement('button');
    playPause.className = 'vc-btn vc-play';
    playPause.innerHTML = '<i class="fas fa-pause"></i>';

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

    // Assemble controls
    controls.appendChild(playPause);
    controls.appendChild(progressWrap);
    controls.appendChild(timeDisplay);
    controls.appendChild(volumeBtn);
    controls.appendChild(fullscreenBtn);
    controls.appendChild(closeBtn);

    // Big center button
    const bigBtn = document.createElement('div');
    bigBtn.className = 'vc-big-play';
    bigBtn.innerHTML = '<i class="fas fa-pause"></i>';

    wrapper.appendChild(iframe);
    wrapper.appendChild(overlay);
    wrapper.appendChild(bigBtn);
    wrapper.appendChild(controls);
    slide.appendChild(wrapper);

    // YouTube Player
    let player, isPlaying = true, isMuted = false;
    let hideTimer;

    function initYT() {
      player = new YT.Player(iframe, {
        events: {
          onReady: function(e) {
            e.target.playVideo();
            e.target.unMute();
            startProgress();
          },
          onStateChange: function(e) {
            if (e.data === 1) { // PLAYING
              isPlaying = true;
              bigBtn.classList.add('hidden');
              playPause.innerHTML = '<i class="fas fa-pause"></i>';
              startProgress();
            } else if (e.data === 2) { // PAUSED
              isPlaying = false;
              bigBtn.classList.remove('hidden');
              bigBtn.innerHTML = '<i class="fas fa-play"></i>';
              playPause.innerHTML = '<i class="fas fa-play"></i>';
              stopProgress();
            } else if (e.data === 0) { // ENDED
              isPlaying = false;
              bigBtn.classList.remove('hidden');
              bigBtn.innerHTML = '<i class="fas fa-redo"></i>';
              playPause.innerHTML = '<i class="fas fa-redo"></i>';
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
      if (videoProgressInterval) { clearInterval(videoProgressInterval); videoProgressInterval = null; }
    }

    function updateProgress() {
      if (!player?.getCurrentTime || !player?.getDuration) return;
      try {
        const curr = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        if (dur > 0) {
          progressFill.style.width = Math.min(100, (curr / dur) * 100) + '%';
          timeDisplay.textContent = formatTime(curr) + ' / ' + formatTime(dur);
        }
      } catch(e) {}
    }

    // Show controls on mouse move
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
      isPlaying ? player.pauseVideo() : player.playVideo();
      showControlsTemp();
    });

    overlay.addEventListener('mousemove', showControlsTemp);
    overlay.addEventListener('dblclick', () => {
      if (!player) return;
      try { wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.(); } catch(e) {}
    });

    playPause.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      isPlaying ? player.pauseVideo() : player.playVideo();
    });

    bigBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      isPlaying ? player.pauseVideo() : player.playVideo();
    });

    progressWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player?.getDuration) return;
      const rect = progressWrap.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      player.seekTo(player.getDuration() * pct);
      updateProgress();
    });

    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!player) return;
      isMuted = !isMuted;
      isMuted ? player.mute() : player.unMute();
      volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    });

    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try { wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.(); } catch(e) {}
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopVideo(slide);
    });

    // Keyboard
    function keyHandler(e) {
      if (!currentVideoSlide) return;
      switch(e.key) {
        case ' ': e.preventDefault(); if (player) isPlaying ? player.pauseVideo() : player.playVideo(); break;
        case 'ArrowLeft': e.preventDefault(); if (player) player.seekTo((player.getCurrentTime()||0) - 10); break;
        case 'ArrowRight': e.preventDefault(); if (player) player.seekTo((player.getCurrentTime()||0) + 10); break;
        case 'm': e.preventDefault(); if (player) { isMuted = !isMuted; isMuted ? player.mute() : player.unMute(); } break;
        case 'f': e.preventDefault(); try { wrapper.requestFullscreen?.(); } catch(e) {} break;
      }
    }
    document.addEventListener('keydown', keyHandler);

    // Cleanup
    slide._cleanup = function() {
      document.removeEventListener('keydown', keyHandler);
      stopProgress();
      clearTimeout(hideTimer);
      if (player) { try { player.destroy(); } catch(e) {} }
      if (swiper?.allowTouchMove !== undefined) swiper.allowTouchMove = true;
    };

    // Init YouTube
    if (window.YT?.Player) {
      initYT();
    } else {
      const orig = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function() { if (orig) orig(); initYT(); };
    }
  }

  function stopVideo(slide) {
    if (!slide) return;
    if (slide._cleanup) { slide._cleanup(); slide._cleanup = null; }

    const videoId = slide.getAttribute('data-video-id');
    const thumb = slide.getAttribute('data-thumbnail');
    const idx = slide.getAttribute('data-index');
    if (!videoId || !thumb) return;

    // Resume swiper
    if (swiper?.autoplay) swiper.autoplay.start();
    if (swiper?.allowTouchMove !== undefined) swiper.allowTouchMove = true;

    slide.innerHTML = '';
    const img = document.createElement('img');
    img.src = thumb;
    img.alt = 'Video ' + (parseInt(idx) + 1);
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';

    const playBtn = document.createElement('div');
    playBtn.className = 'play-button';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    playBtn.onclick = function(e) { e.stopPropagation(); playVideo(slide); };

    slide.appendChild(img);
    slide.appendChild(playBtn);
    currentVideoSlide = null;
  }

  function stopAllVideos() { if (currentVideoSlide) stopVideo(currentVideoSlide); }

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
      const vid = extractYouTubeId(data.videoUrl || data.url || '');
      if (!vid) return null;
      const thumb = getVideoThumbnail(data, vid);
      slide.setAttribute('data-video-id', vid);
      slide.setAttribute('data-thumbnail', thumb);

      const img = document.createElement('img');
      img.src = thumb;
      img.alt = 'Video ' + (index + 1);
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = function() { img.src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`; slide.setAttribute('data-thumbnail', img.src); };
      slide.appendChild(img);

      const btn = document.createElement('div');
      btn.className = 'play-button';
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.onclick = function(e) { e.stopPropagation(); playVideo(slide); };
      slide.appendChild(btn);
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
    document.querySelectorAll('.swiper-slide').forEach((slide, i) => {
      const type = slide.getAttribute('data-type');
      const isVid = type === 'video';
      const src = isVid ? slide.getAttribute('data-thumbnail') : slide.querySelector('img')?.src;
      if (!src) return;

      const wrap = document.createElement('div');
      wrap.className = 'thumbnail-wrapper';
      wrap.setAttribute('data-index', i);
      wrap.setAttribute('data-type', type || 'image');

      const img = document.createElement('img');
      img.src = src;
      img.className = 'thumbnail-image';
      img.alt = 'Thumb ' + (i + 1);
      img.loading = 'lazy';
      wrap.appendChild(img);

      if (isVid) {
        const ind = document.createElement('div');
        ind.className = 'video-indicator';
        ind.innerHTML = '<i class="fas fa-play"></i>';
        wrap.appendChild(ind);
        const badge = document.createElement('span');
        badge.className = 'video-duration';
        badge.textContent = 'VIDEO';
        wrap.appendChild(badge);
      }

      wrap.onclick = function() { if (swiper) { stopAllVideos(); swiper.slideTo(i); updateActiveThumb(i); } };
      container.appendChild(wrap);
    });
    updateActiveThumb(0);
  }

  function updateActiveThumb(idx) {
    document.querySelectorAll('.thumbnail-wrapper').forEach(w => w.classList.toggle('active', parseInt(w.getAttribute('data-index')) === idx));
  }

  function initGallery(media) {
    if (typeof Swiper === 'undefined') return;
    const wrapper = document.querySelector(SELECTORS.swiperWrapper);
    if (!wrapper) return;

    if (swiper) { stopAllVideos(); swiper.destroy(true, true); swiper = null; }
    wrapper.innerHTML = '';
    let count = 0;

    (media?.images || []).forEach(src => { if (src) { const s = createSlide('image', src, count); if (s) { wrapper.appendChild(s); count++; } } });
    (media?.videos || []).forEach(v => { if (v.videoUrl || v.url) { const s = createSlide('video', v, count); if (s) { wrapper.appendChild(s); count++; } } });

    if (count === 0) {
      const ph = document.createElement('div');
      ph.className = 'swiper-slide';
      ph.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#fff;';
      ph.innerHTML = '<div><i class="fas fa-image" style="font-size:48px;opacity:0.3;"></i><p style="margin-top:16px;">No images</p></div>';
      wrapper.appendChild(ph);
      count = 1;
    }

    swiper = new Swiper('.swiper', {
      slidesPerView: 1, loop: count > 1, spaceBetween: 0, speed: 400,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: {
        init: createThumbnails,
        slideChange: function() { stopAllVideos(); updateActiveThumb(this.realIndex); },
        slideChangeTransitionStart: stopAllVideos
      }
    });
  }

  // ==========================================================================
  // CONTENT
  // ==========================================================================
  function displayTripInfo(trip) {
    const t = document.querySelector(SELECTORS.tourTitle); if (t) t.textContent = trip.name || '';
    const d = document.querySelector(SELECTORS.tourDuration); if (d) d.textContent = trip.duration || 'Full Day';
    if (trip.name) document.title = trip.name + ' - Discover Sharm';
    const tn = document.querySelector(SELECTORS.tripName); if (tn) tn.value = trip.name || '';
  }

  function displayDescription(desc) {
    const c = document.querySelector(SELECTORS.descriptionContainer);
    const d = document.querySelector(SELECTORS.tourDescription);
    if (!c) return;
    if (desc?.trim()) {
      d.innerHTML = desc.split('\n').filter(p => p.trim()).map(p => {
        const t = p.trim();
        if (t.startsWith('!') || t.startsWith('IMPORTANT:')) return `<div class="highlight-note"><i class="fas fa-star" style="color:var(--gold);margin-right:8px;"></i>${sanitizeHTML(t.replace(/^!/,'').replace(/^IMPORTANT:/,'').trim())}</div>`;
        return `<p>${sanitizeHTML(t)}</p>`;
      }).join('');
      c.style.display = 'block';
    } else { c.style.display = 'none'; }
  }

  function updatePriceDisplay() {
    const el = document.querySelector(SELECTORS.tourPrice);
    if (el && currentTrip.basePrice) el.innerHTML = formatPrice(currentTrip.basePrice);
  }

  function loadIncludedNotIncluded(data) {
    [{ c: SELECTORS.includedItems, k: 'included', i: 'fa-check', cl: '#22c55e' }, { c: SELECTORS.notIncludedItems, k: 'notIncluded', i: 'fa-times', cl: '#ef4444' }]
      .forEach(({ c, k, i, cl }) => {
        const el = document.querySelector(c);
        const items = data[k];
        if (el && items?.length) el.innerHTML = items.map(item => `<div class="included-item"><i class="fas ${i}" style="color:${cl};"></i><span>${sanitizeHTML(item)}</span></div>`).join('');
      });
  }

  function loadTimeline(td) {
    const el = document.querySelector(SELECTORS.timelineContainer);
    if (el && td?.length) el.innerHTML = td.map(i => `<div class="timeline-item"><div class="timeline-time">${sanitizeHTML(i.time||'')}</div><div class="timeline-content"><h4>${sanitizeHTML(i.title||'')}</h4><p>${sanitizeHTML(i.description||'')}</p></div></div>`).join('');
  }

  function loadWhatToBring(items) {
    const el = document.querySelector(SELECTORS.whatToBringList);
    if (el && items?.length) el.innerHTML = items.map(i => `<li><i class="fas fa-check"></i> ${sanitizeHTML(i)}</li>`).join('');
  }

  // ==========================================================================
  // REVIEWS
  // ==========================================================================
  function getUserPhotoUrl(uid) { return uid ? `/app/photos/${uid}.jpg` : null; }

  function showReviewSkeletons() {
    const c = document.querySelector(SELECTORS.reviewsListContainer);
    if (c) c.innerHTML = Array(3).fill('<div class="review-card" style="opacity:0.5;"><div class="review-card-header"><div class="review-card-user"><div class="review-card-avatar" style="background:#3a3a3a;"></div><div><div style="width:100px;height:14px;background:#3a3a3a;border-radius:4px;margin-bottom:6px;"></div><div style="width:80px;height:12px;background:#3a3a3a;border-radius:4px;"></div></div></div></div><div style="width:100%;height:40px;background:#3a3a3a;border-radius:4px;"></div></div>').join('');
  }

  async function loadReviews() {
    if (!tripSlug || typeof db === 'undefined') return;
    showReviewSkeletons();
    try {
      const snap = await db.ref('trip-reviews/' + tripSlug).once('value');
      const data = snap.val();
      tripReviews = data?.reviews ? Object.entries(data.reviews).map(([id, r]) => ({ id, ...r })).filter(r => r.approved).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
      updateStarsSummary(data?.average || 0, data?.count || 0);
      renderReviews();
    } catch(e) { renderReviews(); }
  }

  function updateStarsSummary(avg, count) {
    const c = document.querySelector(SELECTORS.avgStars);
    if (!c) return;
    const f = Math.floor(avg), h = avg % 1 >= 0.5;
    c.innerHTML = '<i class="fas fa-star"></i>'.repeat(f) + (h ? '<i class="fas fa-star-half-alt"></i>' : '') + '<i class="far fa-star"></i>'.repeat(5 - f - (h ? 1 : 0));
    const ce = document.querySelector(SELECTORS.reviewsCountText);
    if (ce) ce.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
  }

  function renderReviews() {
    const c = document.querySelector(SELECTORS.reviewsListContainer);
    if (!c) return;
    if (!tripReviews.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p><span>Be the first</span></div>'; return; }
    c.innerHTML = tripReviews.map(r => {
      const d = new Date(r.date), ds = isNaN(d) ? 'N/A' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const name = r.userName || 'Traveler', ini = name.charAt(0).toUpperCase(), photo = getUserPhotoUrl(r.userId);
      const stars = Array(5).fill().map((_, i) => i < r.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>').join('');
      return `<div class="review-card"><div class="review-card-header"><div class="review-card-user"><div class="review-card-avatar"><img src="${sanitizeHTML(photo)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy" alt="${sanitizeHTML(name)}"><div class="avatar-fallback" style="display:none;">${sanitizeHTML(ini)}</div></div><div><div class="review-card-user-name">${sanitizeHTML(name)}</div><div class="review-card-stars">${stars}</div></div></div><span class="review-card-date">${ds}</span></div><p class="review-card-comment">${sanitizeHTML(r.comment||'')}</p></div>`;
    }).join('');
  }

  // ==========================================================================
  // MODAL
  // ==========================================================================
  function openReviewModal() {
    if (typeof auth === 'undefined' || !auth.currentUser) { showToast('Please sign in', 'error'); return; }
    const m = document.querySelector(SELECTORS.reviewModal);
    if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  }
  function closeReviewModal() {
    const m = document.querySelector(SELECTORS.reviewModal);
    if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
  }

  function setupStars() {
    const c = document.querySelector(SELECTORS.starSelector);
    if (!c) return;
    c.querySelectorAll('i').forEach(s => s.addEventListener('click', () => {
      const r = parseInt(s.dataset.rating);
      document.querySelector(SELECTORS.ratingValue).value = r;
      c.querySelectorAll('i').forEach((st, i) => { st.classList.toggle('active', i < r); st.classList.toggle('fas', i < r); st.classList.toggle('far', i >= r); });
    }));
    const ci = document.querySelector(SELECTORS.commentInput), cc = document.querySelector(SELECTORS.charCount);
    if (ci && cc) ci.addEventListener('input', () => { let l = ci.value.length; if (l > 500) { ci.value = ci.value.substring(0, 500); l = 500; } cc.textContent = l; });
  }

  async function submitReview() {
    if (typeof db === 'undefined') return;
    const voucher = document.querySelector(SELECTORS.voucherInput)?.value?.trim()?.toUpperCase();
    if (!voucher || !/^DS_[A-Z0-9]{8,}$/.test(voucher)) { showToast('Invalid voucher', 'error'); return; }
    const rating = parseInt(document.querySelector(SELECTORS.ratingValue)?.value || '0');
    if (!rating || rating < 1) { showToast('Select rating', 'error'); return; }
    const comment = document.querySelector(SELECTORS.commentInput)?.value?.trim();
    if (!comment || comment.length < 5) { showToast('Min 5 characters', 'error'); return; }
    try {
      const snap = await db.ref('trip-bookings/' + voucher).once('value');
      if (!snap.val() || snap.val().uid !== auth.currentUser.uid) { showToast('Invalid voucher', 'error'); return; }
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
      document.querySelector(SELECTORS.voucherInput).value = '';
      document.querySelector(SELECTORS.commentInput).value = '';
      document.querySelector(SELECTORS.ratingValue).value = '0';
      document.querySelector(SELECTORS.charCount).textContent = '0';
      document.querySelectorAll(`${SELECTORS.starSelector} i`).forEach(s => { s.classList.remove('active', 'fas'); s.classList.add('far'); });
      await loadReviews();
      showToast('Thank you!', 'success');
    } catch(e) { showToast('Error', 'error'); }
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function setupEvents() {
    document.querySelector(SELECTORS.openReviewBtn)?.addEventListener('click', openReviewModal);
    document.querySelector(SELECTORS.submitReviewBtn)?.addEventListener('click', submitReview);
    document.querySelector(`${SELECTORS.reviewModal} .services-popup-overlay`)?.addEventListener('click', closeReviewModal);
    document.querySelectorAll(`${SELECTORS.reviewModal} .close-popup-btn`).forEach(b => b.addEventListener('click', closeReviewModal));
    document.querySelector(SELECTORS.cancelReviewBtn)?.addEventListener('click', closeReviewModal);
  }

  function cleanup() { stopAllVideos(); if (swiper) { swiper.destroy(true, true); swiper = null; } }

  async function fetchData() {
    if (typeof db === 'undefined') return;
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
    } catch(e) { console.error(e); }
  }

  function initCurrency() {
    currentCurrency = localStorage.getItem('preferredCurrency') || 'EGP';
    if (window.SharmCurrency?.rates) { exchangeRates = window.SharmCurrency.rates; ratesLoaded = true; }
  }

  async function init() {
    if (!tripSlug) return;
    initCurrency();
    setupStars();
    setupEvents();
    if (typeof auth !== 'undefined') auth.onAuthStateChanged(u => { currentUserUid = u?.uid || ''; });
    await Promise.all([fetchData(), tripSlug ? loadReviews() : Promise.resolve()]);
    window.addEventListener('beforeunload', cleanup);
  }

  return { init, getCurrentTrip: () => currentTrip, getTourTypes: () => tourTypes, getTripOwnerId: () => tripOwnerId, getTripSlug: () => tripSlug, formatPrice, showToast, cleanup, refreshReviews: loadReviews };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', TripDisplay.init);
else TripDisplay.init();
window.tripModule = TripDisplay;
