# شرم بوكينج — منصة حجز فنادق شرم الشيخ (Firebase)

مشروع كامل جاهز للتشغيل: موقع حجز فنادق (B2C) + لوحة إدارة (Extranet)، مبني على
HTML5 + Tailwind CSS (CDN) + Vanilla JavaScript (ES Modules) + Firebase (Firestore + Auth).

## محتويات المشروع

```
sharm-booking/
├── index.html              # الموقع الرئيسي (بحث، فلترة، حجز)
├── admin.html              # لوحة الإدارة (extranet)
├── firestore.rules         # قواعد أمان Firestore
├── database-schema.md      # شرح تفصيلي لهيكل قاعدة البيانات
├── js/
│   ├── firebase-config.js  # تهيئة Firebase + إعدادات عامة (رقم واتساب، المناطق...)
│   ├── app.js               # منطق الموقع الرئيسي
│   └── admin.js              # منطق لوحة الإدارة
└── README.md
```

## خطوات التشغيل

### 1) إنشاء مشروع Firebase
1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com) وأنشئ مشروعاً جديداً.
2. فعّل **Cloud Firestore** (وضع الإنتاج Production mode).
3. فعّل **Authentication > Sign-in method > Email/Password**، ثم أنشئ حساب مسؤول واحد على
   الأقل من تبويب **Users** لاستخدامه في تسجيل الدخول إلى `admin.html`.
4. من **Project Settings > General > Your apps**، أضف تطبيق ويب (</> Web) وانسخ كائن
   `firebaseConfig`.

### 2) ربط المشروع بالكود
افتح `js/firebase-config.js` واستبدل القيم التجريبية بقيمك الحقيقية:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

وحدّث أيضاً رقم واتساب المنصة/الفندق:

```js
export const WHATSAPP_NUMBER = "201000000000"; // بالصيغة الدولية بدون + وبدون مسافات
```

### 3) رفع قواعد الأمان
انسخ محتوى `firestore.rules` إلى تبويب **Firestore Database > Rules** في الكونسول وانشره
(Publish)، أو باستخدام Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

### 4) إدخال البيانات
- افتح `admin.html` في المتصفح، سجّل الدخول بحساب المسؤول الذي أنشأته.
- أضف الفنادق أولاً من قسم "إضافة فندق جديد".
- بعد إضافة كل فندق، اختره من قائمة "إدارة الغرف والأسعار" وأضف أنواع الغرف وأسعارها
  (بالجنيه المصري للمصريين، وبالدولار للأجانب).

### 5) تشغيل الموقع
بما أن الكود يستخدم ES Modules (`type="module"`)، يجب تشغيله عبر خادم محلي وليس بفتح
الملف مباشرة (`file://`)، مثال:

```bash
npx serve .
# أو
python3 -m http.server 8080
```

ثم افتح `http://localhost:8080` (أو المنفذ الذي يظهر لك).

### 6) النشر (Hosting)
الكود جاهز للرفع مباشرة على **Firebase Hosting** أو **Netlify** دون أي تعديل، لأنه لا
يعتمد على أي عمليات بناء (Build step):

```bash
firebase init hosting   # اختر مجلد المشروع كـ public directory
firebase deploy --only hosting
```

## ملاحظات مهمة

- **الصور**: النظام يعتمد حالياً على روابط صور خارجية (URLs) تُدخلها يدوياً في لوحة
  الإدارة. لرفع صور مباشرة من جهازك، يمكن إضافة **Firebase Storage** لاحقاً وربطه بنفس
  النماذج.
- **حالة الحجز**: كل حجز جديد يُنشأ بحالة `Pending` تلقائياً حماية من تلاعب العميل
  (مفروضة أيضاً داخل `firestore.rules`)، وتُغيّرها الإدارة يدوياً إلى `Confirmed` أو
  `Cancelled` من لوحة التحكم بعد التأكد من الدفع/التوفر.
- **العملة**: السعر المعروض للعميل يتحدد تلقائياً حسب اختياره (مصري/أجنبي) داخل نافذة
  تفاصيل الفندق، ويُخزَّن في الحجز حقل `currency` يوضح العملة المستخدمة فعلياً.
