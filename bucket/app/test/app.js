// ============================================================================
// app.js — منطق الواجهة الأمامية لموقع حجوزات فنادق شرم الشيخ
// ============================================================================

import { db, WHATSAPP_NUMBER } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----------------------------------------------------------------------------
// الحالة العامة (State) للتطبيق
// ----------------------------------------------------------------------------
const state = {
  allHotels: [],       // كل الفنادق المُحمّلة من Firestore
  filteredHotels: [],  // الفنادق بعد تطبيق الفلاتر
  guestType: "egyptian", // egyptian | foreign — يتحكم في عرض السعر بالجنيه أو الدولار
  currentHotel: null,  // الفندق المفتوح حالياً داخل النافذة المنبثقة
  currentRooms: [],    // غرف الفندق المفتوح
  selectedRoom: null   // الغرفة المختارة للحجز
};

// عناصر DOM أساسية
const els = {
  hotelsGrid: document.getElementById("hotelsGrid"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  guestTypeToggle: document.getElementById("guestTypeToggle"),
  filterArea: document.getElementById("filterArea"),
  filterBeach: document.getElementById("filterBeach"),
  filterInclusion: document.getElementById("filterInclusion"),
  filterAqua: document.getElementById("filterAqua"),
  filterHeated: document.getElementById("filterHeated"),
  searchInput: document.getElementById("searchInput"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  resultsCount: document.getElementById("resultsCount"),

  modalOverlay: document.getElementById("hotelModalOverlay"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  modalBody: document.getElementById("modalBody")
};

// ============================================================================
// 1) تحميل الفنادق من Firestore
// ============================================================================
async function loadHotels() {
  toggleLoading(true);
  try {
    const hotelsRef = collection(db, "hotels");
    const q = query(hotelsRef, where("active", "==", true));
    const snapshot = await getDocs(q);

    state.allHotels = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    state.filteredHotels = [...state.allHotels];
    renderHotels(state.filteredHotels);
  } catch (err) {
    console.error("خطأ أثناء تحميل بيانات الفنادق:", err);
    els.hotelsGrid.innerHTML = `
      <div class="col-span-full text-center py-16 text-red-500">
        تعذّر تحميل بيانات الفنادق. تأكد من إعداد Firebase بشكل صحيح في js/firebase-config.js
      </div>`;
  } finally {
    toggleLoading(false);
  }
}

function toggleLoading(isLoading) {
  els.loadingState?.classList.toggle("hidden", !isLoading);
  els.hotelsGrid?.classList.toggle("hidden", isLoading);
}

// ============================================================================
// 2) عرض كروت الفنادق
// ============================================================================
function renderHotels(hotels) {
  els.hotelsGrid.innerHTML = "";

  if (!hotels.length) {
    els.emptyState.classList.remove("hidden");
    els.resultsCount.textContent = "0 نتيجة";
    return;
  }
  els.emptyState.classList.add("hidden");
  els.resultsCount.textContent = `${hotels.length} نتيجة`;

  const beachLabels = {
    sandy: "شاطئ رملي 🏖️",
    coral_jetty: "شاطئ مرجاني (Jetty) 🪸"
  };

  hotels.forEach(hotel => {
    const card = document.createElement("article");
    card.className = "hotel-card group cursor-pointer";
    card.dataset.id = hotel.id;

    const badges = [];
    if (hotel.aquaPark) badges.push("ألعاب مائية");
    if (hotel.heatedPool) badges.push("حمام سباحة مدفأ");

    card.innerHTML = `
      <div class="relative overflow-hidden rounded-2xl">
        <img src="${hotel.mainImage || "https://placehold.co/600x400?text=Sharm+Hotel"}"
             alt="${escapeHtml(hotel.name)}"
             class="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <span class="absolute top-3 right-3 bg-[var(--color-lagoon)]/95 text-white text-xs font-bold px-3 py-1 rounded-full">
          ${escapeHtml(hotel.area || "")}
        </span>
        ${hotel.rating ? `
        <span class="absolute bottom-3 right-3 bg-white/95 text-[var(--color-deep)] text-xs font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
          ★ ${hotel.rating}
        </span>` : ""}
      </div>
      <div class="pt-4">
        <h3 class="font-heading text-lg font-bold text-[var(--color-deep)] line-clamp-1">${escapeHtml(hotel.name)}</h3>
        <p class="text-sm text-slate-500 mt-1">${beachLabels[hotel.beachType] || ""}</p>
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${badges.map(b => `<span class="text-[11px] bg-[var(--color-sand-dark)] text-[var(--color-deep)] px-2 py-0.5 rounded-full">${b}</span>`).join("")}
        </div>
      </div>
    `;
    card.addEventListener("click", () => openHotelModal(hotel.id));
    els.hotelsGrid.appendChild(card);
  });
}

// ============================================================================
// 3) الفلترة والبحث
// ============================================================================
function applyFilters() {
  const area = els.filterArea.value;
  const beach = els.filterBeach.value;
  const inclusion = els.filterInclusion.value;
  const wantAqua = els.filterAqua.checked;
  const wantHeated = els.filterHeated.checked;
  const searchText = els.searchInput.value.trim().toLowerCase();

  state.filteredHotels = state.allHotels.filter(hotel => {
    if (area && hotel.area !== area) return false;
    if (beach && hotel.beachType !== beach) return false;
    if (inclusion && hotel.inclusionType !== inclusion) return false;
    if (wantAqua && !hotel.aquaPark) return false;
    if (wantHeated && !hotel.heatedPool) return false;
    if (searchText && !(hotel.name || "").toLowerCase().includes(searchText)) return false;
    return true;
  });

  renderHotels(state.filteredHotels);
}

function resetFilters() {
  els.filterArea.value = "";
  els.filterBeach.value = "";
  els.filterInclusion.value = "";
  els.filterAqua.checked = false;
  els.filterHeated.checked = false;
  els.searchInput.value = "";
  state.filteredHotels = [...state.allHotels];
  renderHotels(state.filteredHotels);
}

// ============================================================================
// 4) النافذة المنبثقة لتفاصيل الفندق + الحجز
// ============================================================================
async function openHotelModal(hotelId) {
  const hotel = state.allHotels.find(h => h.id === hotelId);
  if (!hotel) return;
  state.currentHotel = hotel;
  state.selectedRoom = null;

  els.modalBody.innerHTML = `<div class="py-20 text-center text-slate-400">جارِ تحميل تفاصيل الفندق...</div>`;
  els.modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // جلب غرف الفندق من الـ sub-collection
  const roomsSnap = await getDocs(collection(db, "hotels", hotelId, "rooms"));
  state.currentRooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderModal();
}

function renderModal() {
  const hotel = state.currentHotel;
  const beachLabels = {
    sandy: "شاطئ رملي مناسب للأطفال",
    coral_jetty: "شاطئ مرجاني مع مشاية (Jetty)"
  };
  const inclusionLabels = {
    comprehensive_all_inclusive: "شامل كلي (Comprehensive All-Inclusive)",
    soft_all_inclusive: "شامل مخفف (Soft All-Inclusive)",
    full_board: "إقامة كاملة",
    half_board: "نصف إقامة",
    bed_breakfast: "إفطار فقط"
  };

  els.modalBody.innerHTML = `
    <img src="${hotel.mainImage || "https://placehold.co/800x400"}" class="w-full h-64 object-cover rounded-t-2xl" />
    <div class="p-6 md:p-8">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="font-heading text-2xl font-extrabold text-[var(--color-deep)]">${escapeHtml(hotel.name)}</h2>
          <p class="text-slate-500 mt-1">${escapeHtml(hotel.area || "")} · ${beachLabels[hotel.beachType] || ""}</p>
        </div>
        ${hotel.rating ? `<span class="bg-[var(--color-sand-dark)] px-3 py-1 rounded-full text-sm font-bold text-[var(--color-deep)]">★ ${hotel.rating} (${hotel.reviewsCount || 0} تقييم)</span>` : ""}
      </div>

      <p class="text-slate-600 mt-4 leading-relaxed">${escapeHtml(hotel.description || "")}</p>

      <div class="flex flex-wrap gap-2 mt-4">
        <span class="badge-pill">${inclusionLabels[hotel.inclusionType] || ""}</span>
        ${hotel.aquaPark ? `<span class="badge-pill">ألعاب مائية</span>` : ""}
        ${hotel.heatedPool ? `<span class="badge-pill">حمام سباحة مدفأ شتاءً</span>` : ""}
        ${(hotel.amenities || []).map(a => `<span class="badge-pill">${escapeHtml(a)}</span>`).join("")}
      </div>

      <hr class="my-6 border-slate-200" />

      <!-- مفتاح تحديد الجنسية -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm font-bold text-[var(--color-deep)]">عرض الأسعار لـ:</span>
        <div class="inline-flex bg-slate-100 rounded-full p-1">
          <button type="button" data-guest="egyptian" class="guest-toggle-btn px-4 py-1.5 rounded-full text-sm font-bold transition ${state.guestType === "egyptian" ? "bg-[var(--color-coral)] text-white" : "text-slate-600"}">مصري / مقيم</button>
          <button type="button" data-guest="foreign" class="guest-toggle-btn px-4 py-1.5 rounded-full text-sm font-bold transition ${state.guestType === "foreign" ? "bg-[var(--color-coral)] text-white" : "text-slate-600"}">سائح أجنبي</button>
        </div>
      </div>

      <h3 class="font-heading font-bold text-lg text-[var(--color-deep)] mb-3">الغرف المتاحة</h3>
      <div id="roomsList" class="grid sm:grid-cols-2 gap-3">
        ${renderRoomsList()}
      </div>

      <div id="bookingFormWrap" class="hidden mt-8 pt-6 border-t border-slate-200"></div>
    </div>
  `;

  els.modalBody.querySelectorAll(".guest-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.guestType = btn.dataset.guest;
      renderModal();
    });
  });

  els.modalBody.querySelectorAll(".room-select-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const room = state.currentRooms.find(r => r.id === btn.dataset.roomId);
      state.selectedRoom = room;
      renderBookingForm();
    });
  });
}

