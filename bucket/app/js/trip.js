// ==========================================================================
// DISCOVER SHARM - Original Booking System Restored
// ==========================================================================

let swiper, currentVideoSlide = null;
let tripData = {}, currentTrip = {}, tourTypes = {}, selectedTripType = "";
let iti;
const refNumber = generateReference();
let currentUserUid = '', tripOwnerId = '';
const MAX_PER_TYPE = 10, MAX_INFANTS_PER_ADULT = 2, MAX_TOTAL_INFANTS = 10;
let currentStep = 0, mobileCurrentStep = 0;
let currentCurrency = 'EGP', exchangeRates = { EGP: 1 }, ratesLoaded = false;
let tripReviews = [], currentUserReview = null;

function getTripIdFromURL() { return new URLSearchParams(window.location.search).get('trip-id'); }
const tripPName = getTripIdFromURL();

// ==========================================================================
// CURRENCY
// ==========================================================================
function getCurrentCurrencyFromHeader() {
  if (window.SharmCurrency?.get) return window.SharmCurrency.get();
  return localStorage.getItem('preferredCurrency') || 'EGP';
}
function getExchangeRatesFromHeader() { return window.SharmCurrency?.rates || null; }
function formatPrice(p) {
  if (!ratesLoaded || currentCurrency === 'EGP') return parseFloat(p).toFixed(2) + ' EGP';
  const c = p * exchangeRates[currentCurrency];
  if (currentCurrency === 'USD') return '$' + c.toFixed(2);
  if (currentCurrency === 'EUR') return '€' + c.toFixed(2);
  if (currentCurrency === 'GBP') return '£' + c.toFixed(2);
  return p.toFixed(2) + ' EGP';
}

// ==========================================================================
// UTILITY
// ==========================================================================
function generateReference() { const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r=''; for(let i=0;i<10;i++) r+=c.charAt(Math.floor(Math.random()*c.length)); return 'DS-'+r; }
function sanitizeInput(s) { return s ? s.toString().replace(/[<>]/g,"").trim() : ''; }
function isMobile() { return window.innerWidth <= 768; }
function showToast(m, t='success') {
  const existing = document.querySelector('.toast'); if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#252526;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ${t==='success'?'#22c55e':'#ef4444'};white-space:nowrap;`;
  toast.textContent = m; document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='0.3s'; setTimeout(()=>toast.remove(),300); }, 4000);
}
function showSpinner() { document.getElementById('spinner')?.classList.remove('hidden'); const b=document.getElementById('submitBtn'); if(b)b.disabled=true; }
function hideSpinner() { document.getElementById('spinner')?.classList.add('hidden'); const b=document.getElementById('submitBtn'); if(b)b.disabled=false; }

// ==========================================================================
// STEPPER
// ==========================================================================
function changeValue(id, delta) {
  const input = document.getElementById(id);
  if (!input) return;
  let val = parseInt(input.value) || 0;
  const max = id === 'infants' ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
  const min = id === 'adults' ? 1 : 0;
  val = Math.max(min, Math.min(max, val + delta));
  input.value = val;
  if (id === 'adults') updateInfantsMax();
  updateSummary();
}
function changeMobileValue(id, delta) {
  const input = document.getElementById(id);
  if (!input) return;
  let val = parseInt(input.value) || 0;
  const max = id === 'mobileInfants' ? MAX_TOTAL_INFANTS : MAX_PER_TYPE;
  const min = id === 'mobileAdults' ? 1 : 0;
  val = Math.max(min, Math.min(max, val + delta));
  input.value = val;
  updateMobileSummary();
}
function updateInfantsMax() {
  const a = document.getElementById('adults'), inf = document.getElementById('infants');
  if (!a || !inf) return;
  const max = Math.min((parseInt(a.value)||0) * MAX_INFANTS_PER_ADULT, MAX_TOTAL_INFANTS);
  if (parseInt(inf.value) > max) inf.value = max;
}

