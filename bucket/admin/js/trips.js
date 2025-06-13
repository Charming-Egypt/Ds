import { database, showToast, escapeHtml } from './index.js';

function loadTrips() {
  database.ref('trips').once('value')
    .then(snapshot => {
      if (snapshot.exists()) {
        renderTrips(snapshot.val());
      } else {
        showToast('No trips found.', 'warning');
      }
    })
    .catch(error => {
      showToast(`Error loading trips: ${error.message}`, 'error');
    });
}

function renderTrips(trips) {
  const tableBody = document.querySelector('#bookingsTable tbody');
  tableBody.innerHTML = '';
  Object.values(trips).forEach(trip => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2">${escapeHtml(trip.id)}</td>
      <td class="p-2">${escapeHtml(trip.name)}</td>
      <td class="p-2">${escapeHtml(trip.date)}</td>
      <td class="p-2">${escapeHtml(trip.guests)}</td>
      <td class="p-2">${escapeHtml(trip.total)}</td>
      <td class="p-2">${escapeHtml(trip.status)}</td>
      <td class="p-2">
        <button class="bg-blue-500 text-white px-2 py-1 rounded" onclick="showBookingDetails('${escapeHtml(trip.id)}')">View</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

export { loadTrips, renderTrips };
