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
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Chart Variables
let statusChart, trendChart, guestChart, tourPerformanceChart;
let currentPeriod = 'week';
let bookingData = [];
let filteredBookingData = [];
let tourPerformanceMetric = 'bookings';
let dateRangePicker;

// DOM Elements
const elements = {
  // Trip Management Elements
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
  emptyState: document.getElementById('emptyState'),
  
  // Dashboard Elements
  totalBookings: document.getElementById('totalBookings'),
  totalGuests: document.getElementById('totalGuests'),
  totalRevenue: document.getElementById('totalRevenue'),
  avgRating: document.getElementById('avgRating'),
  statusUpdated: document.getElementById('statusUpdated'),
  trendUpdated: document.getElementById('trendUpdated'),
  guestUpdated: document.getElementById('guestUpdated'),
  dateRangePicker: document.getElementById('dateRangePicker'),
  tourPerformanceMetric: document.getElementById('tourPerformanceMetric'),
  exportData: document.getElementById('exportData'),
  dashboardTab: document.getElementById('dashboardTab'),
  dashboardSection: document.getElementById('dashboardSection'),
  userName: document.getElementById('userName'),
  
  // Payout Form Elements
  payoutForm: document.getElementById('payoutForm'),
  payoutMethod: document.getElementById('payoutMethod'),
  bankFields: document.getElementById('bankFields'),
  bankName: document.getElementById('bankName'),
  branchName: document.getElementById('branchName'),
  accountNumber: document.getElementById('accountNumber'),
  profilePhoto: document.querySelector('.profile-photo'),
  profilePhoto2: document.querySelector('.profile-photo2')
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
    toast.className = `toast toast-${type} fixed top-4 right-4 p-4 rounded-md shadow-lg ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white z-50`;
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
    if (elements.spinner) elements.spinner.classList.remove('hidden');
    if (elements.saveBtn) elements.saveBtn.disabled = true;
  },

  hideLoading: () => {
    if (elements.spinner) elements.spinner.classList.add('hidden');
    if (elements.saveBtn) elements.saveBtn.disabled = false;
  },

  sanitizeInput: (input) => {
    return input.trim()
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '');
  },

  validateTripData: (data) => {
    const errors = [];
    if (!data.name || data.name.length < 5) errors.push('Name must be at least 5 characters');
    if (isNaN(data.price) || data.price <= 0) errors.push('Price must be a positive number');
    if (!data.duration) errors.push('Duration is required');
    if (!data.category) errors.push('Category is required');
    if (!data.image) errors.push('Main image is required');
    return errors.length ? errors : null;
  },

  formatDateForFilename: (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  },

  getDateRangeLabel: () => {
    if (currentPeriod === 'custom' && dateRangePicker && dateRangePicker.selectedDates.length === 2) {
      const start = utils.formatDateForFilename(dateRangePicker.selectedDates[0]);
      const end = utils.formatDateForFilename(dateRangePicker.selectedDates[1]);
      return `${start}_to_${end}`;
    }
    
    const now = new Date();
    switch(currentPeriod) {
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `Week_${utils.formatDateForFilename(weekStart)}_to_${utils.formatDateForFilename(weekEnd)}`;
      case 'month':
        return `Month_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `Q${quarter}_${now.getFullYear()}`;
      case 'year':
        return `Year_${now.getFullYear()}`;
      case 'all':
      default:
        return 'All_Time';
    }
  },

  downloadCanvas: (canvas, filename) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  downloadImage: (url, filename) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
  }
};

// Trip Management Functions
const tripManager = {
  resetForm: () => {
    if (elements.tripForm) elements.tripForm.reset();
    if (elements.tripId) elements.tripId.value = '';
    if (elements.ownerId) elements.ownerId.value = '';
    if (elements.bookingLink) elements.bookingLink.value = '';
    if (elements.editorTitle) elements.editorTitle.textContent = 'Create New Trip';
    if (elements.deleteBtn) elements.deleteBtn.classList.add('hidden');
    
    if (elements.imageList) elements.imageList.innerHTML = '';
    if (elements.videoList) elements.videoList.innerHTML = '';
    if (elements.includedList) elements.includedList.innerHTML = '';
    if (elements.notIncludedList) elements.notIncludedList.innerHTML = '';
    if (elements.timelineList) elements.timelineList.innerHTML = '';
    if (elements.whatToBringList) elements.whatToBringList.innerHTML = '';
    if (elements.tourTypeList) elements.tourTypeList.innerHTML = '';
  },

  showListSection: () => {
    if (elements.tripListSection) {
      elements.tripListSection.classList.remove('hidden');
    } else {
      console.warn('tripListSection element not found');
    }
    if (elements.tripEditorSection) {
      elements.tripEditorSection.classList.add('hidden');
    }
    if (elements.dashboardSection) {
      elements.dashboardSection.classList.add('hidden');
    }
    if (elements.tripListTab) {
      elements.tripListTab.classList.add('tab-active');
    }
    if (elements.tripEditorTab) {
      elements.tripEditorTab.classList.remove('tab-active');
    }
    if (elements.dashboardTab) {
      elements.dashboardTab.classList.remove('tab-active');
    }
    localStorage.setItem('activeSection', 'tripList');
  },

  showEditorSection: () => {
    if (elements.tripListSection) {
      elements.tripListSection.classList.add('hidden');
    }
    if (elements.tripEditorSection) {
      elements.tripEditorSection.classList.remove('hidden');
    } else {
      console.warn('tripEditorSection element not found');
    }
    if (elements.dashboardSection) {
      elements.dashboardSection.classList.add('hidden');
    }
    if (elements.tripListTab) {
      elements.tripListTab.classList.remove('tab-active');
    }
    if (elements.tripEditorTab) {
      elements.tripEditorTab.classList.add('tab-active');
    }
    if (elements.dashboardTab) {
      elements.dashboardTab.classList.remove('tab-active');
    }
    localStorage.setItem('activeSection', 'tripEditor');
  },

  showDashboardSection: () => {
    if (elements.tripListSection) {
      elements.tripListSection.classList.add('hidden');
    }
    if (elements.tripEditorSection) {
      elements.tripEditorSection.classList.add('hidden');
    }
    if (elements.dashboardSection) {
      elements.dashboardSection.classList.remove('hidden');
    } else {
      console.warn('dashboardSection element not found');
    }
    if (elements.tripListTab) {
      elements.tripListTab.classList.remove('tab-active');
    }
    if (elements.tripEditorTab) {
      elements.tripEditorTab.classList.remove('tab-active');
    }
    if (elements.dashboardTab) {
      elements.dashboardTab.classList.add('tab-active');
    }
    localStorage.setItem('activeSection', 'dashboard');
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
    valueInput.className = 'col-span-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
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
    
    if (elements.totalTrips) elements.totalTrips.textContent = approvedTrips.length;
    if (elements.pendingTrips) elements.pendingTrips.textContent = pendingTrips.length;
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
      if (elements.userRole) {
        elements.userRole.textContent = state.currentUserRole;
        elements.userRole.className = 'role-badge ' + (
          state.currentUserRole === 'admin' ? 'role-admin' : 
          state.currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
        );
      }
      if (elements.userEmail) elements.userEmail.textContent = state.currentUser.email;
      if (elements.userName) {
        elements.userName.textContent = userData?.name || state.currentUser.email.split('@')[0];
      }
      if (elements.profilePhoto) {
        elements.profilePhoto.src = userData?.photo || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        elements.profilePhoto.onerror = function() {
          this.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        };
      }
      if (elements.profilePhoto2) {
        elements.profilePhoto2.src = userData?.photo || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        elements.profilePhoto2.onerror = function() {
          this.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        };
      }
      
      // Show/hide new trip button based on role
      if (tripManager.canEditTrips()) {
        if (elements.newTripBtn) elements.newTripBtn.classList.remove('hidden');
        if (elements.emptyStateNewTripBtn) elements.emptyStateNewTripBtn.classList.remove('hidden');
      }

      // Load payout data
      tripManager.loadPayoutData(userId);
    });
  },

  loadPayoutData: (userId) => {
    database.ref(`egy_user/${userId}/payout_method`).once('value').then(snapshot => {
      const payoutData = snapshot.val();
      if (payoutData && elements.payoutForm) {
        elements.payoutMethod.value = payoutData.method || '';
        elements.name.value = payoutData.name || '';
        elements.accountNumber.value = payoutData.accountNumber || '';
        if (payoutData.method === 'bankAccount') {
          elements.bankName.value = payoutData.bankName || '';
          elements.branchName.value = payoutData.branchName || '';
          elements.bankFields.style.display = 'block';
        } else {
          elements.bankFields.style.display = 'none';
        }
      }
    }).catch(error => {
      utils.showToast('Failed to load payout data: ' + error.message, 'error');
    });
  },

  loadTripList: (forceRefresh = false) => {
    if (!forceRefresh && state.tripsCache && Date.now() - state.lastFetchTime < 300000) {
      tripManager.renderTrips(state.tripsCache);
      return;
    }

    database.ref('trips').once('value').then(snapshot => {
      state.allTrips = snapshot.val() || {};
      state.tripsCache = Object.values(state.allTrips);
      state.lastFetchTime = Date.now();
      
      let tripsArray = Object.entries(state.allTrips)
        .filter(([_, trip]) => trip.owner === state.currentUser?.uid)
        .map(([id, trip]) => ({ id, ...trip }));
      
      if (tripsArray.length === 0 && elements.emptyState) {
        elements.emptyState.classList.remove('hidden');
      } else if (elements.emptyState) {
        elements.emptyState.classList.add('hidden');
      }
      
      tripManager.renderTrips(tripsArray);
      tripManager.updateDashboardStats();
    }).catch(error => {
      utils.showToast('Failed to load trips: ' + error.message, 'error');
    });
  },

  renderTrips: (trips) => {
    if (!elements.tripList) return;
    
    elements.tripList.innerHTML = '';
    
    trips.forEach(({ id, ...trip }) => {
      const canEdit = tripManager.canEditTrip(trip.owner);
      const card = document.createElement('div');
      card.className = `trip-card glass-card rounded-xl overflow-hidden ${!canEdit ? 'opacity-80' : ''}`;
      
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
          </div>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center text-sm text-slate-300">
              <i class="fas fa-clock mr-1"></i>
              <span>${trip.duration}</span>
            </div>
            <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">${trip.category}</span>
          </div>
          
          <div class="mt-2 flex items-center justify-between">
            <div class="text-lg font-bold text-slate-100">${trip.price} EGP</div>
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
    
    if (!tripManager.canEditTrip(tripData.owner)) {
      utils.showToast('You do not have permission to edit this trip', 'error');
      tripManager.showListSection();
      return;
    }
    
    elements.tripId.value = tripId;
    elements.ownerId.value = tripData.owner || state.currentUser.uid;
    elements.name.value = tripData.name || '';
    elements.bookingLink.value = tripId || '';
    elements.price.value = tripData.price || '';
    elements.duration.value = tripData.duration || '';
    elements.category.value = tripData.category || '';
    elements.mainImage.value = tripData.image || '';
    elements.description.value = tripData.description || '';
    elements.editorTitle.textContent = `Edit ${tripData.name}`;
    elements.deleteBtn.classList.remove('hidden');
    
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
    
    if (tripData.timeline) {
      tripData.timeline.forEach(item => {
        tripManager.createTimelineInput(elements.timelineList, item);
      });
    }
    
    if (tripData.whatToBring) {
      tripData.whatToBring.forEach(item => {
        tripManager.createArrayInput(elements.whatToBringList, 'What to bring item', item);
      });
    }
    
    if (tripData.tourtype) {
      Object.entries(tripData.tourtype).forEach(([key, value]) => {
        tripManager.createTourTypeInput(elements.tourTypeList, key, value);
      });
    }
  },

  saveTrip: (e) => {
    e.preventDefault();
    
    if (!tripManager.canEditTrips()) {
      utils.showToast('You do not have permission to create or edit trips', 'error');
      return;
    }
    
    utils.showLoading();
    
    const sanitizedData = {
      name: utils.sanitizeInput(elements.name.value),
      bookingLink: utils.sanitizeInput(elements.bookingLink.value),
      price: parseFloat(utils.sanitizeInput(elements.price.value)),
      duration: utils.sanitizeInput(elements.duration.value),
      category: utils.sanitizeInput(elements.category.value),
      image: utils.sanitizeInput(elements.mainImage.value),
      description: utils.sanitizeInput(elements.description.value)
    };
    
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
    
    const imageInputs = elements.imageList.querySelectorAll('input');
    imageInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.media.images.push(utils.sanitizeInput(input.value));
      }
    });
    
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
    
    const includedInputs = elements.includedList.querySelectorAll('input');
    includedInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.included.push(utils.sanitizeInput(input.value));
      }
    });
    
    const notIncludedInputs = elements.notIncludedList.querySelectorAll('input');
    notIncludedInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.notIncluded.push(utils.sanitizeInput(input.value));
      }
    });
    
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
    
    const whatToBringInputs = elements.whatToBringList.querySelectorAll('input');
    whatToBringInputs.forEach(input => {
      if (input.value.trim()) {
        tripData.whatToBring.push(utils.sanitizeInput(input.value));
      }
    });
    
    const tourTypeDivs = elements.tourTypeList.querySelectorAll('.array-item');
    tourTypeDivs.forEach(div => {
      const key = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const value = parseFloat(utils.sanitizeInput(div.querySelector('input:nth-child(2)').value));
      
      if (key && !isNaN(value)) {
        tripData.tourtype[key] = value;
      }
    });
    
    const isExistingTrip = elements.tripId.value && elements.tripId.value !== '';
    
    if (isExistingTrip) {
      database.ref('trips/' + tripId).once('value').then(snapshot => {
        const existingTrip = snapshot.val();
        
        if (!existingTrip) {
          utils.showToast('Trip not found', 'error');
          utils.hideLoading();
          return;
        }
        
        if (!tripManager.canEditTrip(tripId)) {
          utils.showToast('You do not have permission to edit this trip', 'error');
          utils.hideLoading();
          return;
        }
        
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
        
        updates.lastUpdated = Date.now();
        
        database.ref('trips/' + tripId).update(updates)
          .then(() => {
            utils.showToast('Trip updated successfully!');
            tripManager.loadTripList(true);
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
      database.ref('trips/' + tripId).set(tripData)
        .then(() => {
          utils.showToast('Trip created successfully!');
          tripManager.loadTripList(true);
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
    
    if (!tripManager.canEditTrips()) {
      utils.showToast('You do not have permission to delete trips', 'error');
      return;
    }
    
    utils.showLoading();
    
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
      
      database.ref('trips/' + tripId).remove()
        .then(() => {
          utils.showToast('Trip deleted successfully!');
          tripManager.loadTripList(true);
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

// Dashboard Functions
const dashboardManager = {
  initCharts: () => {
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
      statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Confirmed', 'New', ' PSU', 'No Show'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: [
              'rgba(76, 175, 80, 0.7)',
              'rgba(33, 150, 243, 0.7)',
              'rgba(244, 67, 54, 0.7)',
              'rgba说什么呢？(255, 152, 0, 0.7)'
            ],
            borderColor: [
              'rgba(76, 175, 80, 1)',
              'rgba(33, 150, 243, 1)',
              'rgba(244, 67, 54, 1)',
              'rgba(255, 152, 0, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  family: 'Poppins'
                }
              }
            },
            tooltip: {
              backgroundColor: '#222',
              titleColor: '#fff',
              borderColor: '#666',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

 if (trendChart) {
      trendChart = new Chart(trendChart, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{
            label: 'Confirmed Bookings',
            data: Array(12).fill(0),
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderColor: '#ffc107',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#ffa107',
            pointBorderColor: '#333',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#222',
              titleColor: '#fff',
              borderColor: '#666',
              borderWidth: 1,
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#444',
                drawBorder: false
              }
            },
            x: {
              grid: {
                color: '#444',
                display: false
              }
            }
          }
        }
      });
    }

    const guestChart = document.getElementById('guestChart')?.getContext('2d');
    if (guestChart) {
      guestChart = new Chart(guestChart, {
        type: 'doughnut',
        data: {
          labels: ['Adults', 'Children', 'Infants'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [
              'rgba(255, 193, 7, 0.7)',
              'rgba(255, 152, 0, 0.7)',
              'rgba(255, 87, 34, 0.7)'
            ],
            borderColor: [
              'rgba(255, 193, 7, 1)',
              'rgba(255, 152, 0, 1)',
              'rgba(255, 87, 34, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          circumference: 180,
          rotation: -90,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  family: 'Poppins'
                }
              }
            },
            tooltip: {
              backgroundColor: '#222',
              titleColor: '#fff',
              borderColor: '#666',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    const tourPerformanceChart = document.getElementById('tourPerformanceChart');
    if (tourPerformanceChart) {
      tourPerformanceChart = echarts.init(tourPerformanceChart);
      
      window.addEventListener('resize', function() {
        tourPerformanceChart.resize();
      });
    }
  },

  processBookingData: (data) => {
    try {
      bookingData = Object.values(data || []);
      filteredBookingData = [...bookingData];
      
      dashboardManager.updateStatsCards();
      dashboardManager.updateChart();
      dashboardManager.updateGuestChart();
      dashboardManager.updateTourPerformance();
    } catch (error) {
      console.error("Error processing booking data:", error);
    }
  },

  filterDataByDateRange: (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      filteredBookingData = bookingData.filter(t => {
        if (!t.tripDate) return false;
        const bookingDate = new Date(t.tripDate);
        return bookingDate >= start && bookingDate <= end;
      });
      
      return filteredBookingData;
    } catch (error) {
      console.error("Error filtering data by date range:", error);
      return bookingData;
    }
  },

  applyPeriodFilter: () => {
    const now = new Date();
    let startDate, endDate;
    
    switch(currentPeriod) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() + 6));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all':
      default:
        return bookingData;
    }
    
    return dashboardManager.filterDataByDateRange(startDate, endDate);
  },

  updateStatsCards: () => {
    try {
      const confirmedBookings = filteredBookingData.filter(b => b.resStatus?.toLowerCase() === 'confirmed');
      
      if (elements.totalBookings) elements.totalBookings.textContent = confirmedBookings.length.toLocaleString();
      
      const totalGuests = confirmedBookings.reduce((total, booking) => {
        return total + 
          (parseInt(booking.elements) || 0) + 
          (parseInt(booking.childrenUnder12) || 0) + 
          (parseInt(booking.infants) || 0);
      }, 0);
      
      if (elements.totalGuests) elements.totalGuests.textContent = totalGuests.toLocaleString();
      
      const totalRevenue = confirmedBookings.reduce((total, booking) => {
        return total + (parseFloat(booking.netTotal) || 0);
      }, 0);
      
      if (elements.totalRevenue) elements.totalRevenue.textContent = 'EGP ' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      
      const ratedBookings = confirmedBookings.filter(b => b.rating);
      const avgRating = ratedBookings.length > 0 
        ? (ratedBookings.reduce((sum, b) => sum + parseFloat(b.rating || 0), 0) / ratedBookings.length)
        : 0;
      
      if (elements.avgRating) elements.avgRating.textContent = avgRating.toFixed(1);
    } catch (error) {
      console.error("Error updating stats cards:", error);
    }
  },

  updateStatusChart: () => {
    try {
      if (!statusChart) return;
      
      const statusCounts = {
        confirmed: 0,
        new: 0,
        cancelled: 0,
        noshow: 0
      };
      
      filteredBookingData.forEach(booking => {
        const status = booking.resStatus?.toLowerCase().replace(' ', '') || 'new';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });
      
      statusChart.data.datasets[0].data = [
        statusCounts.confirmed,
        statusCounts.new,
        statusCounts.cancelled,
        statusCounts.noshow
      ];
      statusChart.update();
      
      if (elements.statusUpdated) elements.statusUpdated.textContent = 'Updated: ' + new Date().toLocaleTimeString();
    } catch (error) {
      console.error("Error updating status chart:", error);
    }
  },

  updateTrendChart: () => {
    try {
      if (!trendChart) return;
      
      const monthlyCounts = Array(12).fill(0);
      const currentYear = new Date().getFullYear();
      
      filteredBookingData.forEach(booking => {
        if (booking.resStatus?.toLowerCase() === 'confirmed' && booking.tripDate) {
          const dateParts = booking.tripDate.split('-');
          if (dateParts[0] == currentYear) {
            const month = parseInt(dateParts[1]) - 1;
            if (month >= 0 && month < 12) {
              monthlyCounts[month]++;
            }
          }
        }
      });
      
      trendChart.data.datasets[0].data = monthlyCounts;
      trendChart.update();
      
      if (elements.trendUpdated) elements.trendUpdated.textContent = currentYear;
    } catch (error) {
      console.error("Error updating trendChart:", error);
    }
  },

  updateGuestChart: () => {
    try {
      if (!guestChart) return;
      
      const guestCounts = {
        adults: 0,
        children: 0,
        infants: 0
      };
      
      filteredBookingData.forEach(booking => {
        if (booking.resStatus?.toLowerCase() === 'confirmed') {
          guestCounts.adults += parseInt(booking.adults) || 0;
          guestCounts.children += parseInt(booking.childrenUnder12) || 0;
          guestCounts.infants += parseInt(booking.infants) || 0;
        }
      });
      
      guestChart.data.datasets[0].data = [
        guestCounts.adults,
        guestCounts.children,
        guestCounts.infants
      ];
      guestChart.update();
      
      if (elements.guestUpdated) elements.guestUpdated.textContent = 'Updated: ' + new Date().toLocaleTimeString();
    } catch (error) {
      console.error("Error updating guest chart:", error);
    }
  },

  updateTourPerformanceChart: () => {
    try {
      if (!tourPerformanceChart) return;
      
      const tourData = {};
      filteredBookingData.forEach(booking => {
        if (booking.resStatus?.toLowerCase() === 'confirmed') {
          const tourName = booking.tour || 'Other';
          if (!tourData[tourName]) {
            tourData[tourName] = {
              bookings: 0,
              revenue: 0
            };
          }
          tourData[tourName].bookings++;
          tourData[tourName].revenue += parseFloat(booking.netTotal) || 0;
        }
      });

      const sortedTours = Object.entries(tourData)
        .sort((a, b) => b[1][tourPerformanceMetric] - a[1][tourPerformanceMetric])
        .slice(0, 5);

      const tourNames = sortedTours.map(item => item[0]);
      const tourValues = sortedTours.map(item => {
        return tourPerformanceMetric === 'bookings' 
          ? item[1].bookings 
          : parseFloat(item[1].revenue.toFixed(2));
      });

      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            const data = params[0];
            return tourPerformanceMetric === 'bookings'
              ? `${data.name}<br />${tourPerformanceMetric}: ${data.value}`
              : `${data.name}<br />Revenue: EGP ${data.value.toFixed(2)}`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          axisLabel: {
            formatter: function(value) {
              return tourPerformanceMetric === 'bookings'
                ? value
                : value.toFixed(2);
            }
          }
        },
        yAxis: {
          type: 'category',
          data: tourNames
        },
        series: [{
          name: tourPerformanceMetric === 'bookings' ? 'Bookings' : 'Revenue',
          type: 'bar',
          data: tourValues,
          itemStyle: {
            color: function(params) {
              const colors = ['#ffc107', '#ff9800', '#ff5722', '#4caf50', '#2196f3'];
              return colors[params.dataIndex % colors.length];
            },
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: function(params) {
              return tourPerformanceMetric === 'bookings'
                ? params.value
                : 'EGP ' + params.value.toFixed(2);
            },
            fontWeight: 'bold'
          }
        }]
      };

      tourPerformanceChart.setOption(option);
    } catch (error) {
      console.error("Error updating tour performance chart:", error);
    }
  },

  exportToExcel: () => {
    try {
      const confirmedBookings = filteredBookingData.filter(b => b.resStatus?.toLowerCase() === 'confirmed');
      
      if (confirmedBookings.length === 0) {
        utils.showToast("No confirmed bookings to export with current filters", 'warning');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Confirmed Bookings');

      worksheet.columns = [
        { header: 'Reference #', key: 'refNumber', width: 20 },
        { header: 'Tour Name', key: 'tour', width: 25 },
        { header: 'Trip Date', key: 'tripDate', width: 15 },
        { header: 'Adults', key: 'adults', width: 10 },
        { header: 'Children', key: 'childrenUnder12', width: 10 },
        { header: 'Infants', key: 'infants', width: 10 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD700' }
        };
        cell.font = { 
          bold: true,
          color: { argb: '000000' }
        };
        cell.alignment = { 
          horizontal: 'center',
          vertical: 'middle'
        };
      });

      confirmedBookings.forEach((booking, index) => {
        const row = worksheet.addRow({
          refNumber: booking.refNumber || '',
          tour: booking.tour || '',
          tripDate: booking.tripDate || '',
          adults: booking.adults || 0,
          childrenUnder12: booking.childrenUnder12 || 0,
          infants: booking.infants || 0,
          phone: booking.phone || '',
          email: booking.email || '',
          paymentStatus: booking.paymentStatus || ''
        });

        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
          };
          cell.alignment = { 
            horizontal: 'center',
            vertical: 'middle'
          };
        });

        const statusCell = worksheet.getCell(`I${row.number}`);
        const status = booking.paymentStatus?.toLowerCase() || '';
        
        if (status === 'paid') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' }
          };
          statusCell.font = {
            color: { argb: 'FF006100' }
          };
        } else if (status === 'unpaid' || status === 'pending') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
          statusCell.font = {
            color: { argb: 'FF9C0006' }
          };
        } else {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEB9C' }
          };
          statusCell.font = {
            color: { argb: 'FF000000' }
          };
        }
      });

      const totalsRow = worksheet.addRow({
        refNumber: 'TOTALS',
        tour: '',
        tripDate: '',
        adults: confirmedBookings.reduce((sum, b) => sum + (parseInt(b.adults) || 0), 0),
        childrenUnder12: confirmedBookings.reduce((sum, c) => sum + (parseInt(c.childrenUnder12) || 0), 0),
        infants: confirmedBookings.reduce((sum, i) => sum + (parseInt(i.infants) || 0), 0),
        phone: '',
        email: '',
        paymentStatus: ''
      });

      totalsRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2CC' }
        };
        cell.font = { 
          bold: true 
        };
        cell.alignment = { 
          horizontal: 'center',
          vertical: 'middle'
        };
      });

      worksheet.columns.forEach(column => {
        let maxLength = column.header ? column.header.length : 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.text ? cell.text.length : 0;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: 'A1',
        to: `I${worksheet.rowCount}`
      };

      const dateRangeStr = utils.getDateRangeLabel();
      
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Confirmed_Bookings_${dateRangeStr}.xlsx`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }).catch(error => {
        console.error('Error generating Excel file:', error);
        utils.showToast('Error generating Excel: ' + error.message, 'error');
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      utils.showToast('Error exporting data: ' + error.message, 'error');
    }
  },

  exportChart: (chartId) => {
    try {
      let canvas, filename;
      
      switch(chartId) {
        case 'statusChart':
        case 'trendChart':
        case 'guestChart':
          canvas = document.getElementById(chartId);
          if (canvas) {
            filename = `${chartId}-${new Date().toISOString().slice(0,10)}.png`;
            utils.downloadCanvas(canvas, filename);
          }
          break;
          
        case 'tourPerformanceChart':
          if (tourPerformanceChart) {
            filename = `tour-performance-${new Date().toISOString().slice(0,10)}.png`;
            const url = tourPerformanceChart.getDataURL({
              type: 'png',
              pixelRatio: 2,
              backgroundColor: '#333'
            });
            utils.downloadImage(url, filename);
          }
          break;
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
      utils.showToast('Error exporting chart: ' + error.message, 'error');
    }
  },

  updateAllCharts: () => {
    dashboardManager.updateStatsCards();
    dashboardManager.updateStatusChart();
    dashboardManager.updateTrendChart();
    dashboardManager.updateGuestChart();
    dashboardManager.updateTourPerformanceChart();
  },

  initDateRangePicker: () => {
    if (elements.dateRangePicker) {
      dateRangePicker = flatpickr(elements.dateRangePicker, {
        mode: "range",
        dateFormat: "Y-m-d",
        onClose: function(selectedDates) {
          if (selectedDates.length === 2) {
            document.querySelectorAll('.filter-btn[data-period]').forEach(b => b.classList.remove('active'));
            currentPeriod = 'custom';
            dashboardManager.filterDataByDateRange(selectedDates[0], selectedDates[1]);
            dashboardManager.updateAllCharts();
          }
        }
      });
    }
    return dateRangePicker;
  },

  loadBookingData: () => {
    try {
      if (!state.currentUser) return;
      
      const bookingsRef = database.ref("trip_bookings")
        .orderByChild("owner")
        .equalTo(state.currentUser.uid);
      
      bookingsRef.once('value')
        .then(snapshot => {
          dashboardManager.processBookingData(snapshot.exists() ? snapshot.val() : {});
        })
        .catch(error => {
          console.error("Error loading booking data:", error);
          dashboardManager.processBookingData({});
        });
      
      bookingsRef.on('value', (snapshot) => {
        dashboardManager.processBookingData(snapshot.exists() ? snapshot.val() : {});
      });
    } catch (error) {
      console.error("Error in loadBookingData:", error);
    }
  }
};

