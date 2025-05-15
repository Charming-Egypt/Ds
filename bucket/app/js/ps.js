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

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that instance
}

const db = firebase.database();
const auth = firebase.auth();

// --- Global State Variables ---
let BookingData = null;
let BookingId = null;
let currentUserRole = null; // Will be null if no user is logged in

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

/**
 * Formats a date string or Date object into a human-readable string.
 * @param {string | Date} dateStringOrDate - The date input.
 * @returns {string} Formatted date string or 'N/A'.
 */
function formatDate(dateStringOrDate) {
  if (!dateStringOrDate) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateToFormat = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  return isNaN(dateToFormat.getTime()) ? 'N/A' : dateToFormat.toLocaleDateString(navigator.language || 'en-US', options);
}

/**
 * Displays a transient notification message.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True if it's an error notification, false for success.
 */
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification animate__animated animate__fadeInUp ${isError ? 'notification-error' : 'notification-success'}`;
  notification.innerHTML = `<div class="flex items-start"><i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2 mt-1"></i><div>${message}</div></div>`;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('animate__fadeOutDown');
    setTimeout(() => notification.remove(), 500);
  }, 5000); // Notification stays for 5 seconds
}

/**
 * Launches a confetti animation if the confetti library is available.
 */
function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
  }
}

/**
 * Waits for Firebase Auth state to be ready and resolves with the current user.
 * This will resolve with null if no user is logged in.
 * @returns {Promise<firebase.User | null>} The authenticated user or null.
 */
function waitForAuthState() {
  console.log("Waiting for Firebase Auth state...");
  return new Promise(resolve => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe(); // Stop listening after the first state change
      console.log("Auth state changed. User:", user ? user.uid : 'null (not logged in)');
      resolve(user);
    });
  });
}

/**
 * Fetches the user's role from the database.
 * @param {string} uid - The user's unique ID.
 * @returns {Promise<string>} The user's role ('admin', 'moderator', or 'user').
 */
async function getUserRole(uid) {
  try {
    const snapshot = await db.ref(`egy_user/${uid}/role`).once('value');
    return snapshot.val() || 'user'; // Default to 'user' if no role is set
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'user';
  }
}

/**
 * Checks if the current user or an admin/moderator has permission to access/update a booking.
 * Attempts to read the data first, which is where Firebase rules apply.
 * Requires a logged-in user.
 * @param {string} bookingId - The ID of the booking.
 * @param {string} userId - The UID of the currently authenticated user.
 * @returns {Promise<boolean>} True if the user has permission (read allowed and conditions met), false otherwise.
 */
async function checkBookingOwnership(bookingId, userId) {
  // Ensure userId is provided (means a user is logged in)
  if (!userId) {
      console.warn("checkBookingOwnership called without logged-in userId.");
      return false;
  }
  try {
    // This read operation is subject to Firebase Security Rules
    console.log(`Attempting to read booking ${bookingId} for user ${userId}...`);
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    const booking = snapshot.val();

    // If snapshot.val() is null, the data wasn't found *or* Firebase rules denied the read.
    if (!booking) {
        console.warn(`Read access denied by rule or booking ${bookingId} not found for user ${userId}.`);
      return false; // Data not accessible or doesn't exist -> no permission
    }

    // --- Client-side checks (These run ONLY if the server-side rule allowed the read) ---
    // These checks should ideally mirror your .read rule conditions for $bookingId

    // Admins have full access (check global role, set after auth state)
    if (currentUserRole === 'admin') {
        console.log(`User ${userId} is admin, granted permission.`);
        return true;
    }

    // Users can access their own bookings (checked by uid from DB vs current auth.uid)
    if (booking.uid === userId) {
         console.log(`User ${userId} matches booking uid, granted permission.`);
         return true;
    }

    // Moderators can access bookings where they are the owner of the associated trip
    if (currentUserRole === 'moderator' && booking.owner === userId) {
        console.log(`User ${userId} is moderator and matches booking owner, granted permission.`);
      return true;
    }

    console.warn(`Client-side permission checks failed for user ${userId} on booking ${bookingId}. Booking data UID: ${booking.uid}, Owner: ${booking.owner}, User Role: ${currentUserRole}`);
    return false; // None of the client-side conditions were met
  } catch (error) {
    // This will catch the Firebase Error if the read was denied by rules (e.g., permission_denied)
    console.error('Error during Firebase read for booking ownership check (likely rule denied):', error);
    return false; // An error occurred (most likely permission_denied) -> no permission
  }
}

