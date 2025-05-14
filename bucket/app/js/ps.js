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

function formatCurrency(amount, currency = 'EGP') {
  const amountStr = parseFloat(amount || 0).toFixed(2).toString();
  return `${amountStr.replace('.', ',')} ${currency}`;
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
      userMessage: 'Payment processing'
    };
  }

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

function populateVoucherDisplay(data) {
  if (!data) return;
  
  document.getElementById('voucher-ref').textContent = data.refNumber || 'N/A';
  document.getElementById('voucher-transaction').textContent = data.transactionId || 'N/A';
  document.getElementById('voucher-amount').textContent = formatCurrency(data.amount, data.currency);
  document.getElementById('voucher-payment-method').textContent = data.paymentMethod || 'Credit/Debit Card';
  
  if (data.cardBrand) {
    document.getElementById('voucher-card').textContent = 
      `${data.cardBrand} ${data.maskedCard ? 'ending in ' + data.maskedCard.slice(-4) : '••••'}`;
  } else {
    document.getElementById('voucher-card').textContent = 'N/A';
  }
  
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
  
  const printStyles = `
    <style>
      .voucher-container {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
      }
      .voucher-header {
        background: linear-gradient(135deg, #ffc107 0%, #426 100%);
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
      .voucher-title {
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
        padding: 5px;
      }
      .detail-section {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
        padding: 0 1rem;
      }
      .detail-card {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
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
        padding: 0 1rem;
      }
      .voucher-footer {
        background: #f3f4f6;
        padding: 1.5rem;
        text-align: center;
        border-top: 1px dashed #d1d5db;
      }
      .threcolmn {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
      @media print {
        body * {
          visibility: hidden;
        }
        .voucher-container, .voucher-container * {
          visibility: visible;
        }
        .voucher-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          box-shadow: none;
          border: none;
        }
      }
    </style>
  `;

  if (typeof printJS === 'function') {
    printJS({
      printable: 'voucher-content',
      type: 'html',
      scanStyles: false,
      style: printStyles,
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
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Voucher</title>
          ${printStyles}
        </head>
        <body>
          ${voucherEl.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

// [Rest of your functions (sendVoucherEmail, resendVoucherEmailHandler, displayFailure) remain unchanged...]

async function processPaymentWithMerchantOrder(merchantOrderId, user) {
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
    throw new Error(result.message || 'Failed to verify payment.');
  }

  const paymentData = result.data;
  const status = determinePaymentStatus(
    paymentData.responseCode || '00',
    paymentData.status || 'SUCCESS'
  );

  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get('transactionId') || paymentData.transactionId;

  const paymentInfo = {
    amount: paymentData.amount || '0',
    currency: paymentData.currency || 'EGP',
    transactionId: transactionId,
    refNumber: merchantOrderId,
    cardBrand: paymentData.cardBrand || null,
    maskedCard: paymentData.maskedCard || null,
    paymentMethod: paymentData.paymentMethod || 'Credit/Debit Card',
    responseCode: paymentData.responseCode || '00',
    responseMessage: paymentData.responseMessage || 'Approved'
  };

  const updateSuccess = await updateBookingStatus(merchantOrderId, {
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
    await auth.signInAnonymously().catch(() => {});
    const user = auth.currentUser;
    
    if (user && !user.isAnonymous) {
      currentUserRole = await getUserRole(user.uid);
    }

    const { status, paymentInfo } = await processPaymentWithMerchantOrder(merchantOrderId, user);
    
    const bookingSnapshot = await db.ref(`trip-bookings/${BookingId}`).once('value');
    BookingData = bookingSnapshot.val();
    
    if (!BookingData) {
      throw new Error('Booking not found in database');
    }

    BookingData = {
      ...BookingData,
      ...paymentInfo,
      amountPaid: paymentInfo.amount,
      paymentMethod: paymentInfo.paymentMethod
    };

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

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  
  document.getElementById('print-voucher-btn')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn')?.addEventListener('click', resendVoucherEmailHandler);
  document.getElementById('print-voucher-btn-submitted')?.addEventListener('click', handlePrintVoucher);
  document.getElementById('resend-email-btn-submitted')?.addEventListener('click', resendVoucherEmailHandler);
});
