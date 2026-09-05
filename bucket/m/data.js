// ==================== CONFIG ====================
const WORKER_URL = 'https://gh.gm-093.workers.dev';
let authToken = localStorage.getItem('ds_auth_token') || null;
let currentUser = JSON.parse(localStorage.getItem('ds_current_user') || 'null');

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27300%27%3E%3Crect fill=%27%232b2140%27 width=%27400%27 height=%27300%27/%3E%3Ctext x=%27200%27 y=%27150%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%239d94b8%27 font-size=%2720%27 font-family=%27sans-serif%27%3ENo Image%3C/text%3E%3C/svg%3E";

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
  activeSearchTab: 'excursions',
  guests: { adults: 2, children: 0, infants: 0, rooms: 1 },
  pageHistory: ['home'],
  bookingDraft: {},
  transferPax: 2,
  transferDirection: 'Airport to Hotel',
  hotelsCache: [],
  reviewTarget: null,
};

const CATALOG = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };
const CATALOG_RAW = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };

// ==================== MULTILANG FIELDS ====================
const MULTILANG_FIELDS = [
  'name', 'title', 'description', 'fullDescription', 'location', 'vehicleType',
  'duration', 'tagline', 'cuisine', 'text', 'itemName', 'excerpt', 'content',
  'openHours', 'category', 'type', 'beds', 'size', 'meetingPoint', 'address'
];
const MULTILANG_ARRAY_FIELDS = ['amenities', 'includes', 'features', 'excludes', 'whatToBring', 'images', 'menu', 'itinerary'];

// ==================== CURRENCY ====================
const CURRENCY_SYMBOLS = { EGP: 'ج.م', USD: '$', EUR: '€', GBP: '£', SAR: 'ر.س', RUB: '₽' };
const DISPLAY_CURRENCIES = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'RUB'];
let currencyRates = null;
let currencyAvailable = false;

async function initCurrency() {
  try {
    const cached = JSON.parse(localStorage.getItem('ds_fx_cache') || 'null');
    if (cached && cached.rates && (Date.now() - cached.ts) < 6 * 60 * 60 * 1000) {
      currencyRates = cached.rates;
      currencyAvailable = true;
      applyCurrencyAvailability();
      return;
    }
    const res = await fetch('https://open.er-api.com/v6/latest/EGP');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      currencyRates = data.rates;
      currencyAvailable = true;
      localStorage.setItem('ds_fx_cache', JSON.stringify({ rates: data.rates, ts: Date.now() }));
    } else {
      currencyAvailable = false;
    }
  } catch (err) {
    console.warn('Currency API unavailable — showing EGP only.', err);
    currencyAvailable = false;
  }
  applyCurrencyAvailability();
}

function applyCurrencyAvailability() {
  if (!currencyAvailable) state.currency = 'EGP';
  const sel = document.getElementById('currencySelect');
  if (sel) {
    sel.innerHTML = (currencyAvailable ? DISPLAY_CURRENCIES : ['EGP']).map(c => `<option value="${c}">${c} (${CURRENCY_SYMBOLS[c]})</option>`).join('');
    sel.value = state.currency;
    sel.disabled = !currencyAvailable;
  }
  const note = document.getElementById('currencyAvailabilityNote');
  if (note) note.classList.toggle('hidden', currencyAvailable);
}

