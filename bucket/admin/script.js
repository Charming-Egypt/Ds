const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

allSideMenu.forEach(item=> {
	const li = item.parentElement;

	item.addEventListener('click', function () {
		allSideMenu.forEach(i=> {
			i.parentElement.classList.remove('active');
		})
		li.classList.add('active');
	})
});




// TOGGLE SIDEBAR
const menuBar = document.querySelector('#content nav .bx.bx-menu');
const sidebar = document.getElementById('sidebar');

menuBar.addEventListener('click', function () {
	sidebar.classList.toggle('hide');
})







const searchButton = document.querySelector('#content nav form .form-input button');
const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
const searchForm = document.querySelector('#content nav form');

searchButton.addEventListener('click', function (e) {
	if(window.innerWidth < 576) {
		e.preventDefault();
		searchForm.classList.toggle('show');
		if(searchForm.classList.contains('show')) {
			searchButtonIcon.classList.replace('bx-search', 'bx-x');
		} else {
			searchButtonIcon.classList.replace('bx-x', 'bx-search');
		}
	}
})





if(window.innerWidth < 768) {
	sidebar.classList.add('hide');
} else if(window.innerWidth > 576) {
	searchButtonIcon.classList.replace('bx-x', 'bx-search');
	searchForm.classList.remove('show');
}


window.addEventListener('resize', function () {
	if(this.innerWidth > 576) {
		searchButtonIcon.classList.replace('bx-x', 'bx-search');
		searchForm.classList.remove('show');
	}
})











// Get all sidebar menu items and content sections
const sideMenuItems = document.querySelectorAll('#sidebar .side-menu li[data-section]');
const contentSections = document.querySelectorAll('.content-section');

// Function to show a specific section
function showSection(sectionId) {
  // Hide all content sections
  contentSections.forEach(section => {
    section.classList.remove('active');
    section.classList.add('hidden');
  });
  
  // Show the selected section
  const activeSection = document.getElementById(`${sectionId}-section`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
    activeSection.classList.add('active');
  }
  
  // Update active menu item
  sideMenuItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionId) {
      item.classList.add('active');
    }
  });
  
  // Store in localStorage
  localStorage.setItem('activeSection', sectionId);
}

// Function to handle sidebar clicks
function handleSidebarClick() {
  sideMenuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.dataset.section;
      showSection(sectionId);
      
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('hide');
      }
    });
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  handleSidebarClick();
  
  // Check for saved active section
  const savedSection = localStorage.getItem('activeSection');
  const defaultSection = sideMenuItems[0]?.dataset.section || 'dashboard';
  
  // Show either saved section or default
  showSection(savedSection || defaultSection);
});




// Cookie helper function
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }



    
      const isUserLoggedIn = getCookie('username');

      

      if (isUserLoggedIn) {
        document.getElementById('userName').value = isUserLoggedIn;
        document.getElementById('userEmail').value = getCookie('email');
        document.getElementById('userPhone').value = getCookie('phone');
        const backgroundImageUrl = getCookie('photo');
        
        // Set default profile photo if none exists
        const profilePhoto = document.querySelector('.profile-photo');
        profilePhoto.src = backgroundImageUrl || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        profilePhoto.onerror = function() {
          this.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        };


const profilePhoto2 = document.querySelector('.profile-photo2');
        profilePhoto2.src = backgroundImageUrl || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        profilePhoto2.onerror = function() {
          this.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        };
        

      } else {
        
      } 
















document.addEventListener("DOMContentLoaded", function() {
    // Form elements
    const payoutForm = document.getElementById('payoutForm');
    const payoutMethod = document.getElementById('payoutMethod');
    const bankFields = document.getElementById('bankFields');
    const bankName = document.getElementById('bankName');
    const branchName = document.getElementById('branchName');

    // Debug initialization
    console.log('Payout System Initializing...');
    console.log('Elements:', {
        form: !!payoutForm,
        methodSelect: !!payoutMethod,
        bankFields: !!bankFields,
        bankName: !!bankName,
        branchName: !!branchName
    });

    // Enhanced toggle function with validation
    function toggleBankFields() {
        if (!payoutMethod || !bankFields) {
            console.error('Essential elements missing for toggle');
            return;
        }

        const isBankAccount = payoutMethod.value === 'bankAccount';
        console.log(`Toggling bank fields (${isBankAccount ? 'show' : 'hide'})`);

        bankFields.style.display = isBankAccount ? 'block' : 'none';
        
        if (bankName && branchName) {
            bankName.required = isBankAccount;
            branchName.required = isBankAccount;
        }
    }

    // Initialize form state
    toggleBankFields();
    payoutMethod.addEventListener('change', toggleBankFields);

    // Firebase form submission
    payoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate Firebase availability
        if (typeof firebase === 'undefined' || !firebase.database) {
            showAlert("Firebase not loaded. Please refresh the page.", "error");
            return;
        }

        const userId = getCookie('uid');
        if (!userId) {
            showAlert("User not authenticated. Please login again.", "error");
            return;
        }

        // Get form elements safely
        const nameEl = document.getElementById("name");
        const accountEl = document.getElementById("accountNumber");
        
        if (!nameEl || !accountEl) {
            showAlert("Form elements missing. Please refresh the page.", "error");
            return;
        }

        // Prepare data with validation
        const payoutData = {
            method: payoutMethod.value,
            name: nameEl.value.trim(),
            accountNumber: accountEl.value.trim(),
            updatedAt: Date.now()
        };

        // Validate required fields
        if (!payoutData.name || !payoutData.accountNumber) {
            showAlert("Name and account number are required", "error");
            return;
        }

        // Add bank details if applicable
        if (payoutData.method === "bankAccount") {
            if (!bankName || !branchName) {
                showAlert("Bank fields not found", "error");
                return;
            }

            payoutData.bankName = bankName.value.trim();
            payoutData.branchName = branchName.value.trim();
            
            if (!payoutData.bankName || !payoutData.branchName) {
                showAlert("Bank name and branch are required", "error");
                return;
            }
        }

        // UI feedback
        const submitBtn = payoutForm.querySelector('.save-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        }

        try {
            // Firebase save operation
            console.log("Saving to Firebase:", payoutData);
            await firebase.database().ref(`egy_user/${userId}/payout_method`).set(payoutData);
            
            // Success handling
            showAlert("Payout method saved successfully!", "success");
            console.log("Save successful");
            
            // Optional: Reset form after successful save
            // payoutForm.reset();
            // toggleBankFields();

        } catch (error) {
            console.error("Firebase save error:", error);
            showAlert(`Save failed: ${error.message}`, "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Save';
            }
        }
    });

    // Enhanced alert function
    function showAlert(message, type = "success") {
        // Remove existing alerts first
        document.querySelectorAll('.custom-alert').forEach(el => el.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert fixed top-4 right-4 p-4 rounded-md shadow-lg ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white z-50 transform transition-all duration-300`;
        
        alertDiv.innerHTML = `
            <div class="flex items-center">
                <i class="bx ${type === 'success' ? 'bx-check-circle' : 'bx-error'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Animate in
        setTimeout(() => {
            alertDiv.classList.remove('opacity-0', 'translate-y-4');
        }, 10);
        
        // Auto-dismiss
        setTimeout(() => {
            alertDiv.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => alertDiv.remove(), 300);
        }, 5000);
    }

    
});
