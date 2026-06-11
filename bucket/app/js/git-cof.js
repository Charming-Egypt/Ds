// /app/js/git-cof.js
// Firebase Database Utilities - Save inside egy_user node

async function uploadFileToTelegram(file, userId, fileName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                fileName: fileName,
                uploadedAt: new Date().toISOString()
            };
            resolve(fileData);
        };
        reader.onerror = () => reject(new Error('Cannot read file'));
        reader.readAsDataURL(file);
    });
}

async function sendMessageToTelegram(userId, formData, fileDataArray, userProfile) {
    const db = firebase.database();
    const userRef = db.ref(`egy_user/${userId}`);
    
    // Application data WITHOUT personal info (already in egy_user)
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
    
    // Save application inside egy_user node
    const appRef = userRef.child('partnership_applications').push();
    await appRef.set(applicationData);
    
    // Save files inside egy_user node
    const filesRef = userRef.child('partnership_files').child(appRef.key);
    const filePromises = fileDataArray.map((file, index) => {
        return filesRef.child(`file_${index}`).set({
            name: file.fileName,
            type: file.type,
            data: file.data,
            originalName: file.name
        });
    });
    
    await Promise.all(filePromises);
    
    // Update user's last application timestamp
    await userRef.child('last_application').set(firebase.database.ServerValue.TIMESTAMP);
    
    // Also update user's business info if new
    const updates = {};
    if (formData.get('business')) updates.businessName = formData.get('business');
    if (formData.get('website')) updates.website = formData.get('website');
    if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
    }
    
    return appRef.key;
}

// Keep compatibility
async function uploadFileToGitHub(file, userId, fileName) {
    return await uploadFileToTelegram(file, userId, fileName);
}

async function saveApplicationToGitHub(userId, formData, fileUrls, userProfile) {
    return await sendMessageToTelegram(userId, formData, fileUrls, userProfile);
}

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

function handleAvatarError() {
    const img = document.getElementById('avatar_image');
    const placeholder = document.getElementById('avatar_placeholder');
    if (img) img.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
}
