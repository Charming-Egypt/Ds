// ==========================================================================
// DISCOVER SHARM - Trip Display & Reviews System
// Booking/Payment Logic Moved to booking-system.js
// ==========================================================================

// ==========================================================================
// GLOBAL STATE (shared with BookingSystem)
// ==========================================================================
let swiper = null;
let currentVideoSlide = null;
let tripReviews = [];
let currentUserReview = null;

// These are populated by BookingSystem via window.displayTripInfo etc.
let currentTrip = {};

// ==========================================================================
// TRIP ID FROM URL
// ==========================================================================
function getTripIdFromURL() {
  return new URLSearchParams(window.location.search).get('trip-id');
}

const tripPName = getTripIdFromURL();

// ==========================================================================
// CURRENCY DISPLAY (delegates to BookingSystem when available)
// ==========================================================================
function formatPriceDisplay(price) {
  if (window.BookingSystem?.formatPrice) {
    return window.BookingSystem.formatPrice(price);
  }
  return parseFloat(price).toFixed(2) + ' EGP';
}

// ==========================================================================
// DISPLAY TRIP INFO
// ==========================================================================
function displayTripInfo(trip) {
  currentTrip = trip;
  
  const titleEl = document.getElementById('tourTitle');
  if (titleEl) titleEl.textContent = trip.name || '';
  
  const durationEl = document.getElementById('tourDuration');
  if (durationEl) durationEl.textContent = trip.duration || 'Full Day';
  
  // Update document title
  if (trip.name) {
    document.title = trip.name + ' - Discover Sharm';
  }
}

// ==========================================================================
// MEDIA GALLERY (SWIPER)
// ==========================================================================
function loadMediaContent(media) {
  if (!media) return;
  
  const wrapper = document.querySelector('.swiper-wrapper');
  const thumbs = document.getElementById('thumbnailsOverlay');
  
  if (wrapper) wrapper.innerHTML = '';
  if (thumbs) thumbs.innerHTML = '';
  
  // Helper: add thumbnail
  function addThumb(src, idx) {
    if (!thumbs) return;
    const img = document.createElement('img');
    img.src = src;
    img.dataset.index = idx;
    img.addEventListener('click', () => {
      if (swiper) swiper.slideTo(idx);
      updateActiveThumbnail(idx);
    });
    thumbs.appendChild(img);
  }
  
  // Add images
  if (media.images) {
    media.images.forEach((imgSrc, i) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `<img src="${imgSrc}" alt="Trip photo ${i + 1}" loading="lazy">`;
      wrapper.appendChild(slide);
      addThumb(imgSrc, i);
    });
  }
  
  // Add videos
  if (media.videos) {
    media.videos.forEach((video, i) => {
      const idx = (media.images?.length || 0) + i;
      const slide = document.createElement('div');
      slide.className = 'swiper-slide swiper-slide-video';
      slide.dataset.videoUrl = video.videoUrl;
      slide.dataset.thumbnail = video.thumbnail;
      slide.innerHTML = `
        <img src="${video.thumbnail}" alt="Video thumbnail" loading="lazy">
        <div class="play-button"><i class="fas fa-play"></i></div>
      `;
      wrapper.appendChild(slide);
      addThumb(video.thumbnail, idx);
    });
  }
  
  // Initialize or update Swiper
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
    
    // Click handler for play buttons
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
  const match = videoUrl.match(/(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]{11})/);
  
  if (match) {
    slide.innerHTML = `
      <iframe 
        width="100%" height="100%" 
        src="https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1" 
        frameborder="0" allowfullscreen
      ></iframe>
    `;
    currentVideoSlide = slide;
  }
}

function stopVideo() {
  if (currentVideoSlide) {
    currentVideoSlide.innerHTML = `
      <img src="${currentVideoSlide.dataset.thumbnail}" alt="Video thumbnail">
      <div class="play-button"><i class="fas fa-play"></i></div>
    `;
    currentVideoSlide = null;
  }
}

function updateActiveThumbnail(index) {
  document.querySelectorAll('.thumbnails-overlay img').forEach(thumb => {
    thumb.classList.toggle('active', parseInt(thumb.dataset.index) === index);
  });
}

