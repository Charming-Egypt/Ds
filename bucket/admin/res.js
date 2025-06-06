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

// Enhanced Error Handling Class
class AppError extends Error {
  constructor(message, type = 'error', details = null) {
    super(message);
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  log() {
    console.error(`[${this.timestamp}] ${this.type.toUpperCase()}: ${this.message}`);
    if (this.details) console.error('Details:', this.details);
  }
}

// Enhanced Security Utilities
const securityUtils = {
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input.trim()
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  },
  validateEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  validatePhone: (phone) => {
    return /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(phone);
  },
  escapeHtml: (unsafe) => {
    if (!unsafe) return '';
    return unsafe.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

// Performance Optimizations
const performanceUtils = {
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  memoize: (func) => {
    const cache = new Map();
    return function(...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  }
};

// Enhanced UI Utilities
const uiUtils = {
  showToast: (message, type = 'success', duration = 3000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
          type === 'error' ? 'fa-exclamation-circle' : 
          'fa-exclamation-triangle'} mr-2" aria-hidden="true"></i>
        <span>${securityUtils.escapeHtml(message)}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeIn 0.3s reverse';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  },
  showLoading: (elementId = 'spinner') => {
    const spinner = document.getElementById(elementId);
    if (spinner) {
      spinner.classList.remove('hidden');
      spinner.setAttribute('aria-busy', 'true');
    }
  },
  hideLoading: (elementId = 'spinner') => {
    const spinner = document.getElementById(elementId);
    if (spinner) {
      spinner.classList.add('hidden');
      spinner.setAttribute('aria-busy', 'false');
    }
  },
  disableForm: (formId) => {
    const form = document.getElementById(formId);
    if (form) {
      const elements = form.elements;
      for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = true;
      }
    }
  },
  enableForm: (formId) => {
    const form = document.getElementById(formId);
    if (form) {
      const elements = form.elements;
      for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = false;
      }
    }
  },
  formatCurrency: (num, currency = 'EGP') => {
    const numberValue = typeof num === 'string' ? parseFloat(num) || 0 : num || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numberValue);
  },
  formatDate: (dateString, options = {}) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      return date.toLocaleDateString('en-US', {...defaultOptions, ...options});
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return 'Invalid Date';
    }
  }
};

// Data Validation Utilities
const validationUtils = {
  validateTripData: (data) => {
    const errors = [];
    if (!data.name || data.name.length < 5) errors.push('Name must be at least 5 characters');
    if (isNaN(data.price) || data.price <= 0) errors.push('Price must be a positive number');
    if (!data.duration) errors.push('Duration is required');
    if (!data.category) errors.push('Category is required');
    if (!data.image) errors.push('Main image is required');
    return errors.length ? errors : null;
  },
  validateBookingData: (data) => {
    const errors = [];
    if (!data.refNumber) errors.push('Reference number is required');
    if (!data.tour) errors.push('Tour name is required');
    if (!data.tripDate) errors.push('Trip date is required');
    if (!data.username) errors.push('Customer name is required');
    if (!data.phone || !securityUtils.validatePhone(data.phone)) errors.push('Valid phone number is required');
    return errors.length ? errors : null;
  },
  validatePayoutData: (data) => {
    const errors = [];
    if (!data.method) errors.push('Payout method is required');
    if (!data.name) errors.push('Account name is required');
    if (!data.accountNumber) errors.push('Account number is required');
    if (data.method === 'bankAccount') {
      if (!data.bankName) errors.push('Bank name is required');
      if (!data.branchName) errors.push('Branch name is required');
    }
    return errors.length ? errors : null;
  }
};

