```javascript
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
  allBookings: {},
  currentPage: 1,
  tripsPerPage: 10,
  tripsCache: null,
  bookingsCache: null,
  lastFetchTime: 0
};

// Utility Functions
const utils = {
  showToast: (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 bg-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'yellow'}-500 text-white px-4 py-2 rounded shadow-lg flex items-center`;
        toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-2"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
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
    if (typeof input !== 'string') return input;
    return input.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  validateTripData: (data) => {
    const errors = [];
    if (!data.name || data.name.length < 5) errors.push('Name must be at least 5 characters');
    if (isNaN(data.price) || data.price <= 0) errors.push('Price must be a positive number');
    if (!data.duration) errors.push('Duration is required');
    if (!data.category) errors.push('Category is required');
    if (!data.rating || data.rating < 1 || data.rating > 5) errors.push('Rating must be between 1-5');
    if (!data.image) errors.push('Main image URL is required');
    return errors.length ? errors.join(', ') : null;
  },

  generateBookingLink: (name) => {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
};

// Trip Management Functions
const tripManager = {
  resetForm: () => {
    elements.tripForm.reset();
    elements.tripId.value = '';
    elements.ownerId.value = '';
    elements.bookingLink.value = '';
    elements.editorTitle.textContent = 'Add New Trip';
    elements.deleteBtn.classList.add('hidden');
    elements.imageList.innerHTML = '';
    elements.videoList.innerHTML = [];
    elements.includedList.innerHTML = [];
    elements.notIncludedList.innerHTML = [];
    elements.timelineList.innerHTML = [];
    elements.whatToBringList.innerHTML = [];
    elements.tourTypeList.innerHTML = [];
  },

  showListSection: () => {
    elements.tripListSection.classList.remove('hidden');
    elements.tripEditorSection.classList.add('hidden');
    elements.tripListTab.classList.add('tab-active', 'text-blue-600');
    elements.tripEditorTab.classList.remove('tab-active', 'text-blue-600');
  },

  showEditorSection: () => {
    elements.tripListSection.classList.add('hidden');
    elements.tripEditorSection.classList.remove('hidden');
    elements.tripListTab.classList.remove('tab-active', 'text-blue-600');
    elements.tripEditorTab.classList.add('tab-active', 'text-blue-600');
  },

  createArrayItem: (container, placeholder, value = '') => {
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2 mb-2';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-amber-500';
    input.placeholder = placeholder;
    input.value = utils.sanitize(value);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-red-500 hover:text-red-700';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.onclick = () => div.remove();
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
    return input;
  },

  createTimelineItem: (data = { time: '', title: '', description: '' }) => {
    const div = document.createElement('div');
    div.className = 'space-y-2 mb-4 p-4 bg-gray-50 rounded border';
    const inputs = ['time', 'title', 'description'].map((field) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'w-full p-2 border rounded text-sm focus:ring-2 focus:ring-amber-500';
      input.placeholder = field.charAt(0).toUpperCase() + field.slice(1);
      input.value = utils.sanitize(data[field] || '');
      div.appendChild(input);
      return input;
    });
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-red-500 hover:text-red-700';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.onclick = () => div.remove();
    div.appendChild(removeBtn);
    elements.timelineList.appendChild(div);
    return { time: inputs[0], title: inputs[1], description: inputs[2] };
  },

  createTourTypeItem: (key = '', value = '') => {
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2 mb-2';
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-amber-500';
    keyInput.placeholder = 'Service Name';
    keyInput.value = utils.sanitize(key);
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'w-1/3 p-2 border rounded text-sm focus:ring-2 focus:ring-amber-500';
    valueInput.placeholder = 'Price';
    valueInput.value = value;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-red-500 hover:text-red-700';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.onclick = () => div.remove();
    div.appendChild(keyInput);
    div.appendChild(valueInput);
    div.appendChild(removeBtn);
    elements.tourTypeList.appendChild(div);
    return { key: keyInput, value: valueInput };
  },

  updateDashboardStats: () => {
    const trips = Object.values(state.allTrips).filter(t => t.owner === state.currentUser?.uid);
    const approvedTrips = trips.filter(t => t.approved === true);
    const pendingTrips = trips.filter(t => t.approved === false);
    elements.totalTrips.textContent = approvedTrips.length;
    elements.topRated.textContent = approvedTrips.filter(t => t.rating >= 4).length;
    elements.pendingTrips.textContent = pendingTrips.length;
  },

  canEditTrips: () => {
    return state.currentUserRole === 'admin' || state.currentUserRole === 'moderator';
  },

  canEditTrip: (ownerId) => {
    return state.currentUserRole === 'admin' || (state.currentUserRole === 'moderator' && ownerId === state.currentUser.uid);
  },

  loadUserRole: () => {
    return database.ref(`egy_user/${state.currentUser.uid}`).once('value').then(snapshot => {
      const userData = snapshot.val();
      state.currentUserRole = userData?.role || 'user';
      elements.userRole.textContent = state.currentUserRole.charAt(0).toUpperCase() + state.currentUserRole.slice(1);
      elements.userRole.className = `px-2 py-1 rounded-full text-xs font-medium bg-${state.currentUserRole === 'admin' ? 'blue' : 'green'}-100 text-${state.currentUserRole === 'admin' ? 'blue' : 'green'}-800`;
      elements.userEmail.value = state.currentUser.email || '';
    }).catch(() => {
      utils.showToast('Failed to load user role', 'error');
    });
  },

  loadTripsAndBookings: () => {
    Promise.all([
      database.ref('trips').once('value').then(s => s.val() || {}),
      database.ref('trip-bookings').once('value').then(s => s.val() || {})
    ]).then(([trips, bookings]) => {
      state.allTrips = trips;
      state.allBookings = bookings;
      state.tripsCache = Object.entries(trips).map(([id, trip]) => ({ id, ...trip }));
      state.bookingsCache = Object.entries(bookings).map(([id, booking]) => ({ id, ...booking }));
      state.lastFetchTime = Date.now();

      const userTrips = state.tripsCache.filter(trip => trip.owner === state.currentUser.uid);
      elements.emptyState.classList.toggle('hidden', userTrips.length > 0);
      tripManager.renderTrips(userTrips);
      tripManager.updateDashboardStats();
    }).catch(error => {
      utils.showToast(`Failed to load data: ${error.message}`, 'error');
    });
  },

  renderTrips: (trips) => {
    elements.tripList.innerHTML = '';
    trips.forEach(({ id, ...trip }) => {
      const bookings = state.bookingsCache.filter(b => b.tour === trip.name);
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-lg shadow-md';
      card.innerHTML = `
        <img src="${trip.image || 'https://via.placeholder.com/150'}" alt="${trip.name}" class="w-full h-48 object-cover rounded-t-lg">
        <div class="p-4">
          <h3 class="text-lg font-semibold">${trip.name}</h3>
          <p class="text-sm text-gray-600">${trip.category} | ${trip.duration}</p>
          <p class="text-lg font-bold text-amber-600">${trip.price} EGP</p>
          <p class="text-sm">Status: <span class="text-${trip.approved ? 'green' : 'yellow'}-600">${trip.approved ? 'Approved' : 'Pending'}</span></p>
          <p class="text-sm">Bookings: ${bookings.length}</p>
          <div class="mt-4 space-x-2">
            <button class="view-bookings bg-blue-500 text-white px-3 py-1 rounded" data-id="${id}">View Bookings</button>
            ${tripManager.canEditTrip(trip.owner) ? `
              <button class="edit-trip bg-amber-500 text-white px-3 py-1 rounded" data-id="${id}">Edit</button>
              <button class="delete-trip bg-red-500 text-white px-3 py-1 rounded" data-id="${id}">Delete</button>
            ` : ''}
          </div>
        </div>
      `;
      elements.tripList.appendChild(card);

      card.querySelector('.view-bookings')?.addEventListener('click', () => tripManager.showBookings(id, trip.name));
      card.querySelector('.edit-trip')?.addEventListener('click', () => {
        tripManager.loadTripForEditing(id, trip);
        tripManager.showEditorSection();
      });
      card.querySelector('.delete-trip')?.addEventListener('click', () => {
        if (confirm(`Delete ${trip.name}?`)) tripManager.deleteTrip(id);
      });
    });
  },

  showBookings: (tripId, tripName) => {
    const bookings = state.bookingsCache.filter(b => b.tour === tripName);
    elements.tripList.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold mb-4">Bookings for ${tripName}</h2>
        <button class="back-to-trips bg-gray-500 text-white px-4 py-2 rounded mb-4">Back to Trips</button>
        ${bookings.length === 0 ? '<p>No bookings found.</p>' : `
          <table class="w-full text-sm">
            <thead><tr class="bg-gray-100"><th class="p-2">ID</th><th class="p-2">Customer</th><th class="p-2">Date</th><th class="p-2">Total</th><th class="p-2">Status</th></tr></thead>
            <tbody>${bookings.map(b => `
              <tr>
                <td class="p-2">${b.refNumber}</td>
                <td class="p-2">${b.email}</td>
                <td class="p-2">${b.tripDate}</td>
                <td class="p-2">${b.total} ${b.currency}</td>
                <td class="p-2">${b.resStatus}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        `}
      </div>
    `;
    elements.tripList.querySelector('.back-to-trips').addEventListener('click', () => tripManager.loadTripsAndBookings());
  },

  loadTripForEditing: (tripId, trip) => {
    if (!tripManager.canEditTrip(trip.owner)) {
      utils.showToast('No permission to edit this trip', 'error');
      return;
    }
    tripManager.resetForm();
    elements.tripId.value = tripId;
    elements.ownerId.value = trip.owner || state.currentUser.uid;
    elements.name.value = trip.name || '';
    elements.bookingLink.value = trip.bookingLink || utils.generateBookingLink(trip.name);
    elements.price.value = trip.price || '';
    elements.duration.value = trip.duration || '';
    elements.category.value = trip.category || '';
    elements.rating.value = trip.rating || 1;
    elements.mainImage.value = trip.image || '';
    elements.description.value = trip.description || '';
    elements.editorTitle.textContent = `Edit ${trip.name}`;
    elements.deleteBtn.classList.remove('hidden');

    (trip.media?.images || []).forEach(url => tripManager.createArrayItem(elements.imageList, 'Image URL', url));
    (trip.included || []).forEach(item => tripManager.createArrayItem(elements.includedList, 'Included Item', item));
    (trip.notIncluded || []).forEach(item => tripManager.createArrayItem(elements.notIncludedList, 'Not Included Item', item));
    (trip.whatToBring || []).forEach(item => tripManager.createArrayItem(elements.whatToBringList, 'What to Bring', item));
    (trip.timeline || []).forEach(t => tripManager.createTimelineItem(t));
    if (trip.tourtype) {
      Object.entries(trip.tourtype).forEach(([k, v]) => tripManager.createTourTypeItem(k, v));
    }
  },

  saveTrip: (e) => {
    e.preventDefault();
    if (!tripManager.canEditTrips()) {
      utils.showToast('No permission to save trips', 'error');
      return;
    }
    utils.showLoading();

    const tripData = {
      name: elements.name.value,
      bookingLink: elements.bookingLink.value || utils.generateBookingLink(elements.name.value),
      price: parseFloat(elements.price.value) || 0,
      duration: elements.duration.value,
      category: elements.category.value,
      rating: parseInt(elements.rating.value) || 1,
      image: elements.mainImage.value,
      description: elements.description.value,
      owner: elements.ownerId.value || state.currentUser.uid,
      approved: false,
      lastUpdated: Date.now(),
      media: { images: [] },
      included: [],
      notIncluded: [],
      timeline: [],
      whatToBring: [],
      tourtype: {}
    };

    const validationError = utils.validateTripData(tripData);
    if (validationError) {
      utils.showToast(validationError, 'error');
      utils.hideLoading();
      return;
    }

    elements.imageList.querySelectorAll('input').forEach(i => {
      if (i.value) tripData.media.images.push(i.value);
    });
    elements.includedList.querySelectorAll('input').forEach(i => {
      if (i.value) tripData.included.push(i.value);
    });
    elements.notIncludedList.querySelectorAll('input').forEach(i => {
      if (i.value) tripData.notIncluded.push(i.value);
    });
    elements.whatToBringList.querySelectorAll('input').forEach(i => {
      if (i.value) tripData.whatToBring.push(i.value);
    });
    elements.timelineList.querySelectorAll('div').forEach(div => {
      const [time, title, desc] = div.querySelectorAll('input');
      if (time.value && title.value && desc.value) {
        tripData.timeline.push({ time: time.value, title: title.value, description: desc.value });
      }
    });
    elements.tourTypeList.querySelectorAll('div').forEach(div => {
      const [key, value] = div.querySelectorAll('input');
      if (key.value && value.value) tripData.tourtype[key.value] = parseFloat(value.value);
    });

    const tripId = elements.tripId.value || tripData.bookingLink;
    database.ref(`trips/${tripId}`).set(tripData).then(() => {
      utils.showToast(elements.tripId.value ? 'Trip updated!' : 'Trip created!');
      tripManager.loadTripsAndBookings();
      tripManager.resetForm();
      tripManager.showListSection();
    }).catch(error => {
      utils.showToast(`Error saving trip: ${error.message}`, 'error');
    }).finally(() => {
      utils.hideLoading();
    });
  },

  deleteTrip: (tripId) => {
    if (!tripManager.canEditTrips()) {
      utils.showToast('No permission to delete trips', 'error');
      return;
    }
    utils.showLoading();
    database.ref(`trips/${tripId}`).remove().then(() => {
      utils.showToast('Trip deleted!');
      tripManager.loadTripsAndBookings();
      if (elements.tripId.value === tripId) tripManager.resetForm();
    }).catch(error => {
      utils.showToast(`Error deleting trip: ${error.message}`, 'error');
    }).finally(() => {
      utils.hideLoading();
    });
  }
};