function renderRoomsList() {
  if (!state.currentRooms.length) {
    return `<p class="text-slate-400 col-span-full">لا توجد غرف مضافة لهذا الفندق حالياً.</p>`;
  }
  return state.currentRooms.map(room => {
    const price = state.guestType === "egyptian" ? room.priceEgyptianEGP : room.priceForeignUSD;
    const currency = state.guestType === "egyptian" ? "ج.م" : "$";
    const disabled = room.available === false || (room.availableRooms ?? 1) <= 0;
    return `
      <div class="border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
        <p class="font-bold text-[var(--color-deep)]">${escapeHtml(room.roomType)}</p>
        <p class="text-xs text-slate-500">${escapeHtml(room.mealPlan || "")} · حتى ${room.maxOccupancy || 2} أفراد</p>
        <p class="text-[var(--color-coral)] font-extrabold text-lg">${price ?? "—"} ${currency} <span class="text-xs font-normal text-slate-400">/ الليلة</span></p>
        <button data-room-id="${room.id}" ${disabled ? "disabled" : ""}
          class="room-select-btn mt-1 w-full py-2 rounded-lg font-bold text-sm transition
            ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[var(--color-deep)] text-white hover:bg-[var(--color-lagoon)]"}">
          ${disabled ? "غير متاحة" : "اختيار هذه الغرفة"}
        </button>
      </div>
    `;
  }).join("");
}

