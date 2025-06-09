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
const storage = firebase.storage();


// Chart Variables
let statusChart, trendChart, guestChart, packagePerformanceChart;
let currentPeriod = 'week';
let bookingData = [];
let filteredBookingData = [];
let packagePerformanceMetric = 'bookings';
let dateRangePicker;

// DOM Elements
const elements = {
  // Package Management Elements
  packageList: document.getElementById('packageList'),
  packageForm: document.getElementById('packageForm'),
  editorTitle: document.getElementById('editorTitle'),
  packageId: document.getElementById('packageId'),
  ownerId: document.getElementById('ownerId'),
  name: document.getElementById('name'),
  bookingLink: document.getElementById('bookingLink'),
  price: document.getElementById('basePrice'),
  duration: document.getElementById('duration'),
  nights: document.getElementById('nights'),
  category: document.getElementById('category'),
  destinations: document.getElementById('destinations'),
  mainImage: document.getElementById('mainImage'),
  description: document.getElementById('description'),
  imageList: document.getElementById('imageList'),
  videoList: document.getElementById('videoList'),
  includedList: document.getElementById('includedList'),
  notIncludedList: document.getElementById('notIncludedList'),
  whatToBringList: document.getElementById('whatToBringList'),
  accommodationOptionsList: document.getElementById('accommodationOptionsList'),
  mealPlanOptionsList: document.getElementById('mealPlanOptionsList'),
  transportationOptionsList: document.getElementById('transportationOptionsList'),
  itineraryList: document.getElementById('itineraryList'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  newPackageBtn: document.getElementById('newPackageBtn'),
  emptyStateNewPackageBtn: document.getElementById('emptyStateNewPackageBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  spinner: document.getElementById('spinner'),
  packageListTab: document.getElementById('packageListTab'),
  packageEditorTab: document.getElementById('packageEditorTab'),
  packageListSection: document.getElementById('packageListSection'),
  packageEditorSection: document.getElementById('packageEditorSection'),
  totalPackages: document.getElementById('totalPackages'),
  pendingPackages: document.getElementById('pendingPackages'),
  userRole: document.getElementById('userRole'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  userPhone: document.getElementById('userPhone'),
  addImageBtn: document.getElementById('addImageBtn'),
  addVideoBtn: document.getElementById('addVideoBtn'),
  addIncludedBtn: document.getElementById('addIncludedBtn'),
  addNotIncludedBtn: document.getElementById('addNotIncludedBtn'),
  addWhatToBringBtn: document.getElementById('addWhatToBringBtn'),
  addAccommodationBtn: document.getElementById('addAccommodationBtn'),
  addMealPlanBtn: document.getElementById('addMealPlanBtn'),
  addTransportationBtn: document.getElementById('addTransportationBtn'),
  addDayBtn: document.getElementById('addDayBtn'),
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
  packagePerformanceMetric: document.getElementById('packagePerformanceMetric'),
  exportData: document.getElementById('exportData'),
  dashboardTab: document.getElementById('dashboardTab'),
  dashboardSection: document.getElementById('dashboardSection'),

  // Payout Elements
  payoutMethod: document.getElementById("payoutMethod"),
  payoutName: document.getElementById("payoutName"),
  accountNumber: document.getElementById("accountNumber"),
  bankName: document.getElementById("bankName"),
  branchName: document.getElementById("branchName"),

  // Booking Elements
  bookingsTableBody: document.getElementById('bookingsTableBody'),
  toast: document.getElementById('toast'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  dateFilter: document.getElementById('dateFilter'),
  bookingDetailsModal: document.getElementById('bookingDetailsModal'),
  bookingDetailsContent: document.getElementById('bookingDetailsContent'),
  
  // Pagination Elements
  prevPageBtn: document.getElementById('prevPage'),
  nextPageBtn: document.getElementById('nextPage'),
  currentPageSpan: document.getElementById('currentPage'),
  totalPagesSpan: document.getElementById('totalPages'),
  startItemSpan: document.getElementById('startItem'),
  endItemSpan: document.getElementById('endItem'),
  totalItemsSpan: document.getElementById('totalItems')
};

// Global Variables
let allBookings = [];
let filteredBookings = [];
let currentUserId = null;
let currentUser = null;
let realTimeListener = null;
let flatpickrInstance = null;
let activeTab = 'all';
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {
  search: '',
  status: 'all',
  date: null
};

// App State
const state = {
  currentUser: null,
  currentUserRole: null,
  allPackages: {},
  currentPage: 1,
  packagesPerPage: 10,
  packagesCache: null,
  lastFetchTime: 0
};

// Utility Functions
const utils = {
  showToast: (message, type = 'success') => {
    const toast = elements.toast;
    
    toast.textContent = message;
    toast.className = `toast toast-${type} show top-toast`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
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
    if (!input) return '';
    return input.toString().trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  validatePackageData: (data) => {
    const errors = [];
    if (!data.name || data.name.length < 5) errors.push('Name must be at least 5 characters');
    if (isNaN(data.price) || data.price <= 0) errors.push('Base price must be a positive number');
    if (!data.duration || isNaN(data.duration)) errors.push('Duration is required and must be a number');
    if (!data.nights || isNaN(data.nights)) errors.push('Nights is required and must be a number');
    if (!data.category) errors.push('Category is required');
    if (!data.destinations) errors.push('Destinations are required');
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
  },

  formatCurrency: (num) => {
    const numberValue = typeof num === 'string' ? parseFloat(num) || 0 : num || 0;
    return 'EGP ' + numberValue.toFixed(2);
  },

  formatTripDate: (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const [year, month, day] = dateString.split('-');
      return `${year}-${month.padStart(2, '0')}-${parseInt(day, 10)}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }
};

// Package Management Functions
const packageManager = {
  resetForm: () => {
    if (elements.packageForm) elements.packageForm.reset();
    if (elements.packageId) elements.packageId.value = '';
    if (elements.ownerId) elements.ownerId.value = '';
    if (elements.bookingLink) elements.bookingLink.value = '';
    if (elements.editorTitle) elements.editorTitle.textContent = 'Create New Package';
    if (elements.deleteBtn) elements.deleteBtn.classList.add('hidden');
    
    // Clear all dynamic lists
    if (elements.imageList) elements.imageList.innerHTML = '';
    if (elements.videoList) elements.videoList.innerHTML = '';
    if (elements.includedList) elements.includedList.innerHTML = '';
    if (elements.notIncludedList) elements.notIncludedList.innerHTML = '';
    if (elements.whatToBringList) elements.whatToBringList.innerHTML = '';
    if (elements.accommodationOptionsList) elements.accommodationOptionsList.innerHTML = '';
    if (elements.mealPlanOptionsList) elements.mealPlanOptionsList.innerHTML = '';
    if (elements.transportationOptionsList) elements.transportationOptionsList.innerHTML = '';
    if (elements.itineraryList) elements.itineraryList.innerHTML = '';
  },

  showListSection: () => {
    if (!elements.packageListSection || !elements.packageEditorSection || 
        !elements.packageListTab || !elements.packageEditorTab) return;
        
    elements.packageListSection.classList.remove('hidden');
    elements.packageEditorSection.classList.add('hidden');
    elements.packageListTab.classList.add('tab-active');
    elements.packageEditorTab.classList.remove('tab-active');
  },

  showEditorSection: () => {
    if (!elements.packageListSection || !elements.packageEditorSection || 
        !elements.packageListTab || !elements.packageEditorTab) return;
        
    elements.packageListSection.classList.add('hidden');
    elements.packageEditorSection.classList.remove('hidden');
    elements.packageListTab.classList.remove('tab-active');
    elements.packageEditorTab.classList.add('tab-active');
  },

  createArrayInput: (container, placeholder, value = '') => {
    if (!container) return null;
    
    const div = document.createElement('div');
    div.className = 'array-item flex items-center gap-2 mb-2';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    input.placeholder = placeholder;
    input.value = value;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return input;
  },

  createAccommodationInput: (container, accommodation = { name: '', description: '', price: '' }) => {
    if (!container) return null;
    
    const div = document.createElement('div');
    div.className = 'array-item grid grid-cols-1 md:grid-cols-3 gap-2 mb-3';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    nameInput.placeholder = 'Accommodation Name';
    nameInput.value = accommodation.name || '';
    
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    descInput.placeholder = 'Description';
    descInput.value = accommodation.description || '';
    
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    priceInput.placeholder = 'Price (EGP)';
    priceInput.value = accommodation.price || '';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(nameInput);
    div.appendChild(descInput);
    div.appendChild(priceInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return { nameInput, descInput, priceInput };
  },

  createMealPlanInput: (container, mealPlan = { name: '', description: '', price: '' }) => {
    if (!container) return null;
    
    const div = document.createElement('div');
    div.className = 'array-item grid grid-cols-1 md:grid-cols-3 gap-2 mb-3';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    nameInput.placeholder = 'Meal Plan Name';
    nameInput.value = mealPlan.name || '';
    
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    descInput.placeholder = 'Description';
    descInput.value = mealPlan.description || '';
    
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    priceInput.placeholder = 'Price (EGP)';
    priceInput.value = mealPlan.price || '';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(nameInput);
    div.appendChild(descInput);
    div.appendChild(priceInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return { nameInput, descInput, priceInput };
  },

  createTransportationInput: (container, transportation = { type: '', description: '', price: '' }) => {
    if (!container) return null;
    
    const div = document.createElement('div');
    div.className = 'array-item grid grid-cols-1 md:grid-cols-3 gap-2 mb-3';
    
    const typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    typeInput.placeholder = 'Transport Type';
    typeInput.value = transportation.type || '';
    
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    descInput.placeholder = 'Description';
    descInput.value = transportation.description || '';
    
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
    priceInput.placeholder = 'Price (EGP)';
    priceInput.value = transportation.price || '';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(typeInput);
    div.appendChild(descInput);
    div.appendChild(priceInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return { typeInput, descInput, priceInput };
  },

  createDayInput: (container, day = { title: '', description: '', activities: [] }) => {
    if (!container) return null;
    
    const div = document.createElement('div');
    div.className = 'day-item glass-card p-4 rounded-lg mb-4';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500 mb-2';
    titleInput.placeholder = 'Day Title (e.g., Day 1: Arrival)';
    titleInput.value = day.title || '';
    
    const descInput = document.createElement('textarea');
    descInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500 mb-2';
    descInput.placeholder = 'Day Description';
    descInput.rows = 3;
    descInput.value = day.description || '';
    
    const activitiesDiv = document.createElement('div');
    activitiesDiv.className = 'activities-list mt-2';
    
    // Add existing activities
    if (day.activities && day.activities.length > 0) {
      day.activities.forEach(activity => {
        packageManager.createArrayInput(activitiesDiv, 'Activity', activity);
      });
    }
    
    const addActivityBtn = document.createElement('button');
    addActivityBtn.type = 'button';
    addActivityBtn.className = 'text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-full shadow-sm mb-2';
    addActivityBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add Activity';
    addActivityBtn.addEventListener('click', () => {
      packageManager.createArrayInput(activitiesDiv, 'Activity');
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.addEventListener('click', () => div.remove());
    
    div.appendChild(titleInput);
    div.appendChild(descInput);
    div.appendChild(addActivityBtn);
    div.appendChild(activitiesDiv);
    div.appendChild(removeBtn);
    container.appendChild(div);
    
    return { titleInput, descInput, activitiesDiv };
  },

  updateDashboardStats: () => {
    if (!state.currentUser || !elements.totalPackages || !elements.pendingPackages) return;
    
    const packages = Object.values(state.allPackages).filter(p => p.owner === state.currentUser?.uid);
    const approvedPackages = packages.filter(p => p.approved === true || p.approved === 'true');
    const pendingPackages = packages.filter(p => !p.approved || p.approved === 'false');
    
    elements.totalPackages.textContent = approvedPackages.length;
    elements.pendingPackages.textContent = pendingPackages.length;
  },

  canEditPackages: () => {
    return state.currentUserRole === 'admin' || state.currentUserRole === 'moderator';
  },

  canEditPackage: (packageOwnerId) => {
    return state.currentUserRole === 'admin' || 
           (state.currentUserRole === 'moderator' && packageOwnerId === state.currentUser?.uid);
  },

  loadUserRole: (userId) => {
    if (!userId || !elements.userRole) return Promise.resolve();
    
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
      
      if (elements.userEmail) elements.userEmail.value = userData?.email || '';
      if (elements.userPhone) elements.userPhone.value = userData?.phone || '';
      if (elements.userName) elements.userName.value = userData?.username || '';
      
      const photoS = document.getElementById('profile-s');
      const photoPreview = document.getElementById('profile-pic-preview');
      if (userData?.photo) {
        if (photoPreview) photoPreview.src = userData.photo;
        if (photoS) photoS.src = userData.photo;
      } else {
        if (photoPreview) photoPreview.src = 'https://via.placeholder.com/150';
        if (photoS) photoS.src = 'https://via.placeholder.com/150';
      }
      
      // Show/hide new package button based on role
      if (packageManager.canEditPackages()) {
        if (elements.newPackageBtn) elements.newPackageBtn.classList.remove('hidden');
        if (elements.emptyStateNewPackageBtn) elements.emptyStateNewPackageBtn.classList.remove('hidden');
      }
    }).catch(error => {
      console.error("Error loading user role:", error);
    });
  },

  loadPayout: (userId) => {
    if (!userId) return Promise.resolve();
    
    return database.ref('egy_user/' + userId + '/payoutMethod').once('value').then(snapshot => {
      const payoutData = snapshot.val();
      if (!payoutData) return;

      // Set basic values
      if (elements.payoutMethod && payoutData.method) {
        elements.payoutMethod.value = payoutData.method;
        
        // Show/hide bank fields based on method
        const bankFields = document.getElementById('bankFields');
        if (bankFields) {
          bankFields.style.display = payoutData.method === 'bankAccount' ? 'block' : 'none';
        }
      }

      if (elements.payoutName && payoutData.name) {
        elements.payoutName.value = payoutData.name;
      }
      if (elements.accountNumber && payoutData.accountNumber) {
        elements.accountNumber.value = payoutData.accountNumber;
      }
      
      // Only set bank fields if method is bankAccount
      if (payoutData.method === 'bankAccount') {
        if (elements.bankName && payoutData.bankName) {
          elements.bankName.value = payoutData.bankName;
        }
        if (elements.branchName && payoutData.branchName) {
          elements.branchName.value = payoutData.branchName;
        }
      }
    }).catch(error => {
      console.error("Error loading payout method:", error);
      utils.showToast("Failed to load payout information", "error");
    });
  },

  loadPackageList: (forceRefresh = false) => {
    if (!database) return Promise.resolve();
    
    // Check cache first if not forcing refresh
    if (!forceRefresh && state.packagesCache && Date.now() - state.lastFetchTime < 300000) {
      packageManager.renderPackages(state.packagesCache);
      return Promise.resolve();
    }

    return database.ref('packages').once('value').then(snapshot => {
      state.allPackages = snapshot.val() || {};
      state.packagesCache = Object.values(state.allPackages);
      state.lastFetchTime = Date.now();
      
      // Filter packages to only show those owned by current moderator
      let packagesArray = Object.entries(state.allPackages)
        .filter(([_, pkg]) => pkg.owner === state.currentUser?.uid)
        .map(([id, pkg]) => ({ id, ...pkg }));
      
      if (packagesArray.length === 0 && elements.emptyState) {
        elements.emptyState.classList.remove('hidden');
      } else if (elements.emptyState) {
        elements.emptyState.classList.add('hidden');
      }
      
      packageManager.renderPackages(packagesArray);
      packageManager.updateDashboardStats();
    }).catch(error => {
      console.error("Error loading packages:", error);
      utils.showToast('Failed to load packages: ' + error.message, 'error');
    });
  },

  renderPackages: (packages) => {
    if (!elements.packageList) return;
    
    elements.packageList.innerHTML = '';
    
    if (!packages || packages.length === 0) {
      if (elements.emptyState) elements.emptyState.classList.remove('hidden');
      return;
    }
    
    packages.forEach(({ id, ...pkg }) => {
      const canEdit = packageManager.canEditPackage(pkg.owner);
      const card = document.createElement('div');
      card.className = `package-card glass-card rounded-xl overflow-hidden ${!canEdit ? 'opacity-80' : ''}`;
      
      // Action buttons (only for users who can edit packages)
      const actionButtons = packageManager.canEditPackages() ? `
        <div class="flex justify-end mt-4 space-x-2">
          <button class="text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-full edit-btn" data-id="${id}" ${!canEdit ? 'disabled' : ''}>
            <i class="fas fa-edit mr-1"></i> Edit
          </button>
          <button class="text-xs bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-slate-700 px-3 py-1.5 rounded-full delete-btn" data-id="${id}" ${!canEdit ? 'disabled' : ''}>
            <i class="fas fa-trash mr-1"></i> Delete
          </button>
        </div>
      ` : '';
      
      // Destinations chips
      const destinations = pkg.destinations ? pkg.destinations.split(',').map(d => d.trim()) : [];
      const destinationChips = destinations.map(d => `
        <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">
          ${d}
        </span>
      `).join('');
      
      card.innerHTML = `
        <div class="h-48 bg-slate-200 relative overflow-hidden">
          ${pkg.image ? `<img class="h-full w-full object-cover" src="${pkg.image}" alt="${pkg.name}" loading="lazy">` : ''}
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h3 class="font-bold text-white">${pkg.name}</h3>
            <div class="flex items-center mt-1">
              <span class="duration-badge text-xs px-2 py-1 rounded-full mr-2">
                ${pkg.duration} days / ${pkg.nights} nights
              </span>
              <span class="text-xs text-white">${utils.formatCurrency(pkg.price)}</span>
            </div>
          </div>
        </div>
        <div class="p-4">
          <div class="flex flex-wrap mb-2">
            ${destinationChips}
          </div>
          
          <p class="text-sm text-gray-300 line-clamp-2 mb-3">${pkg.description || ''}</p>
          
          <div class="flex items-center justify-between">
            <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">${pkg.category}</span>
            ${pkg.owner === state.currentUser?.uid ? 
              `<span class="text-xs ${pkg.approved === true || pkg.approved === 'true' ? 
                'bg-emerald-100 text-emerald-800' : 
                'bg-amber-100 text-amber-800'} px-2 py-1 rounded-full">
                ${pkg.approved === true || pkg.approved === 'true' ? 'Active' : 'Pending'}
              </span>` : ''}
          </div>
          
          ${actionButtons}
        </div>
      `;
      
      // Add event listeners for edit/delete if user can edit packages
      if (packageManager.canEditPackages()) {
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (editBtn && !editBtn.disabled) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            packageManager.loadPackageForEditing(id, pkg);
            packageManager.showEditorSection();
          });
        }
        
        if (deleteBtn && !deleteBtn.disabled) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${pkg.name}"?`)) {
              packageManager.deletePackage(id);
            }
          });
        }
      }
      
      elements.packageList.appendChild(card);
    });
  },

  loadPackageForEditing: (packageId, packageData) => {
    if (!packageId || !packageData || !elements.packageForm) return;
    
    packageManager.resetForm();
    
    // Check if user can edit this package
    if (!packageManager.canEditPackage(packageData.owner)) {
      utils.showToast('this package id not available', 'error');
      packageManager.showListSection();
      return;
    }
    
    // Set basic info
    if (elements.packageId) elements.packageId.value = packageId;
    if (elements.ownerId) elements.ownerId.value = packageData.owner || state.currentUser?.uid || '';
    if (elements.name) elements.name.value = packageData.name || '';
    if (elements.bookingLink) elements.bookingLink.value = packageId || '';
    if (elements.price) elements.price.value = packageData.price || '';
    if (elements.duration) elements.duration.value = packageData.duration || '';
    if (elements.nights) elements.nights.value = packageData.nights || '';
    if (elements.category) elements.category.value = packageData.category || '';
    if (elements.destinations) elements.destinations.value = packageData.destinations || '';
    if (elements.mainImage) elements.mainImage.value = packageData.image || '';
    if (elements.description) elements.description.value = packageData.description || '';
    if (elements.editorTitle) elements.editorTitle.textContent = `Edit ${packageData.name}`;
    if (elements.deleteBtn) elements.deleteBtn.classList.remove('hidden');
    
    // Load media
    if (packageData.media?.images && elements.imageList) {
      packageData.media.images.forEach(imageUrl => {
        packageManager.createArrayInput(elements.imageList, 'Image URL', imageUrl);
      });
    }
    
    if (packageData.media?.videos && elements.videoList) {
      packageData.media.videos.forEach(video => {
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
    if (packageData.included && elements.includedList) {
      packageData.included.forEach(item => {
        packageManager.createArrayInput(elements.includedList, 'Included item', item);
      });
    }
    
    if (packageData.notIncluded && elements.notIncludedList) {
      packageData.notIncluded.forEach(item => {
        packageManager.createArrayInput(elements.notIncludedList, 'Not included item', item);
      });
    }
    
    // Load what to bring
    if (packageData.whatToBring && elements.whatToBringList) {
      packageData.whatToBring.forEach(item => {
        packageManager.createArrayInput(elements.whatToBringList, 'What to bring item', item);
      });
    }
    
    // Load accommodation options
    if (packageData.accommodationOptions && elements.accommodationOptionsList) {
      packageData.accommodationOptions.forEach(option => {
        packageManager.createAccommodationInput(elements.accommodationOptionsList, option);
      });
    }
    
    // Load meal plan options
    if (packageData.mealPlanOptions && elements.mealPlanOptionsList) {
      packageData.mealPlanOptions.forEach(option => {
        packageManager.createMealPlanInput(elements.mealPlanOptionsList, option);
      });
    }
    
    // Load transportation options
    if (packageData.transportationOptions && elements.transportationOptionsList) {
      packageData.transportationOptions.forEach(option => {
        packageManager.createTransportationInput(elements.transportationOptionsList, option);
      });
    }
    
    // Load itinerary
    if (packageData.itinerary && elements.itineraryList) {
      packageData.itinerary.forEach(day => {
        packageManager.createDayInput(elements.itineraryList, day);
      });
    }
  },

  savePackage: (e) => {
    if (e) e.preventDefault();
    
    // Check if user can edit packages
    if (!packageManager.canEditPackages()) {
      utils.showToast('You do not have permission to create or edit packages', 'error');
      return;
    }
    
    utils.showLoading();
    
    // Sanitize inputs
    const sanitizedData = {
      name: utils.sanitizeInput(elements.name?.value || ''),
      bookingLink: utils.sanitizeInput(elements.bookingLink?.value || ''),
      price: parseFloat(utils.sanitizeInput(elements.price?.value || '0')),
      duration: utils.sanitizeInput(elements.duration?.value || ''),
      nights: utils.sanitizeInput(elements.nights?.value || ''),
      category: utils.sanitizeInput(elements.category?.value || ''),
      destinations: utils.sanitizeInput(elements.destinations?.value || ''),
      image: utils.sanitizeInput(elements.mainImage?.value || ''),
      description: utils.sanitizeInput(elements.description?.value || '')
    };
    
    // Validate data
    const validationErrors = utils.validatePackageData(sanitizedData);
    if (validationErrors) {
      utils.showToast(validationErrors.join(', '), 'error');
      utils.hideLoading();
      return;
    }
    
    const packageId = sanitizedData.bookingLink.trim().toLowerCase().replace(/\s+/g, '-');
    const packageData = {
      approved: 'false',
      ...sanitizedData,
      owner: elements.ownerId?.value || state.currentUser?.uid || '',
      lastUpdated: Date.now(),
      media: {
        images: [],
        videos: []
      },
      included: [],
      notIncluded: [],
      whatToBring: [],
      accommodationOptions: [],
      mealPlanOptions: [],
      transportationOptions: [],
      itinerary: []
    };
    
    // Get image URLs
    if (elements.imageList) {
      const imageInputs = elements.imageList.querySelectorAll('input');
      imageInputs.forEach(input => {
        if (input.value.trim()) {
          packageData.media.images.push(utils.sanitizeInput(input.value));
        }
      });
    }
    
    // Get video data
    if (elements.videoList) {
      const videoDivs = elements.videoList.querySelectorAll('.array-item');
      videoDivs.forEach(div => {
        const thumbnail = utils.sanitizeInput(div.querySelector('input:nth-child(1)')?.value || '');
        const videoUrl = utils.sanitizeInput(div.querySelector('input:nth-child(2)')?.value || '');
        
        if (thumbnail && videoUrl) {
          packageData.media.videos.push({
            thumbnail,
            videoUrl
          });
        }
      });
    }
    
    // Get included items
    if (elements.includedList) {
      const includedInputs = elements.includedList.querySelectorAll('input');
      includedInputs.forEach(input => {
        if (input.value.trim()) {
          packageData.included.push(utils.sanitizeInput(input.value));
        }
      });
    }
    
    // Get not included items
    if (elements.notIncludedList) {
      const notIncludedInputs = elements.notIncludedList.querySelectorAll('input');
      notIncludedInputs.forEach(input => {
        if (input.value.trim()) {
          packageData.notIncluded.push(utils.sanitizeInput(input.value));
        }
      });
    }
    
    // Get what to bring items
    if (elements.whatToBringList) {
      const whatToBringInputs = elements.whatToBringList.querySelectorAll('input');
      whatToBringInputs.forEach(input => {
        if (input.value.trim()) {
          packageData.whatToBring.push(utils.sanitizeInput(input.value));
        }
      });
    }
    
    // Get accommodation options
    if (elements.accommodationOptionsList) {
      const accommodationDivs = elements.accommodationOptionsList.querySelectorAll('.array-item');
      accommodationDivs.forEach(div => {
        const name = utils.sanitizeInput(div.querySelector('input:nth-child(1)')?.value || '');
        const description = utils.sanitizeInput(div.querySelector('input:nth-child(2)')?.value || '');
        const price = parseFloat(utils.sanitizeInput(div.querySelector('input:nth-child(3)')?.value || '0'));
        
        if (name && !isNaN(price)) {
          packageData.accommodationOptions.push({ name, description, price });
        }
      });
    }
    
    // Get meal plan options
    if (elements.mealPlanOptionsList) {
      const mealPlanDivs = elements.mealPlanOptionsList.querySelectorAll('.array-item');
      mealPlanDivs.forEach(div => {
        const name = utils.sanitizeInput(div.querySelector('input:nth-child(1)')?.value || '');
        const description = utils.sanitizeInput(div.querySelector('input:nth-child(2)')?.value || '');
        const price = parseFloat(utils.sanitizeInput(div.querySelector('input:nth-child(3)')?.value || '0'));
        
        if (name && !isNaN(price)) {
          packageData.mealPlanOptions.push({ name, description, price });
        }
      });
    }
    
    // Get transportation options
    if (elements.transportationOptionsList) {
      const transportationDivs = elements.transportationOptionsList.querySelectorAll('.array-item');
      transportationDivs.forEach(div => {
        const type = utils.sanitizeInput(div.querySelector('input:nth-child(1)')?.value || '');
        const description = utils.sanitizeInput(div.querySelector('input:nth-child(2)')?.value || '');
        const price = parseFloat(utils.sanitizeInput(div.querySelector('input:nth-child(3)')?.value || '0'));
        
        if (type && !isNaN(price)) {
          packageData.transportationOptions.push({ type, description, price });
        }
      });
    }
    
    // Get itinerary days
    if (elements.itineraryList) {
      const dayDivs = elements.itineraryList.querySelectorAll('.day-item');
      dayDivs.forEach(div => {
        const title = utils.sanitizeInput(div.querySelector('input:nth-child(1)')?.value || '');
        const description = utils.sanitizeInput(div.querySelector('textarea:nth-child(2)')?.value || '');
        const activities = [];
        
        div.querySelectorAll('.array-item input').forEach(activityInput => {
          if (activityInput.value.trim()) {
            activities.push(utils.sanitizeInput(activityInput.value));
          }
        });
        
        if (title) {
          packageData.itinerary.push({ title, description, activities });
        }
      });
    }
    
    // Check if this is an existing package
    const isExistingPackage = elements.packageId?.value && elements.packageId.value !== '';
    
    if (isExistingPackage) {
      // For existing packages, we need to verify ownership before updating
      database.ref('packages/' + packageId).once('value').then(snapshot => {
        const existingPackage = snapshot.val();
        
        if (!existingPackage) {
          utils.showToast('Package not found', 'error');
          utils.hideLoading();
          return;
        }
        
        if (!packageManager.canEditPackage(existingPackage.owner)) {
          utils.showToast('You do not have permission to edit this package', 'error');
          utils.hideLoading();
          return;
        }
        
        // Only update changed fields to minimize write operations
        const updates = {};
        Object.keys(packageData).forEach(key => {
          if (JSON.stringify(packageData[key]) !== JSON.stringify(existingPackage[key])) {
            updates[key] = packageData[key];
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
        database.ref('packages/' + packageId).update(updates)
          .then(() => {
            utils.showToast('Package updated successfully!');
            packageManager.loadPackageList(true); // Force refresh
            packageManager.resetForm();
            packageManager.showListSection();
          })
          .catch(error => {
            utils.showToast('Failed to update package: ' + error.message, 'error');
          })
          .finally(() => {
            utils.hideLoading();
          });
      });
    } else {
      // For new packages, just create them
      database.ref('packages/' + packageId).set(packageData)
        .then(() => {
          utils.showToast('Package created successfully!');
          packageManager.loadPackageList(true); // Force refresh
          packageManager.resetForm();
          packageManager.showListSection();
        })
        .catch(error => {
          utils.showToast('Failed to create package: ' + error.message, 'error');
        })
        .finally(() => {
          utils.hideLoading();
        });
    }
  },

  deletePackage: (packageId) => {
    if (!packageId) return;
    
    // Check if user can edit packages
    if (!packageManager.canEditPackages()) {
      utils.showToast('You do not have permission to delete packages', 'error');
      return;
    }
    
    utils.showLoading();
    
    // First verify ownership
    database.ref('packages/' + packageId).once('value').then(snapshot => {
      const packageData = snapshot.val();
      
      if (!packageData) {
        utils.showToast('Package not found', 'error');
        utils.hideLoading();
        return;
      }
      
      if (!packageManager.canEditPackage(packageData.owner)) {
        utils.showToast('You do not have permission to delete this package', 'error');
        utils.hideLoading();
        return;
      }
      
      // Delete the package
      database.ref('packages/' + packageId).remove()
        .then(() => {
          utils.showToast('Package deleted successfully!');
          packageManager.loadPackageList(true); // Force refresh
          if (elements.packageId?.value === packageId) {
            packageManager.resetForm();
            packageManager.showListSection();
          }
        })
        .catch(error => {
          utils.showToast('Failed to delete package: ' + error.message, 'error');
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
    // Booking Status Chart (Doughnut)
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
      statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Confirmed', 'New', 'Cancelled', 'No Show'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: [
              'rgba(76, 175, 80, 0.7)',
              'rgba(33, 150, 243, 0.7)',
              'rgba(244, 67, 54, 0.7)',
              'rgba(255, 152, 0, 0.7)'
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
              titleColor: '#ffc107',
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

    // Monthly Trends Chart (Line)
    const trendCtx = document.getElementById('trendChart')?.getContext('2d');
    if (trendCtx) {
      trendChart = new Chart(trendCtx, {
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
              titleColor: '#ffc107',
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

    
    // Guest Composition Chart (Half Doughnut)
const guestCtx = document.getElementById('guestChart')?.getContext('2d');
if (guestCtx) {
  guestChart = new Chart(guestCtx, {
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
          titleColor: '#ffc107',
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

    // Initialize Package Performance Chart
// Initialize Package Performance Chart
let packagePerformanceChart;

const initPackagePerformanceChart = () => {
  const ctx = document.getElementById('packagePerformanceChart');
  if (!ctx) return;

  packagePerformanceChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Bookings',
        data: [],
        backgroundColor: 'rgba(255, 193, 7, 0.7)',
        borderColor: 'rgba(255, 193, 7, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              return packagePerformanceMetric === 'bookings'
                ? `${label}: ${value} Bookings`
                : `${label}: EGP ${value.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return packagePerformanceMetric === 'bookings'
                ? value
                : `EGP ${value.toFixed(2)}`;
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          grid: {
            display: false
          }
        }
      }
    }
  });
};

// Update Package Performance Chart
dashboardManager.updatePackagePerformanceChart = () => {
  try {
    if (!packagePerformanceChart) initPackagePerformanceChart();
    if (!packagePerformanceChart) return;

    // Aggregate data by package name
    const packageData = {};
    filteredBookingData.forEach(booking => {
      if (booking.resStatus?.toLowerCase() === 'confirmed') {
        const packageName = booking.tour || 'Other';
        if (!packageData[packageName]) {
          packageData[packageName] = {
            bookings: 0,
            revenue: 0
          };
        }
        packageData[packageName].bookings++;
        packageData[packageName].revenue += parseFloat(booking.netTotal) || 0;
      }
    });

    // Sort and get top 5 packages
    const sortedPackages = Object.entries(packageData)
      .sort((a, b) => b[1][packagePerformanceMetric] - a[1][packagePerformanceMetric])
      .slice(0, 5);

    // Prepare chart data
    const packageNames = sortedPackages.map(item => item[0]);
    const packageValues = sortedPackages.map(item => {
      return packagePerformanceMetric === 'bookings' 
        ? item[1].bookings 
        : parseFloat(item[1].revenue.toFixed(2));
    });

    // Update chart data
    packagePerformanceChart.data.labels = packageNames;
    packagePerformanceChart.data.datasets[0].data = packageValues;
    packagePerformanceChart.data.datasets[0].label = packagePerformanceMetric === 'bookings' ? 'Bookings' : 'Revenue (EGP)';
    packagePerformanceChart.data.datasets[0].backgroundColor = [
      'rgba(255, 193, 7, 0.7)',
      'rgba(255, 152, 0, 0.7)',
      'rgba(255, 87, 34, 0.7)',
      'rgba(76, 175, 80, 0.7)',
      'rgba(33, 150, 243, 0.7)'
    ];
    packagePerformanceChart.data.datasets[0].borderColor = [
      'rgba(255, 193, 7, 1)',
      'rgba(255, 152, 0, 1)',
      'rgba(255, 87, 34, 1)',
      'rgba(76, 175, 80, 1)',
      'rgba(33, 150, 243, 1)'
    ];
    packagePerformanceChart.update();
  } catch (error) {
    console.error("Error updating package performance chart:", error);
  }
};

// Initialize Popular Packages Chart
let popularPackagesChart;

const initPopularPackagesChart = () => {
  const ctx = document.getElementById('popularPackagesChart');
  if (!ctx) return;

  popularPackagesChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          'rgba(255, 193, 7, 0.7)',
          'rgba(255, 152, 0, 0.7)',
          'rgba(255, 87, 34, 0.7)',
          'rgba(76, 175, 80, 0.7)',
          'rgba(33, 150, 243, 0.7)'
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(255, 87, 34, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)'
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
          position: 'right',
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
          titleColor: '#ffc107',
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
};

// Update Popular Packages Chart
dashboardManager.updatePopularPackagesChart = () => {
  try {
    if (!popularPackagesChart) initPopularPackagesChart();
    if (!popularPackagesChart) return;

    // Aggregate data by package name
    const packageData = {};
    filteredBookingData.forEach(booking => {
      if (booking.resStatus?.toLowerCase() === 'confirmed') {
        const packageName = booking.tour || 'Other';
        packageData[packageName] = (packageData[packageName] || 0) + 1;
      }
    });

    // Sort and get top 5 packages
    const sortedPackages = Object.entries(packageData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Prepare chart data
    const packageNames = sortedPackages.map(item => item[0]);
    const packageValues = sortedPackages.map(item => item[1]);

    // Update chart data
    popularPackagesChart.data.labels = packageNames;
    popularPackagesChart.data.datasets[0].data = packageValues;
    popularPackagesChart.update();
  } catch (error) {
    console.error("Error updating popular packages chart:", error);
  }
};
  },



  processBookingData: (data) => {
    try {
      bookingData = Object.values(data || {});
      filteredBookingData = [...bookingData];
      
      dashboardManager.updateStatsCards();
      dashboardManager.updateStatusChart();
      dashboardManager.updateTrendChart();
      dashboardManager.updateGuestChart();
      dashboardManager.updatePackagePerformanceChart();
    } catch (error) {
      console.error("Error processing booking data:", error);
    }
  },

  filterDataByDateRange: (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      filteredBookingData = bookingData.filter(booking => {
        if (!booking.tripDate) return false;
        const bookingDate = new Date(booking.tripDate);
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
          (parseInt(booking.adults) || 0) + 
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
      console.error("Error updating trend chart:", error);
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
        { header: 'Package Name', key: 'tour', width: 25 },
        { header: 'Trip Date', key: 'tripDate', width: 15 },
        { header: 'Adults', key: 'adults', width: 10 },
        { header: 'Children', key: 'childrenUnder12', width: 10 },
        { header: 'Infants', key: 'infants', width: 10 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 }
      ];

      // Style header row
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

      // Add data rows
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

        // Style payment status cell
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

      // Add totals row
      const totalsRow = worksheet.addRow({
        refNumber: 'TOTALS',
        tour: '',
        tripDate: '',
        adults: confirmedBookings.reduce((sum, b) => sum + (parseInt(b.adults) || 0), 0),
        childrenUnder12: confirmedBookings.reduce((sum, b) => sum + (parseInt(b.childrenUnder12) || 0), 0),
        infants: confirmedBookings.reduce((sum, b) => sum + (parseInt(b.infants) || 0), 0),
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

      // Auto-size columns
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

      // Freeze header row and add filter
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: 'A1',
        to: `I${worksheet.rowCount}`
      };

      // Generate filename with filtered date range
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
        utils.showToast('Error generating Excel file: ' + error.message, 'error');
      });
    } catch (error) {
      console.error('Error in exportToExcel:', error);
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
          
        case 'packagePerformanceChart':
          if (packagePerformanceChart) {
            filename = `package-performance-${new Date().toISOString().slice(0,10)}.png`;
            packagePerformanceChart.getDataURL({
              type: 'png',
              pixelRatio: 2,
              backgroundColor: '#333'
            }).then(url => {
              utils.downloadImage(url, filename);
            });
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
  dashboardManager.updatePackagePerformanceChart();
  dashboardManager.updatePopularPackagesChart();
  },

  initDateRangePicker: () => {
    const pickerElement = document.getElementById('dateRangePicker');
    if (pickerElement) {
      dateRangePicker = flatpickr(pickerElement, {
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
      
      const bookingsRef = database.ref("pkg-bookings")
        .orderByChild("owner")
        .equalTo(state.currentUser.uid);
      
      // Initial load
      bookingsRef.once('value')
        .then(snapshot => {
          dashboardManager.processBookingData(snapshot.exists() ? snapshot.val() : {});
        })
        .catch(error => {
          console.error("Error loading booking data:", error);
          dashboardManager.processBookingData({});
        });
      
      // Real-time updates
      bookingsRef.on('value', (snapshot) => {
        dashboardManager.processBookingData(snapshot.exists() ? snapshot.val() : {});
      });
    } catch (error) {
      console.error("Error in loadBookingData:", error);
    }
  }
};

// Booking Management Functions
const bookingManager = {
  initDateFilter: () => {
    if (flatpickrInstance) {
      flatpickrInstance.destroy();
    }
    
    const availableDates = [...new Set(allBookings.map(b => b.tripDate).filter(Boolean))]; 
    
    flatpickrInstance = flatpickr("#dateFilter", {
      dateFormat: "Y-m-d",
      allowInput: true,
      enable: availableDates,
      onReady: function(selectedDates, dateStr, instance) {
        const elements = [
          instance.calendarContainer,
          ...instance.calendarContainer.querySelectorAll('.flatpickr-weekdays, .flatpickr-current-month, .flatpickr-day')
        ];
        elements.forEach(el => el?.setAttribute('translate', 'no'));
      },
      onChange: function(selectedDates, dateStr) {
        if (activeTab !== 'new' && activeTab !== 'confirmed') {
          currentFilters.date = dateStr;
          bookingManager.applyFilters();
        }
      }
    });
  },

  clearDateFilter: () => {
    if (flatpickrInstance) {
      flatpickrInstance.clear();
    }
    currentFilters.date = null;
    bookingManager.applyFilters();
  },

  applyFilters: () => {
    currentFilters.search = elements.searchInput?.value?.toLowerCase() || '';
    currentFilters.status = elements.statusFilter?.value || 'all';
    bookingManager.filterBookings();
  },

  filterBookings: () => {
    let filtered = [...allBookings];
    
    // Apply search filter if exists
    if (currentFilters.search?.trim()) {
      const searchTerm = currentFilters.search.toLowerCase().trim();
      filtered = filtered.filter(booking => 
  (booking.refNumber?.toLowerCase().includes(searchTerm)) ||
  (booking.tour?.toLowerCase().includes(searchTerm)) ||
  (booking.username?.toLowerCase().includes(searchTerm)) ||
  (booking.email?.toLowerCase().includes(searchTerm))
);
    }
    
    // Apply status filter if not 'all'
    if (currentFilters.status && currentFilters.status !== 'all') {
      const statusTerm = currentFilters.status.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.resStatus?.toLowerCase() === statusTerm
      );
    }
    
    // Apply date filter with tab-specific logic
    if (currentFilters.date) {
      filtered = bookingManager.filterByDate(filtered, currentFilters.date, activeTab);
    }
    
    // Apply tab-specific status filter
    if (activeTab !== 'all') {
      const tabStatus = activeTab.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.resStatus?.toLowerCase() === tabStatus
      );
    }
    
    filteredBookings = filtered;
    currentPage = 1;
    bookingManager.updateBookingsTable();
    bookingManager.updatePagination();
  },

  
  filterByDate: (bookings, date, activeTab) => {
    if (!date) return bookings;
    
    try {
      // Format the filter date to match our storage format (YYYY-MM-D)
      const [year, month, day] = date.split('-');
      const formattedFilterDate = `${year}-${month.padStart(2, '0')}-${parseInt(day, 10)}`;
      
      return bookings.filter(booking => {
        if (!booking.tripDate) return false;
        
        // Format the booking date for comparison (remove leading zero from day)
        const [bYear, bMonth, bDay] = booking.tripDate.split('-');
        const formattedBookingDate = `${bYear}-${bMonth}-${parseInt(bDay, 10)}`;
        
        switch(activeTab) {
          case 'new':
            // For new bookings, show future dates (including selected date)
            return formattedBookingDate >= formattedFilterDate && 
                   booking.resStatus?.toLowerCase() === 'new';
          
          case 'confirmed':
            // For confirmed bookings, show only exact date matches
            return formattedBookingDate === formattedFilterDate && 
                   booking.resStatus?.toLowerCase() === 'confirmed';
          
          default:
            // For all other tabs, show exact date matches regardless of status
            return formattedBookingDate === formattedFilterDate;
        }
      });
    } catch (error) {
      console.error('Error filtering by date:', error);
      return bookings;
    }
  },

  updateBookingsTable: () => {
    if (!elements.bookingsTableBody) return;
    
    elements.bookingsTableBody.innerHTML = '';
    
    if (filteredBookings.length === 0) {
      elements.bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-gray-500">
            <div class="flex flex-col items-center justify-center">
              <i class="fas fa-calendar-times text-3xl text-amber-500 mb-2"></i>
              <span>No bookings found matching the current filters</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredBookings.length);
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);
    
    // Check if mobile view
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Mobile card view
      paginatedBookings.forEach(booking => {
        if (!booking.refNumber) return;
        
        const statusClass = bookingManager.getStatusClass(booking.resStatus);
        const escapedRefNumber = utils.sanitizeInput(booking.refNumber);
        const tour = utils.sanitizeInput(booking.tour || 'Unknown Package');
        const tripDate = utils.formatTripDate(booking.tripDate || '');
        const resStatus = utils.sanitizeInput(booking.resStatus || 'new');
        const guestCount = (parseInt(booking.adults) || 0) + 
                         (parseInt(booking.childrenUnder12) || 0) + 
                         (parseInt(booking.infants) || 0);
        
        const card = document.createElement('div');
        card.className = 'booking-card glass-card rounded-xl p-4 mb-3 shadow-md';
        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-amber-400 text-sm">${escapedRefNumber}</h3>
            <span class="status-badge ${statusClass} text-center text-xs">${resStatus}</span>
          </div>
          
          <div class="mb-2">
            <h4 class="font-semibold text-white text-base">${tour}</h4>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
            <div class="flex items-center">
              <i class="fas fa-calendar-day mr-2 text-amber-500"></i>
              <span>${tripDate}</span>
            </div>
            <div class="flex items-center">
              <i class="fas fa-users mr-2 text-amber-500"></i>
              <span>${guestCount} ${guestCount === 1 ? 'Guest' : 'Guests'}</span>
            </div>
          </div>
          
          <div class="flex justify-end">
            <button onclick="showBookingDetails('${escapedRefNumber}')" 
                    class="view-details-btn text-xs px-3 py-1.5 rounded-full">
              View Details <i class="fas fa-chevron-right ml-1"></i>
            </button>
          </div>
        `;
        
        elements.bookingsTableBody.appendChild(card);
      });
    } else {
      // Desktop table view
      const table = document.createElement('table');
      table.className = 'w-full';
      
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr class="bg-gray-800 text-gray-300 text-left">
          <th class="p-3 text-sm font-medium">Ref #</th>
          <th class="p-3 text-sm font-medium">Package</th>
          <th class="p-3 text-sm font-medium">Date</th>
          <th class="p-3 text-sm font-medium">Status</th>
          <th class="p-3 text-sm font-medium">Guests</th>
        </tr>
      `;
      table.appendChild(thead);
      
      const tbody = document.createElement('tbody');
      paginatedBookings.forEach(booking => {
        if (!booking.refNumber) return;
        
        const statusClass = bookingManager.getStatusClass(booking.resStatus);
        const escapedRefNumber = utils.sanitizeInput(booking.refNumber);
        const tour = utils.sanitizeInput(booking.tour || 'Unknown Package');
        const tripDate = utils.formatTripDate(booking.tripDate || '');
        const resStatus = utils.sanitizeInput(booking.resStatus || 'new');
        const guestCount = (parseInt(booking.adults) || 0) + 
                         (parseInt(booking.childrenUnder12) || 0) + 
                         (parseInt(booking.infants) || 0);
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-800/50 transition-colors border-b border-gray-700';
        row.innerHTML = `
          <td class="p-3 whitespace-nowrap">
            <button onclick="showBookingDetails('${escapedRefNumber}')" 
                    class="text-amber-400 hover:text-amber-300 font-mono text-sm">
              ${escapedRefNumber}
            </button>
          </td>
          <td class="p-3">${tour}</td>
          <td class="p-3 whitespace-nowrap">${tripDate}</td>
          <td class="p-3 whitespace-nowrap">
            <span class="status-badge ${statusClass} text-center">${resStatus}</span>
          </td>
          <td class="p-3 whitespace-nowrap text-center">${guestCount}</td>
        `;
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      elements.bookingsTableBody.appendChild(table);
    }
  },

  updatePagination: () => {
    if (!elements.totalPagesSpan || !elements.currentPageSpan || 
        !elements.totalItemsSpan || !elements.startItemSpan || 
        !elements.endItemSpan || !elements.prevPageBtn || 
        !elements.nextPageBtn) return;
    
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    
    elements.totalPagesSpan.textContent = totalPages;
    elements.currentPageSpan.textContent = currentPage;
    elements.totalItemsSpan.textContent = filteredBookings.length;
    
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredBookings.length);
    
    elements.startItemSpan.textContent = startItem;
    elements.endItemSpan.textContent = endItem;
    
    // Disable/enable pagination buttons
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages;
    
    // Update button styles
    elements.prevPageBtn.className = `px-2 py-1 sm:px-3 sm:py-1 rounded-lg ${currentPage === 1 ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-xs sm:text-sm`;
    elements.nextPageBtn.className = `px-2 py-1 sm:px-3 sm:py-1 rounded-lg ${currentPage === totalPages ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-xs sm:text-sm`;
  },

  prevPage: () => {
    if (currentPage > 1) {
      currentPage--;
      bookingManager.updateBookingsTable();
      bookingManager.updatePagination();
    }
  },

  nextPage: () => {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      bookingManager.updateBookingsTable();
      bookingManager.updatePagination();
    }
  },

  getStatusClass: (status) => {
    if (!status) return 'status-new';
    
    switch(status.toLowerCase()) {
      case 'confirmed':
        return 'status-confirmed';
      case 'new':
        return 'status-new';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-noshow';
    }
  },

  showBookingDetails: (refNumber) => {
    const booking = allBookings.find(b => b.refNumber === refNumber);
    if (!booking) {
      utils.showToast('Booking not found', 'error');
      return;
    }
    
    const statusClass = bookingManager.getStatusClass(booking.paymentStatus);
    const escapedRefNumber = utils.sanitizeInput(refNumber);
    const escapedTour = utils.sanitizeInput(booking.tour || 'Unknown Package');
    const escapedUsername = utils.sanitizeInput(booking.username || 'N/A');
    const escapedPhone = utils.sanitizeInput(booking.phone || 'N/A');
    const escapedAccommodation = utils.sanitizeInput(booking.Accommodation || 'N/A');
    const escapedTransportation = utils.sanitizeInput(booking.Transportation || 'N/A');
    const escapedMealPlan = utils.sanitizeInput(booking.MealPlan || '');
    const tripDate = utils.formatTripDate(booking.tripDate);
    
    // Prepare WhatsApp URL if phone exists
    const whatsappButton = document.getElementById('whatsappButton');
    if (whatsappButton) {
      if (booking.phone) {
        const whatsappMessage = `Dear ${booking.username || 'Guest'},%0A` +
                        `We are reaching out regarding your recent booking with Discover Sharm.%0A%0A` +
                        `• Reference Number: ${booking.refNumber}%0A` +
                        `• Package/Tour: ${booking.tour || 'selected package'}%0A` +
                        `• Scheduled Date: ${tripDate}%0A%0A` +
                        `Should you require any further information or assistance, please do not hesitate to contact us.%0A%0A` +
                        `Kind regards,%0ADiscover Sharm Reservations Team`;
        const whatsappUrl = `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;
        whatsappButton.href = whatsappUrl;
        whatsappButton.style.display = 'flex';
      } else {
        whatsappButton.style.display = 'none';
      }
    }

    const detailsHTML = `
      <div class="space-y-4">
        <!-- Booking Summary -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div class="text-gray-400 text-sm">Reference</div>
            <div class="font-mono text-amber-400">${escapedRefNumber}</div>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div class="text-gray-400 text-sm">Payment Status</div>
            <div><span class="status-badge ${statusClass} text-center">${booking.paymentStatus || 'pending'}</span></div>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div class="text-gray-400 text-sm">Total price</div>
            <div class="font-bold">${utils.formatCurrency(booking.netTotal || 0)}</div>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div class="text-gray-400 text-sm">Commission</div>
            <div class="font-bold">${utils.formatCurrency(booking.netTotal * 10 / 100 || 0)}</div>
          </div>
        </div>
        
        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Package Details -->
          <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 class="font-medium mb-3 text-amber-400 border-b border-gray-700 pb-2">Package Information</h4>
            <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
                <div class="p-4 rounded-lg border border-gray-700">
                  <div class="text-gray-400 text-sm">Package</div>
                  <div class="font-medium">${escapedTour}</div>
                </div>
                <div class="p-4 rounded-lg border border-gray-700">
                  <div class="text-gray-400 text-sm">Date</div>
                  <div class="font-medium">${tripDate}</div>
                </div>
           </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="p-4 rounded-lg border border-gray-700">
                  <div class="text-gray-400 text-sm text-center">Adults</div>
                  <div class="font-medium text-center">${booking.adults || 0}</div>
                </div>
                <div class="p-4 rounded-lg border border-gray-700">
                  <div class="text-gray-400 text-sm text-center">Children</div>
                  <div class="font-medium text-center">${booking.childrenUnder12 || 0}</div>
                </div>
                <div class="p-4 rounded-lg border border-gray-700">
                  <div class="text-gray-400 text-sm text-center">Infants</div>
                  <div class="font-medium text-center">${booking.infants || 0}</div>
                </div>
              </div>
              ${booking.pickupLocation ? `
              <div>
                <div class="text-gray-400 text-sm">Pickup Location</div>
                <div class="font-medium">${utils.sanitizeInput(booking.pickupLocation)}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Customer Details -->
          <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 class="font-medium mb-3 text-amber-400 border-b border-gray-700 pb-2">Customer Information</h4>
            <div class="space-y-3">
              <div>
                <div class="text-gray-400 text-sm">Name</div>
                <div class="font-medium">${escapedUsername}</div>
              </div>
              <div>
                <div class="text-gray-400 text-sm">Phone</div>
                <div class="font-medium">${escapedPhone}</div>
              </div>
              <div>
                <div class="text-gray-400 text-sm">Email</div>
                <div class="font-medium">${utils.sanitizeInput(booking.email || 'N/A')}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Special Requests -->
        ${booking.Accommodation ? `
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h4 class="font-medium mb-2 text-amber-400">Accommodation</h4>
          <p class="text-gray-300 whitespace-pre-line">${escapedAccommodation}</p>
        </div>
        ` : ''}
        <!-- Special Requests -->
        ${booking.Transportation ? `
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h4 class="font-medium mb-2 text-amber-400">Transportation</h4>
          <p class="text-gray-300 whitespace-pre-line">${escapedTransportation}</p>
        </div>
        ` : ''}
        <!-- Special Requests -->
        ${booking.MealPlan ? `
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h4 class="font-medium mb-2 text-amber-400">Meal Plan</h4>
          <p class="text-gray-300 whitespace-pre-line">${escapedMealPlan}</p>
        </div>
        ` : ''}
      </div>
    `;
    
    if (elements.bookingDetailsContent) {
      elements.bookingDetailsContent.innerHTML = detailsHTML;
    }
    
    const modal = document.getElementById('bookingDetailsModal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Force reflow to enable animation
      void modal.offsetWidth;
      
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal: () => {
    const modal = document.getElementById('bookingDetailsModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  },

  switchTab: (tab) => {
    activeTab = tab;
    
    // Update UI for active tab
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`${tab}BookingsTab`)?.classList.add('active');
    
    // Hide/show date filter based on tab
    const dateFilterContainer = document.querySelector('#bookingsFilterBar .relative');
    if (dateFilterContainer) {
      if (tab === 'new' || tab === 'confirmed') {
        dateFilterContainer.classList.add('hidden');
      } else {
        dateFilterContainer.classList.remove('hidden');
      }
    }
    
    // Set default date for the tab
    let defaultDate;
    switch(tab) {
      case 'new':
        defaultDate = getTomorrowDateString();
        document.getElementById('bookingsTableTitle').textContent = 'New Bookings (Tomorrow)';
        break;
      case 'confirmed':
        defaultDate = getTodayDateString();
        document.getElementById('bookingsTableTitle').textContent = 'Confirmed Bookings (Today)';
        break;
      default:
        defaultDate = null;
        document.getElementById('bookingsTableTitle').textContent = 'All Bookings';
    }
    
    // Update current filters
    currentFilters = {
      search: '',
      status: tab === 'all' ? 'all' : tab,
      date: defaultDate
    };
    
    // Update UI elements
    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.statusFilter) elements.statusFilter.value = tab === 'all' ? 'all' : tab;
    
    // Update Flatpickr if initialized
    if (flatpickrInstance) {
      if (defaultDate) {
        flatpickrInstance.setDate(defaultDate, true);
      } else {
        flatpickrInstance.clear();
      }
    }
    
    // Apply filters
    bookingManager.applyFilters();
  },

  loadBookings: () => {
    utils.showLoading();
    
    if (realTimeListener) {
      database.ref("pkg-bookings").orderByChild("owner").equalTo(currentUserId).off('value', realTimeListener);
    }
    
    realTimeListener = database.ref("pkg-bookings")
      .orderByChild("owner")
      .equalTo(currentUserId)
      .on('value', (snapshot) => {
        if (snapshot.exists()) {
          allBookings = [];
          snapshot.forEach((childSnapshot) => {
            const booking = childSnapshot.val();
            booking.key = childSnapshot.key;
            
            if (!booking.resStatus || booking.resStatus.trim() === '') {
              booking.resStatus = 'new';
            }
            
            allBookings.push(booking);
          });
          
          // Initialize date filter with available dates
          bookingManager.initDateFilter();
          
          // Apply current filters
          bookingManager.applyFilters();
          bookingManager.updateDashboard();
          utils.hideLoading();
        } else {
          utils.showToast("No bookings found for your account", 'warning');
          allBookings = [];
          bookingManager.applyFilters();
          bookingManager.updateDashboard();
          utils.hideLoading();
        }
      }, (error) => {
        utils.showToast("Error loading data: " + error.message, 'error');
        utils.hideLoading();
      });
  },

  updateDashboard: () => {
    bookingManager.updateBookingsTable();
    bookingManager.updatePagination();
  },

  exportToExcel: () => {
    if (filteredBookings.length === 0) {
      utils.showToast("No bookings to export with current filters", 'warning');
      return;
    }

    const totals = {
      adults: filteredBookings.reduce((sum, b) => sum + (parseInt(b.adults) || 0), 0),
      childrenUnder12: filteredBookings.reduce((sum, b) => sum + (parseInt(b.childrenUnder12) || 0), 0),
      infants: filteredBookings.reduce((sum, b) => sum + (parseInt(b.infants) || 0), 0),
      amount: filteredBookings.reduce((sum, b) => sum + (parseFloat(b.netTotal) - (b.netTotal * (10 / 100)) || 0), 0)
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    worksheet.columns = [
      { header: 'Ref #', key: 'refNumber', width: 30 },
      { header: 'Package', key: 'tour', width: 35 },
      { header: 'Date', key: 'tripDate', width: 15 },
      { header: 'Status', key: 'resStatus', width: 15 },
      { header: 'Adults', key: 'adults', width: 10 },
      { header: 'Children (Under 12)', key: 'childrenUnder12', width: 15 },
      { header: 'Infants', key: 'infants', width: 10 },
      { header: 'Amount (EGP)', key: 'netTotal', width: 15 },
      { header: 'Customer', key: 'username', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Transportation', key: 'Transportation', width: 35 },
      { header: 'Accommodation', key: 'Accommodation', width: 35 },
      { header: 'Meal Plan', key: 'MealPlan', width: 35 }
    ];

    // Style header row
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

    // Add data rows
    filteredBookings.forEach((booking, index) => {
      const row = worksheet.addRow({
        refNumber: booking.refNumber || '',
        tour: booking.tour || '',
        tripDate: booking.tripDate,
        resStatus: booking.resStatus || 'new',
        adults: booking.adults || 0,
        childrenUnder12: booking.childrenUnder12 || 0,
        infants: booking.infants || 0,
        netTotal: parseFloat(booking.netTotal - (booking.netTotal * (10 / 100)) || 0),
        username: booking.username || '',
        email: booking.email || '',
        phone: booking.phone || '',
        Transportation: booking.Transportation || '',
        Accommodation: booking.Accommodation || '',
        MealPlan : booking.MealPlan || ''
      });

      // Style data rows
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
      
        if (cell._address.startsWith('H')) {
          cell.numFmt = '"EGP "#,##0.00';
          cell.font = {
            bold: true,
            color: { argb: 'C00000' }
          };
        };
        cell.alignment = { 
          horizontal: 'center',
          vertical: 'middle'
        };
      });

      // Color status cell
      const statusCell = worksheet.getCell(`D${row.number}`);
      const status = booking.resStatus?.toLowerCase() || '';
      
      if (status === 'confirmed') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' }
        };
        statusCell.font = {
          color: { argb: 'FF006100' }
        };
      } else if (status === 'cancelled') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' }
        };
        statusCell.font = {
          color: { argb: 'FF9C0006' }
        };
      } else if (status === 'noshow' || status === 'no show') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC107' }
        };
        statusCell.font = {
          color: { argb: 'FF000000' }
        };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' }
        };
        statusCell.font = {
          color: { argb: 'FFFFFF' }
        };
      }
    });

    // Add totals row
    const totalsRowIndex = filteredBookings.length + 2;
    const totalsRow = worksheet.addRow({
      refNumber: 'TOTAL',
      tour: '',
      tripDate: '',
      resStatus: '',
      adults: totals.adults,
      childrenUnder12: totals.childrenUnder12,
      infants: totals.infants,
      netTotal: totals.amount,
      username: '',
      email: '',
      phone: '',
      Transportation: '',
      Accommodation: '',
      MealPlan: ''
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
      cell.alignment = { 
        horizontal: 'center',
        vertical: 'middle'
      };
      
      if (cell._address.startsWith('H')) {
        cell.numFmt = '"EGP "#,##0.00';
        cell.font = {
          bold: true,
          color: { argb: 'C00000' }
        };
      }
    });

    // Auto-size columns
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

    // Freeze header row and add filter
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    worksheet.autoFilter = {
      from: 'A1',
      to: `M${totalsRowIndex}`
    };

    // Generate and download file
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Package_Bookings_Export_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }).catch(error => {
      console.error('Error generating Excel file:', error);
      utils.showToast('Error generating Excel file: ' + error.message, 'error');
    });
  },
  
  refreshBookings: () => {
    bookingManager.loadBookings();
    utils.showToast('Bookings refreshed', 'success');
  }
};

// Helper functions for dates
function getTodayDateString() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = today.getDate();
  return `${today.getFullYear()}-${month}-${day}`;
}

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = tomorrow.getDate();
  return `${tomorrow.getFullYear()}-${month}-${day}`;
}

// Event Listeners
const setupEventListeners = () => {
  // Search input event
  if (elements.searchInput) {
    elements.searchInput.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        bookingManager.applyFilters();
      }
    });
  }

  // Form submission (only if user can edit)
  if (packageManager.canEditPackages() && elements.packageForm) {
    elements.packageForm.addEventListener('submit', packageManager.savePackage);
    
    // Add buttons for dynamic fields
    if (elements.addImageBtn) elements.addImageBtn.addEventListener('click', () => packageManager.createArrayInput(elements.imageList, 'Image URL'));
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
      removeBtn.className = 'remove-item bg-red-500 hover:bg-red-600 text-white p-2 rounded';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => videoDiv.remove());
      
      videoDiv.appendChild(thumbnailInput);
      videoDiv.appendChild(videoUrlInput);
      videoDiv.appendChild(removeBtn);
      if (elements.videoList) elements.videoList.appendChild(videoDiv);
    });
    
    if (elements.addIncludedBtn) elements.addIncludedBtn.addEventListener('click', () => packageManager.createArrayInput(elements.includedList, 'Included item'));
    if (elements.addNotIncludedBtn) elements.addNotIncludedBtn.addEventListener('click', () => packageManager.createArrayInput(elements.notIncludedList, 'Not included item'));
    if (elements.addWhatToBringBtn) elements.addWhatToBringBtn.addEventListener('click', () => packageManager.createArrayInput(elements.whatToBringList, 'What to bring item'));
    if (elements.addAccommodationBtn) elements.addAccommodationBtn.addEventListener('click', () => packageManager.createAccommodationInput(elements.accommodationOptionsList));
    if (elements.addMealPlanBtn) elements.addMealPlanBtn.addEventListener('click', () => packageManager.createMealPlanInput(elements.mealPlanOptionsList));
    if (elements.addTransportationBtn) elements.addTransportationBtn.addEventListener('click', () => packageManager.createTransportationInput(elements.transportationOptionsList));
    if (elements.addDayBtn) elements.addDayBtn.addEventListener('click', () => packageManager.createDayInput(elements.itineraryList));
    
    // New package buttons
    if (elements.newPackageBtn) elements.newPackageBtn.addEventListener('click', () => {
      packageManager.resetForm();
      packageManager.showEditorSection();
    });
    
    if (elements.emptyStateNewPackageBtn) elements.emptyStateNewPackageBtn.addEventListener('click', () => {
      packageManager.resetForm();
      packageManager.showEditorSection();
    });
  }
  
  // Common event listeners
  if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', packageManager.showListSection);
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    });
  });
  

  
  // Tab switching
  if (elements.packageListTab) elements.packageListTab.addEventListener('click', packageManager.showListSection);
  if (elements.packageEditorTab) elements.packageEditorTab.addEventListener('click', packageManager.showEditorSection);
  
  // Dashboard event listeners
  // Period filter buttons
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

  // Package performance metric dropdown
  if (elements.packagePerformanceMetric) {
    elements.packagePerformanceMetric.addEventListener('change', function() {
      packagePerformanceMetric = this.value;
      dashboardManager.updatePackagePerformanceChart();
    });
  }

  // Export data button
  if (elements.exportData) {
    elements.exportData.addEventListener('click', dashboardManager.exportToExcel);
  }

  // General export button handler
  document.addEventListener('click', function(e) {
    if (e.target.closest('.export-btn')) {
      const btn = e.target.closest('.export-btn');
      if (btn && btn.dataset.chart) {
        dashboardManager.exportChart(btn.dataset.chart);
      }
    }
  });


  













  












  
  // Payout method change
  if (elements.payoutMethod) {
    elements.payoutMethod.addEventListener('change', function() {
      const bankFields = document.getElementById('bankFields');
      if (bankFields) {
        bankFields.style.display = this.value === 'bankAccount' ? 'block' : 'none';
      }
    });
  }

  // Save payout method
  if (elements.savePayoutBtn) {
    elements.savePayoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const userId = auth.currentUser.uid;
      const method = elements.payoutMethod.value;
      const name = elements.payoutName.value.trim();
      const accountNumber = elements.accountNumber.value.trim();
      const bankName = elements.bankName.value.trim();
      const branchName = elements.branchName.value.trim();

      // Validate required fields
      if (!name || !accountNumber) {
        utils.showToast('Please fill all required fields', 'error');
        return;
      }

      // Additional validation for bank account
      if (method === 'bankAccount' && (!bankName || !branchName)) {
        utils.showToast('Please fill all bank details', 'error');
        return;
      }

      // Prepare data to save
      const payoutData = {
        method: method,
        name: name,
        accountNumber: accountNumber,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };

      // Add bank details if method is bank account
      if (method === 'bankAccount') {
        payoutData.bankName = bankName;
        payoutData.branchName = branchName;
      } else {
        payoutData.bankName = '';
        payoutData.branchName = '';
      }

      // Show loading state
      elements.savePayoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      elements.savePayoutBtn.disabled = true;

      // Save to Firebase
      database.ref('egy_user/' + userId + '/payoutMethod').update(payoutData)
        .then(() => {
          utils.showToast('Payout method saved successfully', 'success');
          elements.savePayoutBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
          setTimeout(() => {
            elements.savePayoutBtn.innerHTML = '<i class="fas fa-save"></i> Save';
          }, 2000);
        })
        .catch((error) => {
          utils.showToast('Failed to save payout method', 'error');
          console.error('Error saving payout method:', error);
          elements.savePayoutBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        })
        .finally(() => {
          elements.savePayoutBtn.disabled = false;
        });
    });
  }
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
      currentUserId = user.uid;
      packageManager.loadUserRole(user.uid).then(() => {
        packageManager.loadPackageList();
        dashboardManager.initCharts();
        dashboardManager.initDateRangePicker();
        dashboardManager.loadBookingData();
        packageManager.loadPayout(user.uid);
        bookingManager.loadBookings();
        setupEventListeners();
        loadAllPayoutEvents();
      });
    } else {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    }
  });
};

// Start the app
initApp();

// Make functions available globally for HTML onclick handlers
window.showBookingDetails = bookingManager.showBookingDetails;
window.closeModal = bookingManager.closeModal;
window.switchTab = bookingManager.switchTab;
window.exportToExcel = bookingManager.exportToExcel;
window.refreshBookings = bookingManager.refreshBookings;
window.applyFilters = bookingManager.applyFilters;
window.exportPayoutEventsToExcel = async function() {
                 async function exportPayoutEventsToExcel() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("No user is signed in.");
    return;
  }

  const userId = user.uid;
  const eventsRef = firebase.database().ref(`egy_user/${userId}/events`);

  try {
    const snapshot = await eventsRef.once('value');
    if (!snapshot.exists()) {
      alert("No payout events found.");
      return;
    }

    const events = snapshot.val();

    // Convert object to array and sort by date (newest first)
    const sortedEvents = Object.entries(events)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create Excel workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Payout Events");

    // Define columns
    ws.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Amount (EGP)", key: "amount", width: 15 },
      { header: "Account", key: "account", width: 25 }
    ];
  // Style header row
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD700' } // Gold background
      };
      cell.font = {
        bold: true,
        color: { argb: '000000' }, // Black text
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    sortedEvents.forEach(event => {
      const amount = parseInt(event.Amount).toLocaleString();
      const account = event.Account;

      const row = ws.addRow({
        date: event.date,
        amount: amount,
        account: account
      });

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' } // White background
        };
      });
    });

    // Auto-size columns
    ws.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) maxLength = columnLength;
      });
      column.width = maxLength < 15 ? 15 : maxLength > 50 ? 50 : maxLength;
    });

    // Generate Excel file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const fileName = `Payout_Events_${userId}_${new Date().toISOString().slice(0,10)}.xlsx`;
    saveAs(blob, fileName);

    alert("Payout events exported successfully!");

  } catch (error) {
    console.error("Error exporting payout events:", error);
    alert("Failed to export payout events: " + error.message);
  }
}
}




window.loadAllPayoutEvents = function() {
    
function loadAllPayoutEvents() {
  const user = auth.currentUser;

  if (!user) {
    console.log("No user is signed in.");
    return;
  }

  const userId = user.uid;
  const eventsRef = database.ref(`egy_user/${userId}/events`);

  eventsRef.once('value')
    .then(snapshot => {
      if (!snapshot.exists()) {
        const outputDiv = document.getElementById("payout-output") || document.body;
        outputDiv.innerHTML = "<p>No payout events found.</p>";
        return;
      }

      const outputDiv = document.getElementById("payout-output") || document.body;
      outputDiv.innerHTML = ""; // Clear previous content

      const events = snapshot.val();

      Object.entries(events).forEach(([date, data]) => {
        const amount = parseInt(data.Amount).toLocaleString(); // Format with commas
        const account = data.Account;

        const item = `
          <div class="payout-item mb-4 p-4 border rounded-lg bg-gray-50">
            <strong>Payout transaction ✅</strong><br>
            Date: ${date}<br>
            ${amount} EGP to your account (${account})
          </div>
        `;

        outputDiv.innerHTML += item;
      });
    })
    .catch(error => {
      console.error("Error retrieving payout events:", error);
    });
}
}
