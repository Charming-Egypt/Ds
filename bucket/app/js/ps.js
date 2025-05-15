// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
  authDomain: "egypt-travels.firebaseapp.com",
  databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
  projectId: "egypt-travels",
  storageBucket: "egypt-travels.appspot.com",
  messagingSenderId: "477485386557",
  appId: "1:477485386557:web:755f9649043288db819354"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that instance
}

const db = firebase.database();
const auth = firebase.auth();

let BookingData = null;
let BookingId = null;
let currentUserRole = null;

// Payment status mapping
const PAYMENT_STATUS = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PENDING: 'pending'
};

// Transaction status mapping
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

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification animate__animated animate__fadeInUp ${isError ? 'notification-error' : 'notification-success'}`;
  notification.innerHTML = `<div class="flex items-start"><i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2 mt-1"></i><div>${message}</div></div>`;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('animate__fadeOutDown');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
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
    // Query the booking with the user's UID to respect security rules
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    const booking = snapshot.val();
    
    if (!booking) return false;
    
    // Check if user is admin
    if (currentUserRole === 'admin') return true;
    
    // Check if user is owner of the booking
    if (booking.uid === userId) return true;
    
    // Check if user is moderator and owner of the trip
    if (currentUserRole === 'moderator' && booking.owner === userId) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking booking ownership:', error);
    return false;
  }
}

// Payment status handler
function determinePaymentStatus(responseCode, transactionStatus) {
  responseCode = String(responseCode).toUpperCase().trim();
  transactionStatus = String(transactionStatus).toUpperCase().trim();

  // Success codes
  const successCodes = ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'];
  
  // Cancellation codes
  const cancelledCodes = ['17', 'CANCELLED', 'CANCELED'];
  
  // Pending codes
  const pendingCodes = ['09', 'PENDING', 'PROCESSING'];
  
  // Retryable failure codes
  const retryableCodes = [
    '01', '02', '05', '12', '42', '62', '63', '68', '91', '96',
    'TEMPORARY_FAILURE', 'BANK_ERROR'
  ];

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

  // Default to failed status
  return {
    paymentStatus: PAYMENT_STATUS.FAILED,
    status: TRANSACTION_STATUS.FAILED,
    userMessage: 'Payment failed',
    canRetry: retryableCodes.includes(responseCode)
  };
}

async function updateBookingStatus(bookingId, statusData, user) {
  if (!user) {
    throw new Error('User not authenticated');
  }

  const updates = {
    status: statusData.status,
    paymentStatus: statusData.paymentStatus,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    transactionResponseCode: statusData.responseCode,
    transactionResponseMessage: statusData.responseMessage
  };

  // Add audit info for admin/moderator
  if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
    updates.lastUpdatedBy = user.uid;
  }

  try {
    // First check if we have permission to update
    const canUpdate = await checkBookingOwnership(bookingId, user.uid);
    if (!canUpdate) {
      throw new Error('User does not have permission to update this booking');
    }

    await db.ref(`trip-bookings/${bookingId}`).update(updates);
    return true;
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
}

function populateVoucherDisplay(data) {
  if (!data) return;
  document.getElementById('voucher-ref').textContent = BookingId || data.bookingId || 'N/A';
  document.getElementById('voucher-transaction').textContent = data.transactionId || 'N/A';
  document.getElementById('voucher-amount').textContent = `${data.totalPrice || '0'} ${data.currency || 'EGP'}`;
  document.getElementById('voucher-card').textContent = `${data.cardBrand || 'Card'} ${data.maskedCard ? 'ending in ' + data.maskedCard.slice(-4) : '••••'}`;
  document.getElementById('customer-name2').textContent = data.username || data.name || 'Valued Customer';
  document.getElementById('customer-email2').textContent = data.email || 'N/A';
  document.getElementById('tour-name').textContent = data.tourName || data.tour || 'N/A';
  document.getElementById('accommodation-type').textContent = data.hotelName || 'N/A';
  document.getElementById('room-type').textContent = data.roomNumber || 'N/A';
  document.getElementById('adults-count').textContent = data.adults || '0';
  document.getElementById('children-count').textContent = data.children || data.childrenUnder12 || '0';
  document.getElementById('infants-count').textContent = data.infants || '0';
  const bookingCreationDate = data.paymentDate ? new Date(data.paymentDate) : (data.createdAt ? new Date(data.createdAt) : new Date());
  document.getElementById('booking-date').textContent = formatDate(bookingCreationDate);
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
  
  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      style: `.voucher-container { /* Your existing styles */ }`,
      scanStyles: false,
      onPrintDialogClose: () => {
        voucherEl.style.display = 'none';
      },
      onError: (err) => {
        console.error('Print error:', err);
        voucherEl.style.display = 'none';
        showNotification("Could not print voucher.", true);
      }
    });
  } else {
    window.print();
  }
}