// ============================================================================
// 5) نموذج بيانات الحجز
// ============================================================================
function renderBookingForm() {
  const wrap = document.getElementById("bookingFormWrap");
  wrap.classList.remove("hidden");
  const room = state.selectedRoom;
  const currency = state.guestType === "egyptian" ? "EGP" : "USD";
  const currencyLabel = state.guestType === "egyptian" ? "ج.م" : "$";
  const price = state.guestType === "egyptian" ? room.priceEgyptianEGP : room.priceForeignUSD;

  wrap.innerHTML = `
    <h3 class="font-heading font-bold text-lg text-[var(--color-deep)] mb-4">إتمام بيانات الحجز — ${escapeHtml(room.roomType)}</h3>
    <form id="bookingForm" class="grid sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2 grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">تاريخ الوصول</label>
          <input required type="date" name="checkIn" class="form-input" />
        </div>
        <div>
          <label class="form-label">تاريخ المغادرة</label>
          <input required type="date" name="checkOut" class="form-input" />
        </div>
      </div>
      <div>
        <label class="form-label">اسم النزيل</label>
        <input required type="text" name="guestName" class="form-input" placeholder="الاسم بالكامل" />
      </div>
      <div>
        <label class="form-label">رقم الهاتف / واتساب</label>
        <input required type="tel" name="guestPhone" class="form-input" placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label class="form-label">البريد الإلكتروني (اختياري)</label>
        <input type="email" name="guestEmail" class="form-input" placeholder="example@mail.com" />
      </div>
      <div>
        <label class="form-label">عدد الأفراد</label>
        <input required type="number" min="1" max="${room.maxOccupancy || 6}" value="2" name="guestsCount" class="form-input" />
      </div>

      <div id="priceSummary" class="sm:col-span-2 bg-[var(--color-sand)] rounded-xl p-4 text-sm text-slate-600">
        اختر تاريخ الوصول والمغادرة لحساب السعر الإجمالي.
      </div>

      <p id="bookingError" class="sm:col-span-2 text-red-500 text-sm hidden"></p>

      <button type="submit" class="sm:col-span-2 py-3 rounded-xl bg-[var(--color-coral)] text-white font-extrabold hover:opacity-90 transition">
        تأكيد الحجز وإرسال التفاصيل عبر واتساب
      </button>
    </form>
  `;

  const form = document.getElementById("bookingForm");
  const summaryEl = document.getElementById("priceSummary");

  function updateSummary() {
    const nights = computeNights(form.checkIn.value, form.checkOut.value);
    if (nights > 0) {
      const total = nights * price;
      summaryEl.innerHTML = `عدد الليالي: <b>${nights}</b> — السعر للّيلة: <b>${price} ${currencyLabel}</b> — الإجمالي: <b class="text-[var(--color-coral)] text-base">${total} ${currencyLabel}</b>`;
    } else {
      summaryEl.textContent = "اختر تاريخ الوصول والمغادرة لحساب السعر الإجمالي.";
    }
  }
  form.checkIn.addEventListener("change", updateSummary);
  form.checkOut.addEventListener("change", updateSummary);

  form.addEventListener("submit", (e) => submitBooking(e, room, price, currency));

  wrap.scrollIntoView({ behavior: "smooth", block: "start" });
}