// ==========================================================================
// DESKTOP NAVIGATION
// ==========================================================================
function nextStep() {
  if (!validateStep()) return;
  document.getElementById('step' + (currentStep + 1)).classList.remove('active');
  currentStep++;
  document.getElementById('step' + (currentStep + 1))?.classList.add('active');
  updateProgressBar(); updateSummary();
}
function prevStep() {
  document.getElementById('step' + (currentStep + 1)).classList.remove('active');
  currentStep--;
  document.getElementById('step' + (currentStep + 1))?.classList.add('active');
  updateProgressBar();
}
function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = ((currentStep + 1) * 25) + '%';
  document.querySelectorAll('.desktop-booking .step-label').forEach((s, i) => s.classList.toggle('active', i === currentStep));
}
function validateStep() {
  if (currentStep === 0) {
    if (!document.getElementById('username')?.value.trim()) { showToast('Enter your name', 'error'); return false; }
    const em = document.getElementById('customerEmail')?.value.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showToast('Enter valid email', 'error'); return false; }
    if (iti && (!iti.getNumber() || !iti.isValidNumber())) { showToast('Enter valid phone', 'error'); return false; }
  } else if (currentStep === 1) {
    if (!document.getElementById('tripDate')?.value.trim()) { showToast('Select date', 'error'); return false; }
    if (!document.getElementById('hotelName')?.value.trim()) { showToast('Enter hotel name', 'error'); return false; }
    if (!document.getElementById('roomNumber')?.value.trim()) { showToast('Enter room number', 'error'); return false; }
  }
  return true;
}

// ==========================================================================
// MOBILE NAVIGATION
// ==========================================================================
function mobileNextStep() {
  if (!validateMobileStep()) return;
  document.getElementById('mobileStep' + (mobileCurrentStep + 1)).classList.remove('active');
  mobileCurrentStep++;
  document.getElementById('mobileStep' + (mobileCurrentStep + 1))?.classList.add('active');
  updateMobileProgressBar(); updateMobileSummary();
  document.getElementById('mobileBookingSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function mobilePrevStep() {
  document.getElementById('mobileStep' + (mobileCurrentStep + 1)).classList.remove('active');
  mobileCurrentStep--;
  document.getElementById('mobileStep' + (mobileCurrentStep + 1))?.classList.add('active');
  updateMobileProgressBar();
}
function updateMobileProgressBar() {
  const bar = document.getElementById('mobileProgressBar');
  if (bar) bar.style.width = ((mobileCurrentStep + 1) * 25) + '%';
  document.querySelectorAll('#mobileBookingSection .step-label').forEach((s, i) => s.classList.toggle('active', i === mobileCurrentStep));
}
function validateMobileStep() {
  if (mobileCurrentStep === 0) {
    if (!document.getElementById('mobileUsername')?.value.trim()) { showToast('Enter your name', 'error'); return false; }
    const em = document.getElementById('mobileCustomerEmail')?.value.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showToast('Enter valid email', 'error'); return false; }
  } else if (mobileCurrentStep === 1) {
    if (!document.getElementById('mobileTripDate')?.value.trim()) { showToast('Select date', 'error'); return false; }
    if (!document.getElementById('mobileHotelName')?.value.trim()) { showToast('Enter hotel name', 'error'); return false; }
    if (!document.getElementById('mobileRoomNumber')?.value.trim()) { showToast('Enter room number', 'error'); return false; }
  }
  return true;
}

// ==========================================================================
// PRICE CALCULATION
// ==========================================================================
function getA() { return parseInt(document.getElementById('adults').value) || 0; }
function getC() { return parseInt(document.getElementById('childrenUnder12').value) || 0; }
function getI() { return parseInt(document.getElementById('infants').value) || 0; }
function getMA() { return parseInt(document.getElementById('mobileAdults').value) || 0; }
function getMC() { return parseInt(document.getElementById('mobileChildren').value) || 0; }
function getMI() { return parseInt(document.getElementById('mobileInfants').value) || 0; }

