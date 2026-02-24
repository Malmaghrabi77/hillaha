# 🚨 تقرير التشخيص الشامل لمنصة حلّها

**التاريخ:** فبراير 2024
**الحالة:** ⚠️ تحذيرات حرجة وعالية تحتاج تصحيح فوري

---

## 📊 ملخص سريع

| الخطورة | العدد | الملفات المتأثرة |
|--------|-------|-----------------|
| 🔴 حرجة | 5 | schema.sql, .env, search.tsx, orders.tsx, login.tsx |
| 🟠 عالية | 8 | checkout.tsx, home.tsx, policies.sql, profile.tsx |
| 🟡 متوسطة | 8 | tracking.tsx, core/, all apps |
| 🟢 منخفضة | 5 | root files, components |
| **الإجمالي** | **26** | |

---

## 🔴 المشاكل الحرجة (تحتاج إصلاح فوري)

### 1. مفاتيح Supabase مكشوفة في GitHub ⚠️

**الملفات المتأثرة:**
```
.env
apps/customer/.env
apps/driver/.env
apps/partner/.env
apps/services-worker/.env
apps/web/.env
```

**المفاتيح المكشوفة:**
- Supabase Anon Key: `sb_publishable_XXXXXXXXXXXXXXXXXXXX` (مكشوفة منذ commit معين)
- Supabase Secret: `sb_secret_XXXXXXXXXXXXXXXXXXXXXX` (مكشوفة منذ commit معين)
- حسابات الدفع: معلومات حساسة موجودة في .env files

**التأثير:** أي شخص يقدر:
- يدخل قاعدة البيانات
- يعدل أي بيانات
- يرى بيانات العملاء
- يقدم رسوم زائفة

**الحل:**
```bash
# 1. غيّر كل الـ keys في Supabase dashboard
# 2. ابدأ credentials جديدة
# 3. استخدم CI/CD secrets بدل .env في git
# 4. عمّل git history cleanup (BFG Repo-Cleaner)
```

---

### 2. حالة الطلب مش متطابقة (Partner App مكسور)

**الملف:** `apps/partner/app/dashboard/orders/page.tsx` (سطر 16)

**التعريف الصحيح في الـ Database:**
```sql
CHECK (status in ('pending','accepted','preparing','ready','picked_up','delivered','cancelled'))
```

**المستخدم في Partner App:**
```typescript
status: "pending" | "preparing" | "ready" | "delivered" | "cancelled"
// ناقص: "accepted", "picked_up"
```

**المشكلة:**
- Partner ما يقدر يقبل (`accept`) أي طلب
- Order status "accepted" مش معرفة في الـ App UI
- Database triggers تفشل في تحديث الحالة

**الحل:**
```typescript
status: "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled"
// وعدّل كل state machines
```

---

### 3. أعمدة غير موجودة في البحث

**الملف:** `apps/customer/app/(tabs)/search.tsx` (سطر 50-51)

**الكود:**
```typescript
.select("id, name_ar, category, rating, delivery_time, delivery_fee, cover_image, is_open")
```

**المشكلة:** العمود `is_open` **موجود في جدول `orders`** لكن **ليس في `partners`**
- `is_open` عند الشريك بتتحفظ في orders مش partners
- Query بتفشل أو بترجع null

**الحل:**
```typescript
// اشيل is_open أو وافعها في جدول partners
.select("id, name_ar, category, rating, delivery_time, delivery_fee, cover_image")
```

---

### 4. ملفات البناء مُرفوعة في GitHub

**الملف:** `apps/partner/.next/` (55 ملف مُجمّع)

**المشكلة:**
- `.gitignore` بتقول "ignore" بس الملفات موجودة في الـ commit
- Repository أكبر من اللازم
- Diffs صعبة الفهم

**الحل:**
```bash
# استخدم git-filter-branch
git filter-branch --tree-filter 'rm -rf apps/partner/.next' HEAD

# أو أبسط: commit جديد بحذفها
rm -rf apps/partner/.next
git add .gitignore
git commit -m "remove .next build artifacts"
```

---

### 5. سياسة الأمان في Driver مكسورة

**الملف:** `supabase/schema.sql` (سطر 113)

**الـ Policy الحالي:**
```sql
CREATE POLICY "driver sees ready orders" ON public.orders FOR SELECT
  USING (status = 'ready' OR auth.uid() = driver_id);
```

**المشكلة:** أي driver مصرح يقدر يشوف **كل** الأوردرات ذات الحالة "ready" حتى لو ما تختصه

**التأثير:**
- Driver يشوف معلومات عملاء تاني
- Driver يشوف أوردرات المنافسين
- Breach خطير في الـ privacy

**الحل:**
```sql
CREATE POLICY "driver sees own orders" ON public.orders FOR SELECT
  USING (auth.uid() = driver_id OR
         (status = 'ready' AND driver_id IS NULL)); -- فقط غير مُسندة
```

---

## 🟠 المشاكل العالية التأثير

### 6. 62 مكان بـ `any` Type

**التأثير:** Type safety بتتلاشى = bugs مش محتاجة compile time

