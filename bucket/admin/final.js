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
  // General
  sidebar: document.getElementById('sidebar'),
  content: document.getElementById('content'),
  menuBtn: document.querySelector('.bx-menu'),
  switchMode: document.getElementById('switch-mode'),
  toast: document.getElementById('toast'),
  // Dashboard
  totalBookings: document.getElementById('totalBookings'),
  totalGuests: document.getElementById('totalGuests'),
  totalRevenue: document.getElementById('totalRevenue'),
  avgRating: document.getElementById('avgRating'),
  dateRangePicker: document.getElementById('dateRangePicker'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  // Trips
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
  // Analytics
  statusChart: document.getElementById('statusChart'),
  trendChart: document.getElementById('trendChart'),
  tourPerformanceChart: document.getElementById('tourPerformanceChart'),
  guestChart: document.getElementById('guestChart'),
  tourPerformanceMetric: document.getElementById('tourPerformanceMetric'),
  statusUpdated: document.getElementById('statusUpdated'),
  trendUpdated: document.getElementById('trendUpdated'),
  guestUpdated: document.getElementById('guestUpdated'),
  exportButtons: document.querySelectorAll('.export-btn'),
  // Reservations
  reservationsList: document.getElementById('reservations-list'),
  emptyReservations: document.getElementById('emptyReservations'),
  // Payout
  payoutForm: document.getElementById('payoutForm'),
  editPayoutMethod: document.getElementById('editPayoutMethod'),
  bankAccount: document.getElementById('bankAccount'),
  wallet: document.getElementById('wallet'),
  bankFields: document.getElementById('bankFields'),
  payoutName: document.getElementById('name'),
  accountNumber: document.getElementById('accountNumber'),
  bankName: document.getElementById('bankName'),
  branchName: document.getElementById('branchName'),
  eventList: document.querySelector('.event-list'),
  // Settings
  userRole: document.getElementById('userRole'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  userPhone: document.getElementById('userPhone'),
  profilePicPreview: document.getElementById('profile-pic-preview'),
  profilePhoto: document.getElementById('profile-photo'),
  settingsForm: document.querySelector('.settings-form'),
  notifications: document.getElementById('notifications'),
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
  allBookings: {}, // Changed from allReservations
  tripsCache: null,
  bookingsCache: null, // Changed from reservationsCache
  lastFetchTime: 0,
  currentPage: 1,
  tripsPerPage: 10,
  bookingsPerPage: 10, // Changed from reservationsPerPage
  selectedDateRange: 'week',
  charts: {}
};

// Utility Functions
const utils = {
  showToast: (message, type = 'success') => {
    elements.toast.className = `toast toast-${type}`;
    elements.toast.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;
    elements.toast.style.display = 'block';
    setTimeout(() => {
      elements.toast.style.animation = 'fadeIn 0.3s reverse';
      setTimeout(() => {
        elements.toast.style.display = 'none';
        elements.toast.style.animation = '';
      }, 300);
    }, 4000);
  },

  showLoading: (btn = elements.saveBtn) => {
    btn.querySelector('#spinner')?.classList.remove('hidden');
    btn.disabled = true;
  },

  hideLoading: (btn = elements.saveBtn) => {
    btn.querySelector('#spinner')?.classList.add('hidden');
    btn.disabled = false;
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
    if (!/^[a-z0-9-]+$/.test(data.bookingLink)) errors.push('Booking Link must contain only lowercase letters, numbers, and hyphens');
    if (isNaN(data.price) || data.price <= 0) errors.push('Price must be a positive number');
    if (!data.duration) errors.push('Duration is required');
    if (!data.category) errors.push('Category is required');
    if (!data.rating || data.rating < 1 || data.rating > 5) errors.push('Rating must be between 1-5');
    if (!data.image || !/^https?:\/\/.*\.(jpg|jpeg|png|gif)$/i.test(data.image)) errors.push('Main Image must be a valid image URL (jpg, jpeg, png, gif)');
    return errors.length ? errors : null;
  },

  validateBookingData: (data) => {
    const errors = [];
    if (!data.customerName) errors.push('Customer Name is required');
    if (!data.tripDate || !moment(data.tripDate, 'YYYY-MM-DD', true).isValid()) errors.push('Valid Trip Date is required');
    if (!data.guests || data.guests <= 0) errors.push('Guests must be a positive number');
    if (!data.totalPrice || data.totalPrice <= 0) errors.push('Total Price must be a positive number');
    return errors.length ? errors : null;
  },

  validatePayoutData: (data) => {
    const errors = [];
    if (!data.name) errors.push('Name is required');
    if (!data.accountNumber) errors.push('Account Number is required');
    if (data.payoutMethod === 'bank_account') {
      if (!data.bankName) errors.push('Bank Name is required');
      if (!data.branchName) errors.push('Branch Name is required');
    }
    return errors.length ? errors : null;
  },

  formatCurrency: (amount) => {
    return `EGP ${parseFloat(amount).toFixed(2)}`;
  },

  formatDate: (timestamp) => {
    return moment(timestamp).format('YYYY-MM-DD');
  },

  retryOperation: async (operation, maxAttempts = 3) => {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
};

// Dashboard Management
const dashboardManager = {
  updateDashboardStats: async () => {
    try {
      const bookingsSnapshot = await utils.retryOperation(() => database.ref('trip-bookings').once('value'));
      const bookings = bookingsSnapshot.val() || {};
      const trips = Object.values(state.allTrips).filter(t => t.owner === state.currentUser?.uid && (t.approved === true || t.approved === 'true'));

      const filteredBookings = Object.values(bookings).filter(r => {
        if (!moment(r.tripDate, 'YYYY-MM-DD', true).isValid()) return false;
        const date = moment(r.tripDate);
        if (state.selectedDateRange === 'week') return date.isAfter(moment().subtract(7, 'days'));
        if (state.selectedDateRange === 'month') return date.isAfter(moment().subtract(1, 'month'));
        if (state.selectedDateRange === 'quarter') return date.isAfter(moment().subtract(3, 'months'));
        if (state.selectedDateRange === 'year') return date.isAfter(moment().subtract(1, 'year'));
        return true;
      });

      const totalBookings = filteredBookings.length;
      const totalGuests = filteredBookings.reduce((sum, r) => sum + (parseInt(r.guests) || 0), 0);
      const totalRevenue = filteredBookings.reduce((sum, r) => sum + (parseFloat(r.totalPrice) || 0), 0);
      const avgRating = trips.length ? (trips.reduce((sum, t) => sum + (parseFloat(t.rating) || 0), 0) / trips.length).toFixed(1) : 0;

      elements.totalBookings.textContent = totalBookings;
      elements.totalGuests.textContent = totalGuests;
      elements.totalRevenue.textContent = utils.formatCurrency(totalRevenue);
      elements.avgRating.textContent = avgRating;
    } catch (error) {
      utils.showToast('Failed to update dashboard stats: ' + error.message, 'error');
    }
  },

  setupDateRangePicker: () => {
    $(elements.dateRangePicker).daterangepicker({
      opens: 'left',
      ranges: {
        'This Week': [moment().startOf('week'), moment().endOf('week')],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'This Quarter': [moment().startOf('quarter'), moment().endOf('quarter')],
        'This Year': [moment().startOf('year'), moment().endOf('year')]
      },
      locale: {
        format: 'YYYY-MM-DD'
      }
    }, (start, end, label) => {
      state.selectedDateRange = label.toLowerCase();
      dashboardManager.updateDashboardStats();
      analyticsManager.updateCharts();
    });

    elements.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedDateRange = btn.dataset.period;
        dashboardManager.updateDashboardStats();
        analyticsManager.updateCharts();
      });
    });
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
    div.className = 'array-item flex items-center gap-2';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'flex-1 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    input.placeholder = placeholder;
    input.value = value;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item text-red-600';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
    return input;
  },

  createTimelineInput: (container, timelineItem = { time: '', title: '', description: '' }) => {
    const div = document.createElement('div');
    div.className = 'array-item space-y-2';
    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    timeInput.placeholder = 'Time (e.g., 09:00 AM)';
    timeInput.value = timelineItem.time || '';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    titleInput.placeholder = 'Title';
    titleInput.value = timelineItem.title || '';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    descInput.placeholder = 'Description';
    descInput.value = timelineItem.description || '';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item text-red-600';
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
    removeBtn.className = 'remove-item text-red-600';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(keyInput);
    div.appendChild(valueInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
    return { keyInput, valueInput };
  },

  updateTripStats: () => {
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

  loadUserRole: async () => {
    try {
      const snapshot = await utils.retryOperation(() => database.ref('egy_user/' + state.currentUser.uid).once('value'));
      const userData = snapshot.val() || {};
      state.currentUserRole = userData.role || 'user';
      elements.userRole.textContent = state.currentUserRole;
      elements.userRole.className = `role-badge ${state.currentUserRole === 'admin' ? 'role-admin' : state.currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'}`;
      elements.userEmail.value = state.currentUser.email;
      elements.userName.value = userData.name || state.currentUser.displayName || '';
      elements.userPhone.value = userData.phone || '';
      elements.profilePicPreview.src = userData.photo || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
      elements.profilePhoto.src = userData.photo || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
      // Load payout data
      const payoutData = userData.payout || {};
      elements.payoutName.value = payoutData.name || '';
      elements.accountNumber.value = payoutData.accountNumber || '';
      elements.bankName.value = payoutData.bankName || '';
      elements.branchName.value = payoutData.branchName || '';
      elements.bankAccount.checked = payoutData.payoutMethod === 'bank_account';
      elements.wallet.checked = payoutData.payoutMethod === 'wallet';
      elements.bankFields.classList.toggle('hidden', payoutData.payoutMethod !== 'bank_account');
      if (tripManager.canEditTrips()) {
        elements.newTripBtn.classList.remove('hidden');
        elements.emptyStateNewTripBtn.classList.remove('hidden');
      }
    } catch (error) {
      utils.showToast('Failed to load user data: ' + error.message, 'error');
    }
  },

  loadTripList: async (forceRefresh = false) => {
    if (!forceRefresh && state.tripsCache && Date.now() - state.lastFetchTime < 300000) {
      tripManager.renderTrips(state.tripsCache);
      return;
    }
    try {
      const snapshot = await utils.retryOperation(() => database.ref('trips').once('value'));
      state.allTrips = snapshot.val() || {};
      state.tripsCache = Object.values(state.allTrips);
      state.lastFetchTime = Date.now();
      let tripsArray = Object.entries(state.allTrips)
        .filter(([_, trip]) => trip.owner === state.currentUser?.uid)
        .map(([id, trip]) => ({ id, ...trip }));
      elements.emptyState.classList.toggle('hidden', tripsArray.length > 0);
      tripManager.renderTrips(tripsArray);
      tripManager.updateTripStats();
      dashboardManager.updateDashboardStats();
    } catch (error) {
      utils.showToast('Failed to load trips: ' + error.message, 'error');
    }
  },

  renderTrips: (trips) => {
    elements.tripList.innerHTML = '';
    trips.forEach(({ id, ...trip }) => {
      const canEdit = tripManager.canEditTrip(trip.owner);
      const card = document.createElement('div');
      card.className = `trip-card glass-card rounded-xl overflow-hidden ${!canEdit ? 'opacity-80' : ''}`;
      let stars = '';
      const rating = parseInt(trip.rating) || 0;
      for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '<span class="rating-star">★</span>' : '<span class="empty-star">★</span>';
      }
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
            <div class="text-lg font-bold text-slate-800">${utils.formatCurrency(trip.price)}</div>
            ${trip.owner === state.currentUser?.uid ? 
              `<span class="text-xs ${trip.approved === true || trip.approved === 'true' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded-full">
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
          editBtn.addEventListener('click', () => {
            tripManager.loadTripForEditing(id, trip);
            tripManager.showEditorSection();
          });
        }
        if (deleteBtn && !deleteBtn.disabled) {
          deleteBtn.addEventListener('click', () => {
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
    if (!tripManager.canEditTrip(tripData.owner)) {
      utils.showToast('You do not have permission to edit this trip', 'error');
      tripManager.showListSection();
      return;
    }
    tripManager.resetForm();
    elements.tripId.value = tripId;
    elements.ownerId.value = tripData.owner || state.currentUser.uid;
    elements.name.value = tripData.name || '';
    elements.bookingLink.value = tripId || '';
    elements.price.value = tripData.price || '';
    elements.duration.value = tripData.duration || '';
    elements.category.value = tripData.category || '';
    elements.rating.value = tripData.rating || '1';
    elements.mainImage.value = tripData.image || '';
    elements.description.value = tripData.description || '';
    elements.editorTitle.textContent = `Edit ${tripData.name}`;
    elements.deleteBtn.classList.remove('hidden');
    if (tripData.media?.images) {
      tripData.media.images.forEach(imageUrl => tripManager.createArrayInput(elements.imageList, 'Image URL', imageUrl));
    }
    if (tripData.media?.videos) {
      tripData.media.videos.forEach(video => {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'array-item space-y-2';
        const thumbnailInput = document.createElement('input');
        thumbnailInput.type = 'text';
        thumbnailInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        thumbnailInput.placeholder = 'Thumbnail URL';
        thumbnailInput.value = video.thumbnail || '';
        const videoUrlInput = document.createElement('input');
        videoUrlInput.type = 'text';
        videoUrlInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        videoUrlInput.placeholder = 'Video URL';
        videoUrlInput.value = video.videoUrl || '';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item text-red-600';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => videoDiv.remove());
        videoDiv.appendChild(thumbnailInput);
        videoDiv.appendChild(videoUrlInput);
        videoDiv.appendChild(removeBtn);
        elements.videoList.appendChild(videoDiv);
      });
    }
    if (tripData.included) {
      tripData.included.forEach(item => tripManager.createArrayInput(elements.includedList, 'Included item', item));
    }
    if (tripData.notIncluded) {
      tripData.notIncluded.forEach(item => tripManager.createArrayInput(elements.notIncludedList, 'Not included item', item));
    }
    if (tripData.timeline) {
      tripData.timeline.forEach(item => tripManager.createTimelineInput(elements.timelineList, item));
    }
    if (tripData.whatToBring) {
      tripData.whatToBring.forEach(item => tripManager.createArrayInput(elements.whatToBringList, 'What to bring item', item));
    }
    if (tripData.tourtype) {
      Object.entries(tripData.tourtype).forEach(([key, value]) => tripManager.createTourTypeInput(elements.tourTypeList, key, value));
    }
  },

  saveTrip: async (e) => {
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
      rating: parseInt(utils.sanitizeInput(elements.rating.value)),
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
      media: { images: [], videos: [] },
      included: [],
      notIncluded: [],
      timeline: [],
      whatToBring: [],
      tourtype: {}
    };
    const imageInputs = elements.imageList.querySelectorAll('input');
    imageInputs.forEach(input => {
      if (input.value.trim()) tripData.media.images.push(utils.sanitizeInput(input.value));
    });
    const videoDivs = elements.videoList.querySelectorAll('.array-item');
    videoDivs.forEach(div => {
      const thumbnail = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const videoUrl = utils.sanitizeInput(div.querySelector('input:nth-child(2)').value);
      if (thumbnail && videoUrl) tripData.media.videos.push({ thumbnail, videoUrl });
    });
    const includedInputs = elements.includedList.querySelectorAll('input');
    includedInputs.forEach(input => {
      if (input.value.trim()) tripData.included.push(utils.sanitizeInput(input.value));
    });
    const notIncludedInputs = elements.notIncludedList.querySelectorAll('input');
    notIncludedInputs.forEach(input => {
      if (input.value.trim()) tripData.notIncluded.push(utils.sanitizeInput(input.value));
    });
    const timelineDivs = elements.timelineList.querySelectorAll('.array-item');
    timelineDivs.forEach(div => {
      const time = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const title = utils.sanitizeInput(div.querySelector('input:nth-child(2)').value);
      const description = utils.sanitizeInput(div.querySelector('input:nth-child(3)').value);
      if (time && title && description) tripData.timeline.push({ time, title, description });
    });
    const whatToBringInputs = elements.whatToBringList.querySelectorAll('input');
    whatToBringInputs.forEach(input => {
      if (input.value.trim()) tripData.whatToBring.push(utils.sanitizeInput(input.value));
    });
    const tourTypeDivs = elements.tourTypeList.querySelectorAll('.array-item');
    tourTypeDivs.forEach(div => {
      const key = utils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
      const value = parseFloat(utils.sanitizeInput(div.querySelector('input:nth-child(2)').value));
      if (key && !isNaN(value)) tripData.tourtype[key] = value);
    });
    const isExistingTrip = elements.tripId.value && elements.tripId.value !== '';
    try {
      if (isExistingTrip) {
        const snapshot = await utils.retryOperation(() => database.ref('trips/' + tripId).once('value'));
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
        await utils.retryOperation(() => database.ref('trips/' + tripId).update(updates));
        utils.showToast('Trip updated successfully!');
      } else {
        await utils.retryOperation(() => database.ref('trips/' + tripId).set(tripData));
        utils.showToast('Trip created successfully!');
      }
      state.tripsCache = null; // Invalidate cache
      await tripManager.loadTripList(true);
      tripManager.resetForm();
      tripManager.showListSection();
    } catch (error) {
      utils.showToast('Failed to ${isExistingTrip ? 'update' : 'create'} trip: ${error.message}', 'error');
      utils.hideLoading();
    } finally {
      utils.hideLoading();
    }
  },

  deleteTrip: async (tripId) => {
    if (!tripId || || !tripManager.canEditTrips()) {
      utils.showToast('You do not have permission to delete trips', 'error');
      return;
    }
    utils.showLoading();
    try {
      const snapshot = await utils.retryOperation(() => database.ref('trips/' + tripId).once('value'));
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
      await utils.retryOperation(() => database.ref('trips/' + tripId).remove());
      utils.showToast('Trip deleted successfully!');
      state.tripsCache = null;
      await tripManager.loadTripList(true);
      if (elements.tripId.value === tripId) {
        tripManager.resetForm();
        tripManager.showListSection();
      }
    } catch (error) {
      utils.showToast('Failed to delete trip: ' + error.message, 'error');
    } finally {
      utils.hideLoading();
    }
  }
};

// Analytics Management
const analyticsManager = {
  initializeCharts: () => {
    state.charts.statusChart = new Chart(elements.statusChart, {
      type: 'pie',
      data: {
        labels: ['Confirmed', 'Pending', 'Cancelled'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
          borderColor: ['#388e3c', '#f57c00', '#d32f2f'],
          borderWidth: 1
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } } }
      });
    });
    state.charts.trendChart = new Chart(elements.trendChart, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Bookings',
          data: [],
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 255, 193, 0.2)',
          fill: true
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: true } }
      });
    };
    state.charts.tourPerformanceChart = new Chart(elements.tourperformanceChart, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Bookings',
          data: [],
          backgroundColor: '#ffc107',
          borderColor: '#ffa000',
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: true } }
      }
      });
    });
    state.charts.guestChart = new Chart(elements.guestChart, {
      type: 'doughnut',
      data: {
        labels: ['Adults', 'Children'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#2196f3', '#ff5722'],
          borderColor: ['#1976d2', '#e64a19'],
          borderWidth: 1
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } }
      }
      });
    };
  },

  updateCharts: async () => {
    try {
      const bookingsSnapshot = await utils.retryOperation(() => database.ref('trip-bookings').once('value'));
      const bookings = bookingsSnapshot.val() || {};
      const filteredBookings = Object.values(bookings).filter(b => {
        if (!moment(b.tripDate, 'YYYY-MM-DD', true).isValid()) return false;
        const date = moment(b.tripDate);
        if (state.selectedDateRange === 'week') return date.isAfter(moment().subtract(7, 'days'));
        if (state.selectedDateRange === 'month') return date.isAfter(moment().subtract(1, 'month'));
        if (state.selectedDateRange === 'quarter') return date.isAfter(moment().subtract(3, 'months'));
        if (state.selectedDateRange === 'year') return date.isAfter(moment().subtract(1, 'year'));
        return true;
      });

      // Status Chart
      const statusCounts = { Confirmed: 0, Pending: 0, Cancelled: 0 };
      filteredBookings.forEach(b => statusCounts[b.status] = (statusCounts[b.status] || 0) + 1);
      state.charts.statusChart.data.datasets[0].data = [statusCounts.Confirmed, statusCounts.Pending, statusCounts.Cancelled];
      state.charts.statusChart.update();
      elements.statusUpdated.textContent = utils.formatDate(Date.now());

      // Trend Chart
      const months = Array.from({ length: 12 }, (_, i) => moment().subtract(i, 'months').format('MMM YY')).reverse();
      const monthlyBookings = months.map(m => filteredBookings.filter(b => moment(b.tripDate).format('MMM YY') === m).length);
      state.charts.trendChart.data.labels = months;
      state.charts.trendChart.data.datasets[0].data = monthlyBookings.reverse();
      state.charts.trendChart.update();
      //elements.trendUpdated.textContent = moment().format('YYYY');

      // Tour Performance Chart
      const metric = elements.tourPerformanceMetric.value;
      const tourData = {};
      filteredBookings.forEach(b => {
        const trip = state.allTrips[b.tripId];
        if (trip && trip.owner === state.currentUser.uid) {
          tourData[trip.name] = tourData[trip.name] || { bookings: 0, revenue: 0 };
          tourData[trip.name].bookings += 1;
          tourData[trip.name].revenue += parseFloat(b.totalPrice) || 0;
        }
      });
      state.charts.tourPerformanceChart.data.labels = Object.keys(tourData);
      state.charts.tourPerformanceChart.data.datasets[0].label = metric === 'bookings' ? 'Bookings' : 'Revenue';
      state.charts.tourPerformanceChart.data.datasets[0].data = Object.values(tourData).map(d => metric === 'bookings' ? d.bookings : d.revenue);
      state.charts.tourPerformanceChart.update();

      // Guest Chart
      const guestCounts = { Adults: 0, Children: 0 };
      filteredBookings.forEach(b => {
        guestCounts.Adults += parseInt(b.guests) || 0;
        guestCounts.Children += parseInt(b.children) || 0;
      });
      state.charts.guestChart.data.datasets[0].data = [guestCounts.Adults, guestCounts.Children];
      state.charts.guestChart.update();
      elements.guestUpdated.textContent = 'Current';
    } catch (error) {
      utils.showToast('Failed to update charts: ' + error.message, 'error');
    }
  },

  setupExportButtons: () => {
    elements.exportButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const chartId = btn.dataset.chart;
        const canvas = elements[chartId];
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${chartId}.png`;
        link.click();
      });
    });
  }
};

