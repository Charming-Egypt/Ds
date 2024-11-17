
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



        function Gettemples() {
            const dbref = ref(db);
            get(child(dbref, 'temples')).then((snapshot) => {
                const templesContainer = document.getElementById('temples-container');
                snapshot.forEach((templeSnapshot) => {
                    const templeData = templeSnapshot.val();
                    const templeElement = createtempleElement(templeData.name_en, templeData.photo, templeData.blog_url);
                    templesContainer.appendChild(templeElement);
                });
            });
        }

        function createtempleElement(name, imageUrl, pageUrl) {
            const templeDiv = document.createElement('div');
            templeDiv.className = 'temple';
            templeDiv.style.backgroundImage = `url(${imageUrl})`;

            const nameLink = document.createElement('a');
            nameLink.className = 'temple-name';
            nameLink.innerText = name;
            nameLink.href = pageUrl;
            nameLink.target = '_self';
            templeDiv.appendChild(nameLink);

            return templeDiv;
        }
 if (window.location.pathname === '/' || window.location.pathname === '/') {
        window.addEventListener('load', Gettemples);
    }
