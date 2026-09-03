window.FALLBACK_LOGO = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#ea580c"/></linearGradient></defs>
<circle cx="32" cy="32" r="30" fill="url(#g)"/>
<circle cx="32" cy="32" r="30" fill="none" stroke="#171029" stroke-width="1" opacity="0.15"/>
<path d="M32 14 L38 32 L32 50 L26 32 Z" fill="#171029"/>
<circle cx="32" cy="32" r="4" fill="#fdba74"/>
</svg>`);

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%232b2140' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='.3em' fill='%239d94b8' font-size='20' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

// ===================== CONFIG & STATE =====================
let WORKER_URL = 'https://discover-sharm-api.gm-093.workers.dev'; // ضع رابط الـ Worker الخاص بك هنا
let firebaseConfig = {};
let KASHIER_CONFIG = { merchantId: '', mode: 'live', currency: 'EGP', hashEndpoint: '', merchantRedirect: '' };
let APP_CONFIG = {
  siteName: 'Discover Sharm',
  brandColorPrimary: '#f97316',
  brandColorPrimaryDark: '#c2410c',
  defaultCurrency: 'EGP',
  displayCurrencies: ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'RUB'],
  supportedLanguages: ['en', 'ar', 'ru', 'de', 'it', 'tr']
};
let fbEnabled = false, fbApp = null, fbAuth = null, fbDB = null, fbStorage = null, currentUser = null;
let userDataRefs = [];

const state = {
  bookings: JSON.parse(localStorage.getItem('ds_bookings') || '[]'),
  favorites: JSON.parse(localStorage.getItem('ds_favorites') || '[]'),
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
  hotelsCache: []
};

const CATALOG = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };
const CATALOG_RAW = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };

const EMERGENCY_FALLBACK_CATALOG = {
  hotels: [{ id: 'h1', name: { en: 'Discover Grand Hotel', ar: 'فندق ديسكفر جراند' }, category: 'luxury', description: { en: 'Luxury 5-star hotel with sea view' }, fullDescription: { en: 'Luxury 5-star hotel with sea view.' }, price: 3800, rating: 5, reviews: 234, location: { en: 'Naama Bay, Sharm El Sheikh' }, image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=90', images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=90'], amenities: { en: ['Free WiFi', 'Breakfast', 'Pool'] }, bestseller: true, rooms: [{ id: 'r1', type: { en: 'Deluxe Sea View' }, price: 3800, size: '35m²', beds: { en: '1 King Bed' }, guests: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&q=80', description: { en: 'A bright room with sea views.' } }] }],
  excursions: [{ id: 'e1', title: { en: 'Ras Mohammed Snorkeling Trip' }, category: 'Diving', price: 1150, rating: 4.8, reviews: 312, duration: { en: 'Full Day (8h)' }, image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'], description: { en: 'Snorkel the coral reefs of Ras Mohammed National Park.' }, fullDescription: { en: 'Snorkel the coral reefs of Ras Mohammed National Park.' }, includes: { en: ['Hotel pickup & drop-off', 'Snorkeling equipment'] }, meetingPoint: { en: 'Hotel lobby pickup, 7:30 AM' } }],
  transfers: [{ id: 't1', vehicleType: { en: 'Tourist H1' }, capacity: 7, price: 950, image: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80', description: { en: 'Air-conditioned tourist-class Hyundai H1 for airport pickup or drop-off.' }, features: { en: ['Tourist-class Hyundai H1', 'Air-conditioned', 'Meet & greet at arrivals'] } }],
  restaurants: [{ id: 'rest1', name: { en: 'Fares Seafood', ar: 'فارس للمأكولات البحرية' }, category: 'Seafood', cuisine: 'Seafood', priceLevel: 3, rating: 4.7, reviews: 189, location: { en: 'Naama Bay, Sharm El Sheikh' }, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'], description: { en: 'Fresh seafood with a sea view.' }, fullDescription: { en: 'One of the best seafood restaurants in Sharm El Sheikh, offering a wide variety of fresh fish and sea views.' }, openHours: '12:00 PM - 12:00 AM', menu: [{ category: { en: 'Starters' }, items: [{ name: { en: 'Shrimp Cocktail' }, price: 180, description: { en: 'Fresh shrimp with cocktail sauce.' } }] }] }],
  destinations: [],
  reviews: [],
  articles: []
};

const MULTILANG_FIELDS = ['name', 'title', 'description', 'fullDescription', 'location', 'vehicleType', 'duration', 'tagline', 'text', 'excerpt', 'content', 'cuisine'];
const MULTILANG_ARRAY_FIELDS = ['amenities', 'includes', 'features', 'excludes', 'whatToBring'];

// ===================== CURRENCY =====================
const CURRENCY_SYMBOLS = { EGP: 'ج.م', USD: '$', EUR: '€', GBP: '£', SAR: 'ر.س', RUB: '₽' };
const DISPLAY_CURRENCIES = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'RUB'];

const CurrencyAPI = {
  rates: null,
  available: false,
  lastFetch: 0,
  async init() {
    try {
      const cached = JSON.parse(localStorage.getItem('ds_fx_cache') || 'null');
      if (cached && cached.rates && (Date.now() - cached.ts) < 6 * 60 * 60 * 1000) {
        this.rates = cached.rates;
        this.available = true;
        this.applyAvailability();
        return;
      }
      const res = await fetch('https://open.er-api.com/v6/latest/EGP');
      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        this.rates = data.rates;
        this.available = true;
        this.lastFetch = Date.now();
        localStorage.setItem('ds_fx_cache', JSON.stringify({ rates: data.rates, ts: Date.now() }));
      } else {
        this.available = false;
      }
    } catch (err) {
      console.warn('Currency API unavailable — showing EGP only.', err);
      this.available = false;
    }
    this.applyAvailability();
  },
  applyAvailability() {
    if (!this.available) state.currency = 'EGP';
    const sel = document.getElementById('currencySelect');
    if (sel) {
      sel.innerHTML = (this.available ? (APP_CONFIG.displayCurrencies || DISPLAY_CURRENCIES) : ['EGP']).map(c => `<option value="${c}">${c} (${CURRENCY_SYMBOLS[c]})</option>`).join('');
      sel.value = state.currency;
      sel.disabled = !this.available;
    }
    const note = document.getElementById('currencyAvailabilityNote');
    if (note) note.classList.toggle('hidden', this.available);
  },
  toDisplay(egpAmount) {
    if (!this.available || state.currency === 'EGP' || !this.rates || !this.rates[state.currency]) return egpAmount;
    return egpAmount * this.rates[state.currency];
  }
};

// ===================== THEME =====================
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

// ===================== I18N =====================
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
    console.warn('Could not load data/lang/*.json — falling back to built-in English text.', err);
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
      if (val) { if (el.tagName === 'OPTION') el.textContent = val;
        else el.innerHTML = val; }
    });
    document.querySelectorAll('.lang-select').forEach(sel => { sel.value = lang; });
    if (typeof onLanguageChanged === 'function') onLanguageChanged(lang);
  },
  init() { this.set(this.get()); }
};

// ===================== UTILS =====================
const utils = {
  formatPrice(egp) {
    const displayAmount = CurrencyAPI.toDisplay(egp);
    const symbol = CURRENCY_SYMBOLS[state.currency] || CURRENCY_SYMBOLS.EGP;
    const decimals = state.currency === 'EGP' ? 0 : 2;
    return `${symbol}${displayAmount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  },
  save() {
    localStorage.setItem('ds_bookings', JSON.stringify(state.bookings));
    localStorage.setItem('ds_favorites', JSON.stringify(state.favorites));
  },
  generateId() { return 'DS-' + Math.random().toString(36).substr(2, 6).toUpperCase(); },
  toast(msg, type = 'success') {
    const colors = { success: 'bg-gradient-to-r from-green-600 to-emerald-600', error: 'bg-gradient-to-r from-red-600 to-rose-600', info: 'bg-gradient-to-r from-violet-600 to-violet-700' };
    const icons = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' };
    const t = document.createElement('div');
    t.className = `${colors[type]} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 toast pointer-events-auto`;
    t.innerHTML = `<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"><i class="fa-solid ${icons[type]} text-sm"></i></div><span class="text-sm font-medium flex-1">${msg}</span>`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-20px) scale(0.95)';
      setTimeout(() => t.remove(), 400);
    }, 3000);
  },
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
  renderStars(rating) {
    let stars = '';
    const r = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) stars += i <= r ? '<i class="fa-solid fa-star star-filled text-[10px]"></i>' : '<i class="fa-solid fa-star star-empty text-[10px]"></i>';
    return stars;
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
  },
  stepIndicator(current, labels) {
    const steps = labels.map((label, i) => ({ n: i + 1, label }));
    return `<div class="flex items-start justify-center">` + steps.map((s, idx) => {
      const done = s.n < current,
        activeStep = s.n === current;
      const circleClass = done ? 'bg-gold-400 text-ink-900' : activeStep ? 'bg-white text-violet-700 ring-2 ring-white' : 'bg-white/15 text-white/60';
      const labelClass = activeStep || done ? 'text-white font-semibold' : 'text-white/50';
      const inner = done ? '<i class="fa-solid fa-check"></i>' : s.n;
      let html = `<div class="flex flex-col items-center"><div class="step-circle ${circleClass}">${inner}</div><span class="step-label ${labelClass}">${s.label}</span></div>`;
      if (idx < steps.length - 1) html += `<div class="step-line ${s.n < current ? 'bg-gold-400' : 'bg-white/20'} mt-4"></div>`;
      return html;
    }).join('') + `</div>`;
  },
  formatDate(iso) { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
  addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return utils.toLocalIso(d); },
  toLocalIso(d) { const y = d.getFullYear(),
      m = String(d.getMonth() + 1).padStart(2, '0'),
      day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; },
  todayIso() { return utils.toLocalIso(new Date()); },
  avgRating(list) { if (!list || !list.length) return null; return list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length; }
};

