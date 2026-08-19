// ============================================================================
// admin.js — لوحة إدارة منصة حجوزات فنادق شرم الشيخ (Extranet)
// ============================================================================

import { db, auth, SHARM_AREAS, BEACH_TYPES, INCLUSION_TYPES } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----------------------------------------------------------------------------
// عناصر DOM
// ----------------------------------------------------------------------------
const els = {
  loginScreen: document.getElementById("loginScreen"),
  dashboard: document.getElementById("dashboard"),
  loginForm: document.getElementById("loginForm"),
  loginError: document.getElementById("loginError"),
  logoutBtn: document.getElementById("logoutBtn"),
  adminEmailLabel: document.getElementById("adminEmailLabel"),

  addHotelForm: document.getElementById("addHotelForm"),
  addHotelMsg: document.getElementById("addHotelMsg"),
  hotelsTableBody: document.getElementById("hotelsTableBody"),
  roomHotelSelect: document.getElementById("roomHotelSelect"),
  addRoomForm: document.getElementById("addRoomForm"),
  addRoomMsg: document.getElementById("addRoomMsg"),
  roomsListWrap: document.getElementById("roomsListWrap"),

  bookingsTableBody: document.getElementById("bookingsTableBody"),
  refreshBookingsBtn: document.getElementById("refreshBookingsBtn")
};

let cachedHotels = [];

// ============================================================================
// 1) المصادقة (Authentication)
// ============================================================================
els.loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.loginError.classList.add("hidden");
  const email = els.loginForm.email.value.trim();
  const password = els.loginForm.password.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error(err);
    els.loginError.textContent = "بيانات الدخول غير صحيحة أو الحساب غير موجود.";
    els.loginError.classList.remove("hidden");
  }
});

els.logoutBtn?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    els.loginScreen.classList.add("hidden");
    els.dashboard.classList.remove("hidden");
    els.adminEmailLabel.textContent = user.email || "";
    initDashboard();
  } else {
    els.loginScreen.classList.remove("hidden");
    els.dashboard.classList.add("hidden");
  }
});

function initDashboard() {
  loadHotels();
  loadBookings();
}

// ============================================================================
// 2) إضافة فندق جديد
// ============================================================================
els.addHotelForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = els.addHotelForm;
  els.addHotelMsg.classList.add("hidden");

  const hotelData = {
    name: f.name.value.trim(),
    nameEn: f.nameEn.value.trim() || null,
    area: f.area.value,
    beachType: f.beachType.value,
    inclusionType: f.inclusionType.value,
    heatedPool: f.heatedPool.checked,
    aquaPark: f.aquaPark.checked,
    mainImage: f.mainImage.value.trim(),
    images: f.images.value.split(",").map(s => s.trim()).filter(Boolean),
    rating: f.rating.value ? Number(f.rating.value) : null,
    reviewsCount: f.reviewsCount.value ? Number(f.reviewsCount.value) : 0,
    description: f.description.value.trim(),
    amenities: f.amenities.value.split(",").map(s => s.trim()).filter(Boolean),
    active: f.active.checked,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "hotels"), hotelData);
    els.addHotelMsg.textContent = "✅ تم إضافة الفندق بنجاح.";
    els.addHotelMsg.className = "text-green-600 text-sm font-bold mt-2";
    els.addHotelMsg.classList.remove("hidden");
    f.reset();
    loadHotels();
  } catch (err) {
    console.error(err);
    els.addHotelMsg.textContent = "❌ حدث خطأ أثناء إضافة الفندق.";
    els.addHotelMsg.className = "text-red-600 text-sm font-bold mt-2";
    els.addHotelMsg.classList.remove("hidden");
  }
});

