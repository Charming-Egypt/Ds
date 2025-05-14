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
let currentUserRole = null; // Store the current user's role

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
  // Use animate.css classes if available, otherwise basic fade
  const enterClass = typeof animateCSS === 'function' ? 'animate__fadeInUp' : 'fade-in';
  const exitClass = typeof animateCSS === 'function' ? 'animate__fadeOutDown' : 'fade-out';

  notification.className = `notification ${isError ? 'notification-error' : 'notification-success'} ${enterClass}`;
  notification.innerHTML = `<div class="flex items-start"><i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2 mt-1"></i><div>${message}</div></div>`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove(enterClass);
    notification.classList.add(exitClass);
    setTimeout(() => notification.remove(), 500); // Match animation duration
  }, 5000);
}

function launchConfetti() {
  // Ensure the confetti library is loaded
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
  }
}

/**
 * Fetches the user's role from the 'egy_user' node.
 * This aligns with the '.read': 'auth != null' rule on 'egy_user'.
 * @param {string} uid - The user's UID.
 * @returns {Promise<string>} The user's role ('admin', 'moderator', or 'user').
 */
async function getUserRole(uid) {
  try {
    // Attempt to read the user's role. Rules allow this if authenticated.
    const snapshot = await db.ref(`egy_user/${uid}/role`).once('value');
    // Default to 'user' if role is not found or null
    return snapshot.val() || 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    // If there's a permission error here, it suggests the auth state is not valid
    // or the root 'egy_user' read rule is somehow failing.
    if (error.code === 'PERMISSION_DENIED') {
        console.error('Permission denied when fetching user role. Check auth state and rules.');
    }
    return 'user'; // Default to basic user role on error
  }
}

/**
 * Checks if the current authenticated user has permission to access/modify a booking.
 * This logic mirrors the '.read' and '.write' rules on '$bookingId'.
 * @param {string} bookingId - The ID of the booking.
 * @param {string} userId - The UID of the authenticated user.
 * @returns {Promise<boolean>} True if the user has permission, false otherwise.
 */
