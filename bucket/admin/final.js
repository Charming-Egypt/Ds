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
const storage = firebase.storage();

// DOM Elements
const elements = {
  // Trip List Section
  tripList: document.getElementById('tripList'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortFilter: document.getElementById('sortFilter'),
  emptyState: document.getElementById('emptyState'),
  paginationContainer: document.getElementById('pagination'),
  
  // Dashboard Stats
  totalTrips: document.getElementById('totalTrips'),
  pendingTrips: document.getElementById('pendingTrips'),
  topRated: document.getElementById('topRated'),
  
  // Trip Editor Elements
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
  mainImagePreview: document.getElementById('mainImagePreview'),
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
  userRole: document.getElementById('userRole'),
  userEmail: document.getElementById('userEmail'),
  addImageBtn: document.getElementById('addImageBtn'),
  addVideoBtn: document.getElementById('addVideoBtn'),
  addIncludedBtn: document.getElementById('addIncludedBtn'),
  addNotIncludedBtn: document.getElementById('addNotIncludedBtn'),
  addTimelineBtn: document.getElementById('addTimelineBtn'),
  addWhatToBringBtn: document.getElementById('addWhatToBringBtn'),
  addTourTypeBtn: document.getElementById('addTourTypeBtn'),
  imageUploadBtn: document.getElementById('imageUploadBtn'),
  mainImageUploadBtn: document.getElementById('mainImageUploadBtn')
};

// App State
const state = {
  currentUser: null,
  currentUserRole: null,
  allTrips: [],
  filteredTrips: [],
  currentPage: 1,
  tripsPerPage: 12,
  totalPages: 1,
  tripsCache: null,
  lastFetchTime: 0,
  isOnline: navigator.onLine
};

// Utility Functions
const utils = {
  showToast: (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fadeIn`;
    toast.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('animate-fadeIn');
      toast.classList.add('animate-fadeOut');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showLoading: () => {
    if (elements.spinner) elements.spinner.classList.remove('hidden');
    document.body.style.pointerEvents = 'none';
    document.body.style.cursor = 'wait';
  },

  hideLoading: () => {
    if (elements.spinner) elements.spinner.classList.add('hidden');
    document.body.style.pointerEvents = 'auto';
    document.body.style.cursor = 'default';
  },

  debounce: (func, wait) => {
    let timeout;
    return function() {
      const context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  },

  sanitizeInput: (input) => {
    if (!input) return '';
    return input.toString().trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  validateForm: (formData) => {
    const errors = [];
    if (!formData.name || formData.name.length < 3) errors.push('Name must be at least 3 characters');
    if (isNaN(formData.price) || formData.price <= 0) errors.push('Price must be a positive number');
    if (!formData.duration) errors.push('Duration is required');
    if (!formData.category) errors.push('Category is required');
    if (isNaN(formData.rating) || formData.rating < 0 || formData.rating > 5) errors.push('Rating must be between 0-5');
    if (!formData.image) errors.push('Main image is required');
    return errors.length ? errors : null;
  },

  uploadFile: async (file, path = 'images/') => {
    try {
      const storageRef = storage.ref();
      const fileRef = storageRef.child(path + file.name);
      const snapshot = await fileRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  },

  checkOnlineStatus: () => {
    state.isOnline = navigator.onLine;
    if (!state.isOnline) {
      utils.showToast('You are offline. Some features may be limited.', 'warning');
    }
    return state.isOnline;
  }
};

// Trip Management
const tripManager = {
  resetForm: () => {
    elements.tripForm.reset();
    elements.tripId.value = '';
    elements.ownerId.value = '';
    elements.bookingLink.value = '';
    elements.editorTitle.textContent = 'Create New Trip';
    elements.deleteBtn.classList.add('hidden');
    elements.mainImagePreview.src = '';
    elements.mainImagePreview.classList.add('hidden');
    
    // Clear all dynamic lists
    const lists = [
      elements.imageList, 
      elements.videoList, 
      elements.includedList,
      elements.notIncludedList,
      elements.timelineList,
      elements.whatToBringList,
      elements.tourTypeList
    ];
    
    lists.forEach(list => list.innerHTML = '');
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

  applyFilters: () => {
    let results = [...state.allTrips];
    
    // Search Filter
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      results = results.filter(trip => 
        (trip.name?.toLowerCase().includes(searchTerm)) ||
        (trip.description?.toLowerCase().includes(searchTerm)) ||
        (trip.category?.toLowerCase().includes(searchTerm))
      );
    }
    
    // Category Filter
    const category = elements.categoryFilter.value;
    if (category) {
      results = results.filter(trip => trip.category === category);
    }
    
    // Sorting
    const sortBy = elements.sortFilter.value;
    switch (sortBy) {
      case 'priceLow':
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'priceHigh':
        results.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
      default:
        results.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
        break;
    }
    
    // Update pagination
    state.totalPages = Math.ceil(results.length / state.tripsPerPage);
    state.filteredTrips = results;
    return results;
  },

  renderTrips: () => {
    const trips = tripManager.applyFilters();
    const startIdx = (state.currentPage - 1) * state.tripsPerPage;
    const paginatedTrips = trips.slice(startIdx, startIdx + state.tripsPerPage);
    
    elements.tripList.innerHTML = '';
    
    if (trips.length === 0) {
      elements.emptyState.classList.remove('hidden');
      elements.paginationContainer.classList.add('hidden');
      return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.paginationContainer.classList.remove('hidden');
    
    paginatedTrips.forEach(trip => {
      const status = trip.approved === true ? 'Approved' : 'Pending';
      const statusClass = trip.approved === true ? 
        'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
      
      const stars = Array(5).fill(0).map((_, i) => 
        i < Math.round(trip.rating || 0) ? '★' : '☆'
      ).join('');
      
      const tripCard = document.createElement('div');
      tripCard.className = 'trip-card glass-card rounded-xl overflow-hidden transition-transform hover:scale-[1.02]';
      tripCard.innerHTML = `
        <div class="h-48 bg-slate-200 relative overflow-hidden">
          ${trip.image ? `<img src="${trip.image}" alt="${trip.name}" class="h-full w-full object-cover" loading="lazy">` : ''}
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h3 class="font-bold text-white truncate">${trip.name || 'Untitled Trip'}</h3>
            <div class="flex items-center mt-1">
              <span class="text-amber-400">${stars}</span>
              <span class="text-xs text-white/80 ml-1">(${trip.rating?.toFixed(1) || '0.0'})</span>
            </div>
          </div>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center text-sm text-slate-500">
              <i class="fas fa-clock mr-1"></i>
              <span>${trip.duration || 'N/A'}</span>
            </div>
            <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
              ${trip.category || 'Uncategorized'}
            </span>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <div class="text-lg font-bold text-slate-800">${trip.price ? `${trip.price} EGP` : 'Price N/A'}</div>
            <span class="text-xs px-2 py-0.5 rounded-full ${statusClass}">${status}</span>
          </div>
          ${state.currentUserRole === 'admin' || state.currentUserRole === 'moderator' ? `
          <div class="mt-3 flex justify-end space-x-2">
            <button class="edit-btn text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full" data-id="${trip.id}">
              <i class="fas fa-edit mr-1"></i> Edit
            </button>
            <button class="delete-btn text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full" data-id="${trip.id}">
              <i class="fas fa-trash mr-1"></i> Delete
            </button>
          </div>
          ` : ''}
        </div>
      `;
      
      elements.tripList.appendChild(tripCard);
    });
    
    // Render pagination
    this.renderPagination();
  },

  renderPagination: () => {
    elements.paginationContainer.innerHTML = '';
    
    if (state.totalPages <= 1) return;
    
    const pagination = document.createElement('div');
    pagination.className = 'flex justify-center items-center space-x-2';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${state.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        tripManager.renderTrips();
      }
    });
    pagination.appendChild(prevBtn);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      const firstPageBtn = document.createElement('button');
      firstPageBtn.className = 'pagination-btn';
      firstPageBtn.textContent = '1';
      firstPageBtn.addEventListener('click', () => {
        state.currentPage = 1;
        tripManager.renderTrips();
      });
      pagination.appendChild(firstPageBtn);
      
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-2';
        ellipsis.textContent = '...';
        pagination.appendChild(ellipsis);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${i === state.currentPage ? 'bg-blue-500 text-white' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        state.currentPage = i;
        tripManager.renderTrips();
      });
      pagination.appendChild(pageBtn);
    }
    
    if (endPage < state.totalPages) {
      if (endPage < state.totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-2';
        ellipsis.textContent = '...';
        pagination.appendChild(ellipsis);
      }
      
      const lastPageBtn = document.createElement('button');
      lastPageBtn.className = 'pagination-btn';
      lastPageBtn.textContent = state.totalPages;
      lastPageBtn.addEventListener('click', () => {
        state.currentPage = state.totalPages;
        tripManager.renderTrips();
      });
      pagination.appendChild(lastPageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${state.currentPage === state.totalPages ? 'opacity-50 cursor-not-allowed' : ''}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = state.currentPage === state.totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < state.totalPages) {
        state.currentPage++;
        tripManager.renderTrips();
      }
    });
    pagination.appendChild(nextBtn);
    
    elements.paginationContainer.appendChild(pagination);
  },

  updateDashboardStats: () => {
    const approvedTrips = state.allTrips.filter(trip => trip.approved === true).length;
    const pendingTrips = state.allTrips.filter(trip => trip.approved !== true).length;
    const topRated = state.allTrips.filter(trip => 
      trip.approved === true && trip.rating >= 4
    ).length;
    
    if (elements.totalTrips) elements.totalTrips.textContent = approvedTrips;
    if (elements.pendingTrips) elements.pendingTrips.textContent = pendingTrips;
    if (elements.topRated) elements.topRated.textContent = topRated;
  },

  loadTripForEditing: (tripId, tripData) => {
    tripManager.resetForm();
    
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
    elements.editorTitle.textContent = `Edit ${tripData.name || 'Trip'}`;
    elements.deleteBtn.classList.remove('hidden');
    
    // Set main image preview
    if (tripData.image) {
      elements.mainImagePreview.src = tripData.image;
      elements.mainImagePreview.classList.remove('hidden');
    }
    
    // Load media
    if (tripData.media?.images) {
      tripData.media.images.forEach(imageUrl => {
        this.createArrayInput(elements.imageList, 'Image URL', imageUrl);
      });
    }
    
    if (tripData.media?.videos) {
      tripData.media.videos.forEach(video => {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'array-item mb-3';
        
        const thumbnailInput = document.createElement('input');
        thumbnailInput.type = 'text';
        thumbnailInput.className = 'w-full mb-2 p-2 input-field rounded text-sm';
        thumbnailInput.placeholder = 'Thumbnail URL';
        thumbnailInput.value = video.thumbnail || '';
        
        const videoUrlInput = document.createElement('input');
        videoUrlInput.type = 'text';
        videoUrlInput.className = 'w-full p-2 input-field rounded text-sm';
        videoUrlInput.placeholder = 'Video URL';
        videoUrlInput.value = video.videoUrl || '';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item mt-2';
        removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove';
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
        this.createArrayInput(elements.includedList, 'Included item', item);
      });
    }
    
    if (tripData.notIncluded) {
      tripData.notIncluded.forEach(item => {
        this.createArrayInput(elements.notIncludedList, 'Not included item', item);
      });
    }
    
    // Load timeline
    if (tripData.timeline) {
      tripData.timeline.forEach(item => {
        this.createTimelineInput(elements.timelineList, item);
      });
    }
    
    // Load what to bring
    if (tripData.whatToBring) {
      tripData.whatToBring.forEach(item => {
        this.createArrayInput(elements.whatToBringList, 'What to bring item', item);
      });
    }
    
    // Load tour types
    if (tripData.tourtype) {
      Object.entries(tripData.tourtype).forEach(([key, value]) => {
        this.createTourTypeInput(elements.tourTypeList, key, value);
      });
    }
    
    tripManager.showEditorSection();
  },

  createArrayInput: (container, placeholder, value = '') => {
    const div = document.createElement('div');
    div.className = 'array-item flex items-center mb-2';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'flex-1 p-2 input-field rounded text-sm';
    input.placeholder = placeholder;
    input.value = value;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item ml-2 text-red-500 hover:text-red-700';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return input;
  },

  createTimelineInput: (container, timelineItem = { time: '', title: '', description: '' }) => {
    const div = document.createElement('div');
    div.className = 'array-item mb-4 p-3 bg-slate-50 rounded-lg';
    
    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'w-full mb-2 p-2 input-field rounded text-sm';
    timeInput.placeholder = 'Time (e.g., 09:00 AM)';
    timeInput.value = timelineItem.time || '';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'w-full mb-2 p-2 input-field rounded text-sm';
    titleInput.placeholder = 'Title';
    titleInput.value = timelineItem.title || '';
    
    const descInput = document.createElement('textarea');
    descInput.className = 'w-full p-2 input-field rounded text-sm';
    descInput.placeholder = 'Description';
    descInput.value = timelineItem.description || '';
    descInput.rows = 2;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item mt-2 text-red-500 hover:text-red-700 text-sm';
    removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove Timeline Item';
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
    div.className = 'array-item grid grid-cols-5 gap-2 items-center mb-2';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'col-span-3 p-2 input-field rounded text-sm';
    keyInput.placeholder = 'Service Name';
    keyInput.value = key || '';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'col-span-1 p-2 input-field rounded text-sm';
    valueInput.placeholder = 'Price';
    valueInput.value = value || '';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item col-span-1 text-red-500 hover:text-red-700';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(keyInput);
    div.appendChild(valueInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return { keyInput, valueInput };
  },

  saveTrip: async (e) => {
    e.preventDefault();
    utils.showLoading();
    
    try {
      const tripData = {
        name: utils.sanitizeInput(elements.name.value),
        bookingLink: utils.sanitizeInput(elements.bookingLink.value),
        price: parseFloat(utils.sanitizeInput(elements.price.value)),
        duration: utils.sanitizeInput(elements.duration.value),
        category: utils.sanitizeInput(elements.category.value),
        rating: parseFloat(utils.sanitizeInput(elements.rating.value)),
        image: utils.sanitizeInput(elements.mainImage.value),
        description: utils.sanitizeInput(elements.description.value),
        owner: elements.ownerId.value || state.currentUser.uid,
        lastUpdated: Date.now(),
        approved: false, // New trips are pending by default
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
      
      // Validate form data
      const validationErrors = utils.validateForm(tripData);
      if (validationErrors) {
        utils.showToast(validationErrors.join(', '), 'error');
        return;
      }
      
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
        const description = utils.sanitizeInput(div.querySelector('textarea').value);
        
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
      
      // Determine if this is a new or existing trip
      const tripId = elements.tripId.value || tripData.bookingLink.trim().toLowerCase().replace(/\s+/g, '-');
      const isNewTrip = !elements.tripId.value;
      
      // Save to Firebase
      if (isNewTrip) {
        await database.ref(`trips/${tripId}`).set(tripData);
        utils.showToast('Trip created successfully!');
      } else {
        await database.ref(`trips/${tripId}`).update(tripData);
        utils.showToast('Trip updated successfully!');
      }
      
      // Refresh data and UI
      await dataManager.loadTrips(true);
      tripManager.resetForm();
      tripManager.showListSection();
      state.currentPage = 1;
      
    } catch (error) {
      console.error("Error saving trip:", error);
      utils.showToast(`Failed to save trip: ${error.message}`, 'error');
    } finally {
      utils.hideLoading();
    }
  },

  deleteTrip: async (tripId) => {
    if (!tripId) return;
    
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return;
    }
    
    utils.showLoading();
    
    try {
      await database.ref(`trips/${tripId}`).remove();
      utils.showToast('Trip deleted successfully');
      
      // Refresh data
      await dataManager.loadTrips(true);
      
      // Reset form if we were editing this trip
      if (elements.tripId.value === tripId) {
        tripManager.resetForm();
        tripManager.showListSection();
      }
      
      // Reset to first page
      state.currentPage = 1;
      
    } catch (error) {
      console.error("Error deleting trip:", error);
      utils.showToast(`Failed to delete trip: ${error.message}`, 'error');
    } finally {
      utils.hideLoading();
    }
  },

  handleImageUpload: async (fileInput, isMainImage = false) => {
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    if (!file.type.match('image.*')) {
      utils.showToast('Please select an image file', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      utils.showToast('Image size must be less than 5MB', 'error');
      return;
    }
    
    try {
      utils.showLoading();
      const downloadURL = await utils.uploadFile(file, 'trip-images/');
      
      if (isMainImage) {
        elements.mainImage.value = downloadURL;
        elements.mainImagePreview.src = downloadURL;
        elements.mainImagePreview.classList.remove('hidden');
      } else {
        tripManager.createArrayInput(elements.imageList, 'Image URL', downloadURL);
      }
      
      utils.showToast('Image uploaded successfully!');
    } catch (error) {
      console.error("Upload error:", error);
      utils.showToast('Failed to upload image', 'error');
    } finally {
      utils.hideLoading();
      fileInput.value = ''; // Reset file input
    }
  }
};

// Data Management
const dataManager = {
  loadTrips: async (forceRefresh = false) => {
    try {
      utils.showLoading();
      
      // Check cache first if not forcing refresh
      if (!forceRefresh && state.tripsCache && Date.now() - state.lastFetchTime < 300000) {
        state.allTrips = state.tripsCache;
        tripManager.renderTrips();
        return;
      }
      
      const snapshot = await database.ref('trips').once('value');
      const tripsData = snapshot.val() || {};
      
      // Convert to array and filter based on user role
      let tripsArray = Object.keys(tripsData).map(id => ({
        id,
        ...tripsData[id]
      }));
      
      // For non-admin users, only show their own trips
      if (state.currentUserRole !== 'admin') {
        tripsArray = tripsArray.filter(trip => trip.owner === state.currentUser.uid);
      }
      
      state.allTrips = tripsArray;
      state.tripsCache = tripsArray;
      state.lastFetchTime = Date.now();
      
      // Render trips
      tripManager.renderTrips();
      tripManager.updateDashboardStats();
      
    } catch (error) {
      console.error("Error loading trips:", error);
      utils.showToast('Failed to load trips. ' + (state.isOnline ? '' : 'You are offline.'), 'error');
    } finally {
      utils.hideLoading();
    }
  }
};

// Event Listeners
const setupEventListeners = () => {
  // Search and filters
  elements.searchInput.addEventListener('input', utils.debounce(() => {
    state.currentPage = 1;
    tripManager.renderTrips();
  }, 300));
  
  elements.categoryFilter.addEventListener('change', () => {
    state.currentPage = 1;
    tripManager.renderTrips();
  });
  
  elements.sortFilter.addEventListener('change', () => {
    state.currentPage = 1;
    tripManager.renderTrips();
  });
  
  // Form submission
  elements.tripForm.addEventListener('submit', (e) => tripManager.saveTrip(e));
  
  // Navigation
  elements.cancelBtn.addEventListener('click', tripManager.showListSection);
  elements.newTripBtn.addEventListener('click', () => {
    tripManager.resetForm();
    tripManager.showEditorSection();
  });
  
  elements.emptyStateNewTripBtn.addEventListener('click', () => {
    tripManager.resetForm();
    tripManager.showEditorSection();
  });
  
  // Logout
  elements.logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'login.html';
    });
  });
  
  // Dynamic field buttons
  elements.addImageBtn.addEventListener('click', () => tripManager.createArrayInput(elements.imageList, 'Image URL'));
  elements.addVideoBtn.addEventListener('click', () => {
    const videoDiv = document.createElement('div');
    videoDiv.className = 'array-item mb-3';
    
    const thumbnailInput = document.createElement('input');
    thumbnailInput.type = 'text';
    thumbnailInput.className = 'w-full mb-2 p-2 input-field rounded text-sm';
    thumbnailInput.placeholder = 'Thumbnail URL';
    
    const videoUrlInput = document.createElement('input');
    videoUrlInput.type = 'text';
    videoUrlInput.className = 'w-full p-2 input-field rounded text-sm';
    videoUrlInput.placeholder = 'Video URL';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item mt-2 text-red-500 hover:text-red-700 text-sm';
    removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove Video';
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
  
  // Image uploads
  elements.imageUploadBtn?.addEventListener('change', (e) => {
    tripManager.handleImageUpload(e.target);
  });
  
  elements.mainImageUploadBtn?.addEventListener('change', (e) => {
    tripManager.handleImageUpload(e.target, true);
  });
  
  // Main image preview
  elements.mainImage?.addEventListener('input', (e) => {
    if (e.target.value) {
      elements.mainImagePreview.src = e.target.value;
      elements.mainImagePreview.classList.remove('hidden');
    } else {
      elements.mainImagePreview.src = '';
      elements.mainImagePreview.classList.add('hidden');
    }
  });
  
  // Online/offline detection
  window.addEventListener('online', () => {
    state.isOnline = true;
    utils.showToast('You are back online', 'success');
    dataManager.loadTrips(true);
  });
  
  window.addEventListener('offline', () => {
    state.isOnline = false;
    utils.showToast('You are offline. Some features may be limited.', 'warning');
  });
  
  // Delegated event listeners for dynamic elements
  elements.tripList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    
    if (editBtn) {
      const tripId = editBtn.dataset.id;
      const tripData = state.allTrips.find(t => t.id === tripId);
      if (tripData) tripManager.loadTripForEditing(tripId, tripData);
    }
    
    if (deleteBtn) {
      const tripId = deleteBtn.dataset.id;
      tripManager.deleteTrip(tripId);
    }
  });
};

// Initialize App
const initApp = () => {
  // Check initial online status
  utils.checkOnlineStatus();
  
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      state.currentUser = user;
      
      try {
        // Load user role
        const snapshot = await database.ref('egy_user/' + user.uid).once('value');
        const userData = snapshot.val();
        state.currentUserRole = userData?.role || 'user';
        
        // Update UI with user info
        elements.userEmail.textContent = user.email;
        elements.userRole.textContent = state.currentUserRole;
        elements.userRole.className = `role-badge ${
          state.currentUserRole === 'admin' ? 'role-admin' :
          state.currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
        }`;
        
        // Initialize the UI
        setupEventListeners();
        await dataManager.loadTrips();
        
        // Show appropriate UI based on role
        if (state.currentUserRole === 'admin' || state.currentUserRole === 'moderator') {
          elements.newTripBtn?.classList.remove('hidden');
          elements.emptyStateNewTripBtn?.classList.remove('hidden');
        }
        
      } catch (error) {
        console.error("Initialization error:", error);
        utils.showToast('Failed to initialize application', 'error');
      }
      
    } else {
      window.location.href = 'login.html';
    }
  });
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
