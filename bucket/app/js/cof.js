// /app/js/cof.js
// Firebase and GitHub Configuration

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
  authDomain: "egypt-travels.firebaseapp.com",
  databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
  projectId: "egypt-travels",
  storageBucket: "egypt-travels.appspot.com",
  messagingSenderId: "477485386557",
  appId: "1:477485386557:web:755f9649043288db819354"
};

// GitHub Configuration
const GITHUB_CONFIG = {
    token: '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',
    owner: 'Charming-Egypt',
    repo: 'Ds',
    branch: 'main',
    basePath: 'bucket/app/partnership-applications',
    publicPath: 'app/partnership-applications',
    customDomain: 'https://www.discover-sharm.com'
};

// Authentication Configuration
const AUTH_CONFIG = {
    loginUrl: '/login.html',
    registerUrl: '/register.html',
    tokenKey: 'firebase_auth_token',
    userKey: 'firebase_user_data'
};

// Prevent modifications to config objects
Object.freeze(FIREBASE_CONFIG);
Object.freeze(GITHUB_CONFIG);
Object.freeze(AUTH_CONFIG);