async function checkBookingOwnership(bookingId, userId) {
  if (!userId) return false; // Must be authenticated

  try {
    // Attempt to read the specific booking.
    // Rules on '$bookingId' will determine if this is allowed.
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    const booking = snapshot.val();

    if (!booking) {
        console.warn(`Booking with ID ${bookingId} not found.`);
        return false; // Booking doesn't exist
    }

    // Check if user is admin (matches rule: root.child('egy_user').child(auth.uid).child('role').val() === 'admin')
    if (currentUserRole === 'admin') return true;

    // Check if user is the owner of the booking (matches rule: data.child('uid').val() === auth.uid)
    if (booking.uid === userId) return true;

    // Check if user is moderator and owner of the trip (matches rule: root.child('egy_user').child(auth.uid).child('role').val() === 'moderator' && data.child('owner').val() === auth.uid)
    if (currentUserRole === 'moderator' && booking.owner === userId) return true;

    // If none of the above, permission is denied by the rules
    console.warn(`Permission denied for user ${userId} on booking ${bookingId}. Role: ${currentUserRole}, Booking UID: ${booking.uid}, Booking Owner: ${booking.owner}`);
    return false;

  } catch (error) {
    console.error('Error checking booking ownership:', error);
     // If a permission denied error occurs here, it means the '$bookingId' read rule
     // prevented fetching the booking data itself.
    if (error.code === 'PERMISSION_DENIED') {
        showNotification('You do not have permission to view this booking.', true);
    } else {
        showNotification('An error occurred while checking permissions.', true);
    }
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

/**
 * Updates the booking status in Firebase.
 * This operation is subject to the '.write' rule on '$bookingId'.
 * @param {string} bookingId - The ID of the booking to update.
 * @param {object} statusData - The data to update (status, paymentStatus, etc.).
 * @param {object} user - The authenticated user object.
 * @returns {Promise<boolean>} True if update was successful, false otherwise.
 */
async function updateBookingStatus(bookingId, statusData, user) {
  const updates = {
    status: statusData.status,
    paymentStatus: statusData.paymentStatus,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    transactionResponseCode: statusData.responseCode,
    transactionResponseMessage: statusData.responseMessage
  };

  // Add audit info for admin/moderator if they are performing the update
  // Note: The rule also allows the user to update their own booking,
  // but we only add lastUpdatedBy for admin/moderator for tracking.
  if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
    updates.lastUpdatedBy = user?.uid || 'system';
  }

  try {
    // Attempt to update the booking. Rules on '$bookingId' will check write permissions.
    await db.ref(`trip-bookings/${bookingId}`).update(updates);
    console.log(`Booking ${bookingId} status updated successfully.`);
    return true;
  } catch (error) {
    console.error('Error updating booking status:', error);
    // Specific handling for permission errors during write
    if (error.code === 'PERMISSION_DENIED') {
        showNotification('Permission denied to update booking status.', true);
    }
    return false;
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
  document.getElementById('accommodation-type').textContent = data.hotelName || 'N/A'; // Assuming hotelName is used for accommodation
  document.getElementById('room-type').textContent = data.roomNumber || 'N/A'; // Assuming roomNumber is used for room type
  document.getElementById('adults-count').textContent = data.adults || '0';
  document.getElementById('children-count').textContent = data.children || data.childrenUnder12 || '0'; // Use children or childrenUnder12
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

  // Ensure voucher is populated with current data
  populateVoucherDisplay(BookingData);

  // Show the voucher temporarily for printing
  voucherEl.style.display = 'block';

  // Use PrintJS to print the voucher
  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      // Include the necessary CSS for printing
      style:`.voucher-container {
        /* display:none; /* Initially hidden for printJS and general layout control - PrintJS handles visibility */
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
        padding: 20px; /* Added padding for overall content */
      }

      .voucher-header {
        background: linear-gradient(135deg, #ffc107 0%, #426 100%); /* Adjusted gradient */
        color: white;
        padding: 2rem;
        text-align: center;
        position: relative;
        margin-bottom: 20px; /* Added margin */
      }

      .voucher-header::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(to right, #3b82f6, #10b981, #f59e0b);
      }

      voucher-title {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 0.5rem;
      }

      .voucher-subtitle {
        font-size: 1rem;
        opacity: 0.9;
      }

      .voucher-body {
        padding: 0 5px; /* Adjusted padding */
      }

      .detail-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive columns */
        gap: 1.5rem; /* Adjusted gap */
        margin-bottom: 2rem;
        padding: 0 1rem; /* Added padding */
      }

      .detail-card {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1.5rem; /* Adjusted padding */
        border: 1px solid #e5e7eb;
      }

      .detail-label {
        font-size: 0.875rem;
        color: #4b5563;
        font-weight: 600;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
      }

      .detail-label img {
        width:20px;
        height:20px;
        margin-right: 0.5rem;
      }

      .detail-value {
        font-size: 1rem;
        color: #111827;
        font-weight: 500;
        word-break: break-word;
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        padding: 0 1rem; /* Added padding */
      }

      .section-title img {
        width:20px;
        height:20px;
        margin-right: 0.5rem;
      }

      .voucher-footer {
        background: #f3f4f6;
        padding: 1.5rem;
        text-align: center;
        border-top: 1px dashed #d1d5db;
        margin-top: 20px; /* Added margin */
      }

      .company-name {
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.5rem;
      }

      .company-contact {
        font-size: 0.875rem;
        color: #4b5563;
      }

      .threcolmn{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Responsive columns */
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .confirmation-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: #10b981;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        z-index: 10;
      }
      /* Ensure voucher content is visible when printing */
      @media print {
          .voucher-container {
              display: block !important;
          }
      }
      `,
      scanStyles: false, // Prevent printJS from scanning document styles which might hide the voucher
      onPrintDialogClose: () => {
        // Hide the voucher again after the print dialog is closed
        voucherEl.style.display = 'none';
      },
      onError: (err) => {
        console.error('Print error:', err);
        voucherEl.style.display = 'none'; // Ensure it's hidden on error too
        showNotification("Could not print voucher.", true);
      }
    });
  } else {
    // Fallback for browsers that don't support printJS or if library isn't loaded
    window.print();
    // Since we can't detect print dialog close with window.print,
    // we might need a small timeout to hide it again, or rely on CSS @media print
    // The provided CSS includes @media print to handle this.
    voucherEl.style.display = 'none';
  }
}

/**
 * Sends the voucher email via a Netlify function.
 * Requires read permission on the booking data, checked by checkBookingOwnership.
 * @param {object} currentUser - The authenticated user object.
 * @param {string} [statusElementId=null] - ID of an element to update with status messages.
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise.
 */