// Event Listeners
elements.tripForm.addEventListener('submit', tripManager.saveTrip);
elements.cancelBtn.addEventListener('click', () => {
  tripManager.resetForm();
  tripManager.showListSection();
});
elements.deleteBtn.addEventListener('click', () => {
  if (confirm('Delete this trip?')) tripManager.deleteTrip(elements.tripId.value);
});
elements.newTripBtn.addEventListener('click', () => {
  tripManager.resetForm();
  tripManager.showEditorSection();
});
elements.emptyStateNewTripBtn.addEventListener('click', () => {
  tripManager.resetForm();
  tripManager.showEditorSection();
});
elements.logoutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = 'https://www.discover-sharm.com/p/login.html';
  });
});
elements.tripListTab.addEventListener('click', tripManager.showListSection);
elements.tripEditorTab.addEventListener('click', tripManager.showEditorSection);
elements.addImageBtn.addEventListener('click', () => tripManager.createArrayItem(elements.imageList, 'Image URL'));
elements.addIncludedBtn.addEventListener('click', () => tripManager.createArrayItem(elements.includedList, 'Included Item'));
elements.addNotIncludedBtn.addEventListener('click', () => tripManager.createArrayItem(elements.notIncludedList, 'Not Included Item'));
elements.addWhatToBringBtn.addEventListener('click', () => tripManager.createArrayItem(elements.whatToBringList, 'What to Bring'));
elements.addTimelineBtn.addEventListener('click', () => tripManager.createTimelineItem());
elements.addTourTypeBtn.addEventListener('click', () => tripManager.createTourTypeItem());

// Initialize App
auth.onAuthStateChanged(user => {
  if (user) {
    state.currentUser = user;
    tripManager.loadUserRole().then(tripManager.loadTripsAndBookings);
  } else {
    window.location.href = 'https://www.discover-sharm.com/p/login.html';
  }
});
```
