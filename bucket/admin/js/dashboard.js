import { allBookings, statusChart, trendChart, guestChart } from './index.js';

function initCharts() {
  const destroyChart = (chart) => {
    if (chart) {
      chart.destroy();
      return null;
    }
    return chart;
  };

  statusChart = destroyChart(statusChart);
  trendChart = destroyChart(trendChart);
  guestChart = destroyChart(guestChart);

  const statusCtx = document.getElementById('statusChart')?.getContext('2d');
  if (statusCtx) {
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['New', 'Confirmed', 'Cancelled'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
        }]
      },
      options: { responsive: true }
    });
  }

  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  if (trendCtx) {
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [{
          label: 'Bookings',
          data: [0, 0, 5, 2],
          borderColor: '#36A2EB',
          fill: false
        }]
      options: { responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  const guestCtx = document.getElementById('guestChart')?.getContext('2d');
  if (guestCtx) {
    guestChart = new Chart(guestCtx, {
      type: 'doughnut',
      data: {
        labels: ['Solo', 'Group', 'Family'],
        datasets: [{
          data: [10, 20, 15],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
        }]
      },
      options: { responsive: true }
    });
  }
}

function updateDashboard() {
  const stats = calculateStats(allBookings);
  updateChart(statusChart, {
    datasets: [{
      data: [stats.new, stats.confirmed, stats.cancelled]
    });
  updateChart(trendChart, {
    labels: stats.trendLabels,
    datasets: [{
      data: stats.trendData
    }]
  });
  updateChart(guestChart, {
    datasets: [{
      data: [stats.guestStats.solo, stats.guestStats.group, stats.guestStats.family]
    }]
  });
}

function calculateStats(bookings) {
  return {
    new: bookings.filter(b => b.resStatus === 'new')).length,
    confirmed: bookings.filter(b => b.resStatus === 'confirmed')).length,
    cancelled: bookings.filter(b => b.resStatus === 'cancelled')).length,
    trendLabels: ['Jan', 'Feb', 'Mar', 'Apr'], // Simplified
    trendData: [4, 6, 8, 5], // Simplified
    guestStats: {
      solo: bookings.filter(b => b.guests === 'Solo')).length,
      group: bookings.filter(b => b.guests === 'Group')).length,
      family: bookings.filter(b => b.guests === 'Family')).length
    }
  };
}

function updateChart(chart, data) {
  if (chart) {
    chart.data = {...chart.data, ...data};
    chart.update();
  }
}

export { initCharts, updateDashboard };
