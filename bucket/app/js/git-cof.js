// /app/js/git-cof.js
// Firebase Database Utilities

function compressImage(base64Data, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedData = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedData);
        };
        img.onerror = () => reject(new Error('Failed to compress image'));
        img.src = base64Data;
    });
}

async function smartCompress(base64Data) {
    const originalSize = base64Data.length;
    const maxSize = 5 * 1024 * 1024;
    
    if (originalSize <= maxSize) {
        return { data: base64Data, compressed: false };
    }
    
    if (originalSize <= 10 * 1024 * 1024) {
        try {
            const compressed = await compressImage(base64Data, 1600, 0.9);
            if (compressed.length <= maxSize) return { data: compressed, compressed: true };
        } catch (e) {}
    }
    
    const settings = [
        { width: 1400, quality: 0.85 },
        { width: 1200, quality: 0.80 },
        { width: 1000, quality: 0.75 },
        { width: 800, quality: 0.70 }
    ];
    
    for (const setting of settings) {
        try {
            const compressed = await compressImage(base64Data, setting.width, setting.quality);
            if (compressed.length <= maxSize) return { data: compressed, compressed: true };
        } catch (e) {}
    }
    
    try {
        const compressed = await compressImage(base64Data, 1000, 0.75);
        return { data: compressed, compressed: true };
    } catch (e) {
        return { data: base64Data, compressed: false };
    }
}

function isImageFile(file) {
    return file.type.startsWith('image/');
}

async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            let data = e.target.result;
            let originalSize = file.size;
            let compressed = false;
            
            if (isImageFile(file)) {
                try {
                    const result = await smartCompress(data);
                    data = result.data;
                    compressed = result.compressed;
                } catch (err) {
                    console.warn('Compression failed:', err.message);
                }
            }
            
            resolve({
                name: file.name,
                type: isImageFile(file) ? 'image/jpeg' : file.type,
                size: data.length,
                data: data,
                originalSize: originalSize,
                compressed: compressed,
                fileName: file.name
            });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

async function savePartnershipApplication(userId, formData, fileDataArray) {
    const db = firebase.database();
    const userRef = db.ref(`egy_user/${userId}`);
    
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
            name: f.fileName || f.name,
            type: f.type,
            size: f.size,
            originalSize: f.originalSize,
            compressed: f.compressed || false
        })),
        status: 'new',
        submittedAt: new Date().toISOString()
    };
    
    const appRef = userRef.child('partnership_applications').push();
    await appRef.set(applicationData);
    
    const filesRef = userRef.child('partnership_files').child(appRef.key);
    
    for (let i = 0; i < fileDataArray.length; i++) {
        const file = fileDataArray[i];
        
        await filesRef.child(`file_${i}`).set({
            name: file.fileName || file.name,
            type: file.type,
            data: file.data,
            originalName: file.name,
            originalSize: file.originalSize,
            compressedSize: file.data.length,
            uploadedAt: file.uploadedAt || new Date().toISOString()
        });
    }
    
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
