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
  // Check if confetti library is available globally
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
  } else {
    console.warn('Confetti library not loaded.');
  }
}

async function getUserRole(uid) {
  try {
    // Rules: .read = auth != null at /egy_user root - this is allowed
    const snapshot = await db.ref(`egy_user/${uid}/role`).once('value');
    return snapshot.val() || 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    // Fallback to 'user' role in case of error (e.g., permission denied if rules change)
    return 'user';
  }
}

async function checkBookingOwnership(bookingId, userId) {
  try {
    // Rules: .read allowed at /trip-bookings/$bookingId if admin, data.uid === auth.uid, or (moderator && data.owner === auth.uid)
    const snapshot = await db.ref(`trip-bookings/${bookingId}`).once('value');
    const booking = snapshot.val();

    if (!booking) {
      console.warn(`Booking ${bookingId} not found or permission denied.`);
      return false; // Could be not found OR denied by rules
    }

    // Check if user is admin
    if (currentUserRole === 'admin') return true;

    // Check if user is owner of the booking (based on 'uid' field)
    if (booking.uid === userId) return true;

    // Check if user is moderator and owner of the trip (based on 'owner' field)
    if (currentUserRole === 'moderator' && booking.owner === userId) return true;

    return false;
  } catch (error) {
    console.error('Error checking booking ownership/fetching booking:', error);
    // If the read operation itself failed due to rules, the snapshot.val() would be null,
    // and the !booking check handles it. This catch is for other potential errors.
    return false;
  }
}

// Payment status handler
function determinePaymentStatus(responseCode, transactionStatus) {
  // Normalize input
  responseCode = String(responseCode || '').toUpperCase().trim();
  transactionStatus = String(transactionStatus || '').toUpperCase().trim();

  // Success codes
  const successCodes = ['00', '10', '11', '16', 'APPROVED', 'SUCCESS'];

  // Cancellation codes
  const cancelledCodes = ['17', 'CANCELLED', 'CANCELED'];

  // Pending codes
  const pendingCodes = ['09', 'PENDING', 'PROCESSING'];

  // Retryable failure codes
  const retryableCodes = [
    '01', '02', '05', '12', '42', '62', '63', '68', '91', '96',
    'TEMPORARY_FAILURE', 'BANK_ERROR', 'DECLINED' // Added 'DECLINED' as it's often retryable
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
      userMessage: 'Payment cancelled by user or system' // More specific message
    };
  }

  if (pendingCodes.includes(responseCode) || pendingCodes.includes(transactionStatus)) {
    return {
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: TRANSACTION_STATUS.PENDING,
      userMessage: 'Payment is currently processing. Please check back later.' // More specific message
    };
  }

  // Default to failed status for all other codes
  return {
    paymentStatus: PAYMENT_STATUS.FAILED,
    status: TRANSACTION_STATUS.FAILED,
    userMessage: 'Payment failed. Please check your details or try another method.', // General failure message
    canRetry: retryableCodes.includes(responseCode) // Determine if retry is possible
  };
}