// Bookings Management (replacing Reservations)
const bookingsManager = {
  loadBookings: async (forceRefresh = false) => {
    if (!forceRefresh && forceRefresh && state.bookingsCache && Date.now() - state.lastFetchTime < 300000) {
      bookingsManager.renderBookings(state.bookingsCache);
      return;
    }
    try {
      const snapshot = await utils.retryOperation(() => database.ref('trip-bookings').once('value'));
      state.allBookings = snapshot.val() || {};
      state.bookingsCache = Object.values(state.allBookings);
      state.lastFetchTime = Date.now();
      let bookingsArray = Object.entries(state.allBookings)
        .filter(([_, b]) => state.allTrips[b.tripId]?.owner === state.currentUser?.uid)
        .map(([id, b]) => ({ id, ...b }));
      elements.emptyReservations.classList.toggle('hidden', bookingsArray.length > 0);
      bookingsManager.renderBookings(bookingsArray);
    } catch (error) {
      utils.showToast('Failed to load bookings: ' + error.message, 'error');
    }
  },

  renderBookings: (bookings) => {
    elements.reservationsList.innerHTML = '';
    bookings.forEach(({ id, ...b }) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-50 transition-colors';
      row.innerHTML = `
        <td class="px-4 py-3">${id}</td>
        <td class="px-4 py-3">${b.customerName}</td>
        <td class="px-4 py-3">${b.tripDate}</td>
        <td class="px-4 py-3">${b.guests} Adult${b.guests > 1 ? 's' : ''}<br><span class="text-xs text-gray-500">${b.children || 0} Children</span></td>
        <td class="px-4 py-3">${utils.formatCurrency(b.totalPrice)}</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${b.status === 'Confirmed' ? 'green' : b.status === 'Pending' ? 'amber' : 'red'}-100 text-${b.status === 'Confirmed' ? 'green' : b.status === 'Pending' ? 'amber' : 'red'}-800">
            ${b.status}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${b.payment === 'Paid' ? 'blue' : 'gray'}-100 text-${b.payment === 'Paid' ? 'blue' : 'gray'}-800">
            ${b.payment}
          </span>
        </td>
        <td class="px-4 py-3 space-x-2">
          <button class="text-blue-600 hover:underline view-btn" data-id="${id}">View</button>
        </td>
      `;
      row.querySelector('.view-btn').addEventListener('click', () => bookingsManager.viewBooking(id));
      elements.reservationsList.appendChild(row);
    });
  },

  viewBooking: (id) => {
    const booking = state.allBookings[id];
    if (!booking) {
      utils.showToast('Booking not found', 'error');
      return;
    }
    utils.showToast(`Viewing booking ${id}: ${booking.customerName} for ${state.allTrips[booking.tripId]?.name || 'Unknown Trip'}`, 'info');
  }
};