function formatPrice(egpAmount) {
  if (!currencyAvailable || state.currency === 'EGP' || !currencyRates || !currencyRates[state.currency]) {
    return 'ج.م ' + Math.round(egpAmount).toLocaleString();
  }
  const converted = egpAmount * currencyRates[state.currency];
  const symbol = CURRENCY_SYMBOLS[state.currency] || CURRENCY_SYMBOLS.EGP;
  const decimals = state.currency === 'EGP' ? 0 : 2;
  return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ==================== UTILITIES ====================
const utils = {
  todayIso() { return new Date().toISOString().slice(0, 10); },
  addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); },
  formatDate(iso) { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
  formatPrice: formatPrice,
  generateId() { return 'DS-' + Math.random().toString(36).substr(2, 6).toUpperCase(); },
  renderStars(rating) { let s=''; const r=Math.round(rating||0); for(let i=1;i<=5;i++) s += i<=r ? '<i class="fa-solid fa-star text-gold-400 text-[10px]"></i>' : '<i class="fa-solid fa-star text-[10px]" style="color:#453f5c"></i>'; return s; },
  avgRating(list) { return list.length ? list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length : null; },
  confetti() {
    const colors = ['#fbbf24', '#fcd34d', '#f97316', '#c2410c', '#fb7185', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.width = (Math.random() * 8 + 4) + 'px';
      c.style.height = (Math.random() * 8 + 4) + 'px';
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      c.style.animationDelay = Math.random() * 0.5 + 's';
      c.style.animationDuration = (Math.random() * 2 + 2) + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  },
  stepIndicator(current, labels) {
    const steps = labels.map((label, i) => ({ n: i + 1, label }));
    return `<div class="flex items-start justify-center">` + steps.map((s, idx) => {
      const done = s.n < current, activeStep = s.n === current;
      const circleClass = done ? 'bg-gold-400 text-ink-900' : activeStep ? 'bg-white text-violet-700 ring-2 ring-white' : 'bg-white/15 text-white/60';
      const labelClass = activeStep || done ? 'text-white font-semibold' : 'text-white/50';
      const inner = done ? '<i class="fa-solid fa-check"></i>' : s.n;
      let html = `<div class="flex flex-col items-center"><div class="step-circle ${circleClass}">${inner}</div><span class="step-label ${labelClass}">${s.label}</span></div>`;
      if (idx < steps.length - 1) html += `<div class="step-line ${s.n < current ? 'bg-gold-400' : 'bg-white/20'} mt-4"></div>`;
      return html;
    }).join('') + `</div>`;
  },
  createStars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      star.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(star);
    }
  }
};