function computeNights(checkInStr, checkOutStr) {
  if (!checkInStr || !checkOutStr) return 0;
  const inDate = new Date(checkInStr);
  const outDate = new Date(checkOutStr);
  const diff = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// ============================================================================
// 6) إرسال الحجز إلى Firestore + توليد رابط واتساب
// ============================================================================
async function submitBooking(e, room, unitPrice, currency) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("bookingError");
  errorEl.classList.add("hidden");

  const checkInStr = form.checkIn.value;
  const checkOutStr = form.checkOut.value;
  const nights = computeNights(checkInStr, checkOutStr);

  if (nights <= 0) {
    errorEl.textContent = "الرجاء اختيار تواريخ صحيحة (تاريخ المغادرة بعد تاريخ الوصول).";
    errorEl.classList.remove("hidden");
    return;
  }

  const totalPrice = nights * unitPrice;
  const referenceId = generateReferenceId();
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "جارِ إرسال الحجز...";

  const bookingData = {
    referenceId,
    hotelId: state.currentHotel.id,
    hotelName: state.currentHotel.name,
    roomId: room.id,
    roomType: room.roomType,
    guestName: form.guestName.value.trim(),
    guestPhone: form.guestPhone.value.trim(),
    guestEmail: form.guestEmail.value.trim() || null,
    guestType: state.guestType,
    guestsCount: Number(form.guestsCount.value) || 1,
    checkIn: Timestamp.fromDate(new Date(checkInStr)),
    checkOut: Timestamp.fromDate(new Date(checkOutStr)),
    nights,
    unitPrice,
    currency,
    totalPrice,
    status: "Pending",
    notes: "",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "bookings"), bookingData);
    openWhatsAppWithBooking(bookingData);
    closeModal();
  } catch (err) {
    console.error("خطأ أثناء إرسال الحجز:", err);
    errorEl.textContent = "حدث خطأ أثناء إرسال الحجز. حاول مرة أخرى.";
    errorEl.classList.remove("hidden");
    submitBtn.disabled = false;
    submitBtn.textContent = "تأكيد الحجز وإرسال التفاصيل عبر واتساب";
  }
}