/**
 * Determines the internal payment status and user message based on gateway response codes and statuses.
 * @param {string | number} responseCode - The gateway's response code.
 * @param {string} transactionStatus - The gateway's transaction status.
 * @returns {{paymentStatus: string, status: string, userMessage: string, canRetry?: boolean}} The determined status details.
 */
function determinePaymentStatus(responseCode, transactionStatus) {
  responseCode = String(responseCode).toUpperCase().trim();
  transactionStatus = String(transactionStatus).toUpperCase().trim();

  // Define status codes
  const successCodes = ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'];
  const cancelledCodes = ['17', 'CANCELLED', 'CANCELED'];
  const pendingCodes = ['09', 'PENDING', 'PROCESSING'];
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
      userMessage: 'Payment processing, please check back later.'
    };
  }

  // Default to failed
  return {
    paymentStatus: PAYMENT_STATUS.FAILED,
    status: TRANSACTION_STATUS.FAILED,
    userMessage: 'Payment failed. Please try again or contact support.',
    canRetry: retryableCodes.includes(responseCode)
  };
}

/**
 * Updates the booking status and payment details in the database.
 * Requires permission check before updating.
 * @param {string} bookingId - The ID of the booking to update.
 * @param {object} statusData - An object containing status and payment details.
 * @param {firebase.User} user - The currently authenticated user object.
 * @returns {Promise<boolean>} True if the update was successful, false otherwise.
 * @throws {Error} If user is not authenticated or lacks permission based on checkBookingOwnership.
 */
async function updateBookingStatus(bookingId, statusData, user) {
  if (!user) {
    console.error('updateBookingStatus called without authenticated user.');
    throw new Error('User not authenticated. Cannot update booking.');
  }

  // First check if we have permission to update (this calls the read check again)
  const canUpdate = await checkBookingOwnership(bookingId, user.uid);
  if (!canUpdate) {
    // If checkBookingOwnership returns false, throw an error
    console.error(`User ${user.uid} does not have permission to update booking ${bookingId}.`);
    throw new Error('User does not have permission to update this booking');
  }

  console.log(`Permission check passed for user ${user.uid} updating booking ${bookingId}. Proceeding with update.`);

  const updates = {
    status: statusData.status,
    paymentStatus: statusData.paymentStatus,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP, // Use server timestamp
    transactionResponseCode: statusData.responseCode, // Corrected property name
    transactionResponseMessage: statusData.responseMessage // Corrected property name
  };

  // Include payment details only if available
  if (statusData.amount !== undefined) updates.totalPrice = statusData.amount;
  if (statusData.currency) updates.currency = statusData.currency;
  if (statusData.transactionId) updates.transactionId = statusData.transactionId;
  if (statusData.cardBrand) updates.cardBrand = statusData.cardBrand;
  if (statusData.maskedCard) updates.maskedCard = statusData.maskedCard;
  if (statusData.paymentStatus === PAYMENT_STATUS.SUCCESS) updates.paymentDate = firebase.database.ServerValue.TIMESTAMP;


  // Add audit info for the user who triggered this update
  updates.lastUpdatedBy = user.uid;
  updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;

  console.log("Attempting to update booking", bookingId, "with payload:", updates); // ADDED LOG

  try {
    await db.ref(`trip-bookings/${bookingId}`).update(updates);
    console.log(`Booking ${bookingId} updated successfully.`);
    return true;
  } catch (error) {
    console.error('Error updating booking status in Firebase:', error);
    throw error; // Re-throw the error for calling function to handle
  }
}

/**
 * Populates the voucher display elements with booking data.
 * Includes checks to ensure elements exist.
 * @param {object} data - The booking data object.
 */
function populateVoucherDisplay(data) {
  if (!data) {
     console.warn("populateVoucherDisplay called with no data.");
     return;
   }
   console.log("Populating voucher display with data:", data);

   // Add checks for each element *before* accessing textContent
   // If an element is null, log an error but continue to try and populate others
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
       if (element) {
           element.textContent = elementsToPopulate[id];
       } else {
           console.error(`populateVoucherDisplay: Element #${id} not found in the DOM!`);
           // Continue loop to find other missing elements
       }
   }
}