async function sendVoucherEmail(currentUser, statusElementId = null) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  try {
    if (!BookingData || !BookingId) {
      showNotification('Booking data not available for sending email.', true);
      if (statusEl) statusEl.textContent = 'Email not sent: Booking data missing.';
      return false;
    }

    // Client-side permission check mirroring the rules
    const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
    if (!hasPermission) {
      // checkBookingOwnership already shows a notification if permission is denied
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

    // Call the Netlify function to send the email
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

      // Update booking with voucher sent info.
      // This update is subject to the '.write' rule on '$bookingId'.
      const updates = {
        voucherSent: true
      };

      // Only add lastUpdatedBy/At if admin/moderator is sending (matches audit logic)
      if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
        updates.lastUpdatedBy = currentUser.uid;
        updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
      }

      // Attempt the update. The rules will verify write permission here.
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

  // Client-side permission check before attempting resend
  const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
  if (!hasPermission) {
    // checkBookingOwnership already shows a notification if permission is denied
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let targetEmail = BookingData.email;

  if (!targetEmail || !emailRegex.test(targetEmail)) {
    const emailPrompt = prompt('Enter valid email to resend voucher:', BookingData.email || '');
    if (emailPrompt && emailRegex.test(emailPrompt)) {
      targetEmail = emailPrompt;
      // Update email in database if user has permission (admin/moderator or user's own booking)
      // This update is subject to the '.write' rule on '$bookingId'.
      const updates = { email: targetEmail };
      if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
        updates.lastUpdatedBy = currentUser.uid;
        updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
      }
      // Attempt the update. The rules will verify write permission here.
      try {
          await db.ref(`trip-bookings/${BookingId}`).update(updates);
          BookingData.email = targetEmail; // Update local data after successful write
          showNotification('Email address updated.', false); // Use false for success style
      } catch (error) {
          console.error('Error updating email address:', error);
           if (error.code === 'PERMISSION_DENIED') {
              showNotification('Permission denied to update email address.', true);
           } else {
              showNotification('Failed to update email address.', true);
           }
           return; // Stop if email update failed
      }
    } else if (emailPrompt !== null) {
      showNotification('Invalid email address entered.', true);
      return; // Stop if prompt was cancelled or invalid email entered
    } else {
        return; // Stop if prompt was cancelled
    }
  }

  let statusId = null;
  // Determine which status element to update based on visible layout
  if (document.getElementById('success-layout') && !document.getElementById('success-layout').classList.contains('hidden')) {
    statusId = 'email-status-message';
  } else if (document.getElementById('already-submitted-layout') && !document.getElementById('already-submitted-layout').classList.contains('hidden')) {
    statusId = 'submitted-email-status';
  }

  // Now call sendVoucherEmail with the potentially updated email
  const success = await sendVoucherEmail(currentUser, statusId);

  if (success && BookingId) {
    // Update voucherResentAt timestamp if email was successfully sent
    // This update is subject to the '.write' rule on '$bookingId'.
    const updates = {
      voucherResentAt: firebase.database.ServerValue.TIMESTAMP
    };

    // Only add lastUpdatedBy/At if admin/moderator is resending
    if (currentUserRole === 'admin' || currentUserRole === 'moderator') {
      updates.lastUpdatedBy = currentUser.uid;
      updates.lastUpdatedAt = firebase.database.ServerValue.TIMESTAMP;
    }

    // Attempt the update. The rules will verify write permission here.
    try {
        await db.ref(`trip-bookings/${BookingId}`).update(updates);
    } catch (error) {
        console.error('Error updating voucher resent timestamp:', error);
        // No need to notify user for this specific background update failure,
        // the email send success/failure is more important.
    }
  }
}


