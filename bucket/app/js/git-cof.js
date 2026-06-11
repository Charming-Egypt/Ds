// /app/js/git-cof.js
// GitHub API Utilities for file operations

/**
 * Helper function to convert string to base64 (UTF-8 safe)
 */
function toBase64(str) {
    try {
        // Modern approach using TextEncoder
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.error('Base64 encoding error:', e);
        // Fallback
        return btoa(unescape(encodeURIComponent(str)));
    }
}

/**
 * Upload a file to GitHub repository
 */
async function uploadFileToGitHub(file, userId, fileName) {
    console.log(`Starting upload: ${fileName} for user ${userId}`);
    
    if (!file) {
        throw new Error('No file provided');
    }
    
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const safeFileName = `${fileName}.${fileExtension}`;
    const filePath = `${GITHUB_CONFIG.basePath}/${userId}/${timestamp}_${safeFileName}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const base64Content = e.target.result.split(',')[1];
                
                if (!base64Content) {
                    throw new Error('Failed to read file content');
                }
                
                const body = {
                    message: `Upload ${safeFileName} for user ${userId}`,
                    content: base64Content,
                    branch: GITHUB_CONFIG.branch
                };

                console.log(`Uploading to: ${apiUrl}`);
                
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
                    const errorData = await response.json();
                    console.error('GitHub API error:', errorData);
                    
                    if (response.status === 401) {
                        throw new Error('GitHub token is invalid or expired');
                    } else if (response.status === 404) {
                        throw new Error('Repository not found. Check owner/repo configuration');
                    } else if (response.status === 422) {
                        throw new Error('File already exists or invalid content');
                    } else {
                        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
                    }
                }

                const result = await response.json();
                console.log(`Upload successful: ${safeFileName}`, result);
                
                // Return public URL
                const publicUrl = `${GITHUB_CONFIG.customDomain}/${GITHUB_CONFIG.publicPath}/${userId}/${timestamp}_${safeFileName}`;
                resolve(publicUrl);
                
            } catch (error) {
                console.error(`Upload error for ${fileName}:`, error);
                reject(error);
            }
        };
        
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Save JSON data to GitHub repository
 */
async function saveApplicationToGitHub(userId, formData, fileUrls, userProfile) {
    console.log('Saving application data...');
    
    try {
        const applicationData = {
            userId: userId,
            username: userProfile?.username || 'unknown',
            userPhone: userProfile?.phone || '',
            timestamp: new Date().toISOString(),
            formData: {
                name: formData.get('name') || '',
                business: formData.get('business') || '',
                email: formData.get('email') || '',
                phone: formData.get('phone') || '',
                category: formData.get('category') || '',
                website: formData.get('website') || '',
                message: formData.get('message') || '',
                idType: formData.get('id_type') || ''
            },
            documents: fileUrls,
            userProfile: {
                username: userProfile?.username || '',
                email: userProfile?.email || '',
                phone: userProfile?.phone || '',
                displayName: userProfile?.displayName || ''
            },
            metadata: {
                userAgent: navigator.userAgent,
                submittedAt: new Date().toISOString()
            }
        };

        // Convert to base64 safely
        const jsonString = JSON.stringify(applicationData, null, 2);
        const jsonContent = toBase64(jsonString);
        
        if (!jsonContent) {
            throw new Error('Failed to encode application data');
        }
        
        const timestamp = Date.now();
        const filePath = `${GITHUB_CONFIG.basePath}/${userId}/application_${timestamp}.json`;
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        
        console.log(`Saving application to: ${apiUrl}`);
        
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
            const errorData = await response.json();
            console.error('Save application error:', errorData);
            throw new Error(errorData.message || `Save failed with status ${response.status}`);
        }

        const result = await response.json();
        console.log('Application saved successfully:', result);
        
        return filePath;
        
    } catch (error) {
        console.error('Save application error:', error);
        throw error;
    }
}

/**
 * Load user avatar from GitHub
 */
function loadUserAvatar(uid, username) {
    const avatarImage = document.getElementById('avatar_image');
    const avatarPlaceholder = document.getElementById('avatar_placeholder');
    const avatarInitial = document.getElementById('avatar_initial');
    
    if (!avatarImage || !avatarPlaceholder || !avatarInitial) return;
    
    if (username) {
        avatarInitial.textContent = username.charAt(0).toUpperCase();
    } else {
        avatarInitial.textContent = 'U';
    }
    
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

function handleAvatarError() {
    const avatarImage = document.getElementById('avatar_image');
    const avatarPlaceholder = document.getElementById('avatar_placeholder');
    if (avatarImage) avatarImage.classList.add('hidden');
    if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');
}
