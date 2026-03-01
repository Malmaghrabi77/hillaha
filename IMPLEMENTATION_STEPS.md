# ✨ خطوات التطبيق - نظام الـ Workflow الكامل

**التاريخ**: 2026-02-28
**الحالة**: ✅ جاهز للتطبيق
**المدة التقريبية**: 30 دقيقة

---

## 📋 قائمة التطبيق

### الجزء 1: تطبيق في Supabase (5 دقائق)

- [ ] **1.1** افتح https://app.supabase.com
- [ ] **1.2** اختر مشروعك `hillaha`
- [ ] **1.3** اذهب إلى **SQL Editor**
- [ ] **1.4** افتح الملف: `supabase/migrations/14_complete_workflow_system.sql`
- [ ] **1.5** انسخ **كل** محتوى الملف
- [ ] **1.6** الصق في نافذة SQL Editor
- [ ] **1.7** اضغط **RUN**
- [ ] **1.8** تأكد من المؤشر الأخضر (تم بنجاح)

**اختبر المهام المكتملة**:
```sql
-- تحقق من وجود جدول store_admins
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'store_admins'
);
-- يجب أن يظهر: true

-- تحقق من الأعمدة الجديدة في partner_invitations
SELECT column_name FROM information_schema.columns
WHERE table_name = 'partner_invitations' AND column_name LIKE '%approval%';
-- يجب أن تظهر أعمدة الموافقات الجديدة
```

---

### الجزء 2: تحديث الـ Code (10 دقائق)

#### الملفات الجديدة المنشأة:

✅ **1. اقرأ هذه الملفات وأكدها**:
```
- apps/partner/app/admin/admin-management/invite-regular-admin/page.tsx
- apps/partner/app/admin/admin-management/invite-partners-regional-manager/page.tsx
- apps/partner/app/admin/admin-management/invite-partners-regular-admin/page.tsx
- apps/partner/app/admin/admin-management/approve-partners-regional-manager/page.tsx
- apps/partner/app/dashboard/store-admin-management/page.tsx
```

✅ **2. الملفات المُحدثة**:
```
- packages/core/src/types.ts (إضافة PartnerInvitation و StoreAdmin types)
- supabase/migrations/14_complete_workflow_system.sql (إنشاء/تحديث)
```

---

### الجزء 3: بناء واختبار (15 دقيقة)

#### أ) بنِّي المشروع

```bash
# اختبر Lint و Type
npm run build:partner

# إذا حدثت أخطاء TypeScript:
# - تحقق من imports
# - تحقق من الـ type names
```

#### ب) شغّل التطبيق

```bash
# شغّل التطبيق المحلي
npm run dev:partner

# اذهب إلى:
http://localhost:3000
```

#### ج) اختبر كل السيناريوهات

**اختبار 1: دعوة Regional Manager من Super Admin**
```
1. سجّل دخول كـ Super Admin (malmaghrabi77@gmail.com)
2. اذهب إلى: /admin/invite-admin
3. أدخل بيانات:
   - الاسم: "مدير إقليمي اختبار"
   - البريد: "regional-test@hillaha.local"
   - الهاتف: "01012345678"
4. اضغط: "إرسال الدعوة"
5. ✅ يجب أن تظهر رسالة نجاح

6. اذهب إلى: /admin/admin-management/approve-admins
7. اضغط: "✅ وافق"
8. ✅ يجب أن تُقبل الدعوة
```

**اختبار 2: دعوة Regular Admin من Regional Manager**
```
1. سجّل دخول كـ Regional Manager
2. اذهب إلى: /admin/admin-management/invite-regular-admin
3. أدخل بيانات:
   - الاسم: "مدير عادي اختبار"
   - البريد: "regular-test@hillaha.local"
   - الهاتف: "01087654321"
4. اضغط: "إرسال الدعوة"
5. ✅ يجب أن تظهر رسالة نجاح + (بانتظار موافقة السوبر)

6. سجّل دخول كـ Super Admin
7. اذهب إلى: /admin/admin-management/approve-admins
8. اضغط: "✅ وافق"
9. ✅ يجب أن تُقبل الدعوة
```

**اختبار 3: دعوة Partner من Super Admin (مباشر)**
```
1. سجّل دخول كـ Super Admin
2. اذهب إلى: /admin/invite-partners
3. أدخل بيانات:
   - الاسم: "شريك اختبار سوبر"
   - البريد: "partner-super@hillaha.local"
   - الهاتف: "01123456789"
4. اضغط: "إرسال الدعوة"
5. ✅ يجب أن تظهر رسالة نجاح (بدون موافقة)
```

**اختبار 4: دعوة Partner من Regional Manager**
```
1. سجّل دخول كـ Regional Manager
2. اذهب إلى: /admin/admin-management/invite-partners-regional-manager
3. أدخل بيانات:
   - الاسم: "شريك اختبار إقليمي"
   - البريد: "partner-regional@hillaha.local"
   - الهاتف: "01198765432"
4. اضغط: "إرسال الدعوة"
5. ✅ يجب أن تظهر رسالة نجاح

6. اذهب إلى: /admin/admin-management/approve-partners-regional-manager
7. اضغط: "✅ وافق"
8. ✅ يجب أن تُقبل الدعوة
```

