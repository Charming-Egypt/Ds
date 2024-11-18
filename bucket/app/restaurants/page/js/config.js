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




// Function to get the ID from the URL
function getIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Function to check if the ID exists in the Firebase database
function checkIdInDatabase(id) {
    const dbRef = ref(db); // Reference to your Firebase database
    return get(child(dbRef, 'Restaurants/' + id)).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val(); // Returns the data if it exists
        } else {
            return null; // ID does not exist
        }
    });
}
