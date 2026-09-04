// ==================== FRONTEND UI & NAVIGATION ====================

function enterApp() {
  hideSplash();
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  loadCatalogFromWorker();
  ui.setDefaultDates();
  favorites.load();
  bookings.load();
  notifications.load();
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
              <p class="text-[10px] mb-1.5"><i class="fa-solid fa-location-dot text-violet-500 text-[8px]"></i>${(localizeText(h.location) || '').split(',')[0]}</p>
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
    return `<div class="restaurant-card">
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
  if (auth.isLoggedIn()) { enterApp(); } else { nav.showAuth(); }
  setTimeout(hideSplash, 3000);
});

document.addEventListener('submit', (e) => {
  if (e.target.closest('#authPage form')) { e.preventDefault(); handleAuthSubmit(e); }
  if (e.target.closest('#reviewModal form')) { e.preventDefault(); submitReview(e); }
});
