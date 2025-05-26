// Firebase Trip Management & Analytics Dashboard
// IMPORTANT: For production, move Firebase config to environment variables

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

// =====================
// DOM ELEMENTS
// =====================
const elements = {
  // Trip Management
  tripList: document.getElementById('tripList'),
  tripForm: document.getElementById('tripForm'),
  editorTitle: document.getElementById('editorTitle'),
  tripIdInput: document.getElementById('tripId'),
  ownerIdInput: document.getElementById('ownerId'),
  nameInput: document.getElementById('name'),
  bookingLinkInput: document.getElementById('bookingLink'),
  priceInput: document.getElementById('price'),
  durationInput: document.getElementById('duration'),
  categoryInput: document.getElementById('category'),
  ratingInput: document.getElementById('rating'),
  mainImageInput: document.getElementById('mainImage'),
  descriptionInput: document.getElementById('description'),
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
  mobileNewTripBtn: document.getElementById('mobileNewTripBtn'),
  emptyStateNewTripBtn: document.getElementById('emptyStateNewTripBtn'),
  
  // Analytics
  totalBookings: document.getElementById('totalBookings'),
  totalGuests: document.getElementById('totalGuests'),
  totalRevenue: document.getElementById('totalRevenue'),
  avgRating: document.getElementById('avgRating'),
  statusChart: document.getElementById('statusChart'),
  trendChart: document.getElementById('trendChart'),
  guestChart: document.getElementById('guestChart'),
  tourPerformanceChart: document.getElementById('tourPerformanceChart'),
  dateRangePicker: document.getElementById('dateRangePicker'),
  
  // Common
  logoutBtn: document.getElementById('logoutBtn'),
  spinner: document.getElementById('spinner'),
  userRoleEl: document.getElementById('userRole'),
  userEmailEl: document.getElementById('userEmail'),
  toast: document.getElementById('toast')
};

// =====================
// APPLICATION STATE
// =====================
let currentUser = null;
let currentUserRole = 'user';
let allTrips = {};
let bookingData = [];
let filteredBookingData = [];
let currentPeriod = 'week';
let tourPerformanceMetric = 'bookings';
let dateRangePicker;
let statusChart, trendChart, guestChart, tourPerformanceChart;

// =====================
// UTILITY FUNCTIONS
// =====================

// Show Toast Notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast show ${type}`;
  toast.innerHTML = `
    <div class="flex items-center">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     'fa-exclamation-triangle'} mr-2"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Loading Spinner
function showLoading() {
  if (elements.spinner) elements.spinner.classList.remove('hidden');
  if (elements.saveBtn) elements.saveBtn.disabled = true;
}

function hideLoading() {
  if (elements.spinner) elements.spinner.classList.add('hidden');
  if (elements.saveBtn) elements.saveBtn.disabled = false;
}

// Date Formatting
function formatDateForFilename(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

// =====================
// TRIP MANAGEMENT SYSTEM
// =====================

// Reset Form
function resetForm() {
  if (elements.tripForm) elements.tripForm.reset();
  if (elements.tripIdInput) elements.tripIdInput.value = '';
  if (elements.ownerIdInput) elements.ownerIdInput.value = '';
  if (elements.editorTitle) elements.editorTitle.textContent = 'Create New Trip';
  if (elements.deleteBtn) elements.deleteBtn.classList.add('hidden');
  
  // Clear all dynamic lists
  const lists = ['imageList', 'videoList', 'includedList', 'notIncludedList', 
                'timelineList', 'whatToBringList', 'tourTypeList'];
  lists.forEach(listId => {
    if (elements[listId]) elements[listId].innerHTML = '';
  });
}

// Create Input Fields
function createArrayInput(container, placeholder, value = '') {
  if (!container) return null;
  
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

// Load User Role
function loadUserRole(userId) {
  return database.ref('egy_user/' + userId).once('value').then(snapshot => {
    const userData = snapshot.val();
    currentUserRole = userData?.role || 'user';
    
    if (elements.userRoleEl) {
      elements.userRoleEl.textContent = currentUserRole === 'admin' ? 'Administrator' : 
                                      currentUserRole === 'moderator' ? 'Moderator' : 'User';
      elements.userRoleEl.className = `role-badge ${
        currentUserRole === 'admin' ? 'role-admin' : 
        currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
      }`;
    }
    
    if (elements.userEmailEl) {
      elements.userEmailEl.textContent = currentUser?.email || '';
    }
    
    return currentUserRole;
  }).catch(error => {
    console.error("Error loading user role:", error);
    return 'user';
  });
}

// Check Permissions
function canEditTrips() {
  return currentUserRole === 'admin' || currentUserRole === 'moderator';
}

function canEditTrip(tripOwnerId) {
  return currentUserRole === 'admin' || (currentUserRole === 'moderator' && tripOwnerId === currentUser?.uid);
}

// Load Trip List
function loadTripList() {
  showLoading();
  
  database.ref('trips').once('value').then(snapshot => {
    allTrips = snapshot.val() || {};
    
    if (elements.tripList) elements.tripList.innerHTML = '';
    if (elements.emptyState) elements.emptyState.classList.add('hidden');
    
    let tripsArray = Object.entries(allTrips)
      .filter(([_, trip]) => trip.owner === currentUser?.uid)
      .map(([id, trip]) => ({ id, ...trip }));
    
    if (tripsArray.length === 0) {
      if (elements.emptyState) elements.emptyState.classList.remove('hidden');
      hideLoading();
      return;
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
          
          ${canEditTrips() ? `
            <div class="flex justify-end mt-4 space-x-2">
              <button class="text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-full edit-btn" data-id="${id}" ${!canEdit ? 'disabled' : ''}>
                <i class="fas fa-edit mr-1"></i> Edit
              </button>
              <button class="text-xs bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-slate-700 px-3 py-1.5 rounded-full delete-btn" data-id="${id}" ${!canEdit ? 'disabled' : ''}>
                <i class="fas fa-trash mr-1"></i> Delete
              </button>
            </div>
          ` : ''}
        </div>
      `;
      
      if (canEditTrips()) {
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (editBtn && !editBtn.disabled) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadTripForEditing(id, trip);
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
      
      if (elements.tripList) elements.tripList.appendChild(card);
    });
    
    hideLoading();
  }).catch(error => {
    showToast('Failed to load trips: ' + error.message, 'error');
    hideLoading();
  });
}

