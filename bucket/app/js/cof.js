// ==========================================================================
// DISCOVER SHARM - Firebase Configuration & Services
// Complete Firebase Setup - Ready for Any Use
// ==========================================================================

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

// Firebase Services
const auth = firebase.auth();
const db = firebase.database();
const firestore = firebase.firestore ? firebase.firestore() : null;
const storage = firebase.storage ? firebase.storage() : null;
const messaging = firebase.messaging ? firebase.messaging() : null;
const functions = firebase.functions ? firebase.functions() : null;

auth.useDeviceLanguage();

// Auth State Listener
auth.onAuthStateChanged(function(user) {
  if (user) {
    window.currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL
    };
  } else {
    window.currentUser = null;
  }
});

// Database References
const dbRefs = {
  trips: function() { return db.ref('trips'); },
  tripById: function(tripId) { return db.ref('trips/' + tripId); },
  bookings: function() { return db.ref('trip-bookings'); },
  bookingById: function(bookingId) { return db.ref('trip-bookings/' + bookingId); },
  users: function() { return db.ref('egy_user'); },
  userById: function(uid) { return db.ref('egy_user/' + uid); },
  reviews: function() { return db.ref('trip-reviews'); },
  reviewsByTripId: function(tripId) { return db.ref('trip-reviews/' + tripId); },
  notifications: function() { return db.ref('notifications'); },
  notificationsByUserId: function(uid) { return db.ref('notifications/' + uid); },
  ref: function(path) { return db.ref(path); }
};

// Export to window
window.firebaseApp = firebase.app();
window.auth = auth;
window.db = db;
window.firestore = firestore;
window.storage = storage;
window.messaging = messaging;
window.functions = functions;
window.dbRefs = dbRefs;

// For module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { auth, db, firestore, storage, messaging, functions, dbRefs };
}


const AUTH_CONFIG = {
    loginUrl: '/login.html',
    registerUrl: '/register.html',
    dashboardUrl: '/dashboard.html'
};