async function updateBookingStatus(bookingId, statusData, user) {
  const updates = {
    status: statusData.status, // e.g., 'paid', 'failed'
    paymentStatus: statusData.paymentStatus, // e.g., 'paid', 'failed', 'pending', 'cancelled'
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    transactionResponseCode: statusData.responseCode || null, // Store original gateway code
    transactionResponseMessage: statusData.responseMessage || null // Store original gateway message
  };

  // Add payment specific info if available
  if (statusData.amount) updates.amountPaid = statusData.amount;
  if (statusData.currency) updates.currency = statusData.currency;
  if (statusData.transactionId) updates.transactionId = statusData.transactionId;
  if (statusData.cardBrand) updates.cardBrand = statusData.cardBrand;
  if (statusData.maskedCard) updates.maskedCard = statusData.maskedCard;
  // Add payment date if successful/processed
  if (statusData.paymentStatus === PAYMENT_STATUS.SUCCESS || statusData.paymentStatus === PAYMENT_STATUS.PENDING) {
     updates.paymentDate = firebase.database.ServerValue.TIMESTAMP;
  }

  // Add audit info for admin/moderator/logged-in user making the update
  if (user) { // Check if a user object is provided (authenticated user)
     const userRole = await getUserRole(user.uid); // Re-fetch role for safety/accuracy
     if (userRole === 'admin' || userRole === 'moderator') {
       updates.lastUpdatedBy = user.uid;
     } else {
       // For regular users (including anonymous who might update their own booking)
       updates.lastUpdatedBy = user.uid;
     }
  } else {
    // Fallback if no user object is passed (e.g., system process triggered)
    updates.lastUpdatedBy = 'system';
  }


  try {
    // Rules: .write allowed at /trip-bookings/$bookingId if admin, data.uid === auth.uid, or (moderator && data.owner === auth.uid)
    // This update will be allowed if the currently authenticated user (user object passed to function)
    // satisfies one of these conditions based on the existing booking data.
    await db.ref(`trip-bookings/${bookingId}`).update(updates);
    console.log(`Booking ${bookingId} status updated successfully.`);
    return true;
  } catch (error) {
    console.error(`Error updating booking ${bookingId} status:`, error);
     // Check if it's a permission denied error
     if (error.code === 'PERMISSION_DENIED') {
         console.error('Firebase Permission Denied: User does not have write access to this booking.');
         showNotification('Permission denied to update booking status.', true);
     }
    return false;
  }
}

function populateVoucherDisplay(data) {
  if (!data) {
    console.warn("No booking data available to populate voucher.");
    return;
  }
  // Ensure all relevant fields are populated, use defaults if missing
  document.getElementById('voucher-ref').textContent = BookingId || data.bookingId || 'N/A';
  document.getElementById('voucher-transaction').textContent = data.transactionId || 'N/A';
  document.getElementById('voucher-amount').textContent = `${data.amountPaid || data.totalPrice || '0'} ${data.currency || 'EGP'}`; // Use amountPaid if available, fallback to totalPrice
  document.getElementById('voucher-card').textContent = `${data.cardBrand || 'Card'} ${data.maskedCard ? 'ending in ' + data.maskedCard.slice(-4) : '••••'}`;
  document.getElementById('customer-name2').textContent = data.username || data.name || 'Valued Customer';
  document.getElementById('customer-email2').textContent = data.email || 'N/A';
  document.getElementById('tour-name').textContent = data.tourName || data.tour || 'N/A';
  document.getElementById('accommodation-type').textContent = data.hotelName || 'N/A';
  document.getElementById('room-type').textContent = data.roomNumber || 'N/A'; // Check correct field for room details
  document.getElementById('adults-count').textContent = data.adults || '0';
  document.getElementById('children-count').textContent = data.children || data.childrenUnder12 || '0'; // Use children or childrenUnder12
  document.getElementById('infants-count').textContent = data.infants || '0';
  const bookingCreationDate = data.paymentDate ? new Date(data.paymentDate) : (data.createdAt ? new Date(data.createdAt) : new Date()); // Use paymentDate if available
  document.getElementById('booking-date').textContent = formatDate(bookingCreationDate);
  document.getElementById('trip-date').textContent = formatDate(data.tripDate);
  // You might want to add other fields like meeting point, inclusions, exclusions, notes etc.
}