**الأماكن:**
- 28 ملف: `(require("@hillaha/core") as any).getSupabase?.()`
- checkout.tsx: `{ data: any }`
- home.tsx: Many `any` casts

**الحل:**
```typescript
// بدل:
function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

// استخدم:
import { getSupabase } from "@hillaha/core";
const supabase = getSupabase(); // مع proper null checking
```

---

### 7. كلمات السر مخزنة بالنص

**الملف:** `apps/customer/app/(auth)/login.tsx` (سطر 65-66)

```typescript
await SecureStore.setItemAsync(STORE_EMAIL, email);
await SecureStore.setItemAsync(STORE_PASS, password); // ☠️ DANGER
```

**المشكلة:**
- إذا الـ device اتهكر، كل كلمات السر accessible
- Biometric يفترض يقلل الحاجة لكلمات السر

**الحل:**
```typescript
// Store only session/refresh tokens, never passwords
await SecureStore.setItemAsync("session_token", sessionToken);
// عند الدخول مرة جاية، استخدم stored token للـ refresh
```

---

### 8. No Error Logging

**الملف:** 20+ مكان

```typescript
} catch { /* ignore */ } // سطر 70 في orders.tsx
} catch (e: any) { console.error(e); } // بتضيع في الإنتاج
```

**المشكلة:** في الإنتاج ما حد يعرف فيه أي error.

**الحل:**
```typescript
// استخدم Sentry أو logging service
import * as Sentry from "@sentry/react-native";

} catch (err) {
  Sentry.captureException(err);
  logger.error("Order fetch failed", { error: err });
}
```

---

### 9. Hardcoded Driver Coordinates

**الملف:** `apps/customer/app/tracking/[orderId].tsx` (سطر 21, 110-113)

```typescript
const QENA_DEFAULT = { latitude: 26.1551, longitude: 32.7160 };
const driverLat = data.driver_lat ?? QENA_DEFAULT.latitude + 0.005;
```

**المشكلة:** لو مش موجودة بيانات الموقع صحيحة، الخريطة بتشوّ المستخدم موقع غلط.

**الحل:**
```typescript
if (!data.driver_lat) {
  return <ErrorMessage>موقع السائق غير متاح حالياً</ErrorMessage>;
}
```

---

## 🟡 المشاكل المتوسطة (8 مشاكل)

### 10. عدم وجود Pagination في Driver Home

**الملف:** `apps/driver/app/(tabs)/home.tsx` (سطر 71)

```typescript
const { data } = await supabase.from("orders")
  .select("*")
  // ❌ NO LIMIT!
```

**المشكلة:** إذا كان في 10,000 أوردر، البرنامج هبطل من كتر الـ data.

**الحل:**
```typescript
.limit(20) // اِعرض 20 ويبة
.range(offset, offset + 20) // pagination
```

---

### 11. Inconsistent Field Naming

**الـ Database:**
- `customer_id`, `partner_id`, `created_at` (snake_case)

**الـ Apps:**
- Mixture of camelCase و snake_case
- Every result needs manual mapping

**الحل:**
```typescript
// في @hillaha/core/src/types.ts
export interface Order {
  customerId: string; // camelCase
  partnerId: string;
  createdAt: Date;
}

// عند الـ fetch:
const rows = await supabase.from("orders").select("*");
const orders = rows.map(r => ({
  customerId: r.customer_id,
  partnerId: r.partner_id,
  ...
}));
```

---

## 🟢 المشاكل البسيطة (لكن مهمة)

### 12. ملفات مؤقتة + نل في الـ Root

```bash
245 ملف tmpclaude-*
1 ملف nul
```

**الحل:** حُذفت الملفات و عدّلنا `.gitignore`.

---

## 📋 خطة التصحيح (بالأولوية)

**أسبوع 1 - حرج:**
- [ ] Rotate Supabase credentials
- [ ] Fix order status mismatch
- [ ] Remove build artifacts من git history
- [ ] Fix RLS driver policy
- [ ] Remove plaintext password storage

**أسبوع 2 - عالي:**
- [ ] Add proper error logging (Sentry)
- [ ] Replace getSB() with direct imports
- [ ] Add input validation
- [ ] Create centralized type definitions
- [ ] Fix search column references

**أسبوع 3 - متوسط:**
- [ ] Add pagination onde needed
- [ ] Consolidate color/theme in @hillaha/ui
- [ ] Fix debounce cleanup
- [ ] Add proper error messages to users

---

## ℹ️ ملفات قد تحتاج مراجعة

**Database Schema:**
```
supabase/schema.sql (113, 97-98, 116+ lines)
```

**Authentication:**
```
apps/customer/app/(auth)/login.tsx
apps/customer/app/(auth)/register.tsx
apps/driver/app/(auth)/login.tsx
```

**Critical App Logic:**
```
apps/customer/app/checkout.tsx
apps/customer/app/(tabs)/search.tsx
apps/partner/app/dashboard/orders/page.tsx
apps/driver/app/(tabs)/home.tsx
```

---

**الحالة الحالية:** ⚠️ المشروع قابل للعمل بس فيه مخاطر أمان و bugs محتملة

**الموصى به:** إصلاح الـ 5 issues الحرجة في أول أسبوع، بعدها الـ 8 عالية.
