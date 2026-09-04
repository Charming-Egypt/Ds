// ==================== CONFIG ====================
const WORKER_URL = 'https://gh.gm-093.workers.dev';
let authToken = localStorage.getItem('ds_auth_token') || null;
let currentUser = JSON.parse(localStorage.getItem('ds_current_user') || 'null');

// ==================== STATE ====================
const state = {
  bookings: [],
  favorites: [],
  currency: localStorage.getItem('ds_display_currency') || 'EGP',
  currentFilter: 'all',
  currentExcursionFilter: 'all',
  searchQuery: '',
  currentHotel: null,
  currentRoom: null,
  currentExcursion: null,
  currentTransfer: null,
  currentBookingTab: 'upcoming',
  activeSearchTab: 'hotels',
  guests: { adults: 2, children: 0, infants: 0, rooms: 1 },
  pageHistory: ['home'],
  bookingDraft: {},
  transferPax: 2,
  transferDirection: 'Airport to Hotel',
  hotelsCache: [],
};

const CATALOG = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };
const CATALOG_RAW = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };

// ==================== UTILITIES ====================
function toast(msg, type = 'success') {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-violet-600' };
  const icons = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' };
  const t = document.createElement('div');
  t.className = `${colors[type]} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 toast`;
  t.innerHTML = `<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i class="fa-solid ${icons[type]} text-sm"></i></div><span class="text-sm font-medium">${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-20px)'; setTimeout(() => t.remove(), 400); }, 3000);
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function getImageUrl(item) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const lang = I18N.get();
    return item[lang] || item.en || '';
  }
  return item || '';
}

const utils = {
  todayIso() { return new Date().toISOString().slice(0, 10); },
  addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); },
  formatDate(iso) { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
  formatPrice(egp) { return 'ج.م ' + Math.round(egp).toLocaleString(); },
  generateId() { return 'DS-' + Math.random().toString(36).substr(2, 6).toUpperCase(); },
  renderStars(rating) { let s=''; const r=Math.round(rating||0); for(let i=1;i<=5;i++) s += i<=r ? '<i class="fa-solid fa-star text-gold-400 text-[10px]"></i>' : '<i class="fa-solid fa-star text-[10px]" style="color:#453f5c"></i>'; return s; },
  avgRating(list) { return list.length ? list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length : null; },
};

// ==================== API HELPER ====================
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${WORKER_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ==================== I18N ====================
let SUPPORTED_LANGS = ['en'];
let LANG_LABELS = { en: 'English' };
let I18N_DICT = {};

async function loadI18nDict() {
  try {
    const manifestRes = await fetch('data/lang/manifest.json');
    const manifest = await manifestRes.json();
    SUPPORTED_LANGS = manifest.languages.map(l => l.code);
    LANG_LABELS = {};
    manifest.languages.forEach(l => { LANG_LABELS[l.code] = l.label; });
    const dictResponses = await Promise.all(SUPPORTED_LANGS.map(code => fetch('data/lang/' + code + '.json')));
    const dictJsons = await Promise.all(dictResponses.map(r => r.json()));
    SUPPORTED_LANGS.forEach((code, i) => {
      const langDict = dictJsons[i];
      Object.keys(langDict).forEach(key => {
        if (!I18N_DICT[key]) I18N_DICT[key] = {};
        I18N_DICT[key][code] = langDict[key];
      });
    });
  } catch (err) {
    console.warn('Language files missing, using English only.');
    SUPPORTED_LANGS = ['en'];
    LANG_LABELS = { en: 'English' };
  }
  populateLanguageSelects();
}

function populateLanguageSelects() {
  const optionsHtml = SUPPORTED_LANGS.map(code => `<option value="${code}">${LANG_LABELS[code] || code}</option>`).join('');
  document.querySelectorAll('.lang-select').forEach(sel => { sel.innerHTML = optionsHtml; });
}

const I18N = {
  get() { return localStorage.getItem('ds_lang') || 'en'; },
  set(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
    localStorage.setItem('ds_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const entry = I18N_DICT[key];
      const val = entry && (entry[lang] || entry.en);
      if (val) { if (el.tagName === 'OPTION') el.textContent = val; else el.innerHTML = val; }
    });
    document.querySelectorAll('.lang-select').forEach(sel => { sel.value = lang; });
  },
  init() { this.set(this.get()); }
};

// ==================== CATALOG LOADING ====================
async function loadCatalogFromWorker() {
  const files = ['hotels', 'excursions', 'transfers', 'destinations', 'restaurants', 'reviews', 'articles'];
  for (const f of files) {
    try {
      const data = await apiFetch(`/file?file=${f}.json`);
      CATALOG_RAW[f] = JSON.parse(data.content);
    } catch (e) {
      console.warn(`Failed to load ${f}:`, e);
      CATALOG_RAW[f] = [];
    }
  }
  localizeCatalog(I18N.get());
  refreshCatalogUI();
}

function localizeCatalog(lang) {
  CATALOG.hotels = CATALOG_RAW.hotels;
  CATALOG.excursions = CATALOG_RAW.excursions;
  CATALOG.transfers = CATALOG_RAW.transfers;
  CATALOG.destinations = CATALOG_RAW.destinations;
  CATALOG.restaurants = CATALOG_RAW.restaurants;
  CATALOG.reviews = CATALOG_RAW.reviews;
  CATALOG.articles = CATALOG_RAW.articles;
}

function refreshCatalogUI() {
  if (document.getElementById('hotelsList')) hotels.render();
  if (document.getElementById('excursionsList')) excursionsUi.render();
  if (document.getElementById('transfersList')) transfersUi.render();
  if (document.getElementById('restaurantsFullList')) restaurantsUi.renderFull();
  if (document.getElementById('destinationsRow')) destinationsUi.render();
  if (document.getElementById('featuredHotels')) ui.renderFeaturedHotels();
  if (document.getElementById('featuredExcursions')) excursionsUi.renderFeatured();
  if (document.getElementById('restaurantsRow')) restaurantsUi.renderRow();
  if (document.getElementById('reviewsRow')) reviewsHomeUi.render();
  if (document.getElementById('articlesRow')) articlesUi.render();
}

// ==================== AUTH ====================
const auth = {
  async signIn(email, password) {
    try {
      const data = await apiFetch('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
      authToken = data.idToken;
      currentUser = data.user;
      localStorage.setItem('ds_auth_token', authToken);
      localStorage.setItem('ds_current_user', JSON.stringify(currentUser));
      return data.user;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    }
  },
  async signUp(name, email, password) {
    try {
      const data = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      authToken = data.idToken;
      currentUser = data.user;
      localStorage.setItem('ds_auth_token', authToken);
      localStorage.setItem('ds_current_user', JSON.stringify(currentUser));
      return data.user;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    }
  },
  logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('ds_auth_token');
    localStorage.removeItem('ds_current_user');
    nav.showAuth();
  },
  isLoggedIn() { return !!authToken; }
};

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const nameField = document.getElementById('authName');
  const name = nameField ? nameField.value.trim() : '';
  if (auth.isLoggedIn()) auth.logout();
  const user = name ? await auth.signUp(name, email, password) : await auth.signIn(email, password);
  if (user) enterApp();
}

function enterApp() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  loadCatalogFromWorker();
  ui.setDefaultDates();
  favorites.load();
  bookings.load();
  notifications.load();
}

// ==================== NAVIGATION ====================
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
  showAuth() { document.getElementById('authPage').classList.remove('hidden'); document.getElementById('mainApp').classList.add('hidden'); }
};

// ==================== UI COMPONENTS ====================
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

// ==================== HOTELS ====================
const hotels = {
  render() {
    const list = document.getElementById('hotelsList');
    if (!list) return;
    let filtered = CATALOG.hotels;
    if (state.currentFilter !== 'all') filtered = filtered.filter(h => h.category === state.currentFilter);
    if (state.searchQuery) filtered = filtered.filter(h => h.name.toLowerCase().includes(state.searchQuery));
    if (filtered.length === 0) {
      list.innerHTML = `<div class="text-center py-16">No hotels found</div>`;
      return;
    }
    list.innerHTML = filtered.map(h => ui.renderHotelCard(h)).join('');
  }
};

// ==================== EXCURSIONS ====================
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

// ==================== TRANSFERS ====================
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

// ==================== RESTAURANTS ====================
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

// ==================== DESTINATIONS ====================
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

// ==================== REVIEWS HOME ====================
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

// ==================== ARTICLES ====================
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

// ==================== FAVORITES ====================
const favorites = {
  async load() {
    try {
      const data = await apiFetch('/api/user/favorites');
      state.favorites = data.favorites || [];
      refreshCatalogUI();
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  },
  async toggle(id) {
    try {
      await apiFetch('/api/user/favorites', { method: 'POST', body: JSON.stringify({ itemId: id }) });
      const idx = state.favorites.indexOf(id);
      if (idx > -1) state.favorites.splice(idx, 1);
      else state.favorites.push(id);
      refreshCatalogUI();
    } catch (e) {
      toast('Could not update favorites', 'error');
    }
  },
  render() {
    const list = document.getElementById('favoritesList');
    if (!list) return;
    const favs = CATALOG.hotels.filter(h => state.favorites.includes(h.id));
    if (favs.length === 0) {
      list.innerHTML = '';
      document.getElementById('emptyFavorites').classList.remove('hidden');
      return;
    }
    document.getElementById('emptyFavorites').classList.add('hidden');
    list.innerHTML = favs.map(h => ui.renderHotelCard(h)).join('');
  }
};

// ==================== BOOKINGS ====================
const bookings = {
  async load() {
    try {
      const data = await apiFetch('/api/user/bookings');
      state.bookings = data.bookings || [];
      this.render();
    } catch (e) {
      console.warn('Failed to load bookings', e);
      state.bookings = [];
    }
  },
  render() {
    const list = document.getElementById('bookingsList');
    if (!list) return;
    const filtered = state.bookings.filter(b => {
      const d = b.type === 'hotel' ? b.checkin : b.date;
      return (state.currentBookingTab === 'upcoming') ? new Date(d) >= new Date() : new Date(d) < new Date();
    });
    if (filtered.length === 0) {
      list.innerHTML = '';
      document.getElementById('emptyBookings').classList.remove('hidden');
      return;
    }
    document.getElementById('emptyBookings').classList.add('hidden');
    list.innerHTML = filtered.map(b => `
      <div onclick="showBookingDetails('${b.id}')" class="hotel-card rounded-xl p-3 flex gap-3 cursor-pointer">
        <img src="${getImageUrl(b.image)}" class="w-20 h-20 rounded-lg object-cover" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
        <div class="flex-1">
          <h3 class="font-display font-bold text-sm">${b.type === 'hotel' ? b.hotelName : b.type === 'excursion' ? b.title : b.vehicleType + ' Transfer'}</h3>
          <p class="text-[10px]">${utils.formatDate(b.checkin || b.date)}</p>
          <p class="font-bold text-violet-500 text-sm">${b.priceFormatted || utils.formatPrice(b.total)}</p>
        </div>
      </div>`).join('');
  },
  switchTab(tab) {
    state.currentBookingTab = tab;
    this.render();
  }
};

// ==================== NOTIFICATIONS ====================
const notifications = {
  list: [],
  async load() {
    try {
      const data = await apiFetch('/api/notifications');
      this.list = data.notifications || [];
      this.render();
    } catch (e) {
      console.warn('Failed to load notifications', e);
    }
  },
  render() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    if (!this.list.length) {
      list.innerHTML = `<p class="text-center py-10">No notifications yet</p>`;
      return;
    }
    list.innerHTML = this.list.map(n => `
      <div class="card rounded-xl p-3.5 flex items-start gap-3">
        <div class="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center"><i class="fa-solid ${n.icon || 'fa-bell'}"></i></div>
        <div class="flex-1">
          <h3 class="font-semibold text-sm">${n.title}</h3>
          <p class="text-xs">${n.msg}</p>
          <p class="text-[9px] text-gray-400">${new Date(n.createdAt).toLocaleString()}</p>
        </div>
      </div>`).join('');
  }
};

// ==================== PLACEHOLDER FUNCTIONS (to be implemented) ====================
function showHotelPage(id) {
  toast('Hotel details coming soon', 'info');
}
function showExcursionPage(id) {
  toast('Excursion details coming soon', 'info');
}
function showDestinationPage(id) {
  toast('Destination details coming soon', 'info');
}
function showArticlePage(id) {
  toast('Article details coming soon', 'info');
}
function showRestaurantPage(id) {
  toast('Restaurant details coming soon', 'info');
}
function startTransferBooking(id) {
  toast('Transfer booking coming soon', 'info');
}
function showBookingDetails(id) {
  toast('Booking details coming soon', 'info');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadI18nDict();
  I18N.init();
  if (auth.isLoggedIn()) {
    enterApp();
  } else {
    nav.showAuth();
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.closest('#authPage form')) {
    e.preventDefault();
    handleAuthSubmit(e);
  }
});
