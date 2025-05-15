// Firebase configuration
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

let BookingData = null;
let BookingId = null;
let currentUserRole = null;

// Status constants
const PAYMENT_STATUS = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PENDING: 'pending'
};

const TRANSACTION_STATUS = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PENDING: 'processing'
};

// Helper functions
function formatDate(dateStringOrDate) {
  if (!dateStringOrDate) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateToFormat = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  return isNaN(dateToFormat.getTime()) ? 'N/A' : dateToFormat.toLocaleDateString(navigator.language || 'en-US', options);
}

function formatCurrency(amount, currency = 'EGP') {
  const amountStr = parseFloat(amount || 0).toFixed(2).toString();
  return `${amountStr.replace('.', ',')} ${currency}`;
}

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'notification-error' : 'notification-success'}`;
  notification.innerHTML = `<div class="flex items-start"><i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2 mt-1"></i><div>${message}</div></div>`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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

function determinePaymentStatus(responseCode, transactionStatus) {
  responseCode = String(responseCode).toUpperCase().trim();
  transactionStatus = String(transactionStatus).toUpperCase().trim();

  const successCodes = ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'];
  const cancelledCodes = ['17', 'CANCELLED', 'CANCELED'];
  const pendingCodes = ['09', 'PENDING', 'PROCESSING'];

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
    canRetry: true
  };
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
    return false;
  }
}

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
  document.getElementById('customer-name2').textContent = data.username || data.name || 'Valued Customer';
  document.getElementById('customer-email2').textContent = data.email || 'N/A';
  document.getElementById('customer-phone').textContent = data.phone || 'N/A';
  
  // Booking Details
  document.getElementById('tour-name').textContent = data.tourName || data.tour || 'N/A';
  document.getElementById('accommodation-type').textContent = data.hotelName || 'N/A';
  document.getElementById('room-type').textContent = data.roomType || data.roomNumber || 'N/A';
  document.getElementById('adults-count').textContent = data.adults || '0';
  document.getElementById('children-count').textContent = data.children || data.childrenUnder12 || '0';
  document.getElementById('infants-count').textContent = data.infants || '0';
  
  // Dates
  const bookingDate = data.paymentDate ? new Date(data.paymentDate) : (data.createdAt ? new Date(data.createdAt) : new Date());
  document.getElementById('booking-date').textContent = formatDate(bookingDate);
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
        background: #fff;
        border: 1px solid #ddd;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .voucher-header {
        background: #4267B2;
        color: white;
        padding: 20px;
        text-align: center;
      }
      .voucher-body {
        padding: 20px;
      }
      .detail-section {
        margin-bottom: 20px;
      }
      .detail-card {
        background: #f9f9f9;
        border-radius: 5px;
        padding: 15px;
        margin-bottom: 10px;
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

async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!BookingData || !BookingId) {
      throw new Error('Booking data not available');
    }

    const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
    if (!hasPermission) {
      throw new Error('No permission to send voucher');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!BookingData.email || !emailRegex.test(BookingData.email)) {
      throw new Error('Invalid email address');
    }

    if (statusEl) statusEl.textContent = 'Sending voucher...';
    showNotification('Sending your voucher...');

    const emailData = {
      bookingId: BookingId,
      customerName: BookingData.username || BookingData.name || 'Customer',
      customerEmail: BookingData.email,
      tourName: BookingData.tourName || BookingData.tour || 'Tour',
      hotelName: BookingData.hotelName || 'Hotel',
      tripDate: formatDate(BookingData.tripDate),
      bookingDate: formatDate(BookingData.paymentDate || BookingData.createdAt),
      amount: formatCurrency(BookingData.amount, BookingData.currency),
      transactionId: BookingData.transactionId || 'N/A'
    };

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

    showNotification('Voucher sent successfully!');
    if (statusEl) statusEl.textContent = 'Voucher sent!';

    await db.ref(`trip-bookings/${BookingId}`).update({
      voucherSent: true,
      voucherSentAt: firebase.database.ServerValue.TIMESTAMP
    });

  } catch (error) {
    console.error('Email sending error:', error);
    showNotification(`Failed to send voucher: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Failed: ${error.message}`;
  }
}

async function processPayment(merchantOrderId, user) {
  const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantOrderId })
  });

  if (!response.ok) {
    throw new Error(`Payment verification failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Payment verification error');
  }

  const paymentData = result.data;
  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get('transactionId') || paymentData.transactionId;

  const status = determinePaymentStatus(
    paymentData.responseCode || '00',
    paymentData.status || 'SUCCESS'
  );

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

  await updateBookingStatus(merchantOrderId, {
    ...status,
    ...paymentInfo
  }, user);

  return { status, paymentInfo };
}

async function initializeApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId');

  if (!merchantOrderId) {
    showNotification('Missing order ID', true);
    return;
  }

  BookingId = merchantOrderId;
  document.getElementById('loading-layout').classList.remove('hidden');

  try {
    await auth.signInAnonymously().catch(() => {});
    const user = auth.currentUser;
    
    if (user && !user.isAnonymous) {
      currentUserRole = await getUserRole(user.uid);
    }

    const { status, paymentInfo } = await processPayment(merchantOrderId, user);
    
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val() || {};
    BookingData = { ...BookingData, ...paymentInfo };

    switch (status.paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        populateVoucherDisplay(BookingData);
        document.getElementById('success-layout').classList.remove('hidden');
        launchConfetti();
        
        if (!BookingData.voucherSent && user) {
          const canSendVoucher = await checkBookingOwnership(BookingId, user.uid);
          if (canSendVoucher) {
            await sendVoucherEmail(user, 'email-status-message');
          }
        }
        break;
        
      case PAYMENT_STATUS.PENDING:
        document.getElementById('pending-layout').classList.remove('hidden');
        document.getElementById('pending-message').textContent = status.userMessage;
        break;
        
      default:
        showNotification(status.userMessage, true);
        break;
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    showNotification(error.message, true);
  } finally {
    document.getElementById('loading-layout').classList.add('hidden');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  
  // Setup event listeners
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);
});

// Resend email handler
async function resendVoucherEmailHandler() {
  const user = auth.currentUser;
  if (!user) {
    showNotification('Please login to resend voucher', true);
    return;
  }
  
  if (!BookingData || !BookingId) {
    showNotification('Booking data not loaded', true);
    return;
  }

  const hasPermission = await checkBookingOwnership(BookingId, user.uid);
  if (!hasPermission) {
    showNotification('No permission to resend', true);
    return;
  }

  await sendVoucherEmail(user, 'email-status-message');
}
