# Supabase Migrations للنظام الإداري

هذا المجلد يحتوي على SQL migrations لإعداد جداول Supabase المطلوبة لنظام لوحات المدعمين المحدثة.

## الملفات المتاحة

### 1. `create_admin_tables.sql`
ينشئ جداول جديدة:
- **admin_assignments**: تخصيص الشركاء للمديرين الإقليميين
- **admin_logs**: سجل الأنشطة الإدارية

### 2. `update_existing_tables.sql`
يضيف أعمدة ناقصة إلى الجداول الموجودة:
- **profiles**: phone, rating, completed_orders, total_earnings
- **partners**: name, email, phone, is_open
- **orders**: customer_name, partner_id, total, status, created_at

## خطوات التطبيق

### الطريقة 1: عبر Supabase Studio

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. انقر على **SQL Editor** من الشريط الجانبي
4. انقر على **New Query**
5. انسخ محتوى ملف `create_admin_tables.sql` والصق
6. انقر على **Run** (أو اضغط Ctrl+Enter)
7. كرر العملية مع `update_existing_tables.sql`

### الطريقة 2: باستخدام Supabase CLI

```bash
# من جذر المشروع
supabase db push

# أو تشغيل ملف واحد
supabase db execute -f supabase/migrations/create_admin_tables.sql
supabase db execute -f supabase/migrations/update_existing_tables.sql
```

### الطريقة 3: عبر psql (اتصال مباشر)

```bash
# احصل على اتصال URI من Supabase Settings > Database
psql "your-connection-string" -f supabase/migrations/create_admin_tables.sql
psql "your-connection-string" -f supabase/migrations/update_existing_tables.sql
```

## التحقق من التطبيق

بعد تطبيق الـ migrations، تحقق من:

```sql
-- تحقق من وجود الجداول الجديدة
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admin_assignments', 'admin_logs');

-- تحقق من wجود الأعمدة
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY column_name;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'admin_assignments'
ORDER BY column_name;
```

## جداول ضرورية إضافية (إذا مفقودة)

### partners table
```sql
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### orders table
```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  total DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## ملاحظات مهمة

1. **RLS (Row Level Security)**: تم تفعيل RLS على الجداول الجديدة. تأكد من أن الـ policies صحيحة
2. **الفهارس**: تم إضافة فهارس لتحسين الأداء على الأعمدة المستخدمة بشكل متكرر
3. **الأعمدة الموجودة**: الملف الثاني آمن للتشغيل عدة مرات (سيتجاهل الأعمدة الموجودة)

## استكشاف الأخطاء

### خطأ: "رسالة جدول غير موجود"
- تأكد من أن الجداول الأساسية (profiles, partners, orders) موجودة
- شغّل migration الملف الثاني أولاً

### خطأ: "رسالة عمود موجود بالفعل"
- استخدم `ADD COLUMN IF NOT EXISTS` (مضمن في ملفني)

### مشاكل RLS
- إذا حدثت مشاكل في الوصول، تحقق من الـ policies
- قد تحتاج لإضافة policies إضافية حسب احتياجاتك

## الدعم والأسئلة

إذا واجهت أي مشاكل، تحقق من:
- [Supabase Documentation](https://supabase.com/docs)
- [Migrations Guide](https://supabase.com/docs/guides/cli/managing-databases)
