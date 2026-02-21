# حلّها — دليل النشر (Deployment Guide)

## المتطلبات الأساسية

| الأداة | الإصدار |
|--------|---------|
| Node.js | 20+ |
| pnpm | 10+ |
| Expo CLI / EAS CLI | أحدث إصدار |
| Vercel CLI | أحدث إصدار |
| Supabase CLI (اختياري) | أحدث إصدار |

---

## 1. إعداد Supabase

### تشغيل Schema

1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor** → **New Query**
4. انسخ محتوى `supabase/schema.sql` والصقه ثم نفّذه

### تفعيل Realtime

1. اذهب إلى **Database → Replication**
2. فعّل Realtime على جدول **`orders`**

---

## 2. نشر الموقع التسويقي (apps/web)

### عبر Vercel Dashboard

1. ادخل [vercel.com](https://vercel.com) → **New Project** → Import Git Repository
2. اختر المستودع وعيّن **Root Directory** = `apps/web`
3. أضف متغيرات البيئة:
   ```
   NEXT_PUBLIC_SITE_URL=https://hillaha.com
   ```
4. انقر **Deploy**

### عبر CLI (سريع)

```bash
cd apps/web
npx vercel --prod
```

---

## 3. نشر لوحة تحكم الشركاء (apps/partner)

### عبر Vercel Dashboard

1. **New Project** → نفس المستودع → **Root Directory** = `apps/partner`
2. أضف متغيرات البيئة:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ynduborjddqwyperlkrq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   NEXT_PUBLIC_DEMO_MODE=false
   ```
3. انقر **Deploy**

### عبر CLI

```bash
cd apps/partner
npx vercel --prod
```

---

## 4. بناء تطبيقات الموبايل مع EAS

### الإعداد الأولي (مرة واحدة)

```bash
# تثبيت EAS CLI
npm install -g eas-cli

# تسجيل الدخول
eas login

# ربط مشاريع Expo (لكل تطبيق)
cd apps/customer
eas init --id <your-expo-project-id>

cd ../driver
eas init --id <your-expo-project-id>
```

### بناء APK للاختبار (Preview)

```bash
# تطبيق العميل
cd apps/customer
eas build --platform android --profile preview

# تطبيق المندوب
cd ../driver
eas build --platform android --profile preview
```

### بناء AAB للنشر على Google Play (Production)

```bash
cd apps/customer
eas build --platform android --profile production

cd ../driver
eas build --platform android --profile production
```

---

## 5. GitHub Actions CI/CD

### الـ Secrets المطلوبة في GitHub Repository

| Secret | القيمة |
|--------|--------|
| `VERCEL_TOKEN` | من Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | من `.vercel/project.json` بعد أول deploy |
| `VERCEL_WEB_PROJECT_ID` | من `.vercel/project.json` في `apps/web` |
| `VERCEL_PARTNER_PROJECT_ID` | من `.vercel/project.json` في `apps/partner` |
| `EXPO_TOKEN` | من expo.dev → Settings → Access Tokens |

### سير العمل

| الملف | متى يعمل | ماذا يفعل |
|-------|-----------|-----------|
| `ci.yml` | عند كل push/PR | يبني ويتحقق من الكود |
| `deploy.yml` | عند push إلى main | ينشر على Vercel |
| `eas-build.yml` | عند tag بصيغة `v*` أو يدوياً | يبني APK/AAB عبر EAS |

### لبدء EAS Build يدوياً

1. اذهب إلى GitHub Actions
2. اختر **EAS Build**
3. انقر **Run workflow**
4. اختر profile (preview/production) والتطبيق

---

## 6. متغيرات البيئة — ملخص

### Expo Apps (customer & driver)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_DEMO_MODE=false
```

### Next.js Apps (partner & web)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=          # web only
```

---

## 7. ترتيب النشر الموصى به

```
1. Supabase  →  شغّل schema.sql + فعّل Realtime
2. apps/web  →  انشر على Vercel أولاً (الموقع التسويقي)
3. apps/partner  →  انشر على Vercel (لوحة الشركاء)
4. apps/customer  →  eas build preview  →  وزّع APK للاختبار
5. apps/driver  →  eas build preview  →  وزّع APK للسائقين
6. اختبر الدورة الكاملة: طلب → قبول → توصيل → تسليم
7. eas build production  →  ارفع على Google Play
```
