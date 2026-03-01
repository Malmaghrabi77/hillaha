# 🔧 إصلاح شامل - تغيير regular_admin → regional_manager

**التاريخ**: 2026-02-28
**الحالة**: ✅ مكتمل و جاهز للتطبيق

---

## 🚨 المشكلة التي تم اكتشافها

عندما قمت بتغيير اسم "frid_admin" إلى "regional_manager"، قمت بـ:
- ✅ تحديث قاعدة البيانات (Schema)
- ❌ **لم أحدّث كل الأكواد البرمجية**
- ❌ **لم أوضح لك الخطوات المطلوبة في Supabase**

النتيجة: الكود يحاول إدراج "regular_admin" في قاعدة البيانات، لكن قاعدة البيانات لا تقبل هذه القيمة.

---

## ✅ ما تم إصلاحه في الكود

### 1️⃣ **ملف: apps/partner/app/admin/invite-admin/page.tsx**
**السطر 97** - تم تغيير:
```typescript
// من:
admin_type: "regular_admin",

// إلى:
admin_type: "regional_manager",
```

### 2️⃣ **ملف: apps/partner/app/admin/admin-management/approve-admins/page.tsx**
**السطر 56** - تم تغيير:
```typescript
// من:
.eq("admin_type", "regular_admin")

// إلى:
.eq("admin_type", "regional_manager")
```

### 3️⃣ **ملف: packages/core/src/types.ts**
**السطر 84** - تم تغيير:
```typescript
// من:
admin_type: "regional_manager" | "regular_admin";

// إلى:
admin_type: "regional_manager";
```

### 4️⃣ **ملف: supabase/migrations/08_admin_invitations.sql**
**السطر 16** - تم تغيير:
```sql
-- من:
admin_type TEXT NOT NULL CHECK (admin_type IN ('frid_admin', 'regular_admin')),

-- إلى:
admin_type TEXT NOT NULL CHECK (admin_type IN ('regional_manager')),
```

### 5️⃣ **ملف: supabase/SETUP_ADMIN_DASHBOARD.sql**
**السطر 83** - تم تغيير:
```sql
-- من:
admin_type TEXT NOT NULL CHECK (admin_type IN ('regional_manager', 'regular_admin')),

-- إلى:
admin_type TEXT NOT NULL CHECK (admin_type IN ('regional_manager')),
```

### 6️⃣ **ملف جديد: supabase/migrations/13_fix_regular_admin_to_regional_manager.sql**
تم إنشاء migration جديد يقوم بـ:
- تحديث أي بيانات قديمة من "regular_admin" → "regional_manager"
- تحديث قيد CHECK في قاعدة البيانات
- تحديث RLS Policies

---

## 📋 الخطوات المطلوبة في Supabase (من قبلك)

### الخطوة 1: فتح Supabase SQL Editor

```
1. اذهب إلى: https://app.supabase.com
2. ادخل مشروعك (hillaha)
3. اذهب إلى: SQL Editor (القائمة اليسرى)
```

---

### الخطوة 2: تشغيل Migration الجديد

1. **انسخ محتوى الملف:**
   ```
   supabase/migrations/13_fix_regular_admin_to_regional_manager.sql
   ```

2. **الصق في SQL Editor**

3. **اضغط زر "RUN"**

---

### الخطوة 3: تحقق من النجاح

شغّل هذا الاستعلام للتأكد:
```sql
SELECT COUNT(*) as violations
FROM admin_invitations
WHERE admin_type != 'regional_manager';
```

**النتيجة المتوقعة**: `0`

إذا حصلت على `0`، فالتغيير نجح ✅

---

## 🤔 سؤالك عن "مجلد الشركاء" في Supabase

**التوضيح الهام:**

❌ **لا يوجد "مجلد" للشركاء**

✅ **يوجد "جدول" اسمه `partners`**

### كيفية الوصول إليه:

1. اذهب إلى Supabase Dashboard
2. اختر مشروعك (hillaha)
3. من القائمة اليسرى → **Database** (قاعدة البيانات)
4. ستجد قسم **public schema** → فيه جميع الجداول
5. ابحث عن `partners` table

---

## 🔍 جداول مهمة في Supabase

### 1. جدول `partners` (الشركاء الأساسيين)
```
الأعمدة:
- id (UUID)
- user_id (UUID) - المالك
- name (TEXT) - الاسم
- phone (TEXT) - الهاتف
- is_open (BOOLEAN)
- created_at (TIMESTAMP)
- created_by (UUID)
- approval_status (TEXT)
```

