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

// ======================
// UTILITY FUNCTIONS
// ======================

function formatDate(dateStringOrDate) {
  if (!dateStringOrDate) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateToFormat = typeof dateStringOrDate === 'string' ? 
    new Date(dateStringOrDate) : dateStringOrDate;
  return isNaN(dateToFormat.getTime()) ? 'N/A' : 
    dateToFormat.toLocaleDateString(navigator.language || 'en-US', options);
}

function formatCurrency(amount, currency = 'EGP') {
  const amountStr = parseFloat(amount || 0).toFixed(2);
  return amountStr.replace('.', ',') + ' ' + currency;
}

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.innerHTML = `
    <div class="flex items-start">
      <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i>
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

// ======================
// AUTHENTICATION
// ======================

async function authenticateUser() {
  try {
    // First try anonymous auth
    await auth.signInAnonymously();
    
    // If we have a stored token, upgrade to full auth
    if (localStorage.getItem('authToken')) {
      await auth.signInWithCustomToken(localStorage.getItem('authToken'));
    }
    
    return auth.currentUser;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate. Please refresh the page.');
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

// ======================
// BOOKING FUNCTIONS
// ======================

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
  try {
    const updates = {
      ...statusData,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP,
      updatedBy: user.uid
    };

    // First try direct update
    try {
      await db.ref(`trip-bookings/${bookingId}`).update(updates);
      return true;
    } catch (directError) {
      console.log('Direct update failed, trying backend', directError);
      
      // Fallback to backend API
      const idToken = await user.getIdToken();
      const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/update-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ bookingId, updates })
      });
      
      if (!response.ok) throw new Error('Backend update failed');
      return true;
    }
  } catch (error) {
    console.error('Update booking error:', error);
    throw new Error('Failed to update booking. Please contact support.');
  }
}

// ======================
// PAYMENT PROCESSING
// ======================

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

async function verifyPayment(merchantOrderId) {
  try {
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId })
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message || 'Verification failed');
    
    return result.data;
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}

// ======================
// VOUCHER FUNCTIONS
// ======================

function populateVoucherDisplay(data) {
  if (!data) return;
  
  // Payment Info
  document.getElementById('voucher-ref').textContent = data.refNumber || 'N/A';
  document.getElementById('voucher-transaction').textContent = data.transactionId || 'N/A';
  document.getElementById('voucher-amount').textContent = formatCurrency(data.amount, data.currency);
  document.getElementById('voucher-payment-method').textContent = data.paymentMethod || 'Credit/Debit Card';
  
  // Customer Info
  document.getElementById('customer-name').textContent = data.username || data.name || 'Customer';
  document.getElementById('customer-email').textContent = data.email || 'N/A';
  document.getElementById('customer-phone').textContent = data.phone || 'N/A';
  
  // Booking Info
  document.getElementById('tour-name').textContent = data.tourName || 'Tour';
  document.getElementById('hotel-name').textContent = data.hotelName || 'Hotel';
  document.getElementById('room-type').textContent = data.roomType || 'N/A';
  document.getElementById('adults-count').textContent = data.adults || '0';
  document.getElementById('children-count').textContent = data.children || '0';
  
  // Dates
  document.getElementById('booking-date').textContent = formatDate(data.paymentDate || data.createdAt);
  document.getElementById('trip-date').textContent = formatDate(data.tripDate);
}

function handlePrintVoucher() {
  const voucherEl = document.getElementById('voucher-content');
  if (!voucherEl || !BookingData) {
    showNotification("Cannot print voucher - data not loaded", true);
    return;
  }
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Booking Voucher</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .voucher { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
          .header { background: #4267B2; color: white; padding: 15px; text-align: center; }
          .section { margin: 15px 0; }
          .detail { display: flex; margin: 5px 0; }
          .label { font-weight: bold; width: 150px; }
        </style>
      </head>
      <body>
        ${voucherEl.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 100);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ======================
// EMAIL FUNCTIONS
// ======================

async function sendVoucherEmail(user, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  
  try {
    // Validate
    if (!BookingData || !BookingId) throw new Error('No booking data');
    if (!(await checkBookingOwnership(BookingId, user.uid))) throw new Error('No permission');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(BookingData.email)) throw new Error('Invalid email');
    
    // Update UI
    if (statusEl) statusEl.textContent = 'Sending...';
    showNotification('Sending your voucher...');
    
    // Prepare data
    const emailData = {
      bookingId: BookingId,
      customerName: BookingData.username || 'Customer',
      customerEmail: BookingData.email,
      tourName: BookingData.tourName || 'Tour',
      hotelName: BookingData.hotelName || 'Hotel',
      amount: formatCurrency(BookingData.amount, BookingData.currency),
      tripDate: formatDate(BookingData.tripDate),
      bookingDate: formatDate(BookingData.paymentDate || BookingData.createdAt)
    };
    
    // Send email
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/send-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) throw new Error('Failed to send');
    
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Sending failed');
    
    // Update booking
    await updateBookingStatus(BookingId, {
      voucherSent: true,
      voucherSentAt: firebase.database.ServerValue.TIMESTAMP
    }, user);
    
    showNotification('Voucher sent successfully!');
    if (statusEl) statusEl.textContent = 'Sent successfully!';
    
  } catch (error) {
    console.error('Email error:', error);
    showNotification(`Failed to send: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Failed: ${error.message}`;
  }
}

// ======================
// MAIN APP LOGIC
// ======================

async function processPayment(merchantOrderId, user) {
  try {
    const paymentData = await verifyPayment(merchantOrderId);
    const urlParams = new URLSearchParams(window.location.search);
    
    const status = determinePaymentStatus(
      paymentData.responseCode || '00',
      paymentData.status || 'SUCCESS'
    );
    
    const paymentInfo = {
      amount: paymentData.amount || '0',
      currency: paymentData.currency || 'EGP',
      transactionId: urlParams.get('transactionId') || paymentData.transactionId,
      refNumber: merchantOrderId,
      paymentMethod: paymentData.paymentMethod || 'Credit/Debit Card',
      responseCode: paymentData.responseCode,
      responseMessage: paymentData.responseMessage
    };
    
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

function displayFailure(merchantOrderId, message, amount, currency, canRetry) {
  document.getElementById('loading-layout').classList.add('hidden');
  document.getElementById('failure-layout').classList.remove('hidden');
  
  document.getElementById('error-message').textContent = message;
  if (merchantOrderId) document.getElementById('failed-ref').textContent = merchantOrderId;
  if (amount) document.getElementById('failed-amount').textContent = formatCurrency(amount, currency);
  
  const retryBtn = document.getElementById('retry-btn');
  if (canRetry) {
    retryBtn.textContent = 'Try Again';
    retryBtn.onclick = () => window.location.reload();
  } else {
    retryBtn.textContent = 'Return Home';
    retryBtn.onclick = () => window.location.href = '/';
  }
}

async function initializeApp() {
  try {
    document.getElementById('loading-layout').classList.remove('hidden');
    
    // Get order ID
    const urlParams = new URLSearchParams(window.location.search);
    const merchantOrderId = urlParams.get('merchantOrderId');
    if (!merchantOrderId) throw new Error('Missing order ID');
    
    BookingId = merchantOrderId;
    
    // Authenticate
    const user = await authenticateUser();
    currentUserRole = await getUserRole(user.uid);
    
    // Process payment
    let paymentResult;
    try {
      paymentResult = await processPayment(merchantOrderId, user);
    } catch (paymentError) {
      console.error('Payment failed, loading existing data:', paymentError);
      const snapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
      BookingData = snapshot.val();
      if (!BookingData) throw new Error('Booking not found');
      
      paymentResult = {
        status: {
          paymentStatus: BookingData.paymentStatus || PAYMENT_STATUS.PENDING,
          userMessage: 'Loaded existing booking'
        },
        paymentInfo: BookingData
      };
    }
    
    // Update UI
    const { status, paymentInfo } = paymentResult;
    BookingData = { ...(BookingData || {}), ...paymentInfo };
    
    switch (status.paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        populateVoucherDisplay(BookingData);
        document.getElementById('success-layout').classList.remove('hidden');
        launchConfetti();
        if (!BookingData.voucherSent) await sendVoucherEmail(user);
        break;
        
      case PAYMENT_STATUS.PENDING:
        document.getElementById('pending-layout').classList.remove('hidden');
        document.getElementById('pending-message').textContent = status.userMessage;
        break;
        
      default:
        displayFailure(
          BookingId,
          status.userMessage,
          paymentInfo.amount,
          paymentInfo.currency,
          status.canRetry
        );
    }
    
  } catch (error) {
    console.error('Initialization error:', error);
    displayFailure(
      BookingId,
      error.message.includes('PERMISSION_DENIED') ? 
        'Access denied. Please login or contact support.' : 
        error.message,
      null,
      null,
      false
    );
    
  } finally {
    document.getElementById('loading-layout').classList.add('hidden');
  }
}

// ======================
// EVENT LISTENERS
// ======================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize app
  initializeApp();
  
  // Print button
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  
  // Resend email button
  document.getElementById('resend-email-btn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
      await sendVoucherEmail(user, 'email-status-message');
    } else {
      showNotification('Please login to resend', true);
    }
  });
});

// ======================
// FIREBASE SECURITY RULES
// ======================
/*
Use the security rules provided at the beginning of this response.
They should be set in Firebase Console > Realtime Database > Rules tab.
*/
