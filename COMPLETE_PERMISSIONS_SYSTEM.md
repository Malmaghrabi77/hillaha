# 🔐 نظام الصلاحيات الكامل - Hillaha Platform

**التاريخ**: 2026-02-28
**الإصدار**: 4.0
**الحالة**: ✅ مكتمل

---

## 📊 الأدوار والصلاحيات

### 🏆 **1. SUPER ADMIN (السوبر ادمن)**

#### الصلاحيات:
```
✅ إدارة النظام بالكامل
✅ إنشاء وإدارة جميع المستخدمين
✅ دعوة Regional Manager
✅ دعوة Partner مباشرة (بدون موافقة)
✅ الموافقة على دعوات Regular Admin
✅ الموافقة على دعوات Partner (من Regular Admin)
✅ عرض جميع الإحصائيات والتقارير
✅ إدارة العمولات والأسعار
✅ الوصول الكامل إلى جميع الأقسام
✅ عرض سجلات النشاط (Audit Logs)
✅ إدارة الإعدادات العامة
```

#### الصفحات/المسارات:
```
📍 /admin
   ├─ /admin/invite-admin → دعوة Regional Manager
   ├─ /admin/admin-management/approve-admins → موافقة على Regular Admin
   ├─ /admin/invite-partners → دعوة Partner مباشر
   ├─ /admin/approve-partners → موافقة دعوات الشركاء
   ├─ /admin/partners → عرض جميع الشركاء
   ├─ /admin/drivers → عرض جميع السائقين
   ├─ /admin/orders → عرض جميع الطلبات
   ├─ /admin/analytics → التحليلات الكاملة
   └─ /admin/admin-management/logs → سجلات النشاط
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة Regular Admin مباشرة (يجب Regional Manager يدعوهم)
❌ لا يمكنه تعيين Store Admin (فقط Partner)
```

---

### 🌍 **2. REGIONAL MANAGER (المدير الإقليمي)**

#### الصلاحيات:
```
✅ دعوة Regular Admin (في منطقته)
✅ دعوة Partner (في منطقته)
✅ الموافقة على دعوات Partner من Regular Admin
✅ عرض الشركاء والطلبات في منطقته
✅ عرض التحليلات والإحصائيات الخاصة به
✅ إدارة الشركاء المرتبطين به
✅ مراجعة الطلبات والمبيعات
✅ عرض أداء السائقين
✅ عرض تقارير الأداء
```

#### الصفحات/المسارات:
```
📍 /admin/admin-management
   ├─ /admin/admin-management/invite-regular-admin → دعوة Regular Admin
   ├─ /admin/admin-management/invite-partners-regional-manager → دعوة Partner
   ├─ /admin/admin-management/approve-partners-regional-manager → موافقة Partner
   ├─ /admin/partners → عرض الشركاء
   ├─ /admin/orders → عرض الطلبات
   ├─ /admin/analytics → التحليلات
   └─ /admin/drivers → عرض السائقين
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة Regional Manager آخر
❌ لا يمكنه الموافقة على دعوات Regular Admin (فقط Super Admin)
❌ لا يمكنه تعيين Store Admin
❌ لا يمكنه دعوة Partner من المناطق الأخرى
❌ لا يمكنه حذف Partner أو Regular Admin
```

---

### 👔 **3. REGULAR ADMIN (المدير العادي)**

#### الصلاحيات:
```
✅ دعوة Partner
✅ عرض الشركاء المرتبطين به
✅ عرض الطلبات والمبيعات
✅ عرض الإحصائيات الخاصة به
✅ مراجعة أداء الشركاء
✅ تقارير المبيعات
```

#### الصفحات/المسارات:
```
📍 /admin/admin-management
   ├─ /admin/admin-management/invite-partners-regular-admin → دعوة Partner
   ├─ /admin/partners → عرض الشركاء
   ├─ /admin/orders → عرض الطلبات
   ├─ /admin/analytics → التحليلات الخاصة به
   └─ /admin/drivers → عرض السائقين
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة أدمن آخر
❌ لا يمكنه الموافقة على أي دعوات
❌ لا يمكنه تعيين Store Admin
❌ لا يمكنه حذف أو تعديل الشركاء
❌ لا يمكنه الوصول إلى الإعدادات العامة
❌ لا يمكنه رؤية سجلات النشاط
```

---

### 🏢 **4. PARTNER (الشريك)**

#### الصلاحيات:
```
✅ عرض Dashboard الخاص به
✅ تعيين Store Admin (متعدد)
✅ عرض الطلبات الخاصة به
✅ عرض المبيعات والإحصائيات
✅ إدارة المتجر/الفرع
✅ عرض السائقين المرتبطين به
✅ إدارة قائمة المنتجات
✅ عرض الإشعارات
✅ عرض المحفظة والعمولات
✅ طلب السحب/التحويل
```

