
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

    // Get trip name from URL parameter
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
          // Load dynamic content
          loadMediaContent(currentTrip.media);
          loadIncludedNotIncluded(currentTrip);
          loadTimeline(currentTrip.timeline);
          loadWhatToBring(currentTrip.whatToBring);
          updateRating(currentTrip.rating);
          // Update price display
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
      // Add image slides
      if (mediaData.images && mediaData.images.length > 0) {
        mediaData.images.forEach((imageUrl, index) => {
          // Add main slide
          const slide = document.createElement('div');
          slide.className = 'swiper-slide';
          // First slide gets special treatment (price tag and title)
          if (index === 0) {
            slide.innerHTML = `
              <img src="${imageUrl}" alt="${currentTrip.name}">
              <div class="price-tag">$${currentTrip.price}</div>
              <div class="tour-title-overlay">
                <h1>${currentTrip.name}</h1>
                <div class="tour-meta">
                  <span class="tour-meta-item">
                    <i class="fas fa-star"></i> ${currentTrip.rating?.average?.toFixed(1) || '4.9'}
                  </span>
                  <span class="tour-meta-item">
                    <i class="fas fa-clock"></i> Full day
                  </span>
                  <span class="tour-meta-item">
                    <i class="fas fa-user-group"></i> Max 10
                  </span>
                </div>
              </div>
            `;
          } else {
            slide.innerHTML = `
              <img src="${imageUrl}" alt="${currentTrip.name}">
              <div class="tour-title-overlay">
                <h1>${currentTrip.name}</h1>
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
            <img src="${video.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
            <div class="play-button">
              <i class="fas fa-play"></i>
            </div>
            <div class="tour-title-overlay">
              <h1>${currentTrip.name}</h1>
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
                    <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
                    <div class="play-button">
                      <i class="fas fa-play"></i>
                    </div>
                    <div class="tour-title-overlay">
                      <h1>${currentTrip.name}</h1>
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
            <img src="${currentVideoSlide.dataset.thumbnail}" alt="${currentTrip.name} video" class="video-thumbnail">
            <div class="play-button">
              <i class="fas fa-play"></i>
            </div>
            <div class="tour-title-overlay">
              <h1>${currentTrip.name}</h1>
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
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/ ${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            <div class="tour-title-overlay">
              <h1>${currentTrip.name}</h1>
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
          <div class="tour-title-overlay">
            <h1>${currentTrip.name}</h1>
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
          itemElement.innerHTML = `
            <i class="fas fa-check" style="color: #4CAF50;"></i>
            <span>${item}</span>
          `;
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
          itemElement.innerHTML = `
            <i class="fas fa-times" style="color: #F44336;"></i>
            <span>${item}</span>
          `;
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
          </div>
        `;
        // Add time if available
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
        li.innerHTML = `
          <i class="fas fa-check" style="color: #f59e0b;"></i> ${item}
        `;
        whatToBringList.appendChild(li);
      });
    }

    function populateTripTypeDropdown(tourTypes) {
      const tripTypeSelect = document.getElementById('tripType');
      if (!tripTypeSelect) {
        console.error("Trip type select element not found");
        return;
      }
      tripTypeSelect.innerHTML = '';
      // Add default "No extra services" option
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
      if (tripTitle && tripInfo.name) {
        tripTitle.textContent = tripInfo.name;
      }
      if (tripName) {
        tripName.value = tripPName;
      }
    }