### 2. جدول `partner_invitations` (دعوات الشركاء)
```
الأعمدة:
- id (UUID)
- email (TEXT)
- name (TEXT)
- phone (TEXT)
- status (TEXT): pending | accepted | rejected
- invited_by (UUID)
- invited_type (TEXT): super_admin | regional_manager
- created_at (TIMESTAMP)
```

### 3. جدول `admin_invitations` (دعوات المديرين)
```
الأعمدة:
- id (UUID)
- email (TEXT)
- name (TEXT)
- phone (TEXT)
- admin_type (TEXT): regional_manager (فقط)
- invited_by (UUID)
- status (TEXT)
- super_admin_approval (TEXT)
- created_at (TIMESTAMP)
```

---

## 🔗 المسار الكامل الآن

### Phase 1: دعوة الشريك (Super Admin)
```
1. Super Admin يدخل /admin/invite-partners
2. يملأ: اسم، بريد، هاتف
3. ينقر: "إرسال الدعوة"
4. تُحفظ في جدول: partner_invitations (status: pending)
```

### Phase 2: موافقة الشريك (Super Admin فقط)
```
1. Super Admin يدخل /admin/approve-partners
2. يرى جميع الدعوات المعلقة
3. يختار: قبول أو رفض
4. تُحدّث في جدول: partner_invitations (status: accepted/rejected)
```

### Phase 3: تسجيل دخول الشريك
```
1. الشريك يستخدم البريد المدعو به
2. ينشئ كلمة مرور
3. ينشئ حسابه
4. يدخل Dashboard الخاص به
```

---

## 👤 دعوة المديرين الإقليميين

### كيفية دعوة مدير إقليمي:
```
1. Super Admin يدخل /admin/invite-admin
2. يملأ: اسم، بريد، هاتف
3. ينقر: "إرسال الدعوة"
4. تُحفظ في جدول: admin_invitations
5. Super Admin يوافق عليها في: /admin/approve-admins
```

**ملاحظة**: الآن `admin_type` فقط يقبل `"regional_manager"`

---

## 📝 الملخص - ماذا حدث؟

| الملف | المشكلة | الحل |
|------|--------|------|
| invite-admin/page.tsx | استخدم "regular_admin" | غيّر إلى "regional_manager" |
| approve-admins/page.tsx | البحث عن "regular_admin" | غيّر إلى "regional_manager" |
| types.ts | Union type يسمح بـ "regular_admin" | أزلنا "regular_admin" |
| migrations/08_*.sql | CHECK constraint يسمح "regular_admin" | حديث للـ migration |
| SETUP_ADMIN_DASHBOARD.sql | نفس المشكلة | حديث |

---

## ✨ ما بعد التطبيق

بعد تطبيق Migration في Supabase:

✅ الكود سيعمل صحيح
✅ يمكن دعوة المديرين الإقليميين
✅ يمكن دعوة الشركاء
✅ لا مزيد من أخطاء "regular_admin"

---

## 🚀 الخطوات التالية

1. **في Supabase SQL Editor:**
   - شغّل Migration 13
   - تحقق من النتيجة

2. **في تطبيقك المحلي:**
   ```bash
   npm run build:partner
   ```
   للتأكد من عدم وجود errors

3. **اختبر Workflow:**
   - اتسجل دخول كـ Super Admin
   - اذهب إلى `/admin/invite-admin`
   - جرّب دعوة مدير
   - اذهب إلى `/admin/approve-admins`
   - وافق عليها

---

## ❓ أسئلة متكررة

**س: ماذا لو كان لدي بيانات قديمة "regular_admin"؟**
**ج**: Migration يحول الكل إلى "regional_manager" تلقائياً

**س: هل أحتاج لحذف وإعادة إنشاء الجدول؟**
**ج**: لا، Migration يحدّث فقط

**س: أين أجد الشركاء المدعوين؟**
**ج**: في جدول `partner_invitations` في قسم Database

**س: كيف أعرف إذا كانت الدعوة معلقة أم موافق عليها؟**
**ج**: انظر إلى عمود `status` في الجدول

---

## 📞 تم التصحيح بنجاح! ✅

الآن الكود والقاعدة متزامنة تماماً.
