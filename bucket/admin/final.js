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
const elements = {
  tripList: document.getElementById('tripList'),
  tripForm: document.getElementById('tripForm'),
  editorTitle: document.getElementById('editorTitle'),
  tripId: document.getElementById('tripId'),
  ownerId: document.getElementById('ownerId'),
  name: document.getElementById('name'),
  bookingLink: document.getElementById('bookingLink'),
  price: document.getElementById('price'),
  duration: document.getElementById('duration'),
  category: document.getElementById('category'),
  rating: document.getElementById('rating'),
  mainImage: document.getElementById('mainImage'),
  description: document.getElementById('description'),
  imageList: document.getElementById('imageList'),
  videoList: document.getElementById('videoList'),
  includedList: document.getElementById('includedList'),
  notIncludedList: document.getElementById('notIncludedList'),
  timelineList: document.getElementById('timelineList'),
  whatToBringList: document.getElementById('whatToBringList'),
  tourTypeList: document.getElementById('tourTypeList'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  newTripBtn: document.getElementById('newTripBtn'),
  emptyStateNewTripBtn: document.getElementById('emptyStateNewTripBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  spinner: document.getElementById('spinner'),
  tripListTab: document.getElementById('tripListTab'),
  tripEditorTab: document.getElementById('tripEditorTab'),
  tripListSection: document.getElementById('tripListSection'),
  tripEditorSection: document.getElementById('tripEditorSection'),
  totalTrips: document.getElementById('totalTrips'),
  topRated: document.getElementById('topRated'),
  pendingTrips: document.getElementById('pendingTrips'),
  userRole: document.getElementById('userRole'),
  userEmail: document.getElementById('userEmail'),
  addImageBtn: document.getElementById('addImageBtn'),
  addVideoBtn: document.getElementById('addVideoBtn'),
  addIncludedBtn: document.getElementById('addIncludedBtn'),
  addNotIncludedBtn: document.getElementById('addNotIncludedBtn'),
  addTimelineBtn: document.getElementById('addTimelineBtn'),
  addWhatToBringBtn: document.getElementById('addWhatToBringBtn'),
  addTourTypeBtn: document.getElementById('addTourTypeBtn'),
  emptyState: document.getElementById('emptyState')
};

// App State
const state = {
  currentUser: null,
  currentUserRole: null,
  allTrips: {},
  currentPage: 1,
  tripsPerPage: 10,
  tripsCache: null,
  lastFetchTime: 0
};

// Utility Functions
const utils = {
  showToast: (message, type = 'success') => {
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
  },

  showLoading: () => {
    elements.spinner.classList.remove('hidden');
    elements.saveBtn.disabled = true;
  },

  hideLoading: () => {
    elements.spinner.classList.add('hidden');
    elements.saveBtn.disabled = false;
  },

  sanitizeInput: (input) => {
    return input.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  validateTripData: (data) => {
    const errors = [];
    if (!data.name || data.name.length < 5) errors.push('Name must be at least 5 characters');
    if (isNaN(data.price) || data.price <= 0) errors.push('Price must be a positive number');
    if (!data.duration) errors.push('Duration is required');
    if (!data.category) errors.push('Category is required');
    if (!data.rating || data.rating < 1 || data.rating > 5) errors.push('Rating must be between 1-5');
    if (!data.image) errors.push('Main image is required');
    return errors.length ? errors : null;
  }
};

// Trip Management Functions
const tripManager = {
  resetForm: () => {
    elements.tripForm.reset();
    elements.tripId.value = '';
    elements.ownerId.value = '';
    elements.bookingLink.value = '';
    elements.editorTitle.textContent = 'Create New Trip';
    elements.deleteBtn.classList.add('hidden');
    
    // Clear all dynamic lists
    elements.imageList.innerHTML = '';
    elements.videoList.innerHTML = '';
    elements.includedList.innerHTML = '';
    elements.notIncludedList.innerHTML = '';
    elements.timelineList.innerHTML = '';
    elements.whatToBringList.innerHTML = '';
    elements.tourTypeList.innerHTML = '';
  },

  showListSection: () => {
    elements.tripListSection.classList.remove('hidden');
    elements.tripEditorSection.classList.add('hidden');
    elements.tripListTab.classList.add('tab-active');
    elements.tripEditorTab.classList.remove('tab-active');
  },

  showEditorSection: () => {
    elements.tripListSection.classList.add('hidden');
    elements.tripEditorSection.classList.remove('hidden');
    elements.tripListTab.classList.remove('tab-active');
    elements.tripEditorTab.classList.add('tab-active');
  },

  createArrayInput: (container, placeholder, value = '') => {
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
  },

  createTimelineInput: (container, timelineItem = { time: '', title: '', description: '' }) => {
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
  },

  createTourTypeInput: (container, key = '', value = '') => {
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
  },

  updateDashboardStats: () => {
  const trips = Object.values(state.allTrips).filter(t => t.owner === state.currentUser?.uid);
  const approvedTrips = trips.filter(t => t.approved === true || t.approved === 'true');
  const pendingTrips = trips.filter(t => !t.approved || t.approved === 'false');
  
  elements.totalTrips.textContent = approvedTrips.length;
  elements.topRated.textContent = approvedTrips.filter(t => t.rating >= 4).length;
  elements.pendingTrips.textContent = pendingTrips.length;
},

  canEditTrips: () => {
    return state.currentUserRole === 'admin' || state.currentUserRole === 'moderator';
  },

  canEditTrip: (tripOwnerId) => {
    return state.currentUserRole === 'admin' || (state.currentUserRole === 'moderator' && tripOwnerId === state.currentUser.uid);
  },

  loadUserRole: (userId) => {
    return database.ref('egy_user/' + userId).once('value').then(snapshot => {
      const userData = snapshot.val();
      state.currentUserRole = userData?.role || 'user';
      elements.userRole.textContent = state.currentUserRole;
      elements.userRole.className = 'role-badge ' + (
        state.currentUserRole === 'admin' ? 'role-admin' : 
        state.currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
      );
      elements.userEmail.textContent = state.currentUser.email;
      
      // Show/hide new trip button based on role
      if (tripManager.canEditTrips()) {
        elements.newTripBtn.classList.remove('hidden');
        elements.emptyStateNewTripBtn.classList.remove('hidden');
      }
    });
  },

  loadTripList: (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh && state.tripsCache && Date.now() - state.lastFetchTime < 300000) {
      tripManager.renderTrips(state.tripsCache);
      return;
    }

    database.ref('trips').once('value').then(snapshot => {
      state.allTrips = snapshot.val() || {};
      state.tripsCache = Object.values(state.allTrips);
      state.lastFetchTime = Date.now();
      
      // Filter trips to only show those owned by current moderator
      let tripsArray = Object.entries(state.allTrips)
        .filter(([_, trip]) => trip.owner === state.currentUser?.uid)
        .map(([id, trip]) => ({ id, ...trip }));
      
      if (tripsArray.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
      } else {
        elements.emptyState.classList.add('hidden');
      }
      
      tripManager.renderTrips(tripsArray);
      tripManager.updateDashboardStats();
    }).catch(error => {
      utils.showToast('Failed to load trips: ' + error.message, 'error');
    });
  },

  renderTrips: (trips) => {
    elements.tripList.innerHTML = '';
    
    trips.forEach(({ id, ...trip }) => {
      const canEdit = tripManager.canEditTrip(trip.owner);
      const card = document.createElement('div');
      card.className = `trip-card glass-card rounded-xl overflow-hidden ${!canEdit ? 'opacity-80' : ''}`;
      
      // Rating stars
      let stars = '';
      const rating = trip.rating || 0;
      for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '<span class="rating-star">★</span>' : '<span class="empty-star">★</span>';
      }
      
      // Action buttons (only for users who can edit trips)
      const actionButtons = tripManager.canEditTrips() ? `
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
            ${trip.owner === state.currentUser?.uid ? 
  `<span class="text-xs ${trip.approved === true || trip.approved === 'true' ? 
    'bg-emerald-100 text-emerald-800' : 
    'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded-full">
    ${trip.approved === true || trip.approved === 'true' ? 'Active' : 'Pending'}
  </span>` : ''}
              </div>
          
          ${actionButtons}
        </div>
      `;
      
      // Add event listeners for edit/delete if user can edit trips
      if (tripManager.canEditTrips()) {
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (editBtn && !editBtn.disabled) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tripManager.loadTripForEditing(id, trip);
            tripManager.showEditorSection();
          });
        }
        
        if (deleteBtn && !deleteBtn.disabled) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${trip.name}"?`)) {
              tripManager.deleteTrip(id);
            }
          });
        }
      }
      
      elements.tripList.appendChild(card);
    });
  },

  loadTripForEditing: (tripId, tripData) => {
    tripManager.resetForm();
    
    // Check if user can edit this trip
    if (!tripManager.canEditTrip(tripData.owner)) {
      utils.showToast('You do not have permission to edit this trip', 'error');
      tripManager.showListSection();
      return;
    }
    
    // Set basic info
    elements.tripId.value = tripId;
    elements.ownerId.value = tripData.owner || state.currentUser.uid;
    elements.name.value = tripData.name || '';
    elements.bookingLink.value = tripId || '';
    elements.price.value = tripData.price || '';
    elements.duration.value = tripData.duration || '';
    elements.category.value = tripData.category || '';
    elements.rating.value = tripData.rating || '';
    elements.mainImage.value = tripData.image || '';
    elements.description.value = tripData.description || '';
    elements.editorTitle.textContent = `Edit ${tripData.name}`;
    elements.deleteBtn.classList.remove('hidden');
    
    // Load media
    if (tripData.media?.images) {
      tripData.media.images.forEach(imageUrl => {
        tripManager.createArrayInput(elements.imageList, 'Image URL', imageUrl);
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
        elements.videoList.appendChild(videoDiv);
      });
    }
    
    // Load included/not included
    if (tripData.included) {
      tripData.included.forEach(item => {
        tripManager.createArrayInput(elements.includedList, 'Included item', item);
      });
    }
    
    if (tripData.notIncluded) {
      tripData.notIncluded.forEach(item => {
        tripManager.createArrayInput(elements.notIncludedList, 'Not included item', item);
      });
    }
    
    // Load timeline
    if (tripData.timeline) {
      tripData.timeline.forEach(item => {
        tripManager.createTimelineInput(elements.timelineList, item);
      });
    }
    
    // Load what to bring
    if (tripData.whatToBring) {
      tripData.whatToBring.forEach(item => {
        tripManager.createArrayInput(elements.whatToBringList, 'What to bring item', item);
      });
    }
    
    // Load tour types
    if (tripData.tourtype) {
      Object.entries(tripData.tourtype).forEach(([key, value]) => {
        tripManager.createTourTypeInput(elements.tourTypeList, key, value);
      });
    }
  },

  saveTrip: (e) => {
    e.preventDefault();
    
    // Check if user can edit trips
    if (!tripManager.canEditTrips()) {
      utils.showToast('You do not have permission to create or edit trips', 'error');
      return;
    }
    
    utils.showLoading();
    
    // Sanitize inputs
    const sanitizedData = {
      name: utils.sanitizeInput(elements.name.value),
      bookingLink: utils.sanitizeInput(elements.bookingLink.value),
      price: parseFloat(utils.sanitizeInput(elements.price.value)),
      duration: utils.sanitizeInput(elements.duration.value),
      category: utils.sanitizeInput(elements.category.value),
      rating: parseFloat(utils.sanitizeInput(elements.rating.value)),
      image: utils.sanitizeInput(elements.mainImage.value),
      description: utils.sanitizeInput(elements.description.value)
    };
    
    // Validate data
    const validationErrors = utils.validateTripData(sanitizedData);
    if (validationErrors) {
      utils.showToast(validationErrors.join(', '), 'error');
      utils.hideLoading();
      return;
    }
    
    const tripId = sanitizedData.bookingLink.trim().toLowerCase().replace(/\s+/g, '-');
    const tripData = {
      approved: 'false',
      ...sanitizedData,
      owner: elements.ownerId.value || state.currentUser.uid,
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
    const imageInputs = elements.imageList.querySelectorAll('input');
    imageInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.media.images.push(utils.sanitizeInput(input.value));
      }
    });
    
    // Get video data
    const videoDivs = elements.videoList.querySelectorAll('.array-item');
    videoDivs.forEach(div => {
      const thumbnail = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const videoUrl = utils.sanitizeInput(div.querySelector('input:nth-child(2)').value);
      
      if (thumbnail && videoUrl) {
        tripData.media.videos.push({
          thumbnail,
          videoUrl
        });
      }
    });
    
    // Get included items
    const includedInputs = elements.includedList.querySelectorAll('input');
    includedInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.included.push(utils.sanitizeInput(input.value));
      }
    });
    
    // Get not included items
    const notIncludedInputs = elements.notIncludedList.querySelectorAll('input');
    notIncludedInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.notIncluded.push(utils.sanitizeInput(input.value));
      }
    });
    
    // Get timeline items
    const timelineDivs = elements.timelineList.querySelectorAll('.array-item');
    timelineDivs.forEach(div => {
      const time = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const title = utils.sanitizeInput(div.querySelector('input:nth-child(2)').value);
      const description = utils.sanitizeInput(div.querySelector('input:nth-child(3)').value);
      
      if (time && title && description) {
        tripData.timeline.push({
          time,
          title,
          description
        });
      }
    });
    
    // Get what to bring items
    const whatToBringInputs = elements.whatToBringList.querySelectorAll('input');
    whatToBringInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.whatToBring.push(utils.sanitizeInput(input.value));
      }
    });
    
    // Get tour types
    const tourTypeDivs = elements.tourTypeList.querySelectorAll('.array-item');
    tourTypeDivs.forEach(div => {
      const key = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const value = parseFloat(utils.sanitizeInput(div.querySelector('input:nth-child(2)').value));
      
      if (key && !isNaN(value)) {
        tripData.tourtype[key] = value;
      }
    });
    
    // Check if this is an existing trip
    const isExistingTrip = elements.tripId.value && elements.tripId.value !== '';
    
    if (isExistingTrip) {
      // For existing trips, we need to verify ownership before updating
      database.ref('trips/' + tripId).once('value').then(snapshot => {
        const existingTrip = snapshot.val();
        
        if (!existingTrip) {
          utils.showToast('Trip not found', 'error');
          utils.hideLoading();
          return;
        }
        
        if (!tripManager.canEditTrip(existingTrip.owner)) {
          utils.showToast('You do not have permission to edit this trip', 'error');
          utils.hideLoading();
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
          utils.showToast('No changes detected', 'warning');
          utils.hideLoading();
          return;
        }
        
        // Add lastUpdated to updates
        updates.lastUpdated = Date.now();
        
        // Perform the update
        database.ref('trips/' + tripId).update(updates)
          .then(() => {
            utils.showToast('Trip updated successfully!');
            tripManager.loadTripList(true); // Force refresh
            tripManager.resetForm();
            tripManager.showListSection();
          })
          .catch(error => {
            utils.showToast('Failed to update trip: ' + error.message, 'error');
          })
          .finally(() => {
            utils.hideLoading();
          });
      });
    } else {
      // For new trips, just create them
      database.ref('trips/' + tripId).set(tripData)
        .then(() => {
          utils.showToast('Trip created successfully!');
          tripManager.loadTripList(true); // Force refresh
          tripManager.resetForm();
          tripManager.showListSection();
        })
        .catch(error => {
          utils.showToast('Failed to create trip: ' + error.message, 'error');
        })
        .finally(() => {
          utils.hideLoading();
        });
    }
  },

  deleteTrip: (tripId) => {
    if (!tripId) return;
    
    // Check if user can edit trips
    if (!tripManager.canEditTrips()) {
      utils.showToast('You do not have permission to delete trips', 'error');
      return;
    }
    
    utils.showLoading();
    
    // First verify ownership
    database.ref('trips/' + tripId).once('value').then(snapshot => {
      const tripData = snapshot.val();
      
      if (!tripData) {
        utils.showToast('Trip not found', 'error');
        utils.hideLoading();
        return;
      }
      
      if (!tripManager.canEditTrip(tripData.owner)) {
        utils.showToast('You do not have permission to delete this trip', 'error');
        utils.hideLoading();
        return;
      }
      
      // Delete the trip
      database.ref('trips/' + tripId).remove()
        .then(() => {
          utils.showToast('Trip deleted successfully!');
          tripManager.loadTripList(true); // Force refresh
          if (elements.tripId.value === tripId) {
            tripManager.resetForm();
            tripManager.showListSection();
          }
        })
        .catch(error => {
          utils.showToast('Failed to delete trip: ' + error.message, 'error');
        })
        .finally(() => {
          utils.hideLoading();
        });
    });
  }
};

