// --- Firebase Configuration ---
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

// --- Global State Variables ---
let BookingData = null;
let BookingId = null;
let currentUserRole = null;

// --- Constants ---
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

// --- Helper Functions ---
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

function waitForAuthState() {
  return new Promise(resolve => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    });
  });
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
  if (!userId) return false;
  try {
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    const booking = snapshot.val();
    if (!booking) return false;
    if (currentUserRole === 'admin') return true;
    if (booking.uid === userId) return true;
    if (currentUserRole === 'moderator' && booking.owner === userId) return true;
    return false;
  } catch (error) {
    console.error('Error during Firebase read:', error);
    return false;
  }
}

function determinePaymentStatus(responseCode, transactionStatus) {
  responseCode = String(responseCode).toUpperCase().trim();
  transactionStatus = String(transactionStatus).toUpperCase().trim();

  const successCodes = ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'];
  const cancelledCodes = ['17', 'CANCELLED', 'CANCELED'];
  const pendingCodes = ['09', 'PENDING', 'PROCESSING'];
  const retryableCodes = ['01', '02', '05', '12', '42', '62', '63', '68', '91', '96', 'TEMPORARY_FAILURE', 'BANK_ERROR'];

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
      userMessage: 'Payment processing, please check back later.'
    };
  }

  return {
    paymentStatus: PAYMENT_STATUS.FAILED,
    status: TRANSACTION_STATUS.FAILED,
    userMessage: 'Payment failed. Please try again or contact support.',
    canRetry: retryableCodes.includes(responseCode)
  };
}

async function updateBookingStatus(bookingId, statusData, user) {
  if (!user) throw new Error('User not authenticated');
  const canUpdate = await checkBookingOwnership(bookingId, user.uid);
  if (!canUpdate) throw new Error('User does not have permission');

  const updates = {
    status: statusData.status,
    paymentStatus: statusData.paymentStatus,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    transactionResponseCode: statusData.responseCode,
    transactionResponseMessage: statusData.responseMessage
  };

  if (statusData.amount !== undefined) updates.totalPrice = statusData.amount;
  if (statusData.currency) updates.currency = statusData.currency;
  if (statusData.transactionId) updates.transactionId = statusData.transactionId;
  if (statusData.cardBrand) updates.cardBrand = statusData.cardBrand;
  if (statusData.maskedCard) updates.maskedCard = statusData.maskedCard;
  if (statusData.paymentStatus === PAYMENT_STATUS.SUCCESS) updates.paymentDate = firebase.database.ServerValue.TIMESTAMP;

  updates.lastUpdatedBy = user.uid;
  updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;

  await db.ref(`trip-bookings/${bookingId}`).update(updates);
}

function populateVoucherDisplay(data) {
  if (!data) return;
  const elementsToPopulate = {
    'voucher-ref': BookingId || data.bookingId || 'N/A',
    'voucher-transaction': data.transactionId || 'N/A',
    'voucher-amount': `${data.totalPrice || '0'} ${data.currency || 'EGP'}`,
    'voucher-card': `${data.cardBrand || 'Card'} ${data.maskedCard ? 'ending in ' + data.maskedCard.slice(-4) : '••••'}`,
    'customer-name2': data.username || data.name || 'Valued Customer',
    'customer-email2': data.email || 'N/A',
    'tour-name': data.tourName || data.tour || 'N/A',
    'accommodation-type': data.hotelName || 'N/A',
    'room-type': data.roomNumber || 'N/A',
    'adults-count': data.adults || '0',
    'children-count': data.children || data.childrenUnder12 || '0',
    'infants-count': data.infants || '0',
    'booking-date': formatDate(data.paymentDate ? new Date(data.paymentDate) : (data.createdAt ? new Date(data.createdAt) : new Date())),
    'trip-date': formatDate(data.tripDate),
    'phone-number2': data.phoneNumber || 'N/A',
    'trip-duration': data.duration ? `${data.duration} days` : 'N/A',
    'booking-notes': data.notes || 'N/A'
  };

  for (const id in elementsToPopulate) {
    const element = document.getElementById(id);
    if (element) element.textContent = elementsToPopulate[id];
  }
}

function handlePrintVoucher() {
  const voucherEl = document.getElementById('voucher-content');
  if (!voucherEl || !BookingData) {
    showNotification("Booking details not loaded", true);
    return;
  }

  populateVoucherDisplay(BookingData);
  const originalDisplay = voucherEl.style.display;
  voucherEl.style.display = 'block';

  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      scanStyles: false,
      onPrintDialogClose: () => voucherEl.style.display = originalDisplay,
      onError: () => {
        voucherEl.style.display = originalDisplay;
        showNotification("Print error", true);
      }
    });
  } else {
    window.print();
  }
}

