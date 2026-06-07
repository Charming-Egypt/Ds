// ==========================================================================
// DISCOVER SHARM - Booking & Payment System
// Complete Final Version
// Payment inside card via iframe
// Booking saved ONLY after successful payment
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // STATE
  // ==========================================================================
  let refNumber = '';
  let selectedTripType = '';
  let currentStep = 0;
  let toastTimer = null;
  let pendingBooking = null;
  let paymentPollingInterval = null;
  
  // Phone state
  let selectedCountryCode = '+20';
  let selectedCountryName = 'Egypt';
  let selectedCountryFlag = 'https://flagcdn.com/w40/eg.png';

  // ==========================================================================
  // COUNTRIES DATA
  // ==========================================================================
  const countries = [
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
    { code: '+20', name: 'Egypt', flag: 'https://flagcdn.com/w40/eg.png' },
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
    { code: '+239', name: 'São Tomé and Príncipe', flag: 'https://flagcdn.com/w40/st.png' },
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
  function generateRef() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = 'DS-'; for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length)); return r; }
  
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
  // TRIP DATA
  // ==========================================================================
  function getTrip() { try { return (window.tripModule?.getCurrentTrip?.()) || {}; } catch(e) { return {}; } }
  function getTourTypes() { try { return (window.tripModule?.getTourTypes?.()) || {}; } catch(e) { return {}; } }
  function getOwnerId() { try { return toStr(window.tripModule?.getTripOwnerId?.()); } catch(e) { return ''; } }
  function getTripId() { try { return toStr(window.tripModule?.getTripPName?.()); } catch(e) { return ''; } }
  function fmtPrice(p) { try { return window.tripModule?.formatPrice?.(p) || (parseFloat(p)||0).toFixed(2) + ' EGP'; } catch(e) { return (parseFloat(p)||0).toFixed(2) + ' EGP'; } }

  // ==========================================================================
  // GUEST COUNTERS
  // ==========================================================================
  function gv(id) { const e = $(id); if (!e) return 0; const v = parseInt(e.value); return isNaN(v) ? 0 : v; }
  function adults() { return gv('adults'); }
  function children() { return gv('childrenUnder12'); }
  function infants() { return gv('infants'); }

  // ==========================================================================
  // PRICE
  // ==========================================================================
  function calcBase() { const t = getTrip(); const bp = parseFloat(t.basePrice) || 0; if (!bp) return 0; const cp = parseFloat(t.cprice) || bp * 0.5; return parseFloat(((adults() * bp) + (children() * cp)).toFixed(2)); }
  function calcExtra() { const tt = getTourTypes(); if (selectedTripType && tt[selectedTripType]) { return parseFloat(((adults() + children()) * parseFloat(tt[selectedTripType])).toFixed(2)); } return 0; }
  function calcNet() { return parseFloat((calcBase() + calcExtra()).toFixed(2)); }
  function calcTax() { const n = calcNet(); return parseFloat((n * 0.03 + n * 0.03 * 0.14 + 3).toFixed(2)); }
  function calcTotal() { return parseFloat((calcNet() + calcTax()).toFixed(2)); }

  // ==========================================================================
  // STEPPER
  // ==========================================================================
  function stepper(id, delta) { const inp = $(id); if (!inp) return; let v = parseInt(inp.value) || 0; const max = id === 'infants' ? 2 : 10; const min = id === 'adults' ? 1 : 0; v = Math.max(min, Math.min(max, v + delta)); inp.value = v; if (currentStep === 3) updateSummary(); }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function setText(id, val) { const e = $(id); if (e) e.textContent = toStr(val); }
  function updateSummary() {
    setText('summaryRef', refNumber); setText('summaryTour', getTrip().name || '-'); setText('summaryDate', $('tripDate')?.value || '-'); setText('summaryHotel', clean($('hotelName')?.value) || '-'); setText('summaryRoom', clean($('roomNumber')?.value) || '-');
    setText('summaryAdults', adults() + ' Adult' + (adults() !== 1 ? 's' : '')); setText('summaryChildrenUnder12', children() + ' Child' + (children() !== 1 ? 'ren' : '')); setText('summaryInfants', infants() + ' Infant' + (infants() !== 1 ? 's' : '')); setText('summaryService', selectedTripType || 'None');
    const td = $('totalPriceDisplay');
    if (td && getTrip().basePrice) { td.innerHTML = fmtPrice(calcNet()) + '<div style="font-size:11px;color:#a0a0a0;margin-top:8px;"><div style="display:flex;justify-content:space-between;border-top:1px solid #3a3a3a;padding-top:4px;"><span>+ Taxes:</span><span>' + fmtPrice(calcTax()) + '</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #f59e0b;padding-top:4px;color:#f59e0b;font-weight:700;"><span>Total:</span><span>' + fmtPrice(calcTotal()) + '</span></div></div>'; }
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
    if (!toStr($('username')?.value)) { showFieldError('username', 'Please enter your full name'); valid = false; }
    const em = toStr($('customerEmail')?.value); if (!em || em.indexOf('@') < 0 || em.indexOf('.') < 0) { showFieldError('customerEmail', 'Please enter a valid email address'); valid = false; }
    const phone = toStr($('phone')?.value); if (!phone || phone.length < 7) { showFieldError('phone', 'Please enter a valid phone number'); valid = false; }
    return valid;
  }
  function validateStep2() {
    clearAllFieldErrors(); let valid = true;
    if (!toStr($('tripDate')?.value)) { showFieldError('tripDate', 'Please select a date for your trip'); valid = false; }
    if (!toStr($('hotelName')?.value)) { showFieldError('hotelName', 'Please enter your hotel name'); valid = false; }
    if (!toStr($('roomNumber')?.value)) { showFieldError('roomNumber', 'Please enter your room number'); valid = false; }
    return valid;
  }
  function nextStep() { if (currentStep === 0 && !validateStep1()) return; if (currentStep === 1 && !validateStep2()) return; if (currentStep < 3) goToStep(currentStep + 1); }
  function prevStep() { if (currentStep > 0) goToStep(currentStep - 1); }

  // ==========================================================================
  // SERVICES POPUP
  // ==========================================================================
  let tempService = '';
  function openServicesPopup() {
    const popup = $('extraServicesPopup'), content = $('servicesPopupContent'); if (!popup || !content) return;
    tempService = selectedTripType; content.innerHTML = '';
    const nd = document.createElement('div'); nd.className = 'service-option' + (!tempService ? ' selected' : ''); nd.innerHTML = '<div class="service-option-info"><div class="service-option-name">No extra services</div><div class="service-option-price">Free</div></div><div class="service-option-check"></div>';
    nd.onclick = function() { tempService = ''; content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); }); nd.classList.add('selected'); }; content.appendChild(nd);
    const types = getTourTypes();
    Object.keys(types || {}).forEach(function(key) { const d = document.createElement('div'); d.className = 'service-option' + (tempService === key ? ' selected' : ''); d.innerHTML = '<div class="service-option-info"><div class="service-option-name">' + key + '</div><div class="service-option-price">' + fmtPrice(types[key]) + ' per person</div></div><div class="service-option-check"></div>'; d.onclick = function() { tempService = key; content.querySelectorAll('.service-option').forEach(function(o) { o.classList.remove('selected'); }); d.classList.add('selected'); }; content.appendChild(d); });
    popup.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  }
  function confirmService() { selectedTripType = tempService; const tt = $('tripType'); if (tt) tt.value = selectedTripType; const st = $('selectedServiceText'); if (st) st.textContent = selectedTripType || 'No extra services'; closeServicesPopup(); updateSummary(); }
  function closeServicesPopup() { const popup = $('extraServicesPopup'); if (popup) popup.classList.add('hidden'); document.body.style.overflow = ''; }

  // ==========================================================================
  // PAYMENT IFRAME
  // ==========================================================================
  function showPaymentIframe(paymentUrl) {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    
    const originalContent = bookingCard.innerHTML;
    bookingCard.setAttribute('data-original-content', originalContent);
    bookingCard.classList.add('payment-mode');
    
    bookingCard.innerHTML = `
      <div class="payment-iframe-container">
        <div class="payment-iframe-header">
          <h3><i class="fas fa-lock"></i> Secure Payment</h3>
          <p>Complete your payment to confirm booking</p>
          <button class="payment-back-btn" id="paymentBackBtn"><i class="fas fa-arrow-left"></i> Back</button>
        </div>
        <div class="payment-iframe-wrapper">
          <iframe src="${paymentUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <div class="payment-iframe-footer">
          <small><i class="fas fa-shield-alt"></i> Secured by Kashier</small>
        </div>
      </div>
    `;
    
    document.getElementById('paymentBackBtn').addEventListener('click', hidePaymentIframe);
    window.addEventListener('message', handlePaymentMessage);
  }

  function hidePaymentIframe() {
    stopPaymentPolling();
    window.removeEventListener('message', handlePaymentMessage);
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    const originalContent = bookingCard.getAttribute('data-original-content');
    if (originalContent) { bookingCard.innerHTML = originalContent; bookingCard.classList.remove('payment-mode'); bookingCard.removeAttribute('data-original-content'); initEvents(); }
  }

  function handlePaymentMessage(event) {
    if (!event.data || event.data.type !== 'payment_complete') return;
    const { status, refNumber: paymentRef } = event.data;
    if (paymentRef && paymentRef !== refNumber) refNumber = paymentRef;
    window.removeEventListener('message', handlePaymentMessage);
    stopPaymentPolling();
    
    if (status === 'success') {
      showPaymentSuccess();
    } else if (status === 'failed') {
      showPaymentFailed();
    } else {
      startPaymentPolling();
    }
  }

  // في booking-system.js - عدل startPaymentPolling
