// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI", // Replace with your actual API key if this is a placeholder
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

let BookingData = null;
let BookingId = null;
let currentUserRole = null;

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
    if (currentUserRole === 'moderator' && booking.owner === userId) return true; // Assumes booking.owner stores moderator/agent UID
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
    'booking-date': formatDate(data.paymentDate ? new Date(data.paymentDate) : (data.createdAt ? new Date(data.createdAt) : new Date())), // FIXED newDate() to new Date()
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

  populateVoucherDisplay(BookingData); // Ensure latest data is populated before printing
  const originalDisplay = voucherEl.style.display;
  voucherEl.style.display = 'block'; // Make it visible for printing

  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      scanStyles: false, // Important if you have specific print styles or want to avoid external ones
      onPrintDialogClose: () => voucherEl.style.display = originalDisplay,
      onError: () => {
        voucherEl.style.display = originalDisplay;
        showNotification("Print error", true);
      }
    });
  } else {
    // Fallback to browser print
    window.print();
    // Note: Hiding voucherEl after window.print() is trickier as it's asynchronous
    // and doesn't have a reliable callback like printJS.
    // For simplicity, it might remain 'block' or be hidden by user interaction.
    // If it must be hidden, a small timeout could be used, but it's not guaranteed.
    // setTimeout(() => { voucherEl.style.display = originalDisplay; }, 1000); // Example, not ideal
  }
}

const SEND_VOUCHER_API_URL = 'https://api-discover-sharm.netlify.app/.netlify/functions/send-voucher';

