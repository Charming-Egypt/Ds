// /app/js/git-cof.js
// Firebase Database Utilities - Complete & Optimized

const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB max input
const TARGET_SIZE = 2 * 1024 * 1024; // 2MB target after compression
const MAX_STORAGE_SIZE = 3 * 1024 * 1024; // 3MB absolute max for storage

/**
 * Validate file size
 * @param {File} file - File to validate
 * @throws {Error} If file exceeds max size
 */
function validateFileSize(file) {
    if (!file || !file.size) {
        throw new Error('Invalid file');
    }
    if (file.size > MAX_INPUT_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(`File "${file.name}" is ${sizeMB}MB. Maximum allowed is 10MB.`);
    }
}

/**
 * Compress image to target size while maintaining best quality
 * @param {string} base64Data - Base64 image data
 * @param {number} targetMB - Target size in MB
 * @returns {Promise<string>} Compressed base64
 */
function compressImage(base64Data, targetMB = 2) {
    const targetBytes = targetMB * 1024 * 1024;
    
    // Return if already small enough
    if (base64Data.length <= targetBytes) {
        return Promise.resolve(base64Data);
    }
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Progressive compression settings
            const compressionLevels = [
                { width: 1800, quality: 0.90 },
                { width: 1600, quality: 0.85 },
                { width: 1400, quality: 0.80 },
                { width: 1200, quality: 0.75 },
                { width: 1000, quality: 0.70 },
                { width: 800, quality: 0.65 },
                { width: 600, quality: 0.60 },
                { width: 400, quality: 0.50 }
            ];
            
            let bestResult = base64Data;
            let bestSize = base64Data.length;
            
            for (const level of compressionLevels) {
                // Calculate proportional height
                const ratio = level.width / img.width;
                const height = Math.round(img.height * ratio);
                
                canvas.width = level.width;
                canvas.height = height;
                
                // Clear and draw
                ctx.clearRect(0, 0, level.width, height);
                ctx.drawImage(img, 0, 0, level.width, height);
                
                // Convert to JPEG
                const compressed = canvas.toDataURL('image/jpeg', level.quality);
                
                // Track best result
                if (compressed.length < bestSize) {
                    bestResult = compressed;
                    bestSize = compressed.length;
                }
                
                // If we reached target, resolve immediately
                if (compressed.length <= targetBytes) {
                    logCompression(base64Data.length, compressed.length, level.width, level.quality);
                    resolve(compressed);
                    return;
                }
            }
            
            // Return best result even if over target
            logCompression(base64Data.length, bestSize, 'best', 'varies');
            resolve(bestResult);
        };
        
        img.onerror = function() {
            reject(new Error('Failed to load image for compression'));
        };
        
        img.src = base64Data;
    });
}

/**
 * Log compression results to console
 */
function logCompression(originalSize, newSize, width, quality) {
    const originalKB = (originalSize / 1024).toFixed(0);
    const newKB = (newSize / 1024).toFixed(0);
    const reduction = ((1 - newSize / originalSize) * 100).toFixed(0);
    const emoji = newSize <= TARGET_SIZE ? '✅' : '⚠️';
    console.log(`${emoji} ${originalKB}KB → ${newKB}KB (${reduction}% smaller) | ${width}px | ${typeof quality === 'number' ? Math.round(quality * 100) + '%' : quality}`);
}

/**
 * Read file and convert to base64 with automatic compression
 * @param {File} file - File to read
 * @returns {Promise<Object>} File data object
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        // Validate size
        try {
            validateFileSize(file);
        } catch (error) {
            reject(error);
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                let data = e.target.result;
                const isImage = file.type.startsWith('image/');
                const isPDF = file.type === 'application/pdf';
                const originalSize = file.size;
                let wasCompressed = false;
                
                if (isImage) {
                    // Compress image
                    data = await compressImage(data, 2);
                    wasCompressed = data.length < originalSize;
                } else if (isPDF) {
                    // Check PDF size
                    if (originalSize > 5 * 1024 * 1024) {
                        console.warn(`⚠️ Large PDF: ${(originalSize / 1024 / 1024).toFixed(1)}MB - may cause storage issues`);
                    }
                }
                
                resolve({
                    name: file.name,
                    type: isImage ? 'image/jpeg' : file.type,
                    size: data.length,
                    data: data,
                    originalSize: originalSize,
                    compressed: wasCompressed,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString()
                });
                
            } catch (error) {
                reject(new Error(`Error processing ${file.name}: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error(`Failed to read file: ${file.name}`));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Final compression check before storage
 * @param {string} data - Base64 data
 * @returns {Promise<string>} Compressed data
 */
