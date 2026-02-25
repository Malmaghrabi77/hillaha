# 🔴 الإجراءات الحرجة - ملخص شامل

**التاريخ:** 2026-02-25
**الحالة:** جارية التنفيذ

---

## 🎯 المشاكل الحرجة المتبقية

### 1️⃣ مشكلة Java PATH (أولوية عالية)

**الوضع الحالي:**
- Java 8 هي الإصدار الافتراضي في النظام
- Java 17 مثبتة لكن غير مستخدمة
- **التأثير:** لا يمكن بناء التطبيقات محلياً

**الحل:**
- ✅ تم إنشاء: `scripts/fix-java-path.ps1`
- **الخطوات:**
  1. افتح PowerShell كـ Admin
  2. قم بتشغيل: `.\scripts\fix-java-path.ps1`
  3. أغلق وأعد فتح PowerShell
  4. تحقق: `java -version` يجب أن يظهر Java 17

---

### 2️⃣ سياسة RLS الضعيفة في Supabase (أولوية عالية)

**المشكلة:**
```sql
-- الوضع الحالي (غير آمن):
using (status = 'ready' or auth.uid() = driver_id)
-- يسمح للمندوبين برؤية جميع الطلبات الجاهزة من المنافسين!
```

**الحل:**
- ✅ تم إنشاء: `supabase/fixes/02_fix_driver_rls_policy.sql`
- **الخطوات:**
  1. اذهب إلى Supabase Dashboard
  2. افتح SQL Editor
  3. انسخ والصق محتوى الملف
  4. اضغط Run
  5. تحقق من Policies → orders table

**النتيجة الجديدة:**
```sql
-- الآمن:
using (
  auth.uid() = driver_id
  OR
  (status = 'ready' AND driver_id IS NULL)
)
-- المندوب يرى فقط:
-- 1. طلباته الخاصة
-- 2. الطلبات الجاهزة بدون مندوب معين
```

---

### 3️⃣ مفاتيح Supabase المعرضة (أولوية متوسطة)

**الوضع الحالي:**
- المفاتيح موجودة في git history
- تحتاج إلى تغيير يدوي لاحقاً

**حالة اليوم:**
- ⏳ ستقوم بتغييرها يدويًا لاحقاً
- بدون تأثير على البناء الحالي

---

## 📋 قائمة الفحص الكاملة

### تم إنجازه ✅

| المشكلة | الحل | الملف | الحالة |
|-------|------|-------|--------|
| Order Status Type مختلفة | تحديث schema.ts | `packages/core/src/schema.ts` | ✅ مطبق |
| Search Query Column | إزالة is_open | `apps/customer/app/(tabs)/search.tsx` | ✅ مطبق |
| Plaintext Password Storage | Token-based auth | `apps/customer/app/(auth)/login.tsx` | ✅ مطبق |
| Partner App Status Config | تحديث dashboard | `apps/partner/app/dashboard/orders/page.tsx` | ✅ مطبق |
| Missing Build Scripts | إضافة pnpm scripts | `package.json` | ✅ مطبق |

### قيد التنفيذ 🔄

| المشكلة | الحل المقترح | الملف | الخطوات |
|-------|------------|-------|--------|
| Java PATH غير صحيح | تشغيل النص البرمجي | `scripts/fix-java-path.ps1` | 2-4 خطوات |
| RLS Policy ضعيفة | إجراء SQL | `supabase/fixes/02_fix_driver_rls_policy.sql` | 4-5 خطوات |

### قيد الانتظار ⏳

| المشكلة | الحل | الملف | والمسؤول |
|-------|------|-------|---------|
| Supabase Keys معرضة | تدوير يدوي | Supabase Dashboard | أنت فقط |

---

## 🚀 خريطة الطريق

### المرحلة 1: الإصلاح الفوري (اليوم)
- [ ] تشغيل: `.\scripts\fix-java-path.ps1`
- [ ] تنفيذ: `supabase/fixes/02_fix_driver_rls_policy.sql`
- [ ] اختبار: `java -version` (Java 17)

### المرحلة 2: البناء المبدئي
- [ ] `pnpm build:web` (اختبار بناء الويب)
- [ ] `pnpm build:all` (بناء كل تطبيقات الويب)

### المرحلة 3: البناء الموبايل
- [ ] `pnpm eas:build:android` (السحابي - موصى به)
- [ ] أو `expo run:android` (محلي - إذا أحتجت)

### المرحلة 4: الحماية
- [ ] تدوير مفاتيح Supabase (يدويًا في Dashboard)
- [ ] تحديث GitHub Actions Secrets

---

## 📞 ملاحظات مهمة

### PowerShell Admin
```powershell
# اضغط Windows + X
# اختر Windows PowerShell (Admin)
# أو استخدم Windows Terminal كـ Admin
```

### Supabase SQL
- جرّب أولاً في environment التطويرية
- لا تخشَ من التراجع عن التغييرات
- تأكد من تحديد Supabase Project الصحيح

### Java Verification
```bash
# تأكد أن تستخدم terminal جديد
java -version
# يجب أن يظهر: openjdk version "17.0.18"

echo %JAVA_HOME%
# يجب أن يظهر: C:\Users\MoustafaMohamed\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.18.8-hotspot\
```

---

## 📚 الملفات المتعلقة

- `JAVA_AND_RLS_FIX_GUIDE.md` - دليل مفصل خطوة بخطوة
- `scripts/fix-java-path.ps1` - نص إصلاح Java PATH
- `supabase/fixes/02_fix_driver_rls_policy.sql` - إصلاح RLS
- `package.json` - بناء Scripts (مطبق بالفعل)

---

## ✨ الحالة النهائية المتوقعة

بعد إكمال جميع الخطوات:
- ✅ Java PATH صحيح (Java 17)
- ✅ RLS Policy آمنة وقيدة
- ✅ بناء تطبيقات Web يعمل
- ✅ بناء تطبيقات Mobile متاح
- ⏳ Supabase Keys محدثة (لاحقاً)

---

**آخر تحديث:** 2026-02-25
**من قام به:** Claude Code
**الحالة:** جاهز للتنفيذ الفوري
