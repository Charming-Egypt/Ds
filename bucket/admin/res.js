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

  payoutMethod: document.getElementById("payoutMethod"),
  payoutName: document.getElementById("payoutName"),
  accountNumber: document.getElementById("accountNumber"),
  bankName: document.getElementById("bankName"),
  branchName: document.getElementById("branchName"),

  
  
  
  // DOM Elements
    bookingsTableBody: document.getElementById('bookingsTableBody'),
    toast : document.getElementById('toast'),
    searchInput : document.getElementById('searchInput'),
    statusFilter : document.getElementById('statusFilter'),
    dateFilter : document.getElementById('dateFilter'),
    bookingDetailsModal : document.getElementById('bookingDetailsModal'),
    bookingDetailsContent : document.getElementById('bookingDetailsContent'),
    
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
  allTrips: {},
  currentPage: 1,
  tripsPerPage: 10,
  tripsCache: null,
  lastFetchTime: 0
};







    // Initialize the dashboard when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Check auth state
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                currentUserId = user.uid;
                initDashboard();
                setupEventListeners();
            } else {
                window.location.href = "/p/login.html";
            }
        });
    });

    // Initialize dashboard
    function initDashboard() {
        loadBookings();
    }


function formatDateNoLeadingZeros(dateString) {
    if (!dateString) return '';
    return dateString.replace(/-0(\d)-0?(\d)/, '-$1-$2');
}





            // Initialize Flatpickr for date filter
        function initDateFilter() {
            if (flatpickrInstance) {
                flatpickrInstance.destroy();
            }
            
            const availableDates = [...new Set(allBookings.map(b => b.tripDate).filter(Boolean))]; 
            
            flatpickrInstance = flatpickr("#dateFilter", {
                dateFormat: "Y-m-d",
                allowInput: true,
                enable: availableDates,
                onReady: function(selectedDates, dateStr, instance) {
        // Add translate='no' to prevent auto-translation
        const elements = [
            instance.calendarContainer,
            ...instance.calendarContainer.querySelectorAll('.flatpickr-weekdays, .flatpickr-current-month, .flatpickr-day')
        ];
        elements.forEach(el => el?.setAttribute('translate', 'no'));
    },
                onChange: function(selectedDates, dateStr) {
            // Only update filter if not in new/confirmed tabs
            if (activeTab !== 'new' && activeTab !== 'confirmed') {
                currentFilters.date = dateStr;
                applyFilters();
            }
        }
    });
          
          // Inject CSS for date picker
  const style = document.createElement('style');
  style.textContent = `
    /* Flatpickr Dark Theme Overrides */
    .flatpickr-calendar {
      background: #222 !important;
      color: #ffc207 !important;
      border-radius: 10px !important;
      border: 1px solid #333 !important;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) !important;
    }

    /* Month header */
    .flatpickr-months,
    .flatpickr-weekdays {
      background: #222 !important;
    }

    .flatpickr-month,
    .flatpickr-weekday {
      color: #ffc207 !important;
    }

    /* Navigation arrows */
    .flatpickr-prev-month,
    .flatpickr-next-month,
    .flatpickr-prev-month svg,
    .flatpickr-next-month svg {
      color: #ffc107 !important;
      fill: #ffc107 !important;
    }

    /* Day cells */
    .flatpickr-day {
      color: #ffc207 !important;
      background: #333 !important;
      border-radius: 8px !important;
      border: none !important;
    }

    /* Hover state */
    .flatpickr-day:not(.flatpickr-disabled):hover {
      background: #444 !important;
      color: #ffc207 !important;
    }

    /* Selected day */
    .flatpickr-day.selected {
      background: #ffc207 !important;
      color: #111 !important;
      font-weight: bold !important;
    }

    /* Adjacent month days */
    .flatpickr-day.prevMonthDay,
    .flatpickr-day.nextMonthDay {
      color: #666 !important;
      background: transparent !important;
    }

    /* Today */
    .flatpickr-day.today {
      border: 1px solid #ffc107 !important;
    }

    .flatpickr-day.today.flatpickr-disabled {
      background: #333 !important;
      color: #fff !important;
      border-color: #E64A19 !important;
    }

    .flatpickr-day.today.selected {
      background: #ffa107 !important;
      color: #fff !important;
    }

    /* Disabled days */
    .flatpickr-day.flatpickr-disabled,
    .flatpickr-day.flatpickr-disabled:hover,
    .prev-day-disabled {
      background: #333 !important;
      color: #666 !important;
      opacity: 0.4 !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
    }

    /* Time input */
    .flatpickr-time input,
    .flatpickr-time .flatpickr-time-separator,
    .flatpickr-time .flatpickr-am-pm {
      color: #ffc207 !important;
    }
  `;
  document.head.appendChild(style);
          
        }

    // Clear date filter
    function clearDateFilter() {
        if (flatpickrInstance) {
            flatpickrInstance.clear();
        }
        currentFilters.date = null;
        applyFilters();
    }

    function getTodayDateString() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = today.getDate(); // No leading zero
    return `${today.getFullYear()}-${month}-${day}`;
}

function getTomorrowDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = tomorrow.getDate(); // No leading zero
    return `${tomorrow.getFullYear()}-${month}-${day}`;
}



    // Apply all filters
    function applyFilters() {
        currentFilters.search = searchInput.value.toLowerCase();
        currentFilters.status = statusFilter.value;
        
        filterBookings();
    }

// Main filtering function with date handling
function filterBookings() {
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
        filtered = filterByDate(filtered, currentFilters.date, activeTab);
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
    updateBookingsTable();
    updatePagination();
}

function filterByDate(bookings, date, activeTab) {
    if (!date) return bookings; // Return all if no date filter
    
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
        return bookings; // Return unfiltered if error occurs
    }
}



// Initialize the booking system
function initBookingSystem() {
    // Load bookings data first
    loadBookings().then(() => {
        // Then initialize date filter with proper defaults
        initDateFilter();
        
        // Set up tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.dataset.tab;
                switchTab(tab);
            });
        });
        
        // Initialize with default tab
        switchTab('all');
    });
}









function updateBookingsTable() {
    bookingsTableBody.innerHTML = '';
    
    if (filteredBookings.length === 0) {
        bookingsTableBody.innerHTML = `
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
            
            const statusClass = getStatusClass(booking.resStatus);
            const escapedRefNumber = escapeHtml(booking.refNumber);
            const tour = escapeHtml(booking.tour || 'Unknown Tour');
            const tripDate = formatTripDate(booking.tripDate || '');
            const resStatus = escapeHtml(booking.resStatus || 'new');
            const guestCount = (parseInt(booking.adults) || 0) + 
                             (parseInt(booking.childrenUnder12) || 0) + 
                             (parseInt(booking.infants) || 0);
            
            const card = document.createElement('div');
            card.className = 'booking-card bg-gray-800 rounded-lg p-4 mb-3 shadow-md';
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
            
            bookingsTableBody.appendChild(card);
        });
    } else {
        // Desktop table view
        const table = document.createElement('table');
        table.className = 'w-full';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr class="bg-gray-800 text-gray-300 text-left">
                <th class="p-3 text-sm font-medium">Ref #</th>
                <th class="p-3 text-sm font-medium">Tour</th>
                <th class="p-3 text-sm font-medium">Date</th>
                <th class="p-3 text-sm font-medium">Status</th>
                <th class="p-3 text-sm font-medium">Guests</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        paginatedBookings.forEach(booking => {
            if (!booking.refNumber) return;
            
            const statusClass = getStatusClass(booking.resStatus);
            const escapedRefNumber = escapeHtml(booking.refNumber);
            const tour = escapeHtml(booking.tour || 'Unknown Tour');
            const tripDate = formatTripDate(booking.tripDate || '');
            const resStatus = escapeHtml(booking.resStatus || 'new');
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
        bookingsTableBody.appendChild(table);
    }
}




    // Update pagination controls
    function updatePagination() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    
    // Use elements object to access DOM elements
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
}

    // Go to previous page
    function prevPage() {
        if (currentPage > 1) {
            currentPage--;
            updateBookingsTable();
            updatePagination();
        }
    }

    // Go to next page
    function nextPage() {
        const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateBookingsTable();
            updatePagination();
        }
    }

    // Get CSS class for status badge
    function getStatusClass(status) {
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
    }



function showBookingDetails(refNumber) {
    const booking = allBookings.find(b => b.refNumber === refNumber);
    if (!booking) {
        showToast('Booking not found', 'error');
        return;
    }
    
    const statusClass = getStatusClass(booking.resStatus);
    const escapedRefNumber = escapeHtml(refNumber);
    const escapedTour = escapeHtml(booking.tour || 'Unknown Tour');
    const escapedUsername = escapeHtml(booking.username || 'N/A');
    const escapedPhone = escapeHtml(booking.phone || 'N/A');
    const escapedHotel = escapeHtml(booking.hotelName || 'N/A');
    const escapedRoom = escapeHtml(booking.roomNumber || 'N/A');
    const escapedRequests = escapeHtml(booking.tripType || '');
    const tripDate = formatTripDate(booking.tripDate);
    
    // Prepare WhatsApp URL if phone exists
    const whatsappButton = document.getElementById('whatsappButton');
    if (whatsappButton) {
        if (booking.phone) {
            const whatsappMessage = `Hello ${booking.username || 'there'},%0A%0A` +
                                  `Regarding your booking.%0A%0A `+ `Ref / ${booking.refNumber}.%0A%0A` + `for ${booking.tour || 'your tour'}.%0A%0A` + ` on ${tripDate}.%0A%0A` +
                                  `Best regards,`;
            const whatsappUrl = `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;
            whatsappButton.href = whatsappUrl;
            whatsappButton.style.display = 'flex'; // Show button
        } else {
            whatsappButton.style.display = 'none'; // Hide button if no phone
        }
    }

    const detailsHTML = `
        <div class="space-y-4">
            <!-- Booking Summary -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div class="text-gray-400 text-sm">Reference</div>
                    <div class="font-mono text-amber-400">${escapedRefNumber}</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div class="text-gray-400 text-sm">Status</div>
                    <div><span class="status-badge ${statusClass} text-center">${booking.resStatus || 'new'}</span></div>
                </div>
                <div class="col-span-2 md:col-span-1 bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div class="text-gray-400 text-sm">Total</div>
                    <div class="font-bold">${formatCurrency(booking.netTotal || 0)}</div>
                </div>
            </div>
            
            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Trip Details -->
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h4 class="font-medium mb-3 text-amber-400 border-b border-gray-700 pb-2">Trip Information</h4>
                    <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div class="p-4 rounded-lg border border-gray-700">
                            <div class="text-gray-400 text-sm">Tour</div>
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
                            <div class="font-medium">${escapeHtml(booking.pickupLocation)}</div>
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
                            <div class="font-medium">${escapeHtml(booking.email || 'N/A')}</div>
                        </div>
                        <div>
                            <div class="text-gray-400 text-sm">Hotel</div>
                            <div class="font-medium">${escapedHotel}</div>
                        </div>
                        <div>
                            <div class="text-gray-400 text-sm">Room</div>
                            <div class="font-medium">${escapedRoom}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Special Requests -->
            ${booking.tripType ? `
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 class="font-medium mb-2 text-amber-400">Special Requests</h4>
                <p class="text-gray-300 whitespace-pre-line">${escapedRequests}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    bookingDetailsContent.innerHTML = detailsHTML;
    const modal = document.getElementById('bookingDetailsModal');
    modal.classList.remove('hidden');
    
    // Force reflow to enable animation
    void modal.offsetWidth;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}