function startPaymentPolling() {
    if (paymentPollingInterval) clearInterval(paymentPollingInterval);
    paymentPollingInterval = setInterval(async function() {
      try {
        const snap = await db.ref('trip-bookings/' + refNumber).once('value');
        const booking = snap.val();
        if (booking && booking.paymentStatus === 'paid') { 
          stopPaymentPolling(); 
          showPaymentSuccess(); // بس يعرض النجاح، ما يبعتش إشعار
        }
        else if (booking && booking.paymentStatus === 'failed') { 
          stopPaymentPolling(); 
          showPaymentFailed(); 
        }
      } catch(e) {}
    }, 3000);
}

  function stopPaymentPolling() { if (paymentPollingInterval) { clearInterval(paymentPollingInterval); paymentPollingInterval = null; } }

  function showPaymentSuccess() {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    bookingCard.classList.add('payment-mode');
    bookingCard.innerHTML = `
      <div class="payment-status-container">
        <div class="payment-status-icon success"><i class="fas fa-check-circle"></i></div>
        <h2 class="payment-status-title">Payment Successful! 🎉</h2>
        <p class="payment-status-message">Your booking has been confirmed.</p>
        <div class="payment-status-details"><div class="payment-status-line"><span>Booking Ref:</span><strong>${refNumber}</strong></div></div>
        <button class="btn-primary" onclick="location.reload()"><i class="fas fa-check"></i> Done</button>
      </div>
    `;
  }

  function showPaymentFailed() {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) return;
    bookingCard.classList.add('payment-mode');
    bookingCard.innerHTML = `
      <div class="payment-status-container">
        <div class="payment-status-icon failed"><i class="fas fa-times-circle"></i></div>
        <h2 class="payment-status-title">Payment Failed</h2>
        <p class="payment-status-message">Your payment could not be processed.</p>
        <button class="btn-primary" id="retryPaymentBtn" style="margin-bottom:10px;"><i class="fas fa-redo"></i> Try Again</button>
        <button class="btn-secondary" id="backToFormBtn"><i class="fas fa-arrow-left"></i> Edit Details</button>
      </div>
    `;
    document.getElementById('retryPaymentBtn').addEventListener('click', function() { submitBooking(); });
    document.getElementById('backToFormBtn').addEventListener('click', hidePaymentIframe);
  }

  // ==========================================================================
  // SUBMIT
  // ==========================================================================
  async function submitBooking() {
    const spinner = $('spinner'); const submitBtn = $('submitBtn');
    if (spinner) spinner.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
      if (typeof auth === 'undefined') throw new Error('Authentication not loaded.');
      if (!auth.currentUser) throw new Error('Please sign in.');
      
      const user = auth.currentUser, trip = getTrip(), tripId = getTripId() || (new URLSearchParams(location.search).get('trip-id') || ''), ownerId = getOwnerId();
      const phone = getPhoneNumber(), net = calcNet(), tax = calcTax(), total = calcTotal();
      
      pendingBooking = {
        refNumber, username: clean($('username')?.value), email: clean($('customerEmail')?.value),
        phone, tour: toStr(trip.name), tripId, tripDate: toStr($('tripDate')?.value),
        adults: adults(), childrenUnder12: children(), infants: infants(),
        hotelName: clean($('hotelName')?.value), roomNumber: clean($('roomNumber')?.value),
        baseTotal: calcBase(), extraServicesTotal: calcExtra(), netTotal: net, total, taxes: tax,
        extraServices: selectedTripType || 'None',
        status: 'pending', resStatus: 'new', isPaid: false, paymentStatus: 'unpaid',
        uid: user.uid, owner: ownerId || user.uid, createdAt: Date.now(), updatedAt: Date.now()
      };
      
      sessionStorage.setItem('pendingBooking', JSON.stringify(pendingBooking));
      sessionStorage.setItem('refNumber', refNumber);
      
      const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP' }) });
      if (!resp.ok) throw new Error('Payment service unavailable.');
      const hashData = await resp.json();
      if (!hashData.hash) throw new Error('Payment verification failed.');
      
      const paymentStatusUrl = window.location.origin + '/app/payment-status.html';
      const redirectWithParams = paymentStatusUrl + '?ref=' + refNumber + '&tripId=' + tripId;
      
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP',
        hash: hashData.hash, mode: 'live',
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
  // LOAD USER DATA
  // ==========================================================================
  async function loadUserData() {
    if (!auth?.currentUser) return;
    try {
      const snap = await db.ref('egy_user/' + auth.currentUser.uid).once('value'), d = snap.val(); if (!d) return;
      if (d.username) { const e = $('username'); if (e) e.value = String(d.username); }
      if (d.email) { const e = $('customerEmail'); if (e) e.value = String(d.email); }
      if (d.phone) { const parsed = parsePhoneNumber(String(d.phone).trim()); selectedCountryCode = parsed.code; const c = countries.find(function(x) { return x.code === parsed.code; }); if (c) { const sc = document.getElementById('selectedCountry'); if (sc) { sc.querySelector('img').src = c.flag; sc.querySelector('span').textContent = c.code; } } const pi = $('phone'); if (pi) pi.value = parsed.number; }
    } catch(e) {}
  }

  // ==========================================================================
  // EVENT BINDING
  // ==========================================================================
  function initEvents() {
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    document.querySelectorAll('[data-stepper]').forEach(function(b) { b.onclick = function() { stepper(this.getAttribute('data-stepper'), parseInt(this.getAttribute('data-delta'))); }; });
    const sb = $('submitBtn'); if (sb) sb.onclick = submitBooking;
    const sv = $('openServicesBtn'); if (sv) sv.onclick = openServicesPopup;
    const cb = $('confirmServicesBtn'); if (cb) cb.onclick = confirmService;
    const cl = $('cancelServicesBtn'); if (cl) cl.onclick = closeServicesPopup;
    document.querySelectorAll('#extraServicesPopup .close-popup-btn').forEach(function(b) { b.onclick = closeServicesPopup; });
    const ov = document.querySelector('#extraServicesPopup .services-popup-overlay'); if (ov) ov.onclick = closeServicesPopup;
  }

  // ==========================================================================
// INIT
// ==========================================================================
function init() {
    const tripId = getTripId() || (new URLSearchParams(location.search).get('trip-id') || '');
    if (!tripId) { toast('No trip specified', 'error'); return; }
    refNumber = generateRef();
    
    const trip = getTrip(); 
    const tn = $('tripName'); 
    if (tn && trip.name) tn.value = String(trip.name);
    
    // Country selector - open modal on click
    const ccs = $('countryCodeSelect'); 
    if (ccs) { 
        ccs.addEventListener('click', function(e) { 
            e.stopPropagation(); 
            openCountryModal(); 
        }); 
    }
    
    // Date picker
    const de = document.querySelector('#tripDate'); 
    if (de && typeof flatpickr !== 'undefined') { 
        flatpickr(de, { 
            minDate: new Date().fp_incr(1), 
            dateFormat: 'Y-m-d', 
            disableMobile: true 
        }); 
    }
    
    // Bind all events
    initEvents();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) { 
        if (e.key === 'Escape') { 
            closeServicesPopup(); 
            closeCountryModal(); 
        } 
    });
    
    // Auth state listener
    auth.onAuthStateChanged(function(user) { 
        if (user) setTimeout(loadUserData, 500); 
    });
    
    // Initial summary update
    setTimeout(updateSummary, 1500);
    
    // Check if returning from payment page
    checkPaymentOnReturn();
}