function handlePrintVoucher() {
  const voucherEl = document.getElementById('voucher-content');
  if (!voucherEl || !BookingData) {
    showNotification("Booking details not loaded. Cannot print voucher.", true);
    return;
  }

  // Ensure voucher is populated with latest data before printing
  populateVoucherDisplay(BookingData);

  // Show the voucher temporarily for printing (PrintJS usually handles visibility, but good fallback)
   if (voucherEl.classList.contains('hidden')) {
       voucherEl.classList.remove('hidden');
       voucherEl.style.display = 'block'; // Ensure it's block display for printing
   }


  // Use PrintJS to print the voucher
  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
       // Use the provided CSS style string directly
      style:`.voucher-container {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
        padding: 0 !important; /* Ensure no external padding interferes */
      }

      .voucher-header {
        background: linear-gradient(135deg, #ffc107 0%, #426 100%); /* Check if #426 is intended hex or typo, e.g. #8a2be2 */
        color: white;
        padding: 2rem;
        text-align: center;
        position: relative;
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

      voucher-body {
         padding: 1rem; /* Added padding */
      }

      .detail-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive columns */
        gap: 1.5rem; /* Increased gap */
        margin-bottom: 2rem;
        padding: 0 1rem;
      }

      .detail-card {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1.25rem; /* Increased padding */
        border: 1px solid #e5e7eb;
      }

      .detail-label {
        font-size: 0.9rem; /* Slightly larger font */
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
        filter: grayscale(100%); /* Optional: make icons grayscale for print */
      }

      .detail-value {
        font-size: 1.05rem; /* Slightly larger font */
        color: #111827;
        font-weight: 500;
        word-break: break-word;
      }

      .section-title {
        font-size: 1.35rem; /* Slightly larger */
        font-weight: 600;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        padding: 0 1rem;
        border-bottom: 2px solid #eee; /* Added separator */
        padding-bottom: 0.5rem;
      }

       .section-title img {
        width:24px; /* Slightly larger icon */
        height:24px;
        margin-right: 0.75rem; /* More space */
         filter: grayscale(100%); /* Optional: make icons grayscale for print */
      }

      .voucher-footer {
        background: #f3f4f6;
        padding: 1.5rem;
        text-align: center;
        border-top: 1px dashed #d1d5db;
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

      .threcolmn{ /* Rename to something more descriptive if used generally */
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1.5rem; /* Increased gap */
        margin-bottom: 1.5rem; /* Adjusted margin */
         padding: 0 1rem; /* Added padding */
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
       /* Ensure PrintJS doesn't add extra padding */
       @page { margin: 0.5in !important; }
      `,
      scanStyles: false, // Set to false if you manually provide all styles
      onPrintDialogClose: () => {
        // Hide the voucher element again after printing
         if (!voucherEl.classList.contains('hidden')) {
              voucherEl.classList.add('hidden');
               voucherEl.style.display = ''; // Reset display style
         }
      },
      onError: (err) => {
        console.error('Print error:', err);
         if (!voucherEl.classList.contains('hidden')) {
              voucherEl.classList.add('hidden');
               voucherEl.style.display = ''; // Reset display style
         }
        showNotification("Could not print voucher.", true);
      }
    });
  } else {
    // Fallback to browser's print function if PrintJS is not available
    console.warn('PrintJS not loaded. Using browser default print.');
    window.print();
     // Need to manually hide element after print dialog close
      setTimeout(() => {
         if (!voucherEl.classList.contains('hidden')) {
              voucherEl.classList.add('hidden');
               voucherEl.style.display = '';
         }
      }, 100); // Small delay might be needed
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

    // Client-side permission check (server rules will re-check)
    const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
    if (!hasPermission) {
      showNotification('You do not have permission to send this voucher.', true);
      if (statusEl) statusEl.textContent = 'Permission denied for sending voucher.';
      console.warn(`User ${currentUser.uid} attempted to send voucher for booking ${BookingId} without permission.`);
      return false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!BookingData.email || !emailRegex.test(BookingData.email)) {
      if (statusEl) statusEl.textContent = 'Voucher email could not be sent (invalid email). Please update and resend.';
      showNotification('Invalid recipient email address for voucher. Please update and resend.', true);
      console.error('Invalid email address for booking:', BookingId, BookingData.email);
      return false;
    }

    if (statusEl) statusEl.textContent = 'Sending your voucher...';
    showNotification('Sending your voucher...');

    // Call Netlify function to send email
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/send-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingData: BookingData,
        bookingId: BookingId,
        toEmail: BookingData.email,
        toName: BookingData.username || BookingData.name || 'Valued Customer' // Use username or name
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
       console.error('Netlify function failed:', errorData);
      throw new Error(errorData.message || `Failed to send email (HTTP ${response.status})`);
    }

    const result = await response.json();
    if (result.success) {
      showNotification('Voucher sent successfully!');
      if (statusEl) statusEl.textContent = 'Voucher sent to your email!';

      // Update booking with voucher sent info (requires write permission by rules)
      const updates = {
        voucherSent: true,
        voucherSentAt: firebase.database.ServerValue.TIMESTAMP // Add timestamp
      };

      // Add audit info if user is admin/moderator/logged-in (matches write rule conditions)
      // The updateBookingStatus function already handles adding lastUpdatedBy based on user/role
      await updateBookingStatus(BookingId, updates, currentUser); // Use updateBookingStatus to apply audit fields
      console.log(`Booking ${BookingId} marked as voucher sent.`);
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

async function resendVoucherEmailHandler() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    showNotification('Please log in to resend the voucher.', true);
    console.warn('Attempted to resend voucher without being logged in.');
    return;
  }

  if (!BookingData || !BookingId) {
    showNotification('Booking details not loaded. Cannot resend email.', true);
    console.warn('Attempted to resend voucher, but BookingData or BookingId is missing.');
    return;
  }

  // Client-side check before proceeding (server rules re-check on update)
  const hasPermission = await checkBookingOwnership(BookingId, currentUser.uid);
  if (!hasPermission) {
    showNotification('You do not have permission to resend this voucher.', true);
     console.warn(`User ${currentUser.uid} attempted to resend voucher for booking ${BookingId} without permission.`);
    return;
  }

  // Check/Prompt for email if invalid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let currentEmail = BookingData.email;

  if (!currentEmail || !emailRegex.test(currentEmail)) {
    const emailPrompt = prompt('Invalid email address found. Enter valid email to resend voucher:', currentEmail || '');
    if (emailPrompt && emailRegex.test(emailPrompt)) {
      currentEmail = emailPrompt;
      // Update email in database if user has permission
      // Rules: .write allowed if admin, data.uid === auth.uid, or (moderator && data.owner === auth.uid)
      // The user prompting has already passed checkBookingOwnership, so they should have write permission.
      const updates = { email: currentEmail };
      // updateBookingStatus function already handles adding audit info based on user/role
      const updateEmailSuccess = await updateBookingStatus(BookingId, updates, currentUser);

      if (updateEmailSuccess) {
         BookingData.email = currentEmail; // Update local data
         showNotification('Email address updated.', false); // Not an error notification
         console.log(`Email address for booking ${BookingId} updated to ${currentEmail}`);
      } else {
         // updateBookingStatus shows notification on error
         return; // Stop if email update failed
      }

    } else if (emailPrompt !== null) { // User entered something but it was invalid
      showNotification('Invalid email address entered.', true);
       console.warn('Invalid email entered in resend prompt.');
      return;
    } else { // User cancelled the prompt
      showNotification('Email update cancelled.', false); // Not an error
       console.log('Resend email prompt cancelled by user.');
      return; // Stop the process
    }
  } else {
      // Valid email exists, just use it
      console.log(`Existing email ${currentEmail} is valid, proceeding with resend.`);
  }


  // Find the correct element to display status message
  let statusId = null;
  if (document.getElementById('success-layout') && !document.getElementById('success-layout').classList.contains('hidden')) {
    statusId = 'email-status-message'; // Element on success layout
  } else if (document.getElementById('already-submitted-layout') && !document.getElementById('already-submitted-layout').classList.contains('hidden')) {
    statusId = 'submitted-email-status'; // Element on already submitted/pending layout
  }

  // Now attempt to send the email using the confirmed valid email
  const success = await sendVoucherEmail(currentUser, statusId);

  // Update voucherResentAt timestamp if email sending was successfully initiated (even if Netlify function fails later, the call succeeded)
  // Only do this if sendVoucherEmail returned true (meaning the fetch call was successful)
  if (success && BookingId) {
     try {
        const updates = {
          voucherResentAt: firebase.database.ServerValue.TIMESTAMP // Timestamp when resend was triggered
        };
         // updateBookingStatus function already handles adding audit info based on user/role
         await updateBookingStatus(BookingId, updates, currentUser);
         console.log(`Booking ${BookingId} marked as voucher resent.`);
     } catch (error) {
         console.error(`Error marking booking ${BookingId} as resent:`, error);
         // updateBookingStatus shows notification if it fails due to permission or other issues
     }
  }
}


