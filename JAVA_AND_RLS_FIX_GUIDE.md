# 🔧 إصلاح المشاكل الحرجة - دليل العمل

## المشاكل التي سيتم حلها:
1. ✅ **مشكلة مسار الجافا** - Java PATH غير صحيح
2. ✅ **سياسة RLS في Supabase** - ضعف أمان الوصول للطلبات

---

## 🚀 الخطوة 1: إصلاح مسار الجافا

### الخطوة 1.1: تشغيل النص البرمجي

نفذ المسار `scripts/fix-java-path.ps1` بصلاحيات المسؤول:

```powershell
# 1. اضغط Windows + X
# 2. اختر "Windows PowerShell (Admin)" أو "Windows Terminal (Admin)"
# 3. انسخ والصق هذا الأمر:

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
cd C:\hillaha-platform
.\scripts\fix-java-path.ps1
```

**ماذا يفعل النص:**
- ✓ يزيل مسار Java 8 من PATH
- ✓ يضيف مسار Java 17 في البداية
- ✓ يتحقق من أن Java 17 يعمل بشكل صحيح

### الخطوة 1.2: التحقق من النتيجة

بعد تشغيل النص، **اغلق PowerShell وافتحه مرة أخرى** ثم:

```bash
java -version
```

**يجب أن ترى:**
```
openjdk version "17.0.18" 2026-01-20
OpenJDK Runtime Environment Temurin-17.0.18+8 (build 17.0.18+8)
OpenJDK 64-Bit Server VM Temurin-17.0.18+8 (build 17.0.18+8, mixed mode, sharing)
```

إذا رأيت هذا ✅ انتقل للخطوة 2

---

## 🔒 الخطوة 2: إصلاح سياسة RLS في Supabase

### الخطوة 2.1: فتح Supabase Dashboard

1. اذهب إلى: https://app.supabase.com
2. سجل الدخول بحسابك
3. اختر مشروع **Hillaha**

### الخطوة 2.2: فتح SQL Editor

1. في الجانب الأيسر، اختر **SQL Editor**
2. اضغط على **+ New Query**

### الخطوة 2.3: نسخ وتشغيل الـ SQL

1. افتح الملف: `supabase/fixes/02_fix_driver_rls_policy.sql`
2. انسخ محتويات الملف بالكامل
3. الصق في Supabase SQL Editor
4. اضغط **▶ Run** (أو Ctrl+Enter)

### الخطوة 2.4: التحقق من النتيجة

1. اذهب إلى **Authentication → Policies** في الجانب الأيسر
2. اضغط على جدول **orders**
3. تأكد أن السياسة الجديدة موجودة:
   ```
   ✓ driver_can_see_assigned_and_available_orders
   ```

أنماط الوصول الجديدة:
- **SELECT:** ✅ يسمح للمندوبين برؤية:
  - طلباتهم المسندة
  - الطلبات الجاهزة بدون مندوب معين

---

## ✅ التحقق النهائي

### اختبر كل شيء:

```bash
# 1. تحقق من Java 17 في terminal جديد
java -version

# 2. اختبر بناء تطبيق الويب (أسرع)
cd C:\hillaha-platform
pnpm build:web

# 3. إذا نجح الخطوة 2، يمكنك الآن:
# - استخدام `pnpm eas:build:android` للبناء السحابي
# - أو `expo run:android` للبناء المحلي
```

---

## 📋 نقاط معاينة سريعة

| المشكلة | الوضع الحالي | الحل | الخطوة |
|--------|------------|------|-------|
| Java PATH | Java 8 قديمة | Java 17 | 1 |
| Driver RLS | ضعيفة | محدودة آمنة | 2 |
| Supabase Keys | معرضة | ستُغيرها لاحقاً | - |

---

## 🎯 التالي بعد الإصلاح

بعد اكمال جميع الخطوات:

```bash
# بناء تطبيقات الويب
pnpm build:all

# بناء تطبيقات الموبايل (السحابي)
pnpm eas:build:android
```

---

## ⚠️ ملاحظات مهمة

- **Java PATH:** يجب تشغيل النص بصلاحيات Admin
- **SQL Policy:** تأكد من التشغيل على صحيح Supabase project
- **Terminal جديد:** بعد تشغيل النص، أغلق PowerShell وافتحه مرة أخرى
- **Google Play Key:** ستحتاج إلى تثبيت في EAS للبناء النهائي

---

**تم الإنشاء:** 2026-02-25
**الحالة:** جاهز للتنفيذ
