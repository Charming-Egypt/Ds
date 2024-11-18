
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
  const analytics = getAnalytics(app);



// Function to get the ID from the URL
function getIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Function to check if the ID exists in the Firebase database
function checkIdInDatabase(id) {
    const dbRef = firebase.database().ref('Restaurants/' + id);
    return dbRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            return snapshot.val(); // returns the data if it exists
        } else {
            return null; // ID does not exist
        }
    });
}

// Function to use the data if ID exists
function useData(data) {
    if (data) {
        const name_en = data.name_en;
        const photo = data.photo;
        
        
        // You can now use these variables as needed
        console.log(`Name: ${name_en}`);
        console.log(`Photo: ${photo}`);
        
    } else {
        console.log('ID does not exist in the database');
    }
}

// Main function to tie everything together
async function main() {
    const id = getIdFromUrl();
    if (id) {
        const data = await checkIdInDatabase(id);
        useData(data);
    } else {
        console.log('No ID found in the URL');
    }
}

// Run the main function
main();






