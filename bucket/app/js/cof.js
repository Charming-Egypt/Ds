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
    token: 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN', // Replace with your GitHub token
    owner: 'YOUR_GITHUB_USERNAME',              // Replace with your GitHub username
    repo: 'YOUR_REPO_NAME',                     // Replace with your repository name
    branch: 'main',
    basePath: 'partnership-applications'        // Folder in repo where data will be stored
};

// Authentication Configuration
const AUTH_CONFIG = {
    loginUrl: '/login.html',                    // Change to your actual login page URL
    registerUrl: '/register.html',
    tokenKey: 'firebase_auth_token',            // Firebase auth token storage key
    userKey: 'firebase_user_data'               // Firebase user data storage key
};

// Prevent modifications to config objects
Object.freeze(FIREBASE_CONFIG);
Object.freeze(GITHUB_CONFIG);
Object.freeze(AUTH_CONFIG);
