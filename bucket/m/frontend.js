// ==================== FRONTEND UI & NAVIGATION ====================

function enterApp() {
  hideSplash();
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  loadCatalogFromWorker();
  ui.setDefaultDates();

  if (currentUser) {
    updateDrawerUser(currentUser.displayName || currentUser.email, currentUser.email, currentUser.photoURL);
  } else {
    updateDrawerUser('Guest', '', localStorage.getItem('ds_avatar'));
  }

  if (auth.isLoggedIn()) {
    favorites.load();
    bookings.load();
    notifications.load();
  } else {
    favorites.render();
    bookings.render();
    notifications.render();
  }
}

const nav = {
  go(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(page + 'Page');
    if (target) target.classList.add('active');
    state.pageHistory.push(page);
    window.scrollTo(0, 0);
    if (page === 'hotels') hotels.render();
    if (page === 'excursions') excursionsUi.render();
    if (page === 'transfers') transfersUi.render();
    if (page === 'restaurants') restaurantsUi.renderFull();
    if (page === 'bookings') bookings.render();
    if (page === 'favorites') favorites.render();
    if (page === 'notifications') notifications.render();
  },
  goBack() { state.pageHistory.pop(); this.go(state.pageHistory[state.pageHistory.length - 1] || 'home'); },
  showAuth() {
    hideSplash();
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
  }
};

const sidebar = {
  open() {
    document.getElementById('sideDrawer').classList.add('open');
    document.getElementById('sideDrawerOverlay').classList.add('open');
  },
  close() {
    document.getElementById('sideDrawer').classList.remove('open');
    document.getElementById('sideDrawerOverlay').classList.remove('open');
  }
};

// ==================== GUESTS MODAL ====================
function openGuestsModal() {
  document.getElementById('guestsModal').classList.remove('hidden');
  document.getElementById('adultsCount').textContent = state.guests.adults;
  document.getElementById('childrenCount').textContent = state.guests.children;
  document.getElementById('infantsCount').textContent = state.guests.infants;
  document.getElementById('roomsCount').textContent = state.guests.rooms;
}
function closeGuestsModal() { document.getElementById('guestsModal').classList.add('hidden'); }
function adjustGuestCount(type, delta) {
  const limits = { adults: { min: 1, max: 10 }, children: { min: 0, max: 6 }, infants: { min: 0, max: 4 }, rooms: { min: 1, max: 5 } };
  const newValue = state.guests[type] + delta;
  if (type === 'rooms' && delta < 0) {
    const maxOcc = (state.currentRoom && state.currentRoom.guests) || 2;
    const required = Math.ceil((state.guests.adults + state.guests.children) / maxOcc);
    if (newValue < required) { toast('Reduce guests first', 'error'); return; }
  }
  if (newValue >= limits[type].min && newValue <= limits[type].max) state.guests[type] = newValue;
  if (type === 'adults' || type === 'children') {
    const maxOcc = (state.currentRoom && state.currentRoom.guests) || 2;
    const required = Math.ceil((state.guests.adults + state.guests.children) / maxOcc);
    if (required > state.guests.rooms && required <= limits.rooms.max) {
      state.guests.rooms = required;
      toast('Room count increased to fit your party', 'info');
    }
  }
  document.getElementById('adultsCount').textContent = state.guests.adults;
  document.getElementById('childrenCount').textContent = state.guests.children;
  document.getElementById('infantsCount').textContent = state.guests.infants;
  document.getElementById('roomsCount').textContent = state.guests.rooms;
}
function applyGuests() {
  const text = `${state.guests.adults} Adults, ${state.guests.children} Children, ${state.guests.rooms} Room(s)`;
  const disp = document.getElementById('guestsDisplay');
  if (disp) disp.textContent = text;
  const bdisp = document.getElementById('bookingGuestsDisplay');
  if (bdisp) bdisp.textContent = text;
  closeGuestsModal();
  toast('Guests updated', 'info');
}

