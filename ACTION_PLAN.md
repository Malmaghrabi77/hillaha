# 📋 خطة العمل - Fix All Issues

**الحالة:** 26 مشكلة موثقة
**الأسبوع الأول:** تركيز على الـ 5 مشاكل الحرجة
**الهدف:** منصة آمنة وجاهزة للإنتاج

---

## 🔴 أسبوع 1 - إصلاح المشاكل الحرجة

### ✓ Task 1: تدوير مفاتيح Supabase

**المدة:** 1 ساعة

**الخطوات:**
1. اذهب إلى Supabase Dashboard
2. اختر الـ project
3. Settings → API
4. اضغط "Rotate Keys"
5. تأكد الـ applications تستخدم المفاتيح الجديدة
6. عدّل `.env.example` بدون الـ keys الفعلية

**بعد الانتهاء:**
```bash
git add .env.example SECURITY.md
git commit -m "docs: add security policies and rotate-keys reminder"
```

---

### ✓ Task 2: إصلاح حالة الطلب Status

**الملف:** `apps/partner/app/dashboard/orders/page.tsx`

**الخطوات:**

1. **افتح الملف:** سطر 16
2. **غيّر من:**
```typescript
type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";
```

**إلى:**
```typescript
type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
```

3. **حدّث الـ state machine:** سطور 66-71
```typescript
if (order.status === "pending") return "قيد الانتظار";
if (order.status === "accepted") return "مقبول ✓";
if (order.status === "preparing") return "جاري التحضير";
if (order.status === "ready") return "جاهز";
if (order.status === "picked_up") return "تم الاستلام";
if (order.status === "delivered") return "تم التسليم";
if (order.status === "cancelled") return "ملغى ✗";
```

4. **اختبر:**
```bash
cd apps/partner
pnpm dev
# حاول تحديث طلب من pending → accepted
```

---

### ✓ Task 3: إصلاح Search Query الأعمدة

**الملف:** `apps/customer/app/(tabs)/search.tsx`

**الخطوات:**

1. **سطر 50-51 - غيّر من:**
```typescript
.select("id, name_ar, category, rating, delivery_time, delivery_fee, cover_image, is_open")
```

**إلى:**
```typescript
.select("id, name_ar, category, rating, delivery_time, delivery_fee, cover_image")
// اِشيل is_open لأنها مش في partners table
```

2. **اختبر البحث:**
```bash
cd apps/customer
pnpm dev:customer
# ابدأ اكتب في البحث وشوف النتائج بدون errors
```

---

### ✓ Task 4: إصلاح RLS Policy للـ Driver

**الملف:** `supabase/schema.sql`

**الخطوات:**

1. **اذهب إلى Supabase SQL Editor**

2. **شغّل الـ query:**
```sql
-- اِحذف الـ policy القديم
DROP POLICY IF EXISTS "driver sees ready orders" ON public.orders;

-- ضيف الـ policy الجديد الآمن
CREATE POLICY "driver_can_see_own_orders" ON public.orders FOR SELECT
  USING (
    auth.uid() = driver_id  -- يشوف طلبه فحسب
    OR
    (status = 'ready' AND driver_id IS NULL)  -- طلبات غير مُسندة فقط
  );
```

3. **تحقق:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'orders';
```

---

### ✓ Task 5: إزالة كلمات السر من Storage

**الملف:** `apps/customer/app/(auth)/login.tsx`

**الخطوات:**

1. **سطر 65-66 - اِحذف:**
```typescript
// ❌ DELETE THIS:
await SecureStore.setItemAsync(STORE_PASS, password);
```

2. **ضيف بدلاً:**
```typescript
// استخدم Supabase session token بدل كلمة السر
if (data.session?.access_token) {
  await SecureStore.setItemAsync("session_token", data.session.access_token);
}
```

3. **عدّل Auto-Login:**
```typescript
// بدل استرجاع كلمة السر، استخدم session
const sessionToken = await SecureStore.getItemAsync("session_token");
if (sessionToken) {
  // تحقق من الـ token صالح
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    // User بقى logged in
  }
}
```

---

## 📋 Commit عند الانتهاء من الأسبوع الأول

```bash
cd /c/hillaha-platform
git add -A
git commit -m "fix(critical): resolve security & data consistency issues

