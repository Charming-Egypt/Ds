# هيكل قاعدة بيانات Firestore — منصة حجوزات فنادق شرم الشيخ

المشروع يعتمد على **Cloud Firestore** (NoSQL). فيما يلي المجموعات (Collections) الرئيسية،
مع نوع كل حقل ومثال توضيحي بصيغة JSON.

---

## 1) Collection: `hotels`

كل مستند (Document) يمثل فندق واحد، ومعرّفه يتم توليده تلقائياً بواسطة Firestore (Auto-ID).

```json
{
  "name": "فندق الشاطئ الذهبي",
  "nameEn": "Golden Beach Resort",
  "area": "خليج نعمة",                 // إحدى: خليج نعمة | خليج نبق | خليج القرش | الهضبة | رأس أم السيد
  "beachType": "sandy",                 // sandy = رملي مناسب للأطفال | coral_jetty = مرجاني مع مشاية Jetty
  "heatedPool": true,                   // حمام سباحة مدفأ في الشتاء
  "aquaPark": true,                     // ألعاب مائية
  "inclusionType": "comprehensive_all_inclusive",
  // القيم الممكنة: comprehensive_all_inclusive | soft_all_inclusive | full_board | half_board | bed_breakfast
  "mainImage": "https://example.com/images/hotel1_main.jpg",
  "images": [
    "https://example.com/images/hotel1_1.jpg",
    "https://example.com/images/hotel1_2.jpg"
  ],
  "rating": 4.6,
  "reviewsCount": 812,
  "description": "منتجع يطل على البحر الأحمر مباشرة في قلب خليج نعمة...",
  "amenities": ["واي فاي مجاني", "سبا", "نادي أطفال", "غطس"],
  "location": { "lat": 27.9158, "lng": 34.3299 },
  "active": true,
  "createdAt": "Timestamp"
}
```

### Sub-collection: `hotels/{hotelId}/rooms`

كل مستند يمثل نوع غرفة داخل الفندق.

```json
{
  "roomType": "غرفة ديلوكس بإطلالة على البحر",
  "priceEgyptianEGP": 3200,     // السعر لليلة للمصريين/المقيمين بالجنيه المصري
  "priceForeignUSD": 145,       // السعر لليلة للأجانب بالدولار
  "mealPlan": "Comprehensive All-Inclusive",
  "maxOccupancy": 3,
  "availableRooms": 6,
  "available": true,
  "images": ["https://example.com/images/room1.jpg"]
}
```

> **ملاحظة تصميم:** تم استخدام sub-collection بدلاً من مصفوفة مضمّنة (array) داخل مستند
> الفندق حتى يسهل تحديث/حذف كل غرفة بشكل مستقل دون إعادة كتابة المستند بالكامل، ولإتاحة
> استعلامات مستقبلية (مثل: كل الغرف الأرخص من سعر معيّن عبر جميع الفنادق باستخدام
> Collection Group Query).

---

## 2) Collection: `bookings`

```json
{
  "referenceId": "SSH-284193",
  "hotelId": "abc123",
  "hotelName": "فندق الشاطئ الذهبي",
  "roomId": "room456",
  "roomType": "غرفة ديلوكس بإطلالة على البحر",
  "guestName": "أحمد محمد",
  "guestPhone": "+201001234567",
  "guestEmail": "ahmed@example.com",
  "guestType": "egyptian",           // egyptian | foreign
  "checkIn": "Timestamp(2026-09-10)",
  "checkOut": "Timestamp(2026-09-14)",
  "nights": 4,
  "unitPrice": 3200,
  "currency": "EGP",                 // EGP | USD (يُشتق تلقائياً من guestType)
  "totalPrice": 12800,
  "guestsCount": 2,
  "status": "Pending",               // Pending | Confirmed | Cancelled
  "notes": "",
  "createdAt": "Timestamp"
}
```

---

## 3) (اختياري) Collection: `admins`

لتقييد صلاحيات لوحة التحكم على مستخدمين محددين إن أردت التوسع مستقبلاً عبر Firestore
بدلاً من الاعتماد فقط على Firebase Authentication:

```json
{
  "email": "admin@sharm-booking.com",
  "role": "super_admin"
}
```

---

## فهارس مقترحة (Composite Indexes)

عند تفعيل الفلترة المتعددة (مثال: `area` + `aquaPark` + `heatedPool`) في استعلام واحد على
Firestore مباشرة (بدلاً من الفلترة في الواجهة كما هو مطبّق حالياً)، ستحتاج لإنشاء Composite
Index من تبويب *Firestore > Indexes* في الكونسول، وسيقترحه Firebase تلقائياً عند ظهور خطأ
`FAILED_PRECONDITION` في الـ Console أثناء التطوير.
