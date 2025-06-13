function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 p-4 rounded text-white ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showLoadingSpinner(show) {
  const spinner = document.getElementById('loadingSpinner');
  spinner.classList.toggle('show', show);
}

function escapeHtml(unsafe) {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export { showToast, showLoadingSpinner, escapeHtml };
