
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

    // DOM Elements
    const bookingsTableBody = document.getElementById('bookingsTableBody');
    const toast = document.getElementById('toast');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const bookingDetailsModal = document.getElementById('bookingDetailsModal');
    const bookingDetailsContent = document.getElementById('bookingDetailsContent');
    
    // Pagination Elements
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const startItemSpan = document.getElementById('startItem');
    const endItemSpan = document.getElementById('endItem');
    const totalItemsSpan = document.getElementById('totalItems');
    
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

    // Set up event listeners
    function setupEventListeners() {
        // Search input event
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                applyFilters();
            }
        });
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
                    currentFilters.date = dateStr;
                    applyFilters();
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

    // Get tomorrow's date in YYYY-MM-DD format
    function getTomorrowDateString() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
  
    // Get today's date in YYYY-MM-DD format
    function getTodayDateString() {
        const ftoday = new Date();
        ftoday.setDate(ftoday.getDate());
        return ftoday.toISOString().split('T')[0];
    }

    // Apply all filters
    function applyFilters() {
        currentFilters.search = searchInput.value.toLowerCase();
        currentFilters.status = statusFilter.value;
        
        filterBookings();
    }

    // Filter bookings based on current filters
    function filterBookings() {
        let filtered = [...allBookings];
        
        // Apply search filter
        if (currentFilters.search) {
            filtered = filtered.filter(booking => 
                (booking.refNumber && booking.refNumber.toLowerCase().includes(currentFilters.search)) ||
                (booking.tour && booking.tour.toLowerCase().includes(currentFilters.search)) ||
                (booking.username && booking.username.toLowerCase().includes(currentFilters.search)) ||
                (booking.email && booking.email.toLowerCase().includes(currentFilters.search))
            );
        }
        
        // Apply status filter
        if (currentFilters.status !== 'all') {
            filtered = filtered.filter(booking => 
                booking.resStatus && booking.resStatus.toLowerCase() === currentFilters.status.toLowerCase()
            );
        }
        
        // Apply date filter
        if (currentFilters.date) {
            filtered = filtered.filter(booking => 
                booking.tripDate === currentFilters.date
            );
        }
        
        // Apply tab filter
        if (activeTab !== 'all') {
            filtered = filtered.filter(booking => 
                booking.resStatus && booking.resStatus.toLowerCase() === activeTab.toLowerCase()
            );
        }
        
        filteredBookings = filtered;
        currentPage = 1;
        updateBookingsTable();
        updatePagination();
    }

    // Update the bookings table with pagination
    function updateBookingsTable() {
        bookingsTableBody.innerHTML = '';
        
        if (filteredBookings.length === 0) {
            bookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-cell text-center text-gray-500">
                        No bookings found matching the current filters
                    </td>
                </tr>
            `;
            return;
        }
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredBookings.length);
        const paginatedBookings = filteredBookings.slice(startIndex, endIndex);
        
        paginatedBookings.forEach(booking => {
            if (!booking.refNumber) return;
            
            const statusClass = getStatusClass(booking.resStatus);
            const escapedRefNumber = escapeHtml(booking.refNumber);
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-800/50 transition-colors';
            
            const tour = escapeHtml(booking.tour || 'Unknown Tour');
            const tripDate = escapeHtml(booking.tripDate || '');
            const resStatus = escapeHtml(booking.resStatus || 'new');
            
            row.innerHTML = `
                <td class="table-cell whitespace-nowrap font-mono">
                    <button onclick="showBookingDetails('${escapedRefNumber}')" class="text-amber-400 hover:text-indigo-300">
                        ${escapedRefNumber}
                    </button>
                </td>
                <td class="table-cell whitespace-nowrap">${tour}</td>
                <td class="table-cell whitespace-nowrap mobile-hidden">${tripDate}</td>
                <td class="table-cell whitespace-nowrap">
                    <span class="status-badge ${statusClass}">${resStatus}</span>
                </td>
                <td class="table-cell whitespace-nowrap"></td>
            `;
            bookingsTableBody.appendChild(row);
        });
    }

    // Update pagination controls
    function updatePagination() {
        const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
        
        totalPagesSpan.textContent = totalPages;
        currentPageSpan.textContent = currentPage;
        totalItemsSpan.textContent = filteredBookings.length;
        
        const startItem = ((currentPage - 1) * itemsPerPage) + 1;
        const endItem = Math.min(currentPage * itemsPerPage, filteredBookings.length);
        
        startItemSpan.textContent = startItem;
        endItemSpan.textContent = endItem;
        
        // Disable/enable pagination buttons
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
        
        // Update button styles based on disabled state
        prevPageBtn.className = `px-2 py-1 sm:px-3 sm:py-1 rounded-lg ${currentPage === 1 ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-xs sm:text-sm`;
        nextPageBtn.className = `px-2 py-1 sm:px-3 sm:py-1 rounded-lg ${currentPage === totalPages ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-xs sm:text-sm`;
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

    // Show booking details modal
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
        
        const detailsHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div class="col-span-2 bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <h4 class="text-base sm:text-lg font-semibold mb-1 sm:mb-2">${escapedTour}</h4>
                    <div class="flex justify-between items-center">
                        <span class="text-xs sm:text-sm text-gray-400">Ref #: ${escapedRefNumber}</span>
                        <span class="status-badge2 ${statusClass}">${booking.resStatus || 'new'}</span>
                    </div>
                </div>

                <div class="col-span-2 grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4">
                    <div class="bg-gray-800 p-3 sm:p-4 rounded-lg">
                        <h5 class="font-medium mb-1 sm:mb-2">Trip Details</h5>
                        <div class="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Date:</span>
                                <span>${booking.tripDate}</span>
                            </div>
                            
                            <div class="flex justify-between">
                                <span class="text-gray-400">Adult's:</span>
                                <span>${booking.adults || 0} Adults</span>     
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Children:</span>
                                <span>${booking.childrenUnder12 ? ` ${booking.childrenUnder12} Children` : ''}</span>     
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Kid's:</span>
                                <span>${booking.infants ? ` ${booking.infants} Kids` : ''}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-800 p-3 sm:p-4 rounded-lg">
                        <h5 class="font-medium mb-1 sm:mb-2">Customer Details</h5>
                        <div class="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Name:</span>
                                <span>${escapedUsername}</span>
                            </div>
                       
                            <div class="flex justify-between">
                                <span class="text-gray-400">Phone:</span>
                                <span>${escapedPhone}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Hotel:</span>
                                <span>${escapedHotel}</span>
                            </div>
                            
                            <div class="flex justify-between">
                                <span class="text-gray-400">Room:</span>
                                <span>${escapedRoom}</span>
                            </div>  
                        </div>
                    </div>
                </div>
                
                ${booking.tripType ? `
                <div class="col-span-2 bg-gray-800 p-3 sm:p-4 rounded-lg">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Total:</span>
                        <span class="font-medium">${formatCurrency(booking.netTotal || 0)}</span>
                    </div>
                    <h5 class="font-medium mb-1 sm:mb-2">Special Requests</h5>
                    <p class="text-xs sm:text-sm">${escapedRequests}</p>
                </div>
                ` : ''}
                
                <div class="col-span-2 flex justify-end space-x-2 pt-3 sm:pt-4">
                    <button onclick="closeModal()" class="px-3 py-1 sm:px-4 sm:py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs sm:text-sm">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        bookingDetailsContent.innerHTML = detailsHTML;
        bookingDetailsModal.classList.remove('hidden');
    }

    // Close modal
    function closeModal() {
        bookingDetailsModal.classList.add('hidden');
    }

    // Switch between tabs
    function switchTab(tab) {
        activeTab = tab;
        
        // Update active tab styling
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${tab}BookingsTab`).classList.add('active');
        
        // Update table title
        const titles = {
            'all': 'All Bookings',
            'new': 'New Bookings',
            'confirmed': 'Confirmed Bookings',
        };
        document.getElementById('bookingsTableTitle').textContent = titles[tab];
        
        // Set tomorrow's date filter by default for new bookings
        if (tab === 'new') {
            const tomorrow = getTomorrowDateString();
            if (flatpickrInstance) {
                flatpickrInstance.setDate(tomorrow, true);
            }
            currentFilters.date = tomorrow;
        } 
        else if (tab === 'confirmed') {
            const ftoday = getTodayDateString();
            if (flatpickrInstance) {
                flatpickrInstance.setDate(ftoday, true);
            }
            currentFilters.date = ftoday;
        } 
        else {
            // Clear date filter for other tabs
            if (flatpickrInstance) {
                flatpickrInstance.clear();
            }
            currentFilters.date = null;
        }
        
        // Reapply filters with new tab
        applyFilters();
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
            const [year, month, day] = dateString.split('-');
            const date = new Date(year, month - 1, day);
            
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            console.error('Error formatting tripDate:', dateString, e);
            return 'Invalid Date';
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
