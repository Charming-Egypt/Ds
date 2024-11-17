
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
 
<script>
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const messagesDiv = document.getElementById('messages');
        const typingIndicator = document.getElementById('typing-indicator');
      

                          
      

        const otherUserId = new URLSearchParams(window.location.search).get('ud2');

        let typingTimeout;
            let startX;

        auth.onAuthStateChanged(user => {
        if (user) {
            const currentUserId = user.uid;
            const chatId = [currentUserId, otherUserId].sort().join('_');
            const chatRef = ref(db, `private_chats/${chatId}/messages`);
          const typingRef = ref(db, `private_chats/${chatId}/typing`);
            const participantsRef = ref(db, `private_chats/${chatId}/participants`);

            // Store participants in the conversation
            set(participantsRef, {
                [currentUserId]: true,
                [otherUserId]: true
            });

              
              
              
              
              
              
              // Send Message
                sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        const timestamp = new Date().toISOString();
        const newMessageRef = push(chatRef); // Generate a new reference with an ID
        const messageId = newMessageRef.key; // Get the unique message ID

        set(newMessageRef, {
            message,
            senderId: currentUserId,
            timestamp,
            read: false,
            messageId // Include the message ID in the data
        }).catch(error => {
            alert('Error sending message: ' + error.message);
        });

        messageInput.value = '';
      setTimeout(scrollToBottom, 500);
    }
});
              
              
              

                // Typing Indicator
                messageInput.addEventListener('input', () => {
                    set(typingRef, { typing: true, userId: currentUserId });
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => set(typingRef, { typing: false }), 2000);
                });

                onValue(typingRef, snapshot => {
                    const typingData = snapshot.val();
                    if (typingData && typingData.typing && typingData.userId !== currentUserId) {
                        typingIndicator.textContent = "The other user is typing...";
                    } else {
                        typingIndicator.textContent = "";
                    }
                });

           // Listen for Messages
onChildAdded(chatRef, snapshot => {
     const data = snapshot.val();
                    fetchUserPhoto(data.senderId).then(photoUrl => {
displayMessage(data, currentUserId, photoUrl);
    setTimeout(scrollToBottom, 100);
  
                      // Play the notification sound
    if (data.senderId !== currentUserId) {
                showNotification(data.message);

        
    }
                      
                      
                    });
                });

                function displayMessage(data, currentUserId, photoUrl) {
                    const messageElement = document.createElement('div');
messageElement.className = `message-container ${data.senderId === currentUserId ? 'my-message-container' : 'other-message-container'}`;
                  
messageElement.setAttribute('data-id', data.messageId);             

                    // User Photo
    const userPhoto = document.createElement('img');
    userPhoto.className = 'user-photo';
    userPhoto.src = photoUrl || 'default-avatar.png';
    userPhoto.alt = `${data.senderId === currentUserId ? 'You' : 'Sender'}'s photo`;

    // Message Container
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${data.senderId === currentUserId ? 'my-message-container' : 'other-message-container'}`;

    // Message Text
    const messageText = document.createElement('div');
    messageText.className = `message-text ${data.senderId === currentUserId ? 'my-message-text' : 'other-message-text'}`;
    messageText.textContent = data.message;

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                   
                  
                  const deleteOverlay = document.createElement('div');
 deleteOverlay.className = 'delete-overlay';
 deleteOverlay.textContent = 'Deleting...';

                  
                  messageElement.appendChild(userPhoto);
                    messageElement.appendChild(messageText);
                  
                   
                  messageElement.appendChild(timestamp);
                   
                 messageElement.appendChild(deleteOverlay);
                  messagesDiv.appendChild(messageElement);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                  
                  
      
                  
       messagesDiv.scrollTop = messagesDiv.scrollHeight;
}          
                
              
              
              
              
              
       // Swipe to Delete
                messagesDiv.addEventListener('touchstart', (event) => {
                    if (event.target.closest('.my-message-container')) {
                        startX = event.touches[0].clientX;
                    }
                });

                messagesDiv.addEventListener('touchmove', (event) => {
                    if (event.target.closest('.my-message-container')) {
                        const currentX = event.touches[0].clientX;
                        const diffX = currentX - startX;
                        const messageElement = event.target.closest('.my-message-container');

                        if (diffX < -50) { // Adjust this value as needed for sensitivity
                            messageElement.classList.add('swiping');
                        } else {
                            messageElement.classList.remove('swiping');
                        }
                    }
                });

                


// Swipe to Delete
messagesDiv.addEventListener('touchend', (event) => {
    const messageElement = event.target.closest('.my-message-container');
    if (messageElement && messageElement.classList.contains('swiping')) {
        const messageId = messageElement.getAttribute('data-id');

        // Show custom confirmation dialog
        const customDialog = document.getElementById('custom-confirm-dialog');
        customDialog.style.display = 'flex';

        // Handle dialog button clicks
        document.getElementById('confirm-yes').onclick = () => {
            deleteMessage(messageId);
            customDialog.style.display = 'none';
        };

        document.getElementById('confirm-no').onclick = () => {
            messageElement.classList.remove('swiping'); // Reset swiping state if cancelled
            customDialog.style.display = 'none';
        };
    }
});

              
              
              
              
              
                function deleteMessage(messageId) {
    const messageRef = ref(db, `private_chats/${chatId}/messages/${messageId}`);
    remove(messageRef)
        .then(() => {
            const messageElement = document.querySelector(`.my-message-container[data-id="${messageId}"]`);
            if (messageElement) {
                messagesDiv.removeChild(messageElement);
            }
        })
        .catch(error => {
            console.error('Error deleting message:', error);
            alert('Failed to delete the message. Please try again.');
        });
}
              
              

                async function fetchUserPhoto(uid) {
                    try {
                        const snapshot = await get(ref(db, `egy_user/${uid}/photo`));
                        return snapshot.exists() ? snapshot.val() : null;
                    } catch (error) {
                        console.error('Error fetching user photo:', error);
                        return null;
                    }
                }
            }
        });
      
      
      
        function scrollToBottom() {
    const chatWindow = document.querySelector('#chat-window'); // Corrected 'chat-windo' to 'chat-window'
    chatWindow.scrollTop = chatWindow.scrollHeight; // Corrected 'scrollHight' to 'scrollHeight'
}
  
      
      function showNotification(message) {
    const notification = new Notification('New Message', {
        body: message,
        icon: 'https://raw.githubusercontent.com/Charming-Egypt/blogger-pwa/refs/heads/main/uploads/favicon.png'
    });

    notification.onclick = () => {
        // Redirect to the chat window
        window.focus(); // Bring the window to the foreground
    };
}
      
      
      
      if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            // Enable notifications
        }
    });
}
      
  
  
  
  
        </script>
  
  
  
  
  
