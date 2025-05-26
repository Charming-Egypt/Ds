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



const switchMode = document.getElementById('switch-mode');

switchMode.addEventListener('change', function () {
	if(this.checked) {
		document.body.classList.add('dark');
	} else {
		document.body.classList.remove('dark');
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


document.addEventListener("DOMContentLoaded", function () {
  const bankAccountRadio = document.getElementById("bankAccount");
  const walletRadio = document.getElementById("wallet");
  const bankFields = document.getElementById("bankFields");

  // Function to toggle visibility based on selected radio
  function toggleBankFields() {
    if (bankAccountRadio.checked) {
      bankFields.style.display = "block";
    } else {
      bankFields.style.display = "none";
    }
  }

  // Initial check on page load
  toggleBankFields();

  // Add event listeners to radios
  bankAccountRadio.addEventListener("change", toggleBankFields);
  walletRadio.addEventListener("change", toggleBankFields);
});








function loadReservations(userId) {
  const tbody = document.getElementById("reservations-list");
  const emptyState = document.getElementById("emptyReservations");
  tbody.innerHTML = ""; // Clear existing rows

  firebase.database().ref(`trip-bookings`)
    .orderByChild("uid")
    .equalTo(userId)
    .on("value", (snapshot) => {
      if (!snapshot.exists()) {
        emptyState.classList.remove("hidden");
        return;
      }
      emptyState.classList.add("hidden");

      snapshot.forEach((childSnapshot) => {
        const res = childSnapshot.val();
        const bookingId = childSnapshot.key;

        const statusClass = res.status === "confirmed"
          ? "bg-green-100 text-green-800"
          : res.status === "pending"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800";

        const paymentClass = res.paymentStatus === "paid"
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-800";

        const row = `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3">${bookingId || "-"}</td>
            <td class="px-4 py-3">${res.username || "-"}</td>
            <td class="px-4 py-3">${res.tripDate || "-"}</td>
            <td class="px-4 py-3">${res.adults || 0} Adult(s)<br><span class="text-xs text-gray-500">${res.childrenUnder12 || 0} Children</span></td>
            <td class="px-4 py-3">EGP ${(parseFloat(res.total) || 0).toFixed(2)}</td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                ${capitalizeFirstLetter(res.status || "N/A")}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentClass}">
                ${capitalizeFirstLetter(res.paymentStatus || "Pending")}
              </span>
            </td>
            <td class="px-4 py-3 space-x-2">
              <button onclick="viewReservation('${bookingId}')" class="text-blue-600 hover:underline">View</button>
            </td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    });
}

// Helper function
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function viewReservation(id) {
  alert("Viewing reservation: " + id);
}