function calcBase() {
  if (!currentTrip.basePrice) return 0;
  const ap = parseFloat(currentTrip.basePrice), cp = parseFloat(currentTrip.cprice) || ap * 0.5;
  return parseFloat(((getA() * ap) + (getC() * cp)).toFixed(2));
}
function calcExtra() {
  if (selectedTripType && tourTypes[selectedTripType]) return parseFloat(((getA() + getC()) * parseFloat(tourTypes[selectedTripType])).toFixed(2));
  return 0;
}
function calcNet() { return parseFloat((calcBase() + calcExtra()).toFixed(2)); }
function calcTax() { const n = calcNet(); return parseFloat((n * 0.03 + n * 0.03 * 0.14 + 3).toFixed(2)); }
function calcTotal() { return parseFloat((calcNet() + calcTax()).toFixed(2)); }

function calcMobileBase() {
  if (!currentTrip.basePrice) return 0;
  const ap = parseFloat(currentTrip.basePrice), cp = parseFloat(currentTrip.cprice) || ap * 0.5;
  return parseFloat(((getMA() * ap) + (getMC() * cp)).toFixed(2));
}
function calcMobileExtra() {
  if (selectedTripType && tourTypes[selectedTripType]) return parseFloat(((getMA() + getMC()) * parseFloat(tourTypes[selectedTripType])).toFixed(2));
  return 0;
}
function calcMobileNet() { return parseFloat((calcMobileBase() + calcMobileExtra()).toFixed(2)); }
function calcMobileTax() { const n = calcMobileNet(); return parseFloat((n * 0.03 + n * 0.03 * 0.14 + 3).toFixed(2)); }
function calcMobileTotal() { return parseFloat((calcMobileNet() + calcMobileTax()).toFixed(2)); }

// ==========================================================================
// UPDATE DISPLAYS
// ==========================================================================
function updatePriceDisplay() {
  const el = document.getElementById('tourPrice');
  if (el && currentTrip.basePrice) el.innerHTML = formatPrice(calcNet());
}
function updateSummary() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('summaryDate', document.getElementById('tripDate')?.value || '-');
  set('summaryHotel', sanitizeInput(document.getElementById('hotelName')?.value) || '-');
  set('summaryRoom', sanitizeInput(document.getElementById('roomNumber')?.value) || '-');
  set('summaryRef', refNumber);
  set('summaryTour', currentTrip.name || '-');
  set('summaryAdults', getA() + ' Adult' + (getA() !== 1 ? 's' : ''));
  set('summaryChildrenUnder12', getC() + ' Child' + (getC() !== 1 ? 'ren' : ''));
  set('summaryInfants', getI() + ' Infant' + (getI() !== 1 ? 's' : ''));
  set('summaryService', selectedTripType || 'None');
  
  const td = document.getElementById('totalPriceDisplay');
  if (td && currentTrip.basePrice) {
    td.innerHTML = `${formatPrice(calcNet())}<div style="font-size:11px;color:#a0a0a0;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;margin-top:4px;"><span>+ Taxes:</span><span>${formatPrice(calcTax())}</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;margin-top:4px;color:#f59e0b;"><span>Total at Payment:</span><span>${formatPrice(calcTotal())}</span></div></div>`;
  }
}
function updateMobileSummary() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('mobileSummaryDate', document.getElementById('mobileTripDate')?.value || '-');
  set('mobileSummaryHotel', document.getElementById('mobileHotelName')?.value || '-');
  set('mobileSummaryRoom', document.getElementById('mobileRoomNumber')?.value || '-');
  set('mobileSummaryRef', refNumber);
  set('mobileSummaryTour', currentTrip.name || '-');
  set('mobileSummaryAdults', getMA() + ' Adult' + (getMA() !== 1 ? 's' : ''));
  set('mobileSummaryChildren', getMC() + ' Child' + (getMC() !== 1 ? 'ren' : ''));
  set('mobileSummaryInfants', getMI() + ' Infant' + (getMI() !== 1 ? 's' : ''));
  set('mobileSummaryService', selectedTripType || 'None');
  
  const td = document.getElementById('mobileTotalPrice');
  if (td && currentTrip.basePrice) {
    td.innerHTML = `${formatPrice(calcMobileNet())}<div style="font-size:11px;color:#a0a0a0;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;">+ Taxes: ${formatPrice(calcMobileTax())}</div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;color:#f59e0b;">Total: ${formatPrice(calcMobileTotal())}</div></div>`;
  }
}