function displayFailure(merchantOrderId, customErrorMessage, amount, currency, canRetry = false) {
  document.getElementById('loading-layout').classList.add('hidden');
  document.getElementById('failure-layout').classList.remove('hidden');
  document.getElementById('error-message').textContent = customErrorMessage;
  if (merchantOrderId) document.getElementById('failed-ref').textContent = merchantOrderId;
  if (amount) document.getElementById('failed-amount').textContent = `${amount} ${currency || 'EGP'}`;
  const retryBtn = document.getElementById('retry-btn');
  let retryUrl = '#'; // Default fallback

  if (merchantOrderId) {
    // Retrieve the payment URL from local storage using the order ID
    const paymentUrl = localStorage.getItem(`paymentUrl_${merchantOrderId}`);
    if (paymentUrl) retryUrl = paymentUrl;
  }

  retryBtn.href = retryUrl;

  if (canRetry && retryUrl !== '#') { // Only show retry if it's possible and we have a URL
    document.getElementById('redirect-message').textContent = "You can try the payment again:";
    retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
    retryBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600', 'bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
  } else {
    document.getElementById('redirect-message').textContent = "Please try booking again from the start or contact support.";
    retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
     retryBtn.href = '/'; // Link to home page
    retryBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'bg-red-500', 'hover:bg-red-600');
    retryBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
}


/**
 * Processes the payment gateway result and updates the booking in Firebase.
 * This involves reading booking data (subject to $bookingId read rule)
 * and writing status updates (subject to $bookingId write rule).
 * @param {object} paymentData - The payment response data from the gateway webhook.
 * @param {object} user - The authenticated user object.
 * @returns {Promise<{status: object, paymentInfo: object}>} The processed status and payment info.
 * @throws {Error} If processing or updating fails.
 */
async function processPaymentResult(paymentData, user) {
  const transactions = paymentData.transactions || [];
  if (transactions.length === 0) {
    throw new Error('No transactions found in payment response.');
  }

  const latestTransaction = transactions[0];
  const status = determinePaymentStatus(
    latestTransaction.transactionResponseCode,
    latestTransaction.status
  );

  const paymentInfo = {
    amount: paymentData.totalCapturedAmount,
    currency: latestTransaction.currency || 'EGP',
    transactionId: paymentData.orderId, // This is the merchantOrderId from the gateway
    cardBrand: paymentData.sourceOfFunds?.cardInfo?.cardBrand || 'Card',
    maskedCard: paymentData.sourceOfFunds?.cardInfo?.maskedCard || '••••',
    responseCode: latestTransaction.transactionResponseCode,
    responseMessage: latestTransaction.transactionResponseMessage?.en || '' // Assuming English message
  };

  // Update booking status in Firebase.
  // This call is subject to the '.write' rule on '$bookingId'.
  const updateSuccess = await updateBookingStatus(BookingId, {
    ...status,
    ...paymentInfo
  }, user);

  if (!updateSuccess) {
    // updateBookingStatus already handles permission denied notification
    throw new Error('Failed to update booking status in database.');
  }

  return { status, paymentInfo };
}

/**
 * Initializes the payment result page.
 * Fetches payment status, updates booking, and displays result.
 * Involves reading booking data (subject to $bookingId read rule)
 * and potentially updating it (subject to $bookingId write rule).
 */
async function initializeApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId'); // This is the BookingId

  if (!merchantOrderId) {
    displayFailure(null, 'Missing order ID in URL. Please restart the payment process.');
    return;
  }

  BookingId = merchantOrderId;
  document.getElementById('loading-layout').classList.remove('hidden');

  try {
    // Authenticate user (anonymously if not logged in).
    // This is necessary to get an auth.uid for rule evaluation.
    await auth.signInAnonymously().catch(error => {
        console.warn('Anonymous sign-in failed, proceeding without authenticated user role:', error);
        // Continue execution, but currentUser will be null or anonymous
    });
    const user = auth.currentUser;

    // Fetch user role if authenticated (non-anonymous).
    // This read is subject to the '.read': 'auth != null' rule on 'egy_user'.
    if (user && !user.isAnonymous) {
      currentUserRole = await getUserRole(user.uid);
      console.log(`User ${user.uid} authenticated with role: ${currentUserRole}`);
    } else {
        console.log('User is anonymous or not authenticated. Role defaulted to "user".');
        currentUserRole = 'user'; // Default role for anonymous/unauthenticated
    }


    // Fetch payment status from the backend (Netlify function)
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId })
    });

    if (!response.ok) {
      const errorBody = await response.text(); // Read as text for better error info
      throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
       // Handle cases where webhook function returns error status but not HTTP error
       const errorMessage = result.message || 'Failed to retrieve payment status from backend.';
       console.error('Backend reported non-success status:', errorMessage, result);
       // If backend provides payment gateway response details even on non-success,
       // we might still be able to process them to get a status like CANCELLED.
       if (result.data?.response) {
           console.log('Attempting to process backend non-success response data...');
           const { status, paymentInfo } = await processPaymentResult(result.data.response, user);
            // If processing successful, display based on determined status
            handleDisplayBasedOnStatus(status, paymentInfo, user);
            return; // Exit after handling
       } else {
           // If no payment response data, just display generic failure
           throw new Error(errorMessage); // Throw to be caught by the main catch block
       }
    }

    // Process payment result and update Firebase booking
    // This involves reads and writes subject to '$bookingId' rules.
    const { status, paymentInfo } = await processPaymentResult(result.data.response, user);

    // Get the updated booking data from Firebase after processing payment result.
    // This read is subject to the '.read' rule on '$bookingId'.
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val();

    if (!BookingData) {
      // This is a critical error - booking should exist if payment was processed
      throw new Error(`Booking data not found in database for ID: ${BookingId}`);
    }

    // Handle displaying the appropriate layout based on the final status
    handleDisplayBasedOnStatus(status, paymentInfo, user);


  } catch (error) {
    console.error('Fatal error during payment processing:', error);
    // Display a generic failure message for unexpected errors
    displayFailure(
      BookingId,
      `An unexpected error occurred: ${error.message}`,
      null, // Amount might not be available on fatal error
      null, // Currency might not be available
      false // Cannot retry on unexpected errors
    );
  } finally {
    // Ensure loading layout is always hidden when processing is complete
    document.getElementById('loading-layout').classList.add('hidden');
  }
}