// ==================== DATEPICKER ====================
function setDateFieldValue(fieldId, iso) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.dataset.value = iso;
  const valueEl = field.querySelector('.date-field-value');
  if (valueEl) valueEl.textContent = utils.formatDate(iso);
}
function onDateFieldChange(fieldId, iso) {
  if (fieldId === 'checkinDate') {
    const co = document.getElementById('checkoutDate');
    if (co && (!co.dataset.value || co.dataset.value <= iso)) setDateFieldValue('checkoutDate', utils.addDays(iso, 1));
  }
  if (fieldId === 'bkCheckin') {
    state.bookingDraft.checkin = iso;
    const coField = document.getElementById('bkCheckout');
    if (coField && (!coField.dataset.value || coField.dataset.value <= iso)) { const newCo = utils.addDays(iso, 1); setDateFieldValue('bkCheckout', newCo); state.bookingDraft.checkout = newCo; }
  }
  if (fieldId === 'bkCheckout') state.bookingDraft.checkout = iso;
  if (fieldId === 'ekDate') state.bookingDraft.date = iso;
  if (fieldId === 'tkDate') state.bookingDraft.date = iso;
}
const datepicker = {
  target: null,
  viewDate: new Date(),
  minIso: null,
  unavailable: [],
  open(fieldId, opts = {}) {
    this.target = fieldId;
    this.minIso = opts.minIso || utils.addDays(utils.todayIso(), 1);
    this.unavailable = opts.unavailableIso || [];
    const field = document.getElementById(fieldId);
    const cur = field ? field.dataset.value : '';
    this.viewDate = new Date((cur || this.minIso) + 'T00:00:00');
    this.render();
    document.getElementById('datepickerModal').classList.remove('hidden');
  },
  close() { document.getElementById('datepickerModal').classList.add('hidden'); },
  changeMonth(delta) { this.viewDate.setMonth(this.viewDate.getMonth() + delta); this.render(); },
  render() {
    const lang = I18N.get();
    const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthNamesAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const weekdaysEn = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const weekdaysAr = ['ح','ن','ث','ر','خ','ج','س'];
    const y = this.viewDate.getFullYear(), m = this.viewDate.getMonth();
    document.getElementById('dpMonthLabel').textContent = (lang === 'ar' ? monthNamesAr[m] : monthNamesEn[m]) + ' ' + y;
    document.getElementById('dpWeekdays').innerHTML = (lang === 'ar' ? weekdaysAr : weekdaysEn).map(w => `<span class="text-[10px] font-semibold" style="color:var(--text-secondary)">${w}</span>`).join('');
    const first = new Date(y, m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const field = document.getElementById(this.target);
    const cur = field ? field.dataset.value : '';
    let html = '';
    for (let i = 0; i < startDay; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isBeforeMin = iso < this.minIso;
      const isUnavailable = this.unavailable.includes(iso);
      const isDisabled = isBeforeMin || isUnavailable;
      const isSelected = cur === iso;
      html += `<button type="button" ${isDisabled ? 'disabled' : ''} onclick="datepicker.select('${iso}')" class="w-9 h-9 rounded-xl text-xs font-semibold ${isSelected ? 'bg-gradient-to-br from-violet-500 to-violet-700 text-white' : isDisabled ? 'text-gray-400 opacity-40 line-through' : ''}" style="${isSelected ? '' : 'color:var(--text-primary)'}">${d}</button>`;
    }
    document.getElementById('dpGrid').innerHTML = html;
  },
  select(iso) { setDateFieldValue(this.target, iso); this.close(); if (typeof onDateFieldChange === 'function') onDateFieldChange(this.target, iso); }
};

// ==================== SEARCH ====================
const search = {
  switchTab(tab) {
    state.activeSearchTab = tab;
    document.getElementById('hotelSearchForm').classList.toggle('hidden', tab !== 'hotels');
    document.getElementById('excursionSearchForm').classList.toggle('hidden', tab !== 'excursions');
    document.getElementById('transferSearchForm').classList.toggle('hidden', tab !== 'transfers');
    const tabs = { hotels: 'searchTabHotels', excursions: 'searchTabExcursions', transfers: 'searchTabTransfers' };
    Object.keys(tabs).forEach(t => {
      const btn = document.getElementById(tabs[t]);
      if (btn) { btn.style.background = t === tab ? 'linear-gradient(135deg,#fb923c,#c2410c)' : 'transparent'; btn.style.color = t === tab ? '#fff' : 'var(--text-secondary)'; }
    });
  },
  handle(q) { state.searchQuery = q.toLowerCase(); if (document.getElementById('hotelsPage').classList.contains('active')) hotels.render(); },
  filterCategory(cat) { state.currentFilter = cat; document.querySelectorAll('#hotelsPage .filter-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`))); hotels.render(); },
  filterExcursionCategory(cat) { state.currentExcursionFilter = cat; document.querySelectorAll('.excursion-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`))); excursionsUi.render(); },
  applyExcursionSearch() { const cat = document.getElementById('excursionCategorySelect').value; state.currentExcursionFilter = cat; nav.go('excursions'); document.querySelectorAll('.excursion-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`))); }
};

// ==================== CURRENCY CHANGE ====================
function changeCurrency(c) {
  if (!currencyAvailable) c = 'EGP';
  state.currency = c;
  localStorage.setItem('ds_display_currency', c);
  applyCurrencyAvailability();
  refreshCatalogUI();
  bookings.render();
  favorites.render();
  toast('Currency updated', 'info');
}

// ==================== ROOM PREVIEW ====================
function showRoomPreview(hotelId, roomIndex) {
  const h = CATALOG.hotels.find(x => x.id === hotelId);
  const r = h?.rooms?.[roomIndex];
  if (!r) return;
  document.getElementById('roomPreviewContent').innerHTML = `
    <div class="relative h-52">
      <img src="${getImageUrl(r.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
      <button onclick="closeRoomPreview()" class="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900"><i class="fa-solid fa-xmark"></i></button>
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      <p class="absolute bottom-3 right-3 left-3 text-white font-display font-bold text-lg">${r.type}</p>
    </div>
    <div class="p-5" style="background:var(--bg-card)">
      <div class="flex items-center gap-3 text-xs mb-3" style="color:var(--text-secondary)">
        <span><i class="fa-solid fa-user-group text-violet-500"></i> ${r.guests || 2} Guests</span>
        <span><i class="fa-solid fa-ruler-combined text-violet-500"></i> ${r.size || '25m²'}</span>
        <span><i class="fa-solid fa-bed text-violet-500"></i> ${r.beds || '1 Queen Bed'}</span>
      </div>
      <p class="text-sm leading-relaxed mb-4" style="color:var(--text-secondary)">${r.description || ''}</p>
      <button onclick="selectRoomOnDetail('${hotelId}', ${roomIndex}, { closeModal: true })" class="btn-gold w-full py-3 rounded-2xl font-bold text-ink-900">Select This Room</button>
    </div>`;
  document.getElementById('roomPreviewModal').classList.remove('hidden');
}
function closeRoomPreview() { document.getElementById('roomPreviewModal').classList.add('hidden'); }

// ==================== UI RENDERERS ====================
const ui = {
  renderHotelCard(h) {
    const img = getImageUrl(h.image);
    const isFav = state.favorites.includes(h.id);
    return `
      <div onclick="showHotelPage('${h.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
        <div class="flex">
          <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
            <img src="${img}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
            ${h.bestseller ? '<div class="absolute top-2 right-2 badge-bestseller text-[8px] font-black px-2 py-0.5 rounded-md">BEST SELLER</div>' : ''}
            <div class="absolute bottom-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${h.rating}</span></div>
          </div>
          <div class="flex-1 p-3 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between mb-1">
                <h3 class="font-display font-bold text-sm md:text-base line-clamp-1">${h.name}</h3>
                <button onclick="event.stopPropagation(); favorites.toggle('${h.id}')" class="text-base ${isFav ? 'text-red-500' : 'text-gray-300'}"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i></button>
              </div>
              <div class="flex items-center gap-1 mb-1">${utils.renderStars(h.rating)}<span class="text-[9px] mr-1">(${h.reviews})</span></div>
              <p class="text-[10px] mb-1.5"><i class="fa-solid fa-location-dot text-violet-500 text-[8px]"></i>${(h.location || '').split(',')[0]}</p>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1 text-[8px]">${(h.amenities || []).slice(0, 2).map(a => `<span class="px-1.5 py-0.5 rounded">${a}</span>`).join('')}</div>
              <div class="text-left"><p class="text-base md:text-lg font-bold text-violet-500 font-display">${utils.formatPrice(h.price)}</p><p class="text-[8px]">/ Night</p></div>
            </div>
          </div>
        </div>
      </div>`;
  },
  renderFeaturedHotels() {
    const el = document.getElementById('featuredHotels');
    if (el) el.innerHTML = CATALOG.hotels.slice(0, 2).map(h => this.renderHotelCard(h)).join('');
  },
  setDefaultDates() {
    const tomorrow = utils.addDays(utils.todayIso(), 1);
    const dayAfter = utils.addDays(utils.todayIso(), 3);
    const checkin = document.getElementById('checkinDate');
    const checkout = document.getElementById('checkoutDate');
    if (checkin) checkin.dataset.value = tomorrow;
    if (checkout) checkout.dataset.value = dayAfter;
    const el = document.getElementById('checkinDate');
    if (el) el.querySelector('.date-field-value').textContent = utils.formatDate(tomorrow);
    const co = document.getElementById('checkoutDate');
    if (co) co.querySelector('.date-field-value').textContent = utils.formatDate(dayAfter);
  }
};

const hotels = {
  render() {
    const list = document.getElementById('hotelsList');
    if (!list) return;
    let filtered = CATALOG.hotels;
    if (state.currentFilter !== 'all') filtered = filtered.filter(h => h.category === state.currentFilter);
    if (state.searchQuery) filtered = filtered.filter(h => h.name.toLowerCase().includes(state.searchQuery));
    if (filtered.length === 0) { list.innerHTML = `<div class="text-center py-16">No hotels found</div>`; return; }
    list.innerHTML = filtered.map(h => ui.renderHotelCard(h)).join('');
  }
};

const excursionsUi = {
  renderFeatured() {
    const el = document.getElementById('featuredExcursions');
    if (el) el.innerHTML = CATALOG.excursions.slice(0, 4).map(x => this.renderMiniCard(x)).join('');
  },
  renderMiniCard(x) {
    const img = getImageUrl(x.image);
    return `<div onclick="showExcursionPage('${x.id}')" class="flex-shrink-0 w-44 cursor-pointer">
      <div class="relative w-44 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg">
        <img src="${img}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
        <div class="absolute top-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${Number(x.rating).toFixed(1)}</span></div>
        <div class="absolute bottom-2 right-2 left-2"><span class="text-[8px] font-bold text-white bg-violet-600/90 px-2 py-0.5 rounded-full">${x.category}</span></div>
      </div>
      <h4 class="font-display font-bold text-sm line-clamp-2 mb-1">${x.title}</h4>
      <p class="font-display font-bold text-violet-500 text-sm">${utils.formatPrice(x.price)}<span class="text-[10px] font-normal"> /person</span></p>
    </div>`;
  },
  render() {
    const list = document.getElementById('excursionsList');
    if (!list) return;
    let filtered = CATALOG.excursions;
    if (state.currentExcursionFilter !== 'all') filtered = filtered.filter(x => x.category === state.currentExcursionFilter);
    if (filtered.length === 0) { list.innerHTML = `<div class="text-center py-16">No excursions found</div>`; return; }
    list.innerHTML = filtered.map(x => this.renderCard(x)).join('');
  },
  renderCard(x) {
    const img = getImageUrl(x.image);
    return `<div onclick="showExcursionPage('${x.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
      <div class="flex">
        <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
          <img src="${img}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 p-3 flex flex-col justify-between">
          <div>
            <span class="text-[9px] font-bold text-violet-500">${x.category}</span>
            <h3 class="font-display font-bold text-sm md:text-base line-clamp-2 mb-1">${x.title}</h3>
            <p class="text-[10px]"><i class="fa-regular fa-clock text-violet-500 text-[8px]"></i>${x.duration}</p>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-base md:text-lg font-bold text-violet-500 font-display">${utils.formatPrice(x.price)}<span class="text-[9px] font-normal"> /person</span></p>
          </div>
        </div>
      </div>
    </div>`;
  }
};

const transfersUi = {
  render() {
    const list = document.getElementById('transfersList');
    if (list) list.innerHTML = CATALOG.transfers.map(v => this.renderCard(v)).join('');
  },
  renderCard(v) {
    return `<div class="hotel-card rounded-2xl overflow-hidden">
      <img src="${getImageUrl(v.image)}" class="w-full h-36 object-cover" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-display font-bold text-base">${v.vehicleType}</h3>
          <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600"><i class="fa-solid fa-user-group"></i> Up to ${v.capacity}</span>
        </div>
        <p class="text-xs mb-3">${v.description}</p>
        <div class="flex flex-wrap gap-1.5 mb-3">${(v.features || []).map(f => `<span class="text-[9px] px-2 py-1 rounded-lg">${f}</span>`).join('')}</div>
        <div class="flex items-center justify-between">
          <p class="font-display font-bold text-violet-500 text-xl">${utils.formatPrice(v.price)}<span class="text-xs font-normal"> /trip</span></p>
          <button onclick="startTransferBooking('${v.id}')" class="btn-gold px-6 py-2.5 rounded-2xl font-bold text-ink-900 text-sm">Book</button>
        </div>
      </div>
    </div>`;
  }
};

const restaurantsUi = {
  renderRow() {
    const row = document.getElementById('restaurantsRow');
    if (row) row.innerHTML = CATALOG.restaurants.map(r => this.renderCard(r)).join('');
  },
  renderFull() {
    const list = document.getElementById('restaurantsFullList');
    if (list) list.innerHTML = `<div class="grid grid-cols-2 gap-3">${CATALOG.restaurants.map(r => this.renderCard(r)).join('')}</div>`;
  },
  renderCard(r) {
    return `<div onclick="showRestaurantPage('${r.id}')" class="restaurant-card">
      <div class="relative h-28">
        <img src="${getImageUrl(r.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
        <div class="absolute top-2 right-2 rating-pill px-2 py-1 rounded-full"><span class="text-[9px] font-bold text-gold-400">★ ${r.rating}</span></div>
        <div class="absolute top-2 left-2 bg-ink-950/70 text-white text-[9px] font-bold px-2 py-1 rounded-full capitalize">${r.category}</div>
      </div>
      <div class="p-3">
        <p class="font-display font-bold text-sm mb-0.5 truncate">${r.name}</p>
        <p class="text-[11px] mb-1.5">${r.cuisine} · ${'$'.repeat(r.priceLevel || 2)}</p>
        <p class="text-[10px]"><i class="fa-solid fa-location-dot text-violet-500"></i>${r.location}</p>
      </div>
    </div>`;
  }
};

const destinationsUi = {
  render() {
    const row = document.getElementById('destinationsRow');
    if (!row) return;
    row.innerHTML = CATALOG.destinations.map(d => {
      const imgSrc = getImageUrl(d.image);
      return `<div onclick="showDestinationPage('${d.id}')" class="destination-card">
        <img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent"></div>
        <div class="absolute top-3 right-3 rating-pill px-2 py-1 rounded-full"><span class="text-[9px] font-bold text-gold-400">★ ${d.rating}</span></div>
        <div class="absolute bottom-3 right-3 left-3 text-white">
          <p class="font-display font-bold text-base leading-tight">${d.name}</p>
          <p class="text-[10px] text-white/70 leading-snug">${d.tagline || ''}</p>
        </div>
      </div>`;
    }).join('');
  }
};

const reviewsHomeUi = {
  render() {
    const row = document.getElementById('reviewsRow');
    if (!row) return;
    row.innerHTML = CATALOG.reviews.map(rv => `
      <div class="review-slide-card">
        <div class="flex items-center gap-3 mb-3">
          <div class="review-avatar-badge">${(rv.name || 'G').charAt(0)}</div>
          <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">${rv.name}</p><div class="flex">${utils.renderStars(rv.rating)}</div></div>
        </div>
        <p class="text-xs leading-relaxed mb-3">"${rv.text}"</p>
        <p class="text-[10px] font-semibold text-violet-500 truncate">${rv.itemName || ''}</p>
      </div>`).join('');
  }
};

const articlesUi = {
  render() {
    const row = document.getElementById('articlesRow');
    if (!row) return;
    row.innerHTML = CATALOG.articles.map(a => `
      <div onclick="showArticlePage('${a.id}')" class="article-card">
        <img src="${a.image}" class="w-24 h-24 object-cover rounded-2xl flex-shrink-0" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
        <div class="flex-1 min-w-0 py-1">
          <p class="font-display font-bold text-sm mb-1 leading-snug">${a.title}</p>
          <p class="text-[11px] mb-1.5">${a.excerpt}</p>
          <p class="text-[10px]"><i class="fa-regular fa-clock"></i> ${a.readTimeMinutes} min</p>
        </div>
      </div>`).join('');
  }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadI18nDict();
  I18N.init();
  THEME.init();
  initCurrency();
  if (auth.isLoggedIn()) { enterApp(); } else { nav.showAuth(); }
  search.switchTab('excursions');
  setTimeout(hideSplash, 3000);
});

document.addEventListener('submit', (e) => {
  if (e.target.closest('#authPage form')) { e.preventDefault(); handleAuthSubmit(e); }
  if (e.target.closest('#reviewModal form')) { e.preventDefault(); submitReview(e); }
});