function toast(msg, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-violet-600' };
  const icons = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' };
  const t = document.createElement('div');
  t.className = `${colors[type]} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 toast`;
  t.innerHTML = `<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i class="fa-solid ${icons[type]} text-sm"></i></div><span class="text-sm font-medium">${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-20px)'; setTimeout(() => t.remove(), 400); }, 3000);
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function hideSplash() {
  const splash = document.getElementById('splashPage');
  if (splash) {
    splash.style.transition = 'opacity .5s ease';
    splash.style.opacity = '0';
    setTimeout(() => { splash.style.display = 'none'; splash.remove(); }, 500);
  }
}

// ==================== THEME ====================
const THEME = {
  get() { return localStorage.getItem('ds_theme') || 'dark'; },
  set(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('ds_theme', t);
    document.querySelectorAll('.theme-switch .knob i').forEach(i => {
      i.className = t === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });
  },
  toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  init() { this.set(this.get()); }
};

// ==================== API HELPER ====================
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${WORKER_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('ds_auth_token');
    localStorage.removeItem('ds_current_user');
    nav.showAuth();
    throw new Error('Session expired. Please login again.');
  }

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
    // تحديث الكتالوج والواجهة
    localizeCatalog(lang);
    refreshCatalogUI();
  },
  init() { this.set(this.get()); }
};

// ==================== LOCALIZATION ====================
function localizeValue(value, lang) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[lang] || value.en || '';
  }
  return value || '';
}

function getImageUrl(item) {
  return localizeValue(item, I18N.get());
}

function localizeItem(raw, lang) {
  const out = Object.assign({}, raw);
  MULTILANG_FIELDS.forEach(f => {
    if (raw[f] !== undefined) out[f] = localizeValue(raw[f], lang);
  });
  MULTILANG_ARRAY_FIELDS.forEach(f => {
    if (raw[f] !== undefined) {
      out[f] = Array.isArray(raw[f]) ? raw[f].map(v => localizeValue(v, lang)) : localizeValue(raw[f], lang);
    }
  });
  if (Array.isArray(raw.rooms)) {
    out.rooms = raw.rooms.map(room => ({
      ...room,
      type: localizeValue(room.type, lang),
      beds: localizeValue(room.beds, lang),
      description: localizeValue(room.description, lang),
      amenities: Array.isArray(room.amenities) ? room.amenities.map(a => localizeValue(a, lang)) : [],
    }));
  }
  if (Array.isArray(raw.menu)) {
    out.menu = raw.menu.map(section => ({
      category: localizeValue(section.category, lang),
      items: (section.items || []).map(item => ({
        ...item,
        name: localizeValue(item.name, lang),
        description: localizeValue(item.description, lang),
      })),
    }));
  }
  if (Array.isArray(raw.itinerary)) {
    out.itinerary = raw.itinerary.map(step => ({
      ...step,
      title: localizeValue(step.title, lang),
      description: localizeValue(step.description, lang),
    }));
  }
  return out;
}

function localizeCatalog(lang) {
  CATALOG.hotels = CATALOG_RAW.hotels.map(item => localizeItem(item, lang));
  CATALOG.excursions = CATALOG_RAW.excursions.map(item => localizeItem(item, lang));
  CATALOG.transfers = CATALOG_RAW.transfers.map(item => localizeItem(item, lang));
  CATALOG.destinations = CATALOG_RAW.destinations.map(item => localizeItem(item, lang));
  CATALOG.restaurants = CATALOG_RAW.restaurants.map(item => localizeItem(item, lang));
  CATALOG.reviews = CATALOG_RAW.reviews.map(item => localizeItem(item, lang));
  CATALOG.articles = CATALOG_RAW.articles.map(item => localizeItem(item, lang));
}

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
      updateDrawerUser(currentUser.displayName || currentUser.email, currentUser.email, currentUser.photoURL);
      return data.user;
    } catch (e) { toast(e.message, 'error'); return null; }
  },
  async signUp(name, email, password) {
    try {
      const data = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      authToken = data.idToken;
      currentUser = data.user;
      localStorage.setItem('ds_auth_token', authToken);
      localStorage.setItem('ds_current_user', JSON.stringify(currentUser));
      updateDrawerUser(currentUser.displayName || currentUser.email, currentUser.email, currentUser.photoURL);
      return data.user;
    } catch (e) { toast(e.message, 'error'); return null; }
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

async function handleGoogleSignIn() {
  try {
    if (!window.google?.accounts?.id) { toast('Google Sign-In is not available. Please use email login.', 'error'); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      scope: 'profile email',
      callback: async (response) => {
        if (response.error) { toast('Google Sign-In failed', 'error'); return; }
        try {
          const data = await apiFetch('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken: response.credential }) });
          authToken = data.idToken;
          currentUser = data.user;
          localStorage.setItem('ds_auth_token', authToken);
          localStorage.setItem('ds_current_user', JSON.stringify(currentUser));
          updateDrawerUser(currentUser.displayName || currentUser.email, currentUser.email, currentUser.photoURL);
          enterApp();
        } catch (e) { toast(e.message, 'error'); }
      },
    });
    client.requestAccessToken();
  } catch (e) { toast(e.message, 'error'); }
}

// ==================== USER PROFILE & AVATAR ====================
const profileAvatar = {
  currentPhoto: null,
  render(name, photoURL) {
    this.currentPhoto = photoURL || null;
    const letter = (name || 'G').charAt(0).toUpperCase();
    const wrap = document.getElementById('profileAvatarWrap');
    const drawerAv = document.getElementById('drawerAvatar');
    const navAv = document.getElementById('navProfileAvatar');
    if (wrap) wrap.innerHTML = photoURL ? `<img src="${photoURL}" class="w-full h-full object-cover">` : `<span class="font-display text-5xl font-bold text-violet-600" id="profileAvatarLetter">${letter}</span>`;
    if (drawerAv) drawerAv.innerHTML = photoURL ? `<img src="${photoURL}" class="w-full h-full object-cover">` : letter;
    if (navAv) navAv.innerHTML = photoURL ? `<img src="${photoURL}" alt="">` : letter;
  },
  handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2; const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        this.save(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },
  async save(dataUrl) {
    toast('Updating photo…', 'info');
    if (currentUser) {
      try {
        await apiFetch('/api/profile', { method: 'POST', body: JSON.stringify({ profile: { photoURL: dataUrl } }) });
        currentUser.photoURL = dataUrl;
        localStorage.setItem('ds_current_user', JSON.stringify(currentUser));
        this.render(currentUser.displayName || currentUser.email, dataUrl);
        toast('Profile photo updated', 'success');
      } catch (e) { toast('Could not save photo: ' + e.message, 'error'); }
    } else {
      localStorage.setItem('ds_avatar', dataUrl);
      this.render(document.getElementById('profileName').textContent, dataUrl);
      toast('Profile photo updated', 'success');
    }
  }
};

function updateDrawerUser(name, email, photoURL) {
  const n = document.getElementById('drawerName'); if (n) n.textContent = name || 'Guest';
  const e = document.getElementById('drawerEmail'); if (e) e.textContent = email || '';
  const pn = document.getElementById('profileName'); if (pn) pn.textContent = name || 'Guest';
  const pe = document.getElementById('profileEmail'); if (pe) pe.textContent = email || '';
  profileAvatar.render(name, photoURL);
}

// ==================== REVIEWS ====================
async function loadReviews(type, id, listElId, summaryElId) {
  try {
    const data = await apiFetch(`/api/reviews?type=${type}&id=${id}`);
    const reviews = data.reviews || [];
    const listEl = document.getElementById(listElId);
    if (listEl) {
      listEl.innerHTML = reviews.length ? reviews.slice().reverse().map(r => `
        <div class="field-box rounded-xl p-3">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-violet-50 rounded-full flex items-center justify-center font-bold">${(r.name || '?').charAt(0)}</div>
              <div><p class="text-xs font-semibold">${r.name}</p><div class="flex">${utils.renderStars(r.rating)}</div></div>
            </div>
            <span class="text-[9px]">${utils.formatDate(r.createdAt)}</span>
          </div>
          <p class="text-xs">${r.comment}</p>
        </div>`).join('') : '<p class="text-xs text-center py-4">No reviews yet</p>';
    }
    if (summaryElId) {
      const avg = utils.avgRating(reviews);
      const el = document.getElementById(summaryElId);
      if (el) el.textContent = avg ? avg.toFixed(1) : '—';
    }
  } catch (e) { console.warn('Failed to load reviews', e); }
}

function openReviewModal(type, id, bookingId = '') {
  state.reviewTarget = { type, id, bookingId };
  document.getElementById('reviewBookingId').value = bookingId;
  document.getElementById('reviewName').value = currentUser?.displayName || '';
  document.getElementById('reviewComment').value = '';
  const rating = document.getElementById('reviewRating');
  if (rating) rating.value = 5;
  document.getElementById('reviewModal').classList.remove('hidden');
}

async function submitReview(e) {
  e.preventDefault();
  const bookingId = document.getElementById('reviewBookingId').value.trim().toUpperCase();
  const name = document.getElementById('reviewName').value.trim();
  const comment = document.getElementById('reviewComment').value.trim();
  const rating = document.getElementById('reviewRating')?.value || 5;
  if (!bookingId || !comment) return toast('Booking ID and comment required', 'error');
  try {
    await apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ type: state.reviewTarget.type, id: state.reviewTarget.id, bookingId, name, comment, rating }),
    });
    document.getElementById('reviewModal').classList.add('hidden');
    toast('Review submitted!', 'success');
    loadReviews(state.reviewTarget.type, state.reviewTarget.id, state.reviewTarget.type === 'hotel' ? 'hotelReviewsList' : 'excursionReviewsList', null);
  } catch (e) { toast(e.message, 'error'); }
}

// ==================== FAVORITES / BOOKINGS / NOTIFICATIONS ====================
const favorites = {
  async load() {
    if (!authToken) { this.render(); return; }
    try { const data = await apiFetch('/api/user/favorites'); state.favorites = data.favorites || []; } catch (e) { state.favorites = []; }
    this.render();
  },
  async toggle(id) {
    try {
      await apiFetch('/api/user/favorites', { method: 'POST', body: JSON.stringify({ itemId: id }) });
      const idx = state.favorites.indexOf(id);
      if (idx > -1) state.favorites.splice(idx, 1); else state.favorites.push(id);
      this.render(); refreshCatalogUI();
    } catch (e) { toast('Could not update favorites', 'error'); }
  },
  render() {
    const list = document.getElementById('favoritesList'); if (!list) return;
    const favs = CATALOG.hotels.filter(h => state.favorites.includes(h.id));
    const empty = document.getElementById('emptyFavorites');
    if (favs.length === 0) { list.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = favs.map(h => ui.renderHotelCard(h)).join('');
  }
};

const bookings = {
  async load() {
    if (!authToken) { this.render(); return; }
    try {
      const data = await apiFetch('/api/user/bookings');
      state.bookings = data.bookings || [];
      console.log('Bookings loaded:', state.bookings); // للفحص المؤقت
    } catch (e) {
      console.error('Failed to load bookings:', e);
      state.bookings = [];
    }
    this.render();
  },
  render() {
    const list = document.getElementById('bookingsList'); if (!list) return;
    const upcoming = state.bookings.filter(b => {
      const d = b.checkin || b.date;
      if (!d) return false;
      return new Date(d) >= new Date();
    });
    const past = state.bookings.filter(b => {
      const d = b.checkin || b.date;
      if (!d) return false;
      return new Date(d) < new Date();
    });
    const filtered = state.currentBookingTab === 'upcoming' ? upcoming : past;

    if (filtered.length === 0) { list.innerHTML = ''; document.getElementById('emptyBookings').classList.remove('hidden'); return; }
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
    const up = document.getElementById('tabUpcoming');
    const past = document.getElementById('tabHistory');
    if (up && past) {
      if (tab === 'upcoming') {
        up.className = 'flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-lg';
        past.className = 'flex-1 py-3 rounded-xl text-sm font-medium';
        past.style.color = 'var(--text-secondary)';
      } else {
        past.className = 'flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-lg';
        up.className = 'flex-1 py-3 rounded-xl text-sm font-medium';
        up.style.color = 'var(--text-secondary)';
      }
    }
    this.render();
  }
};

const notifications = {
  list: [],
  async load() {
    if (!authToken) { this.render(); return; }
    try { const data = await apiFetch('/api/notifications'); this.list = data.notifications || []; } catch (e) { this.list = []; }
    this.render();
  },
  render() {
    const list = document.getElementById('notificationsList'); if (!list) return;
    if (!this.list.length) { list.innerHTML = '<p class="text-center py-10">No notifications yet</p>'; return; }
    list.innerHTML = this.list.map(n => `
      <div class="card rounded-xl p-3.5 flex items-start gap-3">
        <div class="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center"><i class="fa-solid ${n.icon || 'fa-bell'}"></i></div>
        <div class="flex-1"><h3 class="font-semibold text-sm">${n.title}</h3><p class="text-xs">${n.msg}</p><p class="text-[9px] text-gray-400">${new Date(n.createdAt).toLocaleString()}</p></div>
      </div>`).join('');
  },
  markAllRead() { this.list.forEach(n => n.read = true); this.render(); },
  markRead(id) { const n = this.list.find(x => x.id === id); if (n && !n.read) { n.read = true; this.render(); } }
};
