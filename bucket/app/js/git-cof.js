// /app/js/git-cof.js
// Firebase Database Utilities

/**
 * Read file as base64 data
 * @param {File} file - File object
 * @returns {Promise<Object>} File data object
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: e.target.result
        });
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Save partnership application to egy_user/{userId}
 * @param {string} userId - User ID
 * @param {FormData} formData - Form data
 * @param {Array} fileDataArray - Array of file data objects
 * @returns {Promise<string>} Application ID
 */
async function savePartnershipApplication(userId, formData, fileDataArray) {
    const db = firebase.database();
    const userRef = db.ref(`egy_user/${userId}`);
    
    // Create application data (without personal info - already in egy_user)
    const applicationData = {
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        business: {
            businessName: formData.get('business'),
            category: formData.get('category'),
            website: formData.get('website') || '',
            description: formData.get('message')
        },
        idType: formData.get('id_type'),
        files: fileDataArray.map(f => ({
            name: f.fileName,
            type: f.type,
            size: f.size
        })),
        status: 'new',
        submittedAt: new Date().toISOString()
    };
    
    // Save application
    const appRef = userRef.child('partnership_applications').push();
    await appRef.set(applicationData);
    
    // Save files
    const filesRef = userRef.child('partnership_files').child(appRef.key);
    const filePromises = fileDataArray.map((file, index) => {
        return filesRef.child(`file_${index}`).set({
            name: file.fileName,
            type: file.type,
            data: file.data,
            originalName: file.name,
            uploadedAt: file.uploadedAt || new Date().toISOString()
        });
    });
    
    await Promise.all(filePromises);
    
    // Update user's business info
    const updates = {
        last_application: firebase.database.ServerValue.TIMESTAMP,
        businessName: formData.get('business')
    };
    
    if (formData.get('website')) {
        updates.website = formData.get('website');
    }
    
    await userRef.update(updates);
    
    return appRef.key;
}

/**
 * Get user profile from egy_user
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User profile
 */
async function getUserProfile(uid) {
    try {
        const db = firebase.database();
        const snap = await db.ref(`egy_user/${uid}`).once('value');
        const data = snap.val();
        
        if (data) {
            return {
                uid: uid,
                username: data.username || '',
                email: data.email || '',
                phone: data.phone || '',
                displayName: data.displayName || data.username || 'User',
                businessName: data.businessName || '',
                website: data.website || '',
                ...data
            };
        }
        
        return {
            uid: uid,
            username: '',
            email: '',
            phone: '',
            displayName: 'User',
            businessName: '',
            website: ''
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

/**
 * Load user avatar from GitHub
 * @param {string} uid - User ID
 * @param {string} username - Username for fallback
 */
function loadUserAvatar(uid, username) {
    const img = document.getElementById('avatar_image');
    const placeholder = document.getElementById('avatar_placeholder');
    const initial = document.getElementById('avatar_initial');
    
    if (!img || !placeholder || !initial) return;
    
    initial.textContent = username ? username.charAt(0).toUpperCase() : 'U';
    
    const tryLoad = (ext) => {
        const url = `https://www.discover-sharm.com/app/photos/${uid}.${ext}`;
        const testImg = new Image();
        testImg.onload = () => {
            img.src = url;
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        testImg.onerror = () => {
            if (ext === 'jpg') tryLoad('png');
        };
        testImg.src = url;
    };
    
    tryLoad('jpg');
}

/**
 * Handle avatar loading error
 */
function handleAvatarError() {
    const img = document.getElementById('avatar_image');
    const placeholder = document.getElementById('avatar_placeholder');
    if (img) img.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
}
