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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const db = firebase.database();
const auth = firebase.auth();

// Global Variables
let BookingData = null;
let BookingId = null;
let currentUserRole = null;

// Status Constants
const PAYMENT_STATUS = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PENDING: 'pending'
};

const TRANSACTION_STATUS = {
  SUCCESS: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PENDING: 'processing'
};

// Utility Functions
function formatDate(dateStringOrDate) {
  if (!dateStringOrDate) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateToFormat = typeof dateStringOrDate === 'string' ? 
    new Date(dateStringOrDate) : dateStringOrDate;
  return isNaN(dateToFormat.getTime()) ? 'N/A' : 
    dateToFormat.toLocaleDateString(navigator.language || 'en-US', options);
}

function formatCurrency(amount, currency = 'EGP') {
  const amountStr = parseFloat(amount || 0).toFixed(2).toString();
  return `${amountStr.replace('.', ',')} ${currency}`;
}

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.innerHTML = `
    <div class="flex items-start">
      <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2 mt-1"></i>
      <div>${message}</div>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b']
    });
  }
}

// Authentication Functions
async function authenticateUser() {
  try {
    const userCredential = await auth.signInAnonymously();
    return userCredential.user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate');
  }
}

async function getUserRole(uid) {
  try {
    const snapshot = await db.ref(`egy_user/${uid}/role`).once('value');
    return snapshot.val() || 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'user';
  }
}

// Booking Functions
async function checkBookingOwnership(bookingId, userId) {
  try {
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    const booking = snapshot.val();
    
    if (!booking) return false;
    if (currentUserRole === 'admin') return true;
    if (booking.uid === userId) return true;
    if (currentUserRole === 'moderator' && booking.owner === userId) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking booking ownership:', error);
    return false;
  }
}

async function updateBookingStatus(bookingId, statusData, user) {
  const updates = {
    status: statusData.status,
    paymentStatus: statusData.paymentStatus,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    transactionResponseCode: statusData.responseCode,
    transactionResponseMessage: statusData.responseMessage
  };

  if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
    updates.lastUpdatedBy = user?.uid || 'system';
  }

  try {
    await db.ref(`trip-bookings/${bookingId}`).update(updates);
    return true;
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
}

// Payment Processing
function determinePaymentStatus(responseCode, transactionStatus) {
  responseCode = String(responseCode).toUpperCase().trim();
  transactionStatus = String(transactionStatus).toUpperCase().trim();

  const successCodes = ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'];
  const cancelledCodes = ['17', 'CANCELLED', 'CANCELED'];
  const pendingCodes = ['09', 'PENDING', 'PROCESSING'];
  const retryableCodes = ['01', '02', '05', '12', '42', '62', '63', '68', '91', '96'];

  if (successCodes.includes(responseCode) || successCodes.includes(transactionStatus)) {
    return { 
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      status: TRANSACTION_STATUS.SUCCESS,
      userMessage: 'Payment successful'
    };
  }

  if (cancelledCodes.includes(responseCode) || cancelledCodes.includes(transactionStatus)) {
    return {
      paymentStatus: PAYMENT_STATUS.CANCELLED,
      status: TRANSACTION_STATUS.CANCELLED,
      userMessage: 'Payment cancelled'
    };
  }

  if (pendingCodes.includes(responseCode) || pendingCodes.includes(transactionStatus)) {
    return {
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: TRANSACTION_STATUS.PENDING,
      userMessage: 'Payment processing'
    };
  }

  return {
    paymentStatus: PAYMENT_STATUS.FAILED,
    status: TRANSACTION_STATUS.FAILED,
    userMessage: 'Payment failed',
    canRetry: retryableCodes.includes(responseCode)
  };
}

async function verifyPaymentWithBackend(merchantOrderId) {
  try {
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Payment verification failed');
    }

    return result.data;
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}

// Voucher Functions
function populateVoucherDisplay(data) {
  if (!data) return;
  
  // Payment Information
  document.getElementById('voucher-ref').textContent = data.refNumber || 'N/A';
  document.getElementById('voucher-transaction').textContent = data.transactionId || 'N/A';
  document.getElementById('voucher-amount').textContent = formatCurrency(data.amount, data.currency);
  document.getElementById('voucher-payment-method').textContent = data.paymentMethod || 'Credit/Debit Card';
  document.getElementById('voucher-card').textContent = data.cardBrand ? 
    `${data.cardBrand} ${data.maskedCard ? 'ending in ' + data.maskedCard.slice(-4) : '••••'}` : 'N/A';
  
  // Customer Information
  document.getElementById('customer-name').textContent = data.username || data.name || 'Valued Customer';
  document.getElementById('customer-email').textContent = data.email || 'N/A';
  document.getElementById('customer-phone').textContent = data.phone || 'N/A';
  
  // Booking Details
  document.getElementById('tour-name').textContent = data.tourName || data.tour || 'N/A';
  document.getElementById('accommodation').textContent = data.hotelName || 'N/A';
  document.getElementById('room-type').textContent = data.roomType || 'N/A';
  document.getElementById('adults-count').textContent = data.adults || '0';
  document.getElementById('children-count').textContent = data.children || '0';
  document.getElementById('infants-count').textContent = data.infants || '0';
  
  // Dates
  document.getElementById('booking-date').textContent = formatDate(data.paymentDate || data.createdAt);
  document.getElementById('trip-date').textContent = formatDate(data.tripDate);
}

function handlePrintVoucher() {
  const voucherEl = document.getElementById('voucher-content');
  if (!voucherEl || !BookingData) {
    showNotification("Booking details not loaded. Cannot print voucher.", true);
    return;
  }
  
  populateVoucherDisplay(BookingData);
  voucherEl.style.display = 'block';
  
  const printStyles = `
    <style>
      .voucher-container {
        font-family: 'Arial', sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: #fff;
        border: 1px solid #ddd;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .voucher-header {
        background: #4267B2;
        color: white;
        padding: 20px;
        text-align: center;
        margin-bottom: 20px;
      }
      .voucher-title {
        font-size: 24px;
        font-weight: bold;
      }
      .detail-section {
        margin-bottom: 20px;
      }
      .detail-card {
        background: #f9f9f9;
        border-radius: 5px;
        padding: 15px;
        margin-bottom: 15px;
      }
      .detail-label {
        font-weight: bold;
        margin-bottom: 5px;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        .voucher-container, .voucher-container * {
          visibility: visible;
        }
        .voucher-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          border: none;
          box-shadow: none;
        }
      }
    </style>
  `;

  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      scanStyles: false,
      style: printStyles,
      onPrintDialogClose: () => voucherEl.style.display = 'none'
    });
  } else {
    window.print();
  }
}

// Email Functions
async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  
  try {
    // Validate data
    if (!BookingData || !BookingId) {
      throw new Error('Booking data not available');
    }

    // Check permissions
    const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
    if (!hasPermission) {
      throw new Error('No permission to send voucher');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!BookingData.email || !emailRegex.test(BookingData.email)) {
      throw new Error('Invalid email address');
    }

    // Update UI
    if (statusEl) statusEl.textContent = 'Sending voucher...';
    showNotification('Sending your voucher...');

    // Prepare email data
    const emailData = {
      bookingId: BookingId,
      customerName: BookingData.username || BookingData.name || 'Customer',
      customerEmail: BookingData.email,
      tourName: BookingData.tourName || 'Tour',
      hotelName: BookingData.hotelName || 'Hotel',
      tripDate: formatDate(BookingData.tripDate),
      bookingDate: formatDate(BookingData.paymentDate || BookingData.createdAt),
      amount: formatCurrency(BookingData.amount, BookingData.currency),
      transactionId: BookingData.transactionId || 'N/A'
    };

    // Send to backend
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/send-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Email sending failed');
    }

    // Update booking and UI
    await db.ref(`trip-bookings/${BookingId}`).update({
      voucherSent: true,
      voucherSentAt: firebase.database.ServerValue.TIMESTAMP
    });

    showNotification('Voucher sent successfully!');
    if (statusEl) statusEl.textContent = 'Voucher sent!';

  } catch (error) {
    console.error('Email sending error:', error);
    showNotification(`Failed to send voucher: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Failed: ${error.message}`;
  }
}

// Main Payment Processing
async function processPayment(merchantOrderId, user) {
  try {
    // Verify payment with backend
    const paymentData = await verifyPaymentWithBackend(merchantOrderId);
    
    // Get transaction ID from URL or payment data
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('transactionId') || paymentData.transactionId;

    // Determine payment status
    const status = determinePaymentStatus(
      paymentData.responseCode || '00',
      paymentData.status || 'SUCCESS'
    );

    // Prepare payment info
    const paymentInfo = {
      amount: paymentData.amount || '0',
      currency: paymentData.currency || 'EGP',
      transactionId: transactionId,
      refNumber: merchantOrderId,
      cardBrand: paymentData.cardBrand || null,
      maskedCard: paymentData.maskedCard || null,
      paymentMethod: paymentData.paymentMethod || 'Credit/Debit Card',
      responseCode: paymentData.responseCode || '00',
      responseMessage: paymentData.responseMessage || 'Approved'
    };

    // Update booking status
    await updateBookingStatus(merchantOrderId, {
      ...status,
      ...paymentInfo
    }, user);

    return { status, paymentInfo };

  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
}

// Initialization
async function initializeApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId');

  if (!merchantOrderId) {
    displayFailure(null, 'Missing order ID. Please restart the payment process.');
    return;
  }

  BookingId = merchantOrderId;
  document.getElementById('loading-layout').classList.remove('hidden');

  try {
    // Authenticate user
    const user = await authenticateUser();
    currentUserRole = await getUserRole(user.uid);

    // Process payment
    const { status, paymentInfo } = await processPayment(merchantOrderId, user);
    
    // Load booking data
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val() || {};
    BookingData = { ...BookingData, ...paymentInfo };

    // Handle payment status
    switch (status.paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        populateVoucherDisplay(BookingData);
        document.getElementById('success-layout').classList.remove('hidden');
        launchConfetti();
        
        if (!BookingData.voucherSent) {
          await sendVoucherEmail(user, 'email-status-message');
        }
        break;
        
      case PAYMENT_STATUS.PENDING:
        document.getElementById('pending-layout').classList.remove('hidden');
        document.getElementById('pending-message').textContent = status.userMessage;
        break;
        
      case PAYMENT_STATUS.CANCELLED:
      case PAYMENT_STATUS.FAILED:
        displayFailure(
          BookingId,
          status.userMessage,
          paymentInfo.amount,
          paymentInfo.currency,
          status.canRetry
        );
        break;
    }

  } catch (error) {
    console.error('Initialization error:', error);
    displayFailure(
      BookingId,
      error.message.includes('permission_denied') ? 
        'Access denied. Please contact support.' : 
        `Error: ${error.message}`,
      null,
      null,
      false
    );
  } finally {
    document.getElementById('loading-layout').classList.add('hidden');
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
      await sendVoucherEmail(user, 'email-status-message');
    } else {
      showNotification('Please login to resend voucher', true);
    }
  });
});

// Failure Display
function displayFailure(merchantOrderId, message, amount, currency, canRetry) {
  document.getElementById('loading-layout').classList.add('hidden');
  document.getElementById('failure-layout').classList.remove('hidden');
  document.getElementById('error-message').textContent = message;
  
  if (merchantOrderId) {
    document.getElementById('failed-ref').textContent = merchantOrderId;
  }
  
  if (amount) {
    document.getElementById('failed-amount').textContent = formatCurrency(amount, currency);
  }
  
  const retryBtn = document.getElementById('retry-btn');
  if (canRetry) {
    retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
    retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
    retryBtn.href = localStorage.getItem(`paymentUrl_${merchantOrderId}`) || '#';
  } else {
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
    retryBtn.href = '/';
  }
}