// Load Trip for Editing
function loadTripForEditing(tripId, tripData) {
  if (!canEditTrip(tripData.owner)) {
    showToast('You do not have permission to edit this trip', 'error');
    return;
  }
  
  resetForm();
  
  if (elements.tripIdInput) elements.tripIdInput.value = tripId;
  if (elements.ownerIdInput) elements.ownerIdInput.value = tripData.owner || currentUser?.uid;
  if (elements.nameInput) elements.nameInput.value = tripData.name || '';
  if (elements.bookingLinkInput) elements.bookingLinkInput.value = tripData.bookingLink || '';
  if (elements.priceInput) elements.priceInput.value = tripData.price || '';
  if (elements.durationInput) elements.durationInput.value = tripData.duration || '';
  if (elements.categoryInput) elements.categoryInput.value = tripData.category || '';
  if (elements.ratingInput) elements.ratingInput.value = tripData.rating || '';
  if (elements.mainImageInput) elements.mainImageInput.value = tripData.image || '';
  if (elements.descriptionInput) elements.descriptionInput.value = tripData.description || '';
  if (elements.editorTitle) elements.editorTitle.textContent = `Edit ${tripData.name}`;
  if (elements.deleteBtn) elements.deleteBtn.classList.remove('hidden');
  
  // Load media
  if (tripData.media?.images && elements.imageList) {
    tripData.media.images.forEach(imageUrl => {
      createArrayInput(elements.imageList, 'Image URL', imageUrl);
    });
  }
  
  if (tripData.media?.videos && elements.videoList) {
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
  
  // Load other lists
  const listMappings = [
    { data: tripData.included, element: elements.includedList, placeholder: 'Included item' },
    { data: tripData.notIncluded, element: elements.notIncludedList, placeholder: 'Not included item' },
    { data: tripData.whatToBring, element: elements.whatToBringList, placeholder: 'What to bring item' }
  ];
  
  listMappings.forEach(({ data, element, placeholder }) => {
    if (data && element) {
      data.forEach(item => {
        createArrayInput(element, placeholder, item);
      });
    }
  });
  
  // Load timeline
  if (tripData.timeline && elements.timelineList) {
    tripData.timeline.forEach(item => {
      const div = document.createElement('div');
      div.className = 'array-item';
      
      const timeInput = document.createElement('input');
      timeInput.type = 'text';
      timeInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      timeInput.placeholder = 'Time (e.g., 09:00 AM)';
      timeInput.value = item.time || '';
      
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      titleInput.placeholder = 'Title';
      titleInput.value = item.title || '';
      
      const descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
      descInput.placeholder = 'Description';
      descInput.value = item.description || '';
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-item';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => div.remove());
      
      div.appendChild(timeInput);
      div.appendChild(titleInput);
      div.appendChild(descInput);
      div.appendChild(removeBtn);
      elements.timelineList.appendChild(div);
    });
  }
  
  // Load tour types
  if (tripData.tourtype && elements.tourTypeList) {
    Object.entries(tripData.tourtype).forEach(([key, value]) => {
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
      elements.tourTypeList.appendChild(div);
    });
  }
}

// Save Trip
function saveTrip(e) {
  e.preventDefault();
  
  if (!canEditTrips()) {
    showToast('You do not have permission to create or edit trips', 'error');
    return;
  }
  
  showLoading();
  
  // Validate required fields
  const requiredFields = [
    elements.nameInput,
    elements.bookingLinkInput,
    elements.priceInput,
    elements.durationInput,
    elements.categoryInput,
    elements.ratingInput
  ];
  
  if (requiredFields.some(field => !field?.value)) {
    showToast('Please fill all required fields', 'error');
    hideLoading();
    return;
  }
  
  const tripId = elements.bookingLinkInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  const tripData = {
    approved: 'false',
    name: elements.nameInput.value,
    bookingLink: tripId,
    price: parseFloat(elements.priceInput.value),
    duration: elements.durationInput.value,
    category: elements.categoryInput.value,
    rating: parseFloat(elements.ratingInput.value),
    image: elements.mainImageInput.value,
    description: elements.descriptionInput.value,
    owner: elements.ownerIdInput.value || currentUser?.uid,
    lastUpdated: Date.now(),
    media: { images: [], videos: [] },
    included: [],
    notIncluded: [],
    timeline: [],
    whatToBring: [],
    tourtype: {}
  };
  
  // Process all form data
  processFormData(tripData);
  
  // Save to Firebase
  const isExistingTrip = elements.tripIdInput?.value && elements.tripIdInput.value !== '';
  
  if (isExistingTrip) {
    updateExistingTrip(tripId, tripData);
  } else {
    createNewTrip(tripId, tripData);
  }
}

function processFormData(tripData) {
  // Helper function to get values from list items
  const getListValues = (container) => {
    return Array.from(container.querySelectorAll('input'))
      .map(input => input.value.trim())
      .filter(val => val);
  };
  
  // Process images
  if (elements.imageList) {
    tripData.media.images = getListValues(elements.imageList);
  }
  
  // Process videos
  if (elements.videoList) {
    const videoDivs = elements.videoList.querySelectorAll('.array-item');
    videoDivs.forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 2 && inputs[0].value.trim() && inputs[1].value.trim()) {
        tripData.media.videos.push({
          thumbnail: inputs[0].value.trim(),
          videoUrl: inputs[1].value.trim()
        });
      }
    });
  }
  
  // Process included/not included
  if (elements.includedList) tripData.included = getListValues(elements.includedList);
  if (elements.notIncludedList) tripData.notIncluded = getListValues(elements.notIncludedList);
  
  // Process timeline
  if (elements.timelineList) {
    const timelineDivs = elements.timelineList.querySelectorAll('.array-item');
    timelineDivs.forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 3 && inputs[0].value.trim() && inputs[1].value.trim() && inputs[2].value.trim()) {
        tripData.timeline.push({
          time: inputs[0].value.trim(),
          title: inputs[1].value.trim(),
          description: inputs[2].value.trim()
        });
      }
    });
  }
  
  // Process what to bring
  if (elements.whatToBringList) tripData.whatToBring = getListValues(elements.whatToBringList);
  
  // Process tour types
  if (elements.tourTypeList) {
    const tourTypeDivs = elements.tourTypeList.querySelectorAll('.array-item');
    tourTypeDivs.forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 2 && inputs[0].value.trim() && inputs[1].value.trim()) {
        tripData.tourtype[inputs[0].value.trim()] = parseFloat(inputs[1].value);
      }
    });
  }
}