// DOM Elements Manager
class DomManager {
  constructor() {
    this.elements = {
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
      userName: document.getElementById('userName'),
      userEmail: document.getElementById('userEmail'),
      userPhone: document.getElementById('userPhone'),
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
      // Payout Elements
      payoutMethod: document.getElementById("payoutMethod"),
      payoutName: document.getElementById("payoutName"),
      accountNumber: document.getElementById("accountNumber"),
      bankName: document.getElementById("bankName"),
      branchName: document.getElementById("branchName"),
      savePayoutBtn: document.getElementById("savePayoutBtn"),
      // Bookings Elements
      bookingsTableBody: document.getElementById('bookingsTableBody'),
      toast: document.getElementById('toast'),
      searchInput: document.getElementById('searchInput'),
      statusFilter: document.getElementById('statusFilter'),
      dateFilter: document.getElementById('dateFilter'),
      bookingDetailsModal: document.getElementById('bookingDetailsModal'),
      bookingDetailsContent: document.getElementById('bookingDetailsContent'),
      prevPageBtn: document.getElementById('prevPage'),
      nextPageBtn: document.getElementById('nextPage'),
      currentPageSpan: document.getElementById('currentPage'),
      totalPagesSpan: document.getElementById('totalPages'),
      startItemSpan: document.getElementById('startItem'),
      endItemSpan: document.getElementById('endItem'),
      totalItemsSpan: document.getElementById('totalItems')
    };
  }

  getElement(id) {
    return this.elements[id] || document.getElementById(id);
  }

  showElement(id) {
    const el = this.getElement(id);
    if (el) el.classList.remove('hidden');
  }

  hideElement(id) {
    const el = this.getElement(id);
    if (el) el.classList.add('hidden');
  }

  setElementText(id, text) {
    const el = this.getElement(id);
    if (el) el.textContent = text;
  }

  setElementHTML(id, html) {
    const el = this.getElement(id);
    if (el) el.innerHTML = html;
  }

  addClass(id, className) {
    const el = this.getElement(id);
    if (el) el.classList.add(className);
  }

  removeClass(id, className) {
    const el = this.getElement(id);
    if (el) el.classList.remove(className);
  }

  setInputValue(id, value) {
    const el = this.getElement(id);
    if (el) el.value = value;
  }

  getInputValue(id) {
    const el = this.getElement(id);
    return el ? el.value : null;
  }

  disableElement(id) {
    const el = this.getElement(id);
    if (el) el.disabled = true;
  }

  enableElement(id) {
    const el = this.getElement(id);
    if (el) el.disabled = false;
  }

  addEventListener(id, event, callback) {
    const el = this.getElement(id);
    if (el) el.addEventListener(event, callback);
  }
}

// App State Manager
class StateManager {
  constructor() {
    this.state = {
      currentUser: null,
      currentUserRole: null,
      allTrips: {},
      allBookings: [],
      filteredBookings: [],
      currentPage: 1,
      tripsPerPage: 10,
      bookingsPerPage: 10,
      tripsCache: null,
      bookingsCache: null,
      lastTripsFetchTime: 0,
      lastBookingsFetchTime: 0,
      activeTab: 'all',
      currentFilters: {
        search: '',
        status: 'all',
        date: null
      },
      currentPeriod: 'week',
      tourPerformanceMetric: 'bookings',
      realTimeListeners: {}
    };
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  updateCurrentUser(user) {
    this.state.currentUser = user;
  }

  updateUserRole(role) {
    this.state.currentUserRole = role;
  }

  updateTrips(trips) {
    this.state.allTrips = trips;
    this.state.lastTripsFetchTime = Date.now();
  }

  updateBookings(bookings) {
    this.state.allBookings = bookings;
    this.state.lastBookingsFetchTime = Date.now();
  }

  updateFilteredBookings(bookings) {
    this.state.filteredBookings = bookings;
  }

  updateCurrentPage(page) {
    this.state.currentPage = page;
  }

  updateActiveTab(tab) {
    this.state.activeTab = tab;
  }

  updateFilters(filters) {
    this.state.currentFilters = { ...this.state.currentFilters, ...filters };
  }

  addRealTimeListener(ref, event, callback) {
    const listenerKey = `${ref}_${event}`;
    if (this.state.realTimeListeners[listenerKey]) {
      // Remove existing listener if any
      database.ref(ref).off(event, this.state.realTimeListeners[listenerKey]);
    }
    const listener = database.ref(ref).on(event, callback);
    this.state.realTimeListeners[listenerKey] = listener;
  }

  removeAllRealTimeListeners() {
    Object.entries(this.state.realTimeListeners).forEach(([key, listener]) => {
      const [ref, event] = key.split('_');
      database.ref(ref).off(event, listener);
    });
    this.state.realTimeListeners = {};
  }
}

// Trip Manager with Enhanced Features
class TripManager {
  constructor(domManager, stateManager) {
    this.dom = domManager;
    this.state = stateManager;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Form submission
    if (this.dom.getElement('tripForm')) {
      this.dom.addEventListener('tripForm', 'submit', (e) => this.saveTrip(e));
    }
    // Add buttons for dynamic fields
    this.dom.addEventListener('addImageBtn', 'click', () => this.createArrayInput('imageList', 'Image URL'));
    this.dom.addEventListener('addVideoBtn', 'click', () => this.createVideoInput());
    this.dom.addEventListener('addIncludedBtn', 'click', () => this.createArrayInput('includedList', 'Included item'));
    this.dom.addEventListener('addNotIncludedBtn', 'click', () => this.createArrayInput('notIncludedList', 'Not included item'));
    this.dom.addEventListener('addTimelineBtn', 'click', () => this.createTimelineInput());
    this.dom.addEventListener('addWhatToBringBtn', 'click', () => this.createArrayInput('whatToBringList', 'What to bring item'));
    this.dom.addEventListener('addTourTypeBtn', 'click', () => this.createTourTypeInput());
    // Navigation buttons
    this.dom.addEventListener('newTripBtn', 'click', () => this.showNewTripForm());
    this.dom.addEventListener('emptyStateNewTripBtn', 'click', () => this.showNewTripForm());
    this.dom.addEventListener('cancelBtn', 'click', () => this.showListSection());
    this.dom.addEventListener('tripListTab', 'click', () => this.showListSection());
    this.dom.addEventListener('tripEditorTab', 'click', () => this.showEditorSection());
    this.dom.addEventListener('logoutBtn', 'click', () => this.logout());
  }

