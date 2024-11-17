
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, set, push, onChildAdded, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
      

const firebaseConfig = {
      apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
      authDomain: "egypt-travels.firebaseapp.com",
      databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
      projectId: "egypt-travels",
      storageBucket: "egypt-travels.appspot.com",
      messagingSenderId: "477485386557",
      appId: "1:477485386557:web:755f9649043288db819354",
      measurementId: "G-RKD5F46NM8"
        };

        // Initialize Firebase
 const app = initializeApp(firebaseConfig);
 const db = getDatabase();
 const auth = getAuth(app);
  
