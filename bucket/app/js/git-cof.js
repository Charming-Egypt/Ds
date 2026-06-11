// /app/js/git-cof.js
// GitHub API Utilities for file operations

/**
 * Helper function to convert string to base64 (UTF-8 safe)
 * @param {string} str - String to encode
 * @returns {string} Base64 encoded string
 */
function toBase64(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        // Fallback for older browsers
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        return btoa(binary);
    }
}

/**
 * Upload a file to GitHub repository
 * @param {File} file - File object to upload
 * @param {string} userId - User ID for folder structure
 * @param {string} fileName - Name for the file
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadFileToGitHub(file, userId, fileName) {
    const timestamp = Date.now();
    const filePath = `${GITHUB_CONFIG.basePath}/${userId}/${timestamp}_${fileName}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Content = e.target.result.split(',')[1];
                
                // Check if file exists (for update)
                let sha = null;
                try {
                    const checkResponse = await fetch(`${apiUrl}?ref=${GITHUB_CONFIG.branch}`, {
                        headers: {
                            'Authorization': `token ${GITHUB_CONFIG.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    if (checkResponse.ok) {
                        const data = await checkResponse.json();
                        sha = data.sha;
                    }
                } catch (e) {
                    // File doesn't exist, will create new
                }

                const body = {
                    message: `Upload ${fileName} for user ${userId}`,
                    content: base64Content,
                    branch: GITHUB_CONFIG.branch
                };
                
                if (sha) {
                    body.sha = sha;
                }

                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to upload file');
                }

                // Return public URL
                const publicUrl = `${GITHUB_CONFIG.customDomain}/${GITHUB_CONFIG.publicPath}/${userId}/${timestamp}_${fileName}`;
                resolve(publicUrl);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Save JSON data to GitHub repository
 * @param {string} userId - User ID
 * @param {FormData} formData - Form data
 * @param {Object} fileUrls - Object containing uploaded file URLs
 * @param {Object} userProfile - User profile data
 * @returns {Promise<string>} Path of saved file
 */
async function saveApplicationToGitHub(userId, formData, fileUrls, userProfile) {
    const applicationData = {
        userId: userId,
        username: userProfile?.username || 'unknown',
        userPhone: userProfile?.phone || '',
        timestamp: new Date().toISOString(),
        formData: {
            name: formData.get('name'),
            business: formData.get('business'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            category: formData.get('category'),
            website: formData.get('website') || '',
            message: formData.get('message'),
            idType: formData.get('id_type')
        },
        documents: fileUrls,
        userProfile: {
            username: userProfile?.username,
            email: userProfile?.email,
            phone: userProfile?.phone,
            displayName: userProfile?.displayName
        },
        metadata: {
            userAgent: navigator.userAgent,
            submittedAt: new Date().toISOString()
        }
    };

    // Convert to base64 safely
    const jsonString = JSON.stringify(applicationData, null, 2);
    const jsonContent = toBase64(jsonString);
    
    const timestamp = Date.now();
    const filePath = `${GITHUB_CONFIG.basePath}/${userId}/application_${timestamp}.json`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
    
    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_CONFIG.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: `New partnership application from ${userProfile?.username || userId}`,
            content: jsonContent,
            branch: GITHUB_CONFIG.branch
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save application data');
    }

    return filePath;
}

/**
 * Load user avatar from GitHub
 * @param {string} uid - User ID
 * @param {string} username - Username for fallback initial
 */
function loadUserAvatar(uid, username) {
    const avatarImage = document.getElementById('avatar_image');
    const avatarPlaceholder = document.getElementById('avatar_placeholder');
    const avatarInitial = document.getElementById('avatar_initial');
    
    if (!avatarImage || !avatarPlaceholder || !avatarInitial) return;
    
    // Set initial letter from username
    if (username) {
        avatarInitial.textContent = username.charAt(0).toUpperCase();
    } else {
        avatarInitial.textContent = 'U';
    }
    
    // Try to load avatar from GitHub (JPG first, then PNG)
    const avatarUrlJpg = `${GITHUB_CONFIG.customDomain}/app/photos/${uid}.jpg`;
    const avatarUrlPng = `${GITHUB_CONFIG.customDomain}/app/photos/${uid}.png`;
    
    const img = new Image();
    img.onload = function() {
        avatarImage.src = avatarUrlJpg;
        avatarImage.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
    };
    img.onerror = function() {
        const imgPng = new Image();
        imgPng.onload = function() {
            avatarImage.src = avatarUrlPng;
            avatarImage.classList.remove('hidden');
            avatarPlaceholder.classList.add('hidden');
        };
        imgPng.onerror = function() {
            avatarImage.classList.add('hidden');
            avatarPlaceholder.classList.remove('hidden');
        };
        imgPng.src = avatarUrlPng;
    };
    img.src = avatarUrlJpg;
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

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toBase64,
        uploadFileToGitHub,
        saveApplicationToGitHub,
        loadUserAvatar,
        handleAvatarError
    };
}