// ==========================================================================
// CHECK PAYMENT ON RETURN
// ==========================================================================
function checkPaymentOnReturn() {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment');
    const paymentRef = params.get('ref');
    
    if (!paymentStatus || !paymentRef) return;
    
    console.log('🔙 Returning from payment:', paymentStatus, paymentRef);
    
    // Update ref number
    refNumber = paymentRef;
    
    if (paymentStatus === 'success') {
        // Show success after short delay (wait for DOM)
        setTimeout(function() {
            showPaymentSuccess();
        }, 800);
    } else if (paymentStatus === 'failed') {
        // Show failed
        setTimeout(function() {
            showPaymentFailed();
        }, 800);
    }
    
    // Clean URL (remove payment params)
    const tripId = getTripId();
    if (tripId) {
        window.history.replaceState({}, document.title, window.location.pathname + '?trip-id=' + tripId);
    } else {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

  window.BookingSystem = { init, nextStep, prevStep, stepper, openServices: openServicesPopup, closeServices: closeServicesPopup, confirmService, submit: submitBooking, updateSummary, getRef: function() { return refNumber; }, getPhone: getPhoneNumber };

  function tryInit() { if (typeof auth === 'undefined' || typeof db === 'undefined') { setTimeout(tryInit, 500); return; } init(); }
  setTimeout(tryInit, 800);

})();