// ============================================================================
// 3) عرض قائمة الفنادق + حذفها + تعبئة قائمة اختيار الفندق لإضافة غرف
// ============================================================================
async function loadHotels() {
  const snap = await getDocs(collection(db, "hotels"));
  cachedHotels = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // جدول الفنادق
  els.hotelsTableBody.innerHTML = cachedHotels.map(hotel => `
    <tr class="border-b border-slate-100">
      <td class="py-2 px-3 font-bold">${escapeHtml(hotel.name)}</td>
      <td class="py-2 px-3">${escapeHtml(hotel.area || "")}</td>
      <td class="py-2 px-3">${hotel.active ? '<span class="text-green-600 font-bold">مفعّل</span>' : '<span class="text-slate-400">معطّل</span>'}</td>
      <td class="py-2 px-3 text-left">
        <button data-id="${hotel.id}" class="delete-hotel-btn text-red-500 hover:underline text-xs font-bold">حذف</button>
      </td>
    </tr>
  `).join("") || `<tr><td class="py-4 text-slate-400" colspan="4">لا توجد فنادق مضافة بعد.</td></tr>`;

  els.hotelsTableBody.querySelectorAll(".delete-hotel-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("هل أنت متأكد من حذف هذا الفندق؟")) return;
      await deleteDoc(doc(db, "hotels", btn.dataset.id));
      loadHotels();
    });
  });

  // قائمة اختيار الفندق لإضافة غرفة
  els.roomHotelSelect.innerHTML = `<option value="">اختر الفندق</option>` +
    cachedHotels.map(h => `<option value="${h.id}">${escapeHtml(h.name)}</option>`).join("");
}

// ============================================================================
// 4) إضافة / عرض غرف فندق معيّن
// ============================================================================
els.roomHotelSelect?.addEventListener("change", () => {
  if (els.roomHotelSelect.value) loadRoomsForHotel(els.roomHotelSelect.value);
  else els.roomsListWrap.innerHTML = "";
});

els.addRoomForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const hotelId = els.roomHotelSelect.value;
  if (!hotelId) {
    alert("اختر الفندق أولاً.");
    return;
  }
  const f = els.addRoomForm;
  els.addRoomMsg.classList.add("hidden");

  const roomData = {
    roomType: f.roomType.value.trim(),
    priceEgyptianEGP: Number(f.priceEgyptianEGP.value),
    priceForeignUSD: Number(f.priceForeignUSD.value),
    mealPlan: f.mealPlan.value.trim(),
    maxOccupancy: Number(f.maxOccupancy.value) || 2,
    availableRooms: Number(f.availableRooms.value) || 0,
    available: f.available.checked,
    images: []
  };

  try {
    await addDoc(collection(db, "hotels", hotelId, "rooms"), roomData);
    els.addRoomMsg.textContent = "✅ تم إضافة الغرفة بنجاح.";
    els.addRoomMsg.className = "text-green-600 text-sm font-bold mt-2";
    els.addRoomMsg.classList.remove("hidden");
    f.reset();
    loadRoomsForHotel(hotelId);
  } catch (err) {
    console.error(err);
    els.addRoomMsg.textContent = "❌ حدث خطأ أثناء إضافة الغرفة.";
    els.addRoomMsg.className = "text-red-600 text-sm font-bold mt-2";
    els.addRoomMsg.classList.remove("hidden");
  }
});

async function loadRoomsForHotel(hotelId) {
  const snap = await getDocs(collection(db, "hotels", hotelId, "rooms"));
  const rooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!rooms.length) {
    els.roomsListWrap.innerHTML = `<p class="text-slate-400 text-sm mt-3">لا توجد غرف مضافة لهذا الفندق بعد.</p>`;
    return;
  }

  els.roomsListWrap.innerHTML = `
    <table class="w-full text-sm mt-4">
      <thead><tr class="text-right text-slate-400 border-b">
        <th class="py-2">نوع الغرفة</th><th>سعر المصريين</th><th>سعر الأجانب</th><th>الوجبات</th><th></th>
      </tr></thead>
      <tbody>
        ${rooms.map(r => `
          <tr class="border-b border-slate-100">
            <td class="py-2 font-bold">${escapeHtml(r.roomType)}</td>
            <td>${r.priceEgyptianEGP} ج.م</td>
            <td>${r.priceForeignUSD} $</td>
            <td>${escapeHtml(r.mealPlan || "")}</td>
            <td class="text-left">
              <button data-hotel="${hotelId}" data-room="${r.id}" class="delete-room-btn text-red-500 hover:underline text-xs font-bold">حذف</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  els.roomsListWrap.querySelectorAll(".delete-room-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("حذف هذه الغرفة؟")) return;
      await deleteDoc(doc(db, "hotels", btn.dataset.hotel, "rooms", btn.dataset.room));
      loadRoomsForHotel(hotelId);
    });
  });
}

