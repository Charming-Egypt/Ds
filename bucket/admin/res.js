// In the DomManager class, update the addClass method:
addClass(id, className) {
  const el = this.getElement(id);
  if (el) {
    // Split the className string by spaces and add each class individually
    className.split(' ').forEach(cls => {
      if (cls) { // Only add non-empty strings
        el.classList.add(cls);
      }
    });
  }
}

// In the TripManager.loadUserRole method, update the class assignment:
async loadUserRole(userId) {
  try {
    const snapshot = await database.ref('egy_user/' + userId).once('value');
    const userData = snapshot.val();
    
    if (!userData) {
      throw new AppError('User data not found', 'error');
    }
    
    this.state.updateUserRole(userData?.role || 'user');
    
    // Update UI with user data
    this.dom.setElementText('userRole', this.state.getState().currentUserRole);
    
    // Fix: Add classes separately instead of space-separated string
    this.dom.addClass('userRole', 'role-badge');
    const roleClass = this.state.getState().currentUserRole === 'admin' ? 'role-admin' : 
                     this.state.getState().currentUserRole === 'moderator' ? 'role-moderator' : 'role-user';
    this.dom.addClass('userRole', roleClass);
    
    this.dom.setInputValue('userEmail', userData.email || '');
    this.dom.setInputValue('userPhone', userData.phone || '');
    this.dom.setInputValue('userName', userData.username || '');
    
    const photoS = this.dom.getElement('profile-s');
    const photoPreview = this.dom.getElement('profile-pic-preview');
    if (userData.photo) {
      photoPreview.src = userData.photo;
      photoS.src = userData.photo;
    } else {
      photoPreview.src = 'https://via.placeholder.com/150';
      photoS.src = 'https://via.placeholder.com/150';
    }
    
    // Show/hide new trip button based on role
    if (this.canEditTrips()) {
      this.dom.showElement('newTripBtn');
      this.dom.showElement('emptyStateNewTripBtn');
    } else {
      this.dom.hideElement('newTripBtn');
      this.dom.hideElement('emptyStateNewTripBtn');
    }
    
    return userData;
  } catch (error) {
    if (error instanceof AppError) {
      error.log();
    } else {
      console.error('Error loading user role:', error);
    }
    uiUtils.showToast(error.message || 'Failed to load user data', 'error');
    throw error;
  }
}