// ===================== WORKER API =====================
const GitHubStore = {
  async read(file) {
    const res = await fetch(`${WORKER_URL}/file?file=${encodeURIComponent(file)}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'فشل القراءة');
    return JSON.parse(data.content);
  }
};

// ===================== AUTH =====================
const auth = {
  mode: 'login',
  switchMode(m) {
    this.mode = m;
    document.getElementById('authTitle').textContent = m === 'login' ? 'Welcome Back' : 'Create Account';
    document.getElementById('authNameWrap').classList.toggle('hidden', m === 'login');
    document.getElementById('authSubmitBtn').textContent = m === 'login' ? 'Log In' : 'Sign Up';
    document.getElementById('authSwitchText').textContent = m === 'login' ? "Don't have an account?" : 'Already have an account?';
    document.getElementById('authSwitchLink').textContent = m === 'login' ? 'Sign Up' : 'Log In';
  },
  async submit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    const name = document.getElementById('authName') ? document.getElementById('authName').value : '';
    const countryCode = document.getElementById('authCountryCode') ? document.getElementById('authCountryCode').value : '';
    const phone = document.getElementById('authPhone') ? document.getElementById('authPhone').value.trim() : '';
    if (this.mode === 'signup' && !phone) { utils.toast('Please enter your phone number', 'error'); return; }
    if (!fbEnabled) { utils.toast("Sign-in is temporarily unavailable — continuing as guest", 'info'); return nav.showApp(); }
    const btn = document.getElementById('authSubmitBtn');
    const original = btn.textContent;
    btn.textContent = 'Please wait…';
    btn.disabled = true;
    try {
      if (this.mode === 'signup') {
        const cred = await fbAuth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        await fbDB.ref('users/' + cred.user.uid + '/profile').set({ name, email, countryCode, phone, fullPhone: countryCode + ' ' + phone });
        utils.toast('Account created!', 'success');
      } else {
        await fbAuth.signInWithEmailAndPassword(email, pass);
        utils.toast('Welcome back!', 'success');
      }
    } catch (err) { utils.toast(err.message, 'error'); } finally { btn.textContent = original;
      btn.disabled = false; }
  },
  async googleSignIn() {
    if (!fbEnabled) { utils.toast("Firebase not connected — continuing in guest mode", 'info'); return nav.showApp(); }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await fbAuth.signInWithPopup(provider);
      const snap = await fbDB.ref('users/' + cred.user.uid + '/profile').once('value');
      if (!snap.exists()) await fbDB.ref('users/' + cred.user.uid + '/profile').set({ name: cred.user.displayName || '', email: cred.user.email || '', photoURL: cred.user.photoURL || '' });
      utils.toast('Signed in with Google!', 'success');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/unauthorized-domain') utils.toast('This domain isn\'t authorized for Google sign-in yet — add it in Firebase Console → Authentication → Settings.', 'error');
      else utils.toast(err.message, 'error');
    }
  },
  continueAsGuest() { nav.showApp(); },
  async logout() {
    if (!confirm('Are you sure?')) return;
    if (fbEnabled && fbAuth && currentUser) { await fbAuth.signOut(); } else { localStorage.clear();
      location.reload(); }
  }
};

// ===================== CONFIG LOADER =====================
async function loadAppConfig() {
  try {
    const res = await fetch(`${WORKER_URL}/config`);
    const cfg = await res.json();
    if (cfg.firebase) firebaseConfig = cfg.firebase;
    if (cfg.github) WORKER_URL = cfg.github.proxyEndpoint || WORKER_URL;
    if (cfg.kashier) KASHIER_CONFIG = Object.assign(KASHIER_CONFIG, cfg.kashier);
    if (cfg.app) APP_CONFIG = Object.assign(APP_CONFIG, cfg.app);
    document.documentElement.style.setProperty('--brand-primary', APP_CONFIG.brandColorPrimary);
    document.documentElement.style.setProperty('--brand-primary-dark', APP_CONFIG.brandColorPrimaryDark);
  } catch (err) {
    console.warn('Could not load config from Worker, trying local configs.json', err);
    try {
      const res = await fetch('data/configs.json');
      const cfg = await res.json();
      firebaseConfig = cfg.firebase || {};
      KASHIER_CONFIG = Object.assign({ merchantId: '', mode: 'live', currency: 'EGP', hashEndpoint: '' }, cfg.kashier || {});
      KASHIER_CONFIG.merchantRedirect = window.location.origin + window.location.pathname + (cfg.kashier && cfg.kashier.merchantRedirectPath || '?kashier_callback=1');
      APP_CONFIG = Object.assign(APP_CONFIG, cfg.app || {});
    } catch (e2) {
      console.warn('No config available.');
    }
  }
}

// ===================== CATALOG LOADER =====================
async function loadCatalogFromWorker() {
  const files = ['hotels', 'excursions', 'transfers', 'restaurants'];
  for (const f of files) {
    try {
      const data = await GitHubStore.read(f + '.json');
      CATALOG_RAW[f] = data;
    } catch (err) {
      console.warn(`Failed to load ${f}.json from Worker, using fallback.`, err);
      if (EMERGENCY_FALLBACK_CATALOG[f]) CATALOG_RAW[f] = EMERGENCY_FALLBACK_CATALOG[f];
      else CATALOG_RAW[f] = [];
    }
  }
  CATALOG_RAW.destinations = [];
  CATALOG_RAW.reviews = [];
  CATALOG_RAW.articles = [];
  localizeCatalog(I18N.get());
}

// ===================== LOCALIZATION =====================
function localizeValue(val, lang) {
  if (val && typeof val === 'object' && !Array.isArray(val) && (val.en || val[lang])) return val[lang] || val.en;
  return val;
}

function localizeItem(raw, lang) {
  const out = Object.assign({}, raw);
  MULTILANG_FIELDS.forEach(f => { if (raw[f] !== undefined) out[f] = localizeValue(raw[f], lang); });
  MULTILANG_ARRAY_FIELDS.forEach(f => { if (raw[f] !== undefined) out[f] = localizeValue(raw[f], lang); });
  if (Array.isArray(raw.rooms)) {
    out.rooms = raw.rooms.map(r => Object.assign({}, r, {
      type: localizeValue(r.type, lang),
      beds: localizeValue(r.beds, lang),
      description: localizeValue(r.description, lang)
    }));
  }
  if (Array.isArray(raw.menu)) {
    out.menu = raw.menu.map(section => ({
      category: localizeValue(section.category, lang),
      items: (section.items || []).map(it => ({
        name: localizeValue(it.name, lang),
        description: localizeValue(it.description, lang),
        price: it.price
      }))
    }));
  }
  return out;
}

function localizeCatalog(lang) {
  CATALOG.hotels = CATALOG_RAW.hotels.map(h => localizeItem(h, lang));
  CATALOG.excursions = CATALOG_RAW.excursions.map(x => localizeItem(x, lang));
  CATALOG.transfers = CATALOG_RAW.transfers.map(t => localizeItem(t, lang));
  CATALOG.restaurants = CATALOG_RAW.restaurants.map(r => localizeItem(r, lang));
  CATALOG.destinations = [];
  CATALOG.reviews = [];
  CATALOG.articles = [];
}

function onLanguageChanged(lang) {
  if (CATALOG_RAW.hotels.length || CATALOG_RAW.excursions.length || CATALOG_RAW.transfers.length || CATALOG_RAW.restaurants.length) {
    localizeCatalog(lang);
    refreshCatalogUI();
  }
  transferSearch.populateVehicles();
  const label = document.getElementById('tsPassengersLabel');
  if (label) {
    label.textContent = lang === 'ar' ? `${state.transferPax} أشخاص` : `${state.transferPax} People`;
  }
}

// ===================== FIREBASE INIT =====================
function initFirebase() {
  try {
    const looksConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('YOUR_') !== 0;
    if (looksConfigured && typeof firebase !== 'undefined') {
      fbApp = firebase.initializeApp(firebaseConfig);
      fbAuth = firebase.auth();
      fbDB = firebase.database();
      try { fbStorage = firebase.storage(); } catch (e) { fbStorage = null; }
      fbEnabled = true;
      bindUserDataOnAuth();
      fbAuth.onAuthStateChanged(handleAuthChange);
    } else {
      fbEnabled = false;
      loadCatalogFromWorker().then(refreshCatalogUI);
      setTimeout(() => handleAuthChange(null), 300);
    }
  } catch (err) {
    console.warn('Firebase init failed.', err);
    fbEnabled = false;
    loadCatalogFromWorker().then(refreshCatalogUI);
    setTimeout(() => handleAuthChange(null), 300);
  }
}

function handleAuthChange(user) {
  currentUser = user;
  userDataRefs.forEach(r => r.ref.off('value', r.cb));
  userDataRefs = [];
  if (fbEnabled && user) {
    bindUserData(user.uid);
    updateDrawerUser(user.displayName || (user.email || '').split('@')[0], user.email, user.photoURL);
    notifications.bindUser();
    afterSplash(() => nav.showApp());
  } else if (fbEnabled && !user) {
    updateDrawerUser('Guest', '', null);
    notifications.bindUser();
    afterSplash(() => nav.showAuth());
  } else {
    state.bookings = JSON.parse(localStorage.getItem('ds_bookings') || '[]');
    state.favorites = JSON.parse(localStorage.getItem('ds_favorites') || '[]');
    updateDrawerUser('Guest', '', localStorage.getItem('ds_avatar'));
    notifications.bindUser();
    afterSplash(() => nav.showApp());
  }
}

function bindUserData(uid) {
  const bookingsRef = fbDB.ref('users/' + uid + '/bookings');
  const bookingsCb = snap => {
    const val = snap.val() || {};
    state.bookings = Object.keys(val).map(k => Object.assign({ id: k }, val[k])).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    bookings.render();
    ui.updateProfileStats();
  };
  bookingsRef.on('value', bookingsCb);
  userDataRefs.push({ ref: bookingsRef, cb: bookingsCb });
  const favRef = fbDB.ref('users/' + uid + '/favorites');
  const favCb = snap => {
    const val = snap.val() || {};
    state.favorites = Object.keys(val).filter(k => val[k]);
    ui.renderFeaturedHotels();
    hotels.render();
    favorites.render();
    ui.updateProfileStats();
  };
  favRef.on('value', favCb);
  userDataRefs.push({ ref: favRef, cb: favCb });
}

function bindUserDataOnAuth() {
  // placeholder
}

function updateDrawerUser(name, email, photoURL) {
  const n = document.getElementById('drawerName');
  if (n) n.textContent = name || 'Guest';
  const e = document.getElementById('drawerEmail');
  if (e) e.textContent = email || '';
  const pn = document.getElementById('profileName');
  if (pn) pn.textContent = name || 'Guest';
  const pe = document.getElementById('profileEmail');
  if (pe) pe.textContent = email || '';
  profileAvatar.render(name, photoURL);
}

// ===================== SIDEBAR & NAV =====================
const sidebar = {
  open() { document.getElementById('sideDrawer').classList.add('open');
    document.getElementById('sideDrawerOverlay').classList.add('open'); },
  close() { document.getElementById('sideDrawer').classList.remove('open');
    document.getElementById('sideDrawerOverlay').classList.remove('open'); }
};

const nav = {
  go(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(page + 'Page');
    if (target) target.classList.add('active');
    const stickyHeader = document.getElementById('stickyHomeHeader');
    if (stickyHeader && page !== 'home') stickyHeader.classList.remove('visible');
    document.querySelectorAll('.nav-item').forEach(btn => {
      const isActive = btn.dataset.page === page;
      btn.classList.toggle('active', isActive);
      const icon = btn.querySelector('i');
      if (!icon) return;
      if (isActive && icon.classList.contains('fa-regular')) icon.classList.replace('fa-regular', 'fa-solid');
      if (!isActive && icon.classList.contains('fa-solid') && !['fa-house','fa-hotel'].some(c => icon.classList.contains(c))) icon.classList.replace('fa-solid', 'fa-regular');
    });
    state.pageHistory.push(page);
    window.scrollTo(0, 0);
    if (page === 'hotels') hotels.render();
    if (page === 'excursions') excursionsUi.render();
    if (page === 'transfers') transfersUi.render();
    if (page === 'restaurants') restaurantsUi.renderFull();
    if (page === 'bookings') bookings.render();
    if (page === 'favorites') favorites.render();
    if (page === 'notifications') notifications.render();
    if (page === 'profile') ui.updateProfileStats();
  },
  goBack() { state.pageHistory.pop();
    this.go(state.pageHistory[state.pageHistory.length - 1] || 'home'); },
  showAuth() {
    hideSplash();
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
  },
  showApp() {
    hideSplash();
    document.getElementById('authPage').classList.add('hidden');
    app.enterMainApp();
  }
};

function hideSplash() {
  const s = document.getElementById('splashPage');
  s.style.transition = 'opacity .5s ease';
  s.style.opacity = '0';
  setTimeout(() => { s.style.display = 'none'; }, 500);
}

// ===================== APP ENTRY =====================
const app = {
  enterMainApp() {
    document.getElementById('mainApp').classList.remove('hidden');
    ui.setDefaultDates();
    ui.updateProfileStats();
    loadFeaturedHotels();
    transferSearch.populateVehicles();
  }
};

// ===================== LOAD FEATURED HOTELS =====================
async function loadFeaturedHotels() {
  const el = document.getElementById('featuredHotels');
  if (CATALOG.hotels.length) {
    ui.renderFeaturedHotels();
  } else {
    el.innerHTML = `<div class="text-center py-10 text-white/60">جاري تحميل الفنادق...</div>`;
    try {
      await loadCatalogFromWorker();
      refreshCatalogUI();
    } catch (err) {
      console.warn('Failed to load catalog', err);
      ui.renderFeaturedHotels();
    }
  }
}

// ===================== UI RENDER HELPERS =====================
const ui = {
  renderFeaturedHotels() {
    const featured = CATALOG.hotels.slice(0, 2);
    const el = document.getElementById('featuredHotels');
    if (el) el.innerHTML = featured.map(h => this.renderHotelCard(h)).join('');
  },
  renderHotelCard(h) {
    const isFav = state.favorites.includes(h.id);
    const img = h.image || PLACEHOLDER_IMG;
    return `
    <div onclick="showHotelPage('${h.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
      <div class="flex">
        <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
          <img src="${img}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
          ${h.bestseller ? '<div class="absolute top-2 right-2 badge-bestseller text-[8px] font-black px-2 py-0.5 rounded-md">BEST SELLER</div>' : ''}
          <div class="absolute bottom-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${h.rating}</span></div>
        </div>
        <div class="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-1">
              <h3 class="font-display font-bold text-sm md:text-base line-clamp-1" style="color:var(--text-primary)">${h.name}</h3>
              <button onclick="event.stopPropagation(); favorites.toggle('${h.id}')" class="text-base ${isFav ? 'text-red-500' : 'text-gray-300'} hover:text-red-500 transition flex-shrink-0 ml-1"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i></button>
            </div>
            <div class="flex items-center gap-1 mb-1">${utils.renderStars(h.rating)}<span class="text-[9px] mr-1" style="color:var(--text-secondary)">(${h.reviews || 0})</span></div>
            <p class="text-[10px] mb-1.5 flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500 text-[8px]"></i>${(h.location || '').split(',')[0]}</p>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1 text-[8px]" style="color:var(--text-secondary)">${(h.amenities || []).slice(0, 2).map(a => `<span class="px-1.5 py-0.5 rounded" style="background:var(--bg-field)">${a}</span>`).join('')}</div>
            <div class="text-left"><p class="text-base md:text-lg font-bold text-violet-500 font-display">${utils.formatPrice(h.price)}</p><p class="text-[8px]" style="color:var(--text-secondary)">/ Night</p></div>
          </div>
        </div>
      </div>
    </div>`;
  },
  setDefaultDates() {
    const tomorrow = utils.addDays(utils.todayIso(), 1);
    const dayAfter = utils.addDays(utils.todayIso(), 3);
    setDateFieldValue('checkinDate', tomorrow);
    setDateFieldValue('checkoutDate', dayAfter);
    setDateFieldValue('excursionDate', tomorrow);
  },
  updateProfileStats() {
    const sb = document.getElementById('statBookings');
    if (sb) sb.textContent = state.bookings.length;
    const sf = document.getElementById('statFavorites');
    if (sf) sf.textContent = state.favorites.length;
    const sr = document.getElementById('statReviews');
    if (sr) sr.textContent = state.bookings.filter(b => b.reviewed).length;
  }
};

function refreshCatalogUI() {
  if (!document.getElementById('mainApp') || document.getElementById('mainApp').classList.contains('hidden')) return;
  hotels.render();
  excursionsUi.renderFeatured();
  excursionsUi.render();
  transfersUi.render();
  restaurantsUi.renderRow();
  restaurantsUi.renderFull();
  ui.renderFeaturedHotels();
  transferSearch.populateVehicles();
}

// ===================== SEARCH & FILTERS =====================
const search = {
  handle(q) { state.searchQuery = q.toLowerCase(); if (document.getElementById('hotelsPage').classList.contains('active')) hotels.render(); },
  filterCategory(cat) {
    state.currentFilter = cat;
    document.querySelectorAll('#hotelsPage .filter-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`)));
    hotels.render();
  },
  filterExcursionCategory(cat) {
    state.currentExcursionFilter = cat;
    document.querySelectorAll('.excursion-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`)));
    excursionsUi.render();
  },
  applyExcursionSearch() {
    const cat = document.getElementById('excursionCategorySelect').value;
    state.currentExcursionFilter = cat;
    nav.go('excursions');
    document.querySelectorAll('.excursion-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`)));
  },
  switchTab(tab) {
    state.activeSearchTab = tab;
    const hotelForm = document.getElementById('hotelSearchForm');
    const excursionForm = document.getElementById('excursionSearchForm');
    const transferForm = document.getElementById('transferSearchForm');
    if (hotelForm) hotelForm.classList.toggle('hidden', tab !== 'hotels');
    if (excursionForm) excursionForm.classList.toggle('hidden', tab !== 'excursions');
    if (transferForm) transferForm.classList.toggle('hidden', tab !== 'transfers');
    const tabs = { hotels: 'searchTabHotels', excursions: 'searchTabExcursions', transfers: 'searchTabTransfers' };
    Object.keys(tabs).forEach(t => {
      const btn = document.getElementById(tabs[t]);
      if (!btn) return;
      if (t === tab) {
        btn.style.background = 'linear-gradient(135deg,#fb923c,#c2410c)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-secondary)';
      }
    });
}
};

// ===================== HOTELS =====================
const hotels = {
  render() {
    const list = document.getElementById('hotelsList');
    if (!list) return;
    let filtered = CATALOG.hotels;
    if (state.currentFilter !== 'all') filtered = filtered.filter(h => (h.category || '').toLowerCase() === state.currentFilter);
    if (state.searchQuery) filtered = filtered.filter(h => (h.name || '').toLowerCase().includes(state.searchQuery));
    if (filtered.length === 0) {
      list.innerHTML = `<div class="text-center py-16"><p style="color:var(--text-secondary)">No hotels found</p></div>`;
      return;
    }
    list.innerHTML = filtered.map(h => ui.renderHotelCard(h)).join('');
  }
};

function showHotelPage(hotelId) {
  const h = CATALOG.hotels.find(x => x.id === hotelId);
  if (!h) { utils.toast('Hotel not found', 'error'); return; }
  state.currentHotel = h;
  state.currentRoom = h.rooms && h.rooms[0] ? h.rooms[0] : null;
  const old = document.getElementById('hotelDetailPage');
  if (old) old.remove();
  const page = document.createElement('div');
  page.id = 'hotelDetailPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-card)">
      <div class="relative h-80">
        <div id="hotelGallery" class="gallery-track w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style="scrollbar-width:none" onscroll="onGalleryScroll(this)">
          ${(h.images || [h.image]).map(img => `<img src="${img}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`).join('')}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
        <button onclick="closeHotelPage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
        <button onclick="favorites.toggle('${h.id}'); updateHotelFav('${h.id}')" class="absolute top-4 left-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg z-10"><i id="hotelFavIcon" class="fa-${state.favorites.includes(h.id) ? 'solid text-red-500' : 'regular text-ink-900'} fa-heart"></i></button>
        ${h.bestseller ? '<div class="absolute top-4 left-1/2 -translate-x-1/2 badge-bestseller px-3 py-1 rounded-full text-[10px] font-black">BEST SELLER</div>' : ''}
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="galleryDots">${(h.images || [h.image]).map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>
      </div>
      <div class="relative -mt-6 rounded-t-[28px] p-5 space-y-6 pb-32" style="background:var(--bg-card)">
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ${(h.category || '').toUpperCase()} HOTEL</p>
          <h2 class="font-display text-2xl font-bold mb-1 leading-tight" style="color:var(--text-primary)">${h.name}</h2>
          <div class="flex items-center gap-2 text-sm mb-1">${utils.renderStars(h.rating)}<span class="text-xs" style="color:var(--text-secondary)">${Number(h.rating).toFixed(1)} (${h.reviews || 0} reviews)</span></div>
          <p class="text-xs flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500"></i>${h.location}</p>
        </div>
        <div class="grid grid-cols-3 gap-2">
          ${(h.amenities || []).slice(0, 6).map(a => `<div class="field-box rounded-xl p-2.5 flex flex-col items-center gap-1.5 text-center"><i class="fa-solid fa-check text-violet-500"></i><span class="text-[9px] leading-tight" style="color:var(--text-secondary)">${a}</span></div>`).join('')}
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ABOUT</p>
          <h3 class="font-display text-lg font-bold mb-2" style="color:var(--text-primary)">About this hotel</h3>
          <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${h.fullDescription || h.description || ''}</p>
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ROOMS</p>
          <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Room Options</h3>
          <div class="space-y-3" id="hotelRoomsList">
            ${(h.rooms || []).map((r, i) => `
              <div class="card room-option-card rounded-2xl p-3 flex gap-3 cursor-pointer ${i === 0 ? 'room-selected' : ''}" onclick="selectRoomOnDetail('${h.id}', ${i})">
                <img src="${r.image || PLACEHOLDER_IMG}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-24 h-24 rounded-xl object-cover flex-shrink-0">
                <div class="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 class="font-display font-bold text-sm mb-1" style="color:var(--text-primary)">${r.type}</h4>
                    <div class="flex items-center gap-2 text-[10px] mb-1" style="color:var(--text-secondary)"><span><i class="fa-solid fa-user-group"></i> ${r.guests || 2}</span><span><i class="fa-solid fa-ruler-combined"></i> ${r.size || '25m²'}</span></div>
                    <p class="text-[10px] mb-1" style="color:var(--text-secondary)"><i class="fa-solid fa-bed"></i> ${r.beds || '1 Queen Bed'}</p>
                  </div>
                  <div class="flex items-center justify-between">
                    <p class="font-display font-bold text-violet-500 text-lg">${utils.formatPrice(r.price)}<span class="text-[10px] font-normal" style="color:var(--text-secondary)"> /Night</span></p>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-xl border-t p-4 flex items-center justify-between z-10" style="background:var(--bg-card); border-color:var(--border-card)">
        <div><p class="text-[9px] mb-0.5 font-semibold" style="color:var(--text-secondary)">SELECTED ROOM</p><p class="text-xl font-bold text-violet-500 font-display" id="hotelBottomPriceAmount">${utils.formatPrice((h.rooms && h.rooms[0] ? h.rooms[0].price : h.price))}<span class="text-xs font-normal" style="color:var(--text-secondary)"> / Night</span></p></div>
        <button onclick="startBooking('${h.id}', 0)" class="btn-gold px-7 py-3 rounded-2xl font-bold text-ink-900">Book Now</button>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
  I18N.set(I18N.get());
}

function closeHotelPage() {
  const p = document.getElementById('hotelDetailPage'); if (p) p.remove();
  nav.go('hotels');
}

function selectRoomOnDetail(hotelId, roomIndex) {
  const h = CATALOG.hotels.find(x => x.id === hotelId);
  const r = h && h.rooms && h.rooms[roomIndex];
  if (!r) return;
  state.currentRoom = r;
  document.getElementById('hotelBottomPriceAmount').innerHTML = `${utils.formatPrice(r.price)}<span class="text-xs font-normal" style="color:var(--text-secondary)"> / Night</span>`;
  document.querySelectorAll('#hotelRoomsList .room-option-card').forEach((card, i) => card.classList.toggle('room-selected', i === roomIndex));
}

function updateHotelFav(hotelId) {
  const icon = document.getElementById('hotelFavIcon');
  if (icon) icon.className = state.favorites.includes(hotelId) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-ink-900';
  ui.renderFeaturedHotels();
  hotels.render();
  favorites.render();
}

function onGalleryScroll(el) {
  const idx = Math.round(el.scrollLeft / el.clientWidth);
  document.querySelectorAll('#galleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

// ===================== EXCURSIONS =====================
const excursionsUi = {
  renderFeatured() {
    const el = document.getElementById('featuredExcursions');
    if (!el) return;
    el.innerHTML = CATALOG.excursions.slice(0, 4).map(x => this.renderMiniCard(x)).join('');
  },
  renderMiniCard(x) {
    return `
      <div onclick="showExcursionPage('${x.id}')" class="flex-shrink-0 w-44 cursor-pointer">
        <div class="relative w-44 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg">
          <img src="${x.image || PLACEHOLDER_IMG}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${Number(x.rating).toFixed(1)}</span></div>
          <div class="absolute bottom-2 right-2 left-2"><span class="text-[8px] font-bold text-white bg-violet-600/90 px-2 py-0.5 rounded-full">${x.category}</span></div>
        </div>
        <h4 class="font-display font-bold text-sm line-clamp-2 mb-1" style="color:var(--text-primary)">${x.title}</h4>
        <p class="font-display font-bold text-violet-500 text-sm">${utils.formatPrice(x.price)}<span class="text-[10px] font-normal" style="color:var(--text-secondary)"> /person</span></p>
      </div>`;
  },
  renderCard(x) {
    return `
      <div onclick="showExcursionPage('${x.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
        <div class="flex">
          <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
            <img src="${x.image || PLACEHOLDER_IMG}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
            <div class="absolute bottom-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><span class="text-[9px]" style="color:var(--text-secondary)">(${x.reviews || 0})</span><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${Number(x.rating).toFixed(1)}</span></div>
          </div>
          <div class="flex-1 p-3 flex flex-col justify-between">
            <div>
              <span class="text-[9px] font-bold text-violet-500 mb-1 inline-block">${x.category}</span>
              <h3 class="font-display font-bold text-sm md:text-base line-clamp-2 mb-1" style="color:var(--text-primary)">${x.title}</h3>
              <p class="text-[10px] flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-regular fa-clock text-violet-500 text-[8px]"></i>${x.duration}</p>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-base md:text-lg font-bold text-violet-500 font-display">${utils.formatPrice(x.price)}<span class="text-[9px] font-normal" style="color:var(--text-secondary)"> /person</span></p>
            </div>
          </div>
        </div>
      </div>`;
  },
  render() {
    const list = document.getElementById('excursionsList');
    if (!list) return;
    let filtered = CATALOG.excursions;
    if (state.currentExcursionFilter !== 'all') filtered = filtered.filter(x => x.category === state.currentExcursionFilter);
    if (filtered.length === 0) { list.innerHTML = `<div class="text-center py-16"><p style="color:var(--text-secondary)">No excursions found</p></div>`; return; }
    list.innerHTML = filtered.map(x => this.renderCard(x)).join('');
  }
};

function showExcursionPage(excursionId) {
  const x = CATALOG.excursions.find(i => i.id === excursionId);
  if (!x) return;
  state.currentExcursion = x;
  const old = document.getElementById('excursionDetailPage');
  if (old) old.remove();
  const page = document.createElement('div');
  page.id = 'excursionDetailPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-card)">
      <div class="relative h-72">
        <div id="excursionGallery" class="gallery-track w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style="scrollbar-width:none" onscroll="onExcursionGalleryScroll(this)">
          ${(x.images || [x.image]).map(img => `<img src="${img}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`).join('')}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
        <button onclick="closeExcursionPage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
        <div class="absolute top-4 left-4 bg-violet-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10">${x.category}</div>
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="excursionGalleryDots">${(x.images || [x.image]).map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>
      </div>
      <div class="relative -mt-6 rounded-t-[28px] p-5 space-y-6 pb-32" style="background:var(--bg-card)">
        <div>
          <h2 class="font-display text-2xl font-bold mb-1 leading-tight" style="color:var(--text-primary)">${x.title}</h2>
          <div class="flex items-center gap-2 text-sm mb-1">${utils.renderStars(x.rating)}<span class="text-xs" style="color:var(--text-secondary)">${Number(x.rating).toFixed(1)} (${x.reviews || 0} reviews)</span></div>
          <p class="text-xs flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-regular fa-clock text-violet-500"></i>${x.duration}</p>
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ABOUT</p>
          <h3 class="font-display text-lg font-bold mb-2" style="color:var(--text-primary)">Overview</h3>
          <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${x.fullDescription || x.description}</p>
        </div>
        ${(x.includes || []).length ? `
          <div>
            <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— INCLUDED</p>
            <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">What's Included</h3>
            <div class="grid grid-cols-1 gap-2">${x.includes.map(i => `<div class="flex items-center gap-2 text-sm" style="color:var(--text-secondary)"><i class="fa-solid fa-circle-check text-green-500"></i>${i}</div>`).join('')}</div>
          </div>` : ''}
      </div>
      <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-xl border-t p-4 flex items-center justify-between z-10" style="background:var(--bg-card); border-color:var(--border-card)">
        <div><p class="text-[9px] mb-0.5 font-semibold" style="color:var(--text-secondary)">FROM</p><p class="text-xl font-bold text-violet-500 font-display">${utils.formatPrice(x.price)}<span class="text-xs font-normal" style="color:var(--text-secondary)">/person</span></p></div>
        <button onclick="startExcursionBooking('${x.id}')" class="btn-gold px-7 py-3 rounded-2xl font-bold text-ink-900">Book Now</button>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
  I18N.set(I18N.get());
}

function closeExcursionPage() { const p = document.getElementById('excursionDetailPage'); if (p) p.remove(); nav.go('excursions'); }
function onExcursionGalleryScroll(el) { const idx = Math.round(el.scrollLeft / el.clientWidth); document.querySelectorAll('#excursionGalleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx)); }

// ===================== TRANSFERS =====================
const transfersUi = {
  renderVehicleCard(v) {
    return `
      <div class="hotel-card rounded-2xl overflow-hidden">
        <img src="${v.image || PLACEHOLDER_IMG}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-36 object-cover">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-display font-bold text-base" style="color:var(--text-primary)">${v.vehicleType}</h3>
            <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600"><i class="fa-solid fa-user-group"></i> Up to ${v.capacity}</span>
          </div>
          <p class="text-xs mb-3" style="color:var(--text-secondary)">${v.description}</p>
          <div class="flex flex-wrap gap-1.5 mb-3">${(v.features || []).map(f => `<span class="text-[9px] px-2 py-1 rounded-lg" style="background:var(--bg-field); color:var(--text-secondary)">${f}</span>`).join('')}</div>
          <div class="flex items-center justify-between">
            <p class="font-display font-bold text-violet-500 text-xl">${utils.formatPrice(v.price)}<span class="text-xs font-normal" style="color:var(--text-secondary)"> /trip</span></p>
            <button onclick="startTransferBooking('${v.id}')" class="btn-gold px-6 py-2.5 rounded-2xl font-bold text-ink-900 text-sm">Book</button>
          </div>
        </div>
      </div>`;
  },
  render() {
    const list = document.getElementById('transfersList');
    if (!list) return;
    list.innerHTML = CATALOG.transfers.map(v => this.renderVehicleCard(v)).join('');
  }
};

// ===================== RESTAURANTS =====================
const restaurantsUi = {
  renderCard(r) {
    const imgSrc = r.image || PLACEHOLDER_IMG;
    return `
      <div onclick="showRestaurantPage('${r.id}')" class="restaurant-card">
        <div class="relative h-28">
          <img src="${imgSrc}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 rating-pill px-2 py-1 rounded-full"><span class="text-[9px] font-bold text-gold-400">★ ${r.rating}</span></div>
          <div class="absolute top-2 left-2 bg-ink-950/70 text-white text-[9px] font-bold px-2 py-1 rounded-full capitalize">${r.category}</div>
        </div>
        <div class="p-3">
          <p class="font-display font-bold text-sm mb-0.5 truncate" style="color:var(--text-primary)">${r.name}</p>
          <p class="text-[11px] mb-1.5" style="color:var(--text-secondary)">${r.cuisine} · ${'$'.repeat(r.priceLevel || 2)}</p>
          <p class="text-[10px] flex items-center gap-1 truncate" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500"></i>${r.location}</p>
        </div>
      </div>`;
  },
  renderRow() { const row = document.getElementById('restaurantsRow'); if (row) row.innerHTML = CATALOG.restaurants.map(r => this.renderCard(r)).join(''); },
  renderFull() { const list = document.getElementById('restaurantsFullList'); if (list) list.innerHTML = `<div class="grid grid-cols-2 gap-3">${CATALOG.restaurants.map(r => this.renderCard(r)).join('')}</div>`; }
};

function showRestaurantPage(id) {
  const r = CATALOG.restaurants.find(x => x.id === id);
  if (!r) return;
  const old = document.getElementById('restaurantDetailPage');
  if (old) old.remove();
  const page = document.createElement('div');
  page.id = 'restaurantDetailPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen pb-28 restaurant-lux" style="background:var(--bg-card)">
      <div class="relative h-80">
        <div class="gallery-track w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style="scrollbar-width:none" onscroll="onRestGalleryScroll(this)" id="restGallery">
          ${(r.images || [r.image]).map(img => `<img src="${img}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`).join('')}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/25 pointer-events-none"></div>
        <button onclick="closeRestaurantPage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
        <div class="absolute bottom-5 left-5 right-5 z-10 text-white">
          <div class="flex items-center gap-2 mb-2">
            <span class="lux-cuisine-badge">${r.cuisine}</span>
            <span class="text-gold-400 text-xs font-semibold">${'$'.repeat(r.priceLevel || 2)}</span>
          </div>
          <h1 class="font-display text-3xl font-bold leading-tight mb-2" style="text-shadow:0 2px 12px rgba(0,0,0,.5)">${r.name}</h1>
          <div class="flex items-center gap-2 text-sm">${utils.renderStars(r.rating)}<span class="text-white/80 text-xs">${Number(r.rating).toFixed(1)} (${r.reviews || 0})</span></div>
        </div>
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="restGalleryDots">${(r.images || [r.image]).map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>
      </div>
      <div class="relative -mt-6 rounded-t-[28px] p-6 space-y-2" style="background:var(--bg-card)">
        <div class="flex items-center justify-center gap-5 pb-5 mb-1">
          <p class="text-xs flex items-center gap-1.5" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-gold-500"></i>${r.location}</p>
          <span class="w-1 h-1 rounded-full" style="background:var(--border-field)"></span>
          <p class="text-xs flex items-center gap-1.5" style="color:var(--text-secondary)"><i class="fa-regular fa-clock text-gold-500"></i>${r.openHours || ''}</p>
        </div>
        <p class="text-center text-sm leading-relaxed italic font-display" style="color:var(--text-secondary)">"${r.fullDescription || r.description}"</p>
        <div class="lux-divider"><span class="lux-dot"></span></div>
        <div>
          <p class="text-center font-display italic text-2xl mb-6" style="color:var(--text-primary)" data-i18n="theMenu">The Menu</p>
          ${(r.menu || []).map(section => `
            <div class="mb-8">
              <h4 class="menu-category-title">${section.category}</h4>
              <div>
                ${section.items.map(it => `
                  <div class="menu-item-row">
                    <span class="menu-item-name">${it.name}</span>
                    <span class="menu-item-leader"></span>
                    <span class="menu-item-price">${utils.formatPrice(it.price)}</span>
                  </div>
                  ${it.description ? `<p class="menu-item-desc">${it.description}</p>` : '<div class="mb-3"></div>'}`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
  I18N.set(I18N.get());
}

function onRestGalleryScroll(el) { const idx = Math.round(el.scrollLeft / el.clientWidth); document.querySelectorAll('#restGalleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx)); }
function closeRestaurantPage() { const p = document.getElementById('restaurantDetailPage'); if (p) p.remove(); nav.go('restaurants'); }

// ===================== BOOKINGS (عام لجميع الأنواع) =====================
const bookings = {
  switchTab(tab) {
    state.currentBookingTab = tab;
    const up = document.getElementById('tabUpcoming');
    const hist = document.getElementById('tabHistory');
    if (tab === 'upcoming') {
      up.className = 'flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-lg';
      hist.className = 'flex-1 py-3 rounded-xl text-sm font-medium';
      hist.style.color = 'var(--text-secondary)';
    } else {
      hist.className = 'flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-lg';
      up.className = 'flex-1 py-3 rounded-xl text-sm font-medium';
      up.style.color = 'var(--text-secondary)';
    }
    this.render();
  },
  render() {
    const list = document.getElementById('bookingsList');
    const empty = document.getElementById('emptyBookings');
    if (!list) return;
    const isUp = state.currentBookingTab === 'upcoming';
    const filtered = state.bookings.filter(b => {
      const d = b.type === 'hotel' ? b.checkin : b.date;
      return isUp ? new Date(d) >= new Date(utils.todayIso()) : new Date(d) < new Date(utils.todayIso());
    });
    if (filtered.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = filtered.map(b => {
      const title = b.type === 'hotel' ? b.hotelName : b.type === 'excursion' ? b.title : `${b.vehicleType} Transfer`;
      const dateStr = b.type === 'hotel' ? b.checkin : b.date;
      const img = b.image ? `<img src="${b.image}" class="w-20 h-20 rounded-lg object-cover flex-shrink-0">` : `<div class="w-20 h-20 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><i class="fa-solid ${b.type === 'hotel' ? 'fa-hotel' : b.type === 'excursion' ? 'fa-umbrella-beach' : 'fa-shuttle-van'} text-violet-500 text-2xl"></i></div>`;
      return `
        <div onclick="showBookingDetails('${b.id}')" class="hotel-card rounded-xl p-3 flex gap-3 cursor-pointer">
          ${img}
          <div class="flex-1 flex flex-col justify-between">
            <div><h3 class="font-display font-bold text-sm mb-0.5 line-clamp-1" style="color:var(--text-primary)">${title}</h3><p class="text-[10px] mb-1" style="color:var(--text-secondary)"><i class="fa-regular fa-calendar text-violet-500"></i> ${utils.formatDate(dateStr)}</p></div>
            <div class="flex justify-between items-center">
              <span class="text-[9px] font-bold ${isUp ? 'text-green-600' : 'text-gray-400'}">${isUp ? 'UPCOMING' : 'PAST'}</span>
              <p class="font-display font-bold text-violet-500 text-sm">${b.priceFormatted}</p>
            </div>
          </div>
        </div>`;
    }).join('');
  }
};

function showBookingDetails(bookingId) {
  const b = state.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const isUp = new Date(b.type === 'hotel' ? b.checkin : b.date) >= new Date(utils.todayIso());
  const page = document.createElement('div');
  page.id = 'bookingDetailsPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-body)">
      <div class="dark-scene px-5 pt-6 pb-8 relative overflow-hidden">
        <div class="stars-container"></div>
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-5">
            <button onclick="closeBookingDetails()" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><i class="fa-solid fa-arrow-right"></i></button>
            <h1 class="text-lg font-bold font-display text-white">Booking Details</h1>
            <div class="w-10"></div>
          </div>
          <div class="text-center"><span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${isUp ? 'bg-green-500/20 text-green-400 border border-green-400/30' : 'bg-white/10 text-white/50 border border-white/20'}">${isUp ? 'UPCOMING' : 'COMPLETED'}</span></div>
        </div>
      </div>
      <div class="relative -mt-4 rounded-t-[28px] p-5" style="background:var(--bg-card)">
        ${bookingDetailBody(b)}
        ${b.type !== 'transfer' && !b.reviewed && !isUp ? `<button onclick="closeBookingDetails(); reviews.openModal('${b.type}','${b.hotelId || b.excursionId}')" class="w-full py-3.5 rounded-2xl font-bold border border-violet-400/40 text-violet-500 mb-2"><i class="fa-solid fa-pen"></i> Write a Review</button>` : ''}
        ${isUp ? `<button onclick="cancelBooking('${b.id}')" class="w-full py-4 rounded-2xl font-bold text-red-500 border border-red-400/30 mt-2">Cancel Booking</button>` : ''}
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
}

function closeBookingDetails() { const p = document.getElementById('bookingDetailsPage'); if (p) p.remove(); nav.go('bookings'); }
function cancelBooking(bookingId) {
  if (!confirm('Cancel this booking?')) return;
  if (fbEnabled && currentUser) { fbDB.ref('users/' + currentUser.uid + '/bookings/' + bookingId).remove(); } else { state.bookings = state.bookings.filter(b => b.id !== bookingId); utils.save(); bookings.render(); ui.updateProfileStats(); }
  utils.toast('Booking cancelled', 'info');
  closeBookingDetails();
}

function bookingDetailBody(b) {
  if (b.type === 'excursion') {
    return `
      <div class="card rounded-2xl p-3 flex gap-3 mb-4"><img src="${b.image}" class="w-16 h-16 rounded-xl object-cover flex-shrink-0"><div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${b.title}</h3><p class="text-[11px]" style="color:var(--text-secondary)">${b.category}</p></div></div>
      <div class="space-y-3 text-sm mb-4">
        <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-regular fa-calendar text-violet-500"></i> Date</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.date)}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-solid fa-user-group text-violet-500"></i> Participants</span><span class="font-semibold" style="color:var(--text-primary)">${b.participants}</span></div>
      </div>
      <div class="border-t pt-3 flex justify-between mb-4" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total</span><span class="font-bold text-violet-500 text-lg font-display">${b.priceFormatted}</span></div>
      <div class="field-box rounded-xl p-3 flex items-center justify-between"><span class="text-xs" style="color:var(--text-secondary)">Booking ID</span><span class="text-xs font-bold" style="color:var(--text-primary)">${b.id}</span></div>`;
  }
  if (b.type === 'transfer') {
    return `
      <div class="card rounded-2xl p-3 flex gap-3 mb-4"><div class="w-16 h-16 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-shuttle-van text-violet-600 text-xl"></i></div><div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${b.vehicleType} Transfer</h3><p class="text-[11px]" style="color:var(--text-secondary)">${b.direction}</p></div></div>
      <div class="space-y-3 text-sm mb-4">
        <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-regular fa-calendar text-violet-500"></i> Date</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.date)}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-regular fa-clock text-violet-500"></i> Time</span><span class="font-semibold" style="color:var(--text-primary)">${b.time}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-solid fa-user-group text-violet-500"></i> Passengers</span><span class="font-semibold" style="color:var(--text-primary)">${b.passengers}</span></div>
      </div>
      <div class="border-t pt-3 flex justify-between mb-4" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total</span><span class="font-bold text-violet-500 text-lg font-display">${b.priceFormatted}</span></div>
      <div class="field-box rounded-xl p-3 flex items-center justify-between"><span class="text-xs" style="color:var(--text-secondary)">Booking ID</span><span class="text-xs font-bold" style="color:var(--text-primary)">${b.id}</span></div>`;
  }
  // فندق
  return `
    <div class="card rounded-2xl p-3 flex gap-3 mb-4"><img src="${b.image}" class="w-16 h-16 rounded-xl object-cover flex-shrink-0"><div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${b.hotelName}</h3><div class="flex items-center gap-1 mb-1">${utils.renderStars(b.rating || 5)}</div><p class="text-[10px]" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500"></i> ${(b.location || '').split(',')[0]}</p></div></div>
    <div class="space-y-3 text-sm mb-4">
      <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-regular fa-calendar text-violet-500"></i> Check-in</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.checkin)}</span></div>
      <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-regular fa-calendar-check text-violet-500"></i> Check-out</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.checkout)}</span></div>
      <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-solid fa-user-group text-violet-500"></i> Guests</span><span class="font-semibold" style="color:var(--text-primary)">${b.guests} Guests, ${b.rooms} Room${b.rooms > 1 ? 's' : ''}</span></div>
      <div class="flex justify-between"><span style="color:var(--text-secondary)"><i class="fa-solid fa-bed text-violet-500"></i> Room Type</span><span class="font-semibold" style="color:var(--text-primary)">${b.roomType}</span></div>
    </div>
    <div class="border-t pt-3 flex justify-between mb-4" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total</span><span class="font-bold text-violet-500 text-lg font-display">${b.priceFormatted}</span></div>
    <div class="field-box rounded-xl p-3 flex items-center justify-between"><span class="text-xs" style="color:var(--text-secondary)">Booking ID</span><span class="text-xs font-bold" style="color:var(--text-primary)">${b.id}</span></div>`;
}

// ===================== FAVORITES =====================
const favorites = {
  toggle(id) {
    const isFav = state.favorites.includes(id);
    if (fbEnabled && currentUser) { fbDB.ref('users/' + currentUser.uid + '/favorites/' + id).set(isFav ? null : true); } else {
      const idx = state.favorites.indexOf(id);
      if (idx > -1) state.favorites.splice(idx, 1);
      else state.favorites.push(id);
      utils.save();
      ui.renderFeaturedHotels();
      hotels.render();
      this.render();
      ui.updateProfileStats();
    }
    utils.toast(isFav ? 'Removed from favorites' : 'Added to favorites ❤️', isFav ? 'info' : 'success');
  },
  render() {
    const list = document.getElementById('favoritesList');
    const empty = document.getElementById('emptyFavorites');
    if (!list) return;
    const favs = CATALOG.hotels.filter(h => state.favorites.includes(h.id));
    if (favs.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = favs.map(h => ui.renderHotelCard(h)).join('');
  }
};

// ===================== REVIEWS =====================
const reviews = {
  currentTarget: null,
  selectedStars: 0,
  openModal(type, id) {
    this.currentTarget = { type, id };
    this.selectedStars = 0;
    document.getElementById('reviewBookingId').value = '';
    document.getElementById('reviewName').value = (fbEnabled && currentUser && currentUser.displayName) || '';
    document.getElementById('reviewComment').value = '';
    populateNationalitySelect();
    document.getElementById('reviewNationality').value = 'EG';
    this.paintStars(0);
    document.getElementById('reviewModal').classList.remove('hidden');
  },
  closeModal() { document.getElementById('reviewModal').classList.add('hidden'); },
  setStars(n) { this.selectedStars = n; this.paintStars(n); },
  paintStars(n) { document.querySelectorAll('#reviewStarInput i').forEach(el => el.classList.toggle('active', Number(el.dataset.star) <= n)); },
  async submit(e) {
    e.preventDefault();
    if (this.selectedStars === 0) { utils.toast('Please select a star rating', 'error'); return; }
    const bookingId = document.getElementById('reviewBookingId').value.trim().toUpperCase();
    const name = document.getElementById('reviewName').value.trim();
    const nationalityCode = document.getElementById('reviewNationality').value;
    const comment = document.getElementById('reviewComment').value.trim();
    const { type, id } = this.currentTarget;
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Verifying…';
    btn.disabled = true;
    try {
      const booking = state.bookings.find(b => b.id === bookingId);
      if (!booking) { utils.toast('Booking ID not found', 'error'); return; }
      const bookingTargetId = type === 'hotel' ? booking.hotelId : booking.excursionId;
      if (booking.type !== type || bookingTargetId !== id) { utils.toast('This Booking ID doesn\'t match this listing', 'error'); return; }
      if (booking.reviewed) { utils.toast('This booking has already been reviewed', 'error'); return; }
      const reviewId = utils.generateId();
      const review = { bookingId, name, nationalityCode, rating: this.selectedStars, comment, createdAt: new Date().toISOString() };
      if (fbEnabled) { await fbDB.ref('reviews/' + type + '/' + id + '/' + reviewId).set(review); }
      booking.reviewed = true;
      if (fbEnabled && currentUser) { await fbDB.ref('users/' + currentUser.uid + '/bookings/' + bookingId + '/reviewed').set(true); }
      else { utils.save(); bookings.render(); }
      this.closeModal();
      utils.toast('Thank you for your review!', 'success');
    } catch (err) {
      utils.toast('Could not submit review right now', 'error');
    } finally {
      btn.textContent = original;
      btn.disabled = false;
    }
  }
};

// ===================== TRANSFER SEARCH =====================
const transferSearch = {
  setDirection(dir) {
    state.transferDirection = dir;
    const arrival = document.getElementById('tsDirArrival');
    const departure = document.getElementById('tsDirDeparture');
    const pickup = document.getElementById('tsPickup');
    const dropoff = document.getElementById('tsDropoff');
    if (!arrival || !departure) return;
    if (dir === 'Airport to Hotel') {
      arrival.style.background = 'linear-gradient(135deg,#fb923c,#c2410c)';
      arrival.style.color = '#fff';
      departure.style.background = 'transparent';
      departure.style.color = 'var(--text-secondary)';
      if (pickup) pickup.placeholder = 'Sharm El Sheikh Airport (SSH)';
      if (dropoff) dropoff.placeholder = 'Hotel name & area';
    } else {
      departure.style.background = 'linear-gradient(135deg,#fb923c,#c2410c)';
      departure.style.color = '#fff';
      arrival.style.background = 'transparent';
      arrival.style.color = 'var(--text-secondary)';
      if (pickup) pickup.placeholder = 'Hotel name & area';
      if (dropoff) dropoff.placeholder = 'Sharm El Sheikh Airport (SSH)';
    }
  },
  adjustPax(delta) {
    const newVal = state.transferPax + delta;
    if (newVal >= 1 && newVal <= 15) {
      state.transferPax = newVal;
      const label = document.getElementById('tsPassengersLabel');
      if (label) label.textContent = I18N.get() === 'ar' ? `${newVal} أشخاص` : `${newVal} People`;
    }
  },
  apply() {
    const pickup = document.getElementById('tsPickup').value.trim();
    const dropoff = document.getElementById('tsDropoff').value.trim();
    const date = document.getElementById('tsDate').dataset.value;
    if (!pickup || !dropoff) { utils.toast('Please enter both pickup and drop-off locations', 'error'); return; }
    if (!date) { utils.toast('Please select a date', 'error'); return; }
    utils.toast('Showing available transfers', 'info');
    nav.go('transfers');
  },
  populateVehicles() {
    const sel = document.getElementById('tsVehicleSelect');
    if (!sel) return;
    const vehicles = CATALOG.transfers.map(v => v.vehicleType);
    const unique = [...new Set(vehicles)];
    sel.innerHTML = `<option value="any">${I18N.get() === 'ar' ? 'أي مركبة' : 'Any vehicle'}</option>` + unique.map(v => `<option value="${v}">${v}</option>`).join('');
  }
};

// ===================== NOTIFICATIONS =====================
const notifications = {
  list: [],
  bindUser() {
    if (fbEnabled && currentUser) {
      fbDB.ref('users/' + currentUser.uid + '/notifications').on('value', snap => {
        const val = snap.val() || {};
        this.list = Object.keys(val).map(k => Object.assign({ id: k }, val[k])).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.render();
        this.updateBadge();
      });
    } else {
      this.list = JSON.parse(localStorage.getItem('ds_notifications') || '[]');
      this.render();
      this.updateBadge();
    }
  },
  push(n) {
    const item = Object.assign({ id: utils.generateId(), read: false, createdAt: new Date().toISOString() }, n);
    if (fbEnabled && currentUser) fbDB.ref('users/' + currentUser.uid + '/notifications/' + item.id).set(item);
    else { this.list.unshift(item); localStorage.setItem('ds_notifications', JSON.stringify(this.list)); this.render(); this.updateBadge(); }
  },
  markAllRead() {
    this.list.forEach(n => n.read = true);
    if (fbEnabled && currentUser) { const updates = {}; this.list.forEach(n => { updates[n.id + '/read'] = true; }); fbDB.ref('users/' + currentUser.uid + '/notifications').update(updates); }
    else localStorage.setItem('ds_notifications', JSON.stringify(this.list));
    this.render(); this.updateBadge();
  },
  markRead(id) {
    const n = this.list.find(x => x.id === id);
    if (!n || n.read) return;
    n.read = true;
    if (fbEnabled && currentUser) fbDB.ref('users/' + currentUser.uid + '/notifications/' + id + '/read').set(true);
    else localStorage.setItem('ds_notifications', JSON.stringify(this.list));
    this.updateBadge();
  },
  timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  },
  updateBadge() {
    const unread = this.list.filter(n => !n.read).length;
    document.querySelectorAll('.notif-badge').forEach(b => b.classList.toggle('hidden', unread === 0));
  },
  render() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    if (!this.list.length) { list.innerHTML = `<p class="text-center text-sm py-10" style="color:var(--text-secondary)" data-i18n="noNotificationsYet">No notifications yet</p>`; I18N.set(I18N.get()); return; }
    list.innerHTML = this.list.map(n => `
      <div class="card rounded-xl p-3.5 flex items-start gap-3" onclick="notifications.markRead('${n.id}')">
        <div class="w-10 h-10 ${n.color || 'bg-violet-50 text-violet-600'} rounded-xl flex items-center justify-center flex-shrink-0"><i class="fa-solid ${n.icon || 'fa-bell'}"></i></div>
        <div class="flex-1"><h3 class="font-semibold text-sm mb-0.5" style="color:var(--text-primary)">${n.title}</h3><p class="text-xs mb-1" style="color:var(--text-secondary)">${n.msg}</p><p class="text-[9px] text-gray-400">${this.timeAgo(n.createdAt)}</p></div>
        ${!n.read ? '<div class="w-1.5 h-1.5 bg-gold-400 rounded-full flex-shrink-0 mt-1.5"></div>' : ''}
      </div>`).join('');
  }
};

// ===================== PROFILE AVATAR =====================
const profileAvatar = {
  render(name, photoURL) {
    const letter = (name || 'G').charAt(0).toUpperCase();
    const wrap = document.getElementById('profileAvatarWrap');
    const drawerAv = document.getElementById('drawerAvatar');
    const navAv = document.getElementById('navProfileAvatar');
    if (wrap) wrap.innerHTML = photoURL ? `<img src="${photoURL}" class="w-full h-full object-cover">` : `<span class="font-display text-5xl font-bold text-violet-600">${letter}</span>`;
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
        const canvas = document.createElement('canvas');
        canvas.width = 240; canvas.height = 240;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2, sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 240, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        this.save(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },
  async save(dataUrl) {
    utils.toast('Updating photo…', 'info');
    if (fbEnabled && currentUser) {
      try {
        await fbDB.ref('users/' + currentUser.uid + '/profile/photoURL').set(dataUrl);
        utils.toast('Profile photo updated', 'success');
      } catch (err) { utils.toast('Could not save photo.', 'error'); }
    } else {
      localStorage.setItem('ds_avatar', dataUrl);
      this.render(document.getElementById('profileName').textContent, dataUrl);
      utils.toast('Profile photo updated', 'success');
    }
  }
};

// ===================== COUNTRY DATA =====================
const COUNTRY_CODES = [
  { code: 'EG', dial: '+20', name: 'Egypt' }, { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'AE', dial: '+971', name: 'UAE' }, { code: 'KW', dial: '+965', name: 'Kuwait' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' }, { code: 'US', dial: '+1', name: 'United States' },
  { code: 'DE', dial: '+49', name: 'Germany' }, { code: 'FR', dial: '+33', name: 'France' },
  { code: 'IT', dial: '+39', name: 'Italy' }, { code: 'RU', dial: '+7', name: 'Russia' }
];

function populateCountryCodeSelect() {
  const sel = document.getElementById('authCountryCode');
  if (!sel || sel.options.length) return;
  sel.innerHTML = COUNTRY_CODES.map(c => `<option value="${c.dial}">${c.dial} ${c.code}</option>`).join('');
  sel.value = '+20';
}

function populateNationalitySelect() {
  const sel = document.getElementById('reviewNationality');
  if (!sel || sel.options.length) return;
  sel.innerHTML = COUNTRY_CODES.map(c => `<option value="${c.code}">${countryFlagEmoji(c.code)} ${c.name}</option>`).join('');
  sel.value = 'EG';
}

function countryFlagEmoji(isoCode) {
  if (!isoCode || isoCode.length !== 2) return '';
  return String.fromCodePoint(...[...isoCode.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

// ===================== SETTINGS =====================
const settings = {
  changeCurrency(c) {
    if (!CurrencyAPI.available) c = 'EGP';
    state.currency = c;
    localStorage.setItem('ds_display_currency', c);
    ui.renderFeaturedHotels();
    hotels.render();
    bookings.render();
    favorites.render();
    excursionsUi.renderFeatured();
    excursionsUi.render();
    transfersUi.render();
    restaurantsUi.renderRow();
    restaurantsUi.renderFull();
    utils.toast('Currency updated', 'info');
  }
};

// ===================== BOOT =====================
let splashMinTimeElapsed = false, splashPendingAction = null;
setTimeout(() => { splashMinTimeElapsed = true; if (splashPendingAction) { const fn = splashPendingAction; splashPendingAction = null; fn(); } }, 1600);
function afterSplash(fn) { if (splashMinTimeElapsed) fn(); else splashPendingAction = fn; }

document.addEventListener('DOMContentLoaded', async () => {
  THEME.init();
  await loadI18nDict();
  I18N.init();
  utils.createStars('splashStars');
  populateCountryCodeSelect();
  populateNationalitySelect();
  search.switchTab('hotels');
  await loadAppConfig();
  CurrencyAPI.init();
  await loadCatalogFromWorker();
  refreshCatalogUI();
  initFirebase();
});

// تعريض الدوال للاستخدام العام
window.utils = utils;
window.state = state;
window.CATALOG = CATALOG;
window.CATALOG_RAW = CATALOG_RAW;
window.nav = nav;
window.auth = auth;
window.app = app;
window.ui = ui;
window.sidebar = sidebar;
window.search = search;
window.hotels = hotels;
window.excursionsUi = excursionsUi;
window.transfersUi = transfersUi;
window.restaurantsUi = restaurantsUi;
window.bookings = bookings;
window.favorites = favorites;
window.reviews = reviews;
window.transferSearch = transferSearch;
window.notifications = notifications;
window.profileAvatar = profileAvatar;
window.settings = settings;
window.showHotelPage = showHotelPage;
window.closeHotelPage = closeHotelPage;
window.selectRoomOnDetail = selectRoomOnDetail;
window.updateHotelFav = updateHotelFav;
window.onGalleryScroll = onGalleryScroll;
window.showExcursionPage = showExcursionPage;
window.closeExcursionPage = closeExcursionPage;
window.onExcursionGalleryScroll = onExcursionGalleryScroll;
window.showRestaurantPage = showRestaurantPage;
window.closeRestaurantPage = closeRestaurantPage;
window.onRestGalleryScroll = onRestGalleryScroll;
window.showBookingDetails = showBookingDetails;
window.closeBookingDetails = closeBookingDetails;
window.cancelBooking = cancelBooking;
window.startBooking = startBooking;
window.startExcursionBooking = startExcursionBooking;
window.startTransferBooking = startTransferBooking;
window.renderBookingStep = renderBookingStep;
window.setHotelPaymentMethod = function(m) { state.bookingDraft.payment = m; };
window.setExcursionPaymentMethod = function(m) { state.bookingDraft.payment = m; };
window.setTransferPaymentMethod = function(m) { state.bookingDraft.payment = m; };
window.setDateFieldValue = setDateFieldValue;
window.openGuestsModal = openGuestsModal;
window.closeGuestsModal = closeGuestsModal;
window.adjustGuestCount = adjustGuestCount;
window.applyGuests = applyGuests;
window.computeRoomPricing = computeRoomPricing;
window.guestsDisplayText = guestsDisplayText;
window.paymentMethodsBlock = paymentMethodsBlock;
window.setTransferDirection = transferSearch.setDirection;
window.adjustTransferPassengers = transferSearch.adjustPax;
