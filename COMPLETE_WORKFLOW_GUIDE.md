# 🎯 COMPLETE WORKFLOW - نظام الـ Workflow الكامل

**التاريخ**: 2026-02-28
**الحالة**: ✅ مكتمل وجاهز للتطبيق
**الإصدار**: 4.0 - النسخة الكاملة

---

## 📊 خريطة الـ Workflow الكاملة

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPER ADMIN                                 │
├─────────────────────────────────────────────────────────────────┤
│ ✅ يدعو Regional Manager        → موافقة من Super Admin (نفسه)  │
│ ✅ يدعو Partner مباشرة          → فوري (approved مباشرة)         │
│ ✅ يوافق على دعوات المديرين    → يوافق على Regular Admin       │
│ ✅ يوافق على دعوات الشركاء   → يوافق على دعوات من Regular Admin│
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              REGIONAL MANAGER (مدير إقليمي)                      │
├─────────────────────────────────────────────────────────────────┤
│ ✅ يدعو Regular Admin          → موافقة من Super Admin فقط      │
│ ✅ يدعو Partner                → يوافق هو (نفسه)                 │
│ ✅ يوافق على دعوات الشركاء    → من Regular Admin الخاص به      │
│ ❌ لا يوافق على دعوات من Regular Admin الآخرين                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              REGULAR ADMIN (مدير عادي)                           │
├─────────────────────────────────────────────────────────────────┤
│ ❌ لا يدعو مديرين (فقط Regional Manager)                        │
│ ✅ يدعو Partner                → موافقة: Super Admin أو Regional M│
│ ❌ لا يوافق على أي دعوات                                        │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PARTNER (الشريك)                             │
├─────────────────────────────────────────────────────────────────┤
│ ✅ يعين Store Admin (متعدد)   → فوري (نفسه يعينهم)              │
│ ❌ لا يدعو أي حد آخر                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ الملفات والـ Pages

### **1. Database Schema - Migration**

**ملف**: `supabase/migrations/14_complete_workflow_system.sql`
**الجداول المُنشأة/المحدثة**:
- `admin_invitations` - دعوات المديرين (Regional + Regular Admin)
- `partner_invitations` - دعوات الشركاء (مع موافقات متعددة)
- `store_admins` - مديري المتاجر (جديد كلياً)

### **2. Admin Pages - دعوة وموافقة المديرين**

#### أ) دعوة Regular Admin (من Regional Manager)
**الملف**: `apps/partner/app/admin/admin-management/invite-regular-admin/page.tsx`
**الارتباط**: `/admin/admin-management/invite-regular-admin`
**الصلاحيات**: Regional Manager فقط
**الفعل**:
- يدعو مدير عادي جديد
- تُحفظ الدعوة قيد الانتظار
- تحتاج موافقة من Super Admin

#### ب) موافقة على دعوات Regular Admin (من Super Admin)
**الملف**: `apps/partner/app/admin/admin-management/approve-admins/page.tsx`
**الارتباط**: `/admin/admin-management/approve-admins`
**الصلاحيات**: Super Admin فقط
**الفعل**:
- يرى جميع دعوات Regular Admin المعلقة
- يوافق أو يرفض
- يُكتب ملاحظات اختيارية

### **3. Partner Invitation Pages - دعوة الشركاء**

#### أ) دعوة Partner من Super Admin
**الملف**: `apps/partner/app/admin/invite-partners/page.tsx`
**الارتباط**: `/admin/invite-partners`
**الصلاحيات**: Super Admin فقط
**الفعل**:
- يدعو شريك جديد
- تُوافق فوراً (status: accepted)
- لا تحتاج موافقة إضافية

#### ب) دعوة Partner من Regional Manager
**الملف**: `apps/partner/app/admin/admin-management/invite-partners-regional-manager/page.tsx`
**الارتباط**: `/admin/admin-management/invite-partners-regional-manager`
**الصلاحيات**: Regional Manager
**الفعل**:
- يدعو شريك جديد
- تُحفظ قيد الانتظار
- يوافق هو نفسه (Regional Manager نفسه يوافق)

#### ج) دعوة Partner من Regular Admin
**الملف**: `apps/partner/app/admin/admin-management/invite-partners-regular-admin/page.tsx`
**الارتباط**: `/admin/admin-management/invite-partners-regular-admin`
**الصلاحيات**: Regular Admin
**الفعل**:
- يدعو شريك جديد
- تُحفظ قيد الانتظار
- تحتاج موافقة من Super Admin أو Regional Manager

