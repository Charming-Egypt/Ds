/* ============================================================
   DISCOVER SHARM — Frontend Application
   Integrated with Cloudflare Worker API Gateway (Hotels only)
   ============================================================ */

// ==================== FALLBACK LOGO ====================
window.FALLBACK_LOGO = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#ea580c"/></linearGradient></defs>
<circle cx="32" cy="32" r="30" fill="url(#g)"/>
<circle cx="32" cy="32" r="30" fill="none" stroke="#171029" stroke-width="1" opacity="0.15"/>
<path d="M32 14 L38 32 L32 50 L26 32 Z" fill="#171029"/>
<circle cx="32" cy="32" r="4" fill="#fdba74"/>
</svg>`);

// ==================== WORKER API CONFIG (Hotels only) ====================
const WORKER_URL = 'https://discover-sharm-api.gm-093.workers.dev';

// ==================== IMAGE HELPER ====================
function getImageUrl(item) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const lang = I18N.get();
    return item[lang] || item.en || '';
  }
  return item || '';
}

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%232b2140' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='.3em' fill='%239d94b8' font-size='20' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

// ==================== WORKER API CLIENT (Hotels only) ====================
const API = {
  // Hotels
  async searchHotels(params) {
    const res = await fetch(`${WORKER_URL}/api/hotels/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Search failed');
    return result.data;
  },

  async checkRates(rateKey) {
    const res = await fetch(`${WORKER_URL}/api/hotels/checkrates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rateKey }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Check rates failed');
    return result.data;
  },

  async bookHotel(bookingData) {
    const res = await fetch(`${WORKER_URL}/api/hotels/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Booking failed');
    return result.booking;
  },

  async getHotelBooking(reference) {
    const res = await fetch(`${WORKER_URL}/api/hotels/booking/${reference}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Booking not found');
    return result.booking;
  },

  async cancelHotelBooking(reference) {
    const res = await fetch(`${WORKER_URL}/api/hotels/booking/${reference}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Cancellation failed');
    return result.cancellation;
  },

  async health() {
    const res = await fetch(`${WORKER_URL}/api/health`);
    return res.json();
  }
};

// ==================== CONFIG ====================
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

// ==================== STATE ====================
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
  flightPax: { adults: 1, children: 0, infants: 0, cabin: 'Economy' },
  flightTripType: 'round',
  transferPax: 2,
  transferDirection: 'Airport to Hotel',
  // Store API results for hotels
  hotelsCache: []
};

// ==================== CATALOG (Fallback for non-hotel items) ====================
const CATALOG = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };
const CATALOG_RAW = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], reviews: [], articles: [] };
const JSON_BASELINE = { hotels: [], excursions: [], transfers: [], destinations: [], restaurants: [], articles: [] };
const MULTILANG_FIELDS = ['name', 'title', 'description', 'fullDescription', 'location', 'vehicleType', 'duration', 'tagline', 'cuisine', 'text', 'itemName', 'excerpt', 'content', 'openHours'];
const MULTILANG_ARRAY_FIELDS = ['amenities', 'includes', 'features', 'excludes', 'whatToBring'];
const MULTILANG_OBJECT_MAP_FIELDS = ['meetingPoint'];