function updateExistingTrip(tripId, tripData) {
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
    
    // Only update changed fields
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
    
    updates.lastUpdated = Date.now();
    
    database.ref('trips/' + tripId).update(updates)
      .then(() => {
        showToast('Trip updated successfully!');
        loadTripList();
        resetForm();
      })
      .catch(error => {
        showToast('Failed to update trip: ' + error.message, 'error');
      })
      .finally(() => {
        hideLoading();
      });
  });
}

function createNewTrip(tripId, tripData) {
  database.ref('trips/' + tripId).set(tripData)
    .then(() => {
      showToast('Trip created successfully!');
      loadTripList();
      resetForm();
    })
    .catch(error => {
      showToast('Failed to create trip: ' + error.message, 'error');
    })
    .finally(() => {
      hideLoading();
    });
}

// Delete Trip
function deleteTrip(tripId) {
  if (!tripId || !canEditTrips()) {
    showToast('You do not have permission to delete trips', 'error');
    return;
  }
  
  showLoading();
  
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
    
    database.ref('trips/' + tripId).remove()
      .then(() => {
        showToast('Trip deleted successfully!');
        loadTripList();
        if (elements.tripIdInput?.value === tripId) {
          resetForm();
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

// =====================
// ANALYTICS DASHBOARD
// =====================

// Initialize Charts
function initCharts() {
  if (!elements.statusChart && !elements.trendChart && !elements.guestChart) return;
  
  // Booking Status Chart (Doughnut)
  if (elements.statusChart) {
    statusChart = new Chart(elements.statusChart.getContext('2d'), {
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
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
  
  // Monthly Trends Chart (Line)
  if (elements.trendChart) {
    trendChart = new Chart(elements.trendChart.getContext('2d'), {
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
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Guest Composition Chart (Half Doughnut)
  if (elements.guestChart) {
    guestChart = new Chart(elements.guestChart.getContext('2d'), {
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
          legend: { position: 'bottom' }
        }
      }
    });
  }
  
  // Initialize Tour Performance Chart
  if (elements.tourPerformanceChart) {
    tourPerformanceChart = echarts.init(elements.tourPerformanceChart);
    window.addEventListener('resize', () => tourPerformanceChart.resize());
  }
}

// Process Booking Data
function processBookingData(data) {
  try {
    bookingData = Object.values(data || {});
    filteredBookingData = [...bookingData];
    updateAllCharts();
  } catch (error) {
    console.error("Error processing booking data:", error);
  }
}

// Update All Charts
function updateAllCharts() {
  updateStatsCards();
  updateStatusChart();
  updateTrendChart();
  updateGuestChart();
  updateTourPerformanceChart();
}

// Update Stats Cards
function updateStatsCards() {
  if (!elements.totalBookings || !elements.totalGuests || !elements.totalRevenue || !elements.avgRating) return;
  
  const confirmedBookings = filteredBookingData.filter(b => b.resStatus?.toLowerCase() === 'confirmed');
  
  elements.totalBookings.textContent = confirmedBookings.length.toLocaleString();
  
  const totalGuests = confirmedBookings.reduce((total, booking) => {
    return total + 
      (parseInt(booking.adults) || 0) + 
      (parseInt(booking.childrenUnder12) || 0) + 
      (parseInt(booking.infants) || 0);
  }, 0);
  
  elements.totalGuests.textContent = totalGuests.toLocaleString();
  
  const totalRevenue = confirmedBookings.reduce((total, booking) => {
    return total + (parseFloat(booking.netTotal) || 0);
  }, 0);
  
  elements.totalRevenue.textContent = 'EGP ' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  
  const ratedBookings = confirmedBookings.filter(b => b.rating);
  const avgRating = ratedBookings.length > 0 
    ? (ratedBookings.reduce((sum, b) => sum + parseFloat(b.rating || 0), 0) / ratedBookings.length)
    : 0;
  
  elements.avgRating.textContent = avgRating.toFixed(1);
}

// Update Status Chart
function updateStatusChart() {
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
}

// Update Trend Chart
function updateTrendChart() {
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
}

// Update Guest Chart
function updateGuestChart() {
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
}

// Update Tour Performance Chart
function updateTourPerformanceChart() {
  if (!tourPerformanceChart) return;
  
  // Aggregate data by tour name
  const tourData = {};
  filteredBookingData.forEach(booking => {
    if (booking.resStatus?.toLowerCase() === 'confirmed') {
      const tourName = booking.tour || 'Other';
      if (!tourData[tourName]) {
        tourData[tourName] = { bookings: 0, revenue: 0 };
      }
      tourData[tourName].bookings++;
      tourData[tourName].revenue += parseFloat(booking.netTotal) || 0;
    }
  });
  
  // Sort and get top 5 tours
  const sortedTours = Object.entries(tourData)
    .sort((a, b) => b[1][tourPerformanceMetric] - a[1][tourPerformanceMetric])
    .slice(0, 5);
  
  // Prepare chart data
  const tourNames = sortedTours.map(item => item[0]);
  const tourValues = sortedTours.map(item => {
    return tourPerformanceMetric === 'bookings' 
      ? item[1].bookings 
      : parseFloat(item[1].revenue.toFixed(2));
  });
  
  // Chart configuration
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const data = params[0];
        return tourPerformanceMetric === 'bookings'
          ? `${data.name}<br/>Bookings: ${data.value}`
          : `${data.name}<br/>Revenue: EGP ${data.value.toFixed(2)}`;
      }
    },
    xAxis: { type: 'value' },
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
        }
      },
      label: {
        show: true,
        position: 'right',
        formatter: function(params) {
          return tourPerformanceMetric === 'bookings'
            ? params.value
            : 'EGP ' + params.value.toFixed(2);
        }
      }
    }]
  };
  
  tourPerformanceChart.setOption(option);
}

// Load Booking Data
function loadBookingData() {
  if (!currentUser) return;
  
  const bookingsRef = database.ref("trip-bookings")
    .orderByChild("owner")
    .equalTo(currentUser.uid);
  
  bookingsRef.on('value', (snapshot) => {
    processBookingData(snapshot.exists() ? snapshot.val() : {});
  });
}

// =====================
// INITIALIZATION
// =====================

// Initialize Event Listeners
function initEventListeners() {
  // Common listeners
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        window.location.href = '/p/login.html';
      });
    });
  }
  
  // Trip management listeners
  if (canEditTrips()) {
    if (elements.tripForm) elements.tripForm.addEventListener('submit', saveTrip);
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', resetForm);
    
    // Add buttons for dynamic fields
    const addButtons = [
      { btn: elements.addImageBtn, list: elements.imageList, placeholder: 'Image URL' },
      { btn: elements.addIncludedBtn, list: elements.includedList, placeholder: 'Included item' },
      { btn: elements.addNotIncludedBtn, list: elements.notIncludedList, placeholder: 'Not included item' },
      { btn: elements.addWhatToBringBtn, list: elements.whatToBringList, placeholder: 'What to bring item' }
    ];
    
    addButtons.forEach(({ btn, list, placeholder }) => {
      if (btn && list) {
        btn.addEventListener('click', () => createArrayInput(list, placeholder));
      }
    });
    
    if (elements.addTimelineBtn && elements.timelineList) {
      elements.addTimelineBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'array-item';
        
        const timeInput = document.createElement('input');
        timeInput.type = 'text';
        timeInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        timeInput.placeholder = 'Time (e.g., 09:00 AM)';
        
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'w-full mb-2 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        titleInput.placeholder = 'Title';
        
        const descInput = document.createElement('input');
        descInput.type = 'text';
        descInput.className = 'w-full p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        descInput.placeholder = 'Description';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => div.remove());
        
        div.appendChild(timeInput);
        div.appendChild(titleInput);
        div.appendChild(descInput);
        div.appendChild(removeBtn);
        elements.timelineList.appendChild(div);
      });
    }
    
    if (elements.addTourTypeBtn && elements.tourTypeList) {
      elements.addTourTypeBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'array-item grid grid-cols-5 gap-2 items-center';
        
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.className = 'col-span-3 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        keyInput.placeholder = 'Service Name';
        
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.className = 'col-span-1 p-2 input-field rounded text-sm focus:ring-2 focus:ring-amber-500';
        valueInput.placeholder = 'Price';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => div.remove());
        
        div.appendChild(keyInput);
        div.appendChild(valueInput);
        div.appendChild(removeBtn);
        elements.tourTypeList.appendChild(div);
      });
    }
    
    // New trip buttons
    const newTripButtons = [elements.newTripBtn, elements.mobileNewTripBtn, elements.emptyStateNewTripBtn];
    newTripButtons.forEach(btn => {
      if (btn) btn.addEventListener('click', () => {
        resetForm();
      });
    });
  }
}

// Initialize Application
function initApp() {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      loadUserRole(user.uid).then(role => {
        // Initialize components based on role
        if (role === 'admin' || role === 'moderator') {
          loadTripList();
        }
        
        if (role === 'admin') {
          initCharts();
          loadBookingData();
        }
        
        initEventListeners();
      });
    } else {
      window.location.href = '/p/login.html';
    }
  });
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize date picker if exists
  if (elements.dateRangePicker) {
    dateRangePicker = flatpickr(elements.dateRangePicker, {
      mode: "range",
      dateFormat: "Y-m-d",
      onClose: function(selectedDates) {
        if (selectedDates.length === 2) {
          document.querySelectorAll('.filter-btn[data-period]').forEach(b => b.classList.remove('active'));
          currentPeriod = 'custom';
          filteredBookingData = bookingData.filter(booking => {
            if (!booking.tripDate) return false;
            const bookingDate = new Date(booking.tripDate);
            return bookingDate >= selectedDates[0] && bookingDate <= selectedDates[1];
          });
          updateAllCharts();
        }
      }
    });
  }

  initApp();
});
