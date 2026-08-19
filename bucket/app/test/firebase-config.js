// ============================================================================
// firebase-config.js
// إعداد وتهيئة Firebase — ضع بيانات مشروعك الخاصة هنا (من Firebase Console:
// Project Settings > General > Your apps > SDK setup and configuration)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ⚠️ استبدل القيم التالية ببيانات مشروعك الخاص في Firebase
const firebaseConfig = {
              apiKey: "AIzaSyDrkYUXLTCo4SK4TYWbNJfFLUwwOiQFQJI",
            authDomain: "egypt-travels.firebaseapp.com",
            databaseURL: "https://egypt-travels-default-rtdb.firebaseio.com",
            projectId: "egypt-travels",
            storageBucket: "egypt-travels.appspot.com"
        };

// تهيئة تطبيق Firebase
export const app = initializeApp(firebaseConfig);

// تهيئة قاعدة بيانات Firestore
export const db = getFirestore(app);

// تهيئة نظام المصادقة (يُستخدم في لوحة الإدارة admin.html)
export const auth = getAuth(app);

// ============================================================================
// إعدادات عامة للمنصة
// ============================================================================

// رقم واتساب الفندق/المنصة الذي سيتم إرسال تفاصيل الحجز إليه
// يجب أن يكون بالصيغة الدولية بدون علامة + وبدون مسافات، مثال مصر: 201001234567
export const WHATSAPP_NUMBER = "201000000000";

// خيارات مناطق شرم الشيخ المعتمدة في الفلاتر ونماذج الإدارة
export const SHARM_AREAS = [
  "خليج نعمة",
  "خليج نبق",
  "خليج القرش",
  "الهضبة",
  "رأس أم السيد"
];

// أنواع الشاطئ
export const BEACH_TYPES = {
  sandy: "شاطئ رملي (مناسب للأطفال)",
  coral_jetty: "شاطئ مرجاني (مع مشاية Jetty)"
};

// أنظمة الإقامة/الوجبات
export const INCLUSION_TYPES = {
  comprehensive_all_inclusive: "شامل كلي (Comprehensive All-Inclusive)",
  soft_all_inclusive: "شامل مخفف (Soft All-Inclusive)",
  full_board: "إقامة كاملة (Full Board)",
  half_board: "نصف إقامة (Half Board)",
  bed_breakfast: "إفطار فقط (Bed & Breakfast)"
};
