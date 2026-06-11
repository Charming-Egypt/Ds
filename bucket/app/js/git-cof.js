// /app/js/git-cof.js
// Firebase Database Utilities

/**
 * Save partnership application to egy_user/{userId}
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
            originalName: file.name
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
 * Read file as base64 data
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
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
