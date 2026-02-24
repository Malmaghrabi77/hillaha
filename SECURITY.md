# 🔒 دليل الأمان لمنصة حلّها

**تحذير:** هذا الملف يحتوي على معلومات حساسة عن الثغرات الأمنية.

---

## 🚨 الثغرات الأمنية الحالية

### ⚠️ الأولوية الأولى: مفاتيح مكشوفة

**الخطورة:** حرجة جداً

**الملفات:**
- `.env` (في الـ git history)
- `apps/*/env` (كل التطبيقات)

**المفاتيح المكشوفة:**
```
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XXXXXXXXXXXXXXXXXXXX
SUPABASE_SERVICE_ROLE_KEY=sb_secret_XXXXXXXXXXXXXXXXXXXXXX
```

**الخطوات الفورية:**
1. اذهب إلى Supabase Dashboard
2. API Settings → Rotate Keys
3. استخدم CI/CD secrets بدل .env
4. عمّل git history cleanup:
   ```bash
   # استخدم BFG Repo-Cleaner
   # أو git filter-branch
   git filter-branch -f --env-filter '
   if [ "$GIT_COMMIT" = "1721cf9" ]; then
     export GIT_AUTHOR_NAME="Cleaned"
     export GIT_AUTHOR_EMAIL="cleaned@hillaha.local"
   fi'
   ```

---

### ⚠️ الأولوية الثانية: Row Level Security مكسورة

**الملف:** `supabase/schema.sql` سطر 113

**المشكلة الحالية:**
```sql
create policy "driver sees ready orders" on public.orders for select
  using (status = 'ready' or auth.uid() = driver_id);
```

**الخطر:** أي driver يشوف **كل** الأوردرات الـ ready

**الحل الصحيح:**
```sql
-- اِحذف الـ policy الحالي
drop policy "driver sees ready orders" on public.orders;

-- واِعمل واحد صحيح
create policy "driver_can_see_assigned_orders" on public.orders for select
  using (
    auth.uid() = driver_id  -- يشوف طلبه بس
    or
    (status = 'ready' and driver_id is null)  -- فقط الطلبات غير المُسندة
  );

-- تأكد من RLS مفعّل
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
```

---

### 🔑 Password Storage بدون الأمان الكافي

**الملف:** `apps/customer/app/(auth)/login.tsx` سطر 65-66

**المشكلة:**
```typescript
await SecureStore.setItemAsync(STORE_PASS, password); // كلمة السر بالنص
```

**الحل:**
```typescript
// 1. لا تخزّن كلمة السر أبداً
// 2. ركّز على Biometric + Session Tokens

await SecureStore.setItemAsync("session_token", response.session.access_token);
await SecureStore.setItemAsync("refresh_token", response.session.refresh_token);

// عند الـ unlock من Biometric، استخدم refresh token لـ renew access token
```

---

### 🔓 No Input Validation

**الملفات:**
- `apps/customer/app/checkout.tsx` (العناوين مش معاملة بحذر)
- `apps/customer/app/services/*` (الملاحظات مش validated)
- `apps/driver/app/(tabs)/home.tsx` (orders API بدون validation)

**الحل:**
```typescript
// استخدم validation library
import { z } from "zod";

const CheckoutSchema = z.object({
  address: z.string().min(5).max(500),
  customerPhone: z.string().regex(/^01[0125]\d{8}$/), // Egyptian phone
  notes: z.string().optional().max(200),
});

try {
  const validated = CheckoutSchema.parse({
    address: userInput.address,
    customerPhone: userInput.phone,
    notes: userInput.notes,
  });
  // proceed with validated data
} catch (error) {
  // show validation errors
}
```

---

## 🛡️ التوصيات الأمنية

### 1. استخدم Environment Variables Properly

**❌ خطأ:**
```typescript
const API_KEY = "sk_test_123456"; // في الكود
```

**✅ صحيح:**
```typescript
// في .env (لا تُرفع في git)
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

// في الكود
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

---

### 2. فعّل RLS على كل جدول

```sql
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- تحقق:
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
```

---

### 3. استخدم HTTPS فقط

**Supabase:** ✅ بتستخدم HTTPS افتراضياً

**ملفات Upload:** ✅ التحقق من CORS

```typescript
// في supabase dashboard
Storage > Buckets >
  - avatars: CORS = allow https only
  - payment_proofs: CORS = allow https only
```

---

### 4. أضِف Rate Limiting

**الهدف:** منع Brute Force attacks

```typescript
// في Supabase Functions أو Middleware
import { RateLimiter } from "some-lib";

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per IP
});

app.post("/auth/login", limiter, async (req, res) => {
  // handle login
});
```

---

### 5. Audit Logging

**استخدم Supabase Audit Logs:**

```sql
-- Supabase automatically logs:
- Authentication events
- Database changes (if audit trigger enabled)
- API calls (with Supabase dashboard logging)

-- استعرض الـ logs:
SELECT
  id, action, table_name, old_record_id,
  new_record_id, change, created_at
FROM audit.audit_log
ORDER BY created_at DESC
LIMIT 100;
```

---

### 6. حماية من XSS

**في React Native:** ✅ Safe by default (نصوص معزولة)

**في Next.js (web):** استخدم DOMPurify

```typescript
import DOMPurify from "dompurify";

// عند عرض user-generated content
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userContent)
}} />
```

---

### 7. حماية من CSRF

**في Next.js API Routes:**

```typescript
// middleware
import csrf from "csurf";
import cookieParser from "cookie-parser";

export function csrfProtection(req, res, next) {
  // تحقق من CSRF token في كل POST/PUT/DELETE
}
```

---

### 8. Secrets Management

**للـ Production:**
```bash
# استخدم CI/CD secrets
GitHub Actions: Settings → Secrets

# أو KeyVault
- Azure Key Vault
- AWS Secrets Manager
- HashiCorp Vault

# ما تستخدم:
❌ .env files
❌ Hardcoded values
❌ Git commits
```

---

## 📋 Checklist

قبل النشر على الإنتاج:

- [ ] كل الـ credentials معه rotated
- [ ] `.env` ليست في `.gitignore` (و حُذفت من git history)
- [ ] RLS مفعّل على كل الجداول
- [ ] RLS policies معاملة بحذر
- [ ] Input validation على جميع الـ endpoints
- [ ] HTTPS مفعّل في كل مكان
- [ ] Error messages ما بتكشف معلومات حساسة
- [ ] Passwords never stored plaintext
- [ ] Logging مفعّل للأحداث المهمة
- [ ] Rate limiting مفعّل
- [ ] CORS مضبوط بشكل صحيح

---

## 🚨 Protocol للـ Security Incident

إذا اتهكر حساب أو حدثت breach:

1. **فوراً:** قطع الوصول
   ```bash
   # Disable API keys
   # Revoke all sessions
   ```

2. **في ساعة:** Notify affected users

3. **في يوم واحد:** Rotate all credentials

4. **في أسبوع:** Root cause analysis (RCA)

5. **في شهر:** Implementation of fixes

---

**آخر تحديث:** فبراير 2024