  resetForm() {
    const form = this.dom.getElement('tripForm');
    if (form) form.reset();
    this.dom.setInputValue('tripId', '');
    this.dom.setInputValue('ownerId', '');
    this.dom.setInputValue('bookingLink', '');
    this.dom.setElementText('editorTitle', 'Create New Trip');
    this.dom.hideElement('deleteBtn');
    // Clear all dynamic lists
    this.dom.setElementHTML('imageList', '');
    this.dom.setElementHTML('videoList', '');
    this.dom.setElementHTML('includedList', '');
    this.dom.setElementHTML('notIncludedList', '');
    this.dom.setElementHTML('timelineList', '');
    this.dom.setElementHTML('whatToBringList', '');
    this.dom.setElementHTML('tourTypeList', '');
  }

  showListSection() {
    this.dom.hideElement('tripEditorSection');
    this.dom.showElement('tripListSection');
    this.dom.addClass('tripListTab', 'tab-active');
    this.dom.removeClass('tripEditorTab', 'tab-active');
  }

  showEditorSection() {
    this.dom.hideElement('tripListSection');
    this.dom.showElement('tripEditorSection');
    this.dom.removeClass('tripListTab', 'tab-active');
    this.dom.addClass('tripEditorTab', 'tab-active');
  }

  showNewTripForm() {
    this.resetForm();
    this.showEditorSection();
  }

  createArrayInput(containerId, placeholder, value = '') {
    const container = this.dom.getElement(containerId);
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'array-item flex items-center gap-2 mb-2';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    input.placeholder = placeholder;
    input.value = value;
    input.setAttribute('aria-label', placeholder);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.setAttribute('aria-label', 'Remove item');
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
    return input;
  }

  createVideoInput() {
    const container = this.dom.getElement('videoList');
    if (!container) return null;
    const videoDiv = document.createElement('div');
    videoDiv.className = 'array-item mb-4 p-2 border border-gray-600 rounded';
    const thumbnailInput = document.createElement('input');
    thumbnailInput.type = 'text';
    thumbnailInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    thumbnailInput.placeholder = 'Thumbnail URL';
    thumbnailInput.setAttribute('aria-label', 'Video thumbnail URL');
    const videoUrlInput = document.createElement('input');
    videoUrlInput.type = 'text';
    videoUrlInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    videoUrlInput.placeholder = 'Video URL';
    videoUrlInput.setAttribute('aria-label', 'Video URL');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded mt-2';
    removeBtn.innerHTML = '<i class="fas fa-times mr-1"></i> Remove Video';
    removeBtn.setAttribute('aria-label', 'Remove video');
    removeBtn.addEventListener('click', () => videoDiv.remove());
    videoDiv.appendChild(thumbnailInput);
    videoDiv.appendChild(videoUrlInput);
    videoDiv.appendChild(removeBtn);
    container.appendChild(videoDiv);
  }