function displayFailure(merchantOrderId, customErrorMessage, amount, currency, canRetry = false) {
  document.getElementById('loading-layout')?.classList.add('hidden'); // Use optional chaining
  document.getElementById('failure-layout')?.classList.remove('hidden'); // Use optional chaining

  // Ensure elements exist before trying to set textContent
  const errorMessageEl = document.getElementById('error-message');
  if (errorMessageEl) errorMessageEl.textContent = customErrorMessage || 'An unexpected error occurred.';

  const failedRefEl = document.getElementById('failed-ref');
  if (failedRefEl) failedRefEl.textContent = merchantOrderId || 'N/A';

  const failedAmountEl = document.getElementById('failed-amount');
  if (failedAmountEl) failedAmountEl.textContent = `${amount || '0'} ${currency || 'EGP'}`;

  const retryBtn = document.getElementById('retry-btn');
  const redirectMessageEl = document.getElementById('redirect-message');

  if (retryBtn) {
      let retryUrl = '#'; // Default to '#' if no URL found

      // Find the payment URL from local storage
      if (merchantOrderId) {
          const paymentUrl = localStorage.getItem(`paymentUrl_${merchantOrderId}`);
          if (paymentUrl) {
              retryUrl = paymentUrl;
              console.log(`Found retry URL for ${merchantOrderId}: ${retryUrl}`);
          } else {
              console.warn(`No retry URL found in local storage for ${merchantOrderId}.`);
          }
      }

      retryBtn.href = retryUrl; // Set the href

      // Adjust button appearance and message based on retry capability
      if (canRetry && retryUrl !== '#') { // Only allow retry if URL exists
        retryBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Try Again';
        retryBtn.classList.remove('bg-blue-500', 'bg-red-500', 'hover:bg-blue-600', 'hover:bg-red-600');
        retryBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
        if (redirectMessageEl) redirectMessageEl.textContent = "You can try your payment again.";

      } else {
        // Default to 'Return Home' if not retryable or no retry URL found
        if (redirectMessageEl) redirectMessageEl.textContent = "Please try booking again from the start or contact support.";
        retryBtn.innerHTML = '<i class="fas fa-home mr-2"></i>Return Home';
        retryBtn.href = '/'; // Link back to the home page
         retryBtn.classList.remove('bg-blue-500', 'bg-orange-500', 'hover:bg-blue-600', 'hover:bg-orange-600');
        retryBtn.classList.add('bg-red-500', 'hover:bg-red-600'); // Use red for final failure
      }
  } else {
      console.error("Retry button element not found.");
  }
}