/**
 * Handles the click event for printing the voucher.
 * Uses Print.js if available, otherwise falls back to window.print.
 */
function handlePrintVoucher() {
  const voucherEl = document.getElementById('voucher-content');
  if (!voucherEl || !BookingData) {
    showNotification("Booking details not loaded. Cannot print voucher.", true);
    return;
  }

  // Populate before printing
  populateVoucherDisplay(BookingData);
  // Make the voucher content visible only during printing if it's normally hidden
  const originalDisplay = voucherEl.style.display;
  voucherEl.style.display = 'block'; // Ensure it's block for printing

  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      style: `.voucher-container { padding: 20px; border: 1px solid #ccc; font-family: sans-serif; }
               .voucher-header { text-align: center; margin-bottom: 20px; }
               .voucher-header h2 { margin: 0; }
               .voucher-details, .customer-details { margin-bottom: 20px; }
               .voucher-details div, .customer-details div { margin-bottom: 5px; }
               .voucher-details strong, .customer-details strong { display: inline-block; width: 150px; }
               /* Add more styles as needed to match your voucher layout */`,
      scanStyles: false, // Set to false if providing manual styles
      onPrintDialogClose: () => {
        // Restore original display state after print dialog closes
        voucherEl.style.display = originalDisplay;
      },
      onError: (err) => {
        console.error('Print error:', err);
        // Restore original display state on error
        voucherEl.style.display = originalDisplay;
        showNotification("Could not print voucher.", true);
      }
    });
  } else {
    // Fallback for browsers that don't support printJS
    window.print();
  }
}


/**
 * Sends the voucher email using a Netlify function.
 * Requires a logged-in user with permission.
 * @param {firebase.User} currentUser - The currently authenticated user.
 * @param {string} [statusElementId=null] - Optional ID of an element to display email sending status.
 * @returns {Promise<boolean>} True if the email was sent successfully, false otherwise.
 */
async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!currentUser) {
        console.warn("sendVoucherEmail called without logged-in user.");
        showNotification('You must be logged in to send the voucher.', true);
        if (statusEl) statusEl.textContent = 'Email not sent: Not logged in.';
        return false;
    }
    if (!BookingData || !BookingId) {
      showNotification('Booking data not available for sending email.', true);
      if (statusEl) statusEl.textContent = 'Email not sent: Booking data missing.';
      return false;
    }

    // Re-check permission immediately before sending email
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

    console.log(`Attempting to send voucher email for booking ${BookingId} to ${BookingData.email} by user ${currentUser.uid}`);

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server returned an error' }));
      console.error('Netlify function send-voucher failed:', response.status, errorData);
      throw new Error(errorData.message || `Failed to send email (HTTP ${response.status})`);
    }

    const result = await response.json();
    if (result.success) {
      showNotification('Voucher sent successfully!');
      if (statusEl) statusEl.textContent = 'Voucher sent to your email!';

      // Update Firebase to mark voucher as sent
      const updates = {
        voucherSent: true,
         voucherSentAt: firebase.database.ServerValue.TIMESTAMP, // Log when it was sent
      };

      // Log who sent it (the current user triggering the action)
      updates.lastUpdatedBy = currentUser.uid;
      updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;

      try {
        await db.ref(`trip-bookings/${BookingId}`).update(updates);
         console.log(`Firebase updated: voucherSent status for ${BookingId}.`);
      } catch (updateError) {
         console.error('Error updating voucherSent status in Firebase:', updateError);
         // Don't fail the email send process just because the log update failed
      }

      return true;
    } else {
      console.error('Netlify function reported failure:', result.message);
      throw new Error(result.message || 'Failed to send the voucher');
    }

  } catch (error) {
    console.error('Error sending email:', error.message);
    showNotification(`Failed to send voucher: ${error.message}`, true);
    if (statusEl) statusEl.textContent = `Voucher email failed: ${error.message}`;
    return false;
  }
}