function closeModal() {
    const modal = document.getElementById('bookingDetailsModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}


  





function switchTab(tab) {
    activeTab = tab;
    
    // Update UI for active tab
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${tab}BookingsTab`).classList.add('active');
    
    // Hide/show date filter based on tab
    const dateFilterContainer = document.querySelector('#bookingsFilterBar .relative');
    if (tab === 'new' || tab === 'confirmed') {
        dateFilterContainer.classList.add('hidden');
    } else {
        dateFilterContainer.classList.remove('hidden');
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
    elements.searchInput.value = '';
    elements.statusFilter.value = tab === 'all' ? 'all' : tab;
    
    // Update Flatpickr if initialized
    if (flatpickrInstance) {
        if (defaultDate) {
            flatpickrInstance.setDate(defaultDate, true);
        } else {
            flatpickrInstance.clear();
        }
    }
    
    // Apply filters
    applyFilters();
}





// Update filterByDate function as shown in previous answer
function filterByDate(bookings, date, activeTab) {
    if (activeTab === 'new') {
        return bookings.filter(booking => 
            booking.tripDate === date && booking.resStatus?.toLowerCase() === 'new'
        );
    } else if (activeTab === 'confirmed') {
        return bookings.filter(booking => 
            booking.tripDate === date && booking.resStatus?.toLowerCase() === 'confirmed'
        );
    }
    return bookings.filter(booking => 
        !date || booking.tripDate === date
    );
}



    // Load bookings from Firebase - only shows bookings where owner = current user
    function loadBookings() {
        showLoading();
        
        if (realTimeListener) {
            database.ref("trip-bookings").orderByChild("owner").equalTo(currentUserId).off('value', realTimeListener);
        }
        
        realTimeListener = database.ref("trip-bookings")
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
                    initDateFilter();
                    
                    // Apply current filters
                    applyFilters();
                    updateDashboard();
                    hideLoading();
                } else {
                    showToast("No bookings found for your account", 'warning');
                    allBookings = [];
                    applyFilters();
                    updateDashboard();
                    hideLoading();
                }
            }, (error) => {
                showToast("Error loading data: " + error.message, 'error');
                hideLoading();
            });
    }

    // Update the dashboard
    function updateDashboard() {
        updateBookingsTable();
        updatePagination();
    }

    // Export bookings to Excel
    function exportToExcel() {
        if (filteredBookings.length === 0) {
            showToast("No bookings to export with current filters", 'warning');
            return;
        }

        const totals = {
            adults: filteredBookings.reduce((sum, b) => sum + (parseInt(b.adults) || 0), 0),
            childrenUnder12: filteredBookings.reduce((sum, b) => sum + (parseInt(b.childrenUnder12) || 0), 0),
            infants: filteredBookings.reduce((sum, b) => sum + (parseInt(b.infants) || 0), 0),
            amount: filteredBookings.reduce((sum, b) => sum + (parseFloat(b.netTotal) || 0), 0)
        };

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bookings');

        worksheet.columns = [
            { header: 'Ref #', key: 'refNumber', width: 25 },
            { header: 'Tour', key: 'tour', width: 25 },
            { header: 'Date', key: 'tripDate', width: 15 },
            { header: 'Status', key: 'resStatus', width: 15 },
            { header: 'Adults', key: 'adults', width: 10 },
            { header: 'Children (Under 12)', key: 'childrenUnder12', width: 15 },
            { header: 'Infants', key: 'infants', width: 10 },
            { header: 'Amount (EGP)', key: 'netTotal', width: 15 },
            { header: 'Customer', key: 'username', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Hotel', key: 'hotelName', width: 25 },
            { header: 'Room', key: 'roomNumber', width: 10 },
            { header: 'Special Requests', key: 'specialRequests', width: 30 }
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
            const rowIndex = index + 2;
            const row = worksheet.addRow({
                refNumber: booking.refNumber || '',
                tour: booking.tour || '',
                tripDate: booking.tripDate,
                resStatus: booking.resStatus || 'new',
                adults: booking.adults || 0,
                childrenUnder12: booking.childrenUnder12 || 0,
                infants: booking.infants || 0,
                netTotal: parseFloat(booking.netTotal || 0),
                username: booking.username || '',
                email: booking.email || '',
                phone: booking.phone || '',
                hotelName: booking.hotelName || '',
                roomNumber: booking.roomNumber || '',
                specialRequests: booking.tripType || ''
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
            const statusCell = worksheet.getCell(`D${rowIndex}`);
            const status = booking.resStatus?.toLowerCase() || 'new';
            
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
            hotelName: '',
            roomNumber: '',
            specialRequests: ''
        });

        // Style totals row
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
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                let columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
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
            a.download = `Bookings_Export_${dateStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }).catch(error => {
            console.error('Error generating Excel file:', error);
            showToast('Error generating Excel file: ' + error.message, 'error');
        });
    }
    
    function refreshBookings() {
        loadBookings();
        showToast('Bookings refreshed', 'success');
    }

    // Helper Functions
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatNumber(num) {
        const numberValue = typeof num === 'string' ? parseFloat(num) || 0 : num || 0;
        
        if (numberValue >= 1000000) {
            return (numberValue / 1000000).toFixed(1) + 'm';
        }
        if (numberValue >= 1000) {
            return (numberValue / 1000).toFixed(1) + 'k';
        }
        return numberValue.toString();
    }

    function formatCurrency(num) {
        const numberValue = typeof num === 'string' ? parseFloat(num) || 0 : num || 0;
        
        if (numberValue >= 1000000) {
            return 'EGP ' + (numberValue / 1000000).toFixed(3) + 'm';
        }
        if (numberValue >= 1000) {
            return 'EGP ' + (numberValue / 1000).toFixed(3);
        }
        return 'EGP ' + numberValue.toFixed(2);
    }

    function formatNoCurrency(num) {
        const numberValue = typeof num === 'string' ? parseFloat(num) || 0 : num || 0;
        
        if (numberValue >= 1000000) {
            return (numberValue / 1000000).toFixed(3) + 'm';
        }
        if (numberValue >= 1000) {
            return (numberValue / 1000).toFixed(3);
        }
        return numberValue.toFixed(2);
    }





    function formatTripDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        // Split the date string into parts
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        
        const year = parts[0];
        let month = parts[1];
        let day = parts[2];
        
        // Ensure month has leading zero if needed
        month = month.padStart(2, '0');
        
        // Remove leading zero from day
        day = parseInt(day, 10).toString();
        
        // Validate components
        if (!/^\d{4}$/.test(year)) return dateString;
        if (!/^\d{2}$/.test(month)) return dateString;
        if (!/^\d{1,2}$/.test(day)) return dateString;
        
        // Validate date ranges
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        
        if (monthNum < 1 || monthNum > 12) return dateString;
        if (dayNum < 1 || dayNum > 31) return dateString;
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return dateString;
    }
}









    function showLoading() {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-cell text-center text-gray-500">
                    <div class="flex justify-center items-center space-x-2">
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                        <span>Loading bookings...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    function hideLoading() {
        // Loading state is automatically removed when data loads
    }

    // Show toast notification
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }









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
    if (elements.saveBtn) elements.saveBtn.disabled = true;
  },

  hideLoading: () => {
    elements.spinner.classList.add('hidden');
    if (elements.saveBtn) elements.saveBtn.disabled = false;
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
    if (!data.image) errors.push('Main image is required');
    return errors.length ? errors : null;
  },

  // Dashboard Utilities
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
    
    elements.totalTrips.textContent = approvedTrips.length;
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
      elements.userEmail.value = userData.email;
      elements.userPhone.value = userData.phone;
      elements.userName.value = userData.username ;
      const photoS = document.getElementById('profile-s');
      const photoPreview = document.getElementById('profile-pic-preview');
      if (userData.photo) {
        photoPreview.src = userData.photo;
        photoS.src = userData.photo;
      } else {
        photoPreview.src = 'https://via.placeholder.com/150';
        photoS.src = 'https://via.placeholder.com/150';
      }
      
      // Show/hide new trip button based on role
      if (tripManager.canEditTrips()) {
        if (elements.newTripBtn) elements.newTripBtn.classList.remove('hidden');
        if (elements.emptyStateNewTripBtn) elements.emptyStateNewTripBtn.classList.remove('hidden');
      }
    });
  },