async function processPaymentResult(paymentData, user) {
  // paymentData is expected to be the response from the Netlify payment-webhook function
  const transactions = paymentData.transactions || [];
  if (transactions.length === 0) {
    console.error('No transactions found in payment response.');
    throw new Error('No transaction data available in the payment result.');
  }

  // Get the latest transaction details
  const latestTransaction = transactions[0]; // Assuming the latest/relevant one is first
  const responseCode = latestTransaction.transactionResponseCode;
  const transactionStatus = latestTransaction.status;
  const responseMessage = latestTransaction.transactionResponseMessage?.en || latestTransaction.transactionResponseMessage || ''; // Get English message or fallback

  // Determine the internal status based on gateway response
  const status = determinePaymentStatus(
    responseCode,
    transactionStatus
  );

  const paymentInfo = {
    amount: paymentData.totalCapturedAmount || latestTransaction.amount || 0, // Use captured amount or transaction amount
    currency: paymentData.currency || latestTransaction.currency || 'EGP',
    transactionId: paymentData.orderId || latestTransaction.transactionId || 'N/A', // Use orderId or transactionId
    cardBrand: paymentData.sourceOfFunds?.cardInfo?.cardBrand || latestTransaction.sourceOfFunds?.cardInfo?.cardBrand || 'Card',
    maskedCard: paymentData.sourceOfFunds?.cardInfo?.maskedCard || latestTransaction.sourceOfFunds?.cardInfo?.maskedCard || '••••',
    responseCode: responseCode,
    responseMessage: responseMessage
  };

  console.log(`Processing payment result for booking ${BookingId}. Gateway Status: ${transactionStatus}, Response Code: ${responseCode}. Determined App Status: ${status.paymentStatus}`);


  // Update booking status in Firebase
  // This requires write permission according to the rules.
  // The user object passed here is the currently authenticated user (could be anonymous).
  // The updateBookingStatus function checks rules based on this user.
  const updateSuccess = await updateBookingStatus(BookingId, {
    ...status, // Includes paymentStatus, status, userMessage, canRetry
    ...paymentInfo // Includes amount, currency, transactionId, cardBrand, maskedCard, responseCode, responseMessage
  }, user); // Pass the user object

  if (!updateSuccess) {
    // The updateBookingStatus function already shows an error notification if it fails
    // due to permission or other issues.
    throw new Error('Failed to update booking status in database.');
  }

  console.log(`Booking ${BookingId} database entry updated.`);
  return { status, paymentInfo };
}