/**
 * Handles the click event for resending the voucher email.
 * Prompts for email if invalid or missing before sending.
 * Requires a logged-in user with permission.
 */
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

    // Re-check permission immediately before resend attempt
  const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
  if (!hasPermission) {
    showNotification('You do not have permission to resend this voucher.', true);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!BookingData.email || !emailRegex.test(BookingData.email)) {
    // Prompt for email if missing or invalid
    const email = prompt('Enter valid email to resend voucher:', BookingData.email || '');
    if (email && emailRegex.test(email)) {
      // Update email in Firebase if a valid one is provided
      const updates = { email: email };
      // Log who updated the email
      updates.lastUpdatedBy = currentUser.uid;
      updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;

      try {
        await db.ref(`trip-bookings/${BookingId}`).update(updates);
        BookingData.email = email; // Update local data
        showNotification('Email address updated.');
      } catch (error) {
        console.error('Error updating email address:', error);
        showNotification('Failed to update email address.', true);
        return; // Stop if email update failed
      }
    } else if (email !== null) {
      showNotification('Invalid email address entered. Cannot resend.', true);
      return;
    } else {
      // User cancelled the prompt
      return;
    }
  }

  // Determine which status element to update based on visible layout
  let statusId = null;
  if (document.getElementById('success-layout') && !document.getElementById('success-layout').classList.contains('hidden')) {
    statusId = 'email-status-message';
  } else if (document.getElementById('already-submitted-layout') && !document.getElementById('already-submitted-layout').classList.contains('hidden')) {
    statusId = 'submitted-email-status';
  }

  // Now send the email
  const success = await sendVoucherEmail(currentUser, statusId);
  if (success && BookingId) {
    // Update Firebase to log the resend action timestamp
    const updates = {
      voucherResentAt: firebase.database.ServerValue.TIMESTAMP
    };

    // Log who resent it
    updates.lastUpdatedBy = currentUser.uid;
    updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;

    try {
      await db.ref(`trip-bookings/${BookingId}`).update(updates);
       console.log(`Firebase updated: voucherResentAt status for ${BookingId}.`);
    } catch (error) {
      console.error('Error logging voucher resend:', error);
    }
  }
}


/**
 * Displays the failure layout with relevant details.
 * @param {string} merchantOrderId - The booking/order ID.
 * @param {string} customErrorMessage - A user-friendly error message.
 * @param {number} amount - The transaction amount.
 * @param {string} currency - The transaction currency.
 * @param {boolean} canRetry - Whether a retry option should be shown.
 */