#### د) موافقة Regional Manager على الشركاء
**الملف**: `apps/partner/app/admin/admin-management/approve-partners-regional-manager/page.tsx`
**الارتباط**: `/admin/admin-management/approve-partners-regional-manager`
**الصلاحيات**: Regional Manager
**الفعل**:
- يوافق على دعوات الشركاء من Regular Admin فقط
- يدخل أسباب الرفض إن رفض
- يرى حالة المعالجة

### **4. Partner Pages - إدارة Store Admin**

#### أ) تعيين/إدارة Store Admin
**الملف**: `apps/partner/app/dashboard/store-admin-management/page.tsx`
**الارتباط**: `/dashboard/store-admin-management`
**الصلاحيات**: Partner فقط
**الفعل**:
- يضيف مدراء متاجر جدد
- يرى قائمة مديري المتاجر
- يحذف مدراء المتاجر
- يدير الحالة (active/inactive/pending)

---

## 📋 خطوات التطبيق

### **الخطوة 1: تطبيق Migration في Supabase**

```sql
-- اذهب إلى Supabase SQL Editor
-- وشغّل محتوى هذا الملف:
supabase/migrations/14_complete_workflow_system.sql
```

**ماذا يعمل الـ Migration**:
1. إضافة جدول `store_admins`
2. تحديث جدول `admin_invitations` لدعم Regular Admin
3. تحديث جدول `partner_invitations` لدعم موافقات متعددة
4. إنشاء RLS Policies للأمان
5. إنشاء Indexes للأداء

---

## 🔄 سيناريوهات الـ Workflow

### **السيناريو 1: دعوة Regional Manager**

```
1. Super Admin → /admin/invite-admin
   ├─ يملأ: الاسم، البريد، الهاتف
   ├─ يختار: نوع Admin → Regional Manager
   └─ يرسل الدعوة

2. في قاعدة البيانات:
   ├─ INSERT INTO admin_invitations
   ├─ status: 'pending'
   ├─ super_admin_approval: 'pending' (تلقائياً)
   └─ admin_type: 'regional_manager'

3. Regional Manager المُختار:
   ├─ يتقبل الدعوة (ينشئ حساب)
   └─ ينتظر موافقة Super Admin

4. Super Admin → /admin/admin-management/approve-admins
   ├─ يرى الدعوة
   ├─ يضغط ✅ أو ❌
   └─ تُكتمل أو تُرفض
```

### **السيناريو 2: دعوة Regular Admin**

```
1. Regional Manager → /admin/admin-management/invite-regular-admin
   ├─ يملأ: الاسم، البريد، الهاتف
   ├─ نوع Admin = Regular Admin (تلقائياً)
   └─ يرسل الدعوة

2. في قاعدة البيانات:
   ├─ INSERT INTO admin_invitations
   ├─ status: 'pending'
   ├─ super_admin_approval: 'pending'
   ├─ admin_type: 'regular_admin'
   └─ invited_by: Regional Manager's ID

3. Super Admin → /admin/admin-management/approve-admins
   ├─ يرى دعوات Regular Admin
   ├─ يوافق أو يرفض
   └─ Regular Admin المُختار ينشئ حساب (بعد الموافقة)
```

### **السيناريو 3: دعوة Partner من Super Admin (مباشر)**

```
1. Super Admin → /admin/invite-partners
   ├─ يملأ: الاسم، البريد، الهاتف
   └─ يرسل الدعوة

2. في قاعدة البيانات:
   ├─ INSERT INTO partner_invitations
   ├─ invited_by_role: 'super_admin'
   ├─ status: 'pending'
   ├─ super_admin_approval: NULL (لا حاجة)
   └─ regional_manager_approval: NULL (لا حاجة)

3. نتيجة:
   ├─ الشريك يستطيع التسجيل فوراً
   └─ لا ينتظر أي موافقة
```

### **السيناريو 4: دعوة Partner من Regional Manager**

