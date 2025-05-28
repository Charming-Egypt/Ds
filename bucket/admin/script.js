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
    


  
    // Toggle bank fields visibility
    function toggleBankFields() {
        const showBankFields = payoutMethod.value === 'bankAccount';
        bankFields.style.display = showBankFields ? 'block' : 'none';
        bankName.required = showBankFields;
        branchName.required = showBankFields;
    }

    // Initialize on load
    toggleBankFields();
    
    // Handle method change
    payoutMethod.addEventListener('change', toggleBankFields);

    // Form submission
    payoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const userId = getCookie('userId');
        try {
            // Validate user
            if (!userId) {
                throw new Error("User not authenticated");
            }

            // Get form values
            const method = payoutMethod.value;
            const name = document.getElementById("name").value.trim();
            const accountNumber = document.getElementById("accountNumber").value.trim();

            // Validate required fields
            if (!name || !accountNumber) {
                throw new Error("Name and account number are required");
            }

            // Prepare data object
            const payoutData = {
                method,
                name,
                accountNumber,
                updatedAt: Date.now()
            };

            // Add bank details if method is bankAccount
            if (method === "bankAccount") {
                payoutData.bankName = bankName.value.trim();
                payoutData.branchName = branchName.value.trim();
                
                if (!payoutData.bankName || !payoutData.branchName) {
                    throw new Error("Bank name and branch are required for bank transfers");
                }
            }

            // Disable button during submission
            const submitBtn = payoutForm.querySelector('.save-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            // Save to Firebase
            await firebase.database().ref(`egy_user/${userId}/payout_method`).set(payoutData);
            
            // Show success
            showAlert("Payout method saved successfully!", "success");
            
        } catch (error) {
            console.error("Save error:", error);
            showAlert(error.message || "Failed to save payout method", "error");
        } finally {
            // Re-enable button
            const submitBtn = payoutForm.querySelector('.save-btn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Save';
        }
    });

    // Custom alert function
    function showAlert(message, type = "success") {
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
});
