# حلّها — عامل خدمات | Services Worker App

تطبيق الهاتف الذكي لعمّال الخدمات المنزلية (تنظيف، كهرباء) على منصة حلّها.

## الميزات الرئيسية

- ✅ **تسجيل الدخول الآمن** — كلمة مرور + بصمة
- 📋 **إدارة الطلبات** — عرض طلبات قيد الانتظار والنشطة
- ✔️ **تحديث حالة الطلب** — من قيد الانتظار → قبول → تنفيذ → إتمام
- 📅 **سجل الخدمات** — عرض الخدمات المكتملة والأرباح
- 👤 **إدارة الملف الشخصي** — عرض البيانات والإحصائيات

## المتطلبات

- Node.js 20+
- pnpm 10.8.1+
- Expo CLI
- iOS/Android emulator أو جهاز فعلي

## التثبيت والتشغيل

```bash
# تثبيت التبعيات (من الجذر)
pnpm install

# تشغيل التطبيق بالموضع الإنمائي
pnpm dev:services-worker

# أو مباشرة من مجلد التطبيق
cd apps/services-worker
pnpm start
```

## البناء

```bash
# بناء للتطوير والاختبار الداخلي
eas build --platform android --profile development

# بناء للمعاينة (APK)
eas build --platform android --profile preview

# بناء للإنتاج (App Bundle)
eas build --platform android --profile production
```

## هيكل المشروع

```
apps/services-worker/
├── app/
│   ├── _layout.tsx           # تحقق الاستيقاظ من الجلسة
│   ├── (auth)/
│   │   ├── _layout.tsx       # تخطيط المصادقة
│   │   └── login.tsx         # شاشة تسجيل الدخول
│   └── (tabs)/
│       ├── _layout.tsx       # تخطيط التبويبات
│       ├── bookings.tsx      # الطلبات الحالية (قبول/تنفيذ/إتمام)
│       ├── history.tsx       # السجل والأرباح
│       └── profile.tsx       # الملف الشخصي والإعدادات
├── assets/                   # الصور والأيقونات (مشاركة مع driver app)
├── app.json                  # إعدادات Expo
├── eas.json                  # إعدادات EAS للبناء
├── .env                      # متغيرات البيئة (يجب ملؤها محلياً)
├── .env.example              # قالب متغيرات البيئة
├── package.json              # التبعيات
└── tsconfig.json             # إعدادات TypeScript
```

## متغيرات البيئة

اختر ملف `.env` من `.env.example` وأضِف بيانات Supabase:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## معمارية التطبيق

### التدفق الرئيسي

1. **تسجيل الدخول** (`login.tsx`)
   - التحقق من الهوية عبر Supabase Auth
   - التحقق من دور المستخدم (`service_worker`)
   - حفظ بيانات الاعتماد محلياً بأمان (Secure Store)

2. **الطلبات** (`bookings.tsx`)
   - الاستشعار في الوقت الفعلي لطلبات جديدة من جدول `service_bookings`
   - قبول الطلب → تحديث الحالة إلى `accepted`
   - بدء التنفيذ → `in_progress`
   - إتمام الخدمة → `completed`

3. **السجل** (`history.tsx`)
   - عرض جميع الخدمات المكتملة
   - حساب إجمالي الأرباح

4. **الملف الشخصي** (`profile.tsx`)
   - عرض بيانات العامل
   - إحصائيات الأداء (عدد الخدمات، الأرباح)
   - تسجيل الخروج

## Supabase Integration

### الجداول المستخدمة

- **service_bookings** — طلبات التنظيف والكهرباء
  ```sql
  id, customer_id, service_type, service_name, price,
  address, scheduled_time, notes, status, created_at
  ```

- **profiles** — بيانات المستخدمين
  ```sql
  id, full_name, phone, role, avatar_url, ...
  ```

### الاشتراك المباشر

يستخدم التطبيق قنوات Supabase Postgres للاستشعار الحي:

```typescript
const channel = supabase
  .channel("service_bookings_changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "service_bookings" },
    () => fetchBookings())
  .subscribe();
```

## قواعد الأمان (RLS)

جميع جداول Supabase محمية برسائل Row Level Security (RLS):

```sql
-- مثال: عامل يمكنه فقط رؤية الطلبات الموجهة له
create policy "Service workers see own bookings"
  on service_bookings
  for select
  using (auth.uid() = assigned_worker_id);
```

## التطوير

### تشخيص مشاكل الاتصال

```typescript
// في أي ملف
const sb = getSB();
if (!sb) {
  console.error("Supabase client not initialized!");
  // تحقق من .env variables
}
```

### إضافة شاشة جديدة

1. أنشئ ملف داخل `app/(tabs)/` أو `app/(auth)/`
2. استخدم نفس نمط الألوان والتصميم
3. استخدم `getSB()` للوصول إلى Supabase
4. أضِف المسار تلقائياً (Expo Router file-based routing)

### نمط الألوان المشترك

```typescript
const C = {
  primary: "#7C3AED",      // بنفسجي
  primarySoft: "#EDE9FE",  // بنفسجي فاتح
  bg: "#FAFAFF",           // خلفية
  surface: "#FFFFFF",      // أسطح
  text: "#1F1B2E",         // نص مظلم
  textMuted: "#6B6480",    // نص خافت
  success: "#34D399",      // أخضر
  danger: "#EF4444",       // أحمر
};
```

## الاختبار

### على المحاكي

```bash
# Android
eas build --platform android --profile development
eas device:create  # لربط جهاز

# iOS
eas build --platform ios --profile development
```

### على جهاز فعلي

1. ثبت Expo Go للهاتف
2. اسح رمز QR من `pnpm dev:services-worker`
3. التطبيق سيحمّل مباشرة

## النشر

### منصة Google Play

```bash
# تأكد من إعدادات Google Play Key
eas build --platform android --profile production
eas submit --platform android --latest --auto-submit
```

## استكشاف الأخطاء

### "Supabase client not initialized"
- ✅ تحقق من ملف `.env`
- ✅ تأكد من صحة المفاتيح

### "Auth failed"
- ✅ تأكد من دور المستخدم: `role = 'service_worker'`
- ✅ تحقق من بيانات تسجيل الدخول

### "No bookings appear"
- ✅ تأكد من وجود طلبات في جدول `service_bookings`
- ✅ تحقق من سياسات RLS

## المساهمة

عند إضافة ميزات جديدة:

1. اتبع نمط كود موجود
2. استخدم TypeScript strict mode
3. أضِف تعليقات عند الحاجة
4. اختبر على جهاز حقيقي قبل الرفع

## الترخيص

جميع تطبيقات حلّها محفوظة الحقوق © 2024 Hillaha Inc.

---

**آخر تحديث:** فبراير 2024