#### الصفحات/المسارات:
```
📍 /dashboard
   ├─ /dashboard/analytics → التحليلات والإحصائيات
   ├─ /dashboard/inventory → إدارة المخزون
   ├─ /dashboard/staff → إدارة الموظفين
   ├─ /dashboard/store-admin-management → إدارة مديري المتاجر
   ├─ /dashboard/notifications → الإشعارات
   ├─ /dashboard/orders → الطلبات
   ├─ /dashboard/sales → المبيعات
   └─ /dashboard/profile → ملفه الشخصي
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة شركاء آخرين
❌ لا يمكنه الموافقة على أي طلبات
❌ لا يمكنه حذف Store Admin إلا من لوحتنا
❌ لا يمكنه تعديل البيانات الأساسية للشريك
❌ لا يمكنه الوصول إلى النظام الإداري
❌ لا يمكنه رؤية بيانات شركاء آخرين
```

---

### 🏪 **5. STORE ADMIN (مدير المتجر)**

#### الصلاحيات:
```
✅ إدارة المتجر/الفرع الخاص به
✅ عرض الطلبات
✅ إدارة المخزون
✅ إدارة الموظفين (Staff)
✅ عرض الإحصائيات
✅ إدارة قائمة المنتجات
✅ عرض المبيعات
```

#### الصفحات/المسارات:
```
📍 /store
   ├─ /store/dashboard → Dashboard المتجر
   ├─ /store/orders → الطلبات
   ├─ /store/inventory → المخزون
   ├─ /store/staff → الموظفين
   └─ /store/analytics → الإحصائيات
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة أحد
❌ لا يمكنه إدارة شركاء آخرين
❌ لا يمكنه الموافقة على طلبات
❌ لا يمكنه تعديل بيانات الشريك الأم
❌ لا يمكنه حذف المتجر
❌ لا يمكنه رؤية متاجر أخرى
```

---

### 🚗 **6. DRIVER (السائق)**

#### الصلاحيات:
```
✅ عرض الطلبات المعينة له
✅ قبول/رفض الطلبات
✅ تحديث حالة الطلب
✅ عرض موقع التسليم
✅ عرض التقييمات
✅ عرض الأرباح
✅ عرض التاريخ
✅ الاتصال بالعميل
```

#### الصفحات/المسارات:
```
📍 /driver
   ├─ /driver/dashboard → Dashboard السائق
   ├─ /driver/orders → الطلبات النشطة
   ├─ /driver/history → السجل
   ├─ /driver/earnings → الأرباح
   └─ /driver/profile → الملف الشخصي
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة أحد
❌ لا يمكنه تعديل تفاصيل الطلب
❌ لا يمكنه إلغاء الطلبات
❌ لا يمكنه رؤية طلبات سائقين آخرين
❌ لا يمكنه الوصول إلى النظام الإداري
```

---

### 👤 **7. CUSTOMER (العميل)**

#### الصلاحيات:
```
✅ عرض المتاجر والمنتجات
✅ إنشاء الطلبات
✅ تتبع الطلبات
✅ تقييم الطلب والسائق
✅ عرض السجل
✅ تحديث بيانات الملف الشخصي
✅ إدارة العناوين
✅ إدارة طرق الدفع
✅ الاتصال بخدمة العملاء
```

#### الصفحات/المسارات:
```
📍 /customer
   ├─ /customer/home → الصفحة الرئيسية
   ├─ /customer/restaurants → المتاجر
   ├─ /customer/cart → السلة
   ├─ /customer/orders → الطلبات
   ├─ /customer/order/:id → تفاصيل الطلب
   ├─ /customer/profile → الملف الشخصي
   └─ /customer/help → الدعم
```

#### ما لا يمكنه:
```
❌ لا يمكنه دعوة أحد
❌ لا يمكنه تعديل الأسعار
❌ لا يمكنه رؤية طلبات عملاء آخرين
❌ لا يمكنه إلغاء الطلب بعد قبول السائق
❌ لا يمكنه الوصول إلى الإدارة
```

---

## 📋 جدول الصلاحيات المقارن

| الصلاحية | Super Admin | Regional Manager | Regular Admin | Partner | Store Admin | Driver | Customer |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| دعوة Regional Manager | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| دعوة Regular Admin | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| دعوة Partner | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| تعيين Store Admin | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| الموافقة على دعوات | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| عرض جميع البيانات | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ |
| تعديل الإعدادات | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| عرض التحليلات | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| إدارة الطلبات | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| إنشاء طلب | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**الرموز:**
- ✅ = يمكنه بالكامل
- ❌ = لا يمكنه
- ⚠️ = جزئياً (يرى خاصته فقط)