// ==========================================================================
// EXTRA SERVICES POPUP
// ==========================================================================
let tempService = '';
function openServicesPopup() {
  const popup = document.getElementById('extraServicesPopup'), content = document.getElementById('servicesPopupContent');
  if (!popup || !content) return;
  tempService = selectedTripType;
  content.innerHTML = '';
  buildServiceOption('No extra services', 'Free', '');
  if (tourTypes) Object.keys(tourTypes).forEach(k => buildServiceOption(k, formatPrice(tourTypes[k]) + ' (per person)', k));
  popup.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function openServicesPopupMobile() { openServicesPopup(); }
function buildServiceOption(name, price, value) {
  const content = document.getElementById('servicesPopupContent');
  const div = document.createElement('div');
  div.className = 'service-option' + (tempService === value ? ' selected' : '');
  div.innerHTML = `<div class="service-option-info"><div class="service-option-name">${name}</div><div class="service-option-price">${price}</div></div><div class="service-option-check"></div>`;
  div.onclick = () => {
    tempService = value;
    document.querySelectorAll('#servicesPopupContent .service-option').forEach(o => o.classList.remove('selected'));
    div.classList.add('selected');
  };
  content.appendChild(div);
}
function confirmServiceSelection() {
  selectedTripType = tempService;
  document.getElementById('tripType').value = selectedTripType;
  document.getElementById('mobileTripType').value = selectedTripType;
  document.getElementById('selectedServiceText').textContent = selectedTripType || 'No extra services';
  document.getElementById('mobileSelectedServiceText').textContent = selectedTripType || 'No extra services';
  closeServicesPopup();
  updateSummary(); updateMobileSummary();
}
function closeServicesPopup() {
  document.getElementById('extraServicesPopup')?.classList.add('hidden');
  document.body.style.overflow = '';
}

// ==========================================================================
// SUBMIT
// ==========================================================================
function mobileSubmitForm() {
  document.getElementById('username').value = document.getElementById('mobileUsername').value;
  document.getElementById('customerEmail').value = document.getElementById('mobileCustomerEmail').value;
  document.getElementById('tripDate').value = document.getElementById('mobileTripDate').value;
  document.getElementById('hotelName').value = document.getElementById('mobileHotelName').value;
  document.getElementById('roomNumber').value = document.getElementById('mobileRoomNumber').value;
  document.getElementById('adults').value = document.getElementById('mobileAdults').value;
  document.getElementById('childrenUnder12').value = document.getElementById('mobileChildren').value;
  document.getElementById('infants').value = document.getElementById('mobileInfants').value;
  selectedTripType = document.getElementById('mobileTripType')?.value || '';
  document.getElementById('tripType').value = selectedTripType;
  submitForm();
}

async function submitForm() {
  showSpinner();
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in');
    const net = calcNet(), tax = calcTax(), total = calcTotal();
    const booking = {
      refNumber, username: sanitizeInput(document.getElementById('username').value),
      email: sanitizeInput(document.getElementById('customerEmail').value),
      phone: iti?.getNumber() || '', tour: currentTrip.name, tripId: tripPName,
      tripDate: document.getElementById('tripDate').value,
      adults: getA(), childrenUnder12: getC(), infants: getI(),
      hotelName: sanitizeInput(document.getElementById('hotelName').value),
      roomNumber: sanitizeInput(document.getElementById('roomNumber').value),
      baseTotal: parseFloat(calcBase().toFixed(2)),
      extraServicesTotal: parseFloat(calcExtra().toFixed(2)),
      netTotal: parseFloat(net.toFixed(2)), total: parseFloat(total.toFixed(2)),
      taxes: parseFloat(tax.toFixed(2)), extraServices: selectedTripType || 'None',
      status: 'pending', resStatus: 'new', isPaid: false, paymentStatus: 'unpaid',
      uid: user.uid, owner: tripOwnerId || user.uid,
      createdAt: Date.now(), updatedAt: Date.now()
    };
    
    const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(total.toFixed(2)), currency: 'EGP' })
    });
    if (!resp.ok) throw new Error('Payment failed');
    const data = await resp.json();
    const url = `https://payments.kashier.io/?${new URLSearchParams({ merchantId: 'MID-33260-3', orderId: refNumber, amount: parseFloat(total.toFixed(2)), currency: 'EGP', hash: data.hash, mode: 'live', merchantRedirect: 'https://www.discover-sharm.com/p/payment-status.html', failureRedirect: 'false', redirectMethod: 'get' }).toString()}`;
    
    await db.ref('trip-bookings/' + refNumber).set({ ...booking, paymenturl: url });
    if (tripOwnerId) {
      await db.ref(`notifications/${tripOwnerId}/${Date.now()}`).set({
        title: 'New Booking: ' + currentTrip.name,
        message: `${booking.username} - ${getA()}A/${getC()}C/${getI()}I`,
        totalAmount: parseFloat(net.toFixed(2)), bookingId: refNumber,
        tripId: tripPName, tripName: currentTrip.name,
        userName: booking.username, userEmail: booking.email, phone: booking.phone,
        adults: getA(), children: getC(), infants: getI(),
        tripDate: booking.tripDate, read: false, timestamp: Date.now(), type: 'new_booking'
      });
    }
    
    sessionStorage.setItem("username", booking.username);
    sessionStorage.setItem("email", booking.email);
    sessionStorage.setItem("phone", booking.phone);
    showToast('Redirecting to payment...');
    setTimeout(() => { window.location.href = url; }, 1000);
  } catch (e) { showToast('Error: ' + e.message, 'error'); hideSpinner(); }
}