async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!BookingData || !BookingId) {
      showNotification('Booking data not available for sending email.', true);
      if (statusEl) statusEl.textContent = 'Email not sent: Booking data missing.';
      return false;
    }
    
    const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
    if (!hasPermission) {
      showNotification('You do not have permission to send this voucher.', true);
      if (statusEl) statusEl.textContent = 'Permission denied for sending voucher.';
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!BookingData.email || !emailRegex.test(BookingData.email)) {
      if (statusEl) statusEl.textContent = 'Voucher email could not be sent (invalid email). Please update and resend.';
      showNotification('Invalid recipient email address for voucher. Please update and resend.', true);
      return false;
    }
    
    if (statusEl) statusEl.textContent = 'Sending your voucher...';
    showNotification('Sending your voucher...');

    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/send-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingData: BookingData,
        bookingId: BookingId,
        toEmail: BookingData.email,
        toName: BookingData.username || 'Valued Customer'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server returned an error' }));
      throw new Error(errorData.message || `Failed to send email (HTTP ${response.status})`);
    }

    const result = await response.json();
    if (result.success) {
      showNotification('Voucher sent successfully!');
      if (statusEl) statusEl.textContent = 'Voucher sent to your email!';
      
      const updates = {
        voucherSent: true
      };
      
      if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
        updates.lastUpdatedBy = currentUser.uid;
        updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
      }
      
      await db.ref(`trip-bookings/${BookingId}`).update(updates);
      return true;
    } else {
      throw new Error(result.message || 'Failed to send the voucher');
    }

  } catch (error) {
    console.error('Error sending email:', error.message);
    showNotification(`Failed to send voucher: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Voucher email failed: ${error.message}`;
    return false;
  }
}

async function resendVoucherEmailHandler() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    showNotification('Please log in to resend the voucher.', true);
    return;
  }
  
  if (!BookingData || !BookingId) {
    showNotification('Booking details not loaded. Cannot resend email.', true);
    return;
  }
  
  const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
  if (!hasPermission) {
    showNotification('You do not have permission to resend this voucher.', true);
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!BookingData.email || !emailRegex.test(BookingData.email)) {
    const email = prompt('Enter valid email to resend voucher:', BookingData.email || '');
    if (email && emailRegex.test(email)) {
      const updates = { email: email };
      if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
        updates.lastUpdatedBy = currentUser.uid;
        updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
      }
      
      await db.ref(`trip-bookings/${BookingId}`).update(updates);
      BookingData.email = email;
    } else if (email !== null) {
      showNotification('Invalid email address entered.', true);
      return;
    } else {
      return;
    }
  }

  let statusId = null;
  if (document.getElementById('success-layout') && !document.getElementById('success-layout').classList.contains('hidden')) {
    statusId = 'email-status-message';
  } else if (document.getElementById('already-submitted-layout') && !document.getElementById('already-submitted-layout').classList.contains('hidden')) {
    statusId = 'submitted-email-status';
  }

  const success = await sendVoucherEmail(currentUser, statusId);
  if (success && BookingId) {
    const updates = {
      voucherResentAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
      updates.lastUpdatedBy = currentUser.uid;
      updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
    }
    
    await db.ref(`trip-bookings/${BookingId}`).update(updates);
  }
}

function displayFailure(merchantOrderId, customErrorMessage, amount, currency, canRetry = false) {
  document.getElementById('loading-layout').classList.add('hidden');
  document.getElementById('failure-layout').classList.remove('hidden');
  document.getElementById('error-message').textContent = customErrorMessage;
  if (merchantOrderId) document.getElementById('failed-ref').textContent = merchantOrderId;
  if (amount) document.getElementById('failed-amount').textContent = `${amount} ${currency || 'EGP'}`;
  const retryBtn = document.getElementById('retry-btn');
  let retryUrl = '#';

  if (merchantOrderId) {
    const paymentUrl = localStorage.getItem(`paymentUrl_${merchantOrderId}`);
    if (paymentUrl) retryUrl = paymentUrl;
  }

  retryBtn.href = retryUrl;
  
  if (canRetry) {
    retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
    retryBtn.classList.remove('bg-blue-500');
    retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
  } else {
    document.getElementById('redirect-message').textContent = "Please try booking again from the start or contact support.";
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
    retryBtn.href = '/';
    retryBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
}

async function processPaymentResult(paymentData, user) {
  const transactions = paymentData.transactions || [];
  if (transactions.length === 0) {
    throw new Error('No transactions found');
  }

  const latestTransaction = transactions[0];
  const status = determinePaymentStatus(
    latestTransaction.transactionResponseCode,
    latestTransaction.status
  );

  const paymentInfo = {
    amount: paymentData.totalCapturedAmount,
    currency: latestTransaction.currency || 'EGP',
    transactionId: paymentData.orderId,
    cardBrand: paymentData.sourceOfFunds?.cardInfo?.cardBrand || 'Card',
    maskedCard: paymentData.sourceOfFunds?.cardInfo?.maskedCard || '••••',
    responseCode: latestTransaction.transactionResponseCode,
    responseMessage: latestTransaction.transactionResponseMessage?.en || ''
  };

  const updateSuccess = await updateBookingStatus(BookingId, {
    ...status,
    ...paymentInfo
  }, user);

  if (!updateSuccess) {
    throw new Error('Failed to update booking status');
  }

  return { status, paymentInfo };
}

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
    // Authenticate user (anonymous auth is allowed by your rules)
    await auth.signInAnonymously().catch(() => {});
    const user = auth.currentUser;
    
    if (user && !user.isAnonymous) {
      currentUserRole = await getUserRole(user.uid);
    }

    // Fetch payment status
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to retrieve payment status.');
    }

    // Process payment result
    const { status, paymentInfo } = await processPaymentResult(result.data.response, user);
    
    // Get updated booking data
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val();
    
    if (!BookingData) {
      throw new Error('Booking not found in database');
    }

    // Handle different statuses
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
        
      case PAYMENT_STATUS.CANCELLED:
        displayFailure(
          BookingId,
          status.userMessage,
          paymentInfo.amount,
          paymentInfo.currency,
          false
        );
        break;
        
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
    console.error('Error processing payment:', error.message);
    displayFailure(
      BookingId,
      `Error processing payment: ${error.message}`,
      null,
      null,
      false
    );
  } finally {
    document.getElementById('loading-layout').classList.add('hidden');
  }
}

// Event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  
  // Set up button event listeners
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);
});
