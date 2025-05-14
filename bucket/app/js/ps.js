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

// Helper functions
function formatDate(dateStringOrDate) {
  if (!dateStringOrDate) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateToFormat = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  return isNaN(dateToFormat.getTime()) ? 'N/A' : dateToFormat.toLocaleDateString(navigator.language || 'en-US', options);
}

function formatTripDate(dateString) {
  return dateString ? formatDate(new Date(dateString + 'T00:00:00')) : 'N/A';
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
  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
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

async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!BookingData || !BookingId) {
      showNotification('Booking data not available for sending email.', true);
      if (statusEl) statusEl.textContent = 'Email not sent: Booking data missing.';
      return false;
    }
    
    // Check if user has permission to send voucher
    const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
    if (!hasPermission) {
      showNotification('You do not have permission to send this voucher.', true);
      if (statusEl) statusEl.textContent = 'Permission denied for sending voucher.';
      return false;
    }
    
    // Validate email
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
      
      // Update booking with voucher sent info
      const updates = {
        voucherSent: true,
        voucherSentAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      // Only admin/moderator can update these fields
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
  
  // Check permissions
  const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
  if (!hasPermission) {
    showNotification('You do not have permission to resend this voucher.', true);
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!BookingData.email || !emailRegex.test(BookingData.email)) {
    const email = prompt('Enter valid email to resend voucher:', BookingData.email || '');
    if (email && emailRegex.test(email)) {
      // Update email in database if user has permission
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

function displayFailure(merchantOrderId, customErrorMessage, amount, currency) {
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
  if (retryUrl === '#') {
    document.getElementById('redirect-message').textContent = "Please try booking again from the start or contact support.";
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
    retryBtn.href = '/';
    retryBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  } else {
    document.getElementById('redirect-message').textContent = "You will be redirected to try again shortly...";
    setTimeout(() => {
      if (window.location.href !== retryUrl) window.location.href = retryUrl;
    }, 10000);
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
  document.getElementById('trip-date').textContent = formatTripDate(data.tripDate);
}

function handlePrintVoucher() {
  const voucherEl = document.getElementById('voucher-content');
  if (!voucherEl || !BookingData) {
    showNotification("Booking details not loaded. Cannot print voucher.", true);
    return;
  }
  
  // Ensure voucher is populated
  populateVoucherDisplay(BookingData);
  
  // Show the voucher temporarily for printing
  voucherEl.style.display = 'block';
  
  // Use PrintJS to print the voucher
  printJS({
    printable: 'voucher-content',
    type: 'html',
    scanStyles: true,
    onPrintDialogClose: () => {
      voucherEl.style.display = 'none';
    },
    onError: (err) => {
      console.error('Print error:', err);
      voucherEl.style.display = 'none';
      showNotification("Could not print voucher.", true);
    }
  });
}

async function initializeApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId');

  if (!merchantOrderId) {
    displayFailure(null, 'Missing order ID. Please restart the payment process.');
    return;
  }

  document.getElementById('loading-layout').classList.remove('hidden');

  try {
    // Authenticate user if not already authenticated
    await auth.signInAnonymously().catch(() => {});
    const user = auth.currentUser;
    
    if (user && !user.isAnonymous) {
      currentUserRole = await getUserRole(user.uid);
    }

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

    const paymentData = result.data.response;
    const transactions = paymentData.transactions || [];

    if (transactions.length > 0) {
      const latestTransaction = transactions[0];
      const status = latestTransaction.status;
      const amount = paymentData.totalCapturedAmount;
      const currency = transactions[0].currency;
      const transactionId = paymentData.orderId;
      const cardBrand = paymentData.sourceOfFunds?.cardInfo?.cardBrand || 'Card';
      const maskedCard = paymentData.sourceOfFunds?.cardInfo?.maskedCard || '••••';

      BookingId = merchantOrderId;

      if (status === 'SUCCESS') {
        // Get booking data with proper authorization check
        const snapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
        BookingData = { 
          transactionId, 
          cardBrand, 
          maskedCard, 
          totalPrice: amount, 
          currency,
          ...snapshot.val()
        };
        
        populateVoucherDisplay(BookingData);
        document.getElementById('success-layout').classList.remove('hidden');
        launchConfetti();

        if (user) {
          const updates = {
            paymentStatus: 'SUCCESS',
            transactionId,
            cardBrand,
            maskedCard,
            totalPrice: amount,
            currency
          };
          
          // Add audit fields for admin/moderator updates
          if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
            updates.lastUpdatedBy = user.uid;
            updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
          }
          
          await db.ref(`trip-bookings/${BookingId}`).update(updates);
          
          // Send voucher email if not already sent and user has permission
          if (!BookingData.voucherSent) {
            const canSendVoucher = await checkBookingOwnership(BookingId, user.uid);
            if (canSendVoucher) {
              await sendVoucherEmail(user, 'email-status-message');
            }
          }
        }
      } else {
        displayFailure(
          merchantOrderId,
          `Payment ${latestTransaction.transactionResponseMessage?.en || 'failed'} (${status})`,
          amount,
          currency
        );
      }
    } else {
      displayFailure(merchantOrderId, 'No transactions found for this order.', '', '');
    }

  } catch (error) {
    console.error('Error fetching payment status:', error.message);
    displayFailure(merchantOrderId, `Error checking payment status: ${error.message}`);
  } finally {
    document.getElementById('loading-layout').classList.add('hidden');
  }
}

// Event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the app
  initializeApp();
  
  // Set up button event listeners
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);
});