// ==========================================================================
// TRIP DATA
// ==========================================================================
async function fetchAllTripData() {
  try {
    showSpinner();
    const snap = await db.ref('trips').once('value');
    const data = snap.val();
    if (!data) { showToast("No trips available.", 'error'); return {}; }
    tripData = data;
    if (tripPName && data[tripPName]) {
      currentTrip = data[tripPName];
      currentTrip.basePrice = currentTrip.price || 0;
      tourTypes = currentTrip.tourtype || {};
      tripOwnerId = currentTrip.owner || '';
      displayTripInfo(currentTrip);
      loadMediaContent(currentTrip.media);
      loadIncludedNotIncluded(currentTrip);
      loadTimeline(currentTrip.timeline);
      loadWhatToBring(currentTrip.whatToBring);
      updatePriceDisplay();
    }
    return data;
  } catch (e) { showToast("Failed to load trip data.", 'error'); throw e; }
  finally { hideSpinner(); }
}

function displayTripInfo(t) {
  if (document.getElementById('tourTitle')) document.getElementById('tourTitle').textContent = t.name || '';
  if (document.getElementById('tourDuration')) document.getElementById('tourDuration').textContent = t.duration || '';
}

function loadMediaContent(media) {
  if (!media) return;
  const wrap = document.querySelector('.swiper-wrapper'), thumbs = document.getElementById('thumbnailsOverlay');
  if (wrap) wrap.innerHTML = '';
  if (thumbs) thumbs.innerHTML = '';
  const addThumb = (src, idx) => {
    if (!thumbs) return;
    const img = document.createElement('img'); img.src = src; img.dataset.index = idx;
    img.addEventListener('click', () => { if (swiper) swiper.slideTo(idx); updateActiveThumbnail(idx); });
    thumbs.appendChild(img);
  };
  if (media.images) media.images.forEach((img, i) => {
    const s = document.createElement('div'); s.className = 'swiper-slide';
    s.innerHTML = `<img src="${img}" alt="">`; wrap.appendChild(s); addThumb(img, i);
  });
  if (media.videos) media.videos.forEach((v, i) => {
    const idx = (media.images?.length || 0) + i;
    const s = document.createElement('div'); s.className = 'swiper-slide swiper-slide-video';
    s.dataset.videoUrl = v.videoUrl; s.dataset.thumbnail = v.thumbnail;
    s.innerHTML = `<img src="${v.thumbnail}" alt=""><div class="play-button"><i class="fas fa-play"></i></div>`;
    wrap.appendChild(s); addThumb(v.thumbnail, idx);
  });
  if (!swiper) {
    swiper = new Swiper('.swiper', {
      slidesPerView: 1, loop: true,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: { slideChange: function() { updateActiveThumbnail(this.realIndex); stopVideo(); } }
    });
    document.querySelector('.swiper')?.addEventListener('click', function(e) {
      const pb = e.target.closest('.play-button');
      if (pb) { const sl = pb.closest('.swiper-slide'); if (sl?.classList.contains('swiper-slide-video')) playVideo(sl); }
    });
  } else swiper.update();
  updateActiveThumbnail(0);
}
function playVideo(s) {
  stopVideo();
  const m = s.dataset.videoUrl.match(/(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]{11})/);
  if (m) { s.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1" frameborder="0" allowfullscreen></iframe>`; currentVideoSlide = s; }
}
function stopVideo() {
  if (currentVideoSlide) { currentVideoSlide.innerHTML = `<img src="${currentVideoSlide.dataset.thumbnail}" alt=""><div class="play-button"><i class="fas fa-play"></i></div>`; currentVideoSlide = null; }
}
function updateActiveThumbnail(idx) { document.querySelectorAll('.thumbnails-overlay img').forEach(t => t.classList.toggle('active', parseInt(t.dataset.index) === idx)); }

