# 🔒 تطبيق إصلاح RLS في Supabase - نسخة مبسطة

## الخطوات السريعة:

### 1️⃣ اذهب إلى Supabase Dashboard
- URL: https://app.supabase.com
- اختر مشروع **Hillaha**

### 2️⃣ افتح SQL Editor
في الشريط الأيمن:
1. اختر **SQL Editor**
2. اضغط **+ New Query**

### 3️⃣ انسخ هذا الـ SQL:

```sql
-- Drop old insecure policy
DROP POLICY IF EXISTS "driver sees ready orders" ON public.orders;

-- Create new secure policy
CREATE POLICY "driver_can_see_assigned_and_available_orders" ON public.orders
  FOR SELECT
  USING (
    auth.uid() = driver_id
    OR
    (status = 'ready' AND driver_id IS NULL)
  );
```

### 4️⃣ اضغط **Run** (أو Ctrl+Enter)

### 5️⃣ تأكد من النجاح:
- في الشريط الأيمن، اختر **Authentication → Policies**
- اضغط على جدول **orders**
- يجب أن ترى السياسة الجديدة: `driver_can_see_assigned_and_available_orders`

---

## ✅ ماذا يتم إصلاحه:

| المشكلة | الحل |
|-------|------|
| المندوبون يرون جميع الطلبات الجاهزة | يرون فقط طلباتهم + طلبات بدون تعيين |
| تسرب بيانات المنافسين | عزل البيانات الآمن |
| عدم الامتثال للأمان | سياسة RLS صارمة |

---

## 🧪 اختبار السياسة:

بعد تطبيق الإصلاح:
1. اذهب إلى **Authentication → Users**
2. اختر أي مندوب (Driver)
3. سجل الدخول واختبر الوصول للطلبات

---

**حالة:** جاهز للتطبيق الفوري
