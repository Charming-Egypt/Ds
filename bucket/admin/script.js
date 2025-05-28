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




document.getElementById("editPayoutMethod").addEventListener("click", function () {
    const form = document.getElementById("payoutForm");
    if (form.classList.contains("disabled")) {
        form.classList.remove("disabled");
        this.textContent = "Save Changes";
    } else {
        form.classList.add("disabled");
        this.textContent = "Edit Payout Method";

        // Save changes to Firebase
        savePayoutMethod();
    }
});


function savePayoutMethod() {
    const userId = getCookie('userId'); // Replace with actual user ID retrieval logic
    const payoutMethod = document.querySelector('input[name="payoutMethod"]:checked').value;
    const name = document.getElementById("name").value;
    const accountNumber = document.getElementById("accountNumber").value;
    const bankName = document.getElementById("bankName").value;
    const branchName = document.getElementById("branchName").value;

    const payoutData = {
        method: payoutMethod,
        name,
        accountNumber,
        bankName,
        branchName,
        updatedAt: Date.now()
    };

    firebase.database().ref(`egy_user/${userId}/payout_method`).set(payoutData)
        .then(() => {
            alert("Payout method updated successfully.");
        })
        .catch((error) => {
            console.error("Error updating payout method:", error);
            alert("Failed to update payout method.");
        });
}


document.addEventListener("DOMContentLoaded", function() {
    // Get form elements
    const form = document.getElementById('payoutForm');
    const payoutMethod = document.getElementById('payoutMethod');
    const bankFields = document.getElementById('bankFields');
    const bankName = document.getElementById('bankName');
    const branchName = document.getElementById('branchName');

    // Toggle bank fields visibility and requirement
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
    form.addEventListener('submit', function(e) {
        if (!form.checkValidity()) {
            e.preventDefault();
            // Add visual feedback for invalid fields
            form.classList.add('was-validated');
        } else {
            // Proceed with form submission
            console.log('Form submitted with method:', payoutMethod.value);
            // Add AJAX submission or other logic here
        }
    });
});
