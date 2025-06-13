import { database, currentUserId, showToast, showLoadingSpinner, escapeHtml, flatpickrInstance, allBookings, currentFilters, activeTab } from './index.js';

let realTimeListener = null;

function loadBookings() {
  showLoadingSpinner(true);
  if (realTimeListener) {
    database.ref("trip-bookings").off('value', realTimeListener);
  }
  realTimeListener = database.ref("trip-bookings")
    .orderByChild("owner")
    .equalTo(currentUserId)
    .on('value', (snapshot) => {
      if (snapshot.exists()) {
        allBookings.length = 0;
        snapshot.forEach((childSnapshot) => {
          const booking = childSnapshot.val();
          booking.key = childSnapshot.key;
          booking.resStatus = booking.resStatus?.trim() || 'new';
          allBookings.push(booking);
        });
        initDateFilter();
        applyFilters();
        hideLoadingSpinner();
      } else {
        showToast("No bookings found for your account", 'warning');
        allBookings.length = 0;
        applyFilters();
        hideLoadingSpinner();
      }
    }, (error) => {
      showToast(`Error loading data: ${error.message}`, 'error');
      hideLoadingSpinner();
    });
}

function initDateFilter() {
  if (flatpickrInstance) {
    flatpickrInstance.destroy();
    flatpickrInstance = null;
  }

  const availableDates = [...new Set(allBookings
    .map(b => b.tripDate)
    .filter(Boolean)
    .map(d => formatTripDate(d)))];

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
        applyFilters();
      }
    }
  });
}

function applyFilters() {
  const filteredBookings = filterBookings(allBookings, currentFilters);
  updateBookingsTable(filteredBookings);
}

function filterBookings(bookings, filters) {
  return bookings.filter(booking => {
    const matchesSearch = !filters.search || 
      (booking.refNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
       booking.guestName?.toLowerCase().includes(filters.search.toLowerCase()));
    const matchesDate = !filters.date || formatTripDate(booking.tripDate) === filters.date;
    const matchesStatus = !filters.status || booking.resStatus?.toLowerCase() === filters.status.toLowerCase();
    return matchesSearch && matchesDate && matchesStatus;
  });
}

function updateBookingsTable(bookings) {
  const tableBody = document.querySelector('#bookingsTable tbody');
  tableBody.innerHTML = '';
  for (const booking of bookings) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2">${escapeHtml(booking.refNumber)}</td>
      <td class="p-2"}>${escapeHtml}</td>
      <td class="p-2"}>${formatTripDate(booking.tripDate)}</td>
      <td class="p-2">${escapeHtml(booking.guests)}</td>
      <td class="p-2">${escapeHtml(booking.total)}</td>
      <td class="p-2">${escapeHtml(booking.resStatus)}</td>
      <td class="p-2">
        <button class="bg-blue-500 text-white px-2 py-1" onclick="showBookingDetails('${escapeHtml(booking.refNumber)}')">View</button>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

function formatTripDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date)) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString;
  }
}

function showBookingDetails(refNumber) {
  const booking = allBookings.find(b => b.refNumber === refNumber);
  if (!booking) {
    showToast('Booking not found.', 'error');
    return;
  }

  const modal = document.getElementById('bookingDetailsModal');
  const content = document.getElementById('bookingDetailsContent');
  content.innerHTML = `
    <p><strong>Reference:</strong> ${escapeHtml(booking.refNumber)}</p>
    <p><strong>Trip:</strong> ${escapeHtml(booking.tripName)}</p>
    <p><strong>Date:</strong> ${formatTripDate(booking.tripDate)}</p>
    <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
    <p><strong>Total:</strong> ${escapeHtml(booking.total)}</p>
    <p><strong>Status:</strong> ${escapeHtml(booking.resStatus)}</p>
  `;

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.remove('show');
  modal.classList.add('hidden');
  modal.style.display = 'flex';
  modal.focus();
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('bookingDetailsModal');
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('show');
  modal.classList.add('hidden');
  setTimeout(() => {
    modal.display = 'none';
    document.body.style.overflow = '';
  }, 300);
}

export { loadBookings, initDateFilter, applyFilters, updateBookingsTable, formatTripDate, realTimeListener };