async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!currentUser) throw new Error('Not logged in');
    if (!BookingData || !BookingId) throw new Error('Booking data missing');
    if (!await checkBookingOwnership(BookingId, currentUser.uid)) throw new Error('No permission');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!BookingData.email || !emailRegex.test(BookingData.email)) throw new Error('Invalid email');

    if (statusEl) statusEl.textContent = 'Sending...';
    showNotification('Sending voucher...');

    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/send-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingData: BookingData,
        bookingId: BookingId,
        toEmail: BookingData.email,
        toName: BookingData.username || BookingData.name || 'Valued Customer'
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    showNotification('Voucher sent');
    if (statusEl) statusEl.textContent = 'Sent';

    const updates = {
      voucherSent: true,
      voucherSentAt: firebase.database.ServerValue.TIMESTAMP,
      lastUpdatedBy: currentUser.uid,
      lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    await db.ref(`trip-bookings/${BookingId}`).update(updates);
    return true;
  } catch (error) {
    showNotification(`Failed: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Failed: ${error.message}`;
    return false;
  }
}

async function resendVoucherEmailHandler() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    showNotification('Please log in', true);
    return;
  }

  if (!BookingData || !BookingId) {
    showNotification('Booking data missing', true);
    return;
  }

  if (!await checkBookingOwnership(BookingId, currentUser.uid)) {
    showNotification('No permission', true);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!BookingData.email || !emailRegex.test(BookingData.email)) {
    const email = prompt('Enter valid email:', BookingData.email || '');
    if (email && emailRegex.test(email)) {
      try {
        await db.ref(`trip-bookings/${BookingId}`).update({
          email: email,
          lastUpdatedBy: currentUser.uid,
          lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        BookingData.email = email;
        showNotification('Email updated');
      } catch (error) {
        showNotification('Update failed', true);
        return;
      }
    } else if (email !== null) {
      showNotification('Invalid email', true);
      return;
    } else {
      return;
    }
  }

  let statusId = null;
  if (document.getElementById('success-layout')?.classList.contains('hidden') === false) {
    statusId = 'email-status-message';
  } else if (document.getElementById('already-submitted-layout')?.classList.contains('hidden') === false) {
    statusId = 'submitted-email-status';
  }

  const success = await sendVoucherEmail(currentUser, statusId);
  if (success && BookingId) {
    await db.ref(`trip-bookings/${BookingId}`).update({
      voucherResentAt: firebase.database.ServerValue.TIMESTAMP,
      lastUpdatedBy: currentUser.uid,
      lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP
    });
  }
}

function displayFailure(merchantOrderId, customErrorMessage, amount, currency, canRetry = false) {
  document.getElementById('loading-layout')?.classList.add('hidden');
  document.getElementById('failure-layout')?.classList.remove('hidden');
  const errorMessageEl = document.getElementById('error-message');
  if (errorMessageEl) errorMessageEl.textContent = customErrorMessage;

  const failedRefEl = document.getElementById('failed-ref');
  if (failedRefEl && merchantOrderId) failedRefEl.textContent = merchantOrderId;

  const failedAmountEl = document.getElementById('failed-amount');
  if (failedAmountEl) failedAmountEl.textContent = amount !== null && amount !== undefined ? `${amount} ${currency || 'EGP'}` : 'N/A';

  const retryBtn = document.getElementById('retry-btn');
  const retryMessageEl = document.getElementById('retry-message');
  const contactSupportMessageEl = document.getElementById('contact-support-message');

  let retryUrl = '/';
  if (merchantOrderId) {
    const storedPaymentUrl = localStorage.getItem(`paymentUrl_${merchantOrderId}`);
    if (storedPaymentUrl) retryUrl = storedPaymentUrl;
  }

  if (retryBtn) retryBtn.href = retryUrl;

  if (canRetry && retryUrl !== '/' && retryBtn) {
    retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
    retryBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
    if (retryMessageEl) retryMessageEl.classList.remove('hidden');
    if (contactSupportMessageEl) contactSupportMessageEl.classList.add('hidden');
  } else if (retryBtn) {
    if (retryMessageEl) retryMessageEl.classList.add('hidden');
    if (contactSupportMessageEl) contactSupportMessageEl.classList.remove('hidden');
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
    retryBtn.href = '/';
    retryBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
}

function displayLoginRequired() {
  document.getElementById('loading-layout')?.classList.add('hidden');
  const loginRequiredEl = document.getElementById('login-required-layout');
  if (loginRequiredEl) {
    loginRequiredEl.classList.remove('hidden');
  } else if (document.body) {
    document.body.innerHTML = `
      <div class="container mx-auto p-6 text-center">
        <div class="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-md">
          <i class="fas fa-user-circle text-6xl text-gray-400 mb-4"></i>
          <h2 class="text-2xl font-bold mb-4">Login Required</h2>
          <p class="text-gray-700 mb-6">Please log in to view your booking details.</p>
          <a href="/login" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            Go to Login
          </a>
        </div>
      </div>`;
  }

  document.getElementById('success-layout')?.classList.add('hidden');
  document.getElementById('failure-layout')?.classList.add('hidden');
  document.getElementById('pending-layout')?.classList.add('hidden');
  document.getElementById('already-submitted-layout')?.classList.add('hidden');
  document.getElementById('payment-cancelled-layout')?.classList.add('hidden');
}

async function processPaymentResult(paymentData, user) {
  if (!user) throw new Error("Authentication required");
  const transactions = paymentData.transactions || [];
  if (transactions.length === 0) throw new Error('No transactions found');

  const latestTransaction = transactions[0];
  const status = determinePaymentStatus(
    latestTransaction.transactionResponseCode,
    latestTransaction.status
  );

  const paymentInfo = {
    amount: paymentData.totalCapturedAmount,
    currency: latestTransaction.currency || paymentData.currency || 'EGP',
    transactionId: paymentData.orderId,
    cardBrand: paymentData.sourceOfFunds?.cardInfo?.cardBrand || 'Card',
    maskedCard: paymentData.sourceOfFunds?.cardInfo?.maskedCard || '••••',
    responseCode: latestTransaction.transactionResponseCode,
    responseMessage: latestTransaction.transactionResponseMessage?.en || latestTransaction.transactionResponseMessage || ''
  };

  await updateBookingStatus(BookingId, { ...status, ...paymentInfo }, user);

  const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
  BookingData = bookingSnapshot.val();
  if (!BookingData) throw new Error('Booking not found');

  return { status, paymentInfo };
}

async function initializeApp() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    BookingId = urlParams.get('bookingId');
    if (!BookingId) throw new Error('No booking ID');

    const user = await waitForAuthState();
    if (!user) {
      displayLoginRequired();
      return;
    }

    currentUserRole = await getUserRole(user.uid);
    if (!await checkBookingOwnership(BookingId, user.uid)) {
      displayLoginRequired();
      return;
    }

    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val();
    if (!BookingData) throw new Error('Booking not found');

    const paymentResult = urlParams.get('paymentResult');
    if (paymentResult) {
      try {
        const result = JSON.parse(decodeURIComponent(paymentResult));
        const { status, paymentInfo } = await processPaymentResult(result.data.response, user);

        document.getElementById('loading-layout')?.classList.add('hidden');

        switch (status.paymentStatus) {
          case PAYMENT_STATUS.SUCCESS:
            document.getElementById('success-layout')?.classList.remove('hidden');
            populateVoucherDisplay(BookingData);
            launchConfetti();
            if (!BookingData?.voucherSent) {
              if (await checkBookingOwnership(BookingId, user.uid)) {
                await sendVoucherEmail(user, 'email-status-message');
              }
            }
            break;

          case PAYMENT_STATUS.PENDING:
            document.getElementById('pending-layout')?.classList.remove('hidden');
            document.getElementById('pending-ref')?.textContent = BookingId || 'N/A';
            document.getElementById('pending-amount')?.textContent = `${paymentInfo.amount || '0'} ${paymentInfo.currency || 'EGP'}`;
            document.getElementById('pending-email')?.textContent = BookingData?.email || 'N/A';
            break;

          case PAYMENT_STATUS.CANCELLED:
            document.getElementById('payment-cancelled-layout')?.classList.remove('hidden');
            document.getElementById('cancelled-ref-info')?.textContent = `Booking Reference: ${BookingId}`;
            break;

          case PAYMENT_STATUS.FAILED:
            displayFailure(
              BookingId,
              status.userMessage + (paymentInfo.responseMessage ? ` (${paymentInfo.responseMessage})` : ''),
              paymentInfo.amount,
              paymentInfo.currency,
              status.canRetry
            );
            break;

          default:
            displayFailure(
              BookingId,
              `Unexpected status: ${status.paymentStatus}`,
              paymentInfo.amount,
              paymentInfo.currency,
              false
            );
        }
      } catch (error) {
        displayFailure(BookingId, `Error: ${error.message}`, null, null, false);
      }
    } else {
      document.getElementById('loading-layout')?.classList.add('hidden');
      if (BookingData.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        document.getElementById('success-layout')?.classList.remove('hidden');
        populateVoucherDisplay(BookingData);
        if (BookingData.voucherSent && await checkBookingOwnership(BookingId, user.uid)) {
          document.getElementById('resend-email-btn')?.classList.remove('hidden');
        }
      } else if (BookingData.paymentStatus === PAYMENT_STATUS.PENDING) {
        document.getElementById('pending-layout')?.classList.remove('hidden');
        document.getElementById('pending-ref')?.textContent = BookingId || 'N/A';
        document.getElementById('pending-amount')?.textContent = `${BookingData.totalPrice || '0'} ${BookingData.currency || 'EGP'}`;
        document.getElementById('pending-email')?.textContent = BookingData.email || 'N/A';
      } else {
        document.getElementById('already-submitted-layout')?.classList.remove('hidden');
        populateVoucherDisplay(BookingData);
      }
    }
  } catch (error) {
    displayFailure(BookingId, `Error: ${error.message}`, null, null, false);
  } finally {
    document.getElementById('loading-layout')?.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);
});