const EMERGENCY_FALLBACK_CATALOG = {
  hotels: [{ id: 'h1', name: 'Discover Grand Hotel', category: 'luxury', description: 'Luxury 5-star hotel with sea view', fullDescription: 'Luxury 5-star hotel with sea view.', price: 3800, rating: 5, reviews: 234, location: 'Naama Bay, Sharm El Sheikh', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=90', images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=90'], amenities: ['Free WiFi', 'Breakfast', 'Pool'], bestseller: true, rooms: [{ type: 'Deluxe Sea View', price: 3800, size: '35m²', beds: '1 King Bed', guests: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&q=80', description: 'A bright room with sea views.' }] }],
  excursions: [{ id: 'e1', title: 'Ras Mohammed Snorkeling Trip', category: 'Diving', price: 1150, rating: 4.8, reviews: 312, duration: 'Full Day (8h)', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'], description: 'Snorkel the coral reefs of Ras Mohammed National Park.', fullDescription: 'Snorkel the coral reefs of Ras Mohammed National Park.', includes: ['Hotel pickup & drop-off', 'Snorkeling equipment'], meetingPoint: 'Hotel lobby pickup, 7:30 AM' }],
  transfers: [{ id: 't1', vehicleType: 'Tourist H1', capacity: 7, price: 950, image: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80', description: 'Air-conditioned tourist-class Hyundai H1 for airport pickup or drop-off.', features: ['Tourist-class Hyundai H1', 'Air-conditioned', 'Meet & greet at arrivals'] }],
  destinations: [], restaurants: [], reviews: [], articles: []
};

// ==================== CURRENCY ====================
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

// ==================== I18N ====================
let SUPPORTED_LANGS = ['en'];
let LANG_LABELS = { en: 'English' };
let I18N_DICT = {};

async function loadI18nDict() {
  try {
    const manifestRes = await fetch('https://www.discover-sharm.com/app/test/data/lang/manifest.json');
    const manifest = await manifestRes.json();
    SUPPORTED_LANGS = manifest.languages.map(l => l.code);
    LANG_LABELS = {};
    manifest.languages.forEach(l => { LANG_LABELS[l.code] = l.label; });
    const dictResponses = await Promise.all(SUPPORTED_LANGS.map(code => fetch('https://www.discover-sharm.com/app/test/data/lang/' + code + '.json')));
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

// ==================== UTILITIES ====================
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

// ==================== SIDEBAR ====================
const sidebar = {
  open() { document.getElementById('sideDrawer').classList.add('open');
    document.getElementById('sideDrawerOverlay').classList.add('open'); },
  close() { document.getElementById('sideDrawer').classList.remove('open');
    document.getElementById('sideDrawerOverlay').classList.remove('open'); }
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

const DEFAULT_ROOM_OCCUPANCY = 2;

function currentRoomMaxOccupancy() { return (state.currentRoom && state.currentRoom.guests) || DEFAULT_ROOM_OCCUPANCY; }

function adjustGuestCount(type, delta) {
  const limits = { adults: { min: 1, max: 10 }, children: { min: 0, max: 6 }, infants: { min: 0, max: 4 }, rooms: { min: 1, max: 5 } };
  const newValue = state.guests[type] + delta;
  if (type === 'rooms' && delta < 0) {
    const maxOcc = currentRoomMaxOccupancy();
    const required = Math.ceil((state.guests.adults + state.guests.children) / maxOcc);
    if (newValue < required) { utils.toast('Reduce guests first — this room count is needed for your party size', 'error'); return; }
  }
  if (newValue >= limits[type].min && newValue <= limits[type].max) state.guests[type] = newValue;
  if (type === 'adults' || type === 'children') {
    const maxOcc = currentRoomMaxOccupancy();
    const required = Math.ceil((state.guests.adults + state.guests.children) / maxOcc);
    if (required > state.guests.rooms && required <= limits.rooms.max) {
      state.guests.rooms = required;
      utils.toast('Room count increased to fit your party', 'info');
    }
  }
  const displayMap = { adults: 'adultsCount', children: 'childrenCount', infants: 'infantsCount', rooms: 'roomsCount' };
  document.getElementById(displayMap[type]).textContent = state.guests[type];
  document.getElementById(displayMap.rooms).textContent = state.guests.rooms;
}

function computeRoomPricing(room, guests, roomsCount, nights) {
  const baseOcc = room.baseOccupancy || DEFAULT_ROOM_OCCUPANCY;
  const freeChildren = room.freeChildrenPerRoom != null ? room.freeChildrenPerRoom : 2;
  const extraAdultFee = room.extraAdultFee || 0;
  const extraChildFee = room.extraChildFee || 0;
  const adultsPerRoom = Math.ceil(guests.adults / roomsCount);
  const childrenPerRoom = Math.ceil(guests.children / roomsCount);
  const extraAdults = Math.max(0, adultsPerRoom - baseOcc);
  const extraChildren = Math.max(0, childrenPerRoom - freeChildren);
  const perRoomPerNight = room.price + (extraAdults * extraAdultFee) + (extraChildren * extraChildFee);
  const roomTotal = perRoomPerNight * roomsCount * nights;
  const extraFeesTotal = (extraAdults * extraAdultFee + extraChildren * extraChildFee) * roomsCount * nights;
  return { roomTotal, extraFeesTotal, extraAdults, extraChildren, baseRoomTotal: room.price * roomsCount * nights };
}

function guestsDisplayText() {
  const lang = I18N.get();
  return `${state.guests.adults} ${lang === 'ar' ? 'بالغين' : 'Adults'}${state.guests.children > 0 ? `, ${state.guests.children} ${lang === 'ar' ? 'أطفال' : 'Children'}` : ''}, ${state.guests.rooms} ${lang === 'ar' ? 'غرف' : (state.guests.rooms > 1 ? 'Rooms' : 'Room')}`;
}

function applyGuests() {
  const displayText = guestsDisplayText();
  const disp = document.getElementById('guestsDisplay');
  if (disp) disp.textContent = displayText;
  const bdisp = document.getElementById('bookingGuestsDisplay');
  if (bdisp) bdisp.textContent = displayText;
  closeGuestsModal();
  if (typeof renderBookingStep === 'function' && document.getElementById('bookingFlowPage')) renderBookingStep(2);
  utils.toast('Guests updated', 'info');
}

// ==================== DATE PICKER ====================
const datepicker = {
  target: null,
  viewDate: new Date(),
  minIso: null,
  unavailable: [],
  open(fieldId, opts) {
    opts = opts || {};
    this.target = fieldId;
    this.minIso = opts.minIso || utils.todayIso();
    this.unavailable = opts.unavailableIso || [];
    const field = document.getElementById(fieldId);
    const cur = field ? field.dataset.value : '';
    this.viewDate = new Date((cur || this.minIso) + 'T00:00:00');
    this.render();
    document.getElementById('datepickerModal').classList.remove('hidden');
  },
  close() { document.getElementById('datepickerModal').classList.add('hidden'); },
  changeMonth(delta) { this.viewDate.setMonth(this.viewDate.getMonth() + delta);
    this.render(); },
  render() {
    const lang = I18N.get();
    const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const weekdaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekdaysAr = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    const y = this.viewDate.getFullYear(),
      m = this.viewDate.getMonth();
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
      html += `<button type="button" ${isDisabled ? 'disabled' : ''} onclick="datepicker.select('${iso}')" title="${isUnavailable ? 'Not available' : ''}" class="w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors ${isSelected ? 'bg-gradient-to-br from-violet-500 to-violet-700 text-white' : isDisabled ? 'text-gray-400 opacity-40 line-through' : ''}" style="${isSelected ? '' : 'color:var(--text-primary)'}">${d}</button>`;
    }
    document.getElementById('dpGrid').innerHTML = html;
  },
  select(iso) { setDateFieldValue(this.target, iso);
    this.close(); if (typeof onDateFieldChange === 'function') onDateFieldChange(this.target, iso); }
};

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
    if (coField && (!coField.dataset.value || coField.dataset.value <= iso)) { const newCo = utils.addDays(iso, 1);
      setDateFieldValue('bkCheckout', newCo);
      state.bookingDraft.checkout = newCo; }
  }
  if (fieldId === 'bkCheckout') state.bookingDraft.checkout = iso;
  if (fieldId === 'ekDate') state.bookingDraft.date = iso;
  if (fieldId === 'tkDate') state.bookingDraft.date = iso;
  if (fieldId === 'flightDepartDate') {
    const returnField = document.getElementById('flightReturnDate');
    if (returnField && state.flightTripType === 'round') { const newReturn = utils.addDays(iso, 5);
      setDateFieldValue('flightReturnDate', newReturn); }
  }
  if (fieldId === 'flightReturnDate') {
    const departField = document.getElementById('flightDepartDate');
    if (departField && departField.dataset.value) {
      const departIso = departField.dataset.value;
      if (iso <= departIso) { const newReturn = utils.addDays(departIso, 5);
        setDateFieldValue('flightReturnDate', newReturn);
        utils.toast('Return date must be after departure — adjusted automatically', 'info'); }
    }
  }
}

// ==================== KASHIER PAYMENT ====================
const kashier = {
  pay({ amount, orderId, method, onSuccess, onCancel }) {
    if (method === 'cash') { onSuccess({ status: 'pending_cash', transactionRef: 'CASH-' + orderId }); return; }
    if (!KASHIER_CONFIG.hashEndpoint) { utils.toast('Payment gateway is not configured — please choose Cash on Arrival or try again later.', 'error'); if (onCancel) onCancel(); return; }
    this.openLiveIframe({ amount, orderId, method, onSuccess, onCancel });
  },
  async openLiveIframe({ amount, orderId, method, onSuccess, onCancel }) {
    try {
      const resp = await fetch(KASHIER_CONFIG.hashEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, currency: KASHIER_CONFIG.currency })
      });
      const data = await resp.json();
      if (!data.success || !data.hash) {
        utils.toast('Payment server error: ' + (data.error || 'No hash returned'), 'error');
        return;
      }
      const paymentMethods = method === 'instapay' ? 'wallet' : 'card';
      const kashierUrl = new URL('https://checkout.kashier.io/');
      kashierUrl.searchParams.append('merchantId', KASHIER_CONFIG.merchantId);
      kashierUrl.searchParams.append('orderId', orderId);
      kashierUrl.searchParams.append('amount', amount);
      kashierUrl.searchParams.append('currency', KASHIER_CONFIG.currency);
      kashierUrl.searchParams.append('hash', data.hash);
      kashierUrl.searchParams.append('mode', KASHIER_CONFIG.mode);
      kashierUrl.searchParams.append('paymentMethods', paymentMethods);
      kashierUrl.searchParams.append('merchantRedirect', KASHIER_CONFIG.merchantRedirect || 'https://www.discover-sharm.com');
      kashierUrl.searchParams.append('display', 'en');
      kashierUrl.searchParams.append('allowedMethods', 'card,wallet');
      this.showModal(`
        <iframe src="${kashierUrl.toString()}" style="width:100%; height:600px; border:0; border-radius:16px;" allow="payment" title="Kashier Payment"></iframe>
      `, onCancel);
      const listener = (ev) => {
        if (ev.origin !== 'https://checkout.kashier.io' && ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.event === 'kashier.paymentSuccess') {
          window.removeEventListener('message', listener);
          this.closeModal();
          onSuccess({ status: 'paid', transactionRef: ev.data.transactionId || ev.data.orderId || orderId });
        }
        if (ev.data && ev.data.event === 'kashier.paymentFailure') {
          window.removeEventListener('message', listener);
          utils.toast('Payment failed — please try again', 'error');
        }
        if (ev.data && ev.data.event === 'kashier.paymentCancel') {
          window.removeEventListener('message', listener);
          this.closeModal();
          if (onCancel) onCancel();
        }
      };
      window.addEventListener('message', listener);
    } catch (err) {
      console.error('Kashier error:', err);
      utils.toast('Could not reach the payment server. Check KASHIER_CONFIG.hashEndpoint.', 'error');
    }
  },
  showModal(innerHtml, onCancel) {
    let modal = document.getElementById('kashierModal');
    if (!modal) { modal = document.createElement('div');
      modal.id = 'kashierModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal); }
    modal.innerHTML = `<div class="kashier-modal-content" id="kashierModalContent"></div>`;
    document.getElementById('kashierModalContent').innerHTML = innerHtml;
    modal.classList.remove('hidden');
    modal.onclick = (e) => { if (e.target === modal) { this.closeModal(); if (onCancel) onCancel(); } };
  },
  closeModal() { const modal = document.getElementById('kashierModal'); if (modal) modal.classList.add('hidden'); }
};

function paymentMethodsBlock(currentMethod, onchangeFn) {
  const methods = [
    { id: 'card', label: I18N.get() === 'ar' ? I18N_DICT.creditDebitCard.ar : I18N_DICT.creditDebitCard.en, icon: 'fa-credit-card', extra: '<i class="fa-brands fa-cc-visa text-lg text-violet-500"></i><i class="fa-brands fa-cc-mastercard text-lg text-gold-500"></i>' },
    { id: 'instapay', label: I18N.get() === 'ar' ? I18N_DICT.instapayWallet.ar : I18N_DICT.instapayWallet.en, icon: 'fa-wallet', extra: '' },
    { id: 'cash', label: I18N.get() === 'ar' ? I18N_DICT.cashOnArrival.ar : I18N_DICT.cashOnArrival.en, icon: 'fa-money-bill-wave', extra: '' }
  ];
  return methods.map(m => `
    <label class="card rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer ${currentMethod === m.id ? 'ring-1 ring-violet-400' : ''}">
      <input type="radio" name="paymethod" value="${m.id}" ${currentMethod === m.id ? 'checked' : ''} onchange="${onchangeFn}('${m.id}')" class="w-4 h-4 accent-violet-600">
      <i class="fa-solid ${m.icon} text-violet-500 text-lg w-6 text-center"></i>
      <span class="flex-1 text-sm font-semibold" style="color:var(--text-primary)">${m.label}</span>
      <span class="flex items-center gap-1.5">${m.extra}</span>
    </label>`).join('') + `<p class="text-[11px] flex items-center gap-1.5 mt-1" style="color:var(--text-secondary)"><i class="fa-solid fa-lock text-violet-500"></i>Card &amp; InstaPay payments are processed securely via Kashier.</p>`;
}

// ==================== PROFILE AVATAR ====================
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
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2,
          sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
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
        if (fbStorage) {
          const ref = fbStorage.ref('avatars/' + currentUser.uid + '.jpg');
          const blob = await (await fetch(dataUrl)).blob();
          await ref.put(blob);
          const url = await ref.getDownloadURL();
          await fbDB.ref('users/' + currentUser.uid + '/profile/photoURL').set(url);
          try { await currentUser.updateProfile({ photoURL: url }); } catch (e) {}
          utils.toast('Profile photo updated', 'success');
          return;
        }
      } catch (err) { console.warn('Storage upload failed, falling back to inline photo.', err); }
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

// ==================== BOOKING HELPERS ====================
function saveGlobalBooking(booking) {
  if (fbEnabled) { fbDB.ref('allBookings/' + booking.id).set(booking).catch(e => console.warn('Could not save allBookings record', e)); } else { const map = JSON.parse(localStorage.getItem('ds_all_bookings') || '{}');
    map[booking.id] = booking;
    localStorage.setItem('ds_all_bookings', JSON.stringify(map)); }
}

async function getGlobalBooking(bookingId) {
  if (fbEnabled) { const snap = await fbDB.ref('allBookings/' + bookingId).once('value'); return snap.exists() ? snap.val() : null; }
  const map = JSON.parse(localStorage.getItem('ds_all_bookings') || '{}');
  return map[bookingId] || null;
}

function markBookingReviewedGlobal(bookingId, ownerUid) {
  if (fbEnabled) {
    fbDB.ref('allBookings/' + bookingId + '/reviewed').set(true).catch(() => {});
    if (ownerUid) fbDB.ref('users/' + ownerUid + '/bookings/' + bookingId + '/reviewed').set(true).catch(() => {});
  } else {
    const map = JSON.parse(localStorage.getItem('ds_all_bookings') || '{}');
    if (map[bookingId]) { map[bookingId].reviewed = true;
      localStorage.setItem('ds_all_bookings', JSON.stringify(map)); }
    const idx = state.bookings.findIndex(b => b.id === bookingId);
    if (idx > -1) { state.bookings[idx].reviewed = true;
      utils.save();
      bookings.render();
      ui.updateProfileStats(); }
  }
}

// ==================== REVIEWS ====================
const reviews = {
  currentTarget: null,
  selectedStars: 0,
  liveRefs: {},
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
  setStars(n) { this.selectedStars = n;
    this.paintStars(n); },
  paintStars(n) { document.querySelectorAll('#reviewStarInput i').forEach(el => el.classList.toggle('active', Number(el.dataset.star) <= n)); },
  async submit(e) {
    e.preventDefault();
    if (this.selectedStars === 0) { utils.toast('Please select a star rating', 'error'); return; }
    const bookingId = document.getElementById('reviewBookingId').value.trim().toUpperCase();
    const name = document.getElementById('reviewName').value.trim();
    const nationalityCode = document.getElementById('reviewNationality').value;
    const comment = document.getElementById('reviewComment').value.trim();
    const photoURL = (fbEnabled && currentUser && currentUser.photoURL) || null;
    const { type, id } = this.currentTarget;
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Verifying…';
    btn.disabled = true;
    try {
      const booking = await getGlobalBooking(bookingId);
      if (!booking) { utils.toast('Booking ID not found', 'error'); return; }
      const bookingTargetId = type === 'hotel' ? booking.hotelId : (type === 'excursion' ? booking.excursionId : booking.transferId);
      if (booking.type !== type || bookingTargetId !== id) { utils.toast('This Booking ID doesn\'t match this listing', 'error'); return; }
      if (booking.reviewed) { utils.toast('This booking has already been reviewed', 'error'); return; }
      const reviewId = utils.generateId();
      const review = { bookingId, name, nationalityCode, photoURL, rating: this.selectedStars, comment, createdAt: new Date().toISOString() };
      if (fbEnabled) { await fbDB.ref('reviews/' + type + '/' + id + '/' + reviewId).set(review); } else {
        const store = JSON.parse(localStorage.getItem('ds_reviews') || '{}');
        store[type] = store[type] || {};
        store[type][id] = store[type][id] || {};
        store[type][id][reviewId] = review;
        localStorage.setItem('ds_reviews', JSON.stringify(store));
        this.renderList(type, id, type === 'hotel' ? 'hotelReviewsList' : 'excursionReviewsList', type === 'hotel' ? 'hotelReviewsSummary' : 'excursionReviewsSummary');
      }
      markBookingReviewedGlobal(bookingId, booking.uid);
      this.closeModal();
      utils.toast('Thank you for your review!', 'success');
    } catch (err) {
      utils.toast('Could not submit review right now', 'error');
    } finally {
      btn.textContent = original;
      btn.disabled = false;
    }
  },
  renderList(type, id, listElId, summaryElId) {
    const render = (list) => {
      const listEl = document.getElementById(listElId);
      const summaryEl = document.getElementById(summaryElId);
      if (!listEl) return;
      if (!list.length) {
        listEl.innerHTML = `<p class="text-xs text-center py-4" style="color:var(--text-secondary)">No reviews yet — be the first to share your experience!</p>`;
      } else {
        listEl.innerHTML = list.slice().reverse().map(r => `
          <div class="field-box rounded-xl p-3">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-violet-50 rounded-full flex items-center justify-center text-xs font-bold text-violet-600 overflow-hidden flex-shrink-0">${r.photoURL ? `<img src="${r.photoURL}" class="w-full h-full object-cover">` : (r.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <p class="text-xs font-semibold" style="color:var(--text-primary)">${r.name}${r.nationalityCode ? ` <span title="${countryNameFromCode(r.nationalityCode)}">${countryFlagEmoji(r.nationalityCode)}</span>` : ''}</p>
                  <div class="flex">${utils.renderStars(r.rating)}</div>
                </div>
              </div>
              <span class="text-[9px]" style="color:var(--text-secondary)">${utils.formatDate(r.createdAt)}</span>
            </div>
            <p class="text-xs" style="color:var(--text-secondary)">${r.comment}</p>
          </div>`).join('');
      }
      if (summaryEl) {
        const avg = utils.avgRating(list);
        summaryEl.textContent = avg ? avg.toFixed(1) : '—';
        const countEl = document.getElementById(summaryElId + 'Count');
        if (countEl) countEl.textContent = list.length;
      }
    };
    if (fbEnabled) {
      const ref = fbDB.ref('reviews/' + type + '/' + id);
      const cb = snap => render(objToArray(snap.val()));
      ref.on('value', cb);
      this.liveRefs[listElId] = { ref, cb };
    } else {
      const store = JSON.parse(localStorage.getItem('ds_reviews') || '{}');
      const list = store[type] && store[type][id] ? Object.keys(store[type][id]).map(k => store[type][id][k]) : [];
      render(list);
    }
  },
  detachListeners() { Object.keys(this.liveRefs).forEach(k => { this.liveRefs[k].ref.off('value', this.liveRefs[k].cb); });
    this.liveRefs = {}; }
};

// ==================== NAVIGATION ====================
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
      const solidOnly = icon.classList.contains('fa-house') || icon.classList.contains('fa-hotel');
      if (isActive && icon.classList.contains('fa-regular')) icon.classList.replace('fa-regular', 'fa-solid');
      if (!isActive && icon.classList.contains('fa-solid') && !solidOnly) icon.classList.replace('fa-solid', 'fa-regular');
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
  showAuth() { authScreen.show(); },
  showApp() {
    hideSplash();
    document.getElementById('authPage').classList.add('hidden');
    app.enterMainApp();
  }
};

// ==================== APP ====================
const app = {
  enterMainApp() {
    document.getElementById('mainApp').classList.remove('hidden');
    ui.renderFeaturedHotels();
    excursionsUi.renderFeatured();
    transfersUi.render();
    ui.setDefaultDates();
    ui.updateProfileStats();
    const curSel = document.getElementById('currencySelect');
    if (curSel) curSel.value = state.currency;
    if (!fbEnabled) { profileAvatar.render(document.getElementById('profileName').textContent, localStorage.getItem('ds_avatar')); }
    if (!window._flightFormsInitialized) {
      setTimeout(() => {
        initFlightAndTransferForms();
        window._flightFormsInitialized = true;
      }, 300);
    }
    // Load hotels from Worker on home page
    loadFeaturedHotels();
  }
};

// ==================== LOAD FROM WORKER (Hotels only) ====================
async function loadFeaturedHotels() {
  try {
    const params = {
      destination: 'SSH',
      checkIn: utils.addDays(utils.todayIso(), 1),
      checkOut: utils.addDays(utils.todayIso(), 4),
      rooms: 1,
      adults: 2,
      children: 0,
      currency: state.currency
    };
    const result = await API.searchHotels(params);
    if (result && result.hotels) {
      state.hotelsCache = result.hotels.hotels || [];
      ui.renderFeaturedHotelsFromAPI(state.hotelsCache.slice(0, 2));
      // Also update hotels list if on hotels page
      hotels.render();
    }
  } catch (err) {
    console.warn('Could not load featured hotels from API:', err);
    ui.renderFeaturedHotels();
  }
}

// ==================== UI ====================
const ui = {
  renderFeaturedHotels() {
    // Fallback to local catalog
    const featured = CATALOG.hotels.slice(0, 2);
    const el = document.getElementById('featuredHotels');
    if (el) el.innerHTML = featured.map(h => this.renderHotelCard(h)).join('');
  },
  renderFeaturedHotelsFromAPI(hotels) {
    const el = document.getElementById('featuredHotels');
    if (el && hotels && hotels.length) {
      el.innerHTML = hotels.map(h => this.renderHotelCardFromAPI(h)).join('');
    } else {
      this.renderFeaturedHotels();
    }
  },
  renderHotelCard(h) {
    const isFav = state.favorites.includes(h.id);
    return `
    <div onclick="showHotelPage('${h.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
      <div class="flex">
        <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
          <img src="${getImageUrl(h.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
          ${h.bestseller ? '<div class="absolute top-2 right-2 badge-bestseller text-[8px] font-black px-2 py-0.5 rounded-md">BEST SELLER</div>' : ''}
          <div class="absolute bottom-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${h.rating}</span></div>
        </div>
        <div class="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-1">
              <h3 class="font-display font-bold text-sm md:text-base line-clamp-1" style="color:var(--text-primary)">${h.name}</h3>
              <button onclick="event.stopPropagation(); favorites.toggle('${h.id}')" class="text-base ${isFav ? 'text-red-500' : 'text-gray-300'} hover:text-red-500 transition flex-shrink-0 ml-1"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i></button>
            </div>
            <div class="flex items-center gap-1 mb-1">${utils.renderStars(h.rating)}<span class="text-[9px] mr-1" style="color:var(--text-secondary)">(${h.reviews})</span></div>
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
  renderHotelCardFromAPI(h) {
    // Map API response to card format
    const hotel = {
      id: h.code || h.id || 'api-' + Math.random().toString(36).substr(2, 6),
      name: h.name || 'Hotel',
      rating: h.rating || 4.5,
      reviews: h.reviewCount || 0,
      location: h.destinationName || h.address || 'Sharm El Sheikh',
      image: h.images && h.images[0] ? h.images[0] : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      price: h.minRate || h.price || 150,
      amenities: h.amenities || ['Free WiFi', 'Pool'],
      bestseller: h.bestseller || false,
      rooms: h.rooms || [],
      category: h.category || 'luxury'
    };
    const isFav = state.favorites.includes(hotel.id);
    return `
    <div onclick="showHotelPage('${hotel.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
      <div class="flex">
        <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
          <img src="${getImageUrl(hotel.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
          ${hotel.bestseller ? '<div class="absolute top-2 right-2 badge-bestseller text-[8px] font-black px-2 py-0.5 rounded-md">BEST SELLER</div>' : ''}
          <div class="absolute bottom-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-star text-gold-400 text-[8px]"></i><span class="text-[9px] font-bold text-gold-400">${hotel.rating}</span></div>
        </div>
        <div class="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-1">
              <h3 class="font-display font-bold text-sm md:text-base line-clamp-1" style="color:var(--text-primary)">${hotel.name}</h3>
              <button onclick="event.stopPropagation(); favorites.toggle('${hotel.id}')" class="text-base ${isFav ? 'text-red-500' : 'text-gray-300'} hover:text-red-500 transition flex-shrink-0 ml-1"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i></button>
            </div>
            <div class="flex items-center gap-1 mb-1">${utils.renderStars(hotel.rating)}<span class="text-[9px] mr-1" style="color:var(--text-secondary)">(${hotel.reviews})</span></div>
            <p class="text-[10px] mb-1.5 flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500 text-[8px]"></i>${hotel.location}</p>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1 text-[8px]" style="color:var(--text-secondary)">${(hotel.amenities || []).slice(0, 2).map(a => `<span class="px-1.5 py-0.5 rounded" style="background:var(--bg-field)">${a}</span>`).join('')}</div>
            <div class="text-left"><p class="text-base md:text-lg font-bold text-violet-500 font-display">${utils.formatPrice(hotel.price)}</p><p class="text-[8px]" style="color:var(--text-secondary)">/ Night</p></div>
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

// ==================== HOTEL DETAIL ====================
function showHotelPage(hotelId) {
  // Try to find in cache first, then catalog, then fallback
  let h = state.hotelsCache.find(x => (x.code || x.id) === hotelId);
  if (!h) h = CATALOG.hotels.find(x => x.id === hotelId);
  if (!h) {
    utils.toast('Hotel not found', 'error');
    return;
  }
  
  // Normalize hotel data
  const hotel = {
    id: h.code || h.id,
    name: h.name,
    rating: h.rating || 4.5,
    reviews: h.reviewCount || h.reviews || 0,
    location: h.destinationName || h.address || h.location || 'Sharm El Sheikh',
    image: h.images && h.images[0] ? h.images[0] : h.image,
    images: h.images || [h.image],
    price: h.minRate || h.price || 150,
    amenities: h.amenities || ['Free WiFi', 'Pool'],
    bestseller: h.bestseller || false,
    rooms: h.rooms || [{ type: 'Standard Room', price: h.minRate || h.price || 150, guests: 2, size: '25m²', beds: '1 Queen Bed', image: h.images && h.images[0] ? h.images[0] : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&q=80' }],
    category: h.category || 'luxury',
    fullDescription: h.description || h.fullDescription || 'Luxury hotel in Sharm El Sheikh.',
    description: h.description || 'Luxury hotel in Sharm El Sheikh.'
  };
  
  state.currentHotel = hotel;
  const old = document.getElementById('hotelDetailPage');
  if (old) old.remove();
  const hotelPage = document.createElement('div');
  hotelPage.id = 'hotelDetailPage';
  hotelPage.className = 'page';
  hotelPage.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-card)">
      <div class="relative h-80">
        <div id="hotelGallery" class="gallery-track w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style="scrollbar-width:none" onscroll="onGalleryScroll(this)">
          ${(hotel.images || [hotel.image]).map(img => `<img src="${getImageUrl(img)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`).join('')}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
        <button onclick="closeHotelPage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
        <button onclick="favorites.toggle('${hotel.id}'); updateHotelFav('${hotel.id}')" class="absolute top-4 left-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg z-10"><i id="hotelFavIcon" class="fa-${state.favorites.includes(hotel.id) ? 'solid text-red-500' : 'regular text-ink-900'} fa-heart"></i></button>
        ${hotel.bestseller ? '<div class="absolute top-4 left-1/2 -translate-x-1/2 badge-bestseller px-3 py-1 rounded-full text-[10px] font-black">BEST SELLER</div>' : ''}
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="galleryDots">${(hotel.images || [hotel.image]).map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>
      </div>
      <div class="relative -mt-6 rounded-t-[28px] p-5 space-y-6 pb-32" style="background:var(--bg-card)">
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ${(hotel.category || '').toUpperCase()} HOTEL</p>
          <h2 class="font-display text-2xl font-bold mb-1 leading-tight" style="color:var(--text-primary)">${hotel.name}</h2>
          <div class="flex items-center gap-2 text-sm mb-1">${utils.renderStars(hotel.rating)}<span class="text-xs" style="color:var(--text-secondary)">${Number(hotel.rating).toFixed(1)} (${hotel.reviews} reviews)</span></div>
          <p class="text-xs flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500"></i>${hotel.location}</p>
        </div>
        <div class="grid grid-cols-3 gap-2">
          ${(hotel.amenities || []).slice(0, 6).map(a => `<div class="field-box rounded-xl p-2.5 flex flex-col items-center gap-1.5 text-center"><i class="fa-solid ${amenityIcon(a)} text-violet-500"></i><span class="text-[9px] leading-tight" style="color:var(--text-secondary)">${a}</span></div>`).join('')}
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ABOUT</p>
          <h3 class="font-display text-lg font-bold mb-2" style="color:var(--text-primary)">About this hotel</h3>
          <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${hotel.fullDescription || hotel.description || ''}</p>
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold">— ROOMS</p>
          <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Room Options <span class="text-xs font-normal" style="color:var(--text-secondary)">— tap a room to select it</span></h3>
          <div class="space-y-3" id="hotelRoomsList">
            ${(hotel.rooms || []).map((r, i) => `
              <div class="card room-option-card rounded-2xl p-3 flex gap-3 cursor-pointer ${i === 0 ? 'room-selected' : ''}" onclick="selectRoomOnDetail('${hotel.id}', ${i})">
                <img src="${getImageUrl(r.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-24 h-24 rounded-xl object-cover flex-shrink-0" onclick="event.stopPropagation(); showRoomPreview('${hotel.id}', ${i})">
                <div class="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 class="font-display font-bold text-sm mb-1" style="color:var(--text-primary)">${r.type}</h4>
                    <div class="flex items-center gap-2 text-[10px] mb-1" style="color:var(--text-secondary)"><span class="flex items-center gap-1"><i class="fa-solid fa-user-group"></i>${r.guests || 2}</span><span class="flex items-center gap-1"><i class="fa-solid fa-ruler-combined"></i>${r.size || '25m²'}</span></div>
                    <p class="text-[10px] flex items-center gap-1 mb-1" style="color:var(--text-secondary)"><i class="fa-solid fa-bed"></i>${r.beds || '1 Queen Bed'}</p>
                    ${r.extraAdultFee ? `<p class="text-[9px]" style="color:var(--text-secondary)">+${utils.formatPrice(r.extraAdultFee)}/extra adult · ${r.freeChildrenPerRoom || 2} children free</p>` : ''}
                  </div>
                  <div class="flex items-center justify-between">
                    <p class="font-display font-bold text-violet-500 text-lg">${utils.formatPrice(r.price)}<span class="text-[10px] font-normal" style="color:var(--text-secondary)"> /Night</span></p>
                    <span class="room-select-check text-[10px] font-bold text-violet-500 flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> <span data-i18n="roomSelected">Selected</span></span>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card rounded-2xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div><p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="sectionReviewsEyebrow">— REVIEWS</p><h3 class="font-display text-lg font-bold" style="color:var(--text-primary)" data-i18n="guestReviewsTitle">Guest Reviews</h3></div>
            <div class="text-center"><p class="text-3xl font-bold text-violet-500 font-display" id="hotelReviewsSummary">${Number(hotel.rating).toFixed(1)}</p><p class="text-[10px]" style="color:var(--text-secondary)"><span id="hotelReviewsSummaryCount">${hotel.reviews || 0}</span> reviews</p></div>
          </div>
          <button onclick="reviews.openModal('hotel','${hotel.id}')" class="w-full py-2.5 rounded-xl text-xs font-bold border border-violet-400/40 text-violet-500 mb-3"><i class="fa-solid fa-pen"></i> <span data-i18n="writeReview">Write a Review</span></button>
          <div class="space-y-3" id="hotelReviewsList"></div>
        </div>
      </div>
      <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-xl border-t p-4 flex items-center justify-between z-10" style="background:var(--bg-card); border-color:var(--border-card)">
        <div><p class="text-[9px] tracking-wider mb-0.5 font-semibold" style="color:var(--text-secondary)" id="hotelBottomPriceLabel">SELECTED ROOM</p><p class="text-xl font-bold text-violet-500 font-display" id="hotelBottomPriceAmount">${utils.formatPrice((hotel.rooms && hotel.rooms[0] ? hotel.rooms[0].price : hotel.price))}<span class="text-xs font-normal" style="color:var(--text-secondary)"> / Night</span></p></div>
        <button id="hotelBookNowBtn" onclick="startBooking('${hotel.id}', 0)" class="btn-gold px-7 py-3 rounded-2xl font-bold text-ink-900">Book Now</button>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(hotelPage);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  hotelPage.classList.add('active');
  window.scrollTo(0, 0);
  reviews.renderList('hotel', hotel.id, 'hotelReviewsList', 'hotelReviewsSummary');
  I18N.set(I18N.get());
}

function onGalleryScroll(el) {
  const idx = Math.round(el.scrollLeft / el.clientWidth);
  document.querySelectorAll('#galleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function amenityIcon(a) {
  const map = { 'Free WiFi': 'fa-wifi', 'Breakfast': 'fa-mug-saucer', 'Pool': 'fa-water-ladder', 'Spa': 'fa-spa', 'Gym': 'fa-dumbbell', 'Beach Access': 'fa-umbrella-beach', 'Parking': 'fa-square-parking', 'Business Center': 'fa-briefcase', 'Meeting Rooms': 'fa-users-rectangle', 'Concierge': 'fa-bell-concierge', '24/7 Reception': 'fa-clock' };
  return map[a] || 'fa-check';
}

function updateHotelFav(hotelId) {
  const icon = document.getElementById('hotelFavIcon');
  if (icon) icon.className = state.favorites.includes(hotelId) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-ink-900';
  ui.renderFeaturedHotels();
  hotels.render();
  favorites.render();
}

function closeHotelPage() { reviews.detachListeners();
  const p = document.getElementById('hotelDetailPage'); if (p) p.remove();
  nav.go('hotels'); }

function selectRoomOnDetail(hotelId, roomIndex, opts) {
  opts = opts || {};
  const h = state.hotelsCache.find(x => (x.code || x.id) === hotelId) || CATALOG.hotels.find(x => x.id === hotelId);
  const r = h && h.rooms && h.rooms[roomIndex];
  if (!r) return;
  const priceEl = document.getElementById('hotelBottomPriceAmount');
  if (priceEl) priceEl.innerHTML = `${utils.formatPrice(r.price)}<span class="text-xs font-normal" style="color:var(--text-secondary)"> / Night</span>`;
  const btn = document.getElementById('hotelBookNowBtn');
  if (btn) btn.setAttribute('onclick', `startBooking('${hotelId}', ${roomIndex})`);
  document.querySelectorAll('#hotelRoomsList .room-option-card').forEach((card, i) => card.classList.toggle('room-selected', i === roomIndex));
  if (opts.closeModal) closeRoomPreview();
}

// ==================== ROOM PREVIEW ====================
function closeRoomPreview() { document.getElementById('roomPreviewModal').classList.add('hidden'); }

function showRoomPreview(hotelId, roomIndex) {
  const h = state.hotelsCache.find(x => (x.code || x.id) === hotelId) || CATALOG.hotels.find(x => x.id === hotelId);
  const r = h.rooms[roomIndex];
  document.getElementById('roomPreviewContent').innerHTML = `
    <div class="relative h-52">
      <img src="${getImageUrl(r.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
      <button onclick="closeRoomPreview()" class="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900"><i class="fa-solid fa-xmark"></i></button>
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      <p class="absolute bottom-3 right-3 left-3 text-white font-display font-bold text-lg">${r.type}</p>
    </div>
    <div class="p-5" style="background:var(--bg-card)">
      <div class="flex items-center gap-3 text-xs mb-3" style="color:var(--text-secondary)">
        <span class="flex items-center gap-1"><i class="fa-solid fa-user-group text-violet-500"></i>${r.guests || 2} Guests</span>
        <span class="flex items-center gap-1"><i class="fa-solid fa-ruler-combined text-violet-500"></i>${r.size || '25m²'}</span>
        <span class="flex items-center gap-1"><i class="fa-solid fa-bed text-violet-500"></i>${r.beds || '1 Queen Bed'}</span>
      </div>
      <p class="text-sm leading-relaxed mb-4" style="color:var(--text-secondary)">${r.description || ''}</p>
      <div class="flex items-center justify-between">
        <p class="font-display font-bold text-violet-500 text-xl">${utils.formatPrice(r.price)}<span class="text-xs font-normal" style="color:var(--text-secondary)"> /Night</span></p>
        <button onclick="selectRoomOnDetail('${hotelId}', ${roomIndex}, { closeModal: true })" class="btn-gold px-6 py-3 rounded-2xl font-bold text-ink-900 text-sm">Select This Room</button>
      </div>
    </div>`;
  document.getElementById('roomPreviewModal').classList.remove('hidden');
}

// ==================== HOTEL BOOKING FLOW ====================
function startBooking(hotelId, roomIndex) {
  const h = state.hotelsCache.find(x => (x.code || x.id) === hotelId) || CATALOG.hotels.find(x => x.id === hotelId);
  const r = h.rooms[roomIndex] || h.rooms[0];
  state.currentHotel = h;
  state.currentRoom = r;
  const maxOcc = r.guests || DEFAULT_ROOM_OCCUPANCY;
  const required = Math.ceil((state.guests.adults + state.guests.children) / maxOcc);
  if (required > state.guests.rooms) { state.guests.rooms = required;
    utils.toast('Room count adjusted to fit this room type', 'info'); }
  const ci = document.getElementById('checkinDate') ? document.getElementById('checkinDate').dataset.value : '';
  const co = document.getElementById('checkoutDate') ? document.getElementById('checkoutDate').dataset.value : '';
  state.bookingDraft = { name: 'Ahmed Mohamed', email: '', phone: '', requests: '', payment: 'card',
    checkin: ci || utils.addDays(utils.todayIso(), 1), checkout: co || utils.addDays(utils.todayIso(), 3) };
  renderBookingStep(2);
}

function renderBookingStep(step) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  let existing = document.getElementById('bookingFlowPage');
  if (existing) existing.remove();
  existing = document.getElementById('hotelDetailPage');
  if (existing) { reviews.detachListeners();
    existing.remove(); }
  const h = state.currentHotel,
    r = state.currentRoom;
  const nights = Math.max(1, Math.round((new Date(state.bookingDraft.checkout) - new Date(state.bookingDraft.checkin)) / 86400000));
  const pricing = computeRoomPricing(r, state.guests, state.guests.rooms, nights);
  const roomTotal = pricing.roomTotal;
  const taxes = Math.round(roomTotal * 0.1);
  const total = roomTotal + taxes;
  const page = document.createElement('div');
  page.id = 'bookingFlowPage';
  page.className = 'page';
  let bodyHtml = '';
  if (step === 2) {
    bodyHtml = `
      <div class="p-5">
        <div class="card rounded-2xl p-3 flex gap-3 mb-5">
          <img src="${getImageUrl(h.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
          <div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${h.name}</h3><div class="flex items-center gap-1 mb-1">${utils.renderStars(h.rating)}</div><p class="text-[10px] flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500 text-[8px]"></i>${(h.location || '').split(',')[0]}</p></div>
        </div>
        <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Guest Information</h3>
        <form onsubmit="submitGuestDetails(event)" class="space-y-4">
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">FULL NAME</label><input type="text" id="bkName" required value="${state.bookingDraft.name}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">EMAIL ADDRESS</label><input type="email" id="bkEmail" required placeholder="you@example.com" value="${state.bookingDraft.email}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">PHONE NUMBER</label><input type="tel" id="bkPhone" required placeholder="+20 1xx xxx xxxx" value="${state.bookingDraft.phone}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div class="grid grid-cols-2 gap-3">
            <div id="bkCheckin" class="date-field p-3" data-value="${state.bookingDraft.checkin}" onclick="datepicker.open('bkCheckin', { minIso: utils.todayIso(), unavailableIso: (state.currentHotel && state.currentHotel.unavailableDates) || [] })"><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1">CHECK-IN</label><span class="date-field-value text-sm font-semibold" style="color:var(--text-primary)">${utils.formatDate(state.bookingDraft.checkin)}</span></div>
            <div id="bkCheckout" class="date-field p-3" data-value="${state.bookingDraft.checkout}" onclick="datepicker.open('bkCheckout', { minIso: utils.addDays(state.bookingDraft.checkin || utils.todayIso(), 1), unavailableIso: (state.currentHotel && state.currentHotel.unavailableDates) || [] })"><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1">CHECK-OUT</label><span class="date-field-value text-sm font-semibold" style="color:var(--text-primary)">${utils.formatDate(state.bookingDraft.checkout)}</span></div>
          </div>
          <div class="field-box rounded-2xl p-3 flex items-center justify-between cursor-pointer" onclick="openGuestsModal()">
            <div class="flex items-center gap-3"><div class="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center"><i class="fa-solid fa-user-group text-violet-600"></i></div><div><p class="text-[10px] tracking-wider font-semibold" style="color:var(--text-secondary)">GUESTS & ROOMS</p><p class="text-sm font-semibold" id="bookingGuestsDisplay" style="color:var(--text-primary)">${guestsDisplayText()}</p></div></div>
            <i class="fa-solid fa-chevron-down text-gray-300"></i>
          </div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">SPECIAL REQUESTS (OPTIONAL)</label><textarea id="bkRequests" rows="2" placeholder="e.g. Late check-in, high floor, etc." class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)">${state.bookingDraft.requests}</textarea></div>
          <button type="submit" class="btn-violet w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2 ripple">Continue <i class="fa-solid fa-arrow-left"></i></button>
        </form>
      </div>`;
  } else if (step === 3) {
    bodyHtml = `
      <div class="p-5">
        <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Payment Method</h3>
        <div class="space-y-3 mb-5">${paymentMethodsBlock(state.bookingDraft.payment, 'setHotelPaymentMethod')}</div>
        <div class="card rounded-2xl p-4 space-y-2 mb-6">
          <div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>${r.type} × ${state.guests.rooms} room${state.guests.rooms > 1 ? 's' : ''} (${nights} Night${nights > 1 ? 's' : ''})</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(pricing.baseRoomTotal)}</span></div>
          ${pricing.extraAdults > 0 ? `<div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>Extra adult (${pricing.extraAdults}/room)</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(pricing.extraAdults * (r.extraAdultFee || 0) * state.guests.rooms * nights)}</span></div>` : ''}
          ${pricing.extraChildren > 0 ? `<div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>Extra child (${pricing.extraChildren}/room, beyond ${r.freeChildrenPerRoom || 2} free)</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(pricing.extraChildren * (r.extraChildFee || 0) * state.guests.rooms * nights)}</span></div>` : ''}
          ${state.guests.children > 0 && pricing.extraChildren === 0 ? `<div class="flex justify-between text-xs text-green-600"><span><i class="fa-solid fa-circle-check"></i> Children stay free</span><span></span></div>` : ''}
          <div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>Taxes & Fees</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(taxes)}</span></div>
          <div class="border-t pt-2 flex justify-between" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total Amount</span><span class="font-bold text-violet-500 text-lg font-display">${utils.formatPrice(total)}</span></div>
        </div>
        <button onclick="payAndConfirmHotelBooking(${roomTotal}, ${taxes}, ${total}, ${nights})" id="hotelPayBtn" class="btn-violet w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ripple"><i class="fa-solid fa-lock"></i> Pay Now</button>
        <button onclick="renderBookingStep(2)" class="w-full text-center text-violet-500 text-sm font-semibold mt-4">Back to Previous</button>
      </div>`;
  }
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-body)">
      <div class="dark-scene px-5 pt-6 pb-6 relative overflow-hidden">
        <div class="stars-container"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-5">
            <button onclick="${step === 2 ? 'closeBookingFlow()' : 'renderBookingStep(2)'}" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><i class="fa-solid fa-arrow-right"></i></button>
            <h1 class="text-lg font-bold font-display text-white">${step === 2 ? 'Booking Details' : 'Payment'}</h1>
          </div>
          ${utils.stepIndicator(step, ['Select Room', 'Guest Details', 'Payment'])}
        </div>
      </div>
      ${bodyHtml}
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  page.classList.add('active');
  window.scrollTo(0, 0);
}

function setHotelPaymentMethod(m) { state.bookingDraft.payment = m;
  renderBookingStep(3); }

function closeBookingFlow() { const p = document.getElementById('bookingFlowPage'); if (p) p.remove();
  showHotelPage(state.currentHotel.id); }

function submitGuestDetails(e) {
  e.preventDefault();
  state.bookingDraft.name = document.getElementById('bkName').value;
  state.bookingDraft.email = document.getElementById('bkEmail').value;
  state.bookingDraft.phone = document.getElementById('bkPhone').value;
  state.bookingDraft.checkin = document.getElementById('bkCheckin').dataset.value;
  state.bookingDraft.checkout = document.getElementById('bkCheckout').dataset.value;
  state.bookingDraft.requests = document.getElementById('bkRequests').value;
  renderBookingStep(3);
}

function persistBooking(b) {
  saveGlobalBooking(b);
  if (fbEnabled && currentUser) { fbDB.ref('users/' + currentUser.uid + '/bookings/' + b.id).set(b); } else { state.bookings.unshift(b);
    utils.save(); }
  const label = b.type === 'hotel' ? b.hotelName : b.type === 'excursion' ? b.title : (b.vehicleType + ' Transfer');
  notifications.push({ titleKey: 'bookingConfirmedTitle', title: 'Booking Confirmed', msg: label, icon: 'fa-circle-check', color: 'bg-green-50 text-green-600' });
}

function payAndConfirmHotelBooking(roomTotal, taxes, total, nights) {
  const btn = document.getElementById('hotelPayBtn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Processing…';
  const orderId = utils.generateId();
  kashier.pay({
    amount: total,
    orderId,
    method: state.bookingDraft.payment,
    onSuccess: (result) => {
      const h = state.currentHotel,
        r = state.currentRoom;
      const guests = state.guests.adults + state.guests.children;
      const b = {
        id: orderId,
        type: 'hotel',
        hotelId: h.id,
        hotelName: h.name,
        image: h.image,
        location: h.location,
        rating: h.rating,
        name: state.bookingDraft.name,
        email: state.bookingDraft.email,
        phone: state.bookingDraft.phone,
        requests: state.bookingDraft.requests || '',
        checkin: state.bookingDraft.checkin,
        checkout: state.bookingDraft.checkout,
        guests,
        rooms: state.guests.rooms,
        roomType: r.type,
        nights,
        payment: state.bookingDraft.payment,
        paymentStatus: result.status,
        transactionRef: result.transactionRef,
        priceUsd: total,
        priceFormatted: utils.formatPrice(total),
        status: 'upcoming',
        reviewed: false,
        createdAt: new Date().toISOString(),
        uid: (fbEnabled && currentUser) ? currentUser.uid : null
      };
      persistBooking(b);
      renderBookingConfirmation(b);
    },
    onCancel: () => { btn.disabled = false;
      btn.innerHTML = orig; }
  });
  btn.disabled = false;
  btn.innerHTML = orig;
}

function renderBookingConfirmation(b) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  ['bookingFlowPage', 'excursionBookingFlowPage', 'transferBookingFlowPage'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  const page = document.createElement('div');
  page.id = 'bookingConfirmPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen dark-scene relative overflow-hidden pb-10">
      <div class="stars-container" id="confirmStars"></div>
      <div class="ambient-orb orb-1"></div>
      <div class="relative z-10 px-5 pt-6">
        <div class="flex items-center justify-between mb-8">
          <button onclick="finishBooking()" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><i class="fa-solid fa-arrow-right"></i></button>
          <h1 class="text-white font-bold text-base">Booking Confirmed</h1>
          <div class="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center text-ink-900"><i class="fa-solid fa-check"></i></div>
        </div>
        <div class="text-center mb-8">
          <div class="w-24 h-24 mx-auto mb-5 relative">
            <div class="absolute inset-0 bg-gold-400/20 rounded-full animate-ping"></div>
            <div class="relative w-full h-full rounded-full bg-gradient-to-br from-violet-400 to-violet-700 flex items-center justify-center shadow-2xl"><i class="fa-solid fa-check text-4xl text-white"></i></div>
          </div>
          <h2 class="font-display text-2xl font-bold text-white mb-1">Your Booking<br>is <span class="text-gold-400">Confirmed!</span></h2>
          <p class="text-white/60 text-sm max-w-xs mx-auto">${b.paymentStatus === 'pending_cash' ? 'Please have the amount ready to pay in cash on arrival.' : 'Thank you! Your payment was received.'}</p>
        </div>
      </div>
      <div class="relative z-10 rounded-t-[28px] mt-4 p-5" style="background:var(--bg-card)">
        ${bookingDetailBody(b)}
        <button onclick="finishBooking('bookings')" class="btn-violet w-full py-4 rounded-2xl font-bold mb-3 mt-2">View My Booking</button>
        <button onclick="finishBooking('home')" class="btn-outline-violet w-full py-4 rounded-2xl font-bold">Back to Home</button>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  page.classList.add('active');
  window.scrollTo(0, 0);
  utils.createStars('confirmStars');
  utils.confetti();
  ui.updateProfileStats();
}

function finishBooking(target) {
  const p = document.getElementById('bookingConfirmPage');
  if (p) p.remove();
  const hp = document.getElementById('hotelDetailPage');
  if (hp) { reviews.detachListeners();
    hp.remove(); }
  const ep = document.getElementById('excursionDetailPage');
  if (ep) { reviews.detachListeners();
    ep.remove(); }
  nav.go(target || 'home');
}

function bookingDetailBody(b) {
  const paymentLabel = b.payment === 'cash' ? (I18N.get() === 'ar' ? I18N_DICT.cashOnArrival.ar : I18N_DICT.cashOnArrival.en) : b.payment === 'instapay' ? (I18N.get() === 'ar' ? I18N_DICT.instapayWallet.ar : I18N_DICT.instapayWallet.en) : (I18N.get() === 'ar' ? I18N_DICT.creditDebitCard.ar : I18N_DICT.creditDebitCard.en);
  const paymentRow = `<div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-credit-card text-violet-500"></i>Payment</span><span class="font-semibold" style="color:var(--text-primary)">${paymentLabel}</span></div>`;
  if (b.type === 'excursion') {
    return `
      <div class="card rounded-2xl p-3 flex gap-3 mb-4">
        <img src="${getImageUrl(b.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
        <div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${b.title}</h3><p class="text-[11px]" style="color:var(--text-secondary)">${b.category}</p></div>
      </div>
      <div class="space-y-3 text-sm mb-4">
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-regular fa-calendar text-violet-500"></i>Date</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.date)}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-user-group text-violet-500"></i>Participants</span><span class="font-semibold" style="color:var(--text-primary)">${b.participants}</span></div>
        ${paymentRow}
      </div>
      <div class="border-t pt-3 flex justify-between mb-4" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total ${b.paymentStatus === 'pending_cash' ? 'Due' : 'Paid'}</span><span class="font-bold text-violet-500 text-lg font-display">${b.priceFormatted}</span></div>
      <div class="field-box rounded-xl p-3 flex items-center justify-between mb-2"><span class="text-xs" style="color:var(--text-secondary)">Booking ID</span><span class="text-xs font-bold flex items-center gap-2" style="color:var(--text-primary)">${b.id}</span></div>`;
  }
  if (b.type === 'transfer') {
    return `
      <div class="card rounded-2xl p-3 flex gap-3 mb-4">
        <div class="w-16 h-16 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-shuttle-van text-violet-600 text-xl"></i></div>
        <div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${b.vehicleType} Transfer</h3><p class="text-[11px]" style="color:var(--text-secondary)">${b.direction}</p></div>
      </div>
      <div class="space-y-3 text-sm mb-4">
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-regular fa-calendar text-violet-500"></i>Date</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.date)}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-regular fa-clock text-violet-500"></i>Time</span><span class="font-semibold" style="color:var(--text-primary)">${b.time}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-plane text-violet-500"></i>Flight No.</span><span class="font-semibold" style="color:var(--text-primary)">${b.flightNo || '—'}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-location-dot text-violet-500"></i>Pickup/Drop-off</span><span class="font-semibold text-right" style="color:var(--text-primary); max-width:60%">${b.address}</span></div>
        <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-user-group text-violet-500"></i>Passengers</span><span class="font-semibold" style="color:var(--text-primary)">${b.passengers}</span></div>
        ${paymentRow}
      </div>
      <div class="border-t pt-3 flex justify-between mb-4" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total ${b.paymentStatus === 'pending_cash' ? 'Due' : 'Paid'}</span><span class="font-bold text-violet-500 text-lg font-display">${b.priceFormatted}</span></div>
      <div class="field-box rounded-xl p-3 flex items-center justify-between mb-2"><span class="text-xs" style="color:var(--text-secondary)">Booking ID</span><span class="text-xs font-bold flex items-center gap-2" style="color:var(--text-primary)">${b.id}</span></div>`;
  }
  return `
    <div class="card rounded-2xl p-3 flex gap-3 mb-4">
      <img src="${getImageUrl(b.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
      <div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${b.hotelName}</h3><div class="flex items-center gap-1 mb-1">${utils.renderStars(b.rating || 5)}</div><p class="text-[10px] flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500 text-[8px]"></i>${(b.location || '').split(',')[0]}</p></div>
    </div>
    <div class="space-y-3 text-sm mb-4">
      <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-regular fa-calendar text-violet-500"></i>Check-in</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.checkin)}</span></div>
      <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-regular fa-calendar-check text-violet-500"></i>Check-out</span><span class="font-semibold" style="color:var(--text-primary)">${utils.formatDate(b.checkout)}</span></div>
      <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-user-group text-violet-500"></i>Guests</span><span class="font-semibold" style="color:var(--text-primary)">${b.guests} Guests, ${b.rooms} Room${b.rooms > 1 ? 's' : ''}</span></div>
      <div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-solid fa-bed text-violet-500"></i>Room Type</span><span class="font-semibold" style="color:var(--text-primary)">${b.roomType}</span></div>
      ${b.requests ? `<div class="flex justify-between"><span style="color:var(--text-secondary)" class="flex items-center gap-2"><i class="fa-regular fa-note-sticky text-violet-500"></i>Requests</span><span class="font-semibold text-right" style="color:var(--text-primary); max-width:60%">${b.requests}</span></div>` : ''}
      ${paymentRow}
    </div>
    <div class="border-t pt-3 flex justify-between mb-4" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total ${b.paymentStatus === 'pending_cash' ? 'Due' : 'Paid'}</span><span class="font-bold text-violet-500 text-lg font-display">${b.priceFormatted}</span></div>
    <div class="field-box rounded-xl p-3 flex items-center justify-between mb-2"><span class="text-xs" style="color:var(--text-secondary)">Booking ID</span><span class="text-xs font-bold flex items-center gap-2" style="color:var(--text-primary)">${b.id}</span></div>`;
}

// ==================== BOOKING DETAILS ====================
function showBookingDetails(bookingId) {
  const b = state.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const dateField = b.type === 'hotel' ? b.checkin : b.date;
  const isUp = new Date(dateField) >= new Date(utils.todayIso());
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
          <div class="text-center">
            <span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${isUp ? 'bg-green-500/20 text-green-400 border border-green-400/30' : 'bg-white/10 text-white/50 border border-white/20'}">${isUp ? 'UPCOMING' : 'COMPLETED'}</span>
          </div>
        </div>
      </div>
      <div class="relative -mt-4 rounded-t-[28px] p-5" style="background:var(--bg-card)">
        ${bookingDetailBody(b)}
        ${b.type !== 'transfer' ? (b.reviewed ? `<div class="text-center text-xs py-2 mb-2" style="color:var(--text-secondary)"><i class="fa-solid fa-circle-check text-green-500"></i> You've reviewed this booking</div>` : (!isUp ? `<button onclick="closeBookingDetails(); reviews.openModal('${b.type}','${b.hotelId || b.excursionId}')" class="w-full py-3.5 rounded-2xl font-bold border border-violet-400/40 text-violet-500 mb-2"><i class="fa-solid fa-pen"></i> Write a Review</button>` : '')) : ''}
        ${isUp ? `<button onclick="cancelBooking('${b.id}')" class="w-full py-4 rounded-2xl font-bold text-red-500 border border-red-400/30 mt-2">Cancel Booking</button>` : ''}
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
}

function closeBookingDetails() { const p = document.getElementById('bookingDetailsPage'); if (p) p.remove();
  nav.go('bookings'); }

function cancelBooking(bookingId) {
  if (!confirm('Cancel this booking?')) return;
  if (fbEnabled && currentUser) { fbDB.ref('users/' + currentUser.uid + '/bookings/' + bookingId).remove(); } else { state.bookings = state.bookings.filter(b => b.id !== bookingId);
    utils.save();
    bookings.render();
    ui.updateProfileStats(); }
  utils.toast('Booking cancelled', 'info');
  closeBookingDetails();
}

// ==================== HOTELS LIST ====================
const hotels = {
  render() {
    const list = document.getElementById('hotelsList');
    if (!list) return;
    // Use API cache if available, else fallback to catalog
    let filtered = state.hotelsCache.length ? state.hotelsCache : CATALOG.hotels;
    if (state.currentFilter !== 'all') filtered = filtered.filter(h => (h.category || '').toLowerCase() === state.currentFilter);
    if (state.searchQuery) filtered = filtered.filter(h => (h.name || '').toLowerCase().includes(state.searchQuery));
    if (filtered.length === 0) { 
      list.innerHTML = `<div class="text-center py-16"><div class="w-20 h-20 mx-auto mb-3 field-box rounded-full flex items-center justify-center"><i class="fa-solid fa-hotel text-2xl text-violet-300"></i></div><p class="font-display text-lg font-bold mb-1" style="color:var(--text-primary)">No hotels found</p><p class="text-sm" style="color:var(--text-secondary)">Try different filters</p></div>`; 
      return; 
    }
    list.innerHTML = filtered.map(h => ui.renderHotelCardFromAPI(h)).join('');
  }
};

// ==================== EXCURSIONS ====================
const excursionsUi = {
  renderFeatured() {
    const el = document.getElementById('featuredExcursions');
    if (!el) return;
    el.innerHTML = CATALOG.excursions.slice(0, 4).map(x => this.renderMiniCard(x)).join('');
  },
  renderMiniCard(x) {
    const imgSrc = getImageUrl(x.image);
    return `
      <div onclick="showExcursionPage('${x.id}')" class="flex-shrink-0 w-44 cursor-pointer">
        <div class="relative w-44 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg">
          <img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <i class="fa-solid fa-star text-gold-400 text-[8px]"></i>
            <span class="text-[9px] font-bold text-gold-400">${Number(x.rating).toFixed(1)}</span>
          </div>
          <div class="absolute bottom-2 right-2 left-2">
            <span class="text-[8px] font-bold text-white bg-violet-600/90 px-2 py-0.5 rounded-full">${x.category}</span>
          </div>
        </div>
        <h4 class="font-display font-bold text-sm line-clamp-2 mb-1" style="color:var(--text-primary)">${x.title}</h4>
        <p class="font-display font-bold text-violet-500 text-sm">${utils.formatPrice(x.price)}<span class="text-[10px] font-normal" style="color:var(--text-secondary)"> /person</span></p>
      </div>`;
  },
  renderCard(x) {
    const imgSrc = getImageUrl(x.image);
    return `
      <div onclick="showExcursionPage('${x.id}')" class="hotel-card rounded-[20px] overflow-hidden cursor-pointer">
        <div class="flex">
          <div class="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 overflow-hidden">
            <img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
            <div class="absolute bottom-2 right-2 rating-pill px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <span class="text-[9px]" style="color:var(--text-secondary)">(${x.reviews} reviews)</span>
              <i class="fa-solid fa-star text-gold-400 text-[8px]"></i>
              <span class="text-[9px] font-bold text-gold-400">${Number(x.rating).toFixed(1)}</span>
            </div>
          </div>
          <div class="flex-1 p-3 flex flex-col justify-between">
            <div>
              <span class="text-[9px] font-bold text-violet-500 mb-1 inline-block">${x.category}</span>
              <h3 class="font-display font-bold text-sm md:text-base line-clamp-2 mb-1" style="color:var(--text-primary)">${x.title}</h3>
              <p class="text-[10px] flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-regular fa-clock text-violet-500 text-[8px]"></i>${x.duration}</p>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[9px]" style="color:var(--text-secondary)"></span>
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

// ==================== EXCURSION DETAIL ====================
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
          ${(x.images || [x.image]).map(img => {
            const src = getImageUrl(img);
            return `<img src="${src}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`;
          }).join('')}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
        <button onclick="closeExcursionPage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
        <div class="absolute top-4 left-4 bg-violet-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10">${x.category}</div>
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="excursionGalleryDots">${(x.images || [x.image]).map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>
      </div>
      <div class="relative -mt-6 rounded-t-[28px] p-5 space-y-6 pb-32" style="background:var(--bg-card)">
        <div>
          <h2 class="font-display text-2xl font-bold mb-1 leading-tight" style="color:var(--text-primary)">${x.title}</h2>
          <div class="flex items-center gap-2 text-sm mb-1">${utils.renderStars(x.rating)}<span class="text-xs" style="color:var(--text-secondary)">${Number(x.rating).toFixed(1)} (${x.reviews} reviews)</span></div>
          <p class="text-xs flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-regular fa-clock text-violet-500"></i>${x.duration} <span class="mx-1">·</span> <i class="fa-solid fa-location-dot text-violet-500"></i>${x.meetingPoint || ''}</p>
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="excSectionAbout">— ABOUT</p>
          <h3 class="font-display text-lg font-bold mb-2" style="color:var(--text-primary)" data-i18n="excSectionOverview">Overview</h3>
          <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${x.fullDescription || x.description}</p>
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="excSectionIncluded">— INCLUDED</p>
          <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)" data-i18n="excWhatsIncluded">What's Included</h3>
          <div class="grid grid-cols-1 gap-2">${(x.includes || []).map(i => `<div class="flex items-center gap-2 text-sm" style="color:var(--text-secondary)"><i class="fa-solid fa-circle-check text-green-500"></i>${i}</div>`).join('')}</div>
        </div>
        ${(x.excludes || []).length ? `
          <div>
            <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="excSectionNotIncluded">— NOT INCLUDED</p>
            <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)" data-i18n="excWhatsNotIncluded">What's Not Included</h3>
            <div class="grid grid-cols-1 gap-2">${x.excludes.map(i => `<div class="flex items-center gap-2 text-sm" style="color:var(--text-secondary)"><i class="fa-solid fa-circle-xmark text-red-400"></i>${i}</div>`).join('')}</div>
          </div>` : ''}
        ${(x.whatToBring || []).length ? `
          <div>
            <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="excSectionBring">— GOOD TO KNOW</p>
            <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)" data-i18n="excWhatToBring">What to Bring</h3>
            <div class="grid grid-cols-1 gap-2">${x.whatToBring.map(i => `<div class="flex items-center gap-2 text-sm" style="color:var(--text-secondary)"><i class="fa-solid fa-suitcase-rolling text-violet-500"></i>${i}</div>`).join('')}</div>
          </div>` : ''}
        ${(x.itinerary || []).length ? `
          <div>
            <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="excSectionItinerary">— SCHEDULE</p>
            <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)" data-i18n="excTripItinerary">Trip Itinerary</h3>
            <div class="space-y-0">
              ${x.itinerary.map((step, i) => `
                <div class="flex gap-3">
                  <div class="flex flex-col items-center flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-violet-500/15 text-violet-500 text-[11px] font-bold flex items-center justify-center">${i + 1}</div>
                    ${i < x.itinerary.length - 1 ? '<div class="w-px flex-1 bg-violet-400/20 my-1"></div>' : ''}
                  </div>
                  <div class="pb-4 flex-1">
                    <p class="text-[10px] font-bold text-violet-500 mb-0.5">${step.time || ''}</p>
                    <p class="text-sm font-semibold mb-0.5" style="color:var(--text-primary)">${step.title || ''}</p>
                    <p class="text-xs leading-relaxed" style="color:var(--text-secondary)">${step.description || ''}</p>
                  </div>
                </div>`).join('')}
            </div>
          </div>` : ''}
        <div class="card rounded-2xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div><p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="sectionReviewsEyebrow">— REVIEWS</p><h3 class="font-display text-lg font-bold" style="color:var(--text-primary)" data-i18n="guestReviewsTitle">Guest Reviews</h3></div>
            <div class="text-center"><p class="text-3xl font-bold text-violet-500 font-display" id="excursionReviewsSummary">${Number(x.rating).toFixed(1)}</p><p class="text-[10px]" style="color:var(--text-secondary)"><span id="excursionReviewsSummaryCount">${x.reviews || 0}</span> reviews</p></div>
          </div>
          <button onclick="reviews.openModal('excursion','${x.id}')" class="w-full py-2.5 rounded-xl text-xs font-bold border border-violet-400/40 text-violet-500 mb-3"><i class="fa-solid fa-pen"></i> <span data-i18n="writeReview">Write a Review</span></button>
          <div class="space-y-3" id="excursionReviewsList"></div>
        </div>
      </div>
      <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-xl border-t p-4 flex items-center justify-between z-10" style="background:var(--bg-card); border-color:var(--border-card)">
        <div><p class="text-[9px] tracking-wider mb-0.5 font-semibold" style="color:var(--text-secondary)">FROM</p><p class="text-xl font-bold text-violet-500 font-display">${utils.formatPrice(x.price)}<span class="text-xs font-normal" style="color:var(--text-secondary)">/person</span></p></div>
        <button onclick="startExcursionBooking('${x.id}')" class="btn-gold px-7 py-3 rounded-2xl font-bold text-ink-900">Book Now</button>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
  reviews.renderList('excursion', x.id, 'excursionReviewsList', 'excursionReviewsSummary');
  I18N.set(I18N.get());
}

function onExcursionGalleryScroll(el) {
  const idx = Math.round(el.scrollLeft / el.clientWidth);
  document.querySelectorAll('#excursionGalleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function closeExcursionPage() { reviews.detachListeners();
  const p = document.getElementById('excursionDetailPage'); if (p) p.remove();
  nav.go('excursions'); }

function startExcursionBooking(excursionId) {
  const x = CATALOG.excursions.find(i => i.id === excursionId);
  state.currentExcursion = x;
  const dateField = document.getElementById('excursionDate');
  state.bookingDraft = { name: 'Ahmed Mohamed', email: '', phone: '', participants: 2, payment: 'card', date: (dateField && dateField.dataset.value) || utils.addDays(utils.todayIso(), 1) };
  renderExcursionBookingStep(2);
}

function renderExcursionBookingStep(step) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  let existing = document.getElementById('excursionBookingFlowPage');
  if (existing) existing.remove();
  existing = document.getElementById('excursionDetailPage');
  if (existing) { reviews.detachListeners();
    existing.remove(); }
  const x = state.currentExcursion;
  const subtotal = x.price * state.bookingDraft.participants;
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;
  const page = document.createElement('div');
  page.id = 'excursionBookingFlowPage';
  page.className = 'page';
  let bodyHtml = '';
  if (step === 2) {
    bodyHtml = `
      <div class="p-5">
        <div class="card rounded-2xl p-3 flex gap-3 mb-5">
          <img src="${getImageUrl(x.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
          <div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${x.title}</h3><p class="text-[11px]" style="color:var(--text-secondary)">${x.category} · ${x.duration}</p></div>
        </div>
        <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Booking Information</h3>
        <form onsubmit="submitExcursionDetails(event)" class="space-y-4">
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">FULL NAME</label><input type="text" id="ekName" required value="${state.bookingDraft.name}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">EMAIL ADDRESS</label><input type="email" id="ekEmail" required placeholder="you@example.com" value="${state.bookingDraft.email}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">PHONE NUMBER</label><input type="tel" id="ekPhone" required placeholder="+20 1xx xxx xxxx" value="${state.bookingDraft.phone}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div id="ekDate" class="date-field p-3" data-value="${state.bookingDraft.date}" onclick="datepicker.open('ekDate', { minIso: utils.addDays(utils.todayIso(), 1) })"><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1">EXCURSION DATE</label><span class="date-field-value text-sm font-semibold" style="color:var(--text-primary)">${utils.formatDate(state.bookingDraft.date)}</span></div>
          <div class="field-box rounded-2xl p-3 flex items-center justify-between">
            <div><p class="text-[10px] tracking-wider font-semibold" style="color:var(--text-secondary)">PARTICIPANTS</p><p class="text-sm font-semibold" style="color:var(--text-primary)" id="ekParticipantsLabel">${state.bookingDraft.participants} People</p></div>
            <div class="flex items-center gap-3"><button type="button" class="counter-btn" onclick="adjustParticipants(-1)">-</button><button type="button" class="counter-btn" onclick="adjustParticipants(1)">+</button></div>
          </div>
          <button type="submit" class="btn-violet w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2 ripple">Continue <i class="fa-solid fa-arrow-left"></i></button>
        </form>
      </div>`;
  } else if (step === 3) {
    bodyHtml = `
      <div class="p-5">
        <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Payment Method</h3>
        <div class="space-y-3 mb-5">${paymentMethodsBlock(state.bookingDraft.payment, 'setExcursionPaymentMethod')}</div>
        <div class="card rounded-2xl p-4 space-y-2 mb-6">
          <div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>${x.title} × ${state.bookingDraft.participants}</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(subtotal)}</span></div>
          <div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>Taxes & Fees</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(taxes)}</span></div>
          <div class="border-t pt-2 flex justify-between" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total Amount</span><span class="font-bold text-violet-500 text-lg font-display">${utils.formatPrice(total)}</span></div>
        </div>
        <button onclick="payAndConfirmExcursionBooking(${subtotal}, ${taxes}, ${total})" id="excursionPayBtn" class="btn-violet w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ripple"><i class="fa-solid fa-lock"></i> Pay Now</button>
        <button onclick="renderExcursionBookingStep(2)" class="w-full text-center text-violet-500 text-sm font-semibold mt-4">Back to Previous</button>
      </div>`;
  }
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-body)">
      <div class="dark-scene px-5 pt-6 pb-6 relative overflow-hidden">
        <div class="stars-container"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-5">
            <button onclick="${step === 2 ? 'closeExcursionBookingFlow()' : 'renderExcursionBookingStep(2)'}" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><i class="fa-solid fa-arrow-right"></i></button>
            <h1 class="text-lg font-bold font-display text-white">${step === 2 ? 'Booking Details' : 'Payment'}</h1>
          </div>
          ${utils.stepIndicator(step, ['Select', 'Details', 'Payment'])}
        </div>
      </div>
      ${bodyHtml}
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  page.classList.add('active');
  window.scrollTo(0, 0);
}

function setExcursionPaymentMethod(m) { state.bookingDraft.payment = m;
  renderExcursionBookingStep(3); }

function closeExcursionBookingFlow() { const p = document.getElementById('excursionBookingFlowPage'); if (p) p.remove();
  showExcursionPage(state.currentExcursion.id); }

function adjustParticipants(delta) {
  const newVal = state.bookingDraft.participants + delta;
  if (newVal >= 1 && newVal <= 15) { state.bookingDraft.participants = newVal;
    document.getElementById('ekParticipantsLabel').textContent = `${newVal} People`; }
}

function submitExcursionDetails(e) {
  e.preventDefault();
  state.bookingDraft.name = document.getElementById('ekName').value;
  state.bookingDraft.email = document.getElementById('ekEmail').value;
  state.bookingDraft.phone = document.getElementById('ekPhone').value;
  state.bookingDraft.date = document.getElementById('ekDate').dataset.value;
  renderExcursionBookingStep(3);
}

function payAndConfirmExcursionBooking(subtotal, taxes, total) {
  const btn = document.getElementById('excursionPayBtn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Processing…';
  const orderId = utils.generateId();
  kashier.pay({
    amount: total,
    orderId,
    method: state.bookingDraft.payment,
    onSuccess: (result) => {
      const x = state.currentExcursion;
      const b = {
        id: orderId,
        type: 'excursion',
        excursionId: x.id,
        title: x.title,
        image: x.image,
        category: x.category,
        name: state.bookingDraft.name,
        email: state.bookingDraft.email,
        phone: state.bookingDraft.phone,
        date: state.bookingDraft.date,
        participants: state.bookingDraft.participants,
        payment: state.bookingDraft.payment,
        paymentStatus: result.status,
        transactionRef: result.transactionRef,
        priceUsd: total,
        priceFormatted: utils.formatPrice(total),
        status: 'upcoming',
        reviewed: false,
        createdAt: new Date().toISOString(),
        checkin: state.bookingDraft.date,
        uid: (fbEnabled && currentUser) ? currentUser.uid : null
      };
      persistBooking(b);
      renderBookingConfirmation(b);
    },
    onCancel: () => { btn.disabled = false;
      btn.innerHTML = orig; }
  });
  btn.disabled = false;
  btn.innerHTML = orig;
}

// ==================== TRANSFERS ====================
const transfersUi = {
  renderVehicleCard(v) {
    return `
      <div class="hotel-card rounded-2xl overflow-hidden">
        <img src="${getImageUrl(v.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-36 object-cover">
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

function startTransferBooking(vehicleId) {
  const v = CATALOG.transfers.find(i => i.id === vehicleId);
  state.currentTransfer = v;
  state.bookingDraft = { name: 'Ahmed Mohamed', email: '', phone: '', direction: 'Airport to Hotel', flightNo: '', address: '', passengers: 2, time: '14:00', payment: 'card', date: utils.addDays(utils.todayIso(), 1) };
  renderTransferBookingStep(2);
}

function renderTransferBookingStep(step) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  let existing = document.getElementById('transferBookingFlowPage');
  if (existing) existing.remove();
  const v = state.currentTransfer;
  const subtotal = v.price;
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;
  const page = document.createElement('div');
  page.id = 'transferBookingFlowPage';
  page.className = 'page';
  let bodyHtml = '';
  if (step === 2) {
    bodyHtml = `
      <div class="p-5">
        <div class="card rounded-2xl p-3 flex gap-3 mb-5">
          <img src="${getImageUrl(v.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
          <div class="flex-1"><h3 class="font-display font-bold text-sm mb-0.5" style="color:var(--text-primary)">${v.vehicleType} Transfer</h3><p class="text-[11px]" style="color:var(--text-secondary)">Up to ${v.capacity} passengers</p></div>
        </div>
        <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Transfer Details</h3>
        <form onsubmit="submitTransferDetails(event)" class="space-y-4">
          <div class="field-box p-1 rounded-2xl flex gap-1">
            <button type="button" onclick="setTransferDirection('Airport to Hotel')" id="dirBtnArrival" class="flex-1 py-2.5 rounded-xl text-xs font-bold" data-i18n="airportPickup">Airport Pickup</button>
            <button type="button" onclick="setTransferDirection('Hotel to Airport')" id="dirBtnDeparture" class="flex-1 py-2.5 rounded-xl text-xs font-bold" data-i18n="airportDropoff">Airport Drop-off</button>
          </div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">FULL NAME</label><input type="text" id="tkName" required value="${state.bookingDraft.name}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">EMAIL ADDRESS</label><input type="email" id="tkEmail" required placeholder="you@example.com" value="${state.bookingDraft.email}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">PHONE NUMBER</label><input type="tel" id="tkPhone" required placeholder="+20 1xx xxx xxxx" value="${state.bookingDraft.phone}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5">FLIGHT NUMBER (OPTIONAL)</label><input type="text" id="tkFlightNo" placeholder="e.g. MS 0455" value="${state.bookingDraft.flightNo}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1.5" id="tkAddressLabel">HOTEL NAME & ADDRESS</label><input type="text" id="tkAddress" required placeholder="e.g. Discover Grand Hotel, Naama Bay" value="${state.bookingDraft.address}" class="input-field w-full px-3 py-2.5 text-sm" style="color:var(--text-primary)"></div>
          <div class="grid grid-cols-2 gap-3">
            <div id="tkDate" class="date-field p-3" data-value="${state.bookingDraft.date}" onclick="datepicker.open('tkDate', { minIso: utils.todayIso() })"><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1">DATE</label><span class="date-field-value text-sm font-semibold" style="color:var(--text-primary)">${utils.formatDate(state.bookingDraft.date)}</span></div>
            <div class="date-field p-3"><label class="block text-[10px] tracking-widest text-violet-500 font-semibold mb-1">TIME</label><input type="time" id="tkTime" value="${state.bookingDraft.time}" class="w-full bg-transparent text-sm font-semibold outline-none border-0 p-0" style="color:var(--text-primary)"></div>
          </div>
          <div class="field-box rounded-2xl p-3 flex items-center justify-between">
            <div><p class="text-[10px] tracking-wider font-semibold" style="color:var(--text-secondary)">PASSENGERS</p><p class="text-sm font-semibold" style="color:var(--text-primary)" id="tkPassengersLabel">${state.bookingDraft.passengers} People</p></div>
            <div class="flex items-center gap-3"><button type="button" class="counter-btn" onclick="adjustTransferPassengers(-1)">-</button><button type="button" class="counter-btn" onclick="adjustTransferPassengers(1)">+</button></div>
          </div>
          <button type="submit" class="btn-violet w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2 ripple">Continue <i class="fa-solid fa-arrow-left"></i></button>
        </form>
      </div>`;
  } else if (step === 3) {
    bodyHtml = `
      <div class="p-5">
        <h3 class="font-display text-lg font-bold mb-3" style="color:var(--text-primary)">Payment Method</h3>
        <div class="space-y-3 mb-5">${paymentMethodsBlock(state.bookingDraft.payment, 'setTransferPaymentMethod')}</div>
        <div class="card rounded-2xl p-4 space-y-2 mb-6">
          <div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>${v.vehicleType} Transfer</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(subtotal)}</span></div>
          <div class="flex justify-between text-sm" style="color:var(--text-secondary)"><span>Taxes & Fees</span><span class="font-medium" style="color:var(--text-primary)">${utils.formatPrice(taxes)}</span></div>
          <div class="border-t pt-2 flex justify-between" style="border-color:var(--border-card)"><span class="font-bold" style="color:var(--text-primary)">Total Amount</span><span class="font-bold text-violet-500 text-lg font-display">${utils.formatPrice(total)}</span></div>
        </div>
        <button onclick="payAndConfirmTransferBooking(${subtotal}, ${taxes}, ${total})" id="transferPayBtn" class="btn-violet w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ripple"><i class="fa-solid fa-lock"></i> Pay Now</button>
        <button onclick="renderTransferBookingStep(2)" class="w-full text-center text-violet-500 text-sm font-semibold mt-4">Back to Previous</button>
      </div>`;
  }
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-body)">
      <div class="dark-scene px-5 pt-6 pb-6 relative overflow-hidden">
        <div class="stars-container"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-5">
            <button onclick="${step === 2 ? 'closeTransferBookingFlow()' : 'renderTransferBookingStep(2)'}" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><i class="fa-solid fa-arrow-right"></i></button>
            <h1 class="text-lg font-bold font-display text-white">${step === 2 ? 'Transfer Details' : 'Payment'}</h1>
          </div>
          ${utils.stepIndicator(step, ['Select', 'Details', 'Payment'])}
        </div>
      </div>
      ${bodyHtml}
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  page.classList.add('active');
  window.scrollTo(0, 0);
  I18N.set(I18N.get());
  if (step === 2) setTransferDirection(state.bookingDraft.direction);
}

function setTransferDirection(dir) {
  state.bookingDraft.direction = dir;
  const a = document.getElementById('dirBtnArrival'),
    d = document.getElementById('dirBtnDeparture'),
    label = document.getElementById('tkAddressLabel');
  if (!a || !d) return;
  a.style.background = dir === 'Airport to Hotel' ? 'linear-gradient(135deg,#fb923c,#c2410c)' : 'transparent';
  a.style.color = dir === 'Airport to Hotel' ? '#fff' : 'var(--text-secondary)';
  d.style.background = dir === 'Hotel to Airport' ? 'linear-gradient(135deg,#fb923c,#c2410c)' : 'transparent';
  d.style.color = dir === 'Hotel to Airport' ? '#fff' : 'var(--text-secondary)';
  if (label) label.textContent = dir === 'Airport to Hotel' ? 'HOTEL NAME & ADDRESS (DROP-OFF)' : 'HOTEL NAME & ADDRESS (PICKUP)';
}

function setTransferPaymentMethod(m) { state.bookingDraft.payment = m;
  renderTransferBookingStep(3); }

function closeTransferBookingFlow() { const p = document.getElementById('transferBookingFlowPage'); if (p) p.remove();
  nav.go('transfers'); }

function adjustTransferPassengers(delta) {
  const v = state.currentTransfer;
  const newVal = state.bookingDraft.passengers + delta;
  if (newVal >= 1 && newVal <= v.capacity) { state.bookingDraft.passengers = newVal;
    document.getElementById('tkPassengersLabel').textContent = `${newVal} People`; }
}

function submitTransferDetails(e) {
  e.preventDefault();
  state.bookingDraft.name = document.getElementById('tkName').value;
  state.bookingDraft.email = document.getElementById('tkEmail').value;
  state.bookingDraft.phone = document.getElementById('tkPhone').value;
  state.bookingDraft.flightNo = document.getElementById('tkFlightNo').value;
  state.bookingDraft.address = document.getElementById('tkAddress').value;
  state.bookingDraft.date = document.getElementById('tkDate').dataset.value;
  state.bookingDraft.time = document.getElementById('tkTime').value;
  renderTransferBookingStep(3);
}

function payAndConfirmTransferBooking(subtotal, taxes, total) {
  const btn = document.getElementById('transferPayBtn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Processing…';
  const orderId = utils.generateId();
  kashier.pay({
    amount: total,
    orderId,
    method: state.bookingDraft.payment,
    onSuccess: (result) => {
      const v = state.currentTransfer;
      const b = {
        id: orderId,
        type: 'transfer',
        transferId: v.id,
        vehicleType: v.vehicleType,
        image: v.image,
        direction: state.bookingDraft.direction,
        name: state.bookingDraft.name,
        email: state.bookingDraft.email,
        phone: state.bookingDraft.phone,
        flightNo: state.bookingDraft.flightNo,
        address: state.bookingDraft.address,
        date: state.bookingDraft.date,
        time: state.bookingDraft.time,
        passengers: state.bookingDraft.passengers,
        payment: state.bookingDraft.payment,
        paymentStatus: result.status,
        transactionRef: result.transactionRef,
        priceUsd: total,
        priceFormatted: utils.formatPrice(total),
        status: 'upcoming',
        reviewed: false,
        createdAt: new Date().toISOString(),
        checkin: state.bookingDraft.date,
        uid: (fbEnabled && currentUser) ? currentUser.uid : null
      };
      persistBooking(b);
      renderBookingConfirmation(b);
    },
    onCancel: () => { btn.disabled = false;
      btn.innerHTML = orig; }
  });
  btn.disabled = false;
  btn.innerHTML = orig;
}

// ==================== DESTINATIONS ====================
const destinationsUi = {
  render() {
    const row = document.getElementById('destinationsRow');
    if (!row) return;
    row.innerHTML = CATALOG.destinations.map(d => {
      const imgSrc = getImageUrl(d.image);
      return `
        <div onclick="showDestinationPage('${d.id}')" class="destination-card">
          <img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover absolute inset-0">
          <div class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent"></div>
          <div class="absolute top-3 right-3 rating-pill px-2 py-1 rounded-full">
            <span class="text-[9px] font-bold text-gold-400">★ ${d.rating}</span>
          </div>
          <div class="absolute bottom-3 right-3 left-3 text-white">
            <p class="font-display font-bold text-base leading-tight">${d.name}</p>
            <p class="text-[10px] text-white/70 leading-snug">${d.tagline || ''}</p>
          </div>
        </div>`;
    }).join('');
  }
};

function showDestinationPage(id) {
  const d = CATALOG.destinations.find(x => x.id === id);
  if (!d) return;
  const old = document.getElementById('destinationDetailPage');
  if (old) old.remove();
  const page = document.createElement('div');
  page.id = 'destinationDetailPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-card)">
      <div class="relative h-72">
        <div class="gallery-track w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style="scrollbar-width:none" onscroll="onDestGalleryScroll(this)" id="destGallery">
          ${(d.images || [d.image]).map(img => {
            const src = getImageUrl(img);
            return `<img src="${src}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`;
          }).join('')}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
        <button onclick="closeDestinationPage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="destGalleryDots">${(d.images || [d.image]).map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>
      </div>
      <div class="relative -mt-6 rounded-t-[28px] p-5 space-y-5" style="background:var(--bg-card)">
        <div>
          <div class="flex items-center gap-2 text-sm mb-1">${utils.renderStars(d.rating)}<span class="text-xs" style="color:var(--text-secondary)">${Number(d.rating).toFixed(1)}</span></div>
          <h2 class="font-display text-2xl font-bold mb-1 leading-tight" style="color:var(--text-primary)">${d.name}</h2>
          <p class="text-xs flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-solid fa-location-dot text-violet-500"></i>${d.location || ''}</p>
        </div>
        <div>
          <p class="text-violet-400 text-[10px] tracking-widest mb-1 font-semibold" data-i18n="aboutPlace">— ABOUT</p>
          <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${d.fullDescription || d.description}</p>
        </div>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
  I18N.set(I18N.get());
}

function onDestGalleryScroll(el) { const idx = Math.round(el.scrollLeft / el.clientWidth);
  document.querySelectorAll('#destGalleryDots .gallery-dot').forEach((dd, i) => dd.classList.toggle('active', i === idx)); }

function closeDestinationPage() { const p = document.getElementById('destinationDetailPage'); if (p) p.remove();
  nav.go('home'); }

// ==================== RESTAURANTS ====================
const restaurantsUi = {
  renderCard(r) {
    const imgSrc = getImageUrl(r.image);
    return `
      <div onclick="showRestaurantPage('${r.id}')" class="restaurant-card">
        <div class="relative h-28">
          <img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
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
          ${(r.images || [r.image]).map(img => {
            const src = getImageUrl(img);
            return `<img src="${src}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover flex-shrink-0 snap-center" style="min-width:100%">`;
          }).join('')}
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

function onRestGalleryScroll(el) { const idx = Math.round(el.scrollLeft / el.clientWidth);
  document.querySelectorAll('#restGalleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx)); }

function closeRestaurantPage() { const p = document.getElementById('restaurantDetailPage'); if (p) p.remove();
  nav.go('restaurants'); }

// ==================== REVIEWS SLIDER ====================
const reviewsHomeUi = {
  render() {
    const row = document.getElementById('reviewsRow');
    if (!row) return;
    row.innerHTML = CATALOG.reviews.map(rv => `
      <div class="review-slide-card">
        <div class="flex items-center gap-3 mb-3">
          <div class="review-avatar-badge">${(rv.name || 'G').charAt(0)}</div>
          <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate" style="color:var(--text-primary)">${rv.name}</p><div class="flex">${utils.renderStars(rv.rating)}</div></div>
        </div>
        <p class="text-xs leading-relaxed mb-3" style="color:var(--text-secondary)">"${rv.text}"</p>
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
        <img src="${getImageUrl(a.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-24 h-24 object-cover rounded-2xl flex-shrink-0">
        <div class="flex-1 min-w-0 py-1">
          <p class="font-display font-bold text-sm mb-1 leading-snug" style="color:var(--text-primary)">${a.title}</p>
          <p class="text-[11px] mb-1.5" style="color:var(--text-secondary); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${a.excerpt}</p>
          <p class="text-[10px]" style="color:var(--text-secondary)"><i class="fa-regular fa-clock"></i> ${a.readTimeMinutes} min</p>
        </div>
      </div>`).join('');
  }
};

function showArticlePage(id) {
  const a = CATALOG.articles.find(x => x.id === id);
  if (!a) return;
  const old = document.getElementById('articleDetailPage');
  if (old) old.remove();
  const page = document.createElement('div');
  page.id = 'articleDetailPage';
  page.className = 'page';
  page.innerHTML = `
    <div class="min-h-screen pb-28" style="background:var(--bg-card)">
      <div class="relative h-56">
        <img src="${getImageUrl(a.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>
        <button onclick="closeArticlePage()" class="absolute top-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg text-ink-900 z-10"><i class="fa-solid fa-arrow-right"></i></button>
      </div>
      <div class="p-5 space-y-4">
        <h1 class="font-display text-2xl font-bold leading-tight" style="color:var(--text-primary)">${a.title}</h1>
        <p class="text-xs" style="color:var(--text-secondary)"><i class="fa-regular fa-clock"></i> ${a.readTimeMinutes} min ${a.author ? '· ' + a.author : ''}</p>
        <p class="text-sm leading-relaxed" style="color:var(--text-secondary); white-space:pre-line">${a.content}</p>
      </div>
    </div>`;
  document.getElementById('mainApp').appendChild(page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo(0, 0);
}

function closeArticlePage() { const p = document.getElementById('articleDetailPage'); if (p) p.remove();
  nav.go('home'); }

// ==================== BOOKINGS LIST ====================
const bookings = {
  switchTab(tab) {
    state.currentBookingTab = tab;
    const up = document.getElementById('tabUpcoming');
    const hist = document.getElementById('tabHistory');
    if (tab === 'upcoming') { up.className = 'flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-lg';
      hist.className = 'flex-1 py-3 rounded-xl text-sm font-medium';
      hist.style.color = 'var(--text-secondary)'; } else { hist.className = 'flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-lg';
      up.className = 'flex-1 py-3 rounded-xl text-sm font-medium';
      up.style.color = 'var(--text-secondary)'; }
    this.render();
  },
  render() {
    const list = document.getElementById('bookingsList');
    const empty = document.getElementById('emptyBookings');
    if (!list) return;
    const isUp = state.currentBookingTab === 'upcoming';
    const filtered = state.bookings.filter(b => { const d = b.type === 'hotel' ? b.checkin : b.date; return isUp ? new Date(d) >= new Date(utils.todayIso()) : new Date(d) < new Date(utils.todayIso()); });
    if (filtered.length === 0) { list.innerHTML = '';
      empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = filtered.map(b => {
      const icons = { hotel: 'fa-hotel', excursion: 'fa-umbrella-beach', transfer: 'fa-shuttle-van' };
      const title = b.type === 'hotel' ? b.hotelName : b.type === 'excursion' ? b.title : `${b.vehicleType} Transfer`;
      const dateStr = b.type === 'hotel' ? b.checkin : b.date;
      const img = b.image ? `<img src="${getImageUrl(b.image)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-20 h-20 rounded-lg object-cover flex-shrink-0">` : `<div class="w-20 h-20 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><i class="fa-solid ${icons[b.type]} text-violet-500 text-2xl"></i></div>`;
      return `
        <div onclick="showBookingDetails('${b.id}')" class="hotel-card rounded-xl p-3 flex gap-3 cursor-pointer">
          ${img}
          <div class="flex-1 flex flex-col justify-between">
            <div><h3 class="font-display font-bold text-sm mb-0.5 line-clamp-1" style="color:var(--text-primary)">${title}</h3><p class="text-[10px] mb-1 flex items-center gap-1" style="color:var(--text-secondary)"><i class="fa-regular fa-calendar text-violet-500 text-[8px]"></i>${utils.formatDate(dateStr)}</p></div>
            <div class="flex justify-between items-center">
              <span class="inline-block ${isUp ? 'bg-green-50 text-green-600 border border-green-200' : 'border'} px-2 py-0.5 rounded text-[9px] font-bold tracking-wider" style="${isUp ? '' : 'color:var(--text-secondary); border-color:var(--border-card)'}">${isUp ? 'UPCOMING' : 'PAST'}</span>
              <p class="font-display font-bold text-violet-500 text-sm">${b.priceFormatted}</p>
            </div>
          </div>
        </div>`;
    }).join('');
  }
};

