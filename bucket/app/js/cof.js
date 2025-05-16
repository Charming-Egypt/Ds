// Firebase configuration
const Config = {
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
      firebase.initializeApp(Config);
    } else {
      firebase.app();
    }

    const db = firebase.database();
    const auth = firebase.auth();
    
  