loadpayout: (userId) => {
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
      
      if (tripsArray.length === 0 && elements.emptyState) {
        elements.emptyState.classList.remove('hidden');
        return;
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

    // Initialize Tour Performance Chart
    const tourPerformanceDom = document.getElementById('tourPerformanceChart');
    if (tourPerformanceDom) {
      tourPerformanceChart = echarts.init(tourPerformanceDom);
      
      window.addEventListener('resize', function() {
        tourPerformanceChart.resize();
      });
    }
  },

  processBookingData: (data) => {
    try {
      bookingData = Object.values(data || {});
      filteredBookingData = [...bookingData];
      
      dashboardManager.updateStatsCards();
      dashboardManager.updateStatusChart();
      dashboardManager.updateTrendChart();
      dashboardManager.updateGuestChart();
      dashboardManager.updateTourPerformanceChart();
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

  updateTourPerformanceChart: () => {
    try {
      const tourPerformanceDom = document.getElementById('tourPerformanceChart');
      if (!tourPerformanceDom) return;
      
      // Initialize chart if not already done or if destroyed
      if (!tourPerformanceChart || typeof tourPerformanceChart.setOption !== 'function') {
        tourPerformanceChart = echarts.init(tourPerformanceDom);
        
        // Handle window resize
        window.addEventListener('resize', function() {
          if (tourPerformanceChart && typeof tourPerformanceChart.resize === 'function') {
            tourPerformanceChart.resize();
          }
        });
      }

      // Aggregate data by tour name
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
      const tourPerformanceOption = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            const data = params[0];
            return tourPerformanceMetric === 'bookings'
              ? `${data.name}<br/>Bookings: ${data.value}`
              : `${data.name}<br/>Revenue: EGP ${data.value.toFixed(2)}`;
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

      // Clear previous chart instance if it exists
      if (tourPerformanceChart && typeof tourPerformanceChart.dispose === 'function') {
        tourPerformanceChart.dispose();
      }
      
      // Reinitialize chart
      tourPerformanceChart = echarts.init(tourPerformanceDom);
      tourPerformanceChart.setOption(tourPerformanceOption);

    } catch (error) {
      console.error("Error updating tour performance chart:", error);
      
      // Attempt to reinitialize chart on error
      const tourPerformanceDom = document.getElementById('tourPerformanceChart');
      if (tourPerformanceDom) {
        tourPerformanceChart = echarts.init(tourPerformanceDom);
      }
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
          
        case 'tourPerformanceChart':
          if (tourPerformanceChart) {
            filename = `tour-performance-${new Date().toISOString().slice(0,10)}.png`;
            tourPerformanceChart.getDataURL({
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
    dashboardManager.updateTourPerformanceChart();
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
      
      const bookingsRef = database.ref("trip-bookings")
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






document.addEventListener("DOMContentLoaded", function () {
  const savePayoutBtn = document.getElementById("savePayoutBtn");
  const payoutNameInput = document.getElementById("payoutName");
  const accountNumberInput = document.getElementById("accountNumber");
  const bankNameInput = document.getElementById("bankName");
  const branchNameInput = document.getElementById("branchName");
  const payoutMethodSelect = document.getElementById("payoutMethod");
 
  // payout Management Functions
  savePayoutBtn.addEventListener('click', function() {
    const userId = auth.currentUser.uid;
    const method = payoutMethodSelect.value;
    const name = payoutNameInput.value.trim();
    const accountNumber = accountNumberInput.value.trim();
    const bankName = bankNameInput.value.trim();
    const branchName = branchNameInput.value.trim();

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
    savePayoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    savePayoutBtn.disabled = true;

    // Save to Firebase
    database.ref('egy_user/' + userId + '/payoutMethod').update(payoutData)
      .then(() => {
        utils.showToast('Payout method saved successfully', 'success');

        // Reset edit buttons
        document.querySelectorAll('#payoutForm .edit-btn').forEach(btn => {
          btn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        });

        // Make inputs readonly
        payoutNameInput.readOnly = true;
        accountNumberInput.readOnly = true;
        bankNameInput.readOnly = true;
        branchNameInput.readOnly = true;
      })
      .catch((error) => {
        utils.showToast('Failed to save payout method', 'error');
        console.error('Error saving payout method:', error);
      })
      .finally(() => {
        savePayoutBtn.innerHTML = '<i class="fas fa-save"></i> Payout Method Saved';
        savePayoutBtn.disabled = false;
      });
  });
});









// Event Listeners
const setupEventListeners = () => {
            // Search input event
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                applyFilters();
            }
        });
    
    
    
  // Form submission (only if user can edit)
  if (tripManager.canEditTrips() && elements.tripForm) {
    elements.tripForm.addEventListener('submit', tripManager.saveTrip);
    
    // Add buttons for dynamic fields
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
    
    // New trip buttons
    if (elements.newTripBtn) elements.newTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
    
    if (elements.emptyStateNewTripBtn) elements.emptyStateNewTripBtn.addEventListener('click', () => {
      tripManager.resetForm();
      tripManager.showEditorSection();
    });
  }
  
  // Common event listeners
  if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', tripManager.showListSection);
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    });
  });
  
  // Tab switching
  if (elements.tripListTab) elements.tripListTab.addEventListener('click', tripManager.showListSection);
  if (elements.tripEditorTab) elements.tripEditorTab.addEventListener('click', tripManager.showEditorSection);
  
  
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

  // Tour performance metric dropdown
  if (elements.tourPerformanceMetric) {
    elements.tourPerformanceMetric.addEventListener('change', function() {
      tourPerformanceMetric = this.value;
      dashboardManager.updateTourPerformanceChart();
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
        dashboardManager.initCharts();
        dashboardManager.initDateRangePicker();
        dashboardManager.loadBookingData();
        tripManager.loadpayout(user.uid);
        setupEventListeners();
      });
    } else {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    }
  });
};

// Start the app
initApp();