// ==========================================================================
// INCLUDED / NOT INCLUDED
// ==========================================================================
function loadIncludedNotIncluded(data) {
  const sections = [
    { containerId: 'includedItems', key: 'included', icon: 'fa-check', color: '#22c55e' },
    { containerId: 'notIncludedItems', key: 'notIncluded', icon: 'fa-times', color: '#ef4444' }
  ];
  
  sections.forEach(({ containerId, key, icon, color }) => {
    const container = document.getElementById(containerId);
    const items = data[key];
    
    if (container && items && Array.isArray(items)) {
      container.innerHTML = '';
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'included-item';
        el.innerHTML = `<i class="fas ${icon}" style="color:${color};"></i><span>${item}</span>`;
        container.appendChild(el);
      });
    }
  });
}

// ==========================================================================
// TIMELINE / ITINERARY
// ==========================================================================
function loadTimeline(timelineData) {
  const container = document.getElementById('timelineContainer');
  
  if (container && timelineData && Array.isArray(timelineData)) {
    container.innerHTML = timelineData.map(item => `
      <div class="timeline-item">
        <div class="timeline-time">${item.time}</div>
        <div class="timeline-content">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
        </div>
      </div>
    `).join('');
  }
}

// ==========================================================================
// WHAT TO BRING
// ==========================================================================
function loadWhatToBring(items) {
  const list = document.getElementById('whatToBringList');
  
  if (list && items && Array.isArray(items)) {
    list.innerHTML = items.map(item => `
      <li><i class="fas fa-check"></i> ${item}</li>
    `).join('');
  }
}

// ==========================================================================
// REVIEWS SYSTEM
// ==========================================================================
function getUserPhotoUrl(uid) {
  return uid ? `/app/photos/${uid}.jpg` : null;
}

async function loadReviews() {
  if (!tripPName) return;
  
  try {
    const snap = await db.ref('trip-reviews/' + tripPName).once('value');
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
    
    // Update write review button if user already reviewed
    const user = auth.currentUser;
    if (user) {
      currentUserReview = tripReviews.find(r => r.userId === user.uid);
      const btn = document.getElementById('openReviewBtn');
      if (btn) {
        btn.innerHTML = currentUserReview
          ? '<i class="fas fa-edit"></i> <span>Edit Review</span>'
          : '<i class="fas fa-pen-alt"></i> <span>Write a Review</span>';
      }
    }
  } catch (error) {
    console.error('Failed to load reviews:', error);
  }
}

