// Firebase Initialization (unchanged from your original)
const firebaseConfig = {
  apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
  authDomain: "egypt-travels.firebaseapp.com",
  databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
  projectId: "egypt-travels",
  storageBucket: "egypt-travels.appspot.com",
  messagingSenderId: "477485386557",
  appId: "1:477485386557:web:755f9649043288db819354"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const db = firebase.database();
const auth = firebase.auth();

// Payment Constants
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

// Core Payment Processing Function
async function processPayment(paymentResult) {
  try {
    // 1. Authentication
    const user = auth.currentUser || await auth.signInAnonymously().then(() => auth.currentUser);
    
    // 2. Validate payment result
    if (!paymentResult || !paymentResult.transactions?.length) {
      throw new Error("Invalid payment response");
    }

    const transaction = paymentResult.transactions[0];
    const bookingId = paymentResult.merchantOrderId;
    
    if (!bookingId) {
      throw new Error("Missing booking ID");
    }

    // 3. Determine status
    const status = determinePaymentStatus(
      transaction.transactionResponseCode,
      transaction.status
    );

    // 4. Prepare updates (rules-compliant)
    const updates = {
      status: status.status,
      paymentStatus: status.paymentStatus,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP,
      transactionId: paymentResult.orderId,
      transactionResponseCode: transaction.transactionResponseCode,
      transactionResponseMessage: transaction.transactionResponseMessage?.en || ''
    };

    // 5. Add admin/moderator fields if permitted
    if (user && !user.isAnonymous) {
      const userRole = await getUserRole(user.uid);
      if (userRole === 'admin' || userRole === 'moderator') {
        updates.lastUpdatedBy = user.uid;
      }
    }

    // 6. Verify permissions
    const canUpdate = await checkBookingOwnership(bookingId, user?.uid);
    if (!canUpdate) {
      throw new Error("Unauthorized to update booking");
    }

    // 7. Execute update
    await db.ref(`trip-bookings/${bookingId}`).update(updates);

    // 8. Return results
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    return {
      success: true,
      status: status,
      bookingData: snapshot.val()
    };

  } catch (error) {
    console.error("Payment processing failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper Functions
function determinePaymentStatus(responseCode, transactionStatus) {
  responseCode = String(responseCode).toUpperCase().trim();
  transactionStatus = String(transactionStatus).toUpperCase().trim();

  const statusMap = {
    SUCCESS: { codes: ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'], result: PAYMENT_STATUS.SUCCESS },
    CANCELLED: { codes: ['17', 'CANCELLED', 'CANCELED'], result: PAYMENT_STATUS.CANCELLED },
    PENDING: { codes: ['09', 'PENDING', 'PROCESSING'], result: PAYMENT_STATUS.PENDING }
  };

  for (const [status, {codes, result}] of Object.entries(statusMap)) {
    if (codes.includes(responseCode) || codes.includes(transactionStatus)) {
      return {
        paymentStatus: result,
        status: TRANSACTION_STATUS[status] || TRANSACTION_STATUS.FAILED,
        userMessage: `Payment ${result}`
      };
    }
  }

  return {
    paymentStatus: PAYMENT_STATUS.FAILED,
    status: TRANSACTION_STATUS.FAILED,
    userMessage: 'Payment failed'
  };
}

async function checkBookingOwnership(bookingId, userId) {
  if (!userId) return false;
  
  const [bookingSnapshot, userSnapshot] = await Promise.all([
    db.ref(`trip-bookings/${bookingId}`).once('value'),
    db.ref(`egy_user/${userId}/role`).once('value')
  ]);

  const booking = bookingSnapshot.val();
  const userRole = userSnapshot.val() || 'user';

  return userRole === 'admin' || 
         booking?.uid === userId || 
         (userRole === 'moderator' && booking?.owner === userId);
}

async function getUserRole(uid) {
  const snapshot = await db.ref(`egy_user/${uid}/role`).once('value');
  return snapshot.val() || 'user';
}

// UI Integration Functions (unchanged from your original)
function showNotification(message, isError = false) {
  /* Your existing implementation */
}

function launchConfetti() {
  /* Your existing implementation */
}

function formatDate(dateString) {
  /* Your existing implementation */
}

// Initialize Payment Processing
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId');
  
  if (!merchantOrderId) {
    showNotification("Missing order ID", true);
    return;
  }

  try {
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId })
    });

    const result = await response.json();
    const paymentResult = await processPayment(result.data.response);
    
    if (paymentResult.success) {
      // Handle successful payment
      showNotification("Payment processed successfully!");
      launchConfetti();
    } else {
      showNotification(`Payment failed: ${paymentResult.error}`, true);
    }
  } catch (error) {
    showNotification("Payment processing error", true);
    console.error(error);
  }
});