// Payout Management (Updated to use egy_user)
const payoutManager = {
  loadPayoutEvents: async () => {
    try {
      const snapshot = await utils.retryOperation(() => database.ref(`egy_user/${state.currentUser.uid}/payout/events`).once('value'));
      const events = snapshot.val() || {};
      elements.eventList.innerHTML = '';
      Object.entries(events).forEach(([id, event]) => {
        const div = document.createElement('div');
        div.className = 'event-item flex justify-between';
        div.innerHTML = `
          <span class="event-date">${utils.formatDate(event.timestamp)}</span>
          <span class="event-description">${event.description}</span>
        `;
        elements.eventList.appendChild(div);
      });
      if (!Object.keys(events).length) {
        elements.eventList.innerHTML = '<div class="text-center text-gray-600">No payout events found.</div>';
      }
    } catch (error) {
      utils.showToast('Failed to load payout events: ' + error.message, 'error');
    }
  },

  savePayoutMethod: async (e) => {
    e.preventDefault();
    utils.showLoading(elements.editPayoutMethod);
    const payoutData = {
      payoutMethod: elements.bankAccount.checked ? 'bank_account' : 'wallet',
      name: utils.sanitizeInput(elements.payoutName.value),
      accountNumber: utils.sanitizeInput(elements.accountNumber.value),
      bankName: elements.bankAccount.checked ? utils.sanitizeInput(elements.bankName.value) : '',
      branchName: elements.bankAccount.checked ? utils.sanitizeInput(elements.branchName.value) : '',
      lastUpdated: Date.now()
    };
    const validationErrors = utils.validatePayoutData(payoutData);
    if (validationErrors) {
      utils.showToast(validationErrors.join(', '), 'error');
      utils.hideLoading(elements.editPayoutMethod);
      return;
    }
    try {
      await utils.retryOperation(() => database.ref(`egy_user/${state.currentUser.uid}/payout`).update(payoutData));
      // Log payout event
      const eventId = crypto.randomUUID();
      await utils.retryOperation(() => database.ref(`egy_user/${state.currentUser.uid}/payout/events/${eventId}`).set({
        timestamp: Date.now(),
        description: `Updated payout method to ${payoutData.payoutMethod}`
      }));
      utils.showToast('Payout method updated successfully!');
      await payoutManager.loadPayoutEvents();
    } catch (error) {
      utils.showToast('Failed to update payout method: ' + error.message, 'error');
    } finally {
      utils.hideLoading(elements.editPayoutMethod);
    }
  },

  setupPayoutForm: () => {
    elements.bankAccount.addEventListener('change', () => elements.bankFields.classList.remove('hidden'));
    elements.wallet.addEventListener('change', () => elements.bankFields.classList.add('hidden'));
    elements.payoutForm.addEventListener('submit', payoutManager.savePayoutMethod);
  }
};