// Payout Management Functions
const payoutManager = {
  toggleBankFields: () => {
    if (!elements.payoutMethod || !elements.bankFields) {
      console.error('Essential elements missing for toggle');
      return;
    }

    const isBankAccount = elements.payoutMethod.value === 'bankAccount';
    console.log(`Toggling bank fields (${isBankAccount ? 'show' : 'hide'})`);

    elements.bankFields.style.display = isBankAccount ? 'block' : 'none';
    
    if (elements.bankName && elements.branchName) {
      elements.bankName.required = isBankAccount;
      elements.branchName.required = isBankAccount;
    }
  },

  savePayoutMethod: async (e) => {
    e.preventDefault();
    
    if (typeof firebase === 'undefined' || !firebase.database) {
      utils.showToast("Firebase not loaded. Please refresh the page.", "error");
      return;
    }

    if (!state.currentUser) {
      utils.showToast("User not authenticated. Please login again.", "error");
      return;
    }

    const nameEl = document.getElementById("name");
    const accountEl = document.getElementById("accountNumber");
    
    if (!nameEl || !accountEl) {
      utils.showToast("Form elements missing. Please refresh the page.", "error");
      return;
    }

    const payoutData = {
      method: elements.payoutMethod.value,
      name: utils.sanitizeInput(nameEl.value),
      accountNumber: utils.sanitizeInput(accountEl.value),
      updatedAt: Date.now()
    };

    if (!payoutData.name || !payoutData.accountNumber) {
      utils.showToast("Name and account number are required", "error");
      return;
    }

    if (payoutData.method === "bankAccount") {
      if (!elements.bankName || !elements.branchName) {
        utils.showToast("Bank fields not found", "error");
        return;
      }

      payoutData.bankName = utils.sanitizeInput(elements.bankName.value);
      payoutData.branchName = utils.sanitizeInput(elements.branchName.value);
      
      if (!payoutData.bankName || !payoutData.branchName) {
        utils.showToast("Bank name and branch are required", "error");
        return;
      }
    }

    const submitBtn = elements.payoutForm.querySelector('.save-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    try {
      console.log("Saving to Firebase:", payoutData);
      await firebase.database().ref(`egy_user/${state.currentUser.uid}/payout_method`).set(payoutData);
      
      utils.showToast('Payout method saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving payout data:', error);
      utils.showToast(`Save failed: ${error.message}`, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save';
      }
    }
  }
};

