// /app/js/git-cof.js
// Firebase Database Utilities with Image Compression

/**
 * Compress image to target size
 * @param {string} base64Data - Original base64 image
 * @param {number} maxSizeMB - Target max size in MB
 * @returns {Promise<string>} Compressed base64
 */
async function compressImageToSize(base64Data, maxSizeMB = 1) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // If already small enough, return as is
    if (base64Data.length <= maxSizeBytes) {
        return base64Data;
    }
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Try different quality levels
            const qualities = [0.8, 0.6, 0.4, 0.3, 0.2];
            const widths = [1200, 1000, 800, 600, 400];
            
            let bestResult = base64Data;
            
            for (const width of widths) {
                for (const quality of qualities) {
                    // Calculate height maintaining aspect ratio
                    const ratio = width / img.width;
                    const height = Math.round(img.height * ratio);
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    
                    if (compressed.length <= maxSizeBytes) {
                        console.log(`✅ Compressed to ${(compressed.length/1024).toFixed(1)}KB (${width}px, ${Math.round(quality*100)}% quality)`);
                        resolve(compressed);
                        return;
                    }
                    
                    if (compressed.length < bestResult.length) {
                        bestResult = compressed;
                    }
                }
            }
            
            // Return best result even if still over limit
            console.log(`⚠️ Best compression: ${(bestResult.length/1024).toFixed(1)}KB`);
            resolve(bestResult);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = base64Data;
    });
}

/**
 * Read file with compression
 */
async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            let data = e.target.result;
            const isImage = file.type.startsWith('image/');
            const originalSize = file.size;
            
            if (isImage) {
                console.log(`📷 Original: ${(originalSize/1024).toFixed(0)}KB - ${file.name}`);
                // Compress images to max 1MB
                data = await compressImageToSize(data, 1);
                const newSize = data.length;
                const reduction = ((1 - newSize/originalSize) * 100).toFixed(0);
                console.log(`📷 Compressed: ${(newSize/1024).toFixed(0)}KB (${reduction}% smaller)`);
            }
            
            resolve({
                name: file.name,
                type: isImage ? 'image/jpeg' : file.type,
                size: data.length,
                data: data,
                originalSize: originalSize,
                compressed: isImage
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Save application to egy_user
 */
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
            size: f.size
        })),
        status: 'new',
        submittedAt: new Date().toISOString()
    };
    
    const appRef = userRef.child('partnership_applications').push();
    await appRef.set(applicationData);
    
    // Save files
    const filesRef = userRef.child('partnership_files').child(appRef.key);
    
    for (let i = 0; i < fileDataArray.length; i++) {
        const file = fileDataArray[i];
        
        // Check if data is too large (>5MB)
        if (file.data && file.data.length > 5 * 1024 * 1024) {
            console.warn(`⚠️ File ${i} still too large, compressing more...`);
            file.data = await compressImageToSize(file.data, 0.5); // Compress to 500KB
        }
        
        await filesRef.child(`file_${i}`).set({
            name: file.fileName || file.name,
            type: file.type,
            data: file.data,
            originalName: file.name,
            originalSize: file.originalSize || file.size,
            compressedSize: file.data ? file.data.length : 0
        });
    }
    
    await userRef.update({
        last_application: firebase.database.ServerValue.TIMESTAMP,
        businessName: formData.get('business'),
        website: formData.get('website') || ''
    });
    
    return appRef.key;
}

async function getUserProfile(uid) {
    try {
        const db = firebase.database();
        const snap = await db.ref(`egy_user/${uid}`).once('value');
        const data = snap.val();
        if (data) return { uid, ...data };
        return { uid, username: '', email: '', phone: '', displayName: 'User' };
    } catch (e) { return null; }
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
        testImg.onload = () => { img.src = url; img.classList.remove('hidden'); placeholder.classList.add('hidden'); };
        testImg.onerror = () => { if (ext === 'jpg') tryLoad('png'); };
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