- security: rotate Supabase credentials (update keys)
- fix: add missing order statuses (accepted, picked_up)
- fix: remove non-existent is_open column from search query
- fix: RLS policy now restricts drivers to own orders only
- security: remove plaintext password storage, use session tokens

These are critical fixes required before any production deployment.
- Partner app can now properly accept orders
- Driver can only see assigned orders
- Passwords no longer stored on device

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🟠 أسبوع 2 - إصلاح المشاكل العالية

### Task 6: إضافة Error Logging

```typescript
// استخدم Sentry
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
});

// في كل catch block:
} catch (error) {
  Sentry.captureException(error);
  logger.error("Specific error info", { context: "value" });
}
```

### Task 7: إصلاح getSB() Pattern

**بدل:**
```typescript
function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; }
}
```

**استخدم:**
```typescript
import { getSupabase } from "@hillaha/core";
const supabase = getSupabase();
if (!supabase) throw new Error("Supabase not initialized");
```

### Task 8: إضافة Input Validation

```typescript
import { z } from "zod";

const checkoutSchema = z.object({
  address: z.string().min(5).max(500),
  phone: z.string().regex(/^01[0125][0-9]{8}$/),
  notes: z.string().max(200).optional(),
});

// في handleCheckout:
const validated = checkoutSchema.parse({
  address: form.address,
  phone: form.phone,
  notes: form.notes,
});
```

### Task 9: نقل Type Definitions إلى Core

**المشروع:** `packages/core/src/types.ts`

```typescript
export interface Order {
  id: string;
  customerId: string;
  partnerId: string;
  status: "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
  totalAmount: number;
  createdAt: Date;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  // ...
}
```

---

## 🟡 أسبوع 3 - إصلاح المشاكل المتوسطة

### Task 10: إضافة Pagination

**في Driver Home:**
```typescript
const [page, setPage] = useState(0);
const pageSize = 20;

const { data } = await supabase
  .from("orders")
  .select("*")
  .eq("status", "ready")
  .order("created_at", { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### Task 11: حذف Build Artifacts من Git History

```bash
# استخدم BFG Repo-Cleaner
bfg --delete-folders ".next"

# أو git filter-branch
git filter-branch -f --tree-filter 'rm -rf apps/partner/.next' --prune-empty HEAD

# ثم
git push --force-with-lease
```

### Task 12: توحيد الألوان والمكونات

**المشروع:** `packages/ui/src/theme.ts`

```typescript
export const COLORS = {
  primary: "#7C3AED",
  primarySoft: "#EDE9FE",
  secondary: "#EC4899",
  // ... etc
};

export const Button = ({ children, variant = "primary", ...props }) => {
  const colors = variant === "primary" ? COLORS.primary : COLORS.secondary;
  // ...
};
```

---

## 📊 تتبع التقدم

| الأسبوع | المهام | الحالة |
|--------|-------|--------|
| الأول | مشاكل حرجة (5) | 🔴 قيد الانتظار |
| الثاني | مشاكل عالية (8) | 🔴 قيد الانتظار |
| الثالث | مشاكل متوسطة (8) | 🔴 قيد الانتظار |
| الرابع | Testing + Deployment | 🔴 قيد الانتظار |

---

## ✅ قبل النشر على الإنتاج

```bash
# 1. اختبرات
pnpm lint

# 2. البناء
pnpm --filter hillaha-customer build
pnpm --filter hillaha-driver build
pnpm --filter hillaha-services-worker build
pnpm --filter hillaha-partner build
pnpm --filter hillaha-web build

# 3. اختبر يدوي
- Customer: تسجيل دخول + بحث + شراء
- Driver: تسجيل دخول + قبول طلب
- Services-Worker: تسجيل دخول + قبول خدمة
- Partner: تسجيل دخول + قبول طلب
- Web: تصفح + اتصال

# 4. الأمان
- تحقق من عدم وجود .env في git
- تحقق من RLS مفعّل
- تحقق من passwords لا يتم تخزينها

# 5. الأداء
- اختبر على اتصال بطيء
- اختبر مع آلاف الـ records
```

---

**الهدف النهائي:** منصة حلّها آمنة، مستقرة، وجاهزة للملايين من المستخدمين
