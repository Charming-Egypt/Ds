// ==========================================================================
// DISCOVER SHARM - Transfer Booking & Payment System
// tr-booking-system.js - COMPLETE WORKING VERSION
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
  
  let selectedCountryCode = '+20';
  let selectedCountryName = 'Egypt';
  let selectedCountryFlag = 'https://flagcdn.com/w40/eg.png';

  let transfer = null;
  let maxPassengers = 4;
  let availableVehicles = [];
  let isAirportTransfer = false;
  let transferId = '';

  // ==========================================================================
  // COUNTRIES
  // ==========================================================================
  const countries = [
    { code: '+20', name: 'Egypt', flag: 'https://flagcdn.com/w40/eg.png' },
    { code: '+966', name: 'Saudi Arabia', flag: 'https://flagcdn.com/w40/sa.png' },
    { code: '+971', name: 'UAE', flag: 'https://flagcdn.com/w40/ae.png' },
    { code: '+44', name: 'United Kingdom', flag: 'https://flagcdn.com/w40/gb.png' },
    { code: '+1', name: 'United States', flag: 'https://flagcdn.com/w40/us.png' },
    { code: '+49', name: 'Germany', flag: 'https://flagcdn.com/w40/de.png' },
    { code: '+33', name: 'France', flag: 'https://flagcdn.com/w40/fr.png' },
    { code: '+39', name: 'Italy', flag: 'https://flagcdn.com/w40/it.png' },
    { code: '+34', name: 'Spain', flag: 'https://flagcdn.com/w40/es.png' },
    { code: '+7', name: 'Russia', flag: 'https://flagcdn.com/w40/ru.png' },
    { code: '+90', name: 'Turkey', flag: 'https://flagcdn.com/w40/tr.png' },
    { code: '+961', name: 'Lebanon', flag: 'https://flagcdn.com/w40/lb.png' },
    { code: '+962', name: 'Jordan', flag: 'https://flagcdn.com/w40/jo.png' },
    { code: '+973', name: 'Bahrain', flag: 'https://flagcdn.com/w40/bh.png' },
    { code: '+974', name: 'Qatar', flag: 'https://flagcdn.com/w40/qa.png' },
    { code: '+965', name: 'Kuwait', flag: 'https://flagcdn.com/w40/kw.png' },
    { code: '+968', name: 'Oman', flag: 'https://flagcdn.com/w40/om.png' },
    { code: '+81', name: 'Japan', flag: 'https://flagcdn.com/w40/jp.png' },
    { code: '+86', name: 'China', flag: 'https://flagcdn.com/w40/cn.png' },
    { code: '+91', name: 'India', flag: 'https://flagcdn.com/w40/in.png' },
    { code: '+61', name: 'Australia', flag: 'https://flagcdn.com/w40/au.png' },
    { code: '+55', name: 'Brazil', flag: 'https://flagcdn.com/w40/br.png' },
    { code: '+52', name: 'Mexico', flag: 'https://flagcdn.com/w40/mx.png' },
    { code: '+31', name: 'Netherlands', flag: 'https://flagcdn.com/w40/nl.png' },
    { code: '+46', name: 'Sweden', flag: 'https://flagcdn.com/w40/se.png' },
    { code: '+47', name: 'Norway', flag: 'https://flagcdn.com/w40/no.png' },
    { code: '+45', name: 'Denmark', flag: 'https://flagcdn.com/w40/dk.png' },
    { code: '+358', name: 'Finland', flag: 'https://flagcdn.com/w40/fi.png' },
    { code: '+48', name: 'Poland', flag: 'https://flagcdn.com/w40/pl.png' },
    { code: '+380', name: 'Ukraine', flag: 'https://flagcdn.com/w40/ua.png' },
    { code: '+30', name: 'Greece', flag: 'https://flagcdn.com/w40/gr.png' },
    { code: '+40', name: 'Romania', flag: 'https://flagcdn.com/w40/ro.png' },
    { code: '+36', name: 'Hungary', flag: 'https://flagcdn.com/w40/hu.png' },
    { code: '+420', name: 'Czech Republic', flag: 'https://flagcdn.com/w40/cz.png' },
    { code: '+421', name: 'Slovakia', flag: 'https://flagcdn.com/w40/sk.png' },
    { code: '+43', name: 'Austria', flag: 'https://flagcdn.com/w40/at.png' },
    { code: '+41', name: 'Switzerland', flag: 'https://flagcdn.com/w40/ch.png' },
    { code: '+32', name: 'Belgium', flag: 'https://flagcdn.com/w40/be.png' },
    { code: '+351', name: 'Portugal', flag: 'https://flagcdn.com/w40/pt.png' },
    { code: '+353', name: 'Ireland', flag: 'https://flagcdn.com/w40/ie.png' },
    { code: '+354', name: 'Iceland', flag: 'https://flagcdn.com/w40/is.png' },
    { code: '+385', name: 'Croatia', flag: 'https://flagcdn.com/w40/hr.png' },
    { code: '+386', name: 'Slovenia', flag: 'https://flagcdn.com/w40/si.png' },
    { code: '+381', name: 'Serbia', flag: 'https://flagcdn.com/w40/rs.png' },
    { code: '+382', name: 'Montenegro', flag: 'https://flagcdn.com/w40/me.png' },
    { code: '+387', name: 'Bosnia', flag: 'https://flagcdn.com/w40/ba.png' },
    { code: '+389', name: 'North Macedonia', flag: 'https://flagcdn.com/w40/mk.png' },
    { code: '+355', name: 'Albania', flag: 'https://flagcdn.com/w40/al.png' },
    { code: '+359', name: 'Bulgaria', flag: 'https://flagcdn.com/w40/bg.png' },
    { code: '+370', name: 'Lithuania', flag: 'https://flagcdn.com/w40/lt.png' },
    { code: '+371', name: 'Latvia', flag: 'https://flagcdn.com/w40/lv.png' },
    { code: '+372', name: 'Estonia', flag: 'https://flagcdn.com/w40/ee.png' },
    { code: '+375', name: 'Belarus', flag: 'https://flagcdn.com/w40/by.png' },
    { code: '+373', name: 'Moldova', flag: 'https://flagcdn.com/w40/md.png' },
    { code: '+374', name: 'Armenia', flag: 'https://flagcdn.com/w40/am.png' },
    { code: '+994', name: 'Azerbaijan', flag: 'https://flagcdn.com/w40/az.png' },
    { code: '+995', name: 'Georgia', flag: 'https://flagcdn.com/w40/ge.png' },
    { code: '+7', name: 'Kazakhstan', flag: 'https://flagcdn.com/w40/kz.png' },
    { code: '+998', name: 'Uzbekistan', flag: 'https://flagcdn.com/w40/uz.png' },
    { code: '+993', name: 'Turkmenistan', flag: 'https://flagcdn.com/w40/tm.png' },
    { code: '+996', name: 'Kyrgyzstan', flag: 'https://flagcdn.com/w40/kg.png' },
    { code: '+992', name: 'Tajikistan', flag: 'https://flagcdn.com/w40/tj.png' },
    { code: '+98', name: 'Iran', flag: 'https://flagcdn.com/w40/ir.png' },
    { code: '+964', name: 'Iraq', flag: 'https://flagcdn.com/w40/iq.png' },
    { code: '+963', name: 'Syria', flag: 'https://flagcdn.com/w40/sy.png' },
    { code: '+972', name: 'Israel', flag: 'https://flagcdn.com/w40/il.png' },
    { code: '+970', name: 'Palestine', flag: 'https://flagcdn.com/w40/ps.png' },
    { code: '+967', name: 'Yemen', flag: 'https://flagcdn.com/w40/ye.png' },
    { code: '+218', name: 'Libya', flag: 'https://flagcdn.com/w40/ly.png' },
    { code: '+216', name: 'Tunisia', flag: 'https://flagcdn.com/w40/tn.png' },
    { code: '+213', name: 'Algeria', flag: 'https://flagcdn.com/w40/dz.png' },
    { code: '+212', name: 'Morocco', flag: 'https://flagcdn.com/w40/ma.png' },
    { code: '+249', name: 'Sudan', flag: 'https://flagcdn.com/w40/sd.png' },
    { code: '+211', name: 'South Sudan', flag: 'https://flagcdn.com/w40/ss.png' },
    { code: '+251', name: 'Ethiopia', flag: 'https://flagcdn.com/w40/et.png' },
    { code: '+254', name: 'Kenya', flag: 'https://flagcdn.com/w40/ke.png' },
    { code: '+255', name: 'Tanzania', flag: 'https://flagcdn.com/w40/tz.png' },
    { code: '+256', name: 'Uganda', flag: 'https://flagcdn.com/w40/ug.png' },
    { code: '+250', name: 'Rwanda', flag: 'https://flagcdn.com/w40/rw.png' },
    { code: '+257', name: 'Burundi', flag: 'https://flagcdn.com/w40/bi.png' },
    { code: '+234', name: 'Nigeria', flag: 'https://flagcdn.com/w40/ng.png' },
    { code: '+233', name: 'Ghana', flag: 'https://flagcdn.com/w40/gh.png' },
    { code: '+27', name: 'South Africa', flag: 'https://flagcdn.com/w40/za.png' },
    { code: '+260', name: 'Zambia', flag: 'https://flagcdn.com/w40/zm.png' },
    { code: '+263', name: 'Zimbabwe', flag: 'https://flagcdn.com/w40/zw.png' },
    { code: '+267', name: 'Botswana', flag: 'https://flagcdn.com/w40/bw.png' },
    { code: '+264', name: 'Namibia', flag: 'https://flagcdn.com/w40/na.png' },
    { code: '+258', name: 'Mozambique', flag: 'https://flagcdn.com/w40/mz.png' },
    { code: '+265', name: 'Malawi', flag: 'https://flagcdn.com/w40/mw.png' },
    { code: '+261', name: 'Madagascar', flag: 'https://flagcdn.com/w40/mg.png' },
    { code: '+230', name: 'Mauritius', flag: 'https://flagcdn.com/w40/mu.png' },
    { code: '+248', name: 'Seychelles', flag: 'https://flagcdn.com/w40/sc.png' },
    { code: '+253', name: 'Djibouti', flag: 'https://flagcdn.com/w40/dj.png' },
    { code: '+252', name: 'Somalia', flag: 'https://flagcdn.com/w40/so.png' },
    { code: '+291', name: 'Eritrea', flag: 'https://flagcdn.com/w40/er.png' },
    { code: '+232', name: 'Sierra Leone', flag: 'https://flagcdn.com/w40/sl.png' },
    { code: '+231', name: 'Liberia', flag: 'https://flagcdn.com/w40/lr.png' },
    { code: '+225', name: 'Ivory Coast', flag: 'https://flagcdn.com/w40/ci.png' },
    { code: '+221', name: 'Senegal', flag: 'https://flagcdn.com/w40/sn.png' },
    { code: '+223', name: 'Mali', flag: 'https://flagcdn.com/w40/ml.png' },
    { code: '+226', name: 'Burkina Faso', flag: 'https://flagcdn.com/w40/bf.png' },
    { code: '+227', name: 'Niger', flag: 'https://flagcdn.com/w40/ne.png' },
    { code: '+235', name: 'Chad', flag: 'https://flagcdn.com/w40/td.png' },
    { code: '+236', name: 'CAR', flag: 'https://flagcdn.com/w40/cf.png' },
    { code: '+237', name: 'Cameroon', flag: 'https://flagcdn.com/w40/cm.png' },
    { code: '+241', name: 'Gabon', flag: 'https://flagcdn.com/w40/ga.png' },
    { code: '+242', name: 'Congo', flag: 'https://flagcdn.com/w40/cg.png' },
    { code: '+243', name: 'DR Congo', flag: 'https://flagcdn.com/w40/cd.png' },
    { code: '+244', name: 'Angola', flag: 'https://flagcdn.com/w40/ao.png' },
    { code: '+238', name: 'Cape Verde', flag: 'https://flagcdn.com/w40/cv.png' },
    { code: '+245', name: 'Guinea-Bissau', flag: 'https://flagcdn.com/w40/gw.png' },
    { code: '+240', name: 'Equatorial Guinea', flag: 'https://flagcdn.com/w40/gq.png' },
    { code: '+239', name: 'Sao Tome', flag: 'https://flagcdn.com/w40/st.png' },
    { code: '+228', name: 'Togo', flag: 'https://flagcdn.com/w40/tg.png' },
    { code: '+229', name: 'Benin', flag: 'https://flagcdn.com/w40/bj.png' },
    { code: '+220', name: 'Gambia', flag: 'https://flagcdn.com/w40/gm.png' },
    { code: '+224', name: 'Guinea', flag: 'https://flagcdn.com/w40/gn.png' },
    { code: '+222', name: 'Mauritania', flag: 'https://flagcdn.com/w40/mr.png' },
    { code: '+269', name: 'Comoros', flag: 'https://flagcdn.com/w40/km.png' },
    { code: '+268', name: 'Eswatini', flag: 'https://flagcdn.com/w40/sz.png' },
    { code: '+266', name: 'Lesotho', flag: 'https://flagcdn.com/w40/ls.png' },
    { code: '+54', name: 'Argentina', flag: 'https://flagcdn.com/w40/ar.png' },
    { code: '+56', name: 'Chile', flag: 'https://flagcdn.com/w40/cl.png' },
    { code: '+57', name: 'Colombia', flag: 'https://flagcdn.com/w40/co.png' },
    { code: '+51', name: 'Peru', flag: 'https://flagcdn.com/w40/pe.png' },
    { code: '+58', name: 'Venezuela', flag: 'https://flagcdn.com/w40/ve.png' },
    { code: '+593', name: 'Ecuador', flag: 'https://flagcdn.com/w40/ec.png' },
    { code: '+591', name: 'Bolivia', flag: 'https://flagcdn.com/w40/bo.png' },
    { code: '+595', name: 'Paraguay', flag: 'https://flagcdn.com/w40/py.png' },
    { code: '+598', name: 'Uruguay', flag: 'https://flagcdn.com/w40/uy.png' },
    { code: '+506', name: 'Costa Rica', flag: 'https://flagcdn.com/w40/cr.png' },
    { code: '+507', name: 'Panama', flag: 'https://flagcdn.com/w40/pa.png' },
    { code: '+503', name: 'El Salvador', flag: 'https://flagcdn.com/w40/sv.png' },
    { code: '+502', name: 'Guatemala', flag: 'https://flagcdn.com/w40/gt.png' },
    { code: '+504', name: 'Honduras', flag: 'https://flagcdn.com/w40/hn.png' },
    { code: '+505', name: 'Nicaragua', flag: 'https://flagcdn.com/w40/ni.png' },
    { code: '+509', name: 'Haiti', flag: 'https://flagcdn.com/w40/ht.png' },
    { code: '+1-876', name: 'Jamaica', flag: 'https://flagcdn.com/w40/jm.png' },
    { code: '+53', name: 'Cuba', flag: 'https://flagcdn.com/w40/cu.png' },
    { code: '+597', name: 'Suriname', flag: 'https://flagcdn.com/w40/sr.png' },
    { code: '+592', name: 'Guyana', flag: 'https://flagcdn.com/w40/gy.png' },
    { code: '+501', name: 'Belize', flag: 'https://flagcdn.com/w40/bz.png' },
    { code: '+60', name: 'Malaysia', flag: 'https://flagcdn.com/w40/my.png' },
    { code: '+62', name: 'Indonesia', flag: 'https://flagcdn.com/w40/id.png' },
    { code: '+63', name: 'Philippines', flag: 'https://flagcdn.com/w40/ph.png' },
    { code: '+65', name: 'Singapore', flag: 'https://flagcdn.com/w40/sg.png' },
    { code: '+66', name: 'Thailand', flag: 'https://flagcdn.com/w40/th.png' },
    { code: '+84', name: 'Vietnam', flag: 'https://flagcdn.com/w40/vn.png' },
    { code: '+95', name: 'Myanmar', flag: 'https://flagcdn.com/w40/mm.png' },
    { code: '+855', name: 'Cambodia', flag: 'https://flagcdn.com/w40/kh.png' },
    { code: '+856', name: 'Laos', flag: 'https://flagcdn.com/w40/la.png' },
    { code: '+880', name: 'Bangladesh', flag: 'https://flagcdn.com/w40/bd.png' },
    { code: '+92', name: 'Pakistan', flag: 'https://flagcdn.com/w40/pk.png' },
    { code: '+94', name: 'Sri Lanka', flag: 'https://flagcdn.com/w40/lk.png' },
    { code: '+977', name: 'Nepal', flag: 'https://flagcdn.com/w40/np.png' },
    { code: '+975', name: 'Bhutan', flag: 'https://flagcdn.com/w40/bt.png' },
    { code: '+960', name: 'Maldives', flag: 'https://flagcdn.com/w40/mv.png' },
    { code: '+976', name: 'Mongolia', flag: 'https://flagcdn.com/w40/mn.png' },
    { code: '+850', name: 'North Korea', flag: 'https://flagcdn.com/w40/kp.png' },
    { code: '+82', name: 'South Korea', flag: 'https://flagcdn.com/w40/kr.png' },
    { code: '+886', name: 'Taiwan', flag: 'https://flagcdn.com/w40/tw.png' },
    { code: '+64', name: 'New Zealand', flag: 'https://flagcdn.com/w40/nz.png' },
    { code: '+679', name: 'Fiji', flag: 'https://flagcdn.com/w40/fj.png' },
    { code: '+675', name: 'Papua New Guinea', flag: 'https://flagcdn.com/w40/pg.png' },
    { code: '+677', name: 'Solomon Islands', flag: 'https://flagcdn.com/w40/sb.png' },
    { code: '+678', name: 'Vanuatu', flag: 'https://flagcdn.com/w40/vu.png' },
    { code: '+685', name: 'Samoa', flag: 'https://flagcdn.com/w40/ws.png' },
    { code: '+686', name: 'Kiribati', flag: 'https://flagcdn.com/w40/ki.png' },
    { code: '+688', name: 'Tuvalu', flag: 'https://flagcdn.com/w40/tv.png' },
    { code: '+692', name: 'Marshall Islands', flag: 'https://flagcdn.com/w40/mh.png' },
    { code: '+691', name: 'Micronesia', flag: 'https://flagcdn.com/w40/fm.png' },
    { code: '+680', name: 'Palau', flag: 'https://flagcdn.com/w40/pw.png' },
    { code: '+674', name: 'Nauru', flag: 'https://flagcdn.com/w40/nr.png' },
    { code: '+670', name: 'Timor-Leste', flag: 'https://flagcdn.com/w40/tl.png' },
    { code: '+673', name: 'Brunei', flag: 'https://flagcdn.com/w40/bn.png' },
    { code: '+257', name: 'Burundi', flag: 'https://flagcdn.com/w40/bi.png' },
    { code: '+269', name: 'Comoros', flag: 'https://flagcdn.com/w40/km.png' },
    { code: '+262', name: 'Reunion', flag: 'https://flagcdn.com/w40/re.png' },
    { code: '+590', name: 'Guadeloupe', flag: 'https://flagcdn.com/w40/gp.png' },
    { code: '+594', name: 'French Guiana', flag: 'https://flagcdn.com/w40/gf.png' },
    { code: '+596', name: 'Martinique', flag: 'https://flagcdn.com/w40/mq.png' },
    { code: '+687', name: 'New Caledonia', flag: 'https://flagcdn.com/w40/nc.png' },
    { code: '+689', name: 'French Polynesia', flag: 'https://flagcdn.com/w40/pf.png' },
    { code: '+681', name: 'Wallis and Futuna', flag: 'https://flagcdn.com/w40/wf.png' },
    { code: '+508', name: 'Saint Pierre', flag: 'https://flagcdn.com/w40/pm.png' },
    { code: '+290', name: 'Saint Helena', flag: 'https://flagcdn.com/w40/sh.png' },
    { code: '+500', name: 'Falkland Islands', flag: 'https://flagcdn.com/w40/fk.png' },
    { code: '+299', name: 'Greenland', flag: 'https://flagcdn.com/w40/gl.png' },
    { code: '+298', name: 'Faroe Islands', flag: 'https://flagcdn.com/w40/fo.png' },
    { code: '+297', name: 'Aruba', flag: 'https://flagcdn.com/w40/aw.png' },
    { code: '+599', name: 'Curacao', flag: 'https://flagcdn.com/w40/cw.png' },
    { code: '+1-721', name: 'Sint Maarten', flag: 'https://flagcdn.com/w40/sx.png' },
    { code: '+1-264', name: 'Anguilla', flag: 'https://flagcdn.com/w40/ai.png' },
    { code: '+1-268', name: 'Antigua', flag: 'https://flagcdn.com/w40/ag.png' },
    { code: '+1-242', name: 'Bahamas', flag: 'https://flagcdn.com/w40/bs.png' },
    { code: '+1-246', name: 'Barbados', flag: 'https://flagcdn.com/w40/bb.png' },
    { code: '+1-284', name: 'British Virgin Islands', flag: 'https://flagcdn.com/w40/vg.png' },
    { code: '+1-345', name: 'Cayman Islands', flag: 'https://flagcdn.com/w40/ky.png' },
    { code: '+1-767', name: 'Dominica', flag: 'https://flagcdn.com/w40/dm.png' },
    { code: '+1-809', name: 'Dominican Republic', flag: 'https://flagcdn.com/w40/do.png' },
    { code: '+1-473', name: 'Grenada', flag: 'https://flagcdn.com/w40/gd.png' },
    { code: '+1-671', name: 'Guam', flag: 'https://flagcdn.com/w40/gu.png' },
    { code: '+1-664', name: 'Montserrat', flag: 'https://flagcdn.com/w40/ms.png' },
    { code: '+1-670', name: 'Northern Mariana Islands', flag: 'https://flagcdn.com/w40/mp.png' },
    { code: '+1-787', name: 'Puerto Rico', flag: 'https://flagcdn.com/w40/pr.png' },
    { code: '+1-869', name: 'Saint Kitts and Nevis', flag: 'https://flagcdn.com/w40/kn.png' },
    { code: '+1-758', name: 'Saint Lucia', flag: 'https://flagcdn.com/w40/lc.png' },
    { code: '+1-784', name: 'Saint Vincent', flag: 'https://flagcdn.com/w40/vc.png' },
    { code: '+1-868', name: 'Trinidad and Tobago', flag: 'https://flagcdn.com/w40/tt.png' },
    { code: '+1-340', name: 'US Virgin Islands', flag: 'https://flagcdn.com/w40/vi.png' },
    { code: '+1-684', name: 'American Samoa', flag: 'https://flagcdn.com/w40/as.png' },
    { code: '+1-441', name: 'Bermuda', flag: 'https://flagcdn.com/w40/bm.png' },
    { code: '+1-649', name: 'Turks and Caicos', flag: 'https://flagcdn.com/w40/tc.png' },
  ];

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  function $(id) { return document.getElementById(id); }
  function toStr(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function clean(v) { return toStr(v).replace(/[<>]/g, ''); }
  function generateRef() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = 'TR-'; for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length)); return r; }
  function toInt(n) { const num = Number(n); return isNaN(num) ? 0 : Math.floor(num); }
  function fmt(n) { return 'EGP ' + Math.floor(n).toLocaleString(); }
  function esc(s) { return s ? String(s).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]) : ''; }
  function getPhoneNumber() { const pe = $('phone'); return selectedCountryCode + (pe ? toStr(pe.value) : ''); }

  function toast(msg, type) {
    if (toastTimer) clearTimeout(toastTimer);
    const old = document.querySelector('.bs-toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'bs-toast';
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ' + (type === 'error' ? '#ef4444' : '#22c55e') + ';white-space:nowrap;opacity:1;transition:opacity 0.3s;';
    t.textContent = (type === 'error' ? '❌ ' : '✅ ') + msg;
    document.body.appendChild(t);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; setTimeout(() => { if (t.parentNode) t.remove(); }, 300); }, 3000);
  }

  function showFieldError(inputId, msg) {
    const existing = document.querySelector('.field-error[data-field="' + inputId + '"]'); if (existing) existing.remove();
    const input = $(inputId); if (!input) return;
    input.style.borderColor = '#ef4444';
    const error = document.createElement('div'); error.className = 'field-error'; error.setAttribute('data-field', inputId);
    error.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg;
    input.parentNode.appendChild(error);
    input.addEventListener('input', () => { input.style.borderColor = ''; if (error.parentNode) error.remove(); }, { once: true });
  }

  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(e => e.remove());
    document.querySelectorAll('.input-field, .phone-number-input').forEach(e => e.style.borderColor = '');
  }

  // ==========================================================================
  // VEHICLE HELPERS
  // ==========================================================================
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
    const sv = $('selectedVehicle');
    const selectedVehicle = sv ? sv.value : (availableVehicles[0] || 'car');
    const vehicleMultipliers = {'car':1,'minivan':1.5,'bus':2.5,'suv':1.3,'limousine':1.8};
    let total = basePrice * (vehicleMultipliers[selectedVehicle] || 1);
    total = Math.round(total);
    
    const tp = $('tourPrice'); if (tp) { tp.textContent = fmt(total); tp.setAttribute('data-price-egp', total); }
    const tpd = $('totalPriceDisplay'); if (tpd) { tpd.textContent = fmt(total); tpd.setAttribute('data-price-egp', total); }
    const trp = $('transferPrice'); if (trp) trp.value = total;
    
    if (window.SharmCurrency?.update) setTimeout(() => window.SharmCurrency.update(), 100);
  }

  // ==========================================================================
  // BUILD OPTIONS
  // ==========================================================================
  function buildPassengerOptions() {
    const container = $('passengerSelector');
    if (!container) return;
    container.innerHTML = '';
    const currentPax = parseInt(($('selectedPassengers')?.value) || 1);
    
    for (let i = 1; i <= maxPassengers; i++) {
      const chip = document.createElement('span');
      chip.className = 'option-chip' + (i === currentPax ? ' active' : '');
      chip.dataset.pax = i;
      chip.innerHTML = '<i class="fas fa-user"></i> ' + i;
      chip.addEventListener('click', function() {
        container.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        const sp = $('selectedPassengers'); if (sp) sp.value = parseInt(this.dataset.pax);
      });
      container.appendChild(chip);
    }
  }
  
  function buildVehicleOptions() {
    const container = $('vehicleSelector');
    if (!container) return;
    container.innerHTML = '';
    const currentVehicle = ($('selectedVehicle')?.value) || availableVehicles[0] || 'car';
    
    availableVehicles.forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'option-chip' + (v === currentVehicle ? ' active' : '');
      chip.dataset.vehicle = v;
      chip.innerHTML = '<i class="fas ' + (VEHICLE_ICONS[v] || 'fa-car') + '"></i> ' + getVehicleLabel(v);
      chip.addEventListener('click', function() {
        container.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        const sv = $('selectedVehicle'); if (sv) sv.value = this.dataset.vehicle;
        updatePrice();
      });
      container.appendChild(chip);
    });
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  function updateSummary() {
    const ref = $('summaryRef'); if (ref) ref.textContent = refNumber;
    const sv = $('summaryVehicle'); if (sv) sv.textContent = getVehicleName(($('selectedVehicle')?.value) || 'car');
    const sp = $('summaryPassengers'); if (sp) sp.textContent = (($('selectedPassengers')?.value) || '1') + ' pax';
    
    const hotelName = ($('hotelName')?.value) || 'Your Hotel';
    const fromLoc = transfer?.from || 'Sharm Airport';
    const toLoc = transfer?.to || 'Destination';
    
    let routeText = '';
    const fl = fromLoc.toLowerCase();
    const tl = toLoc.toLowerCase();
    if (fl.includes('airport') || fl.includes('مطار') || fl.includes('ssh')) {
      routeText = esc(fromLoc) + ' → ' + esc(hotelName);
    } else if (tl.includes('airport') || tl.includes('مطار') || tl.includes('ssh')) {
      routeText = esc(hotelName) + ' → ' + esc(toLoc);
    } else {
      routeText = esc(fromLoc) + ' → ' + esc(toLoc);
    }
    
    const sr = $('summaryRoute'); if (sr) sr.innerHTML = routeText;
    
    if (isAirportTransfer) {
      const sfl = $('summaryFlight'); if (sfl) sfl.textContent = ($('flightNumber')?.value || 'N/A');
      const stm = $('summaryTime'); if (stm) stm.textContent = ($('flightTime')?.value || 'N/A');
      const stl = $('summaryTimeLine'); if (stl) stl.querySelector('span').textContent = 'Arrival:';
    } else {
      const stm = $('summaryTime'); if (stm) stm.textContent = ($('pickupTime')?.value || 'Flexible');
      const stl = $('summaryTimeLine'); if (stl) stl.querySelector('span').textContent = 'Pickup:';
    }
    
    const sd = $('summaryDate'); if (sd) sd.textContent = ($('tripDate')?.value || '-');
    const sh = $('summaryHotel'); if (sh) sh.textContent = hotelName;
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  function goToStep(n) {
    clearAllFieldErrors();
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    const tgt = document.querySelector('.form-step[data-step="' + n + '"]');
    if (tgt) tgt.classList.add('active');
    currentStep = n;
    const pb = $('progressBar'); if (pb) pb.style.width = ((n + 1) / 4 * 100) + '%';
    document.querySelectorAll('.steps-labels .step-label').forEach((l, i) => {
      l.classList.toggle('active', i === n);
      l.classList.toggle('completed', i < n);
    });
    if (n === 3) updateSummary();
  }

  function nextStep() { 
    if (currentStep < 3) goToStep(currentStep + 1); 
  }
  
  function prevStep() { 
    if (currentStep > 0) goToStep(currentStep - 1); 
  }

  // ==========================================================================
  // USER DATA
  // ==========================================================================
  function loadSavedUserData() {
    try {
      const saved = localStorage.getItem('userBookingInfo');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.name) { const e = $('username'); if (e) e.value = data.name; }
        if (data.email) { const e = $('customerEmail'); if (e) e.value = data.email; }
        if (data.phone) { const e = $('phone'); if (e) e.value = data.phone; }
        if (data.hotelName) { const e = $('hotelName'); if (e) e.value = data.hotelName; }
      }
    } catch(e) {}
  }
  
  function saveUserData() {
    const data = {
      name: ($('username')?.value) || '',
      email: ($('customerEmail')?.value) || '',
      phone: ($('phone')?.value) || '',
      hotelName: ($('hotelName')?.value) || ''
    };
    try { localStorage.setItem('userBookingInfo', JSON.stringify(data)); } catch(e) {}
  }

  // ==========================================================================
  // COUNTRY MODAL
  // ==========================================================================
  function openCountryModal() {
    const existing = document.getElementById('countryModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div'); modal.id = 'countryModal'; modal.className = 'country-modal';
    modal.innerHTML = '<div class="country-modal-overlay"></div><div class="country-modal-container"><div class="country-modal-header"><h3>🌍 Select Country</h3><button class="country-modal-close">&times;</button></div><input type="text" class="country-modal-search" placeholder="Search country..." /><div class="country-modal-list"></div></div>';
    document.body.appendChild(modal);
    
    modal.querySelector('.country-modal-overlay').addEventListener('click', closeCountryModal);
    modal.querySelector('.country-modal-close').addEventListener('click', closeCountryModal);
    modal.querySelector('.country-modal-search').addEventListener('input', function() {
      renderCountryList(this.value, modal);
    });
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderCountryList('', modal);
    setTimeout(() => { const s = modal.querySelector('.country-modal-search'); if (s) s.focus(); }, 300);
  }
  
  function closeCountryModal() {
    const m = document.getElementById('countryModal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
  }
  
  function renderCountryList(filter, modal) {
    const list = modal.querySelector('.country-modal-list');
    if (!list) return;
    const filtered = filter ? countries.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.code.includes(filter)) : countries;
    list.innerHTML = '';
    filtered.forEach(c => {
      const d = document.createElement('div');
      d.className = 'country-modal-item' + (c.code === selectedCountryCode ? ' selected' : '');
      d.innerHTML = '<img src="' + c.flag + '" alt="' + c.name + '" class="country-modal-flag" /><span class="country-modal-name">' + c.name + '</span><span class="country-modal-code">' + c.code + '</span>';
      d.addEventListener('click', () => selectCountry(c));
      list.appendChild(d);
    });
  }
  
  function selectCountry(c) {
    selectedCountryCode = c.code;
    selectedCountryName = c.name;
    selectedCountryFlag = c.flag;
    const sc = document.getElementById('selectedCountry');
    if (sc) {
      const img = sc.querySelector('img'); if (img) img.src = c.flag;
      const span = sc.querySelector('span'); if (span) span.textContent = c.code;
    }
    closeCountryModal();
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
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1e1e1e;border-bottom:1px solid #2e2e2e;">
          <button id="paymentBackBtn" style="background:#2a2a2a;border:none;color:#fff;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;"><i class="fas fa-arrow-left"></i> Back</button>
          <span style="color:#fff;font-size:14px;font-weight:600;"><i class="fas fa-lock" style="color:#f59e0b;margin-right:6px;"></i>Secure Payment</span>
          <span style="width:60px;"></span>
        </div>
        <div style="flex:1;background:#fff;min-height:500px;">
          <iframe src="${paymentUrl}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
        </div>
      </div>
    `;
    
    document.getElementById('paymentBackBtn').addEventListener('click', hidePaymentIframe);
  }

  function hidePaymentIframe() {
    const container = document.querySelector('.tour-booking-container');
    if (!container) return;
    const originalHTML = container.getAttribute('data-original-html');
    if (originalHTML) {
      container.innerHTML = originalHTML;
      container.removeAttribute('data-original-html');
      currentStep = 0;
      goToStep(0);
      bindAllEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ==========================================================================
  // SUBMIT
  // ==========================================================================
  async function submitBooking() {
    const spinner = $('spinner');
    if (spinner) spinner.classList.remove('hidden');
    
    saveUserData();
    
    try {
      const total = parseInt(($('transferPrice')?.value) || 0);
      
      pendingBooking = {
        refNumber, transferId,
        from: transfer?.from || '', to: transfer?.to || '',
        hotelName: clean($('hotelName')?.value) || '',
        vehicle: ($('selectedVehicle')?.value) || 'car',
        passengers: parseInt(($('selectedPassengers')?.value) || 1),
        price: total,
        isAirportTransfer,
        flightNumber: isAirportTransfer ? clean($('flightNumber')?.value) : null,
        flightTime: isAirportTransfer ? clean($('flightTime')?.value) : null,
        pickupTime: !isAirportTransfer ? clean($('pickupTime')?.value) : null,
        customerName: clean($('username')?.value),
        email: clean($('customerEmail')?.value),
        phone: getPhoneNumber(),
        transferDate: clean($('tripDate')?.value),
        specialRequests: clean($('specialRequests')?.value),
        status: 'pending', paymentStatus: 'unpaid', createdAt: Date.now()
      };
      
      await db.ref('transfer-bookings/' + refNumber).set(pendingBooking);
      
      const resp = await fetch('https://kashier-hash.gm-093.workers.dev/', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP' }) 
      });
      
      if (!resp.ok) throw new Error('Payment service unavailable');
      const hashData = await resp.json();
      if (!hashData.hash) throw new Error('Payment verification failed');
      
      const redirectUrl = window.location.origin + '/p/payment-status.html?ref=' + refNumber + '&type=transfer';
      const paymentUrl = 'https://payments.kashier.io/?' + new URLSearchParams({
        merchantId: 'MID-33260-3', orderId: refNumber, amount: total, currency: 'EGP',
        hash: hashData.hash, mode: 'live',
        merchantRedirect: redirectUrl, failureRedirect: redirectUrl, redirectMethod: 'get'
      }).toString();
      
      if (spinner) spinner.classList.add('hidden');
      showPaymentIframe(paymentUrl);
    } catch(e) {
      toast(e.message, 'error');
      if (spinner) spinner.classList.add('hidden');
    }
  }

  // ==========================================================================
  // RENDER TRANSFER
  // ==========================================================================
  function renderTransfer() {
    const fl = $('fromLocation'); if (fl) fl.textContent = transfer?.from || 'Sharm El Sheikh';
    const tl = $('toLocation'); if (tl) tl.textContent = transfer?.to || 'Destination';
    
    if (transfer?.description) {
      const td = $('tourDescription'); if (td) td.innerHTML = transfer.description;
      const dc = $('descriptionContainer'); if (dc) dc.style.display = 'block';
    }
    
    const qic = $('quickInfoCards');
    if (qic) {
      qic.innerHTML = `
        <div class="info-card"><i class="fas fa-clock"></i><span>Duration</span><strong>${transfer?.duration || 'Flexible'}</strong></div>
        <div class="info-card"><i class="fas fa-users"></i><span>Max Passengers</span><strong>${maxPassengers}</strong></div>
        <div class="info-card"><i class="fas fa-car"></i><span>Vehicle</span><strong>${getVehicleName(availableVehicles[0])}</strong></div>
      `;
    }
    
    const ii = $('includedItems');
    if (ii) {
      ii.innerHTML = `
        <div class="included-item"><i class="fas fa-check-circle"></i> Private air-conditioned vehicle</div>
        <div class="included-item"><i class="fas fa-check-circle"></i> Professional driver</div>
        <div class="included-item"><i class="fas fa-check-circle"></i> Pickup & drop-off</div>
        <div class="included-item"><i class="fas fa-check-circle"></i> ${isAirportTransfer ? 'Flight monitoring' : 'Point-to-point service'}</div>
        <div class="included-item"><i class="fas fa-check-circle"></i> ${isAirportTransfer ? 'Meet & greet at airport' : 'Meet & greet at location'}</div>
      `;
    }
    
    const ni = $('notIncludedItems');
    if (ni) {
      ni.innerHTML = `
        <div class="included-item" style="color:#ef4444;"><i class="fas fa-times-circle"></i> Tips for driver (optional)</div>
        <div class="included-item" style="color:#ef4444;"><i class="fas fa-times-circle"></i> Extra stops not in route</div>
      `;
    }
    
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
  // LOAD TRANSFER
  // ==========================================================================
  function loadTransfer() {
    return new Promise(function(resolve) {
      transferId = new URLSearchParams(window.location.search).get('id') || '';
      
      function setupAndRender() {
        maxPassengers = toInt(transfer?.passengers) || 4;
        
        if (transfer?.vehicle) {
          availableVehicles = [transfer.vehicle.toLowerCase().trim()];
        } else {
          availableVehicles = ['car', 'minivan', 'bus'];
        }
        
        const sv = $('selectedVehicle'); if (sv) sv.value = availableVehicles[0] || 'car';
        const sp = $('selectedPassengers'); if (sp) sp.value = 1;
        
        const from = (transfer?.from || '').toLowerCase();
        const to = (transfer?.to || '').toLowerCase();
        isAirportTransfer = from.includes('airport') || to.includes('airport') || 
                           from.includes('مطار') || to.includes('مطار') || from.includes('ssh') || to.includes('ssh');
        
        const iat = $('isAirportTransfer'); if (iat) iat.value = isAirportTransfer;
        const fd = $('flightDetailsGroup'); if (fd) fd.style.display = isAirportTransfer ? 'block' : 'none';
        const pt = $('pickupTimeGroup'); if (pt) pt.style.display = isAirportTransfer ? 'none' : 'block';
        const sf = $('summaryFlightLine'); if (sf) sf.style.display = isAirportTransfer ? 'flex' : 'none';
        const st = $('summaryTimeLine'); if (st) st.style.display = 'flex';
        
        buildPassengerOptions();
        buildVehicleOptions();
        loadSavedUserData();
        renderTransfer();
        resolve();
      }
      
      if (transferId) {
        db.ref('Transfers/' + transferId).once('value').then(function(snap) {
          if (snap.exists()) {
            transfer = snap.val();
            transfer.id = transferId;
          }
          setupAndRender();
        }).catch(function() {
          setupAndRender();
        });
      } else {
        setupAndRender();
      }
    });
  }

  // ==========================================================================
  // BIND EVENTS
  // ==========================================================================
  function bindAllEvents() {
    document.querySelectorAll('[data-action="next"]').forEach(function(b) { b.onclick = nextStep; });
    document.querySelectorAll('[data-action="prev"]').forEach(function(b) { b.onclick = prevStep; });
    
    const sb = $('submitBtn'); if (sb) sb.onclick = submitBooking;
    
    const ccs = $('countryCodeSelect');
    if (ccs) ccs.addEventListener('click', function(e) { e.stopPropagation(); openCountryModal(); });
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  function init() {
    refNumber = generateRef();
    
    const de = document.querySelector('#tripDate');
    if (de && typeof flatpickr !== 'undefined') {
      flatpickr(de, { minDate: new Date().fp_incr(1), dateFormat: 'Y-m-d', disableMobile: true });
    }
    
    loadTransfer().then(function() {
      setTimeout(bindAllEvents, 300);
    });
  }

  // ==========================================================================
  // START
  // ==========================================================================
  function tryInit() {
    if (typeof db === 'undefined') { setTimeout(tryInit, 500); return; }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 800); });
  } else {
    setTimeout(tryInit, 800);
  }

  window.TransferBookingSystem = {
    init, nextStep, prevStep, submit: submitBooking,
    getRef: function() { return refNumber; },
    getPhone: getPhoneNumber
  };

})();
