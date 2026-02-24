# 📋 خطوات إصلاح Migrations - دليل دقيق

## **الوضع الحالي:**

1. **schema.sql** - يحتوي على CHECK constraint للـ statuses الصحيحة
2. **migration 003** - يفقد CHECK constraint!

## **الخطوات المطلوبة:**

### **Step 1: تحديث migration 003**

أضف هذا الـ SQL بعد CREATE TABLE orders:

```sql
-- Add CHECK constraint for status values
DO $$ BEGIN
  ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending','accepted','preparing','ready','picked_up','delivered','cancelled'));
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist
  NULL;
END $$;
```

### **Step 2: تطبيق على Supabase**

1. اذهب **https://app.supabase.com**
2. اختر project **hillaha-platform**
3. **SQL Editor** → new query
4. Copy-Paste كل محتوى `supabase/migrations/003_complete_setup.sql`
5. **Run**
6. إذا كان status column موجود بدون constraint، شغّل الـ DO block أعلاه

### **Step 3: تحديث schema.ts**

```typescript
// Change from (WRONG):
status: "pending" | "confirmed" | "preparing" | "delivering" | "done" | "cancelled";

// To (CORRECT):
status: "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
```

### **Step 4: التحقق**

```sql
-- في Supabase SQL Editor، شغّل:
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'partners'
ORDER BY ordinal_position;

-- يجب ترى: name_ar, cover_image, delivery_time, delivery_fee موجودة
```

---

**⚠️ تحذير:**
- لا تشغّل schema.sql (قديم وقد يمسح البيانات)
- استخدم migration 003 فقط + الإضافات أعلاه
- تحقق من partners columns قبل الاختبار
