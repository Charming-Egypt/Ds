  
    // Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
      authDomain: "egypt-travels.firebaseapp.com",
      databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
      projectId: "egypt-travels",
      storageBucket: "egypt-travels.appspot.com",
      messagingSenderId: "477485386557",
      appId: "1:477485386557:web:755f9649043288db819354"
    };
    
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    // DOM Elements
    const tripList = document.getElementById('tripList');
    const tripForm = document.getElementById('tripForm');
    const editorTitle = document.getElementById('editorTitle');
    const tripIdInput = document.getElementById('tripId');
    const ownerIdInput = document.getElementById('ownerId');
    const nameInput = document.getElementById('name');
    const bookingLinkInput = document.getElementById('bookingLink');
    const priceInput = document.getElementById('price');
    const durationInput = document.getElementById('duration');
    const categoryInput = document.getElementById('category');
    const ratingInput = document.getElementById('rating');
    const mainImageInput = document.getElementById('mainImage');
    const descriptionInput = document.getElementById('description');
    const imageList = document.getElementById('imageList');
    const videoList = document.getElementById('videoList');
    const includedList = document.getElementById('includedList');
    const notIncludedList = document.getElementById('notIncludedList');
    const timelineList = document.getElementById('timelineList');
    const whatToBringList = document.getElementById('whatToBringList');
    const tourTypeList = document.getElementById('tourTypeList');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const newTripBtn = document.getElementById('newTripBtn');
    const mobileNewTripBtn = document.getElementById('mobileNewTripBtn');
    const emptyStateNewTripBtn = document.getElementById('emptyStateNewTripBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const spinner = document.getElementById('spinner');
    const tripListTab = document.getElementById('tripListTab');
    const tripEditorTab = document.getElementById('tripEditorTab');
    const analyticsTab = document.getElementById('analyticsTab');
    const tripListSection = document.getElementById('tripListSection');
    const tripEditorSection = document.getElementById('tripEditorSection');
    const totalTripsEl = document.getElementById('totalTrips');
    const topRatedEl = document.getElementById('topRated');
    const pendingTripsEl = document.getElementById('pendingTrips');
    const userRoleEl = document.getElementById('userRole');
    const userEmailEl = document.getElementById('userEmail');
    const addImageBtn = document.getElementById('addImageBtn');
    const addVideoBtn = document.getElementById('addVideoBtn');
    const addIncludedBtn = document.getElementById('addIncludedBtn');
    const addNotIncludedBtn = document.getElementById('addNotIncludedBtn');
    const addTimelineBtn = document.getElementById('addTimelineBtn');
    const addWhatToBringBtn = document.getElementById('addWhatToBringBtn');
    const addTourTypeBtn = document.getElementById('addTourTypeBtn');
    const mediaButtons = document.getElementById('mediaButtons');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');

    // Current User
    let currentUser = null;
    let currentUserRole = null;
    let allTrips = {};

    // Show Toast Notification
    function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <div class="flex items-center">
          <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-2"></i>
          <span>${message}</span>
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    // Show Loading Spinner
    function showLoading() {
      spinner.classList.remove('hidden');
      saveBtn.disabled = true;
    }

    // Hide Loading Spinner
    function hideLoading() {
      spinner.classList.add('hidden');
      saveBtn.disabled = false;
    }

    // Reset Form
    function resetForm() {
      tripForm.reset();
      tripIdInput.value = '';
      ownerIdInput.value = '';
      bookingLinkInput.value = '';
      editorTitle.textContent = 'Create New Trip';
      deleteBtn.classList.add('hidden');
      
      // Clear all dynamic lists
      imageList.innerHTML = '';
      videoList.innerHTML = '';
      includedList.innerHTML = '';
      notIncludedList.innerHTML = '';
      timelineList.innerHTML = '';
      whatToBringList.innerHTML = '';
      tourTypeList.innerHTML = '';
    }

    // Show list section
    function showListSection() {
      tripListSection.classList.remove('hidden');
      tripEditorSection.classList.add('hidden');
      tripListTab.classList.add('tab-active');
      tripEditorTab.classList.remove('tab-active');
      analyticsTab.classList.remove('tab-active');
    }

    // Show editor section
    function showEditorSection() {
      tripListSection.classList.add('hidden');
      tripEditorSection.classList.remove('hidden');
      tripListTab.classList.remove('tab-active');
      tripEditorTab.classList.add('tab-active');
      analyticsTab.classList.remove('tab-active');
    }

    // Create Array Input Field
    function createArrayInput(container, placeholder, value = '') {
      const div = document.createElement('div');
      div.className = 'array-item';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      input.placeholder = placeholder;
      input.value = value;
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-item';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => div.remove());
      
      div.appendChild(input);
      div.appendChild(removeBtn);
      container.appendChild(div);
      
      return input;
    }

    // Create Timeline Input Fields
    function createTimelineInput(container, timelineItem = { time: '', title: '', description: '' }) {
      const div = document.createElement('div');
      div.className = 'array-item';
      
      const timeInput = document.createElement('input');
      timeInput.type = 'text';
      timeInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      timeInput.placeholder = 'Time (e.g., 09:00 AM)';
      timeInput.value = timelineItem.time || '';
      
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      titleInput.placeholder = 'Title';
      titleInput.value = timelineItem.title || '';
      
      const descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      descInput.placeholder = 'Description';
      descInput.value = timelineItem.description || '';
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-item';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => div.remove());
      
      div.appendChild(timeInput);
      div.appendChild(titleInput);
      div.appendChild(descInput);
      div.appendChild(removeBtn);
      container.appendChild(div);
      
      return { timeInput, titleInput, descInput };
    }

    // Create Tour Type Input Fields
    function createTourTypeInput(container, key = '', value = '') {
      const div = document.createElement('div');
      div.className = 'array-item grid grid-cols-5 gap-2 items-center';
      
      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.className = 'col-span-3 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      keyInput.placeholder = 'Service Name';
      keyInput.value = key || '';
      
      const valueInput = document.createElement('input');
      valueInput.type = 'number';
      valueInput.className = 'col-span-1 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      valueInput.placeholder = 'Price';
      valueInput.value = value || '';
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-item';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => div.remove());
      
      div.appendChild(keyInput);
      div.appendChild(valueInput);
      div.appendChild(removeBtn);
      container.appendChild(div);
      
      return { keyInput, valueInput };
    }

    // Filter and sort trips
    function filterAndSortTrips(trips) {
      // Filter by search term
      const searchTerm = searchInput.value.toLowerCase();
      if (searchTerm) {
  trips = trips.filter(t => 
    t.name.toLowerCase().includes(searchTerm) || 
    (t.description && t.description.toLowerCase().includes(searchTerm))
  );
}
      
      // Filter by category
      const category = categoryFilter.value;
      if (category) {
        trips = trips.filter(t => t.category === category);
      }
      
      // Sort
      const sortBy = sortFilter.value;
      switch (sortBy) {
        case 'priceLow':
          trips.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case 'priceHigh':
          trips.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case 'rating':
          trips.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
          break;
        case 'newest':
        default:
          trips.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
          break;
      }
      
      return trips;
    }

    // Update dashboard stats
function updateDashboardStats() {
  const trips = Object.values(allTrips).filter(t => t.owner === currentUser?.uid);
  totalTripsEl.textContent = trips.length;
  topRatedEl.textContent = trips.filter(t => t.rating >= 4).length;
  pendingTripsEl.textContent = trips.filter(t => t.approved === 'false').length;
}

    // Check if user can edit trips
    function canEditTrips() {
      return currentUserRole === 'admin' || currentUserRole === 'moderator';
    }

    // Check if user can edit specific trip
    function canEditTrip(tripOwnerId) {
      return currentUserRole === 'admin' || (currentUserRole === 'moderator' && tripOwnerId === currentUser.uid);
    }

    // Load User Role
    function loadUserRole(userId) {
      return database.ref('egy_user/' + userId).once('value').then(snapshot => {
        const userData = snapshot.val();
        currentUserRole = userData?.role || 'user';
        userRoleEl.textContent = currentUserRole;
        userRoleEl.className = 'role-badge ' + (
          currentUserRole === 'admin' ? 'role-admin' : 
          currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
        );
        userEmailEl.textContent = currentUser.email;
        
        // Show/hide new trip button based on role
        if (canEditTrips()) {
          newTripBtn.classList.remove('hidden');
          mobileNewTripBtn.classList.remove('hidden');
          emptyStateNewTripBtn.classList.remove('hidden');
        }
      });
    }

    // Load Trip List
    function loadTripList() {
      database.ref('trips').once('value').then(snapshot => {
        allTrips = snapshot.val() || {};
        tripList.innerHTML = '';
        
        // Filter trips to only show those owned by current moderator
        let tripsArray = Object.entries(allTrips)
          .filter(([_, trip]) => trip.owner === currentUser?.uid)
          .map(([id, trip]) => ({ id, ...trip }));
        
        // Apply filters and sorting
        tripsArray = filterAndSortTrips(tripsArray);
        
        if (tripsArray.length === 0) {
          emptyState.classList.remove('hidden');
          return;
        } else {
          emptyState.classList.add('hidden');
        }
        
        tripsArray.forEach(({ id, ...trip }) => {
          const canEdit = canEditTrip(trip.owner);
          const card = document.createElement('div');
          card.className = `trip-card glass-card rounded-xl overflow-hidden ${!canEdit ? 'opacity-80' : ''}`;
          
          // Rating stars
          let stars = '';
          const rating = trip.rating || 0;
          for (let i = 1; i <= 5; i++) {
            stars += i <= rating ? '<span class="rating-star">★</span>' : '<span class="empty-star">★</span>';
          }
          
          // Action buttons (only for users who can edit trips)
          const actionButtons = canEditTrips() ? `
            <div class="flex justify-end mt-4 space-x-2">
              <button class="text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-full edit-btn" data-id="${id}" ${!canEdit ? 'disabled' : ''}>
                <i class="fas fa-edit mr-1"></i> Edit
              </button>
              <button class="text-xs bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-slate-700 px-3 py-1.5 rounded-full delete-btn" data-id="${id}" ${!canEdit ? 'disabled' : ''}>
                <i class="fas fa-trash mr-1"></i> Delete
              </button>
            </div>
          ` : '';
          
          card.innerHTML = `
            <div class="h-48 bg-slate-200 relative overflow-hidden">
              ${trip.image ? `<img class="h-full w-full object-cover" src="${trip.image}" alt="${trip.name}" loading="lazy">` : ''}
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 class="font-bold text-white">${trip.name}</h3>
                <div class="flex items-center mt-1">
                  ${stars}
                  <span class="text-xs text-white/80 ml-1">(${rating})</span>
                </div>
              </div>
            </div>
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center text-sm text-slate-500">
                  <i class="fas fa-clock mr-1"></i>
                  <span>${trip.duration}</span>
                </div>
                <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">${trip.category}</span>
              </div>
              
              <div class="mt-2 flex items-center justify-between">
                <div class="text-lg font-bold text-slate-800">${trip.price} EGP</div>
                ${trip.owner === currentUser?.uid ? '<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Your Trip</span>' : ''}
              </div>
              
              ${actionButtons}
            </div>
          `;
          
          // Add event listeners for edit/delete if user can edit trips
          if (canEditTrips()) {
            const editBtn = card.querySelector('.edit-btn');
            const deleteBtn = card.querySelector('.delete-btn');
            
            if (editBtn && !editBtn.disabled) {
              editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadTripForEditing(id, trip);
                showEditorSection();
              });
            }
            
            if (deleteBtn && !deleteBtn.disabled) {
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${trip.name}"?`)) {
                  deleteTrip(id);
                }
              });
            }
          }
          
          tripList.appendChild(card);
        });
        
        updateDashboardStats();
      }).catch(error => {
        showToast('Failed to load trips: ' + error.message, 'error');
      });
    }

    // Load Trip for Editing
    function loadTripForEditing(tripId, tripData) {
      resetForm();
      
      // Check if user can edit this trip
      if (!canEditTrip(tripData.owner)) {
        showToast('You do not have permission to edit this trip', 'error');
        showListSection();
        return;
      }
      
      // Set basic info
      tripIdInput.value = tripId;
      ownerIdInput.value = tripData.owner || currentUser.uid;
      nameInput.value = tripData.name || '';
      bookingLinkInput.value = tripId || '';
      priceInput.value = tripData.price || '';
      durationInput.value = tripData.duration || '';
      categoryInput.value = tripData.category || '';
      ratingInput.value = tripData.rating || '';
      mainImageInput.value = tripData.image || '';
      descriptionInput.value = tripData.description || '';
      editorTitle.textContent = `Edit ${tripData.name}`;
      deleteBtn.classList.remove('hidden');
      
      // Load media
      if (tripData.media?.images) {
        tripData.media.images.forEach(imageUrl => {
          createArrayInput(imageList, 'Image URL', imageUrl);
        });
      }
      
      if (tripData.media?.videos) {
        tripData.media.videos.forEach(video => {
          const videoDiv = document.createElement('div');
          videoDiv.className = 'array-item';
          
          const thumbnailInput = document.createElement('input');
          thumbnailInput.type = 'text';
          thumbnailInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
          thumbnailInput.placeholder = 'Thumbnail URL';
          thumbnailInput.value = video.thumbnail || '';
          
          const videoUrlInput = document.createElement('input');
          videoUrlInput.type = 'text';
          videoUrlInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
          videoUrlInput.placeholder = 'Video URL';
          videoUrlInput.value = video.videoUrl || '';
          
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'remove-item';
          removeBtn.innerHTML = '<i class="fas fa-times"></i>';
          removeBtn.addEventListener('click', () => videoDiv.remove());
          
          videoDiv.appendChild(thumbnailInput);
          videoDiv.appendChild(videoUrlInput);
          videoDiv.appendChild(removeBtn);
          videoList.appendChild(videoDiv);
        });
      }
      
      // Load included/not included
      if (tripData.included) {
        tripData.included.forEach(item => {
          createArrayInput(includedList, 'Included item', item);
        });
      }
      
      if (tripData.notIncluded) {
        tripData.notIncluded.forEach(item => {
          createArrayInput(notIncludedList, 'Not included item', item);
        });
      }
      
      // Load timeline
      if (tripData.timeline) {
        tripData.timeline.forEach(item => {
          createTimelineInput(timelineList, item);
        });
      }
      
      // Load what to bring
      if (tripData.whatToBring) {
        tripData.whatToBring.forEach(item => {
          createArrayInput(whatToBringList, 'What to bring item', item);
        });
      }
      
      // Load tour types
      if (tripData.tourtype) {
        Object.entries(tripData.tourtype).forEach(([key, value]) => {
          createTourTypeInput(tourTypeList, key, value);
        });
      }
    }

    // Save Trip
    function saveTrip(e) {
      e.preventDefault();
      
      // Check if user can edit trips
      if (!canEditTrips()) {
        showToast('You do not have permission to create or edit trips', 'error');
        return;
      }
      
      showLoading();
      
      // Validate required fields
      if (!nameInput.value || !bookingLinkInput.value || !priceInput.value || 
          !durationInput.value || !categoryInput.value || !ratingInput.value) {
        showToast('Please fill all required fields', 'error');
        hideLoading();
        return;
      }
      
      const tripId = bookingLinkInput.value.trim().toLowerCase().replace(/\s+/g, '-');
      const tripData = {
        approved: 'false',
        name: nameInput.value,
        bookingLink: tripId,
        price: parseFloat(priceInput.value),
        duration: durationInput.value,
        category: categoryInput.value,
        rating: parseFloat(ratingInput.value),
        image: mainImageInput.value,
        description: descriptionInput.value,
        owner: ownerIdInput.value || currentUser.uid,
        lastUpdated: Date.now(),
        media: {
          images: [],
          videos: []
        },
        included: [],
        notIncluded: [],
        timeline: [],
        whatToBring: [],
        tourtype: {}
      };
      
      // Get image URLs
      const imageInputs = imageList.querySelectorAll('input');
      imageInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.media.images.push(input.value.trim());
        }
      });
      
      // Get video data
      const videoDivs = videoList.querySelectorAll('.array-item');
      videoDivs.forEach(div => {
        const thumbnail = div.querySelector('input:nth-child(1)').value.trim();
        const videoUrl = div.querySelector('input:nth-child(2)').value.trim();
        
        if (thumbnail && videoUrl) {
          tripData.media.videos.push({
            thumbnail,
            videoUrl
          });
        }
      });
      
      // Get included items
      const includedInputs = includedList.querySelectorAll('input');
      includedInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.included.push(input.value.trim());
        }
      });
      
      // Get not included items
      const notIncludedInputs = notIncludedList.querySelectorAll('input');
      notIncludedInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.notIncluded.push(input.value.trim());
        }
      });
      
      // Get timeline items
      const timelineDivs = timelineList.querySelectorAll('.array-item');
      timelineDivs.forEach(div => {
        const time = div.querySelector('input:nth-child(1)').value.trim();
        const title = div.querySelector('input:nth-child(2)').value.trim();
        const description = div.querySelector('input:nth-child(3)').value.trim();
        
        if (time && title && description) {
          tripData.timeline.push({
            time,
            title,
            description
          });
        }
      });
      
      // Get what to bring items
      const whatToBringInputs = whatToBringList.querySelectorAll('input');
      whatToBringInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.whatToBring.push(input.value.trim());
        }
      });
      
      // Get tour types
      const tourTypeDivs = tourTypeList.querySelectorAll('.array-item');
      tourTypeDivs.forEach(div => {
        const key = div.querySelector('input:nth-child(1)').value.trim();
        const value = parseFloat(div.querySelector('input:nth-child(2)').value);
        
        if (key && !isNaN(value)) {
          tripData.tourtype[key] = value;
        }
      });
      
      // Check if this is an existing trip
      const isExistingTrip = tripIdInput.value && tripIdInput.value !== '';
      
      if (isExistingTrip) {
        // For existing trips, we need to verify ownership before updating
        database.ref('trips/' + tripId).once('value').then(snapshot => {
          const existingTrip = snapshot.val();
          
          if (!existingTrip) {
            showToast('Trip not found', 'error');
            hideLoading();
            return;
          }
          
          if (!canEditTrip(existingTrip.owner)) {
            showToast('You do not have permission to edit this trip', 'error');
            hideLoading();
            return;
          }
          
          // Only update changed fields to minimize write operations
          const updates = {};
          Object.keys(tripData).forEach(key => {
            if (JSON.stringify(tripData[key]) !== JSON.stringify(existingTrip[key])) {
              updates[key] = tripData[key];
            }
          });
          
          if (Object.keys(updates).length === 0) {
            showToast('No changes detected', 'warning');
            hideLoading();
            return;
          }
          
          // Add lastUpdated to updates
          updates.lastUpdated = Date.now();
          
          // Perform the update
          database.ref('trips/' + tripId).update(updates)
            .then(() => {
              showToast('Trip updated successfully!');
              loadTripList();
              resetForm();
              showListSection();
            })
            .catch(error => {
              showToast('Failed to update trip: ' + error.message, 'error');
            })
            .finally(() => {
              hideLoading();
            });
        });
      } else {
        // For new trips, just create them
        database.ref('trips/' + tripId).set(tripData)
          .then(() => {
            showToast('Trip created successfully!');
            loadTripList();
            resetForm();
            showListSection();
          })
          .catch(error => {
            showToast('Failed to create trip: ' + error.message, 'error');
          })
          .finally(() => {
            hideLoading();
          });
      }
    }

    // Delete Trip
    function deleteTrip(tripId) {
      if (!tripId) return;
      
      // Check if user can edit trips
      if (!canEditTrips()) {
        showToast('You do not have permission to delete trips', 'error');
        return;
      }
      
      showLoading();
      
      // First verify ownership
      database.ref('trips/' + tripId).once('value').then(snapshot => {
        const tripData = snapshot.val();
        
        if (!tripData) {
          showToast('Trip not found', 'error');
          hideLoading();
          return;
        }
        
        if (!canEditTrip(tripData.owner)) {
          showToast('You do not have permission to delete this trip', 'error');
          hideLoading();
          return;
        }
        
        // Delete the trip
        database.ref('trips/' + tripId).remove()
          .then(() => {
            showToast('Trip deleted successfully!');
            loadTripList();
            if (tripIdInput.value === tripId) {
              resetForm();
              showListSection();
            }
          })
          .catch(error => {
            showToast('Failed to delete trip: ' + error.message, 'error');
          })
          .finally(() => {
            hideLoading();
          });
      });
    }

    // Initialize Event Listeners
    function initEventListeners() {
      // Form submission (only if user can edit)
      if (canEditTrips()) {
        tripForm.addEventListener('submit', saveTrip);
        
        // Add buttons for dynamic fields
        addImageBtn.addEventListener('click', () => createArrayInput(imageList, 'Image URL'));
        addVideoBtn.addEventListener('click', () => {
          const videoDiv = document.createElement('div');
          videoDiv.className = 'array-item';
          
          const thumbnailInput = document.createElement('input');
          thumbnailInput.type = 'text';
          thumbnailInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
          thumbnailInput.placeholder = 'Thumbnail URL';
          
          const videoUrlInput = document.createElement('input');
          videoUrlInput.type = 'text';
          videoUrlInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
          videoUrlInput.placeholder = 'Video URL';
          
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'remove-item';
          removeBtn.innerHTML = '<i class="fas fa-times"></i>';
          removeBtn.addEventListener('click', () => videoDiv.remove());
          
          videoDiv.appendChild(thumbnailInput);
          videoDiv.appendChild(videoUrlInput);
          videoDiv.appendChild(removeBtn);
          videoList.appendChild(videoDiv);
        });
        
        addIncludedBtn.addEventListener('click', () => createArrayInput(includedList, 'Included item'));
        addNotIncludedBtn.addEventListener('click', () => createArrayInput(notIncludedList, 'Not included item'));
        addTimelineBtn.addEventListener('click', () => createTimelineInput(timelineList));
        addWhatToBringBtn.addEventListener('click', () => createArrayInput(whatToBringList, 'What to bring item'));
        addTourTypeBtn.addEventListener('click', () => createTourTypeInput(tourTypeList));
        
        // New trip buttons
        newTripBtn.addEventListener('click', () => {
          resetForm();
          showEditorSection();
        });
        
        mobileNewTripBtn.addEventListener('click', () => {
          resetForm();
          showEditorSection();
        });
        
        emptyStateNewTripBtn.addEventListener('click', () => {
          resetForm();
          showEditorSection();
        });
      }
      
      // Common event listeners
      cancelBtn.addEventListener('click', showListSection);
      logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
          window.location.href = '/p/login.html';
        });
      });
      
      // Tab switching
      tripListTab.addEventListener('click', showListSection);
      tripEditorTab.addEventListener('click', showEditorSection);
      
      // Filter event listeners
      searchInput.addEventListener('input', loadTripList);
      categoryFilter.addEventListener('change', loadTripList);
      sortFilter.addEventListener('change', loadTripList);
    }

    // Initialize App
    function initApp() {
      auth.onAuthStateChanged(user => {
        if (user) {
          currentUser = user;
          loadUserRole(user.uid).then(() => {
            loadTripList();
            initEventListeners();
          });
        } else {
          window.location.href = 'login.html';
        }
      });
    }

    // Start the app
    initApp();
  