---

## 🔒 نموذج الأمان (RLS Policies)

### في قاعدة البيانات:

```sql
-- Super Admin يرى الكل
WHERE role = 'super_admin'

-- Regional Manager يرى خاصته + الشركاء المرتبطين
WHERE invited_by = auth.uid()
  OR (admin_type = 'regular_admin' AND invited_by_user IN his_subordinates)

-- Regular Admin يدعو فقط
WHERE role = 'admin' AND admin_type = 'regular_admin'

-- Partner يرى متاجره فقط
WHERE partner_id = auth.user.partner_id

-- Store Admin يرى متجره فقط
WHERE store_id = auth.user.store_id

-- Driver يرى طلباته فقط
WHERE driver_id = auth.uid()

-- Customer يرى طلباته فقط
WHERE customer_id = auth.uid()
```

---

## 🔀 خريطة الانتقالات (Transitions)

```
                    SUPER ADMIN
                        ↓
                   (دعوة مباشرة)
                        ↓
                REGIONAL MANAGER
                    ↙       ↘
            (دعوة)        (دعوة)
               ↓              ↓
        REGULAR ADMIN    → PARTNER
               ↓              ↓
            (دعوة)     (تعيين)
               ↓              ↓
              ???         STORE ADMIN
                             ↓
                         (يدير)
                             ↓
                          (متجره)
```

---

## ✨ التسلسل الهرمي

```
1️⃣ SUPER ADMIN (الأعلى صلاحية)
   └─ يدير كل شيء

2️⃣ REGIONAL MANAGER (إداري إقليمي)
   └─ يدير منطقته والمديرين العاديين والشركاء

3️⃣ REGULAR ADMIN (مدير عادي)
   └─ يدعو شركاء فقط

4️⃣ PARTNER (شريك/متجر)
   └─ يدير متجره وموظفيه ومديري متاجره

5️⃣ STORE ADMIN (مدير متجر فرعي)
   └─ يدير متجره الفرعي

6️⃣ DRIVER (سائق)
   └─ ينفذ الطلبات

7️⃣ CUSTOMER (عميل)
   └─ ينشئ ويتابع الطلبات
```

---

## 🎯 الحالات الخاصة

### حالة 1: Super Admin يدعو Regional Manager
```
✅ Super Admin → Invite → Regional Manager
│
└─ Regional Manager ينشئ حساب ويقبل الدعوة
```

### حالة 2: Regional Manager يدعو Regular Admin
```
✅ Regional Manager → Invite → Regular Admin
│
└─ Super Admin ← Approval Required
   ├─ ✅ Approve → Regular Admin ينشئ حساب
   └─ ❌ Reject → الدعوة تُحذف
```

### حالة 3: Admins يدعون Partner
```
✅ Super Admin → Direct Invite → Partner (مباشر)
   └─ Partner يستطيع التسجيل فوراً

✅ Regional Manager → Invite → Partner
   └─ Regional Manager يوافق → Partner يستطيع التسجيل

✅ Regular Admin → Invite → Partner
   └─ Super Admin أو Regional Manager يوافق → Partner يستطيع التسجيل
```

### حالة 4: Partner يعين Store Admin
```
✅ Partner → Assign → Store Admin
   └─ Store Admin:
      ├─ ينتظر التفعيل (اختياري)
      └─ يستطيع الدخول مباشرة
```

---

## 📊 عدد الصفحات حسب كل دور

| الدور | عدد الصفحات | النوع |
|------|------------|-------|
| Super Admin | 10+ | إداري |
| Regional Manager | 8 | إداري |
| Regular Admin | 6 | إداري |
| Partner | 8 | تشغيلي |
| Store Admin | 5 | تشغيلي |
| Driver | 5 | تشغيلي |
| Customer | 7 | تشغيلي |

---

## 🚀 الخطط المستقبلية

### الصلاحيات المخطط إضافتها:
```
⏳ Manager (مدير عام) - نسخة أقوى من Regional Manager
⏳ Finance Admin - للعمولات والمالية
⏳ Support Admin - لخدمة العملاء
⏳ QA Admin - للجودة والاختبار
⏳ Delivery Partner - شركة توصيل
```

---

## ✅ الخلاصة

| الميزة | الحالة |
|--------|--------|
| عدد الأدوار | 7 ادوار ✅ |
| نموذج أمان RLS | موجود ✅ |
| تسلسل هرمي واضح | موجود ✅ |
| صلاحيات محددة | موجودة ✅ |
| مسارات منفصلة | موجودة ✅ |
| توثيق شامل | موجود ✅ |

---

**الآن لديك نظام صلاحيات متكامل وشامل! 🎉**