// Settings Management
const settingsManager = {
  saveSettings: async (e) => {
    e.preventDefault();
    utils.showLoading(elements.settingsForm.querySelector('.save-btn'));
    const userData = {
      name: utils.sanitizeInput(elements.userName.value),
      email: utils.sanitizeInput(elements.userEmail.value),
      phone: utils.sanitizeInput(elements.userPhone.value),
      notifications: elements.notifications.checked,
      lastUpdated: Date.now()
    };
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      utils.showToast('Valid email is required', 'error');
      utils.hideLoading(elements.settingsForm.querySelector('.save-btn'));
      return;
    }
    try {
      await utils.retryOperation(() => database.ref(`egy_user/${state.currentUser.uid}`).update(userData));
      if (userData.email !== state.currentUser.email) {
        await utils.retryOperation(() => state.currentUser.updateEmail(userData.email));
      }
      utils.showToast('Settings updated successfully!');
      await tripManager.loadUserRole();
    } catch (error) {
      utils.showToast('Failed to update settings: ' + error.message, 'error');
    } finally {
      utils.hideLoading(elements.settingsForm.querySelector('.save-btn'));
    }
  }
};

// Event Listeners
const setupEventListeners = () => {
  // Sidebar Toggle
  elements.menuBtn.addEventListener('click', () => {
    elements.sidebar.classList.toggle('hide');
    elements.content.classList.toggle('expand');
  });

  // Theme Switch
  elements.switchMode.addEventListener('change', () => {
    document.body.classList.toggle('dark');
  });

  // Section Navigation
  document.querySelectorAll('.side-menu li[data-section]').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.side-menu li').forEach(l => l.classList.remove('active'));
      li.classList.add('active');
      const section = li.dataset.section;
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`${section}-section`).classList.add('active');
      if (section === 'trips') tripManager.loadTripList();
      if (section === 'reservations') bookingsManager.loadBookings();
      if (section === 'withdraw') {
        tripManager.loadUserRole(); // Reloads payout data
        payoutManager.loadPayoutEvents();
      }
      if (section === 'analytics') analyticsManager.updateCharts();
    });
  });

  // Trip Management
  if (tripManager.canEditTrips()) {
    elements.tripForm.addEventListener('submit', tripManager.saveTrip);
    elements.addImageBtn.addEventListener('click', () => tripManager.createArrayInput(elements.imageList, 'Image URL'));
    elements.addVideoBtn.addEventListener('click', () => {
      const videoDiv = document.createElement('div');
      videoDiv.className = 'array-item space-y-2';
      const thumbnailInput = document.createElement('input');
      thumbnailInput.type = 'text';
      thumbnailInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      thumbnailInput.placeholder = 'Thumbnail URL';
      const videoUrlInput = document.createElement('input');
      videoUrlInput.type = 'text';
      videoUrlInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      videoUrlInput.placeholder = 'Video URL';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-item text-red-600';
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
    elements.newTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
    elements.emptyStateNewTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
  }
  elements.cancelBtn.addEventListener('click', tripManager.showListSection);
  elements.deleteBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this trip?')) {
      tripManager.deleteTrip(elements.tripId.value);
    }
  });
  elements.tripListTab.addEventListener('click', tripManager.showListSection);
  elements.tripEditorTab.addEventListener('click', tripManager.showEditorSection);

  // Analytics
  elements.tourPerformanceMetric.addEventListener('change', analyticsManager.updateCharts);

  // Settings
  elements.settingsForm.addEventListener('submit', settingsManager.saveSettings);

  // Logout
  elements.logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = '/p/login.html';
    }).catch(error => {
      utils.showToast('Failed to logout: 'error');
    });
  });
};

// Initialize App
const initApp = () => {
  // Offline Handling
  database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
      utils.showToast('Offline: Working offline - changes will sync when connection resumes', 'warning');
    });
  });

  // Authentication
  auth.onAuthStateChanged(async user => {
    if (user) {
      state.currentUser = user;
      await tripManager.loadUserRole();
      await tripManager.loadTripList();
      await bookingsManager.loadBookings();
      await payoutManager.loadPayoutEvents();
      analyticsManager.initializeCharts();
      analyticsManager.updateCharts();
      dashboardManager.setupDateRangePicker();
 analyticsManager.setupExportButtons();
      payoutManager.setupPayoutForm();
      setupEventListeners();
    } else {
      window.location.href = '/p/login.html';
    }
  });
});

// Start the app
initApp();
