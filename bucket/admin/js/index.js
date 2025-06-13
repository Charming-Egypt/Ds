import { initializeAuth, currentUserId } from './js/auth.js';
import { loadTrips, renderTrips } from './js/trips.js';
import { loadBookings, applyFilters, initDateFilter, updateBookingsTable } from './bookings.js';
import { initCharts, updateDashboard } from './js/dashboard.js';
import { attachPayoutButtonHandler } from './js/payouts.js';
import { showToast, showLoadingSpinner, escapeHtml } from './js/utils.js';

let realTimeListener = null;
let flatpickrInstance = null;
let statusChart = null;
let trendChart = null;
let guestChart = null;
let allBookings = [];
let currentFilters = { search: '', date: '', status: '' };
let activeTab = 'all';

const firebaseConfig = {
  apiKey: "securely-fetched-from-backend",
  authDomain: "egypt-travels.firebaseapp.com",
  databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
  projectId: "egypt-travels"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

function initApp() {
  initializeAuth(handleAuthStateChange);
  setupEventListeners();
  window.addEventListener('beforeunload', cleanup);
}

function handleAuthStateChange(user) {
  const logoutBtn = document.getElementById('logoutBtn');
  if (user) {
    logoutBtn.classList.remove('hidden');
    loadTrips();
    loadBookings();
    updateDashboard();
    attachPayoutButtonHandler(currentUserId, document.getElementById('availablePayout'));
  } else {
    logoutBtn.classList.add('hidden');
    cleanup();
    window.location.href = '/login.html';
  }
}

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());
  document.getElementById('allTab').addEventListener('click', () => switchTab('all'));
  document.getElementById('newTab').addEventListener('click', () => switchTab('new'));
  document.getElementById('confirmedTab').addEventListener('click', () => switchTab('confirmed'));
  document.getElementById('searchInput').addEventListener('input', debounce(() => applyFilters(), 300));
}

function switchTab(tab) {
  activeTab = tab;
  ['allTab', 'newTab', 'confirmedTab'].forEach(id => {
    document.getElementById(id).classList.toggle('bg-blue-500', id === `${tab}Tab`);
    document.getElementById(id).classList.toggle('bg-gray-300', id !== `${tab}Tab`);
  });
  currentFilters.status = tab === 'all' ? '' : tab;
  applyFilters();
}

function cleanup() {
  if (realTimeListener) {
    database.ref("trip-bookings").off('value', realTimeListener);
    realTimeListener = null;
  }
  if (flatpickrInstance) {
    flatpickrInstance.destroy();
    flatpickrInstance = null;
  }
  [statusChart, trendChart, guestChart].forEach(chart => chart?.destroy());
  statusChart = trendChart = guestChart = null;
}

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

initApp();

export {
  database,
  auth,
  currentUserId,
  realTimeListener,
  flatpickrInstance,
  statusChart,
  trendChart,
  guestChart,
  allBookings,
  currentFilters,
  activeTab,
  showToast,
  showLoadingSpinner,
  escapeHtml,
  initDateFilter,
  applyFilters,
  updateDashboard
};
