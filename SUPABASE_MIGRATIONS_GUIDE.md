# خطة تطبيق Migrations - Supabase Setup

## الملفات التي تم إنشاؤها ✅

```
supabase/migrations/
├── create_admin_tables.sql          (جداول جديدة)
├── update_existing_tables.sql       (تحديث الجداول الموجودة)
└── README.md                        (شرح مفصل)
```

## ملخص سريع ⚡

### ملف 1: `create_admin_tables.sql`
**الجداول المنشأة:**
- ✅ `admin_assignments` - تخصيص شركاء للمديرين الإقليميين
  - `admin_id` - معرف المدير
  - `partner_id` - معرف الشريك
  - `status` - الحالة (active/inactive)

- ✅ `admin_logs` - سجل الأنشطة
  - `admin_id` - معرف المدير
  - `action` - نوع الإجراء
  - `entity_type` - نوع الكيان
  - `entity_id` - معرف الكيان
  - `details` - تفاصيل JSON

**الميزات:**
- RLS policies مُفعَّلة
- Indexes لتحسين الأداء
- Foreign key constraints

---

### ملف 2: `update_existing_tables.sql`
**التحديثات على:**
1. **profiles table**
   - ✅ phone (الهاتف)
   - ✅ rating (التقييم للمندوبين)
   - ✅ completed_orders (الطلبات المكتملة)
   - ✅ total_earnings (إجمالي الأرباح)

2. **partners table**
   - ✅ name, email, phone (إذا مفقودة)
   - ✅ is_open (الحالة)

3. **orders table**
   - ✅ customer_name, partner_id, total, status
   - ✅ created_at timestamp

---

## خطوات التطبيق 📋

### الخيار 1️⃣: Supabase Studio (الأسهل)

1. اذهب لـ https://app.supabase.com
2. افتح مشروعك → **SQL Editor**
3. **New Query** → انسخ محتوى `create_admin_tables.sql` → **Run**
4. **New Query** → انسخ محتوى `update_existing_tables.sql` → **Run**
5. ✅ تم!

---

### الخيار 2️⃣: Command Line (نهائي)

```bash
# تطبيق الملفات تلقائياً
supabase db push

# أو يدوياً
supabase db execute -f supabase/migrations/create_admin_tables.sql
supabase db execute -f supabase/migrations/update_existing_tables.sql
```

---

## التحقق ✔️

بعد التطبيق، شغّل في SQL Editor:

```sql
-- تحقق من الجداول
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admin_assignments', 'admin_logs');

-- تحقق من أعمدة profiles
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' ORDER BY column_name;

-- تحقق من admin_assignments structure
\d admin_assignments
```

يجب أن ترى:
- ✅ جدول `admin_assignments` مع أعمدة: id, admin_id, partner_id, status
- ✅ جدول `admin_logs` مع أعمدة: id, admin_id, action, entity_type
- ✅ أعمدة جديدة في `profiles`: phone, rating, completed_orders, total_earnings

---

## الحالة الحالية 🎯

| الجدول | الوضع | ملاحظات |
|--------|-------|--------|
| admin_assignments | ✅ جاهز | تخصيص الشركاء للمديرين |
| admin_logs | ✅ جاهز | سجل الأنشطة |
| profiles | ✅ جاهز | تحديث الأعمدة الناقصة |
| partners | ✅ جاهز | تحديث الأعمدة الناقصة |
| orders | ✅ جاهز | تحديث الأعمدة الناقصة |

---

## الكود جاهز للاستخدام ✅

الكود الموجود في:
- `apps/partner/app/admin/page.tsx` - لوحة التحكم الرئيسية
- `apps/partner/app/admin/analytics/page.tsx` - التحليلات
- `apps/partner/app/admin/orders/page.tsx` - إدارة الطلبات
- `apps/partner/app/admin/users/page.tsx` - إدارة المستخدمين
- `apps/partner/app/admin/drivers/page.tsx` - إدارة المندوبين

**كل هذا يعتمد على الجداول الموجودة في Supabase الآن!**

---

## الخطوة التالية 🚀

بعد تطبيق Migrations:
1. اختبر لوحات التحكم
2. تحقق من أن البيانات تُحمّل صحيحاً
3. اختبر الفلاتر والبحث

أي مشاكل؟ ابدأ من **supabase/migrations/README.md**