async function initializeApp() {
  // Get the merchantOrderId from the URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const merchantOrderId = urlParams.get('merchantOrderId');

  if (!merchantOrderId) {
    console.error('Missing merchantOrderId in URL.');
    displayFailure(null, 'Missing order ID in the payment result link. Please restart the booking process.', null, null, false);
    return;
  }

  BookingId = merchantOrderId; // Store the booking ID globally
  console.log(`Initializing for booking ID: ${BookingId}`);
  document.getElementById('loading-layout')?.classList.remove('hidden'); // Show loading indicator

  try {
    // Authenticate user - try anonymous first, then check if already logged in
    // This allows both anonymous and logged-in users to process their payment results
    // The rules check against auth.uid and auth.uid + role
    await auth.signInAnonymously().catch(async (error) => {
        console.warn('Anonymous sign-in failed, checking if already logged in.', error);
        // If anonymous sign-in fails, it might be because the user is already signed in non-anonymously.
        // We don't need to do anything explicit here, auth.currentUser will reflect the signed-in state.
        // If auth.currentUser is null after this, then authentication failed completely.
    });

    const user = auth.currentUser;
    if (!user) {
         console.error('Firebase authentication failed. Cannot proceed.');
         displayFailure(BookingId, 'Authentication failed. Please try again or contact support.', null, null, false);
         return; // Stop initialization if authentication fails
    }

    // Get user role if authenticated (important for permission checks)
    // Rules: allowed by /egy_user .read rule
    if (!user.isAnonymous) {
       currentUserRole = await getUserRole(user.uid);
       console.log(`User ${user.uid} is logged in, role: ${currentUserRole}`);
    } else {
       currentUserRole = 'user'; // Assume 'user' role for anonymous users
        console.log(`User ${user.uid} is anonymous, role: ${currentUserRole}`);
    }


    // Fetch payment status from your Netlify function (backend)
    // This function should talk to the payment gateway securely.
    const response = await fetch('https://api-discover-sharm.netlify.app/.netlify/functions/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantOrderId: BookingId }) // Send the booking ID to the backend
    });

    if (!response.ok) {
       const errorText = await response.text().catch(() => 'Unknown error');
       console.error(`Netlify webhook HTTP error! status: ${response.status}, response: ${errorText}`);
      throw new Error(`Failed to retrieve payment status from backend (HTTP error: ${response.status}).`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
       console.error('Netlify webhook returned non-success status:', result);
      throw new Error(result.message || 'Failed to retrieve payment status from the payment gateway.');
    }

    // Process the payment result and update Firebase
    // This step updates the booking based on the gateway response.
    // The rules will validate if the current user has permission to perform this update.
    const { status, paymentInfo } = await processPaymentResult(result.data.response, user); // Pass the user object

    // Fetch the latest booking data from Firebase after status update
    // This read operation requires permission according to the $bookingId .read rule.
    // This will succeed if the currently authenticated user is admin, or if their UID matches the booking's uid,
    // or if they are a moderator and their UID matches the booking's owner.
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val(); // Store fetched data globally

    if (!BookingData) {
      console.error(`Booking data not found in Firebase for ID ${BookingId} after update.`);
      // Even if payment succeeded, we can't show voucher if data is missing/inaccessible.
      displayFailure(BookingId, 'Booking details not found after processing payment. Please contact support.', paymentInfo.amount, paymentInfo.currency, false);
      return; // Stop if booking data isn't accessible
    }
     console.log(`Booking data fetched successfully for ${BookingId}. Status: ${BookingData.status}`);


    // Handle different statuses and display appropriate UI
    switch (status.paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        populateVoucherDisplay(BookingData); // Populate voucher UI
        document.getElementById('success-layout')?.classList.remove('hidden'); // Show success UI
        launchConfetti(); // Celebrate!

        // Attempt to send voucher email automatically if not already sent
        // This check requires read permission for the booking.
        // The sendVoucherEmail function itself re-checks write permission before updating.
        if (!BookingData.voucherSent) {
           console.log('Attempting to send voucher email automatically...');
           // sendVoucherEmail checks checkBookingOwnership internally before sending/updating
           await sendVoucherEmail(user, 'email-status-message'); // Pass user and status element ID
        } else {
            console.log('Voucher already marked as sent for this booking.');
             // Maybe show a message indicating it was already sent?
             const emailStatusEl = document.getElementById('email-status-message');
             if(emailStatusEl) emailStatusEl.textContent = `Voucher previously sent to ${BookingData.email || 'email on file'}.`;

              // If voucher was already sent, but we reached this page again (e.g., user refreshed)
              // and the status is PAID, maybe show the "already submitted" layout instead?
              // Or just keep the success layout and indicate email was sent.
              // The current logic keeps the success layout.
        }
        break;

      case PAYMENT_STATUS.PENDING:
        document.getElementById('pending-layout')?.classList.remove('hidden'); // Show pending UI
        document.getElementById('pending-message').textContent = status.userMessage;
         // Populate some details for pending state if needed
         document.getElementById('pending-ref')?.textContent = BookingId || 'N/A';
         document.getElementById('pending-amount')?.textContent = `${paymentInfo.amount || '0'} ${paymentInfo.currency || 'EGP'}`;

        break;

       case PAYMENT_STATUS.CANCELLED:
        // Fall through to failure display with specific message
        displayFailure(
          BookingId,
          status.userMessage, // Message from determinePaymentStatus
          paymentInfo.amount,
          paymentInfo.currency,
          false // Cancellations are typically not retryable
        );
        break;

      case PAYMENT_STATUS.FAILED:
         // Display failure UI
        displayFailure(
          BookingId,
          status.userMessage, // Message from determinePaymentStatus
          paymentInfo.amount,
          paymentInfo.currency,
          status.canRetry // Determine if retry button should be active link
        );
        break;

       default:
           // Handle unexpected statuses
           console.error(`Received unexpected payment status: ${status.paymentStatus}`);
           displayFailure(BookingId, 'An unexpected status was received for your payment. Please contact support.', paymentInfo.amount, paymentInfo.currency, false);
           break;
    }

  } catch (error) {
    console.error('Critical error during payment result processing:', error);
    // Display a generic failure message for any uncaught errors during the process
    displayFailure(
      BookingId,
      `Error processing payment result: ${error.message}`,
      null, // Amount might not be known in case of early failure
      null, // Currency might not be known
      false // Cannot retry if the processing itself failed
    );
  } finally {
    // Hide loading indicator once processing is complete (or failed)
    document.getElementById('loading-layout')?.classList.add('hidden');
  }
}

// Event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded. Initializing app...');
  initializeApp();

  // Set up button event listeners
  // Use optional chaining (?) for safety in case elements don't exist on all pages
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);

  // Assuming there might be print/resend buttons on the 'already submitted' or pending pages too
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);

  // Consider adding event listeners for other potential buttons, like a "Check Status Again" button on the pending layout
  // const checkStatusAgainBtn = document.getElementById('check-status-btn');
  // if (checkStatusAgainBtn) {
  //    checkStatusAgainBtn.addEventListener('click', () => {
  //        // Re-run initializeApp or a specific status check function
  //        console.log('Checking status again...');
  //        initializeApp(); // Or a lighter function
  //    });
  // }

});

// Optional: Add some basic styling or check for required HTML elements on load?
// window.onload = () => {
//     const requiredElements = ['loading-layout', 'success-layout', 'failure-layout', 'pending-layout', 'voucher-content'];
//     requiredElements.forEach(id => {
//         if (!document.getElementById(id)) {
//             console.error(`Required HTML element with ID '${id}' not found.`);
//             // Potentially display an error message to the user
//         }
//     });
// };