async function finalCompressionCheck(data) {
    if (!data) return data;
    
    // If still too large, do aggressive compression
    if (data.length > MAX_STORAGE_SIZE) {
        console.warn(`⚠️ File still large (${(data.length/1024/1024).toFixed(1)}MB), applying aggressive compression...`);
        return await compressImage(data, 1); // Target 1MB
    }
    
    return data;
}

/**
 * Save partnership application to Firebase
 * @param {string} userId - User ID
 * @param {FormData} formData - Form data
 * @param {Array} fileDataArray - Array of file data objects
 * @returns {Promise<string>} Application ID
 */
async function savePartnershipApplication(userId, formData, fileDataArray) {
    const db = firebase.database();
    const userRef = db.ref(`egy_user/${userId}`);
    
    // Build application data
    const applicationData = {
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        business: {
            businessName: formData.get('business') || '',
            category: formData.get('category') || '',
            website: formData.get('website') || '',
            description: formData.get('message') || ''
        },
        idType: formData.get('id_type') || 'id',
        files: fileDataArray.map(f => ({
            name: f.fileName || f.name || 'unknown',
            type: f.type || 'unknown',
            size: f.size || 0,
            originalSize: f.originalSize || f.size || 0,
            compressed: f.compressed || false
        })),
        status: 'new',
        submittedAt: new Date().toISOString()
    };
    
    // Save application metadata
    const appRef = userRef.child('partnership_applications').push();
    await appRef.set(applicationData);
    console.log('✅ Application saved:', appRef.key);
    
    // Save files
    const filesRef = userRef.child('partnership_files').child(appRef.key);
    
    for (let i = 0; i < fileDataArray.length; i++) {
        const file = fileDataArray[i];
        
        // Final compression check
        let fileData = await finalCompressionCheck(file.data);
        
        // Save file data
        await filesRef.child(`file_${i}`).set({
            name: file.fileName || file.name || 'unknown',
            type: file.type || 'unknown',
            data: fileData || '',
            originalName: file.name || 'unknown',
            originalSize: file.originalSize || file.size || 0,
            compressedSize: fileData ? fileData.length : 0,
            uploadedAt: file.uploadedAt || new Date().toISOString()
        });
        
        console.log(`📁 File ${i + 1}/${fileDataArray.length} saved: ${file.fileName || file.name}`);
    }
    
    // Update user profile
    const updates = {
        last_application: firebase.database.ServerValue.TIMESTAMP,
        businessName: formData.get('business') || ''
    };
    
    if (formData.get('website')) {
        updates.website = formData.get('website');
    }
    
    await userRef.update(updates);
    console.log('✅ User profile updated');
    
    return appRef.key;
}

/**
 * Get user profile from database
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User profile
 */
async function getUserProfile(uid) {
    try {
        const db = firebase.database();
        const snapshot = await db.ref(`egy_user/${uid}`).once('value');
        const data = snapshot.val();
        
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
 * Load user avatar from URL
 * @param {string} uid - User ID
 * @param {string} username - Username for fallback
 */
function loadUserAvatar(uid, username) {
    const avatarImage = document.getElementById('avatar_image');
    const avatarPlaceholder = document.getElementById('avatar_placeholder');
    const avatarInitial = document.getElementById('avatar_initial');
    
    if (!avatarImage || !avatarPlaceholder || !avatarInitial) return;
    
    // Set initial letter
    avatarInitial.textContent = username ? username.charAt(0).toUpperCase() : 'U';
    
    // Try loading JPG then PNG
    const tryExtension = (ext) => {
        const url = `https://www.discover-sharm.com/app/photos/${uid}.${ext}`;
        const testImg = new Image();
        
        testImg.onload = function() {
            avatarImage.src = url;
            avatarImage.classList.remove('hidden');
            avatarPlaceholder.classList.add('hidden');
        };
        
        testImg.onerror = function() {
            if (ext === 'jpg') {
                tryExtension('png');
            }
            // If both fail, placeholder stays visible
        };
        
        testImg.src = url;
    };
    
    tryExtension('jpg');
}

/**
 * Handle avatar loading error
 */
function handleAvatarError() {
    const avatarImage = document.getElementById('avatar_image');
    const avatarPlaceholder = document.getElementById('avatar_placeholder');
    
    if (avatarImage) avatarImage.classList.add('hidden');
    if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');
}

// Log that utilities are loaded
console.log('🚀 Firebase Utilities loaded successfully');
console.log('📋 Limits: Input=10MB | Target=2MB | Storage=3MB');