function updateStarsSummary(average, count) {
  const container = document.getElementById('avgStars');
  if (container) {
    container.innerHTML = '';
    
    // Filled stars
    for (let i = 0; i < Math.floor(average); i++) {
      container.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (average % 1 >= 0.5) {
      container.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = container.children.length; i < 5; i++) {
      container.innerHTML += '<i class="far fa-star"></i>';
    }
  }
  
  const countEl = document.getElementById('reviewsCountText');
  if (countEl) {
    countEl.textContent = `(${count} ${count === 1 ? 'review' : 'reviews'})`;
  }
}

function renderReviews() {
  const container = document.getElementById('reviewsListContainer');
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
              <img src="${photoUrl}" 
                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" 
                   loading="lazy" 
                   alt="${review.userName || 'User'}">
              <div class="avatar-fallback" style="display:none;">${initial}</div>
            </div>
            <div>
              <div class="review-card-user-name">${review.userName || 'User'}</div>
              <div class="review-card-stars">${starsHtml}</div>
            </div>
          </div>
          <span class="review-card-date">${dateStr}</span>
        </div>
        <p class="review-card-comment">${review.comment || ''}</p>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// REVIEW MODAL
// ==========================================================================
function openReviewModal() {
  if (!auth.currentUser) {
    if (window.BookingSystem?.showToast) {
      window.BookingSystem.showToast('Please sign in to write a review', 'error');
    } else {
      alert('Please sign in to write a review');
    }
    return;
  }
  
  const modal = document.getElementById('reviewModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function setupStars() {
  const starsContainer = document.getElementById('starSelector');
  if (!starsContainer) return;
  
  starsContainer.querySelectorAll('i').forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      document.getElementById('ratingValue').value = rating;
      
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
  
  // Character counter
  const commentInput = document.getElementById('commentInput');
  const charCount = document.getElementById('charCount');
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
  const voucher = document.getElementById('voucherInput')?.value?.trim()?.toUpperCase();
  if (!voucher) {
    showToastMsg('Please enter your voucher number', 'error');
    return;
  }
  
  const rating = parseInt(document.getElementById('ratingValue')?.value || '0');
  if (!rating) {
    showToastMsg('Please select a rating', 'error');
    return;
  }
  
  const comment = document.getElementById('commentInput')?.value?.trim();
  if (!comment || comment.length < 5) {
    showToastMsg('Review must be at least 5 characters', 'error');
    return;
  }
  
  try {
    // Verify voucher belongs to current user
    const snap = await db.ref('trip-bookings/' + voucher).once('value');
    const booking = snap.val();
    
    if (!booking || booking.uid !== auth.currentUser.uid) {
      showToastMsg('Invalid voucher number', 'error');
      return;
    }
    
    const user = auth.currentUser;
    let userName = 'Traveler';
    
    // Try to get username from profile
    try {
      const userSnap = await db.ref('egy_user/' + user.uid).once('value');
      const userData = userSnap.val();
      if (userData) userName = userData.username || 'Traveler';
    } catch (e) {
      // Use default
    }
    
    const reviewData = {
      userId: user.uid,
      userName,
      rating,
      comment,
      date: new Date().toISOString(),
      approved: true,
      voucher
    };
    
    const reviewRef = db.ref('trip-reviews/' + tripPName);
    const currentData = (await reviewRef.once('value')).val() || { reviews: {}, count: 0, average: 0 };
    
    let count = currentData.count || 0;
    let totalRating = (currentData.average || 0) * count;
    
    if (currentUserReview && currentData.reviews[currentUserReview.id]) {
      // Update existing review
      totalRating = totalRating - (currentData.reviews[currentUserReview.id].rating || 0) + rating;
      await reviewRef.child('reviews/' + currentUserReview.id).update(reviewData);
    } else {
      // New review
      await reviewRef.child('reviews/' + Date.now()).set(reviewData);
      count++;
      totalRating += rating;
    }
    
    // Update summary
    await reviewRef.update({
      count: count,
      average: parseFloat((totalRating / count).toFixed(1))
    });
    
    // Reset form
    closeReviewModal();
    document.getElementById('voucherInput').value = '';
    document.getElementById('commentInput').value = '';
    document.getElementById('ratingValue').value = '0';
    document.getElementById('charCount').textContent = '0';
    document.querySelectorAll('#starSelector i').forEach(s => {
      s.classList.remove('active', 'fas');
      s.classList.add('far');
    });
    
    // Reload reviews
    await loadReviews();
    showToastMsg('Thank you for your review! 🎉', 'success');
    
  } catch (error) {
    showToastMsg('Error: ' + error.message, 'error');
  }
}

// Helper toast function (fallback if BookingSystem not loaded)
function showToastMsg(message, type = 'success') {
  if (window.BookingSystem?.showToast) {
    window.BookingSystem.showToast(message, type);
    return;
  }
  
  // Fallback toast
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

// ==========================================================================
// INITIALIZATION
// ==========================================================================
window.onload = async function() {
  if (!tripPName) {
    showToastMsg('No trip specified in URL.', 'error');
    return;
  }
  
  // Setup star selector for review modal
  setupStars();
  
  // Attach review modal events
  document.getElementById('openReviewBtn')?.addEventListener('click', openReviewModal);
  document.getElementById('submitReviewBtn')?.addEventListener('click', submitReview);
  
  // Close modal on overlay click
  document.querySelector('#reviewModal .services-popup-overlay')?.addEventListener('click', closeReviewModal);
  
  // Load reviews after a short delay (to ensure trip data is loaded by BookingSystem)
  setTimeout(() => {
    if (tripPName) loadReviews();
  }, 2000);
  
  console.log('✅ Trip Display & Reviews System Ready');
};

// ==========================================================================
// EXPOSE TO GLOBAL SCOPE (for BookingSystem to call)
// ==========================================================================
window.displayTripInfo = displayTripInfo;
window.loadMediaContent = loadMediaContent;
window.loadIncludedNotIncluded = loadIncludedNotIncluded;
window.loadTimeline = loadTimeline;
window.loadWhatToBring = loadWhatToBring;
window.loadReviews = loadReviews;
window.updatePriceDisplay = function() {
  const el = document.getElementById('tourPrice');
  if (el && currentTrip.basePrice) {
    el.innerHTML = formatPriceDisplay(currentTrip.basePrice);
  }
};