// Sidebar and Navigation Functions
const navigationManager = {
  handleSidebarNavigation: () => {
    const allSideMenu = document.querySelectorAll('#sidebar .side-menu li a');
    
    allSideMenu.forEach(item => {
      const li = item.parentElement;
      
      item.addEventListener('click', function(e) {
        e.preventDefault();
        allSideMenu.forEach(i => {
          i.parentElement.classList.remove('active');
        });
        li.classList.add('active');
        const sectionId = li.dataset.section;
        navigationManager.showSection(sectionId);
        
        if (window.innerWidth < 768) {
          document.getElementById('sidebar').classList.add('hide');
        }
      });
    });
  },

  handleSidebarToggle: () => {
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBar && sidebar) {
      menuBar.addEventListener('click', function () {
        sidebar.classList.toggle('hide');
      });
    }

    if (window.innerWidth < 768) {
      sidebar.classList.add('hide');
    }
  },

  handleSearchForm: () => {
    const searchButton = document.querySelector('#content nav form .form-input button');
    const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
    const searchForm = document.querySelector('#content nav form');
    
    if (searchButton && searchButtonIcon && searchForm) {
      searchButton.addEventListener('click', function (e) {
        if (window.innerWidth < 576) {
          e.preventDefault();
          searchForm.classList.toggle('show');
          if (searchForm.classList.contains('show')) {
            searchButtonIcon.classList.replace('bx-search', 'bx-x');
          } else {
            searchButtonIcon.classList.replace('bx-x', 'bx-search');
          }
        }
      });

      if (window.innerWidth > 576) {
        searchButtonIcon.classList.replace('bx-x', 'bx-search');
        searchForm.classList.remove('show');
      }

      window.addEventListener('resize', function () {
        if (this.innerWidth > 576) {
          searchButtonIcon.classList.replace('bx-x', 'bx-search');
          searchForm.classList.remove('show');
        }
      });
    }
  },

  showSection: (sectionId) => {
    const contentSections = document.querySelectorAll('.content-section');
    
    contentSections.forEach(section => {
      section.classList.remove('active');
      section.classList.add('hidden');
    });
    
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
      activeSection.classList.remove('hidden');
      activeSection.classList.add('active');
    } else {
      console.warn(`Section ${sectionId}-section not found`);
    }
    
    const sideMenuItems = document.querySelectorAll('#sidebar .side-menu li[data-section]');
    sideMenuItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === sectionId) {
        item.classList.add('active');
      }
    });
    
    localStorage.setItem('activeSection', sectionId);

    if (sectionId === 'dashboard') {
      tripManager.showDashboardSection();
    } else if (sectionId === 'tripList') {
      tripManager.showListSection();
    } else if (sectionId === 'tripEditor') {
      tripManager.showEditorSection();
    }
  }
};

