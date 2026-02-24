# @hillaha/core

مكتبة العميل المشتركة لـ Supabase والأنواع الأساسية لجميع تطبيقات حلّها.

## المحتويات

- **supabaseClient** — إنشاء وإدارة عميل Supabase
- **env** — متغيرات البيئة والإعدادات
- **types** — أنواع TypeScript المشتركة
- **schema** — تعريفات جداول Supabase
- **finance** — حسابات الأموال والضرائب
- **consent** — إدارة الموافقات
- **emails** — نماذج البريد الإلكتروني
- **payments** — معالجة الدفع

## الاستخدام

### في تطبيق Expo (React Native)

```typescript
import { getSupabase, getSupabaseSession } from "@hillaha/core";

function getSB() {
  try { return require("@hillaha/core").getSupabase?.() ?? null; } catch { return null; }
}

const sb = getSB();
```

### في تطبيق Next.js (React Web)

```typescript
import { getSupabase } from "@hillaha/core";

const supabase = getSupabase();
await supabase.from("orders").select("*");
```

## المتغيرات المطلوبة

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## البناء

```bash
# لا ينصح بالبناء المستقل - استخدم من جذر الـ monorepo
pnpm --filter @hillaha/core build
```

---

**ملاحظة:** هذه حزمة مشتركة ويجب استخدامها عبر جميع التطبيقات.
