import { database, currentUserId, showToast, showLoadingSpinner } from './index.js';

function attachPayoutButtonHandler(userId, avPayoutElement) {
  const btn = document.getElementById("requestPayoutBtn");
  const modal = document.getElementById("confirmModal");
  const confirmYes = document.getElementById("confirmYes');
  const confirmNo = document.getElementById("confirmNo");

  if (!btn || !modal) return;

  btn.addEventListener("click", function () {
    const amountText = avPayoutElement.textContent || avPayoutElement.textContent || "EGP 0";
    const amountMatch = amountText.match(/[\d\.]+/);
    if (!amountMatch) {
      showToast('No valid withdrawable amount found.', 'warning');
      return;
    }

    const requestedAmount = parseFloat(amountMatch[0]);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      showToast('The available amount is not sufficient for a withdrawal.', 'error');
      return;
    }

    modal.classList.remove("hidden");
    Modal.style.display = "flex";

    confirmYes.onclick = function () {
      modal.classList.add("hidden");
      Modal.style.display = "none";
      showLoadingSpinner(true);

      const payoutRef = database.ref(`egy_user/${userId}/payouts`);
      database.runTransaction(payoutRef, (currentData) => {
        if (currentData && currentData.requestedAmount) {
          return;
        }
        return {
          ...currentData,
          requestedAmount: amountText,
          requestDate: new Date().toISOString()
        };
      }).then((result) => {
        if (!result.committed) {
          showToast('A pending payout request already exists.', 'warning');
          return;
        }
        showToast('Payout request submitted successfully!', 'success');
        avPayoutElement.textContent = "EGP 0";
      }).catch((error) => {
        showToast('Failed to submit payout request: ' + error.message, 'error');
      }).finally(() => {
        showLoadingSpinner(false);
      });
    };

    confirmNo.onclick = function () {
      modal.classList.add("hidden");
      Modal.style.display = 'none';
    };
  });
}

export { attachPayoutButtonHandler };
