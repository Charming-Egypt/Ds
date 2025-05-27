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

// Global Variables
let statusChart, trendChart, guestChart, tourPerformanceChart;
let currentUser = null;
let currentUserRole = 'user';
let currentPeriod = 'week';
let bookingData = [];
let filteredBookingData = [];
let tourPerformanceMetric = 'bookings';
let dateRangePicker;

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

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initialize Charts
function initCharts() {
  try {
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
                color: '#f5f5f5',
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
              bodyColor: '#f5f5f5',
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
              bodyColor: '#f5f5f5',
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
              },
              ticks: {
                color: '#f5f5f5'
              }
            },
            x: {
              grid: {
                color: '#444',
                display: false
              },
              ticks: {
                color: '#f5f5f5'
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
                color: '#f5f5f5',
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
              bodyColor: '#f5f5f5',
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

    // Initialize Tour Performance Chart with ECharts
    const tourPerformanceDom = document.getElementById('tourPerformanceChart');
    if (tourPerformanceDom) {
      tourPerformanceChart = echarts.init(tourPerformanceDom);
      
      const tourPerformanceOption = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            return params[0].name + '<br/>' + 
              (tourPerformanceMetric === 'revenue' 
                ? 'Revenue: EGP ' + params[0].value.toLocaleString() 
                : 'Bookings: ' + params[0].value.toLocaleString());
          },
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderColor: '#ffc107',
          textStyle: {
            color: '#f5f5f5'
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
          axisLine: {
            lineStyle: {
              color: '#666'
            }
          },
          axisLabel: {
            color: '#f5f5f5',
            formatter: function(value) {
              return tourPerformanceMetric === 'revenue' 
                ? 'EGP ' + value.toLocaleString() 
                : value.toLocaleString();
            }
          },
          splitLine: {
            lineStyle: {
              color: '#444'
            }
          }
        },
        yAxis: {
          type: 'category',
          data: [],
          axisLine: {
            lineStyle: {
              color: '#666'
            }
          },
          axisLabel: {
            color: '#f5f5f5',
            fontSize: 12
          }
        },
        series: [
          {
            name: tourPerformanceMetric === 'revenue' ? 'Revenue' : 'Bookings',
            type: 'bar',
            data: [],
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
                return tourPerformanceMetric === 'revenue' 
                  ? 'EGP ' + params.value.toLocaleString() 
                  : params.value.toLocaleString();
              },
              color: '#333',
              fontWeight: 'bold'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(255, 193, 7, 0.5)'
              }
            }
          }
        ]
      };
      
      tourPerformanceChart.setOption(tourPerformanceOption);
      
      window.addEventListener('resize', function() {
        tourPerformanceChart.resize();
      });
    }
  } catch (error) {
    console.error("Error initializing charts:", error);
  }
}

// Process Booking Data
function processBookingData(data) {
  try {
    bookingData = Object.values(data || {});
    filteredBookingData = [...bookingData];
    
    updateStatsCards();
    updateStatusChart();
    updateTrendChart();
    updateGuestChart();
    updateTourPerformanceChart();
  } catch (error) {
    console.error("Error processing booking data:", error);
  }
}

// Update Stats Cards
function updateStatsCards() {
  try {
    const confirmedBookings = filteredBookingData.filter(b => b.resStatus?.toLowerCase() === 'confirmed');
    
    const totalBookingsEl = document.getElementById('totalBookings');
    if (totalBookingsEl) totalBookingsEl.textContent = confirmedBookings.length.toLocaleString();
    
    const totalGuests = confirmedBookings.reduce((total, booking) => {
      return total + 
        (parseInt(booking.adults) || 0) + 
        (parseInt(booking.childrenUnder12) || 0) + 
        (parseInt(booking.infants) || 0);
    }, 0);
    
    const totalGuestsEl = document.getElementById('totalGuests');
    if (totalGuestsEl) totalGuestsEl.textContent = totalGuests.toLocaleString();
    
    const totalRevenue = confirmedBookings.reduce((total, booking) => {
      return total + (parseFloat(booking.netTotal) || 0);
    }, 0);
    
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) totalRevenueEl.textContent = 'EGP ' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    const ratedBookings = confirmedBookings.filter(b => b.rating);
    const avgRating = ratedBookings.length > 0 
      ? (ratedBookings.reduce((sum, b) => sum + parseFloat(b.rating || 0), 0) / ratedBookings.length)
      : 0;
    
    const avgRatingEl = document.getElementById('avgRating');
    if (avgRatingEl) avgRatingEl.textContent = avgRating.toFixed(1);
  } catch (error) {
    console.error("Error updating stats cards:", error);
  }
}

