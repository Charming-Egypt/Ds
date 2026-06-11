// /app/js/git-cof.js
// Firebase Database Utilities with Image Compression

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max input
const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB target for storage

/**
 * Check file size before processing
 */
function validateFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File "${file.name}" is too large (${(file.size/1024/1024).toFixed(1)}MB). Maximum allowed is 10MB.`);
    }
    return true;
}

/**
 * Compress image to target size
 */
async function compressImageToSize(base64Data, maxSizeMB = 2) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (base64Data.length <= maxSizeBytes) {
        console.log(`✅ Already small: ${(base64Data.length/1024).toFixed(1)}KB`);
        return base64Data;
    }
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Settings for different sizes
            const settings = [
                { width: 1600, quality: 0.85 },
                { width: 1400, quality: 0.80 },
                { width: 1200, quality: 0.75 },
                { width: 1000, quality: 0.70 },
                { width: 800, quality: 0.65 },
                { width: 600, quality: 0.60 }
            ];
            
            let bestResult = base64Data;
            
            for (const setting of settings) {
                const ratio = setting.width / img.width;
                const height = Math.round(img.height * ratio);
                
                canvas.width = setting.width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, setting.width, height);
                
                const compressed = canvas.toDataURL('image/jpeg', setting.quality);
                
                if (compressed.length <= maxSizeBytes) {
                    console.log(`✅ Compressed: ${(compressed.length/1024).toFixed(0)}KB (${setting.width}px, ${Math.round(setting.quality*100)}%)`);
                    resolve(compressed);
                    return;
                }
                
                if (compressed.length < bestResult.length) {
                    bestResult = compressed;
                }
            }
            
            console.log(`⚠️ Best: ${(bestResult.length/1024).toFixed(0)}KB`);
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
    // Validate size first
    validateFileSize(file);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            let data = e.target.result;
            const isImage = file.type.startsWith('image/');
            const originalSize = file.size;
            
            if (isImage) {
                console.log(`📷 ${file.name}: ${(originalSize/1024).toFixed(0)}KB`);
                data = await compressImageToSize(data, 2); // Compress to 2MB
            } else if (file.type === 'application/pdf') {
                // PDFs: warn if large
                if (originalSize > 5 * 1024 * 1024) {
                    console.warn(`⚠️ Large PDF: ${(originalSize/1024/1024).toFixed(1)}MB`);
                }
            }
            
            resolve({
                name: file.name,
                type: isImage ? 'image/jpeg' : file.type,
                size: data.length,
                data: data,
                originalSize: originalSize,
                compressed: isImage && data.length < originalSize
            });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
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
    
    const filesRef = userRef.child('partnership_files').child(appRef.key);
    
    for (let i = 0; i < fileDataArray.length; i++) {
        const file = fileDataArray[i];
        let fileData = file.data;
        
        // Final check - if still too large, compress more
        if (fileData && fileData.length > 3 * 1024 * 1024) {
            console.warn(`⚠️ Still large, extra compression...`);
            fileData = await compressImageToSize(fileData, 1);
        }
        
        await filesRef.child(`file_${i}`).set({
            name: file.fileName || file.name,
            type: file.type,
            data: fileData,
            originalName: file.name,
            originalSize: file.originalSize || file.size,
            compressedSize: fileData ? fileData.length : 0
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