**اختبار 5: دعوة Partner من Regular Admin**
```
1. سجّل دخول كـ Regular Admin
2. اذهب إلى: /admin/admin-management/invite-partners-regular-admin
3. أدخل بيانات:
   - الاسم: "شريك اختبار عادي"
   - البريد: "partner-regular@hillaha.local"
   - الهاتف: "01156743829"
4. اضغط: "إرسال الدعوة"
5. ✅ يجب أن تظهر رسالة (بانتظار موافقة)

6. سجّل دخول كـ Super Admin
7. اذهب إلى: /admin/approve-partners
8. اضغط: "✅ وافق"
9. ✅ يجب أن تُقبل الدعوة

   OR

6. سجّل دخول كـ Regional Manager
7. اذهب إلى: /admin/admin-management/approve-partners-regional-manager
8. اضغط: "✅ وافق"
9. ✅ يجب أن تُقبل الدعوة
```

**اختبار 6: Partner يعين Store Admin**
```
1. سجّل دخول كـ Partner
2. اذهب إلى: /dashboard/store-admin-management
3. أدخل بيانات:
   - الاسم: "مدير متجر"
   - البريد: "store-admin@hillaha.local"
   - الهاتف: "01145326789"
   - اسم المتجر: "فرع رئيسي"
4. اضغط: "إضافة مدير متجر"
5. ✅ يجب أن تظهر رسالة نجاح

6. يجب أن يظهر المدير في القائمة بحالة "pending"
7. يمكن حذفه من هنا إن أراد
```

---

## 🔍 التحقق من البيانات

**في Supabase**, اختبر البيانات:

```sql
-- اختبر جدول admin_invitations
SELECT email, admin_type, status, super_admin_approval
FROM admin_invitations
ORDER BY created_at DESC
LIMIT 5;

-- اختبر جدول partner_invitations
SELECT email, invited_by_role, status, regional_manager_approval, super_admin_approval
FROM partner_invitations
ORDER BY created_at DESC
LIMIT 5;

-- اختبر جدول store_admins
SELECT email, partner_id, status
FROM store_admins
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🚨 المشاكل الشائعة والحلول

| المشكلة | الحل |
|--------|-----|
| "Error: relation 'store_admins' does not exist" | لم يتم تشغيل Migration 14 بعد |
| "Type 'PartnerInvitation' not found" | أعد بناء: `npm run build:partner` |
| "Column 'regional_manager_approval' does not exist" | تحقق من Migration - قد لم يتم تطبيقها صحيح |
| الصفحة رمادية أو خالية | قد تحتاج صلاحية أعلى (استخدم Super Admin) |
| الدعوة لا تظهر في القائمة | اضغط F5 لتحديث الصفحة أو تحقق من الـ filter |

---

## 📱 المسارات الكاملة بعد التطبيق

```
Super Admin:
  ├─ /admin/invite-admin (دعوة Regional Manager)
  ├─ /admin/admin-management/approve-admins (موافقة على Regular Admin)
  ├─ /admin/invite-partners (دعوة Partner مباشر)
  └─ /admin/approve-partners (موافقة على دعوات Admins)

Regional Manager:
  ├─ /admin/admin-management/invite-regular-admin (دعوة Regular Admin)
  ├─ /admin/admin-management/invite-partners-regional-manager (دعوة Partner)
  └─ /admin/admin-management/approve-partners-regional-manager (موافقة على دعوات)

Regular Admin:
  └─ /admin/admin-management/invite-partners-regular-admin (دعوة Partner)

Partner:
  └─ /dashboard/store-admin-management (إضافة Store Admin)
```

---

## ✅ قائمة التحقق النهائية

- [ ] تم تطبيق Migration 14 بنجاح
- [ ] البناء اكتمل بدون أخطاء
- [ ] اختبار دعوة Regional Manager ✅
- [ ] اختبار دعوة Regular Admin ✅
- [ ] اختبار دعوة Partner من Super Admin ✅
- [ ] اختبار دعوة Partner من Regional Manager ✅
- [ ] اختبار دعوة Partner من Regular Admin ✅
- [ ] اختبار إضافة Store Admin ✅
- [ ] جميع البيانات تظهر في Supabase ✅

---

## 🎉 تم!

الـ Workflow الكامل الآن:
- ✅ مطبّق
- ✅ مختبر
- ✅ جاهز للإنتاج

**يمكنك الآن الاستمرار مع باقي التطوير!**

---

## 📞 معلومات إضافية

**الملفات المرجعية**:
- `COMPLETE_WORKFLOW_GUIDE.md` - شرح تفصيلي للـ Workflow
- `CODE_FIX_SUMMARY.md` - ملخص الإصلاحات
- `REGULAR_ADMIN_FIX_GUIDE.md` - شرح تغيير regular_admin → regional_manager

**قاعدة البيانات**:
- الجداول الرئيسية: admin_invitations, partner_invitations, store_admins
- الـ RLS Policies مفعّلة
- الـ Indexes مُنشأة للأداء الأمثل
