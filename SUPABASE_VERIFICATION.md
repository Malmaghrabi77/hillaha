# ✅ Supabase Verification Checklist

بعد تطبيق migration 003_complete_setup.sql مباشرة، شغّل هذه الـ queries في Supabase SQL Editor للتحقق:

---

## **Query 1: تحقق من Partners Table Columns**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'partners'
ORDER BY ordinal_position;
```

**يجب ترى هذه الأعمدة موجودة:**
- ✓ id
- ✓ user_id
- ✓ name
- ✓ name_ar ← **مهم**
- ✓ description_ar
- ✓ cover_image ← **مهم**
- ✓ category
- ✓ type
- ✓ address
- ✓ city
- ✓ logo_url
- ✓ is_open
- ✓ is_featured
- ✓ rating
- ✓ review_count
- ✓ delivery_time ← **مهم**
- ✓ delivery_fee ← **مهم**
- ✓ min_order ← **مهم**
- ✓ tags
- ✓ lat
- ✓ lng
- ✓ commission_rate
- ✓ created_at

---

## **Query 2: تحقق من Orders Status Check Constraint**

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%status%' OR constraint_name LIKE '%orders%';
```

أو بديل:

```sql
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'orders' AND constraint_type = 'CHECK';
```

**يجب ترى:**
- ✓ constraint يحتوي على: `pending, accepted, preparing, ready, picked_up, delivered, cancelled`

---

## **Query 3: تحقق من Order Timestamps**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name LIKE '%_at'
ORDER BY ordinal_position;
```

**يجب ترى:**
- ✓ created_at
- ✓ accepted_at ← **مهم**
- ✓ ready_at
- ✓ picked_up_at ← **مهم**
- ✓ delivered_at
- ✓ cancelled_at

---

## **اشاركني نتائج هذه الـ Queries:**

بعد تشغيل الـ 3 queries أعلاه، شاركني:
1. عدد columns في partners table
2. اسم الـ constraint للـ orders status
3. أسماء جميع timestamp columns

