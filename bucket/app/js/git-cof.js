// /app/js/git-cof.js
// Telegram Utilities

async function uploadFileToTelegram(file, userId, fileName) {
    if (!file) throw new Error('No file provided');
    
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CONFIG.chatId);
    formData.append('document', file);
    formData.append('caption', `📎 ${fileName}\n👤 User: ${userId}\n📅 ${new Date().toLocaleString()}`);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendDocument`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.description || 'Upload failed');
    }
    
    const result = await response.json();
    return result.result.document.file_id;
}

async function sendMessageToTelegram(userId, formData, fileIds, userProfile) {
    const message = `
🌟 <b>NEW PARTNERSHIP APPLICATION</b> 🌟

👤 <b>User:</b> @${userProfile?.username || 'unknown'}
🆔 <b>User ID:</b> <code>${userId}</code>
📧 <b>Email:</b> ${userProfile?.email || 'N/A'}
📞 <b>Phone:</b> ${userProfile?.phone || 'N/A'}

━━━━━━━━━━━━━━━━━━

📋 <b>APPLICATION DETAILS</b>

🏢 <b>Business:</b> ${formData.get('business')}
👤 <b>Contact:</b> ${formData.get('name')}
📧 <b>Email:</b> ${formData.get('email')}
📞 <b>Phone:</b> ${formData.get('phone')}
📂 <b>Category:</b> ${formData.get('category') === 'hotel' ? '🏨 Hotel/Resort' : '✈️ Tour Operator'}
🌐 <b>Website:</b> ${formData.get('website') || 'N/A'}

📝 <b>Description:</b>
${formData.get('message')}

━━━━━━━━━━━━━━━━━━

🆔 <b>ID Type:</b> ${formData.get('id_type') === 'id' ? 'National ID' : 'Passport'}

📎 <b>Files:</b> ${fileIds.length} files uploaded

📅 <b>Submitted:</b> ${new Date().toLocaleString()}
`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML'
        })
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.description || 'Send failed');
    }
    
    return true;
}

// Keep old function names for compatibility
async function uploadFileToGitHub(file, userId, fileName) {
    return await uploadFileToTelegram(file, userId, fileName);
}

async function saveApplicationToGitHub(userId, formData, fileUrls, userProfile) {
    const fileIds = Object.values(fileUrls);
    return await sendMessageToTelegram(userId, formData, fileIds, userProfile);
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