function loadIncludedNotIncluded(d) {
  ['includedItems','notIncludedItems'].forEach(id => {
    const c = document.getElementById(id);
    if (c && d[id === 'includedItems' ? 'included' : 'notIncluded']) {
      c.innerHTML = '';
      const icon = id === 'includedItems' ? 'fa-check' : 'fa-times', color = id === 'includedItems' ? '#22c55e' : '#ef4444';
      d[id === 'includedItems' ? 'included' : 'notIncluded'].forEach(item => {
        const el = document.createElement('div'); el.className = 'included-item';
        el.innerHTML = `<i class="fas ${icon}" style="color:${color};"></i><span>${item}</span>`; c.appendChild(el);
      });
    }
  });
}
function loadTimeline(d) { const c = document.getElementById('timelineContainer'); if (c && d) c.innerHTML = d.map(i => `<div class="timeline-item"><div class="timeline-time">${i.time}</div><div class="timeline-content"><h4>${i.title}</h4><p>${i.description}</p></div></div>`).join(''); }
function loadWhatToBring(d) { const l = document.getElementById('whatToBringList'); if (l && d) l.innerHTML = d.map(i => `<li><i class="fas fa-check"></i> ${i}</li>`).join(''); }

// ==========================================================================
// REVIEWS
// ==========================================================================
function getUserPhotoUrl(uid) { return uid ? `/app/photos/${uid}.jpg` : null; }
async function loadReviews() {
  if (!tripPName) return;
  try {
    const snap = await db.ref('trip-reviews/' + tripPName).once('value');
    const d = snap.val();
    if (d?.reviews) {
      tripReviews = Object.entries(d.reviews).map(([id, r]) => ({ id, ...r })).filter(r => r.approved).sort((a, b) => new Date(b.date) - new Date(a.date));
      updateStarsSummary(d.average || 0, d.count || 0);
      renderReviews();
    } else { updateStarsSummary(0, 0); renderReviews(); }
    const user = auth.currentUser;
    if (user) {
      currentUserReview = tripReviews.find(r => r.userId === user.uid);
      const btn = document.getElementById('openReviewBtn');
      if (btn) btn.innerHTML = currentUserReview ? '<i class="fas fa-edit"></i> Edit Review' : '<i class="fas fa-pen-alt"></i> Write a Review';
    }
  } catch (e) {}
}
function updateStarsSummary(avg, cnt) {
  const c = document.getElementById('avgStars');
  if (c) {
    c.innerHTML = '';
    for (let i = 0; i < Math.floor(avg); i++) c.innerHTML += '<i class="fas fa-star"></i>';
    if (avg % 1 >= 0.5) c.innerHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = c.children.length; i < 5; i++) c.innerHTML += '<i class="far fa-star"></i>';
  }
  const s = document.getElementById('reviewsCountText');
  if (s) s.textContent = `(${cnt} ${cnt === 1 ? 'review' : 'reviews'})`;
}
function renderReviews() {
  const c = document.getElementById('reviewsListContainer');
  if (!c) return;
  if (!tripReviews.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p></div>'; return; }
  c.innerHTML = tripReviews.map(r => {
    const d = new Date(r.date), date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const init = (r.userName||'U').charAt(0).toUpperCase();
    return `<div style="background:#2d2d30;border:1px solid #3a3a3a;border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#FF6B35,#FFA630);flex-shrink:0;">
            <img src="${getUserPhotoUrl(r.userId)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy">
            <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;">${init}</div>
          </div>
          <div><div style="font-weight:600;color:#fff;font-size:14px;">${r.userName||'User'}</div>
            <div style="display:flex;gap:2px;font-size:11px;margin-top:2px;">${Array(5).fill().map((_,i)=>i<r.rating?'<i class="fas fa-star" style="color:#f59e0b;"></i>':'<i class="far fa-star" style="color:#989b9f;"></i>').join('')}</div>
          </div>
        </div>
        <span style="font-size:11px;color:#989b9f;">${date}</span>
      </div>
      <p style="font-size:13px;color:#a0a0a0;line-height:1.6;margin:0;">${r.comment||''}</p>
    </div>`;
  }).join('');
}
function openReviewModal() {
  if (!auth.currentUser) { showToast('Please login', 'error'); return; }
  const m = document.getElementById('reviewModal');
  if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}
function closeReviewModal() {
  const m = document.getElementById('reviewModal');
  if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
}
function setupStars() {
  document.querySelectorAll('#starSelector i').forEach(s => {
    s.addEventListener('click', () => {
      const r = parseInt(s.dataset.rating);
      document.getElementById('ratingValue').value = r;
      document.querySelectorAll('#starSelector i').forEach((st, i) => { st.classList.toggle('active', i < r); st.classList.toggle('fas', i < r); st.classList.toggle('far', i >= r); });
    });
  });
  const ci = document.getElementById('commentInput'), cc = document.getElementById('charCount');
  if (ci && cc) ci.addEventListener('input', () => { let l = ci.value.length; if (l > 500) { ci.value = ci.value.substring(0, 500); l = 500; } cc.textContent = l; });
}
async function submitReview() {
  const voucher = document.getElementById('voucherInput')?.value?.trim()?.toUpperCase();
  if (!voucher) { showToast('Enter voucher', 'error'); return; }
  const rating = parseInt(document.getElementById('ratingValue')?.value || '0');
  if (!rating) { showToast('Select rating', 'error'); return; }
  const comment = document.getElementById('commentInput')?.value?.trim();
  if (!comment || comment.length < 5) { showToast('Min 5 characters', 'error'); return; }
  
  try {
    const snap = await db.ref('trip-bookings/' + voucher).once('value');
    const b = snap.val();
    if (!b || b.uid !== auth.currentUser.uid) { showToast('Invalid voucher', 'error'); return; }
    
    const user = auth.currentUser;
    let userName = 'Traveler';
    try { const s = await db.ref('egy_user/' + user.uid).once('value'); const d = s.val(); if (d) userName = d.username || 'Traveler'; } catch (e) {}
    
    const rd = { userId: user.uid, userName, rating, comment, date: new Date().toISOString(), approved: true, voucher };
    const ref = db.ref('trip-reviews/' + tripPName);
    const cur = (await ref.once('value')).val() || { reviews: {}, count: 0, average: 0 };
    let cnt = cur.count || 0, tot = (cur.average || 0) * cnt;
    
    if (currentUserReview && cur.reviews[currentUserReview.id]) {
      tot = tot - (cur.reviews[currentUserReview.id].rating || 0) + rating;
      await ref.child('reviews/' + currentUserReview.id).update(rd);
    } else {
      await ref.child('reviews/' + Date.now()).set(rd); cnt++; tot += rating;
    }
    await ref.update({ count: cnt, average: parseFloat((tot / cnt).toFixed(1)) });
    closeReviewModal();
    document.getElementById('voucherInput').value = '';
    document.getElementById('commentInput').value = '';
    document.getElementById('ratingValue').value = '0';
    document.getElementById('charCount').textContent = '0';
    document.querySelectorAll('#starSelector i').forEach(s => { s.classList.remove('active', 'fas'); s.classList.add('far'); });
    await loadReviews();
    showToast('Thank you for your review!', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ==========================================================================
// INIT
// ==========================================================================
async function populateForm() {
  const u = auth.currentUser; if (!u) return;
  try {
    const s = await db.ref('egy_user/' + u.uid).once('value'); const d = s.val();
    if (d) {
      if (document.getElementById('username')) document.getElementById('username').value = d.username || '';
      if (document.getElementById('mobileUsername')) document.getElementById('mobileUsername').value = d.username || '';
      if (document.getElementById('customerEmail')) document.getElementById('customerEmail').value = d.email || '';
      if (document.getElementById('mobileCustomerEmail')) document.getElementById('mobileCustomerEmail').value = d.email || '';
      if (d.phone && iti) { document.getElementById('phone').value = d.phone; iti.setNumber(d.phone); }
    }
  } catch (e) {}
}
function initCurrency() {
  currentCurrency = getCurrentCurrencyFromHeader();
  const r = getExchangeRatesFromHeader(); if (r) { exchangeRates = r; ratesLoaded = true; }
  window.addEventListener('currencyChanged', (e) => {
    if (e.detail?.currency) {
      currentCurrency = e.detail.currency;
      if (e.detail.rates) { exchangeRates = e.detail.rates; ratesLoaded = true; }
      updatePriceDisplay(); updateSummary(); if (isMobile()) updateMobileSummary();
    }
  });
}

function showMobileBooking() {
  const s = document.getElementById('mobileBookingSection');
  if (s) { s.style.display = 'block'; setTimeout(() => s.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }
}

window.onload = async function () {
  if (!tripPName) { showToast("No trip specified.", 'error'); return; }
  initCurrency();
  
  const pi = document.querySelector("#phone");
  if (pi) try { iti = window.intlTelInput(pi, { utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js", preferredCountries: ['eg','gb','de','ru','tr','it'], separateDialCode: true, initialCountry: "eg" }); } catch (e) {}
  
  flatpickr("#tripDate", { minDate: new Date().fp_incr(1), dateFormat: "Y-m-d", disableMobile: true, onChange: updateSummary });
  flatpickr("#mobileTripDate", { minDate: new Date().fp_incr(1), dateFormat: "Y-m-d", disableMobile: true, onChange: updateMobileSummary });
  
  setupStars();
  
  document.getElementById('submitBtn')?.addEventListener('click', submitForm);
  document.getElementById('openReviewBtn')?.addEventListener('click', openReviewModal);
  document.getElementById('mobileBookNowBtn')?.addEventListener('click', showMobileBooking);
  
  auth.onAuthStateChanged((u) => { if (u) { currentUserUid = u.uid; populateForm(); } });
  
  await fetchAllTripData();
  updateSummary(); updateMobileSummary();
  setTimeout(() => { if (tripPName) loadReviews(); }, 2000);
  setTimeout(() => { updatePriceDisplay(); updateSummary(); }, 1500);
};

console.log('✅ Discover Sharm - Booking System Ready');