function displayFailure(merchantOrderId, customErrorMessage, amount, currency, canRetry = false) {
  console.log("Displaying failure:", { merchantOrderId, customErrorMessage, amount, currency, canRetry });
  document.getElementById('loading-layout').classList.add('hidden');
  document.getElementById('failure-layout').classList.remove('hidden');
  document.getElementById('error-message').textContent = customErrorMessage;
  if (merchantOrderId) document.getElementById('failed-ref').textContent = merchantOrderId;
  if (amount !== null && amount !== undefined) document.getElementById('failed-amount').textContent = `${amount} ${currency || 'EGP'}`;
  else document.getElementById('failed-amount').textContent = 'N/A';

  const retryBtn = document.getElementById('retry-btn');
  const retryMessageEl = document.getElementById('retry-message');
  const contactSupportMessageEl = document.getElementById('contact-support-message');

  let retryUrl = '/'; // Default home URL

  // Attempt to get the original payment URL from localStorage
  if (merchantOrderId) {
    const storedPaymentUrl = localStorage.getItem(`paymentUrl_${merchantOrderId}`);
    if (storedPaymentUrl) {
      retryUrl = storedPaymentUrl;
    }
  }

  retryBtn.href = retryUrl; // Set the href for the button

  if (canRetry && retryUrl !== '/') {
    // Only show retry if explicitly allowed and we have a URL other than home
    retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
    retryBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
     if(retryMessageEl) retryMessageEl.classList.remove('hidden');
     if(contactSupportMessageEl) contactSupportMessageEl.classList.add('hidden');
  } else {
    // Show return home if not retryable or no specific payment URL was stored
    if(retryMessageEl) retryMessageEl.classList.add('hidden');
    if(contactSupportMessageEl) contactSupportMessageEl.classList.remove('hidden');
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
    retryBtn.href = '/'; // Explicitly set to home
    retryBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
}

/**
 * Displays a message asking the user to log in.
 * Assumes an element with id "login-required-layout" exists in the HTML.
 */
function displayLoginRequired() {
    console.log("Displaying login required layout.");
    document.getElementById('loading-layout').classList.add('hidden');

    const loginRequiredEl = document.getElementById('login-required-layout');
    if (loginRequiredEl) {
        loginRequiredEl.classList.remove('hidden');
    } else {
        console.error("#login-required-layout not found in HTML!");
        // Fallback: Display a basic message if the dedicated layout is missing
        document.body.innerHTML = `
            <div class="container mx-auto p-6 text-center">
                <div class="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-md">
                    <i class="fas fa-user-circle text-6xl text-gray-400 mb-4"></i>
                    <h2 class="text-2xl font-bold mb-4">Login Required</h2>
                    <p class="text-gray-700 mb-6">Please log in to view your booking details and payment result.</p>
                    <a href="/login" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                        Go to Login
                    </a>
                </div>
            </div>
        `;
    }

    // Hide other potential layouts
    document.getElementById('success-layout')?.classList.add('hidden');
    document.getElementById('failure-layout')?.classList.add('hidden');
    document.getElementById('pending-layout')?.classList.add('hidden');
    document.getElementById('already-submitted-layout')?.classList.add('hidden'); // Assuming this exists
    document.getElementById('payment-cancelled-layout')?.classList.add('hidden'); // Assuming this exists

}


/**
 * Processes the payment gateway response, determines the status, and updates the booking.
 * Requires a logged-in user.
 * @param {object} paymentData - The parsed response data from the payment gateway webhook/query.
 * @param {firebase.User} user - The currently authenticated user object.
 * @returns {Promise<{status: object, paymentInfo: object}>} The determined status and payment info.
 * @throws {Error} If no transactions are found or booking status update fails due to permissions etc.
 */
async function processPaymentResult(paymentData, user) {
  if (!user) {
      console.error("processPaymentResult called without authenticated user.");
      throw new Error("Authentication required to process payment result.");
  }
  console.log("Processing payment result for user:", user.uid);
  const transactions = paymentData.transactions || [];
  if (transactions.length === 0) {
    throw new Error('No transactions found in payment data');
  }

  // Assuming the latest transaction is the relevant one for final status
  const latestTransaction = transactions[0];
  const status = determinePaymentStatus(
    latestTransaction.transactionResponseCode,
    latestTransaction.status
  );
  console.log("Determined payment status:", status);


  // Extract relevant payment details
  const paymentInfo = {
    amount: paymentData.totalCapturedAmount, // Use captured amount if available
    currency: latestTransaction.currency || paymentData.currency || 'EGP',
    transactionId: paymentData.orderId, // Gateway's Order ID (our merchantOrderId)
    cardBrand: paymentData.sourceOfFunds?.cardInfo?.cardBrand || 'Card',
    maskedCard: paymentData.sourceOfFunds?.cardInfo?.maskedCard || '••••',
    responseCode: latestTransaction.transactionResponseCode, // Corrected property name
    responseMessage: latestTransaction.transactionResponseMessage?.en || latestTransaction.transactionResponseMessage || '' // Get English message or fallback
  };
  console.log("Extracted payment info:", paymentInfo);

  // Update the booking in Firebase
  // This call includes the permission check via checkBookingOwnership internally
  // It also requires the .write and .validate rules to pass
  const updateSuccess = await updateBookingStatus(BookingId, {
    ...status,
    ...paymentInfo // Include payment info in the update
  }, user); // Pass the authenticated user


  // updateBookingStatus throws if permission denied, so if we reach here, update was attempted/successful
  // We don't need an explicit check for !updateSuccess here.

  return { status, paymentInfo };
}

/**
 * The main function to initialize the payment result page.
 * Reads URL parameters, waits for auth state, fetches payment status, updates booking, and displays the result.
 * Only proceeds if a user is logged in.
 */
async function initializeApp() {
  console.log("App initializing...");
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId');

  if (!merchantOrderId) {
    displayFailure(null, 'Missing order ID in URL. Please restart the payment process.', null, null, false);
    return;
  }

  BookingId = merchantOrderId;
  document.getElementById('loading-layout').classList.remove('hidden'); // Show loading indicator

  try {
    // Wait for Firebase Auth state to settle. Resolves with null if not logged in.
    const user = await waitForAuthState();

    if (!user) {
      console.log("No user logged in. Displaying login required message.");
      // Hide loading and show login required message
      displayLoginRequired();
      return; // Stop execution if no user is available
    }

    console.log("User logged in with UID:", user.uid);
    // Fetch user role *now that we have a logged-in user*
    currentUserRole = await getUserRole(user.uid);
    console.log("User Role after fetching:", currentUserRole);


    // --- Proceed with your existing logic, NOW that a logged-in user and role are confirmed ---

    // Fetch payment status from the Netlify function proxy
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId: BookingId }) // Use the extracted BookingId
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP error fetching payment status:', response.status, errorText);
      throw new Error(`Could not retrieve payment status (HTTP ${response.status}).`);
    }

    const result = await response.json();
    if (result.status !== 'success' || !result.data?.response) {
      console.error('Payment status retrieval failed:', result.message, result.data);
      throw new Error(result.message || 'Failed to retrieve payment status details.');
    }

    // Process the retrieved payment result and update Firebase
    // This calls updateBookingStatus which includes the permission check.
    // It also requires the .write and .validate rules to pass.
    // The PERMISSION_DENIED on write was happening here previously due to the .validate rule failing.
    const { status, paymentInfo } = await processPaymentResult(result.data.response, user);

    // Fetch the potentially updated booking data again to ensure consistency for display
    // This read also needs permission.
    console.log(`Attempting final fetch of booking ${BookingId} for display for user ${user.uid}...`);
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val();

    if (!BookingData) {
        // This would happen if the final read fails (e.g., permission denied, or not found)
      console.error("Booking data not found in database after status update attempt, or final read denied for user:", user.uid);
      throw new Error('Booking details not found after processing. Please contact support.');
    }

    console.log("Booking Data fetched for display:", BookingData);
    console.log("Booking UID from DB:", BookingData.uid, "Booking Owner from DB:", BookingData.owner);


    // --- Handle different statuses based on the processed result ---
    switch (status.paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
         console.log("Handling SUCCESS status.");
         const successLayout = document.getElementById('success-layout');
         if (successLayout) {
             console.log("Showing #success-layout.");
             // Ensure all other layouts are hidden just in case
             document.getElementById('loading-layout')?.classList.add('hidden');
             document.getElementById('failure-layout')?.classList.add('hidden');
             document.getElementById('pending-layout')?.classList.add('hidden');
             document.getElementById('already-submitted-layout')?.classList.add('hidden');
             document.getElementById('payment-cancelled-layout')?.classList.add('hidden');
             document.getElementById('login-required-layout')?.classList.add('hidden');

             successLayout.classList.remove('hidden'); // <-- Show the success layout

             // Check if BookingData is available before populating
             if (!BookingData) {
                 console.error("BookingData is null before populateVoucherDisplay!");
                 showNotification("Error displaying voucher details.", true);
                 // Continue, but the voucher details section will be empty
             } else {
                // Populate the voucher details now that the layout is shown
                populateVoucherDisplay(BookingData); // <-- Call the function here
                launchConfetti(); // Launch confetti on success
             }


            // Handle email status and resend button visibility
            if (!BookingData?.voucherSent) { // Use optional chaining just in case BookingData is null
                // Check permission before attempting auto-send
                const canSendVoucher = await checkBookingOwnership(BookingId, user.uid);
                if (canSendVoucher) {
                  await sendVoucherEmail(user, 'email-status-message');
                } else {
                  console.warn("Payment successful but current user doesn't have explicit permission to auto-send email. Customer should receive automatically if payment gateway triggered email.");
                  document.getElementById('email-status-message').textContent = "Voucher email will be sent to the customer automatically.";
                }
            } else if (BookingData?.voucherSent) {
              document.getElementById('email-status-message')?.textContent = "Voucher email has already been sent.";
              // Check permission to SHOW the resend button
              const canResendVoucher = await checkBookingOwnership(BookingId, user.uid);
              if (canResendVoucher) {
                document.getElementById('resend-email-btn')?.classList.remove('hidden'); // Use optional chaining
              }
            }
         } else {
             console.error("#success-layout not found in the DOM! Cannot display success message.");
             // If the success layout itself is missing, display a generic error
             displayFailure(BookingId, "Payment succeeded, but an error occurred displaying the confirmation message. Please contact support.", null, null, false);
         }

        break;

      case PAYMENT_STATUS.PENDING:
         console.log("Handling PENDING status.");
         // Ensure other layouts are hidden
         document.getElementById('loading-layout')?.classList.add('hidden');
         document.getElementById('success-layout')?.classList.add('hidden');
         document.getElementById('failure-layout')?.classList.add('hidden');
         document.getElementById('already-submitted-layout')?.classList.add('hidden');
         document.getElementById('payment-cancelled-layout')?.classList.add('hidden');
         document.getElementById('login-required-layout')?.classList.add('hidden');


         document.getElementById('pending-layout')?.classList.remove('hidden'); // Use optional chaining
        const pendingMessageEl = document.getElementById('pending-message');
         if(pendingMessageEl) pendingMessageEl.textContent = status.userMessage;

         // Populate pending details if elements exist
        document.getElementById('pending-ref')?.textContent = BookingId || 'N/A';
        document.getElementById('pending-amount')?.textContent = `${paymentInfo.amount || '0'} ${paymentInfo.currency || 'EGP'}`;
        document.getElementById('pending-email')?.textContent = BookingData?.email || 'N/A';


        break;

      case PAYMENT_STATUS.CANCELLED:
         console.log("Handling CANCELLED status.");
         // Ensure other layouts are hidden
         document.getElementById('loading-layout')?.classList.add('hidden');
         document.getElementById('success-layout')?.classList.add('hidden');
         document.getElementById('failure-layout')?.classList.add('hidden');
         document.getElementById('pending-layout')?.classList.add('hidden');
         document.getElementById('already-submitted-layout')?.classList.add('hidden');
         document.getElementById('login-required-layout')?.classList.add('hidden');


         const cancelledLayout = document.getElementById('payment-cancelled-layout');
         if(cancelledLayout) cancelledLayout.classList.remove('hidden'); // Use optional chaining

         const cancelledRefInfoEl = document.getElementById('cancelled-ref-info');
         if(cancelledRefInfoEl && BookingId) cancelledRefInfoEl.textContent = `Booking Reference: ${BookingId}`;


         // Note: displayFailure is NOT used for cancelled status based on your HTML structure

        break; // Case CANCELLED handled here directly

      case PAYMENT_STATUS.FAILED:
         console.log("Handling FAILED status.");
         // Ensure other layouts are hidden
         document.getElementById('loading-layout')?.classList.add('hidden');
         document.getElementById('success-layout')?.classList.add('hidden');
         document.getElementById('pending-layout')?.classList.add('hidden');
         document.getElementById('already-submitted-layout')?.classList.add('hidden');
         document.getElementById('payment-cancelled-layout')?.classList.add('hidden');
         document.getElementById('login-required-layout')?.classList.add('hidden');

        displayFailure( // Use displayFailure for general failures
          BookingId,
          status.userMessage + (paymentInfo.responseMessage ? ` (${paymentInfo.responseMessage})` : ''),
          paymentInfo.amount,
          paymentInfo.currency,
          status.canRetry
        );
        break;

      default:
        console.error("Received unhandled payment status:", status.paymentStatus);
        displayFailure(
          BookingId, // Pass BookingId if available
          `An unexpected payment status occurred: ${status.paymentStatus}. Please contact support.`,
          paymentInfo.amount, // Use paymentInfo amount if available
          paymentInfo.currency, // Use paymentInfo currency if available
          false
        );
        break;
    }

  } catch (error) {
    console.error('Fatal error processing payment result:', error);
    // Display a generic failure message for any unhandled errors
    displayFailure(
      BookingId, // Pass BookingId if available
      `An error occurred: ${error.message}. Please contact support.`,
      null,
      null,
      false
    );
  } finally {
    // Ensure loading indicator is hidden in all cases unless replaced by another layout
    // Note: Layout display logic now handles hiding others, so this might be redundant but safe.
    // document.getElementById('loading-layout')?.classList.add('hidden');
    console.log("App initialization finished.");
  }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Initializing app.");
  initializeApp();

  // Set up button event listeners for actions available on the page
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);

  // Assuming there might be resend/print buttons on other status layouts too
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);

  // No specific logic needed for retry/home button click, default link behavior is fine.
});