/**
 * Handles displaying the correct UI layout based on the determined payment status.
 * @param {object} status - The determined payment status object.
 * @param {object} paymentInfo - The payment information object.
 * @param {object} user - The authenticated user object.
 */
async function handleDisplayBasedOnStatus(status, paymentInfo, user) {
     switch (status.paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        populateVoucherDisplay(BookingData); // Use the fetched BookingData
        document.getElementById('success-layout').classList.remove('hidden');
        launchConfetti();

        // Attempt to send voucher email if not already sent and user has permission
        if (!BookingData.voucherSent && user) {
           // checkBookingOwnership is called inside sendVoucherEmail
           // Pass the correct status element ID
           await sendVoucherEmail(user, 'email-status-message');
        } else if (BookingData.voucherSent) {
            // Update status message if voucher was already sent
            const statusEl = document.getElementById('email-status-message');
            if (statusEl) statusEl.textContent = 'Voucher already sent to your email.';
        }
        break;

      case PAYMENT_STATUS.PENDING:
        document.getElementById('pending-layout').classList.remove('hidden');
        document.getElementById('pending-message').textContent = status.userMessage;
        // Potentially populate some booking details on pending page if needed
        break;

      case PAYMENT_STATUS.CANCELLED:
        displayFailure(
          BookingId,
          status.userMessage,
          paymentInfo.amount,
          paymentInfo.currency,
          false // Cancelled payments are typically not retryable directly
        );
        break;

      case PAYMENT_STATUS.FAILED:
        displayFailure(
          BookingId,
          status.userMessage,
          paymentInfo.amount,
          paymentInfo.currency,
          status.canRetry // Pass the canRetry flag from determinePaymentStatus
        );
        break;

      default:
         // Handle unexpected statuses
         displayFailure(
            BookingId,
            `Unknown payment status: ${status.paymentStatus}`,
            paymentInfo.amount,
            paymentInfo.currency,
            false
         );
         break;
    }
}


// Event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();

  // Set up button event listeners
  // Use optional chaining (?) for robustness in case elements don't exist
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);
});

// Simple CSS for notifications (if not using animate.css)
const style = document.createElement('style');
style.innerHTML = `
.notification {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 250px;
    max-width: 90%;
    text-align: left;
}
.notification-success {
    background-color: #10b981; /* Green */
}
.notification-error {
    background-color: #ef4444; /* Red */
}

/* Basic fade animations if animate.css is not used */
.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
}
.fade-out {
    animation: fadeOut 0.5s ease-in forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes fadeOut {
    from { opacity: 1; transform: translate(-50%, 0); }
    to { opacity: 0; transform: translate(-50%, 20px); }
}

/* Ensure voucher content is hidden by default unless PrintJS or @media print makes it visible */
#voucher-content {
    display: none;
}
`;
document.head.appendChild(style);
