import { showToast } from './js/utils.js';

let currentUserId = null;

function initializeAuth(callback) {
  firebase.auth().onAuthStateChanged(user => {
    currentUserId = user ? user.uid : null;
    callback(user);
  }, error => {
    showToast(`Auth error: ${error.message}`, 'error');
  });
}

export { initializeAuth, currentUserId };
