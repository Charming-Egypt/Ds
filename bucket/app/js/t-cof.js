// /app/js/cof.js - Firebase Configuration Only

// Firebase Configuration
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
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth();
const database = firebase.database();

// Anonymous authentication for database access
auth.signInAnonymously()
    .then(() => {
        console.log('✅ Firebase connected');
    })
    .catch((error) => {
        console.error('Firebase auth error:', error);
    });