// Update Status Chart
function updateStatusChart() {
  if (!statusChart) return;
  
  try {
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
    
    const statusUpdatedEl = document.getElementById('statusUpdated');
    if (statusUpdatedEl) statusUpdatedEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
  } catch (error) {
    console.error("Error updating status chart:", error);
  }
}

// Update Trend Chart
function updateTrendChart() {
  if (!trendChart) return;
  
  try {
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
    
    const trendUpdatedEl = document.getElementById('trendUpdated');
    if (trendUpdatedEl) trendUpdatedEl.textContent = currentYear;
  } catch (error) {
    console.error("Error updating trend chart:", error);
  }
}

// Update Guest Chart
function updateGuestChart() {
  if (!guestChart) return;
  
  try {
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
    
    const guestUpdatedEl = document.getElementById('guestUpdated');
    if (guestUpdatedEl) guestUpdatedEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
  } catch (error) {
    console.error("Error updating guest chart:", error);
  }
}

// Update Tour Performance Chart
function updateTourPerformanceChart() {
  if (!tourPerformanceChart) return;
  
  try {
    const tourData = {};
    
    filteredBookingData.forEach(booking => {
      if (booking.resStatus?.toLowerCase() === 'confirmed') {
        const tour = booking.tour || 'Other';
        
        if (!tourData[tour]) {
          tourData[tour] = {
            bookings: 0,
            revenue: 0
          };
        }
        
        tourData[tour].bookings++;
        tourData[tour].revenue += parseFloat(booking.netTotal) || 0;
      }
    });
    
    const sortedTours = Object.entries(tourData)
      .sort((a, b) => b[1][tourPerformanceMetric] - a[1][tourPerformanceMetric])
      .slice(0, 8);
    
    const tourNames = sortedTours.map(item => item[0]);
    const tourValues = sortedTours.map(item => item[1][tourPerformanceMetric]);
    
    tourPerformanceChart.setOption({
      yAxis: {
        data: tourNames
      },
      series: [{
        name: tourPerformanceMetric === 'revenue' ? 'Revenue' : 'Bookings',
        data: tourValues
      }]
    });
  } catch (error) {
    console.error("Error updating tour performance chart:", error);
  }
}

// Initialize Date Range Picker
function initDateRangePicker() {
  const dateRangePickerEl = document.getElementById('dateRangePicker');
  if (!dateRangePickerEl) return;
  
  dateRangePicker = flatpickr(dateRangePickerEl, {
    mode: "range",
    dateFormat: "Y-m-d",
    onClose: function(selectedDates) {
      if (selectedDates.length === 2) {
        document.querySelectorAll('.filter-btn[data-period]').forEach(b => b.classList.remove('active'));
        currentPeriod = 'custom';
        filterDataByDateRange(selectedDates[0], selectedDates[1]);
        updateAllCharts();
      }
    }
  });
}

// Setup Filter Buttons
function setupFilterButtons() {
  const filterButtons = document.querySelectorAll('.filter-btn[data-period]');
  if (filterButtons.length === 0) return;
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn[data-period]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentPeriod = this.dataset.period;
      
      if (currentPeriod !== 'custom') {
        if (dateRangePicker) dateRangePicker.clear();
        filteredBookingData = applyPeriodFilter();
        updateAllCharts();
      }
    });
  });

  const tourPerformanceMetricEl = document.getElementById('tourPerformanceMetric');
  if (tourPerformanceMetricEl) {
    tourPerformanceMetricEl.addEventListener('change', function() {
      tourPerformanceMetric = this.value;
      updateTourPerformanceChart();
    });
  }

  document.addEventListener('click', function(e) {
    if (e.target.closest('.export-btn')) {
      const btn = e.target.closest('.export-btn');
      const chartId = btn.dataset.chart;
      exportChart(chartId);
    }
  });

  const exportDataBtn = document.getElementById('exportData');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportToExcel);
  }
}

// Initialize App
function initApp() {
  // Check offline status
  firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
      showToast('Working offline - changes will sync when connection resumes', 'warning');
    }
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      state.currentUser = user;
      tripManager.loadUserRole(user.uid).then(() => {
        tripManager.loadTripList();
        setupEventListeners();
        initDateRangePicker();
        setupFilterButtons();
        initEventListeners();
        loadBookingData();
      });
    } else {
      window.location.href = 'https://www.discover-sharm.com/p/login.html';
    }
  });
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});
