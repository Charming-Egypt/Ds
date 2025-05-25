
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
        let currentUser = null;
        let currentUserRole = 'user';
        let currentPeriod = 'week';
        let bookingData = [];
        let filteredBookingData = [];
        let tourPerformanceMetric = 'bookings';
        let dateRangePicker;

        // DOM Elements
        const userRoleEl = document.getElementById('userRole');
        const userEmailEl = document.getElementById('userEmail');
        const userNameEl = document.getElementById('userName');


        // Show toast notification
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = `toast show ${type}`;
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Load User Role
        function loadUserRole(userId) {
            return database.ref('egy_user/' + userId).once('value').then(snapshot => {
                const userData = snapshot.val();
                currentUserRole = userData?.role || 'user';
                userRoleEl.textContent = currentUserRole;
                userRoleEl.className = 'role-badge ' + (
                    currentUserRole === 'admin' ? 'role-admin' : 
                    currentUserRole === 'moderator' ? 'role-moderator' : 'role-user'
                );
                userEmailEl.textContent = currentUser.email;
            
              userNameEl.textContent = currentUser.username;
                return currentUserRole;
            });
        }

        // Format date for filename (YYYY-MM-DD)
        function formatDateForFilename(date) {
            const d = new Date(date);
            return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        }

        // Get current date range label
        function getDateRangeLabel() {
            if (currentPeriod === 'custom' && dateRangePicker.selectedDates.length === 2) {
                const start = formatDateForFilename(dateRangePicker.selectedDates[0]);
                const end = formatDateForFilename(dateRangePicker.selectedDates[1]);
                return `${start}_to_${end}`;
            }
            
            const now = new Date();
            switch(currentPeriod) {
                case 'week':
                    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    return `Week_${formatDateForFilename(weekStart)}_to_${formatDateForFilename(weekEnd)}`;
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
        }

        // Initialize Charts
        function initCharts() {
            // Booking Status Chart (Doughnut)
            const statusCtx = document.getElementById('statusChart').getContext('2d');
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

            // Monthly Trends Chart (Line)
            const trendCtx = document.getElementById('trendChart').getContext('2d');
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

            // Guest Composition Chart (Half Doughnut)
            const guestCtx = document.getElementById('guestChart').getContext('2d');
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

            // Initialize Tour Performance Chart with ECharts
            const tourPerformanceDom = document.getElementById('tourPerformanceChart');
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

        // Filter data by date range
        function filterDataByDateRange(startDate, endDate) {
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
        }

        // Apply period filters
        function applyPeriodFilter() {
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
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                case 'all':
                default:
                    return bookingData;
            }
            
            return filterDataByDateRange(startDate, endDate);
        }

        // Update Stats Cards
        function updateStatsCards() {
            try {
                const confirmedBookings = filteredBookingData.filter(b => b.resStatus?.toLowerCase() === 'confirmed');
                
                document.getElementById('totalBookings').textContent = confirmedBookings.length.toLocaleString();
                
                const totalGuests = confirmedBookings.reduce((total, booking) => {
                    return total + 
                        (parseInt(booking.adults) || 0) + 
                        (parseInt(booking.childrenUnder12) || 0) + 
                        (parseInt(booking.infants) || 0);
                }, 0);
                document.getElementById('totalGuests').textContent = totalGuests.toLocaleString();
                
                const totalRevenue = confirmedBookings.reduce((total, booking) => {
                    return total + (parseFloat(booking.netTotal) || 0);
                }, 0);
                document.getElementById('totalRevenue').textContent = 'EGP ' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                
                const ratedBookings = confirmedBookings.filter(b => b.rating);
                const avgRating = ratedBookings.length > 0 
                    ? (ratedBookings.reduce((sum, b) => sum + parseFloat(b.rating || 0), 0) / ratedBookings.length)
                    : 0;
                document.getElementById('avgRating').textContent = avgRating.toFixed(1);
            } catch (error) {
                console.error("Error updating stats cards:", error);
            }
        }

        // Update Status Chart
        function updateStatusChart() {
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
                
                document.getElementById('statusUpdated').textContent = 'Updated: ' + new Date().toLocaleTimeString();
            } catch (error) {
                console.error("Error updating status chart:", error);
            }
        }

        // Update Trend Chart
        function updateTrendChart() {
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
                
                document.getElementById('trendUpdated').textContent = currentYear;
            } catch (error) {
                console.error("Error updating trend chart:", error);
            }
        }

        // Update Guest Chart
        function updateGuestChart() {
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
                
                document.getElementById('guestUpdated').textContent = 'Updated: ' + new Date().toLocaleTimeString();
            } catch (error) {
                console.error("Error updating guest chart:", error);
            }
        }

        // Update Tour Performance Chart
        function updateTourPerformanceChart() {
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

        // Export confirmed bookings to Excel
        function exportToExcel() {
            const confirmedBookings = filteredBookingData.filter(b => b.resStatus?.toLowerCase() === 'confirmed');
            
            if (confirmedBookings.length === 0) {
                showToast("No confirmed bookings to export with current filters", 'warning');
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
            const dateRangeStr = getDateRangeLabel();
            
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
                showToast('Error generating Excel file: ' + error.message, 'error');
            });
        }

        // Export chart as image
        function exportChart(chartId) {
            let canvas, filename;
            
            switch(chartId) {
                case 'statusChart':
                case 'trendChart':
                case 'guestChart':
                    canvas = document.getElementById(chartId);
                    filename = `${chartId}-${new Date().toISOString().slice(0,10)}.png`;
                    downloadCanvas(canvas, filename);
                    break;
                    
                case 'tourPerformanceChart':
                    filename = `tour-performance-${new Date().toISOString().slice(0,10)}.png`;
                    tourPerformanceChart.getDataURL({
                        type: 'png',
                        pixelRatio: 2,
                        backgroundColor: '#333'
                    }).then(url => {
                        downloadImage(url, filename);
                    });
                    break;
            }
        }

        // Download canvas as image
        function downloadCanvas(canvas, filename) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        // Download image from URL
        function downloadImage(url, filename) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
        }

        // Update All Charts
        function updateAllCharts() {
            updateStatsCards();
            updateStatusChart();
            updateTrendChart();
            updateGuestChart();
            updateTourPerformanceChart();
        }

        // Initialize Date Range Picker
        function initDateRangePicker() {
            dateRangePicker = flatpickr("#dateRangePicker", {
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
            return dateRangePicker;
        }

        // Setup Filter Buttons
        function setupFilterButtons() {
            document.querySelectorAll('.filter-btn[data-period]').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn[data-period]').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentPeriod = this.dataset.period;
                    
                    if (currentPeriod !== 'custom') {
                        dateRangePicker.clear();
                        filteredBookingData = applyPeriodFilter();
                        updateAllCharts();
                    }
                });
            });

            document.getElementById('tourPerformanceMetric').addEventListener('change', function() {
                tourPerformanceMetric = this.value;
                updateTourPerformanceChart();
            });

            document.addEventListener('click', function(e) {
                if (e.target.closest('.export-btn')) {
                    const btn = e.target.closest('.export-btn');
                    const chartId = btn.dataset.chart;
                    exportChart(chartId);
                }
            });

            document.getElementById('exportData').addEventListener('click', exportToExcel);
        }

        // Load Booking Data from Firebase
        function loadBookingData() {
            try {
                const bookingsRef = database.ref("trip-bookings")
                    .orderByChild("owner")
                    .equalTo(currentUser.uid);
                
                bookingsRef.once('value')
                    .then(snapshot => {
                        if (snapshot.exists()) {
                            processBookingData(snapshot.val());
                        } else {
                            processBookingData({});
                        }
                    })
                    .catch(error => {
                        console.error("Error loading booking data:", error);
                        processBookingData({});
                    });
                
                bookingsRef.on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        processBookingData(snapshot.val());
                    } else {
                        processBookingData({});
                    }
                });
            } catch (error) {
                console.error("Error in loadBookingData:", error);
            }
        }

        // Initialize Event Listeners
        function initEventListeners() {
            document.getElementById('logoutBtn').addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'https://www.discover-sharm.com/p/login.html';
                }).catch(error => {
                    console.error("Logout error:", error);
                    showToast("Logout failed: " + error.message, 'error');
                });
            });
        }

        // Initialize App
        function initApp() {
            try {
                auth.onAuthStateChanged(user => {
                    if (user) {
                        currentUser = user;
                        loadUserRole(user.uid).then(() => {
                            initCharts();
                            initDateRangePicker();
                            setupFilterButtons();
                            initEventListeners();
                            loadBookingData();
                        });
                    } else {
                        window.location.href = 'https://www.discover-sharm.com/p/login.html';
                    }
                });
            } catch (error) {
                console.error("Error initializing app:", error);
            }
        }

        // Start the application
        document.addEventListener('DOMContentLoaded', function() {
            initApp();
        });
    