```
1. Regional Manager → /admin/admin-management/invite-partners-regional-manager
   ├─ يملأ: الاسم، البريد، الهاتف
   └─ يرسل الدعوة

2. في قاعدة البيانات:
   ├─ INSERT INTO partner_invitations
   ├─ invited_by_role: 'regional_manager'
   ├─ status: 'pending'
   ├─ regional_manager_approval: 'pending'
   └─ super_admin_approval: NULL

3. نفس Regional Manager:
   → /admin/admin-management/approve-partners-regional-manager
   ├─ يرى دعواته المعلقة
   ├─ يوافق (بدون موافقة إضافية)
   └─ الشريك يستطيع التسجيل
```

### **السيناريو 5: دعوة Partner من Regular Admin**

```
1. Regular Admin → /admin/admin-management/invite-partners-regular-admin
   ├─ يملأ: الاسم، البريد، الهاتف
   └─ يرسل الدعوة

2. في قاعدة البيانات:
   ├─ INSERT INTO partner_invitations
   ├─ invited_by_role: 'regular_admin'
   ├─ status: 'pending'
   ├─ super_admin_approval: 'pending'
   └─ regional_manager_approval: NULL

3. Super Admin أو Regional Manager:
   → /admin/approve-partners
   ├─ يرى دعوات Regular Admin
   ├─ يوافق أو يرفض
   └─ الشريك يستطيع التسجيل (بعد الموافقة)
```

### **السيناريو 6: Partner يعين Store Admin**

```
1. Partner → /dashboard/store-admin-management
   ├─ يملأ: الاسم، البريد، الهاتف
   ├─ (اختياري) اسم المتجر
   └─ يضيف المدير

2. في قاعدة البيانات:
   ├─ INSERT INTO store_admins
   ├─ status: 'pending'
   ├─ assigned_by: Partner's User ID
   ├─ partner_id: Partner's ID
   └─ يمكن إضافة أكثر من واحد

3. Store Admin:
   └─ ينتظر تفعيل من Partner (في المستقبل)
```

---

## 🔐 نموذج الأمان (RLS Policies)

### admin_invitations:
- ✅ Super Admin يرى/يدير الكل
- ✅ Regional Manager يرى الخاص به فقط

### partner_invitations:
- ✅ Super Admin يرى/يدير الكل
- ✅ Regional Manager يرى الخاص به (و يوافق على الخاص به)
- ✅ Regular Admin يدعو فقط

### store_admins:
- ✅ Partner يرى/يدير الخاص به فقط
- ✅ Super Admin و Regional Manager يرون فقط

---

## 📱 الـ Routes الكاملة

| الصلاحية | الـ Route | الوصف |
|---------|---------|--------|
| Super Admin | `/admin/invite-admin` | دعوة Regional Manager |
| Super Admin | `/admin/admin-management/approve-admins` | موافقة على Regular Admin |
| Super Admin | `/admin/invite-partners` | دعوة Partner مباشر |
| Super Admin | `/admin/approve-partners` | موافقة دعوات Admins |
| Regional Manager | `/admin/admin-management/invite-regular-admin` | دعوة Regular Admin |
| Regional Manager | `/admin/admin-management/invite-partners-regional-manager` | دعوة Partner |
| Regional Manager | `/admin/admin-management/approve-partners-regional-manager` | موافقة على دعوات Regular Admin |
| Regular Admin | `/admin/admin-management/invite-partners-regular-admin` | دعوة Partner |
| Partner | `/dashboard/store-admin-management` | إضافة Store Admin |

---

## ✅ القائمة التحقق

- [ ] شغّل Migration 14 في Supabase
- [ ] تحقق من نجاح Migration
- [ ] بنِّي التطبيق: `npm run build:partner`
- [ ] شغّل التطبيق: `npm run dev:partner`
- [ ] اختبر دعوة Regional Manager
- [ ] اختبر دعوة Regular Admin
- [ ] اختبر دعوة Partner (من Super Admin)
- [ ] اختبر دعوة Partner (من Regional Manager)
- [ ] اختبر دعوة Partner (من Regular Admin)
- [ ] اختبر تعيين Store Admin

---

## 🎉 تم البناء بنجاح!

الـ Workflow الكامل الآن:
✅ Super Admin → Regional Manager (موافقة)
✅ Regional Manager → Regular Admin (موافقة)
✅ Super Admin → Partner (مباشر)
✅ Regional Manager → Partner (نفسه يوافق)
✅ Regular Admin → Partner (موافقة)
✅ Partner → Store Admin (متعدد، مباشر)

**الحالة**: جاهز للاستخدام! 🚀
