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
  SUCCESS: 'completed',
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
  const updates = {
    status: statusData.status,
    paymentStatus: statusData.paymentStatus,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    transactionResponseCode: statusData.responseCode,
    transactionResponseMessage: statusData.responseMessage
  };

  // Add audit info for admin/moderator
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

  // Update booking status in Firebase
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
    // Authenticate user
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