// توليد رقم مرجعي فريد للحجز مثل: SSH-7K9F21
function generateReferenceId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SSH-${random}`;
}

function openWhatsAppWithBooking(booking) {
  const currencyLabel = booking.currency === "EGP" ? "ج.م" : "$";
  const lines = [
    `📌 حجز جديد — منصة شرم بوكينج`,
    `رقم الحجز المرجعي: ${booking.referenceId}`,
    `الفندق: ${booking.hotelName}`,
    `نوع الغرفة: ${booking.roomType}`,
    `الاسم: ${booking.guestName}`,
    `الهاتف: ${booking.guestPhone}`,
    `الوصول: ${formatDate(booking.checkIn)} — المغادرة: ${formatDate(booking.checkOut)}`,
    `عدد الليالي: ${booking.nights} — عدد الأفراد: ${booking.guestsCount}`,
    `الإجمالي: ${booking.totalPrice} ${currencyLabel}`,
    `الحالة: قيد المراجعة (Pending)`
  ];
  const text = encodeURIComponent(lines.join("\n"));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  window.open(url, "_blank");
}

function formatDate(timestampOrDate) {
  const d = timestampOrDate?.toDate ? timestampOrDate.toDate() : new Date(timestampOrDate);
  return d.toLocaleDateString("ar-EG");
}

// ============================================================================
// 7) أدوات مساعدة عامة
// ============================================================================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function closeModal() {
  els.modalOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  state.currentHotel = null;
  state.selectedRoom = null;
}

// ============================================================================
// 8) ربط الأحداث (Event Listeners) وتشغيل التطبيق
// ============================================================================
els.modalCloseBtn?.addEventListener("click", closeModal);
els.modalOverlay?.addEventListener("click", (e) => {
  if (e.target === els.modalOverlay) closeModal();
});
els.filterArea?.addEventListener("change", applyFilters);
els.filterBeach?.addEventListener("change", applyFilters);
els.filterInclusion?.addEventListener("change", applyFilters);
els.filterAqua?.addEventListener("change", applyFilters);
els.filterHeated?.addEventListener("change", applyFilters);
els.searchInput?.addEventListener("input", debounce(applyFilters, 250));
els.resetFiltersBtn?.addEventListener("click", resetFilters);

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener("DOMContentLoaded", loadHotels);
