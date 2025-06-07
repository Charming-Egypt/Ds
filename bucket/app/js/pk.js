// Initialize Swiper
let swiper;
let currentVideoSlide = null;

// Global variables
let packageData = {};
let currentPackage = {};
let accommodationOptions = {};
let mealPlanOptions = {};
let transportationOptions = {};
let selectedAccommodation = "";
let selectedMealPlan = "";
let selectedTransportation = "shared";
let iti; // For phone input
const refNumber = generateReference();
let currentUserUid = '';
let packageOwnerId = '';
const MAX_PER_TYPE = 10;
const MAX_ROOMS = 10;
const FIXED_FEE = 3; // Fixed 3 EGP fee
const TAX_RATE = 0.03; // 3% tax
const TAX_ON_TAX_RATE = 0.14; // 14% on the 3%
let exchangeRate = 50; // Default exchange rate (will be updated from Firebase)
let currentStep = 0;

// Get package name from URL parameter
function getPackageIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('package-id');
}
const packageId = getPackageIdFromURL();

// Utility Functions (same as before)
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'PKG_' + result;
}

function sanitizeInput(input) {
  if (!input) return '';
  return input.toString().replace(/[<>]/g, "").trim();
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.classList.add('border-red-500');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

function clearError(elementId) {
  const element = document.getElementById(elementId);
  const errorElement = document.getElementById(`${elementId}Error`);
  if (element && errorElement) {
    element.classList.remove('border-red-500');
    errorElement.classList.add('hidden');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement("div");
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function showSpinner() {
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  if (spinner) spinner.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = true;
}

function hideSpinner() {
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  if (spinner) spinner.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = false;
}

// Form Navigation Functions (updated for package steps)
function updateProgressBar() {
  const progressPercentage = (currentStep + 1) * 25;
  document.getElementById('progressBar').style.width = `${progressPercentage}%`;
  
  // Update step indicators
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}Indicator`);
    if (indicator) {
      indicator.dataset.active = (i === currentStep + 1) ? "true" : "false";
      if (indicator.dataset.active === "true") {
        indicator.classList.add('text-yellow-500');
        indicator.classList.remove('text-gray-500');
      } else {
        indicator.classList.add('text-gray-500');
        indicator.classList.remove('text-yellow-500');
      }
    }
  }
}

function nextStep() {
  if (!validateCurrentStep()) return;
  
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  
  // Show/hide appropriate buttons
  if (currentStep === 3) {
    document.getElementById('submitBtn').classList.remove('hidden');
  } else {
    document.getElementById('submitBtn').classList.add('hidden');
  }
  
  updateProgressBar();
  updateSummary();
}

function prevStep() {
  document.getElementById(`step${currentStep + 1}`).classList.remove('active');
  currentStep--;
  document.getElementById(`step${currentStep + 1}`).classList.add('active');
  
  // Hide submit button when going back
  document.getElementById('submitBtn').classList.add('hidden');
  
  updateProgressBar();
}

// Exchange Rate Function (same as before)
async function fetchExchangeRate() {
  try {
    const snapshot = await db.ref('exchangeRates').once('value');
    const rateData = snapshot.val();
    if (rateData && rateData.rate) {
      exchangeRate = parseFloat(rateData.rate);
    }
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
  }
}

// Package Data Functions
async function fetchAllPackageData() {
  try {
    showSpinner();
    const snapshot = await db.ref('packages').once('value');
    const allPackagesData = snapshot.val();
    
    if (!allPackagesData) {
      console.warn("No package data found in Firebase.");
      showToast("No packages available at the moment. Please check back later.", 'error');
      return {};
    }
    
    packageData = allPackagesData;
    
    if (packageId && allPackagesData[packageId]) {
      currentPackage = allPackagesData[packageId];
      currentPackage.basePrice = currentPackage.price || 0;
      currentPackage.commissionRate = currentPackage.commission || 0.15;
      
      // Load package options
      accommodationOptions = currentPackage.accommodationOptions || {};
      mealPlanOptions = currentPackage.mealPlanOptions || {};
      transportationOptions = currentPackage.transportationOptions || {};
      
      packageOwnerId = currentPackage.owner || '';
      
      // Populate UI with package data
      populateAccommodationOptions(accommodationOptions);
      populateMealPlanOptions(mealPlanOptions);
      displayPackageInfo(currentPackage);
      
      // Load dynamic content
      loadMediaContent(currentPackage.media);
      loadIncludedNotIncluded(currentPackage);
      loadItinerary(currentPackage.itinerary);
      loadHighlights(currentPackage.highlights);
      updateRating(currentPackage.rating);
      
      // Update price display
      updatePriceDisplay();
    } else {
      showToast("Package not found. Please check the URL.", 'error');
      console.error("Package not found:", packageId);
    }
    
    return allPackagesData;
  } catch (error) {
    console.error("Error fetching package data:", error);
    showToast("Failed to load package data. Please refresh the page.", 'error');
    throw error;
  } finally {
    hideSpinner();
  }
}

function populateAccommodationOptions(options) {
  const container = document.getElementById('accommodationOptions');
  if (!container) return;

  container.innerHTML = '';
  
  Object.entries(options).forEach(([id, option]) => {
    const optionElement = document.createElement('div');
    optionElement.className = 'accommodation-option p-4 border border-gray-700 rounded-lg cursor-pointer hover:border-yellow-500';
    optionElement.dataset.id = id;
    optionElement.innerHTML = `
      <div class="font-bold">${option.name}</div>
      <div class="text-sm text-gray-400">${option.description || ''}</div>
      <div class="mt-2 text-yellow-500 font-bold notranslate">${option.pricePerNight} EGP/night</div>
    `;
    
    optionElement.addEventListener('click', () => {
      document.querySelectorAll('.accommodation-option').forEach(el => el.classList.remove('selected'));
      optionElement.classList.add('selected');
      selectedAccommodation = id;
      updateSummary();
    });
    
    container.appendChild(optionElement);
  });
}

function populateMealPlanOptions(options) {
  const container = document.getElementById('mealPlanOptions');
  if (!container) return;

  container.innerHTML = '';
  
  Object.entries(options).forEach(([id, option]) => {
    const optionElement = document.createElement('div');
    optionElement.className = 'meal-plan-option px-4 py-2 border border-gray-700 rounded-full cursor-pointer hover:bg-yellow-500 hover:text-black';
    optionElement.dataset.id = id;
    optionElement.textContent = `${option.name} (+${option.pricePerPerson} EGP)`;
    
    optionElement.addEventListener('click', () => {
      document.querySelectorAll('.meal-plan-option').forEach(el => el.classList.remove('selected'));
      optionElement.classList.add('selected');
      selectedMealPlan = id;
      updateSummary();
    });
    
    container.appendChild(optionElement);
  });
}

function updatePriceDisplay() {
  const priceElement = document.getElementById('packagePrice');
  if (priceElement && currentPackage.price) {
    // Calculate starting price (minimum configuration)
    const startingPrice = calculateTotalWithTaxesAndCommission(1, 0, 1, '', '', 'shared');
    const priceInUSD = (startingPrice / exchangeRate).toFixed(2);
    priceElement.innerHTML = `
      <span class="notranslate">Starting from ${priceInUSD} $</span>
      <span class="text-sm text-gray-500 notranslate">(${Math.round(startingPrice)} EGP)</span>
    `;
  }
}

function updateRating(ratingData) {
  if (!ratingData) return;
  
  const ratingStars = document.getElementById('ratingStars');
  const ratingCount = document.getElementById('ratingCount');
  
  if (ratingStars && ratingCount) {
    // Clear existing stars
    ratingStars.innerHTML = '';
    
    const averageRating = ratingData.average || 0;
    const reviewCount = ratingData.count || 0;
    
    // Add full stars
    const fullStars = Math.floor(averageRating);
    for (let i = 0; i < fullStars; i++) {
      ratingStars.innerHTML += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (averageRating % 1 >= 0.5) {
      ratingStars.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    const emptyStars = 5 - Math.ceil(averageRating);
    for (let i = 0; i < emptyStars; i++) {
      ratingStars.innerHTML += '<i class="far fa-star"></i>';
    }
    
    // Update review count
    ratingCount.textContent = `(${reviewCount} reviews)`;
  }
}

function loadMediaContent(mediaData) {
  // Similar to trip version but with package-specific styling
  // (Implementation would be nearly identical)
}

function loadHighlights(highlights) {
  const container = document.getElementById('packageHighlights');
  if (!container || !highlights) return;
  
  container.innerHTML = '';
  
  highlights.forEach(highlight => {
    const highlightElement = document.createElement('div');
    highlightElement.className = 'flex items-start gap-3 p-3 bg-gray-800 rounded-lg';
    highlightElement.innerHTML = `
      <i class="fas fa-check text-yellow-500 mt-1"></i>
      <div>
        <div class="font-bold">${highlight.title}</div>
        ${highlight.description ? `<div class="text-sm text-gray-400">${highlight.description}</div>` : ''}
      </div>
    `;
    container.appendChild(highlightElement);
  });
}

function loadIncludedNotIncluded(packageData) {
  // Similar to trip version
}

function loadItinerary(itineraryData) {
  const container = document.getElementById('packageItinerary');
  if (!container || !itineraryData) return;
  
  container.innerHTML = '';
  
  itineraryData.forEach((day, index) => {
    const dayElement = document.createElement('div');
    dayElement.className = 'package-itinerary-day p-4 mb-4';
    dayElement.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <div class="day-number bg-yellow-500 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center">${index + 1}</div>
        <h3 class="font-bold text-lg">${day.title}</h3>
      </div>
      <div class="pl-11">
        ${day.description ? `<p class="mb-3">${day.description}</p>` : ''}
        ${day.activities ? `
          <div class="activities">
            ${day.activities.map(activity => `
              <div class="flex items-start gap-3 mb-2">
                <i class="fas fa-circle text-yellow-500 text-xs mt-2"></i>
                <div>
                  ${activity.time ? `<div class="text-sm text-gray-400">${activity.time}</div>` : ''}
                  <div>${activity.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${day.meals ? `
          <div class="mt-3">
            <div class="text-sm text-gray-400 mb-1">Meals included:</div>
            <div class="flex flex-wrap gap-2">
              ${day.meals.map(meal => `
                <span class="px-2 py-1 bg-gray-700 rounded-full text-sm">${meal}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    container.appendChild(dayElement);
  });
}

function displayPackageInfo(packageInfo) {
  const packageTitle = document.getElementById('packageTitle');
  const packageName = document.getElementById('packageName');
  const packageDuration = document.getElementById('packageDuration');
  const packageNights = document.getElementById('packageNights');
  const packageDestinations = document.getElementById('packageDestinations');
  
  if (packageTitle && packageInfo.name) {
    packageTitle.textContent = packageInfo.name;
  }
  
  if (packageName) {
    packageName.value = packageId;
  }
  
  if (packageDuration && packageInfo.duration) {
    packageDuration.textContent = `${packageInfo.duration} days`;
  }
  
  if (packageNights && packageInfo.duration) {
    packageNights.textContent = `${packageInfo.duration - 1} nights`;
  }
  
  if (packageDestinations && packageInfo.destinations) {
    packageDestinations.textContent = packageInfo.destinations.join(', ');
  }
}

// Price Calculation Functions (updated for packages)
function calculateBaseTotal(adults, childrenUnder12, rooms) {
  if (!currentPackage.basePrice) return 0;
  
  const basePrice = parseInt(currentPackage.basePrice);
  const nights = currentPackage.duration ? currentPackage.duration - 1 : 1;
  
  // Calculate per room price (assuming double occupancy)
  const perRoomPrice = basePrice * nights;
  
  // Calculate total for all rooms
  return rooms * perRoomPrice;
}

function calculateExtraServicesTotal(adults, childrenUnder12, selectedAccommodation, selectedMealPlan, selectedTransportation) {
  let total = 0;
  const nights = currentPackage.duration ? currentPackage.duration - 1 : 1;
  
  // Accommodation upgrade cost
  if (selectedAccommodation && accommodationOptions[selectedAccommodation]) {
    const baseAccommodationPrice = currentPackage.baseAccommodationPrice || 0;
    const upgradePrice = accommodationOptions[selectedAccommodation].pricePerNight - baseAccommodationPrice;
    total += upgradePrice * nights;
  }
  
  // Meal plan cost
  if (selectedMealPlan && mealPlanOptions[selectedMealPlan]) {
    total += mealPlanOptions[selectedMealPlan].pricePerPerson * (adults + childrenUnder12) * nights;
  }
  
  // Transportation cost
  if (selectedTransportation === 'private' && transportationOptions.private) {
    total += transportationOptions.private.price;
  }
  
  return total;
}

function calculateNetTotal() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const rooms = parseInt(document.getElementById('rooms').value) || 1;
  
  return calculateBaseTotal(adults, childrenUnder12, rooms) + 
         calculateExtraServicesTotal(adults, childrenUnder12, selectedAccommodation, selectedMealPlan, selectedTransportation);
}

function calculateTotalWithTaxesAndCommission() {
  const netTotal = calculateNetTotal();
  const baseTax = netTotal * TAX_RATE; // 3% of net total
  const taxOnTax = baseTax * TAX_ON_TAX_RATE; // 14% of the 3%
  const totalTax = baseTax + taxOnTax + FIXED_FEE;
  const subtotalWithTax = netTotal + totalTax;
  const commissionRate = currentPackage.commissionRate || 0.15;
  const commission = subtotalWithTax * commissionRate;
  return subtotalWithTax + commission;
}

function updateSummary() {
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
  const rooms = parseInt(document.getElementById('rooms').value) || 1;
  
  const summaryDate = document.getElementById("summaryDate");
  const summaryRef = document.getElementById("summaryRef");
  const summaryPackage = document.getElementById("summaryPackage");
  const summaryDuration = document.getElementById("summaryDuration");
  const summaryAccommodation = document.getElementById("summaryAccommodation");
  const summaryMealPlan = document.getElementById("summaryMealPlan");
  const summaryTransportation = document.getElementById("summaryTransportation");
  const summaryAdults = document.getElementById("summaryAdults");
  const summaryChildrenUnder12 = document.getElementById("summaryChildrenUnder12");
  const summaryRooms = document.getElementById("summaryRooms");
  const totalPriceDisplay = document.getElementById("totalPriceDisplay");
  
  if (summaryDate) summaryDate.textContent = document.getElementById("packageDate").value || "Not specified";
  if (summaryRef) summaryRef.textContent = refNumber;
  
  if (currentPackage.basePrice) {
    const nights = currentPackage.duration ? currentPackage.duration - 1 : 1;
    
    if (summaryPackage) summaryPackage.textContent = currentPackage.name;
    if (summaryDuration) summaryDuration.textContent = `${currentPackage.duration} days / ${nights} nights`;
    
    if (summaryAdults) summaryAdults.textContent = `${adults} Adult${adults !== 1 ? 's' : ''}`;
    if (summaryChildrenUnder12) summaryChildrenUnder12.textContent = `${childrenUnder12} Child${childrenUnder12 !== 1 ? 'ren' : ''}`;
    if (summaryRooms) summaryRooms.textContent = `${rooms} Room${rooms !== 1 ? 's' : ''}`;
    
    if (selectedAccommodation && accommodationOptions[selectedAccommodation]) {
      summaryAccommodation.textContent = accommodationOptions[selectedAccommodation].name;
    } else {
      summaryAccommodation.textContent = 'Standard';
    }
    
    if (selectedMealPlan && mealPlanOptions[selectedMealPlan]) {
      summaryMealPlan.textContent = mealPlanOptions[selectedMealPlan].name;
    } else {
      summaryMealPlan.textContent = 'None';
    }
    
    if (selectedTransportation) {
      summaryTransportation.textContent = selectedTransportation === 'private' ? 'Private Transfer' : 
                                        selectedTransportation === 'none' ? 'Not Needed' : 'Shared Transfer';
    }
    
    const total = calculateTotalWithTaxesAndCommission();
    const totalUSD = (total / exchangeRate).toFixed(2);
    
    if (totalPriceDisplay) {
      totalPriceDisplay.innerHTML = `
        <div class="font-bold text-xl notranslate">${totalUSD} $</div>
        <div class="text-sm text-green-600 mt-1 notranslate">${total.toFixed(2)} EGP</div>
        <div class="text-xs text-gray-500">Exchange rate: 1 USD = ${exchangeRate} EGP</div>
        <div class="text-xs text-gray-500">all taxes included</div>
      `;
    }
  }
}

// Form Validation (updated for package steps)
function validateCurrentStep() {
  let isValid = true;
  
  if (currentStep === 0) {
    // Personal info validation (same as before)
  } else if (currentStep === 1) {
    // Package options validation
    const packageDate = document.getElementById("packageDate")?.value.trim();
    
    if (!packageDate) {
      showError('packageDate', 'Please select a start date');
      isValid = false;
    } else {
      clearError('packageDate');
    }
    
    // Validate that at least standard accommodation is selected
    if (!selectedAccommodation) {
      showToast('Please select an accommodation type', 'error');
      isValid = false;
    }
  }
  
  return isValid;
}

// Form Submission (updated for packages)
async function submitForm() {
  if (!validateCurrentStep()) return;
  showSpinner();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in to complete your booking');
    }

    const adults = parseInt(document.getElementById('adults').value) || 0;
    const childrenUnder12 = parseInt(document.getElementById('childrenUnder12').value) || 0;
    const rooms = parseInt(document.getElementById('rooms').value) || 1;
    const nights = currentPackage.duration ? currentPackage.duration - 1 : 1;
    
    const total = calculateTotalWithTaxesAndCommission();
    const netTotal = calculateNetTotal();
    const baseTax = netTotal * TAX_RATE;
    const taxOnTax = baseTax * TAX_ON_TAX_RATE;
    const totalTax = baseTax + taxOnTax + FIXED_FEE;
    const subtotalWithTax = netTotal + totalTax;
    const commissionRate = currentPackage.commissionRate || 0.15;
    const commission = subtotalWithTax * commissionRate;

    const formData = {
      refNumber,
      username: sanitizeInput(document.getElementById("username").value),
      email: sanitizeInput(document.getElementById("customerEmail").value),
      phone: iti.getNumber(),
      packageDate: document.getElementById("packageDate").value,
      packageId,
      packageName: currentPackage.name,
      duration: currentPackage.duration,
      nights,
      basePrice: currentPackage.basePrice,
      timestamp: Date.now(),
      status: "pending",
      adults,
      childrenUnder12,
      rooms,
      currency: 'EGP',
      total: total.toFixed(2),
      netTotal: netTotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      commission: commission.toFixed(2),
      uid: user.uid,
      owner: packageOwnerId,
      exchangeRate: exchangeRate,
      accommodation: selectedAccommodation || 'standard',
      mealPlan: selectedMealPlan || 'none',
      transportation: selectedTransportation || 'shared',
      specialRequests: document.getElementById("specialRequests").value || ''
    };

    // Generate payment hash (same as before)
    // Save booking to Firebase
    await db.ref('package-bookings').child(refNumber).set({
      ...formData,
      paymenturl: kashierUrl,
    });

    showToast('Package booking submitted! Redirecting to payment...');
    window.location.href = kashierUrl;
    
  } catch (error) {
    console.error('Submission Error:', error);
    showToast(`Error: ${error.message || 'Failed to process booking. Please try again.'}`, 'error');
    hideSpinner();
  }
}

// Initialize Number Controls (updated for packages)
function initNumberControls() {
  // Adults controls (same as before)
  // Children controls (same as before)
  
  // Rooms controls
  const roomsPlus = document.getElementById('roomsPlus');
  const roomsMinus = document.getElementById('roomsMinus');
  
  if (roomsPlus && roomsMinus) {
    roomsPlus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('rooms');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue < MAX_ROOMS) {
        input.value = currentValue + 1;
        updateSummary();
      }
    });
    
    roomsMinus.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('rooms');
      if (!input) return;
      
      const currentValue = parseInt(input.value);
      if (currentValue > 1) {
        input.value = currentValue - 1;
        updateSummary();
      }
    });
  }
}

// Initialize the application
window.onload = async function () {
  // Check if package ID is provided
  if (!packageId) {
    showToast("No package specified. Please access this page through a valid package link.", 'error');
    return;
  }

  // Initialize phone input (same as before)
  // Initialize number controls
  initNumberControls();

  // Initialize date picker (same as before)
  
  // Transportation change handler
  document.getElementById('transportation').addEventListener('change', function() {
    selectedTransportation = this.value;
    updateSummary();
  });

  // Form submission handler
  document.getElementById('submitBtn').addEventListener('click', submitForm);

  // Initialize user authentication (same as before)
  
  // Initialize components
  await Promise.all([
    populateForm(),
    fetchExchangeRate(),
    fetchAllPackageData()
  ]);
  
  // Set initial summary values
  updateSummary();
};