// New Functions for HTML Event Handlers
const switchTab = (tabId) => {
  navigationManager.showSection(tabId);
};

const applyFilters = () => {
  if (currentPeriod === 'custom' && dateRangePicker && dateRangePicker.selectedDates.length === 2) {
    dashboardManager.filterDataByDateRange(dateRangePicker.selectedDates[0], dateRangePicker.selectedDates[1]);
  } else {
    filteredBookingData = dashboardManager.applyPeriodFilter();
  }
  dashboardManager.updateAllCharts();
  utils.showToast('Filters applied successfully!', 'success');
};

const refreshBookings = () => {
  dashboardManager.loadBookingData();
  utils.showToast('Bookings refreshed!', 'success');
};

const exportToExcel = () => {
  dashboardManager.exportToExcel();
};

// Event Listeners
const setupEventListeners = () => {
  if (tripManager.canEditTrips() && elements.tripForm) {
    elements.tripForm.addEventListener('submit', tripManager.saveTrip);
    
    if (elements.addImageBtn) elements.addImageBtn.addEventListener('click', () => tripManager.createArrayInput(elements.imageList, 'Image URL'));
    if (elements.addVideoBtn) elements.addVideoBtn.addEventListener('click', () => {
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
    
    if (elements.addIncludedBtn) elements.addIncludedBtn.addEventListener('click', () => tripManager.createArrayInput(elements.includedList, 'Included item'));
    if (elements.addNotIncludedBtn) elements.addNotIncludedBtn.addEventListener('click', () => tripManager.createArrayInput(elements.notIncludedList, 'Not included item'));
    if (elements.addTimelineBtn) elements.addTimelineBtn.addEventListener('click', () => tripManager.createTimelineInput(elements.timelineList));
    if (elements.addWhatToBringBtn) elements.addWhatToBringBtn.addEventListener('click', () => tripManager.createArrayInput(elements.whatToBringList, 'What to bring item'));
    if (elements.addTourTypeBtn) elements.addTourTypeBtn.addEventListener('click', () => tripManager.createTourTypeInput(elements.tourTypeList));
    
    if (elements.newTripBtn) elements.newTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
    
    if (elements.emptyStateNewTripBtn) elements.emptyStateNewTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
  }
  
  if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', tripManager.showListSection);
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    });
  });
  
  if (elements.tripListTab) elements.tripListTab.addEventListener('click', () => navigationManager.showSection('tripList'));
  if (elements.tripEditorTab) elements.tripEditorTab.addEventListener('click', () => navigationManager.showSection('tripEditor'));
  if (elements.dashboardTab) elements.dashboardTab.addEventListener('click', () => navigationManager.showSection('dashboard'));
  
  const periodButtons = document.querySelectorAll('.filter-btn[data-period]');
  if (periodButtons.length) {
    periodButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn[data-period]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentPeriod = this.dataset.period;
        
        if (currentPeriod !== 'custom') {
          if (dateRangePicker) dateRangePicker.clear();
          filteredBookingData = dashboardManager.applyPeriodFilter();
          dashboardManager.updateAllCharts();
        }
      });
    });
  }

  if (elements.tourPerformanceMetric) {
    elements.tourPerformanceMetric.addEventListener('change', function() {
      tourPerformanceMetric = this.value;
      dashboardManager.updateTourPerformanceChart();
    });
  }

  if (elements.exportData) {
    elements.exportData.addEventListener('click', dashboardManager.exportToExcel);
  }

  document.addEventListener('click', function(e) {
    if (e.target.closest('.export-btn')) {
      const btn = e.target.closest('.export-btn');
      if (btn && btn.dataset.chart) {
        dashboardManager.exportChart(btn.dataset.chart);
      }
    }
  });

  if (elements.payoutForm) {
    elements.payoutForm.addEventListener('submit', payoutManager.savePayoutMethod);
    if (elements.payoutMethod) {
      elements.payoutMethod.addEventListener('change', payoutManager.toggleBankFields);
      payoutManager.toggleBankFields();
    }
  }

  navigationManager.handleSidebarNavigation();
  navigationManager.handleSidebarToggle();
  navigationManager.handleSearchForm();
};

// Initialize App
const initApp