// ==================== FAVORITES ====================
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
    if (favs.length === 0) { list.innerHTML = '';
      empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = favs.map(h => ui.renderHotelCard(h)).join('');
  }
};

// ==================== SEARCH ====================
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
  filterDestination(dest) { nav.go('hotels');
    utils.toast(`Showing ${dest} hotels`, 'info'); },
  applyExcursionSearch() {
    const cat = document.getElementById('excursionCategorySelect').value;
    state.currentExcursionFilter = cat;
    nav.go('excursions');
    document.querySelectorAll('.excursion-chip').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`)));
  },
  switchTab(tab) {
    state.activeSearchTab = tab;
    document.getElementById('hotelSearchForm').classList.toggle('hidden', tab !== 'hotels');
    document.getElementById('excursionSearchForm').classList.toggle('hidden', tab !== 'excursions');
    document.getElementById('flightSearchForm').classList.toggle('hidden', tab !== 'flights');
    document.getElementById('transferSearchForm').classList.toggle('hidden', tab !== 'transfers');
    const tabs = { hotels: 'searchTabHotels', excursions: 'searchTabExcursions', flights: 'searchTabFlights', transfers: 'searchTabTransfers' };
    Object.keys(tabs).forEach(t => {
      const btn = document.getElementById(tabs[t]);
      if (!btn) return;
      btn.style.background = t === tab ? 'linear-gradient(135deg,#fb923c,#c2410c)' : 'transparent';
      btn.style.color = t === tab ? '#fff' : 'var(--text-secondary)';
    });
    applyHeroContext(tab);
  }
};

// ==================== HERO CONTEXT ====================
const HERO_CONTEXT = {
  hotels: { eyebrowKey: 'premiumStays', titleKey: 'heroTitle', subtitleKey: 'heroSubtitle', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=90' },
  excursions: { eyebrowKey: 'heroExcEyebrow', titleKey: 'heroTitleExcursions', subtitleKey: 'heroSubtitleExcursions', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=90' },
  flights: { eyebrowKey: 'heroFlightsEyebrow', titleKey: 'heroTitleFlights', subtitleKey: 'heroSubtitleFlights', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=90' },
  transfers: { eyebrowKey: 'heroTransfersEyebrow', titleKey: 'heroTitleTransfers', subtitleKey: 'heroSubtitleTransfers', image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=90' }
};

function applyHeroContext(tab) {
  const cfg = HERO_CONTEXT[tab] || HERO_CONTEXT.hotels;
  const lang = I18N.get();
  const eyebrowEl = document.getElementById('heroEyebrowText');
  const titleEl = document.getElementById('heroTitleText');
  const subtitleEl = document.getElementById('heroSubtitleText');
  const imgEl = document.getElementById('heroBgImage');
  if (!eyebrowEl || !titleEl || !subtitleEl || !imgEl) return;
  [eyebrowEl, titleEl, subtitleEl, imgEl].forEach(el => el.style.opacity = '0');
  setTimeout(() => {
    const eyebrowEntry = I18N_DICT[cfg.eyebrowKey],
      titleEntry = I18N_DICT[cfg.titleKey],
      subtitleEntry = I18N_DICT[cfg.subtitleKey];
    if (eyebrowEntry) eyebrowEl.textContent = eyebrowEntry[lang] || eyebrowEntry.en;
    if (titleEntry) titleEl.innerHTML = titleEntry[lang] || titleEntry.en;
    if (subtitleEntry) subtitleEl.textContent = subtitleEntry[lang] || subtitleEntry.en;
    if (imgEl.src !== cfg.image) { imgEl.style.display = '';
      imgEl.src = cfg.image; }
    [eyebrowEl, titleEl, subtitleEl, imgEl].forEach(el => el.style.opacity = '1');
  }, 220);
}

// ==================== NOTIFICATIONS ====================
const notifications = {
  list: JSON.parse(localStorage.getItem('ds_notifications') || '[]'),
  _fbRef: null,
  bindUser() {
    if (fbEnabled && currentUser) {
      this._fbRef = fbDB.ref('users/' + currentUser.uid + '/notifications');
      this._fbRef.on('value', snap => {
        const val = snap.val() || {};
        this.list = Object.keys(val).map(k => Object.assign({ id: k }, val[k])).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.render();
        this.updateBadge();
      });
    } else {
      this.list = JSON.parse(localStorage.getItem('ds_notifications') || '[]');
      if (!this.list.length) this.push({ title: 'Welcome to Discover Sharm!', msg: 'Hotels, excursions and airport transfers — all in one place', icon: 'fa-hand-wave', color: 'bg-gold-400/15 text-gold-600' });
      this.render();
      this.updateBadge();
    }
  },
  push(n) {
    const item = Object.assign({ id: utils.generateId(), read: false, createdAt: new Date().toISOString() }, n);
    if (fbEnabled && currentUser) {
      fbDB.ref('users/' + currentUser.uid + '/notifications/' + item.id).set(item);
    } else {
      this.list.unshift(item);
      localStorage.setItem('ds_notifications', JSON.stringify(this.list));
      this.render();
      this.updateBadge();
    }
  },
  markAllRead() {
    this.list.forEach(n => n.read = true);
    if (fbEnabled && currentUser) {
      const updates = {};
      this.list.forEach(n => { updates[n.id + '/read'] = true; });
      fbDB.ref('users/' + currentUser.uid + '/notifications').update(updates);
    } else {
      localStorage.setItem('ds_notifications', JSON.stringify(this.list));
    }
    this.render();
    this.updateBadge();
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
    if (!this.list.length) {
      list.innerHTML = `<p class="text-center text-sm py-10" style="color:var(--text-secondary)" data-i18n="noNotificationsYet">No notifications yet</p>`;
      I18N.set(I18N.get());
      return;
    }
    list.innerHTML = this.list.map(n => `
      <div class="card rounded-xl p-3.5 flex items-start gap-3" onclick="notifications.markRead('${n.id}')">
        <div class="w-10 h-10 ${n.color || 'bg-violet-50 text-violet-600'} rounded-xl flex items-center justify-center flex-shrink-0"><i class="fa-solid ${n.icon || 'fa-bell'}"></i></div>
        <div class="flex-1"><h3 class="font-semibold text-sm mb-0.5" style="color:var(--text-primary)">${n.title}</h3><p class="text-xs mb-1 leading-relaxed" style="color:var(--text-secondary)">${n.msg}</p><p class="text-[9px] text-gray-400">${this.timeAgo(n.createdAt)}</p></div>
        ${!n.read ? '<div class="w-1.5 h-1.5 bg-gold-400 rounded-full flex-shrink-0 mt-1.5"></div>' : ''}
      </div>`).join('');
  }
};

// ==================== SETTINGS ====================
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
    utils.toast('Currency updated', 'info');
  }
};

// ==================== COUNTRY HELPERS ====================
const COUNTRY_CODES = [
  { code: 'EG', dial: '+20', name: 'Egypt' }, { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'AE', dial: '+971', name: 'UAE' }, { code: 'KW', dial: '+965', name: 'Kuwait' },
  { code: 'QA', dial: '+974', name: 'Qatar' }, { code: 'BH', dial: '+973', name: 'Bahrain' },
  { code: 'OM', dial: '+968', name: 'Oman' }, { code: 'JO', dial: '+962', name: 'Jordan' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' }, { code: 'US', dial: '+1', name: 'United States' },
  { code: 'DE', dial: '+49', name: 'Germany' }, { code: 'FR', dial: '+33', name: 'France' },
  { code: 'IT', dial: '+39', name: 'Italy' }, { code: 'ES', dial: '+34', name: 'Spain' },
  { code: 'RU', dial: '+7', name: 'Russia' }, { code: 'UA', dial: '+380', name: 'Ukraine' },
  { code: 'PL', dial: '+48', name: 'Poland' }, { code: 'NL', dial: '+31', name: 'Netherlands' },
  { code: 'BE', dial: '+32', name: 'Belgium' }, { code: 'CH', dial: '+41', name: 'Switzerland' },
  { code: 'AT', dial: '+43', name: 'Austria' }, { code: 'SE', dial: '+46', name: 'Sweden' },
  { code: 'NO', dial: '+47', name: 'Norway' }, { code: 'DK', dial: '+45', name: 'Denmark' },
  { code: 'FI', dial: '+358', name: 'Finland' }, { code: 'TR', dial: '+90', name: 'Turkey' },
  { code: 'GR', dial: '+30', name: 'Greece' }, { code: 'CZ', dial: '+420', name: 'Czech Republic' },
  { code: 'RO', dial: '+40', name: 'Romania' }, { code: 'HU', dial: '+36', name: 'Hungary' },
  { code: 'IE', dial: '+353', name: 'Ireland' }, { code: 'PT', dial: '+351', name: 'Portugal' },
  { code: 'IN', dial: '+91', name: 'India' }, { code: 'CN', dial: '+86', name: 'China' },
  { code: 'CA', dial: '+1', name: 'Canada' }, { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'ZA', dial: '+27', name: 'South Africa' }, { code: 'BR', dial: '+55', name: 'Brazil' },
  { code: 'KZ', dial: '+7', name: 'Kazakhstan' }, { code: 'IL', dial: '+972', name: 'Israel' }
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

function countryNameFromCode(isoCode) {
  const c = COUNTRY_CODES.find(x => x.code === isoCode);
  return c ? c.name : isoCode;
}

// ==================== FLIGHT SEARCH ====================
const flightSearch = {
  closePaxModal() { document.getElementById('flightPaxModal').classList.add('hidden'); },
  openPaxModal() {
    document.getElementById('fpAdults').textContent = state.flightPax.adults;
    document.getElementById('fpChildren').textContent = state.flightPax.children;
    document.getElementById('fpInfants').textContent = state.flightPax.infants;
    document.getElementById('fpCabin').value = state.flightPax.cabin;
    document.getElementById('flightPaxModal').classList.remove('hidden');
  },
  adjust(type, delta) {
    const limits = { adults: { min: 1, max: 9 }, children: { min: 0, max: 6 }, infants: { min: 0, max: 4 } };
    const newVal = state.flightPax[type] + delta;
    if (newVal >= limits[type].min && newVal <= limits[type].max) {
      state.flightPax[type] = newVal;
      const id = 'fp' + type.charAt(0).toUpperCase() + type.slice(1);
      const el = document.getElementById(id);
      if (el) el.textContent = newVal;
      this.updateDisplay();
    }
  },
  applyPax() {
    state.flightPax.cabin = document.getElementById('fpCabin').value;
    this.closePaxModal();
    this.updateDisplay();
    utils.toast('Passengers updated', 'info');
  },
  updateDisplay() {
    const display = document.getElementById('flightPaxDisplay');
    if (display) {
      const total = state.flightPax.adults + state.flightPax.children + state.flightPax.infants;
      const lang = I18N.get();
      const label = lang === 'ar' ? 'مسافر' : (total > 1 ? 'Passengers' : 'Passenger');
      display.textContent = `${total} ${label} · ${state.flightPax.cabin}`;
    }
  },
  setTripType(type) {
    state.flightTripType = type;
    const round = document.getElementById('flightTripRound');
    const oneway = document.getElementById('flightTripOneway');
    const returnDateWrap = document.getElementById('flightReturnDate');
    if (type === 'round') {
      round.style.background = 'linear-gradient(135deg,#fb923c,#c2410c)';
      round.style.color = '#fff';
      oneway.style.background = 'transparent';
      oneway.style.color = 'var(--text-secondary)';
      if (returnDateWrap) returnDateWrap.style.display = '';
      const depart = document.getElementById('flightDepartDate');
      const departIso = depart ? depart.dataset.value : utils.todayIso();
      const returnIso = utils.addDays(departIso || utils.todayIso(), 5);
      const returnLabel = returnDateWrap ? returnDateWrap.querySelector('.date-field-value') : null;
      if (returnLabel) returnLabel.textContent = utils.formatDate(returnIso);
      if (returnDateWrap) returnDateWrap.dataset.value = returnIso;
    } else {
      oneway.style.background = 'linear-gradient(135deg,#fb923c,#c2410c)';
      oneway.style.color = '#fff';
      round.style.background = 'transparent';
      round.style.color = 'var(--text-secondary)';
      if (returnDateWrap) returnDateWrap.style.display = 'none';
    }
  },
  apply() {
    const from = document.getElementById('flightFrom').value.trim();
    const to = document.getElementById('flightTo').value.trim();
    const departDate = document.getElementById('flightDepartDate').dataset.value;
    if (!from || !to) { utils.toast('Please enter both departure and destination', 'error'); return; }
    if (!departDate) { utils.toast('Please select a departure date', 'error'); return; }
    const lang = I18N.get();
    const msg = lang === 'ar' ? `جاري البحث عن رحلات من ${from} إلى ${to}...` : `Searching flights from ${from} to ${to}...`;
    utils.toast(msg, 'info');
    setTimeout(() => {
      const msg2 = lang === 'ar' ? 'ميزة البحث عن الرحلات قريباً! تابعونا.' : 'Flight search feature coming soon! Check back later.';
      utils.toast(msg2, 'info');
    }, 800);
  }
};

// ==================== TRANSFER SEARCH ====================
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
      if (label) {
        const lang = I18N.get();
        label.textContent = lang === 'ar' ? `${newVal} أشخاص` : `${newVal} People`;
      }
    }
  },
  apply() {
    const pickup = document.getElementById('tsPickup').value.trim();
    const dropoff = document.getElementById('tsDropoff').value.trim();
    const date = document.getElementById('tsDate').dataset.value;
    const time = document.getElementById('tsTime').value;
    if (!pickup || !dropoff) { utils.toast('Please enter both pickup and drop-off locations', 'error'); return; }
    if (!date) { utils.toast('Please select a date', 'error'); return; }
    const lang = I18N.get();
    const msg = lang === 'ar' ? `جاري البحث عن وسائل نقل من ${pickup} إلى ${dropoff}...` : `Searching transfers from ${pickup} to ${dropoff}...`;
    utils.toast(msg, 'info');
    nav.go('transfers');
    setTimeout(() => {
      const msg2 = lang === 'ar' ? 'عرض وسائل النقل المتاحة' : 'Showing available transfers';
      utils.toast(msg2, 'info');
    }, 300);
  },
  populateVehicles() {
    const sel = document.getElementById('tsVehicleSelect');
    if (!sel) return;
    const vehicles = CATALOG.transfers.map(v => v.vehicleType);
    const unique = [...new Set(vehicles)];
    const lang = I18N.get();
    sel.innerHTML = `<option value="any">${lang === 'ar' ? 'أي مركبة' : 'Any vehicle'}</option>` + unique.map(v => `<option value="${v}">${v}</option>`).join('');
  }
};

function initFlightAndTransferForms() {
  const today = utils.todayIso();
  const depart = utils.addDays(today, 3);
  const returnDate = utils.addDays(depart, 5);
  setDateFieldValue('flightDepartDate', depart);
  setDateFieldValue('flightReturnDate', returnDate);
  const transferDate = utils.addDays(today, 2);
  setDateFieldValue('tsDate', transferDate);
  const timeEl = document.getElementById('tsTime');
  if (timeEl) timeEl.value = '14:00';
  flightSearch.setTripType('round');
  transferSearch.populateVehicles();
  transferSearch.setDirection('Airport to Hotel');
  flightSearch.updateDisplay();
}

// ==================== SPLASH / AUTH FLOW ====================
let splashMinTimeElapsed = false,
  splashPendingAction = null;
setTimeout(() => { splashMinTimeElapsed = true; if (splashPendingAction) { const fn = splashPendingAction;
    splashPendingAction = null;
    fn(); } }, 1600);

function afterSplash(fn) { if (splashMinTimeElapsed) fn();
  else splashPendingAction = fn; }

function hideSplash() {
  const s = document.getElementById('splashPage');
  s.style.transition = 'opacity .5s ease';
  s.style.opacity = '0';
  setTimeout(() => { s.style.display = 'none'; }, 500);
}

const authScreen = {
  show() {
    hideSplash();
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
  }
};

// ==================== AUTH ====================
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

// ==================== CATALOG HELPERS ====================
function localizeValue(val, lang) {
  if (val && typeof val === 'object' && !Array.isArray(val) && (val.en || val[lang])) return val[lang] || val.en;
  return val;
}

function localizeItem(raw, lang) {
  const out = Object.assign({}, raw);
  MULTILANG_FIELDS.forEach(f => { if (raw[f] !== undefined) out[f] = localizeValue(raw[f], lang); });
  MULTILANG_ARRAY_FIELDS.forEach(f => { if (raw[f] !== undefined) out[f] = localizeValue(raw[f], lang); });
  MULTILANG_OBJECT_MAP_FIELDS.forEach(f => { if (raw[f] !== undefined) out[f] = localizeValue(raw[f], lang); });
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
  if (Array.isArray(raw.itinerary)) {
    out.itinerary = raw.itinerary.map(step => ({
      time: step.time,
      title: localizeValue(step.title, lang),
      description: localizeValue(step.description, lang)
    }));
  }
  return out;
}

function localizeCatalog(lang) {
  CATALOG.hotels = CATALOG_RAW.hotels.map(h => localizeItem(h, lang));
  CATALOG.excursions = CATALOG_RAW.excursions.map(x => localizeItem(x, lang));
  CATALOG.transfers = CATALOG_RAW.transfers.map(t => localizeItem(t, lang));
  CATALOG.destinations = CATALOG_RAW.destinations.map(d => localizeItem(d, lang));
  CATALOG.restaurants = CATALOG_RAW.restaurants.map(r => localizeItem(r, lang));
  CATALOG.reviews = CATALOG_RAW.reviews.map(r => localizeItem(r, lang));
  CATALOG.articles = CATALOG_RAW.articles.map(a => localizeItem(a, lang));
}

function objToArray(obj) { return obj ? Object.keys(obj).map(k => Object.assign({ id: k }, obj[k])) : []; }

function mergeCatalogWithOverrides(baseArray, firebaseObj) {
  const byId = {};
  (baseArray || []).forEach(item => { byId[item.id] = item; });
  if (firebaseObj) {
    Object.keys(firebaseObj).forEach(id => {
      const override = Object.assign({ id }, firebaseObj[id]);
      if (override._deleted) delete byId[id];
      else byId[id] = override;
    });
  }
  return Object.values(byId);
}

async function loadCatalogJson() {
  const files = ['hotels', 'excursions', 'transfers', 'destinations', 'restaurants', 'reviews', 'articles'];
  for (const f of files) {
    try {
      const res = await fetch('data/' + f + '.json');
      if (!res.ok) throw new Error('Status ' + res.status);
      const data = await res.json();
      CATALOG_RAW[f] = data;
      if (JSON_BASELINE[f]) JSON_BASELINE[f] = data;
    } catch (err) {
      console.warn(`Failed to load ${f}.json, using fallback.`, err);
      if (EMERGENCY_FALLBACK_CATALOG[f]) {
        CATALOG_RAW[f] = EMERGENCY_FALLBACK_CATALOG[f];
        if (JSON_BASELINE[f]) JSON_BASELINE[f] = EMERGENCY_FALLBACK_CATALOG[f];
      } else {
        CATALOG_RAW[f] = [];
        if (JSON_BASELINE[f]) JSON_BASELINE[f] = [];
      }
    }
  }
  localizeCatalog(I18N.get());
}

// ==================== FIREBASE INIT ====================
async function loadAppConfig() {
  try {
    const res = await fetch('data/configs.json');
    const cfg = await res.json();
    firebaseConfig = cfg.firebase || {};
    KASHIER_CONFIG = Object.assign({ merchantId: '', mode: 'live', currency: 'EGP', hashEndpoint: '' }, cfg.kashier || {});
    KASHIER_CONFIG.merchantRedirect = window.location.origin + window.location.pathname + (cfg.kashier && cfg.kashier.merchantRedirectPath || '?kashier_callback=1');
    APP_CONFIG = Object.assign(APP_CONFIG, cfg.app || {});
    document.documentElement.style.setProperty('--brand-primary', APP_CONFIG.brandColorPrimary);
    document.documentElement.style.setProperty('--brand-primary-dark', APP_CONFIG.brandColorPrimaryDark);
  } catch (err) {
    console.warn('Could not load data/configs.json — falling back to safe defaults (Guest mode, EGP only).', err);
  }
}

function initFirebase() {
  try {
    const looksConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('YOUR_') !== 0;
    if (looksConfigured && typeof firebase !== 'undefined') {
      fbApp = firebase.initializeApp(firebaseConfig);
      fbAuth = firebase.auth();
      fbDB = firebase.database();
      try { fbStorage = firebase.storage(); } catch (e) { fbStorage = null; }
      fbEnabled = true;
      bindCatalog();
      bindTranslationAndSettingsOverlays();
      fbAuth.onAuthStateChanged(handleAuthChange);
    } else {
      fbEnabled = false;
      loadCatalogJson().then(refreshCatalogUI);
      setTimeout(() => handleAuthChange(null), 300);
    }
  } catch (err) {
    console.warn('Firebase init failed.', err);
    fbEnabled = false;
    loadCatalogJson().then(refreshCatalogUI);
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
  const profRef = fbDB.ref('users/' + uid + '/profile');
  const profCb = snap => {
    const val = snap.val() || {};
    if (val.photoURL) updateDrawerUser(document.getElementById('drawerName').textContent, document.getElementById('drawerEmail').textContent, val.photoURL);
  };
  profRef.on('value', profCb);
  userDataRefs.push({ ref: profRef, cb: profCb });
}

function bindCatalog() {
  loadCatalogJson().then(() => {
    refreshCatalogUI();
    if (!fbEnabled) return;
    ['hotels', 'excursions', 'transfers', 'restaurants', 'destinations', 'articles'].forEach(type => {
      fbDB.ref('admin_content/' + type).on('value', snap => {
        CATALOG_RAW[type] = mergeCatalogWithOverrides(JSON_BASELINE[type], snap.val());
        localizeCatalog(I18N.get());
        refreshCatalogUI();
      });
    });
  });
}

function bindTranslationAndSettingsOverlays() {
  SUPPORTED_LANGS.forEach(lang => {
    fbDB.ref('admin_content/translations/' + lang).on('value', snap => {
      const overrides = snap.val();
      if (!overrides) return;
      Object.keys(overrides).forEach(key => {
        if (!I18N_DICT[key]) I18N_DICT[key] = {};
        I18N_DICT[key][lang] = overrides[key];
      });
      I18N.set(I18N.get());
    });
  });
  fbDB.ref('admin_content/settings').on('value', snap => {
    const overrides = snap.val();
    if (!overrides) return;
    APP_CONFIG = Object.assign(APP_CONFIG, overrides);
    document.documentElement.style.setProperty('--brand-primary', APP_CONFIG.brandColorPrimary);
    document.documentElement.style.setProperty('--brand-primary-dark', APP_CONFIG.brandColorPrimaryDark);
    CurrencyAPI.applyAvailability();
  });
}

function refreshCatalogUI() {
  if (!document.getElementById('mainApp') || document.getElementById('mainApp').classList.contains('hidden')) return;
  // Hotels are loaded via API, not from catalog
  hotels.render();
  excursionsUi.render();
  transfersUi.render();
  destinationsUi.render();
  restaurantsUi.renderRow();
  restaurantsUi.renderFull();
  reviewsHomeUi.render();
  articlesUi.render();
  favorites.render();
  transferSearch.populateVehicles();
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

function onLanguageChanged(lang) {
  if (CATALOG_RAW.hotels.length || CATALOG_RAW.excursions.length || CATALOG_RAW.transfers.length) {
    localizeCatalog(lang);
    refreshCatalogUI();
  }
  if (typeof applyHeroContext === 'function' && document.getElementById('heroTitleText')) applyHeroContext(state.activeSearchTab || 'hotels');
  transferSearch.populateVehicles();
  const label = document.getElementById('tsPassengersLabel');
  if (label) {
    label.textContent = lang === 'ar' ? `${state.transferPax} أشخاص` : `${state.transferPax} People`;
  }
  flightSearch.updateDisplay();
}

// ==================== SKELETON LOADING ====================
const skeleton = {
  block(h) { return `<div class="skeleton-shimmer" style="height:${h}px;border-radius:16px;"></div>`; },
  row(count, w, h) { return Array.from({ length: count }).map(() => `<div class="skeleton-shimmer flex-shrink-0" style="width:${w}px;height:${h}px;border-radius:16px;"></div>`).join(''); },
  stack(count, h) { return Array.from({ length: count }).map(() => this.block(h)).join(''); },
  grid(count, h) { return `<div class="grid grid-cols-2 gap-3">${Array.from({ length: count }).map(() => this.block(h)).join('')}</div>`; },
  fillAll() {
    const fill = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    fill('destinationsRow', this.row(4, 144, 176));
    fill('featuredHotels', this.stack(2, 190));
    fill('featuredExcursions', this.row(3, 220, 250));
    fill('restaurantsRow', this.row(3, 210, 190));
    fill('reviewsRow', this.row(3, 260, 150));
    fill('articlesRow', this.stack(3, 96));
    fill('hotelsList', this.stack(4, 190));
    fill('excursionsList', this.stack(4, 170));
    fill('transfersList', this.stack(2, 210));
    fill('restaurantsFullList', this.grid(4, 190));
  }
};

// ==================== PAYMENT CALLBACK ====================
function parseKashierCallbackParams() {
  const p = new URLSearchParams(window.location.search);
  const orderId = p.get('orderId') || p.get('merchantOrderId') || '';
  const transactionId = p.get('transactionId') || p.get('paymentId') || orderId;
  const rawStatus = (p.get('paymentStatus') || p.get('status') || p.get('kashierOrderStatus') || '').toUpperCase();
  const success = ['SUCCESS', 'PAID', 'APPROVED'].some(s => rawStatus.includes(s));
  const failure = ['FAIL', 'DECLINE', 'ERROR', 'CANCEL'].some(s => rawStatus.includes(s));
  return { orderId, transactionId, rawStatus, success, failure };
}

function handlePaymentCallbackIfPresent() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('kashier_callback')) return false;
  const result = parseKashierCallbackParams();
  if (window.self !== window.top) {
    try {
      window.parent.postMessage({ event: result.failure ? 'kashier.paymentFailure' : 'kashier.paymentSuccess', orderId: result.orderId, transactionId: result.transactionId }, window.location.origin);
    } catch (e) { /* ignore */ }
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#171029;color:#fff;font-family:Inter,sans-serif;font-size:14px">Completing payment…</div>';
    return true;
  }
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0918;padding:24px;font-family:Inter,sans-serif;">
      <div style="max-width:420px;width:100%;background:#171029;border-radius:24px;padding:36px 28px;text-align:center;color:#fff;">
        <div style="width:64px;height:64px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;background:${result.failure ? 'rgba(239,68,68,.15)' : 'rgba(249,115,22,.15)'};font-size:28px;color:${result.failure ? '#ef4444' : '#f97316'}">
          <i class="fa-solid ${result.failure ? 'fa-circle-xmark' : 'fa-circle-check'}"></i>
        </div>
        <h1 style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin-bottom:8px;">${result.failure ? 'Payment Not Completed' : 'Payment Received'}</h1>
        <p style="font-size:13px;color:#8a8399;line-height:1.6;margin-bottom:6px;">${result.failure ? 'Your payment could not be completed. Please return to the app and try again, or choose Cash on Arrival.' : 'Thank you! Your payment was received. Open the app and check My Bookings — if it does not appear within a few minutes, contact support with your order ID below.'}</p>
        ${result.orderId ? `<p style="font-size:11px;color:#5c5570;margin-bottom:22px;">Order ID: ${result.orderId}</p>` : '<div style="margin-bottom:22px"></div>'}
        <a href="${window.location.origin + window.location.pathname}" style="display:inline-block;padding:14px 28px;border-radius:16px;background:linear-gradient(135deg,#fb923c,#c2410c);color:#fff;font-weight:700;font-size:14px;text-decoration:none;">Return to Discover Sharm</a>
      </div>
    </div>`;
  return true;
}

// ==================== INIT ====================
window.addEventListener('scroll', () => {
  const stickyHeader = document.getElementById('stickyHomeHeader');
  const homePage = document.getElementById('homePage');
  if (!stickyHeader || !homePage) return;
  const onHome = homePage.classList.contains('active');
  stickyHeader.classList.toggle('visible', onHome && window.scrollY > 210);
}, { passive: true });

document.addEventListener('DOMContentLoaded', async () => {
  if (handlePaymentCallbackIfPresent()) return;
  THEME.init();
  await loadI18nDict();
  I18N.init();
  utils.createStars('splashStars');
  populateCountryCodeSelect();
  populateNationalitySelect();
  search.switchTab('hotels');
  skeleton.fillAll();
  await loadAppConfig();
  CurrencyAPI.init().then(() => { refreshCatalogUI();
    bookings.render(); });
  initFirebase();
});

// Expose API globally for console debugging
window.API = API;
