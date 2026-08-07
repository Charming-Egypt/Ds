// ==========================================================================
// DISCOVER SHARM - Transfer Booking & Payment System
// tr-booking-system.js
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // STATE
  // ==========================================================================
  let refNumber = '';
  let currentStep = 0;
  let toastTimer = null;
  let pendingBooking = null;
  
  // Phone state
  let selectedCountryCode = '+20';
  let selectedCountryName = 'Egypt';
  let selectedCountryFlag = 'https://flagcdn.com/w40/eg.png';

  // Transfer specific state
  let transfer = null;
  let maxPassengers = 4;
  let availableVehicles = [];
  let isAirportTransfer = false;
  let transferId = '';

  // ==========================================================================
  // COUNTRIES DATA
  // ==========================================================================
  const countries = [
    { code: '+20', name: 'Egypt', flag: 'https://flagcdn.com/w40/eg.png' },
    { code: '+93', name: 'Afghanistan', flag: 'https://flagcdn.com/w40/af.png' },
    { code: '+355', name: 'Albania', flag: 'https://flagcdn.com/w40/al.png' },
    { code: '+213', name: 'Algeria', flag: 'https://flagcdn.com/w40/dz.png' },
    { code: '+376', name: 'Andorra', flag: 'https://flagcdn.com/w40/ad.png' },
    { code: '+244', name: 'Angola', flag: 'https://flagcdn.com/w40/ao.png' },
    { code: '+54', name: 'Argentina', flag: 'https://flagcdn.com/w40/ar.png' },
    { code: '+374', name: 'Armenia', flag: 'https://flagcdn.com/w40/am.png' },
    { code: '+61', name: 'Australia', flag: 'https://flagcdn.com/w40/au.png' },
    { code: '+43', name: 'Austria', flag: 'https://flagcdn.com/w40/at.png' },
    { code: '+994', name: 'Azerbaijan', flag: 'https://flagcdn.com/w40/az.png' },
    { code: '+973', name: 'Bahrain', flag: 'https://flagcdn.com/w40/bh.png' },
    { code: '+880', name: 'Bangladesh', flag: 'https://flagcdn.com/w40/bd.png' },
    { code: '+375', name: 'Belarus', flag: 'https://flagcdn.com/w40/by.png' },
    { code: '+32', name: 'Belgium', flag: 'https://flagcdn.com/w40/be.png' },
    { code: '+501', name: 'Belize', flag: 'https://flagcdn.com/w40/bz.png' },
    { code: '+229', name: 'Benin', flag: 'https://flagcdn.com/w40/bj.png' },
    { code: '+975', name: 'Bhutan', flag: 'https://flagcdn.com/w40/bt.png' },
    { code: '+591', name: 'Bolivia', flag: 'https://flagcdn.com/w40/bo.png' },
    { code: '+387', name: 'Bosnia and Herzegovina', flag: 'https://flagcdn.com/w40/ba.png' },
    { code: '+267', name: 'Botswana', flag: 'https://flagcdn.com/w40/bw.png' },
    { code: '+55', name: 'Brazil', flag: 'https://flagcdn.com/w40/br.png' },
    { code: '+673', name: 'Brunei', flag: 'https://flagcdn.com/w40/bn.png' },
    { code: '+359', name: 'Bulgaria', flag: 'https://flagcdn.com/w40/bg.png' },
    { code: '+226', name: 'Burkina Faso', flag: 'https://flagcdn.com/w40/bf.png' },
    { code: '+257', name: 'Burundi', flag: 'https://flagcdn.com/w40/bi.png' },
    { code: '+855', name: 'Cambodia', flag: 'https://flagcdn.com/w40/kh.png' },
    { code: '+237', name: 'Cameroon', flag: 'https://flagcdn.com/w40/cm.png' },
    { code: '+1', name: 'Canada', flag: 'https://flagcdn.com/w40/ca.png' },
    { code: '+238', name: 'Cape Verde', flag: 'https://flagcdn.com/w40/cv.png' },
    { code: '+236', name: 'Central African Republic', flag: 'https://flagcdn.com/w40/cf.png' },
    { code: '+235', name: 'Chad', flag: 'https://flagcdn.com/w40/td.png' },
    { code: '+56', name: 'Chile', flag: 'https://flagcdn.com/w40/cl.png' },
    { code: '+86', name: 'China', flag: 'https://flagcdn.com/w40/cn.png' },
    { code: '+57', name: 'Colombia', flag: 'https://flagcdn.com/w40/co.png' },
    { code: '+269', name: 'Comoros', flag: 'https://flagcdn.com/w40/km.png' },
    { code: '+242', name: 'Congo', flag: 'https://flagcdn.com/w40/cg.png' },
    { code: '+243', name: 'Congo (DRC)', flag: 'https://flagcdn.com/w40/cd.png' },
    { code: '+506', name: 'Costa Rica', flag: 'https://flagcdn.com/w40/cr.png' },
    { code: '+225', name: "Côte d'Ivoire", flag: 'https://flagcdn.com/w40/ci.png' },
    { code: '+385', name: 'Croatia', flag: 'https://flagcdn.com/w40/hr.png' },
    { code: '+53', name: 'Cuba', flag: 'https://flagcdn.com/w40/cu.png' },
    { code: '+357', name: 'Cyprus', flag: 'https://flagcdn.com/w40/cy.png' },
    { code: '+420', name: 'Czech Republic', flag: 'https://flagcdn.com/w40/cz.png' },
    { code: '+45', name: 'Denmark', flag: 'https://flagcdn.com/w40/dk.png' },
    { code: '+253', name: 'Djibouti', flag: 'https://flagcdn.com/w40/dj.png' },
    { code: '+593', name: 'Ecuador', flag: 'https://flagcdn.com/w40/ec.png' },
    { code: '+503', name: 'El Salvador', flag: 'https://flagcdn.com/w40/sv.png' },
    { code: '+240', name: 'Equatorial Guinea', flag: 'https://flagcdn.com/w40/gq.png' },
    { code: '+291', name: 'Eritrea', flag: 'https://flagcdn.com/w40/er.png' },
    { code: '+372', name: 'Estonia', flag: 'https://flagcdn.com/w40/ee.png' },
    { code: '+268', name: 'Eswatini', flag: 'https://flagcdn.com/w40/sz.png' },
    { code: '+251', name: 'Ethiopia', flag: 'https://flagcdn.com/w40/et.png' },
    { code: '+679', name: 'Fiji', flag: 'https://flagcdn.com/w40/fj.png' },
    { code: '+358', name: 'Finland', flag: 'https://flagcdn.com/w40/fi.png' },
    { code: '+33', name: 'France', flag: 'https://flagcdn.com/w40/fr.png' },
    { code: '+241', name: 'Gabon', flag: 'https://flagcdn.com/w40/ga.png' },
    { code: '+220', name: 'Gambia', flag: 'https://flagcdn.com/w40/gm.png' },
    { code: '+995', name: 'Georgia', flag: 'https://flagcdn.com/w40/ge.png' },
    { code: '+49', name: 'Germany', flag: 'https://flagcdn.com/w40/de.png' },
    { code: '+233', name: 'Ghana', flag: 'https://flagcdn.com/w40/gh.png' },
    { code: '+30', name: 'Greece', flag: 'https://flagcdn.com/w40/gr.png' },
    { code: '+502', name: 'Guatemala', flag: 'https://flagcdn.com/w40/gt.png' },
    { code: '+224', name: 'Guinea', flag: 'https://flagcdn.com/w40/gn.png' },
    { code: '+245', name: 'Guinea-Bissau', flag: 'https://flagcdn.com/w40/gw.png' },
    { code: '+592', name: 'Guyana', flag: 'https://flagcdn.com/w40/gy.png' },
    { code: '+509', name: 'Haiti', flag: 'https://flagcdn.com/w40/ht.png' },
    { code: '+504', name: 'Honduras', flag: 'https://flagcdn.com/w40/hn.png' },
    { code: '+36', name: 'Hungary', flag: 'https://flagcdn.com/w40/hu.png' },
    { code: '+354', name: 'Iceland', flag: 'https://flagcdn.com/w40/is.png' },
    { code: '+91', name: 'India', flag: 'https://flagcdn.com/w40/in.png' },
    { code: '+62', name: 'Indonesia', flag: 'https://flagcdn.com/w40/id.png' },
    { code: '+98', name: 'Iran', flag: 'https://flagcdn.com/w40/ir.png' },
    { code: '+964', name: 'Iraq', flag: 'https://flagcdn.com/w40/iq.png' },
    { code: '+353', name: 'Ireland', flag: 'https://flagcdn.com/w40/ie.png' },
    { code: '+972', name: 'Israel', flag: 'https://flagcdn.com/w40/il.png' },
    { code: '+39', name: 'Italy', flag: 'https://flagcdn.com/w40/it.png' },
    { code: '+1-876', name: 'Jamaica', flag: 'https://flagcdn.com/w40/jm.png' },
    { code: '+81', name: 'Japan', flag: 'https://flagcdn.com/w40/jp.png' },
    { code: '+962', name: 'Jordan', flag: 'https://flagcdn.com/w40/jo.png' },
    { code: '+7', name: 'Kazakhstan', flag: 'https://flagcdn.com/w40/kz.png' },
    { code: '+254', name: 'Kenya', flag: 'https://flagcdn.com/w40/ke.png' },
    { code: '+686', name: 'Kiribati', flag: 'https://flagcdn.com/w40/ki.png' },
    { code: '+383', name: 'Kosovo', flag: 'https://flagcdn.com/w40/xk.png' },
    { code: '+965', name: 'Kuwait', flag: 'https://flagcdn.com/w40/kw.png' },
    { code: '+996', name: 'Kyrgyzstan', flag: 'https://flagcdn.com/w40/kg.png' },
    { code: '+856', name: 'Laos', flag: 'https://flagcdn.com/w40/la.png' },
    { code: '+371', name: 'Latvia', flag: 'https://flagcdn.com/w40/lv.png' },
    { code: '+961', name: 'Lebanon', flag: 'https://flagcdn.com/w40/lb.png' },
    { code: '+266', name: 'Lesotho', flag: 'https://flagcdn.com/w40/ls.png' },
    { code: '+231', name: 'Liberia', flag: 'https://flagcdn.com/w40/lr.png' },
    { code: '+218', name: 'Libya', flag: 'https://flagcdn.com/w40/ly.png' },
    { code: '+423', name: 'Liechtenstein', flag: 'https://flagcdn.com/w40/li.png' },
    { code: '+370', name: 'Lithuania', flag: 'https://flagcdn.com/w40/lt.png' },
    { code: '+352', name: 'Luxembourg', flag: 'https://flagcdn.com/w40/lu.png' },
    { code: '+261', name: 'Madagascar', flag: 'https://flagcdn.com/w40/mg.png' },
    { code: '+265', name: 'Malawi', flag: 'https://flagcdn.com/w40/mw.png' },
    { code: '+60', name: 'Malaysia', flag: 'https://flagcdn.com/w40/my.png' },
    { code: '+960', name: 'Maldives', flag: 'https://flagcdn.com/w40/mv.png' },
    { code: '+223', name: 'Mali', flag: 'https://flagcdn.com/w40/ml.png' },
    { code: '+356', name: 'Malta', flag: 'https://flagcdn.com/w40/mt.png' },
    { code: '+692', name: 'Marshall Islands', flag: 'https://flagcdn.com/w40/mh.png' },
    { code: '+222', name: 'Mauritania', flag: 'https://flagcdn.com/w40/mr.png' },
    { code: '+230', name: 'Mauritius', flag: 'https://flagcdn.com/w40/mu.png' },
    { code: '+52', name: 'Mexico', flag: 'https://flagcdn.com/w40/mx.png' },
    { code: '+691', name: 'Micronesia', flag: 'https://flagcdn.com/w40/fm.png' },
    { code: '+373', name: 'Moldova', flag: 'https://flagcdn.com/w40/md.png' },
    { code: '+377', name: 'Monaco', flag: 'https://flagcdn.com/w40/mc.png' },
    { code: '+976', name: 'Mongolia', flag: 'https://flagcdn.com/w40/mn.png' },
    { code: '+382', name: 'Montenegro', flag: 'https://flagcdn.com/w40/me.png' },
    { code: '+212', name: 'Morocco', flag: 'https://flagcdn.com/w40/ma.png' },
    { code: '+258', name: 'Mozambique', flag: 'https://flagcdn.com/w40/mz.png' },
    { code: '+95', name: 'Myanmar', flag: 'https://flagcdn.com/w40/mm.png' },
    { code: '+264', name: 'Namibia', flag: 'https://flagcdn.com/w40/na.png' },
    { code: '+674', name: 'Nauru', flag: 'https://flagcdn.com/w40/nr.png' },
    { code: '+977', name: 'Nepal', flag: 'https://flagcdn.com/w40/np.png' },
    { code: '+31', name: 'Netherlands', flag: 'https://flagcdn.com/w40/nl.png' },
    { code: '+64', name: 'New Zealand', flag: 'https://flagcdn.com/w40/nz.png' },
    { code: '+505', name: 'Nicaragua', flag: 'https://flagcdn.com/w40/ni.png' },
    { code: '+227', name: 'Niger', flag: 'https://flagcdn.com/w40/ne.png' },
    { code: '+234', name: 'Nigeria', flag: 'https://flagcdn.com/w40/ng.png' },
    { code: '+850', name: 'North Korea', flag: 'https://flagcdn.com/w40/kp.png' },
    { code: '+389', name: 'North Macedonia', flag: 'https://flagcdn.com/w40/mk.png' },
    { code: '+47', name: 'Norway', flag: 'https://flagcdn.com/w40/no.png' },
    { code: '+968', name: 'Oman', flag: 'https://flagcdn.com/w40/om.png' },
    { code: '+92', name: 'Pakistan', flag: 'https://flagcdn.com/w40/pk.png' },
    { code: '+680', name: 'Palau', flag: 'https://flagcdn.com/w40/pw.png' },
    { code: '+970', name: 'Palestine', flag: 'https://flagcdn.com/w40/ps.png' },
    { code: '+507', name: 'Panama', flag: 'https://flagcdn.com/w40/pa.png' },
    { code: '+675', name: 'Papua New Guinea', flag: 'https://flagcdn.com/w40/pg.png' },
    { code: '+595', name: 'Paraguay', flag: 'https://flagcdn.com/w40/py.png' },
    { code: '+51', name: 'Peru', flag: 'https://flagcdn.com/w40/pe.png' },
    { code: '+63', name: 'Philippines', flag: 'https://flagcdn.com/w40/ph.png' },
    { code: '+48', name: 'Poland', flag: 'https://flagcdn.com/w40/pl.png' },
    { code: '+351', name: 'Portugal', flag: 'https://flagcdn.com/w40/pt.png' },
    { code: '+974', name: 'Qatar', flag: 'https://flagcdn.com/w40/qa.png' },
    { code: '+40', name: 'Romania', flag: 'https://flagcdn.com/w40/ro.png' },
    { code: '+7', name: 'Russia', flag: 'https://flagcdn.com/w40/ru.png' },
    { code: '+250', name: 'Rwanda', flag: 'https://flagcdn.com/w40/rw.png' },
    { code: '+685', name: 'Samoa', flag: 'https://flagcdn.com/w40/ws.png' },
    { code: '+378', name: 'San Marino', flag: 'https://flagcdn.com/w40/sm.png' },
    { code: '+966', name: 'Saudi Arabia', flag: 'https://flagcdn.com/w40/sa.png' },
    { code: '+221', name: 'Senegal', flag: 'https://flagcdn.com/w40/sn.png' },
    { code: '+381', name: 'Serbia', flag: 'https://flagcdn.com/w40/rs.png' },
    { code: '+248', name: 'Seychelles', flag: 'https://flagcdn.com/w40/sc.png' },
    { code: '+232', name: 'Sierra Leone', flag: 'https://flagcdn.com/w40/sl.png' },
    { code: '+65', name: 'Singapore', flag: 'https://flagcdn.com/w40/sg.png' },
    { code: '+421', name: 'Slovakia', flag: 'https://flagcdn.com/w40/sk.png' },
    { code: '+386', name: 'Slovenia', flag: 'https://flagcdn.com/w40/si.png' },
    { code: '+677', name: 'Solomon Islands', flag: 'https://flagcdn.com/w40/sb.png' },
    { code: '+252', name: 'Somalia', flag: 'https://flagcdn.com/w40/so.png' },
    { code: '+27', name: 'South Africa', flag: 'https://flagcdn.com/w40/za.png' },
    { code: '+82', name: 'South Korea', flag: 'https://flagcdn.com/w40/kr.png' },
    { code: '+211', name: 'South Sudan', flag: 'https://flagcdn.com/w40/ss.png' },
    { code: '+34', name: 'Spain', flag: 'https://flagcdn.com/w40/es.png' },
    { code: '+94', name: 'Sri Lanka', flag: 'https://flagcdn.com/w40/lk.png' },
    { code: '+249', name: 'Sudan', flag: 'https://flagcdn.com/w40/sd.png' },
    { code: '+597', name: 'Suriname', flag: 'https://flagcdn.com/w40/sr.png' },
    { code: '+46', name: 'Sweden', flag: 'https://flagcdn.com/w40/se.png' },
    { code: '+41', name: 'Switzerland', flag: 'https://flagcdn.com/w40/ch.png' },
    { code: '+963', name: 'Syria', flag: 'https://flagcdn.com/w40/sy.png' },
    { code: '+886', name: 'Taiwan', flag: 'https://flagcdn.com/w40/tw.png' },
    { code: '+992', name: 'Tajikistan', flag: 'https://flagcdn.com/w40/tj.png' },
    { code: '+255', name: 'Tanzania', flag: 'https://flagcdn.com/w40/tz.png' },
    { code: '+66', name: 'Thailand', flag: 'https://flagcdn.com/w40/th.png' },
    { code: '+670', name: 'Timor-Leste', flag: 'https://flagcdn.com/w40/tl.png' },
    { code: '+228', name: 'Togo', flag: 'https://flagcdn.com/w40/tg.png' },
    { code: '+676', name: 'Tonga', flag: 'https://flagcdn.com/w40/to.png' },
    { code: '+216', name: 'Tunisia', flag: 'https://flagcdn.com/w40/tn.png' },
    { code: '+90', name: 'Turkey', flag: 'https://flagcdn.com/w40/tr.png' },
    { code: '+993', name: 'Turkmenistan', flag: 'https://flagcdn.com/w40/tm.png' },
    { code: '+688', name: 'Tuvalu', flag: 'https://flagcdn.com/w40/tv.png' },
    { code: '+256', name: 'Uganda', flag: 'https://flagcdn.com/w40/ug.png' },
    { code: '+380', name: 'Ukraine', flag: 'https://flagcdn.com/w40/ua.png' },
    { code: '+971', name: 'United Arab Emirates', flag: 'https://flagcdn.com/w40/ae.png' },
    { code: '+44', name: 'United Kingdom', flag: 'https://flagcdn.com/w40/gb.png' },
    { code: '+1', name: 'United States', flag: 'https://flagcdn.com/w40/us.png' },
    { code: '+598', name: 'Uruguay', flag: 'https://flagcdn.com/w40/uy.png' },
    { code: '+998', name: 'Uzbekistan', flag: 'https://flagcdn.com/w40/uz.png' },
    { code: '+678', name: 'Vanuatu', flag: 'https://flagcdn.com/w40/vu.png' },
    { code: '+379', name: 'Vatican City', flag: 'https://flagcdn.com/w40/va.png' },
    { code: '+58', name: 'Venezuela', flag: 'https://flagcdn.com/w40/ve.png' },
    { code: '+84', name: 'Vietnam', flag: 'https://flagcdn.com/w40/vn.png' },
    { code: '+967', name: 'Yemen', flag: 'https://flagcdn.com/w40/ye.png' },
    { code: '+260', name: 'Zambia', flag: 'https://flagcdn.com/w40/zm.png' },
    { code: '+263', name: 'Zimbabwe', flag: 'https://flagcdn.com/w40/zw.png' },
  ];

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  function $(id) { return document.getElementById(id); }
  function toStr(v) { if (v === null || v === undefined) return ''; return String(v).trim(); }
  function clean(v) { return toStr(v).replace(/[<>]/g, ''); }
  function generateRef() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = 'TR-'; for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length)); return r; }
  
  function toast(msg, type) {
    if (toastTimer) clearTimeout(toastTimer);
    const old = document.querySelector('.bs-toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'bs-toast';
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#22c55e') + ';white-space:nowrap;opacity:1;transition:opacity 0.3s;';
    t.textContent = (type === 'error' ? '❌ ' : '✅ ') + msg;
    document.body.appendChild(t);
    toastTimer = setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { if (t.parentNode) t.remove(); }, 300); }, 3000);
  }

  function showFieldError(inputId, msg) {
    const existing = document.querySelector('.field-error[data-field="' + inputId + '"]'); if (existing) existing.remove();
    const input = $(inputId); if (!input) return;
    input.style.borderColor = '#ef4444';
    const error = document.createElement('div'); error.className = 'field-error'; error.setAttribute('data-field', inputId);
    error.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg;
    if (inputId === 'phone') { const pw = input.closest('.phone-input-wrapper'); if (pw) { pw.after(error); } else { input.closest('.input-group').appendChild(error); } }
    else { input.parentNode.appendChild(error); }
    input.addEventListener('input', function() { input.style.borderColor = ''; if (error.parentNode) error.remove(); }, { once: true });
  }

  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(e) { e.remove(); });
    document.querySelectorAll('.input-field, .phone-number-input').forEach(function(e) { e.style.borderColor = ''; });
  }

  function getPhoneNumber() { const pe = $('phone'); return selectedCountryCode + (pe ? toStr(pe.value) : ''); }

  // ==========================================================================
  // COUNTRY MODAL
  // ==========================================================================
  function createCountryModal() {
    const existing = document.getElementById('countryModal'); if (existing) existing.remove();
    const modal = document.createElement('div'); modal.id = 'countryModal'; modal.className = 'country-modal';
    modal.innerHTML = '<div class="country-modal-overlay"></div><div class="country-modal-container"><div class="country-modal-header"><h3>🌍 Select Country</h3><button class="country-modal-close" id="countryModalClose">&times;</button></div><input type="text" class="country-modal-search" id="countryModalSearch" placeholder="Search country..." /><div class="country-modal-list" id="countryModalList"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.country-modal-overlay').addEventListener('click', closeCountryModal);
    document.getElementById('countryModalClose').addEventListener('click', closeCountryModal);
    document.getElementById('countryModalSearch').addEventListener('input', function() { renderCountryList(this.value); });
  }
  function openCountryModal() { createCountryModal(); const m = document.getElementById('countryModal'); if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; renderCountryList(''); setTimeout(function() { const s = document.getElementById('countryModalSearch'); if (s) s.focus(); }, 300); } }
  function closeCountryModal() { const m = document.getElementById('countryModal'); if (m) m.style.display = 'none'; document.body.style.overflow = ''; }
  function renderCountryList(filter) {
    const list = document.getElementById('countryModalList'); if (!list) return;
    const filtered = filter ? countries.filter(function(c) { return c.name.toLowerCase().indexOf(filter.toLowerCase()) > -1 || c.code.indexOf(filter) > -1; }) : countries;
    list.innerHTML = '';
    filtered.forEach(function(c) { const d = document.createElement('div'); d.className = 'country-modal-item' + (c.code === selectedCountryCode ? ' selected' : ''); d.innerHTML = '<img src="' + c.flag + '" alt="' + c.name + '" class="country-modal-flag" /><span class="country-modal-name">' + c.name + '</span><span class="country-modal-code">' + c.code + '</span>'; d.addEventListener('click', function() { selectCountry(c); }); list.appendChild(d); });
  }
  function selectCountry(c) { selectedCountryCode = c.code; selectedCountryName = c.name; selectedCountryFlag = c.flag; const sc = document.getElementById('selectedCountry'); if (sc) { sc.querySelector('img').src = c.flag; sc.querySelector('span').textContent = c.code; } closeCountryModal(); }

  function parsePhoneNumber(fullPhone) {
    if (!fullPhone) return { code: '+20', number: '' };
    const ps = String(fullPhone).trim();
    const sorted = [...countries].sort(function(a, b) { return b.code.length - a.code.length; });
    for (let i = 0; i < sorted.length; i++) { if (ps.startsWith(sorted[i].code)) return { code: sorted[i].code, number: ps.substring(sorted[i].code.length) }; }
    return { code: '+20', number: ps };
  }

  // ==========================================================================
  // TRANSFER HELPERS
  // ==========================================================================
  function esc(s) { return s ? String(s).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]) : ''; }
  function toInt(n) { const num = Number(n); return isNaN(num) ? 0 : Math.floor(num); }
  function fmt(n) { return 'EGP ' + Math.floor(n).toLocaleString(); }
  
  function getVehicleName(v) {
    const names = {'car':'Private Car','minivan':'Mini Van','bus':'Bus','suv':'SUV','limousine':'Limousine'};
    return names[v] || v;
  }
  
  function getVehicleLabel(v) {
    const labels = {'car':'Car (1-4)','minivan':'Mini Van (1-8)','bus':'Bus (1-12)','suv':'SUV (1-6)','limousine':'Limousine (1-3)'};
    return labels[v] || v;
  }
  
  const VEHICLE_ICONS = {'car':'fa-car','minivan':'fa-van-shuttle','bus':'fa-bus','suv':'fa-truck','limousine':'fa-car-side'};

  // ==========================================================================
  // PRICE
  // ==========================================================================
  function updatePrice() {
    const basePrice = toInt(transfer?.price) || 800;
    const selectedVehicle = $('selectedVehicle').value || availableVehicles[0] || 'car';
    const vehicleMultipliers = {'car':1,'minivan':1.5,'bus':2.5,'suv':1.3,'limousine':1.8};
    let total = basePrice * (vehicleMultipliers[selectedVehicle] || 1);
    total = Math.round(total);
    
    $('tourPrice').textContent = fmt(total);
    $('tourPrice').setAttribute('data-price-egp', total);
    $('totalPriceDisplay').textContent = fmt(total);
    $('totalPriceDisplay').setAttribute('data-price-egp', total);
    $('transferPrice').value = total;
    
    if (window.SharmCurrency && window.SharmCurrency.update) {
      setTimeout(() => window.SharmCurrency.update(), 100);
    }
  }

  // ==========================================================================
  // BUILD OPTIONS
  // ==========================================================================
  function buildPassengerOptions() {
    const container = $('passengerSelector');
    if (!container) return;
    container.innerHTML = '';
    const currentPax = parseInt($('selectedPassengers').value) || 1;
    
    for (let i = 1; i <= maxPassengers; i++) {
      const chip = document.createElement('span');
      chip.className = 'option-chip' + (i === currentPax ? ' active' : '');
      chip.dataset.pax = i;
      chip.innerHTML = '<i class="fas fa-user"></i> ' + i;
      chip.addEventListener('click', function() {
        container.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        $('selectedPassengers').value = parseInt(this.dataset.pax);
      });
      container.appendChild(chip);
    }
  }
  
  function buildVehicleOptions() {
    const container = $('vehicleSelector');
    if (!container) return;
    container.innerHTML = '';
    const currentVehicle = $('selectedVehicle').value || availableVehicles[0] || 'car';
    
    availableVehicles.forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'option-chip' + (v === currentVehicle ? ' active' : '');
      chip.dataset.vehicle = v;
      chip.innerHTML = '<i class="fas ' + (VEHICLE_ICONS[v] || 'fa-car') + '"></i> ' + getVehicleLabel(v);
      chip.addEventListener('click', function() {
        container.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        $('selectedVehicle').value = this.dataset.vehicle;
        updatePrice();
      });
      container.appendChild(chip);
    });
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function updateSummary() {
    $('summaryRef').textContent = refNumber;
    $('summaryVehicle').textContent = getVehicleName($('selectedVehicle').value);
    $('summaryPassengers').textContent = ($('selectedPassengers').value || '1') + ' pax';
    
    const hotelName = $('hotelName').value || 'Your Hotel';
    const fromLoc = transfer?.from || 'Sharm Airport';
    const toLoc = transfer?.to || 'Destination';
    
    let routeText = '';
    if (fromLoc.toLowerCase().includes('airport') || fromLoc.toLowerCase().includes('مطار') || fromLoc.toLowerCase().includes('ssh')) {
      routeText = esc(fromLoc) + ' → ' + esc(hotelName);
    } else if (toLoc.toLowerCase().includes('airport') || toLoc.toLowerCase().includes('مطار') || toLoc.toLowerCase().includes('ssh')) {
      routeText = esc(hotelName) + ' → ' + esc(toLoc);
    } else {
      routeText = esc(fromLoc) + ' → ' + esc(toLoc);
    }
    
    $('summaryRoute').innerHTML = routeText;
    
    if (isAirportTransfer) {
      $('summaryFlight').textContent = ($('flightNumber').value || 'N/A');
      $('summaryTime').textContent = ($('flightTime').value || 'N/A');
      $('summaryTimeLine').querySelector('span').textContent = 'Arrival:';
    } else {
      $('summaryTime').textContent = ($('pickupTime').value || 'Flexible');
      $('summaryTimeLine').querySelector('span').textContent = 'Pickup:';
    }
    
    $('summaryDate').textContent = $('tripDate').value || '-';
    $('summaryHotel').textContent = hotelName;
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  function goToStep(n) {
    clearAllFieldErrors();
    document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
    const tgt = document.querySelector('.form-step[data-step="' + n + '"]'); if (tgt) tgt.classList.add('active');
    currentStep = n;
    const pb = $('progressBar'); if (pb) pb.style.width = ((n + 1) / 4 * 100) + '%';
    document.querySelectorAll('.steps-labels .step-label').forEach(function(l, i) { l.classList.toggle('active', i === n); });
    if (n === 3) updateSummary();
  }

  function validateStep1() {
    clearAllFieldErrors(); let valid = true;
    if (!toStr($('tripDate')?.value)) { showFieldError('tripDate', 'Please select a transfer date'); valid = false; }
    return valid;
  }
  
  function validateStep2() {
    clearAllFieldErrors(); let valid = true;
    if (!toStr($('username')?.value)) { showFieldError('username', 'Please enter your full name'); valid = false; }
    const em = toStr($('customerEmail')?.value); if (!em || em.indexOf('@') < 0 || em.indexOf('.') < 0) { showFieldError('customerEmail', 'Please enter a valid email address'); valid = false; }
    const phone = toStr($('phone')?.value); if (!phone || phone.length < 7) { showFieldError('phone', 'Please enter a valid phone number'); valid = false; }
    return valid;
  }
  
  function nextStep() { 
    if (currentStep === 0) { if (!validateStep1()) return; }
    if (currentStep === 1) { if (!validateStep2()) return; }
    if (currentStep === 2) { saveUserData(); updateSummary(); }
    if (currentStep < 3) goToStep(currentStep + 1); 
  }
  
  function prevStep() { if (currentStep > 0) goToStep(currentStep - 1); }

  // ==========================================================================
  // USER DATA
  // ==========================================================================
  function loadSavedUserData() {
    try {
      const saved = localStorage.getItem('userBookingInfo');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.name) $('username').value = data.name;
        if (data.email) $('customerEmail').value = data.email;
        if (data.phone) $('phone').value = data.phone;
        if (data.hotelName) $('hotelName').value = data.hotelName;
      }
    } catch(e) {}
  }
  
  function saveUserData() {
    const data = {
      name: $('username').value,
      email: $('customerEmail').value,
      phone: $('phone').value,
      hotelName: $('hotelName').value
    };
    try { localStorage.setItem('userBookingInfo', JSON.stringify(data)); } catch(e) {}
  }

  async function loadUserDataFromFirebase() {
    if (!auth?.currentUser) return;
    try {
      const snap = await db.ref('egy_user/' + auth.currentUser.uid).once('value');
      const d = snap.val(); if (!d) return;
      if (d.username) { const e = $('username'); if (e && !e.value) e.value = String(d.username); }
      if (d.email) { const e = $('customerEmail'); if (e && !e.value) e.value = String(d.email); }
      if (d.phone) { const parsed = parsePhoneNumber(String(d.phone).trim()); selectedCountryCode = parsed.code; const c = countries.find(function(x) { return x.code === parsed.code; }); if (c) { const sc = document.getElementById('selectedCountry'); if (sc) { sc.querySelector('img').src = c.flag; sc.querySelector('span').textContent = c.code; } } const pi = $('phone'); if (pi && !pi.value) pi.value = parsed.number; }
    } catch(e) {}
  }

  // ==========================================================================
  // PAYMENT IFRAME
  // ==========================================================================
  function showPaymentIframe(paymentUrl) {
    const container = document.querySelector('.tour-booking-container');
    if (!container) return;
    
    container.setAttribute('data-original-html', container.innerHTML);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100vh;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1e1e1e;border-bottom:1px solid #2e2e2e;flex-shrink:0;">
          <button id="paymentBackBtn" style="background:#2a2a2a;border:none;color:#fff;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <span style="color:#fff;font-size:14px;font-weight:600;">
            <i class="fas fa-lock" style="color:#f59e0b;margin-right:6px;"></i>Secure Payment
          </span>
          <span style="width:60px;"></span>
        </div>
        <div style="flex:1;background:#fff;min-height:500px;">
          <iframe src="${paymentUrl}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
        </div>
        <div style="text-align:center;padding:10px;background:#1e1e1e;border-top:1px solid #2e2e2e;flex-shrink:0;">
          <small style="color:#666;font-size:11px;">
            <i class="fas fa-shield-alt" style="color:#22c55e;margin-right:4px;"></i>Secured by Kashier
          </small>
        </div>
      </div>
    `;
    
    container.classList.add('payment-active');
    document.getElementById('paymentBackBtn').addEventListener('click', hidePaymentIframe);
  }

  function hidePaymentIframe() {
    const container = document.querySelector('.tour-booking-container');
    if (!container) return;
    
    const originalHTML = container.getAttribute('data-original-html');
    if (originalHTML) {
      container.innerHTML = originalHTML;
      container.classList.remove('payment-active');
      container.removeAttribute('data-original-html');
      currentStep = 0;
      goToStep(0);
      initEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ==========================================================================
  // SUBMIT
  // ==========================================================================
  async function submitBooking() {
    const spinner = $('spinner'); const submitBtn = $('submitBtn');
    if (spinner) spinner.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
      const total = parseInt($('transferPrice').value) || 0;
      if (!total || total <= 0) throw new Error('Invalid transfer price.');
      
      pendingBooking = {
        refNumber,
        transferId: transferId,
        from: transfer?.from || '',
        to: transfer?.to || '',
        hotelName: clean($('hotelName')?.value) || '',
        vehicle: $('selectedVehicle').value,
        passengers: parseInt($('selectedPassengers').value) || 1,
        price: total,
        isAirportTransfer: isAirportTransfer,
        flightNumber: isAirportTransfer ? clean($('flightNumber')?.value) : null,
        flightTime: isAirportTransfer ? clean($('flightTime')?.value) : null,
        pickupTime: !isAirportTransfer ? clean($('pickupTime')?.value) : null,
        customerName: clean($('username')?.value),
        email: clean($('customerEmail')?.value),
        phone: getPhoneNumber(),
        transferDate: clean($('tripDate')?.value),
        specialRequests: clean($('specialRequests')?.value),
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: Date.now()
      };
      
      sessionStorage.setItem('pendingTransferBooking', JSON.stringify(pendingBooking));
      sessionStorage.setItem('refNumber', refNumber);
      
      // Save to Firebase
      await db.ref('transfer-bookings/' + refNumber).set(pendingBooking);
      
      // Try Kashier payment
      const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          merchantId: 'MID-33260-3', 
          orderId: refNumber, 
          amount: total, 
          currency: 'EGP' 
        }) 
      });
      
      if (!resp.ok) throw new Error('Payment service unavailable.');
      const hashData = await resp.json();
      if (!hashData.hash) throw new Error('Payment verification failed.');
      
      const paymentStatusUrl = window.location.origin + '/p/payment-status.html';
      const redirectWithParams = paymentStatusUrl + '?ref=' + refNumber + '&type=transfer';
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3',
        orderId: refNumber,
        amount: total,
        currency: 'EGP',
        hash: hashData.hash,
        mode: 'live',
        merchantRedirect: redirectWithParams,
        failureRedirect: redirectWithParams,
        redirectMethod: 'get'
      }).toString();
      
      if (spinner) spinner.classList.add('hidden');
      showPaymentIframe(paymentUrl);
      
    } catch(e) {
      toast(e.message, 'error');
      if (spinner) spinner.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ==========================================================================
  // LOAD TRANSFER
  // ==========================================================================
  async function loadTransfer() {
    if (transferId) {
      try {
        const snap = await db.ref('Transfers/' + transferId).once('value');
        if (snap.exists()) {
          transfer = snap.val();
          transfer.id = transferId;
        }
      } catch(e) {}
    }
    
    maxPassengers = toInt(transfer?.passengers) || 4;
    
    if (transfer?.vehicle) {
      availableVehicles = [transfer.vehicle.toLowerCase().trim()];
    } else {
      availableVehicles = ['car', 'minivan', 'bus'];
    }
    
    $('selectedVehicle').value = availableVehicles[0] || 'car';
    $('selectedPassengers').value = 1;
    
    // Check airport transfer
    const from = (transfer?.from || '').toLowerCase();
    const to = (transfer?.to || '').toLowerCase();
    isAirportTransfer = from.includes('airport') || to.includes('airport') || 
                       from.includes('مطار') || to.includes('مطار') ||
                       from.includes('ssh') || to.includes('ssh');
    
    $('isAirportTransfer').value = isAirportTransfer;
    if ($('flightDetailsGroup')) $('flightDetailsGroup').style.display = isAirportTransfer ? 'block' : 'none';
    if ($('pickupTimeGroup')) $('pickupTimeGroup').style.display = isAirportTransfer ? 'none' : 'block';
    if ($('summaryFlightLine')) $('summaryFlightLine').style.display = isAirportTransfer ? 'flex' : 'none';
    if ($('summaryTimeLine')) $('summaryTimeLine').style.display = 'flex';
    
    buildPassengerOptions();
    buildVehicleOptions();
    loadSavedUserData();
    renderTransfer();
  }
  
  // ==========================================================================
// RENDER TRANSFER - أضف هذه الدالة في tr-booking-system.js
// ==========================================================================

function renderTransfer() {
    // Route display
    if ($('fromLocation')) $('fromLocation').textContent = transfer?.from || 'Sharm El Sheikh';
    if ($('toLocation')) $('toLocation').textContent = transfer?.to || 'Destination';
    
    // Description
    if (transfer?.description) {
        if ($('tourDescription')) $('tourDescription').innerHTML = transfer.description;
        if ($('descriptionContainer')) $('descriptionContainer').style.display = 'block';
    }
    
    // Quick info cards
    if ($('quickInfoCards')) {
        $('quickInfoCards').innerHTML = `
            <div class="info-card"><i class="fas fa-clock"></i><span>Duration</span><strong>${transfer?.duration || 'Flexible'}</strong></div>
            <div class="info-card"><i class="fas fa-users"></i><span>Max Passengers</span><strong>${maxPassengers}</strong></div>
            <div class="info-card"><i class="fas fa-car"></i><span>Vehicle</span><strong>${getVehicleName(availableVehicles[0])}</strong></div>
        `;
    }
    
    // Included items
    if ($('includedItems')) {
        $('includedItems').innerHTML = `
            <div class="included-item"><i class="fas fa-check-circle"></i> Private air-conditioned vehicle</div>
            <div class="included-item"><i class="fas fa-check-circle"></i> Professional driver</div>
            <div class="included-item"><i class="fas fa-check-circle"></i> Pickup & drop-off</div>
            <div class="included-item"><i class="fas fa-check-circle"></i> ${isAirportTransfer ? 'Flight monitoring' : 'Point-to-point service'}</div>
            <div class="included-item"><i class="fas fa-check-circle"></i> ${isAirportTransfer ? 'Meet & greet at airport' : 'Meet & greet at location'}</div>
        `;
    }
    
    // Not included
    if ($('notIncludedItems')) {
        $('notIncludedItems').innerHTML = `
            <div class="included-item" style="color:#ef4444;"><i class="fas fa-times-circle"></i> Tips for driver (optional)</div>
            <div class="included-item" style="color:#ef4444;"><i class="fas fa-times-circle"></i> Extra stops not in route</div>
        `;
    }
    
    // Gallery/Swiper
    const images = transfer?.images || [transfer?.image || 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6'];
    const imgArray = Array.isArray(images) ? images : [images];
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    if (swiperWrapper) {
        swiperWrapper.innerHTML = imgArray.map(img => 
            `<div class="swiper-slide"><img src="${img}" alt="Transfer" onerror="this.src='https://images.unsplash.com/photo-1596394516093-501ba68a0ba6'" style="height:350px;object-fit:cover;"></div>`
        ).join('');
        
        if (typeof Swiper !== 'undefined') {
            new Swiper('.swiper', {
                slidesPerView: 1, spaceBetween: 10, loop: true,
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
            });
        }
    }
    
    updatePrice();
}

  // ==========================================================================
  // EVENT BINDING
  // ==========================================================================
  function initEvents() {
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    const sb = $('submitBtn'); if (sb) sb.onclick = submitBooking;
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function init() {
    const urlParams = new URLSearchParams(window.location.search);
    transferId = urlParams.get('id') || '';
    
    refNumber = generateRef();
    
    const ccs = $('countryCodeSelect');
    if (ccs) { ccs.addEventListener('click', function(e) { e.stopPropagation(); openCountryModal(); }); }
    
    const de = document.querySelector('#tripDate');
    if (de && typeof flatpickr !== 'undefined') {
      flatpickr(de, { minDate: new Date().fp_incr(1), dateFormat: 'Y-m-d', disableMobile: true });
    }
    
    initEvents();
    
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeCountryModal(); } });
    
    loadTransfer();
    
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged(function(user) { if (user) setTimeout(loadUserDataFromFirebase, 500); });
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  window.TransferBookingSystem = { init, nextStep, prevStep, submit: submitBooking, getRef: function() { return refNumber; }, getPhone: getPhoneNumber };

  function tryInit() {
    if (typeof db === 'undefined') { setTimeout(tryInit, 500); return; }
    init();
  }
  setTimeout(tryInit, 800);

})();