// Event Listeners
const setupEventListeners = () => {
  // Form submission (only if user can edit)
  if (tripManager.canEditTrips()) {
    elements.tripForm.addEventListener('submit', tripManager.saveTrip);
    
    // Add buttons for dynamic fields
    elements.addImageBtn.addEventListener('click', () => tripManager.createArrayInput(elements.imageList, 'Image URL'));
    elements.addVideoBtn.addEventListener('click', () => {
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
      elements.videoList.appendChild(videoDiv);
    });
    
    elements.addIncludedBtn.addEventListener('click', () => tripManager.createArrayInput(elements.includedList, 'Included item'));
    elements.addNotIncludedBtn.addEventListener('click', () => tripManager.createArrayInput(elements.notIncludedList, 'Not included item'));
    elements.addTimelineBtn.addEventListener('click', () => tripManager.createTimelineInput(elements.timelineList));
    elements.addWhatToBringBtn.addEventListener('click', () => tripManager.createArrayInput(elements.whatToBringList, 'What to bring item'));
    elements.addTourTypeBtn.addEventListener('click', () => tripManager.createTourTypeInput(elements.tourTypeList));
    
    // New trip buttons
    elements.newTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
    
    elements.emptyStateNewTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
  }
  
  // Common event listeners
  elements.cancelBtn.addEventListener('click', tripManager.showListSection);
  elements.logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    });
  });
  
  // Tab switching
  elements.tripListTab.addEventListener('click', tripManager.showListSection);
  
};

// Initialize App
const initApp = () => {
  // Check offline status
  firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
      utils.showToast('Working offline - changes will sync when connection resumes', 'warning');
    }
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      state.currentUser = user;
      tripManager.loadUserRole(user.uid).then(() => {
        tripManager.loadTripList();
        setupEventListeners();
      });
    } else {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    }
  });
};

// Start the app
initApp();