async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!currentUser) throw new Error('Not logged in');
    if (!BookingData || !BookingId) throw new Error('Booking data missing');
    if (!await checkBookingOwnership(BookingId, currentUser.uid)) throw new Error('No permission');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!BookingData.email || !emailRegex.test(BookingData.email)) throw new Error('Invalid email for booking');

    if (statusEl) statusEl.textContent = 'Sending...';
    showNotification('Sending voucher...');

    const response = await fetch(SEND_VOUCHER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingData: BookingData,
        bookingId: BookingId,
        toEmail: BookingData.email,
        toName: BookingData.username || BookingData.name || 'Valued Customer'
      })
    });

    if (!response.ok) {
        let errorText = await response.text();
        try {
            const jsonError = JSON.parse(errorText);
            errorText = jsonError.message || jsonError.error || errorText;
        } catch (e) {
            // Not a JSON error, use text as is
        }
        throw new Error(errorText);
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Failed to send voucher via API');

    showNotification('Voucher sent successfully!');
    if (statusEl) statusEl.textContent = 'Sent successfully!';

    const updates = {
      voucherSent: true,
      voucherSentAt: firebase.database.ServerValue.TIMESTAMP,
      lastUpdatedBy: currentUser.uid,
      lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    await db.ref(`trip-bookings/${BookingId}`).update(updates);
    BookingData.voucherSent = true; // Update local BookingData state
    BookingData.voucherSentAt = Date.now(); // Approximate client-side timestamp
    return true;
  } catch (error) {
    console.error("sendVoucherEmail error:", error);
    showNotification(`Failed to send voucher: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Failed: ${error.message.substring(0, 100)}`; // Limit length
    return false;
  }
}

async function resendVoucherEmailHandler() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    showNotification('Please log in to resend voucher.', true);
    return;
  }

  if (!BookingData || !BookingId) {
    showNotification('Booking data is not loaded.', true);
    return;
  }

  if (!await checkBookingOwnership(BookingId, currentUser.uid)) {
    showNotification('You do not have permission to resend this voucher.', true);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!BookingData.email || !emailRegex.test(BookingData.email)) {
    const newEmail = prompt('The stored email is invalid or missing. Please enter a valid email address to send the voucher to:', BookingData.email || '');
    if (newEmail && emailRegex.test(newEmail)) {
      try {
        await db.ref(`trip-bookings/${BookingId}`).update({
          email: newEmail,
          lastUpdatedBy: currentUser.uid,
          lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        BookingData.email = newEmail; // Update local BookingData
        showNotification('Email address updated successfully.');
      } catch (error) {
        console.error("Email update error:", error);
        showNotification('Failed to update email address. Please try again.', true);
        return;
      }
    } else if (newEmail !== null) { // User entered something, but it was invalid
      showNotification('The email address you entered is invalid.', true);
      return;
    } else { // User cancelled the prompt
      showNotification('Voucher resend cancelled.', false);
      return;
    }
  }

  let statusId = null;
  if (document.getElementById('success-layout')?.classList.contains('hidden') === false) {
    statusId = 'email-status-message';
  } else if (document.getElementById('already-submitted-layout')?.classList.contains('hidden') === false) {
    statusId = 'submitted-email-status';
  }
  // Add more else if blocks here if resend can be triggered from other layouts with status messages

  const success = await sendVoucherEmail(currentUser, statusId);
  if (success && BookingId) { // sendVoucherEmail already updates voucherSent and voucherSentAt
    await db.ref(`trip-bookings/${BookingId}`).update({
      voucherResentAt: firebase.database.ServerValue.TIMESTAMP, // Specifically track resent
      lastUpdatedBy: currentUser.uid, // This will be the same user as in sendVoucherEmail
      lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP // Also updated in sendVoucherEmail, but good to be explicit
    });
    if(BookingData) BookingData.voucherResentAt = Date.now(); // Update local state
  }
}

function displayFailure(merchantOrderId, customErrorMessage, amount, currency, canRetry = false) {
  document.getElementById('loading-layout')?.classList.add('hidden');
  document.getElementById('success-layout')?.classList.add('hidden');
  document.getElementById('pending-layout')?.classList.add('hidden');
  document.getElementById('already-submitted-layout')?.classList.add('hidden');
  document.getElementById('payment-cancelled-layout')?.classList.add('hidden');
  document.getElementById('login-required-layout')?.classList.add('hidden');

  document.getElementById('failure-layout')?.classList.remove('hidden');
  const errorMessageEl = document.getElementById('error-message');
  if (errorMessageEl) errorMessageEl.textContent = customErrorMessage;

  const failedRefEl = document.getElementById('failed-ref');
  if (failedRefEl && merchantOrderId) failedRefEl.textContent = merchantOrderId;

  const failedAmountEl = document.getElementById('failed-amount');
  if (failedAmountEl) failedAmountEl.textContent = (amount !== null && amount !== undefined) ? `${amount} ${currency || 'EGP'}` : 'N/A';

  const retryBtn = document.getElementById('retry-btn');
  const retryMessageEl = document.getElementById('retry-message');
  const contactSupportMessageEl = document.getElementById('contact-support-message');

  let retryUrl = '/'; // Default to home
  if (merchantOrderId) {
    const storedPaymentUrl = localStorage.getItem(`paymentUrl_${merchantOrderId}`);
    if (storedPaymentUrl) retryUrl = storedPaymentUrl;
  }

  if (retryBtn) retryBtn.href = retryUrl;

  if (canRetry && retryUrl !== '/' && retryBtn) {
    retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
    retryBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600', 'bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
    if (retryMessageEl) retryMessageEl.classList.remove('hidden');
    if (contactSupportMessageEl) contactSupportMessageEl.classList.add('hidden');
  } else if (retryBtn) {
    if (retryMessageEl) retryMessageEl.classList.add('hidden');
    if (contactSupportMessageEl) contactSupportMessageEl.classList.remove('hidden');
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
    retryBtn.href = '/'; // Ensure it always points to home if not retryable
    retryBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
}

function displayLoginRequired() {
  document.getElementById('loading-layout')?.classList.add('hidden');
  document.getElementById('success-layout')?.classList.add('hidden');
  document.getElementById('failure-layout')?.classList.add('hidden');
  document.getElementById('pending-layout')?.classList.add('hidden');
  document.getElementById('already-submitted-layout')?.classList.add('hidden');
  document.getElementById('payment-cancelled-layout')?.classList.add('hidden');

  const loginRequiredEl = document.getElementById('login-required-layout');
  if (loginRequiredEl) {
    loginRequiredEl.classList.remove('hidden');
  } else if (document.body) { // Fallback if the dedicated layout div is missing
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
}

async function processPaymentResult(paymentData, user) {
  if (!user) throw new Error("Authentication required to process payment.");
  const transactions = paymentData.transactions || [];
  if (transactions.length === 0) throw new Error('No transactions found in payment data.');

  const latestTransaction = transactions[0]; // Assuming the first transaction is the most relevant or final one
  const statusDetails = determinePaymentStatus(
    latestTransaction.transactionResponseCode,
    latestTransaction.status
  );

  const paymentInfo = {
    amount: paymentData.totalCapturedAmount, // This should be the actual amount charged
    currency: latestTransaction.currency || paymentData.currency || 'EGP',
    transactionId: paymentData.orderId, // This is often the merchant's order ID / booking ID
    cardBrand: paymentData.sourceOfFunds?.cardInfo?.cardBrand || 'Card',
    maskedCard: paymentData.sourceOfFunds?.cardInfo?.maskedCard || '••••',
    responseCode: latestTransaction.transactionResponseCode,
    responseMessage: latestTransaction.transactionResponseMessage?.en || latestTransaction.transactionResponseMessage || ''
  };

  await updateBookingStatus(BookingId, { ...statusDetails, ...paymentInfo }, user);

  // Re-fetch booking data to ensure local BookingData is up-to-date after status update
  const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
  BookingData = bookingSnapshot.val();
  if (!BookingData) throw new Error('Booking not found after update.');

  return { status: statusDetails, paymentInfo };
}

async function initializeApp() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    BookingId = urlParams.get('bookingId');
    if (!BookingId) {
      // Try to get booking ID from path if applicable, e.g., /booking/BOOKING_ID_HERE
      // For this example, sticking to query param only.
      const pathParts = window.location.pathname.split('/');
      const bookingIdFromPath = pathParts[pathParts.length -1]; // Simplistic, adjust if path is different
      if (pathParts.length > 1 && pathParts[pathParts.length-2] === 'booking') { // Example: /booking/ID
          BookingId = bookingIdFromPath;
      }
      if(!BookingId) throw new Error('No booking ID found in URL query parameters (bookingId=...).');
    }


    const user = await waitForAuthState();
    if (!user) {
      displayLoginRequired();
      return;
    }

    currentUserRole = await getUserRole(user.uid);
    if (!await checkBookingOwnership(BookingId, user.uid)) {
      displayLoginRequired(); // Or a "permission denied" page
      return;
    }

    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val();
    if (!BookingData) {
        displayFailure(BookingId, `Booking with ID ${BookingId} not found.`, null, null, false);
        return;
    }


    const paymentResultParam = urlParams.get('paymentResult');
    if (paymentResultParam) {
      try {
        const decodedResult = decodeURIComponent(paymentResultParam);
        const resultData = JSON.parse(decodedResult);
        // Assuming resultData.data.response structure based on original code
        if (!resultData || !resultData.data || !resultData.data.response) {
            throw new Error('Invalid payment result structure.');
        }
        const { status, paymentInfo } = await processPaymentResult(resultData.data.response, user);

        document.getElementById('loading-layout')?.classList.add('hidden');

        switch (status.paymentStatus) {
          case PAYMENT_STATUS.SUCCESS:
            document.getElementById('success-layout')?.classList.remove('hidden');
            populateVoucherDisplay(BookingData);
            launchConfetti();
            if (!BookingData?.voucherSent) {
              // checkBookingOwnership is implicitly handled by sendVoucherEmail
              await sendVoucherEmail(user, 'email-status-message');
            } else {
                // If already sent, maybe update the status message or show resend button
                const emailStatusEl = document.getElementById('email-status-message');
                if (emailStatusEl) emailStatusEl.textContent = "Voucher previously sent.";
                document.getElementById('resend-email-btn')?.classList.remove('hidden');
            }
            break;

          case PAYMENT_STATUS.PENDING:
            document.getElementById('pending-layout')?.classList.remove('hidden');
            document.getElementById('pending-ref')?.textContent = BookingId || 'N/A';
            document.getElementById('pending-amount')?.textContent = `${paymentInfo.amount || BookingData.totalPrice || '0'} ${paymentInfo.currency || BookingData.currency || 'EGP'}`;
            document.getElementById('pending-email')?.textContent = BookingData?.email || 'N/A';
            break;

          case PAYMENT_STATUS.CANCELLED:
            document.getElementById('payment-cancelled-layout')?.classList.remove('hidden');
            document.getElementById('cancelled-ref-info')?.textContent = `Booking Reference: ${BookingId}`;
            break;

          case PAYMENT_STATUS.FAILED:
          default: // Also catches unexpected statuses
            displayFailure(
              BookingId,
              status.userMessage + (paymentInfo.responseMessage ? ` (Details: ${paymentInfo.responseMessage})` : ''),
              paymentInfo.amount,
              paymentInfo.currency,
              status.canRetry !== undefined ? status.canRetry : false // Ensure canRetry is boolean
            );
            break;
        }
      } catch (error) {
        console.error("Error processing payment result:", error);
        displayFailure(BookingId, `Error processing payment: ${error.message}`, BookingData?.totalPrice, BookingData?.currency, false);
      }
    } else { // No paymentResult in URL query parameter (direct load, bookmark, etc.)
      document.getElementById('loading-layout')?.classList.add('hidden');
      if (!BookingData) { // Should have been caught earlier, but double check
          displayFailure(BookingId, 'Booking data could not be loaded.', null, null, false);
          return;
      }

      if (BookingData.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        document.getElementById('success-layout')?.classList.remove('hidden');
        populateVoucherDisplay(BookingData);
        if (BookingData.voucherSent) { // checkBookingOwnership is handled by resendVoucherEmailHandler
          document.getElementById('resend-email-btn')?.classList.remove('hidden');
          const emailStatusEl = document.getElementById('email-status-message');
          if (emailStatusEl) emailStatusEl.textContent = "Voucher already sent. Resend if needed.";
        } else {
           // If not sent, and user has permission, they could trigger send from here if a button exists
           // For now, assuming initial send happens after payment.
           const emailStatusEl = document.getElementById('email-status-message');
           if (emailStatusEl) emailStatusEl.textContent = "Voucher not sent yet.";
        }
      } else if (BookingData.paymentStatus === PAYMENT_STATUS.PENDING) {
        document.getElementById('pending-layout')?.classList.remove('hidden');
        document.getElementById('pending-ref')?.textContent = BookingId || 'N/A';
        document.getElementById('pending-amount')?.textContent = `${BookingData.totalPrice || '0'} ${BookingData.currency || 'EGP'}`;
        document.getElementById('pending-email')?.textContent = BookingData.email || 'N/A';
      } else if (BookingData.paymentStatus === PAYMENT_STATUS.FAILED) {
        displayFailure(
            BookingId,
            `Booking status: Payment Failed.` + (BookingData.transactionResponseMessage ? ` (${BookingData.transactionResponseMessage})` : ''),
            BookingData.totalPrice,
            BookingData.currency,
            false // Typically, canRetry is false when viewing a historical failed status
        );
      } else if (BookingData.paymentStatus === PAYMENT_STATUS.CANCELLED) {
        document.getElementById('payment-cancelled-layout')?.classList.remove('hidden');
        document.getElementById('cancelled-ref-info')?.textContent = `Booking Reference: ${BookingId}`;
      } else { // Fallback for other statuses (e.g. if paymentStatus is null, undefined, or an old/unknown value)
        document.getElementById('already-submitted-layout')?.classList.remove('hidden');
        populateVoucherDisplay(BookingData); // Display whatever data we have
        // Show relevant buttons for this "already-submitted" or "other status" state
        if (await checkBookingOwnership(BookingId, user.uid)) {
            const printBtnSubmitted = document.getElementById('print-voucher-btn-submitted');
            if (printBtnSubmitted) printBtnSubmitted.classList.remove('hidden');

            if (BookingData.voucherSent) { // Only show resend if it was successfully sent before
                const resendBtnSubmitted = document.getElementById('resend-email-btn-submitted');
                if (resendBtnSubmitted) resendBtnSubmitted.classList.remove('hidden');
            }
        }
      }
    }
  } catch (error) {
    console.error("Initialization error:", error);
    displayFailure(BookingId, `Error initializing page: ${error.message}`, BookingData?.totalPrice, BookingData?.currency, false);
  } finally {
    document.getElementById('loading-layout')?.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();

  // Attach event listeners to buttons that might exist in different layouts
  const printBtn = document.getElementById('print-voucher-btn');
  if(printBtn) printBtn.addEventListener('click', handlePrintVoucher);

  const resendBtn = document.getElementById('resend-email-btn');
  if(resendBtn) resendBtn.addEventListener('click', resendVoucherEmailHandler);

  const printBtnSubmitted = document.getElementById('print-voucher-btn-submitted');
  if(printBtnSubmitted) printBtnSubmitted.addEventListener('click', handlePrintVoucher);
  
  const resendBtnSubmitted = document.getElementById('resend-email-btn-submitted');
  if(resendBtnSubmitted) resendBtnSubmitted.addEventListener('click', resendVoucherEmailHandler);

  // Example: If there's a print button in the failure layout (though less common)
  // const printBtnFailed = document.getElementById('print-voucher-btn-failed');
  // if(printBtnFailed) printBtnFailed.addEventListener('click', handlePrintVoucher);
});