// ============================================================================
// 5) عرض وإدارة الحجوزات الواردة
// ============================================================================
async function loadBookings() {
  els.bookingsTableBody.innerHTML = `<tr><td class="py-4 text-slate-400" colspan="7">جارِ التحميل...</td></tr>`;
  const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!bookings.length) {
    els.bookingsTableBody.innerHTML = `<tr><td class="py-4 text-slate-400" colspan="7">لا توجد حجوزات واردة بعد.</td></tr>`;
    return;
  }

  els.bookingsTableBody.innerHTML = bookings.map(b => `
    <tr class="border-b border-slate-100">
      <td class="py-2 px-3 font-mono text-xs">${escapeHtml(b.referenceId || b.id)}</td>
      <td class="py-2 px-3">${escapeHtml(b.hotelName || "")}</td>
      <td class="py-2 px-3">${escapeHtml(b.guestName || "")}<br/><span class="text-slate-400 text-xs">${escapeHtml(b.guestPhone || "")}</span></td>
      <td class="py-2 px-3 text-xs">${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}</td>
      <td class="py-2 px-3 font-bold">${b.totalPrice ?? ""} ${b.currency === "EGP" ? "ج.م" : "$"}</td>
      <td class="py-2 px-3">
        <select data-id="${b.id}" class="status-select filter-select text-xs">
          <option value="Pending" ${b.status === "Pending" ? "selected" : ""}>قيد المراجعة</option>
          <option value="Confirmed" ${b.status === "Confirmed" ? "selected" : ""}>مؤكد</option>
          <option value="Cancelled" ${b.status === "Cancelled" ? "selected" : ""}>ملغي</option>
        </select>
      </td>
      <td class="py-2 px-3 text-left">
        <button data-id="${b.id}" class="delete-booking-btn text-red-500 hover:underline text-xs font-bold">حذف</button>
      </td>
    </tr>
  `).join("");

  els.bookingsTableBody.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      await updateDoc(doc(db, "bookings", sel.dataset.id), { status: sel.value });
    });
  });
  els.bookingsTableBody.querySelectorAll(".delete-booking-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("حذف هذا الحجز؟")) return;
      await deleteDoc(doc(db, "bookings", btn.dataset.id));
      loadBookings();
    });
  });
}

els.refreshBookingsBtn?.addEventListener("click", loadBookings);

// ============================================================================
// أدوات مساعدة + تعبئة قوائم الفلاتر الديناميكية في نموذج إضافة الفندق
// ============================================================================
function formatDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ar-EG");
}
function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// تعبئة select المنطقة/الشاطئ/نظام الإقامة من القيم المركزية في firebase-config.js
(function populateStaticSelects() {
  const areaSelect = document.getElementById("hotelAreaSelect");
  if (areaSelect) {
    areaSelect.innerHTML = SHARM_AREAS.map(a => `<option value="${a}">${a}</option>`).join("");
  }
  const beachSelect = document.getElementById("hotelBeachSelect");
  if (beachSelect) {
    beachSelect.innerHTML = Object.entries(BEACH_TYPES).map(([val, label]) => `<option value="${val}">${label}</option>`).join("");
  }
  const inclusionSelect = document.getElementById("hotelInclusionSelect");
  if (inclusionSelect) {
    inclusionSelect.innerHTML = Object.entries(INCLUSION_TYPES).map(([val, label]) => `<option value="${val}">${label}</option>`).join("");
  }
})();