  createTimelineInput(timelineItem = { time: '', title: '', description: '' }) {
    const container = this.dom.getElement('timelineList');
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'array-item mb-4 p-3 border border-gray-600 rounded';
    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    timeInput.placeholder = 'Time (e.g., 09:00 AM)';
    timeInput.value = timelineItem.time || '';
    timeInput.setAttribute('aria-label', 'Timeline time');
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    titleInput.placeholder = 'Title';
    titleInput.value = timelineItem.title || '';
    titleInput.setAttribute('aria-label', 'Timeline title');
    const descInput = document.createElement('textarea');
    descInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    descInput.placeholder = 'Description';
    descInput.value = timelineItem.description || '';
    descInput.setAttribute('aria-label', 'Timeline description');
    descInput.rows = 2;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded mt-2';
    removeBtn.innerHTML = '<i class="fas fa-times mr-1"></i> Remove Timeline Item';
    removeBtn.setAttribute('aria-label', 'Remove timeline item');
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(timeInput);
    div.appendChild(titleInput);
    div.appendChild(descInput);
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(removeBtn);
    container.appendChild(div);
    return { timeInput, titleInput, descInput };
  }

  createTourTypeInput(key = '', value = '') {
    const container = this.dom.getElement('tourTypeList');
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'array-item grid grid-cols-5 gap-2 items-center mb-2 p-2 border border-gray-600 rounded';
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'col-span-3 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    keyInput.placeholder = 'Service Name';
    keyInput.value = key || '';
    keyInput.setAttribute('aria-label', 'Tour type name');
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'col-span-1 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    valueInput.placeholder = 'Price';
    valueInput.value = value || '';
    valueInput.setAttribute('aria-label', 'Tour type price');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item col-span-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.setAttribute('aria-label', 'Remove tour type');
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(keyInput);
    div.appendChild(valueInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
    return { keyInput, valueInput };
  }

  updateDashboardStats() {
    const trips = Object.values(this.state.getState().allTrips).filter(t => t.owner === this.state.getState().currentUser?.uid);
    const approvedTrips = trips.filter(t => t.approved === true || t.approved === 'true');
    const pendingTrips = trips.filter(t => !t.approved || t.approved === 'false');
    this.dom.setElementText('totalTrips', approvedTrips.length);
    this.dom.setElementText('pendingTrips', pendingTrips.length);
  }

  canEditTrips() {
    const role = this.state.getState().currentUserRole;
    return role === 'admin' || role === 'moderator';
  }

  canEditTrip(tripOwnerId) {
    const state = this.state.getState();
    return state.currentUserRole === 'admin' ||
           (state.currentUserRole === 'moderator' && tripOwnerId === state.currentUser?.uid);
  }

  async loadUserRole(userId) {
    try {
      const snapshot = await database.ref('egy_user/' + userId).once('value');
      const userData = snapshot.val();
      if (!userData) {
        throw new AppError('User data not found', 'error');
      }
      this.state.updateUserRole(userData?.role || 'user');
      // Update UI with user data
      this.dom.setElementText('userRole', this.state.getState().currentUserRole);
      this.dom.addClass('userRole', 'role-badge ' + (
        this.state.getState().currentUserRole === 'admin' ? 'role-admin' :
        this.state.getState().currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
      ));
      this.dom.setInputValue('userEmail', userData.email || '');
      this.dom.setInputValue('userPhone', userData.phone || '');
      this.dom.setInputValue('userName', userData.username || '');
      const photoS = this.dom.getElement('profile-s');
      const photoPreview = this.dom.getElement('profile-pic-preview');
      if (userData.photo) {
        photoPreview.src = userData.photo;
        photoS.src = userData.photo;
      } else {
        photoPreview.src = 'https://via.placeholder.com/150'; 
        photoS.src = 'https://via.placeholder.com/150'; 
      }
      // Show/hide new trip button based on role
      if (this.canEditTrips()) {
        this.dom.showElement('newTripBtn');
        this.dom.showElement('emptyStateNewTripBtn');
      } else {
        this.dom.hideElement('newTripBtn');
        this.dom.hideElement('emptyStateNewTripBtn');
      }
      return userData;
    } catch (error) {
      
      uiUtils.showToast(error.message || 'Failed to load user data', 'error');
      throw error;
    }
  }

  async loadPayoutMethod(userId) {
    try {
      const snapshot = await database.ref('egy_user/' + userId + '/payoutMethod').once('value');
      const payoutData = snapshot.val();
      if (!payoutData) {
        return null;
      }
      // Set basic values
      this.dom.setInputValue('payoutMethod', payoutData.method || '');
      // Show/hide bank fields based on method
      const bankFields = this.dom.getElement('bankFields');
      if (bankFields) {
        bankFields.style.display = payoutData.method === 'bankAccount' ? 'block' : 'none';
      }
      this.dom.setInputValue('payoutName', payoutData.name || '');
      this.dom.setInputValue('accountNumber', payoutData.accountNumber || '');
      // Only set bank fields if method is bankAccount
      if (payoutData.method === 'bankAccount') {
        this.dom.setInputValue('bankName', payoutData.bankName || '');
        this.dom.setInputValue('branchName', payoutData.branchName || '');
      }
      return payoutData;
    } catch (error) {
      const appError = new AppError("Error loading payout method", 'error', error);
      appError.log();
      uiUtils.showToast('Failed to load payout information', 'error');
      throw appError;
    }
  }

  async loadTripList(forceRefresh = false) {
    try {
      const state = this.state.getState();
      // Check cache first if not forcing refresh
      if (!forceRefresh && state.tripsCache && Date.now() - state.lastTripsFetchTime < 300000) {
        this.renderTrips(state.tripsCache);
        return;
      }
      uiUtils.showLoading();
      const snapshot = await database.ref('trips').once('value');
      const tripsData = snapshot.val() || {};
      this.state.updateTrips(tripsData);
      this.state.setState({
        tripsCache: Object.values(tripsData),
        lastTripsFetchTime: Date.now()
      });
      // Filter trips to only show those owned by current moderator
      let tripsArray = Object.entries(tripsData)
        .filter(([_, trip]) => trip.owner === state.currentUser?.uid)
        .map(([id, trip]) => ({ id, ...trip }));
      if (tripsArray.length === 0) {
        this.dom.showElement('emptyState');
      } else {
        this.dom.hideElement('emptyState');
      }
      this.renderTrips(tripsArray);
      this.updateDashboardStats();
    } catch (error) {
      const appError = new AppError('Failed to load trips', 'error', error);
      appError.log();
      uiUtils.showToast(appError.message, 'error');
    } finally {
      uiUtils.hideLoading();
    }
  }

  renderTrips(trips) {
    const tripList = this.dom.getElement('tripList');
    if (!tripList) return;
    tripList.innerHTML = '';
    trips.forEach(({ id, ...trip }) => {
      const canEdit = this.canEditTrip(trip.owner);
      const card = document.createElement('div');
      card.className = `trip-card glass-card rounded-xl overflow-hidden ${!canEdit ? 'opacity-80' : ''}`;
      card.setAttribute('aria-labelledby', `trip-title-${id}`);
      // Action buttons (only for users who can edit trips)
      const actionButtons = this.canEditTrips() ? `
        <div class="flex justify-end mt-4 space-x-2">
          <button class="text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-full edit-btn" 
                  data-id="${id}" ${!canEdit ? 'disabled' : ''}
                  aria-label="Edit trip ${securityUtils.escapeHtml(trip.name)}">
            <i class="fas fa-edit mr-1"></i> Edit
          </button>
          <button class="text-xs bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-slate-700 px-3 py-1.5 rounded-full delete-btn" 
                  data-id="${id}" ${!canEdit ? 'disabled' : ''}
                  aria-label="Delete trip ${securityUtils.escapeHtml(trip.name)}">
            <i class="fas fa-trash mr-1"></i> Delete
          </button>
        </div>
      ` : '';
      card.innerHTML = `
        <div class="h-48 bg-slate-200 relative overflow-hidden">
          ${trip.image ? `<img class="h-full w-full object-cover" src="${trip.image}" alt="${securityUtils.escapeHtml(trip.name)}" loading="lazy">` : ''}
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h3 class="font-bold text-white" id="trip-title-${id}">${securityUtils.escapeHtml(trip.name)}</h3>
          </div>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center text-sm text-slate-300">
              <i class="fas fa-clock mr-1" aria-hidden="true"></i>
              <span>${securityUtils.escapeHtml(trip.duration)}</span>
            </div>
            <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
              ${securityUtils.escapeHtml(trip.category)}
            </span>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <div class="text-lg font-bold text-slate-100">${uiUtils.formatCurrency(trip.price)}</div>
            ${trip.owner === this.state.getState().currentUser?.uid ? `
              <span class="text-xs ${trip.approved === true || trip.approved === 'true' ? 
                'bg-emerald-100 text-emerald-800' : 
                'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded-full">
                ${trip.approved === true || trip.approved === 'true' ? 'Active' : 'Pending'}
              </span>
            ` : ''}
          </div>
          ${actionButtons}
        </div>
      `;
      // Add event listeners for edit/delete if user can edit trips
      if (this.canEditTrips()) {
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        if (editBtn && !editBtn.disabled) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadTripForEditing(id, trip);
            this.showEditorSection();
          });
        }
        if (deleteBtn && !deleteBtn.disabled) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${trip.name}"?`)) {
              this.deleteTrip(id);
            }
          });
        }
      }
      tripList.appendChild(card);
    });
  }

  async loadTripForEditing(tripId, tripData) {
    try {
      this.resetForm();
      // Check if user can edit this trip
      if (!this.canEditTrip(tripData.owner)) {
        throw new AppError('You do not have permission to edit this trip', 'error');
      }
      // Set basic info
      this.dom.setInputValue('tripId', tripId);
      this.dom.setInputValue('ownerId', tripData.owner || this.state.getState().currentUser.uid);
      this.dom.setInputValue('name', tripData.name || '');
      this.dom.setInputValue('bookingLink', tripId || '');
      this.dom.setInputValue('price', tripData.price || '');
      this.dom.setInputValue('duration', tripData.duration || '');
      this.dom.setInputValue('category', tripData.category || '');
      this.dom.setInputValue('mainImage', tripData.image || '');
      this.dom.setInputValue('description', tripData.description || '');
      this.dom.setElementText('editorTitle', `Edit ${securityUtils.escapeHtml(tripData.name)}`);
      this.dom.showElement('deleteBtn');
      // Load media
      if (tripData.media?.images) {
        tripData.media.images.forEach(imageUrl => {
          this.createArrayInput('imageList', 'Image URL', imageUrl);
        });
      }
      if (tripData.media?.videos) {
        tripData.media.videos.forEach(video => {
          const videoDiv = document.createElement('div');
          videoDiv.className = 'array-item mb-4 p-2 border border-gray-600 rounded';
          const thumbnailInput = document.createElement('input');
          thumbnailInput.type = 'text';
          thumbnailInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
          thumbnailInput.placeholder = 'Thumbnail URL';
          thumbnailInput.value = video.thumbnail || '';
          thumbnailInput.setAttribute('aria-label', 'Video thumbnail URL');
          const videoUrlInput = document.createElement('input');
          videoUrlInput.type = 'text';
          videoUrlInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
          videoUrlInput.placeholder = 'Video URL';
          videoUrlInput.value = video.videoUrl || '';
          videoUrlInput.setAttribute('aria-label', 'Video URL');
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded mt-2';
          removeBtn.innerHTML = '<i class="fas fa-times mr-1"></i> Remove Video';
          removeBtn.setAttribute('aria-label', 'Remove video');
          removeBtn.addEventListener('click', () => videoDiv.remove());
          videoDiv.appendChild(thumbnailInput);
          videoDiv.appendChild(videoUrlInput);
          videoDiv.appendChild(removeBtn);
          this.dom.getElement('videoList').appendChild(videoDiv);
        });
      }
      // Load included/not included
      if (tripData.included) {
        tripData.included.forEach(item => {
          this.createArrayInput('includedList', 'Included item', item);
        });
      }
      if (tripData.notIncluded) {
        tripData.notIncluded.forEach(item => {
          this.createArrayInput('notIncludedList', 'Not included item', item);
        });
      }
      // Load timeline
      if (tripData.timeline) {
        tripData.timeline.forEach(item => {
          this.createTimelineInput(item);
        });
      }
      // Load what to bring
      if (tripData.whatToBring) {
        tripData.whatToBring.forEach(item => {
          this.createArrayInput('whatToBringList', 'What to bring item', item);
        });
      }
      // Load tour types
      if (tripData.tourtype) {
        Object.entries(tripData.tourtype).forEach(([key, value]) => {
          this.createTourTypeInput(key, value);
        });
      }
    } catch (error) {
      
      uiUtils.showToast(error.message, 'error');
      this.showListSection();
    }
  }

  async saveTrip(e) {
    e.preventDefault();
    try {
      // Check if user can edit trips
      if (!this.canEditTrips()) {
        throw new AppError('You do not have permission to create or edit trips', 'error');
      }
      uiUtils.showLoading();
      this.dom.disableElement('saveBtn');
      // Sanitize inputs
      const sanitizedData = {
        name: securityUtils.sanitizeInput(this.dom.getInputValue('name')),
        bookingLink: securityUtils.sanitizeInput(this.dom.getInputValue('bookingLink')),
        price: parseFloat(securityUtils.sanitizeInput(this.dom.getInputValue('price'))),
        duration: securityUtils.sanitizeInput(this.dom.getInputValue('duration')),
        category: securityUtils.sanitizeInput(this.dom.getInputValue('category')),
        image: securityUtils.sanitizeInput(this.dom.getInputValue('mainImage')),
        description: securityUtils.sanitizeInput(this.dom.getInputValue('description'))
      };
      // Validate data
      const validationErrors = validationUtils.validateTripData(sanitizedData);
      if (validationErrors) {
        throw new AppError(validationErrors.join(', '), 'error');
      }
      const tripId = sanitizedData.bookingLink.trim().toLowerCase().replace(/\s+/g, '-');
      const tripData = {
        approved: 'false',
        ...sanitizedData,
        owner: this.dom.getInputValue('ownerId') || this.state.getState().currentUser.uid,
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
      const imageInputs = this.dom.getElement('imageList').querySelectorAll('input');
      imageInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.media.images.push(securityUtils.sanitizeInput(input.value));
        }
      });
      // Get video data
      const videoDivs = this.dom.getElement('videoList').querySelectorAll('.array-item');
      videoDivs.forEach(div => {
        const thumbnail = securityUtils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
        const videoUrl = securityUtils.sanitizeInput(div.querySelector('input:nth-child(2)').value);
        if (thumbnail && videoUrl) {
          tripData.media.videos.push({
            thumbnail,
            videoUrl
          });
        }
      });
      // Get included items
      const includedInputs = this.dom.getElement('includedList').querySelectorAll('input');
      includedInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.included.push(securityUtils.sanitizeInput(input.value));
        }
      });
      // Get not included items
      const notIncludedInputs = this.dom.getElement('notIncludedList').querySelectorAll('input');
      notIncludedInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.notIncluded.push(securityUtils.sanitizeInput(input.value));
        }
      });
      // Get timeline items
      const timelineDivs = this.dom.getElement('timelineList').querySelectorAll('.array-item');
      timelineDivs.forEach(div => {
        const time = securityUtils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
        const title = securityUtils.sanitizeInput(div.querySelector('input:nth-child(2)').value);
        const description = securityUtils.sanitizeInput(div.querySelector('textarea').value);
        if (time && title && description) {
          tripData.timeline.push({
            time,
            title,
            description
          });
        }
      });
      // Get what to bring items
      const whatToBringInputs = this.dom.getElement('whatToBringList').querySelectorAll('input');
      whatToBringInputs.forEach(input => {
        if (input.value.trim()) {
          tripData.whatToBring.push(securityUtils.sanitizeInput(input.value));
        }
      });
      // Get tour types
      const tourTypeDivs = this.dom.getElement('tourTypeList').querySelectorAll('.array-item');
      tourTypeDivs.forEach(div => {
        const key = securityUtils.sanitizeInput(div.querySelector('input:nth-child(1)').value);
        const value = parseFloat(securityUtils.sanitizeInput(div.querySelector('input:nth-child(2)').value));
        if (key && !isNaN(value)) {
          tripData.tourtype[key] = value;
        }
      });
      // Check if this is an existing trip
      const isExistingTrip = this.dom.getInputValue('tripId') && this.dom.getInputValue('tripId') !== '';
      if (isExistingTrip) {
        // For existing trips, we need to verify ownership before updating
        const snapshot = await database.ref('trips/' + tripId).once('value');
        const existingTrip = snapshot.val();
        if (!existingTrip) {
          throw new AppError('Trip not found', 'error');
        }
        if (!this.canEditTrip(existingTrip.owner)) {
          throw new AppError('You do not have permission to edit this trip', 'error');
        }
        // Only update changed fields to minimize write operations
        const updates = {};
        Object.keys(tripData).forEach(key => {
          if (JSON.stringify(tripData[key]) !== JSON.stringify(existingTrip[key])) {
            updates[key] = tripData[key];
          }
        });
        if (Object.keys(updates).length === 0) {
          throw new AppError('No changes detected', 'warning');
        }
        // Add lastUpdated to updates
        updates.lastUpdated = Date.now();
        // Perform the update
        await database.ref('trips/' + tripId).update(updates);
        uiUtils.showToast('Trip updated successfully!');
      } else {
        // For new trips, just create them
        await database.ref('trips/' + tripId).set(tripData);
        uiUtils.showToast('Trip created successfully!');
      }
      // Refresh data and UI
      await this.loadTripList(true);
      this.resetForm();
      this.showListSection();
    } catch (error) {
      
      uiUtils.showToast(error.message, error.type || 'error');
    } finally {
      uiUtils.hideLoading();
      this.dom.enableElement('saveBtn');
    }
  }

  async deleteTrip(tripId) {
    if (!tripId) return;
    try {
      // Check if user can edit trips
      if (!this.canEditTrips()) {
        throw new AppError('You do not have permission to delete trips', 'error');
      }
      uiUtils.showLoading();
      // First verify ownership
      const snapshot = await database.ref('trips/' + tripId).once('value');
      const tripData = snapshot.val();
      if (!tripData) {
        throw new AppError('Trip not found', 'error');
      }
      if (!this.canEditTrip(tripData.owner)) {
        throw new AppError('You do not have permission to delete this trip', 'error');
      }
      // Delete the trip
      await database.ref('trips/' + tripId).remove();
      uiUtils.showToast('Trip deleted successfully!');
      // Refresh data
      await this.loadTripList(true);
      // Reset form if we were editing this trip
      if (this.dom.getInputValue('tripId') === tripId) {
        this.resetForm();
        this.showListSection();
      }
    } catch (error) {
      
      uiUtils.showToast(error.message, 'error');
    } finally {
      uiUtils.hideLoading();
    }
  }

  logout() {
    auth.signOut().then(() => {
      window.location.href = 'https://www.discover-sharm.com/p/login.html'; 
    }).catch(error => {
      const appError = new AppError('Failed to logout', 'error', error);
      appError.log();
      uiUtils.showToast(appError.message, 'error');
    });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const domManager = new DomManager();
    const stateManager = new StateManager();
    const tripManager = new TripManager(domManager, stateManager);
    // Check auth state
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        stateManager.updateCurrentUser(user);
        try {
          // Load user data and initialize the app
          await tripManager.loadUserRole(user.uid);
          await tripManager.loadTripList();
          await tripManager.loadPayoutMethod(user.uid);
          // Initialize other managers here (BookingManager, DashboardManager, etc.)
        } catch (error) {
          
          uiUtils.showToast(error.message || 'Failed to initialize application', 'error');
        }
      } else {
        window.location.href = "/p/login.html";
      }
    });
  } catch (error) {
    const appError = new AppError('Application initialization failed', 'error', error);
    appError.log();
    uiUtils.showToast(appError.message, 'error');
  }
});
