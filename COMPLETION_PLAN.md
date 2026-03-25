# 📱 خطة إكمال تطبيق العملاء - Hillaha Customer App

**الحالة الحالية:** 75% مكتمل
**التاريخ:** 2026-03-25
**المدة المتوقعة:** 5-7 أيام عمل

---

## 📊 ملخص الإنجازات السابقة

### ✅ المرحلة 1: تحسينات الأداء
- ✅ Pagination على Home (20 شريك/صفحة)
- ✅ Lazy Loading للصور مع Placeholder
- ✅ Local Caching مع AsyncStorage hook
- ✅ شاشات Subscriptions و Referrals جديدة

### ✅ المرحلة 2: الـ 6 Advanced Features
- ✅ Dark Mode Support (Context API + 24 لون)
- ✅ Push Notifications (Expo + Supabase)
- ✅ Lottie Animations (7 animations + ResultScreen)
- ✅ Advanced Accessibility (20+ labels)
- ✅ PDF Export (Order Receipt + User Reports)
- ✅ Advanced Analytics (Dual-storage + Cohort analysis)

**المجموع:** 1,975 سطر كود جديد بجودة 100% TypeScript

---

## 🚧 المرحلة 3: إكمال الشاشات الناقصة

### المهام الموزعة والأولويات

#### **الأولوية العالية جداً** (يجب إنهاءها قبل باقي الشاشات)

##### 1. **تطبيق Advanced Features على جميع الشاشات** ⭐⭐⭐
**المشكلة:** الـ 6 features موجودة لكن لم يتم تطبيقها على جميع الشاشات
**الحل:**

```typescript
// في جميع الشاشات الموجودة يجب إضافة:

// 1. في _layout.tsx الرئيسي
import { DarkModeProvider } from './hooks/useDarkMode';
export default function Layout() {
  return (
    <DarkModeProvider>
      <YourLayout />
    </DarkModeProvider>
  );
}

// 2. في كل شاشة استخدم
const { isDarkMode, colors } = useDarkMode();
// ثم style={{ backgroundColor: colors.bg, color: colors.text }}

// 3. الإشعارات والـ Analytics
const { sendLocalNotification } = usePushNotifications();
analyticsTracker.trackScreenView('screen_name');

// 4. التقييمات والأخطاء
import { ErrorAnimation, SuccessAnimation } from './hooks/useLottieAnimations';
import { A11yPresets } from './hooks/useAccessibility';
```

**الملفات المتأثرة:** 15+ ملف
**الجهد:** 1-2 يوم
**الأهمية:** 🔴 حرجة

---

#### **الأولوية العالية** (إكمال الشاشات الجزئية)

##### 2. **medical/booking.tsx** ⭐⭐⭐
**الحالة الحالية:** فقط "قريباً"
**المطلوب:**
- [ ] حجز موعد مع اختيار الطبيب
- [ ] اختيار التاريخ والوقت
- [ ] نموذج تفاصيل المريض
- [ ] اختيار طريقة الدفع
- [ ] تأكيد الحجز

**الهيكل المقترح:**
```typescript
interface DoctorBooking {
  doctorId: string;
  specialization: string; // قلب، عام، أسنان، etc
  date: string;
  time: string;
  patientNotes: string;
  consultationType: 'video' | 'phone' | 'in-clinic';
  paymentMethod: 'cash' | 'instapay' | 'card';
}
```

**الجهد:** 4-6 ساعات
**التأثير:** عالي جداً (خدمة أساسية)

---

##### 3. **medical/prescription.tsx** ⭐⭐⭐
**الحالة الحالية:** ربما ناقصة
**المطلوب:**
- [ ] تحميل صورة الروشتة
- [ ] التعرف على الأدوية (OCR optional)
- [ ] اختيار الصيدلية المسؤولة
- [ ] تأكيد الطلب والدفع
- [ ] تتبع الطلب

**الجهد:** 3-4 ساعات
**التأثير:** عالي جداً

---

##### 4. **services/electrical.tsx** ⭐⭐
**المطلوب:**
- [ ] قائمة بالخدمات الكهربائية (صيانة، تركيب، إصلاح)
- [ ] اختيار الخدمة والسعر
- [ ] وصف المشكلة/الخدمة المطلوبة
- [ ] اختيار التاريخ والوقت
- [ ] تأكيد الطلب

**الجهد:** 2-3 ساعات
**التأثير:** متوسط

---

##### 5. **services/delivery.tsx** ⭐⭐
**المطلوب:**
- [ ] خدمة التوصيل المتخصصة
- [ ] اختيار نوع الشحنة (صغير، متوسط، كبير، بيانو، etc)
- [ ] عنوان المنشأ والوجهة
- [ ] وصف البضاعة
- [ ] اختيار الوقت والسعر

**الجهد:** 2-3 ساعات

---

#### **الأولوية المتوسطة** (شاشات مهمة)

##### 6. **addresses.tsx** ⭐⭐
**المطلوب:**
- [ ] قائمة بالعناوين المحفوظة
- [ ] إضافة عنوان جديد (اسم، مفاصيل، خريطة)
- [ ] تحديث/حذف عنوان
- [ ] تعيين عنوان افتراضي
- [ ] تكامل Google Maps

**الجهد:** 3-4 ساعات

---

##### 7. **favorites.tsx** ⭐⭐
**المطلوب:**
- [ ] قائمة المتاجر/الشركاء المفضلة
- [ ] إضافة/إزالة من المفضلة
- [ ] فتح المتجر المفضل مباشرة
- [ ] عرض آخر الطلبات من كل متجر

**الجهد:** 2-3 ساعات

---

##### 8. **promo.tsx** ⭐⭐
**المطلوب:**
- [ ] قائمة الكوبونات المتاحة
- [ ] عرض تفاصيل الكوبون (الحد الأدنى، النسبة، الانتهاء)
- [ ] نسخ كود الكوبون
- [ ] تطبيق الكوبون على الطلب مباشرة

**الجهد:** 2 ساعة

---

##### 9. **rate-order.tsx** ⭐⭐
**المطلوب:**
- [ ] تقييم المتجر (نجوم + تعليق)
- [ ] تقييم المندوب (نجوم + تعليق)
- [ ] إضافة صور للطلب
- [ ] حفظ التقييم في Supabase

**الجهد:** 2-3 ساعات

---

##### 10. **profile/edit.tsx** ⭐⭐
**المطلوب:**
- [ ] تحديث الاسم والبريد
- [ ] تحديث رقم الهاتف
- [ ] رفع صورة الملف الشخصي
- [ ] تغيير كلمة المرور
- [ ] حذف الحساب (مع تأكيد)

**الجهد:** 2-3 ساعات

---

##### 11. **chat/partner/[partnerId].tsx** ⭐
**المطلوب:**
- [ ] دردشة مع المتجر/الشركة
- [ ] عرض الرسائل السابقة
- [ ] إرسال رسالة جديدة
- [ ] دعم الصور والملفات
- [ ] Real-time updates

**الجهد:** 3-4 ساعات

---

##### 12. **chat/support.tsx** ⭐
**المطلوب:**
- [ ] دردشة مع فريق الدعم
- [ ] تصنيف المشكلة (طلب، حساب، دفع، etc)
- [ ] رفع صور تثبيتية
- [ ] عرض حالة التذكرة (مفتوحة، مغلقة، معلقة)

**الجهد:** 2-3 ساعات

---

##### 13. **restaurant/[id].tsx** ⭐
**المطلوب:**
- [ ] عرض تفاصيل المتجر (الوصف، التقييم، الساعات)
- [ ] قائمة المنتجات مع فرز وتصفية
- [ ] عرض تفاصيل المنتج والصور
- [ ] إضافة إلى السلة من هنا مباشرة
- [ ] مراجعات العملاء

**الجهد:** 4-5 ساعات

---

#### **الأولوية المنخفضة** (شاشات إضافية)

##### 14. **legal/consent.tsx** ⭐
**المطلوب:**
- [ ] الشروط والأحكام
- [ ] سياسة الخصوصية
- [ ] تصديق المستخدم

**الجهد:** 1 ساعة

---

## 🎯 جدول التطوير المقترح

### **اليوم 1: تطبيق Advanced Features على الشاشات الموجودة**

```bash
# Morning (4 ساعات)
1. تحديث _layout.tsx بـ DarkModeProvider
2. إضافة useDarkMode إلى home.tsx
3. إضافة useDarkMode إلى orders.tsx
4. إضافة useDarkMode إلى search.tsx

# Afternoon (4 ساعات)
5. إضافة useDarkMode إلى account.tsx
6. إضافة useDarkMode إلى cart.tsx
7. إضافة useDarkMode إلى checkout.tsx
8. إضافة usePushNotifications إلى أهم 3 شاشات
9. Commit: "feat: apply dark mode and notifications to all screens"
```

---

### **اليوم 2: الخدمات الطبية**

```bash
# Morning (4 ساعات)
1. إكمال medical/booking.tsx (doctor selection + date picker)
2. إنشاء hook useDoctorhook للـ doctors data
3. إنشاء hook useDateTimePicker

# Afternoon (4 ساعات)
4. إكمال medical/prescription.tsx (image upload + pharmacy selection)
5. إنشاء hook useImagePicker
6. Integration مع Supabase storage للصور
7. Commit: "feat: complete medical services screens"
```

---

### **اليوم 3: خدمات أخرى + العناوين**

```bash
# Morning (5 ساعات)
1. إكمال services/electrical.tsx
2. إكمال services/delivery.tsx
3. تنسيق التصميم بين الخدمات

# Afternoon (3 ساعات)
4. إكمال addresses.tsx مع Google Maps
5. Commit: "feat: complete services and addresses screens"
```

---

### **اليوم 4: المفضلة والكوبونات والتقييم**

```bash
# Full day (8 ساعات)
1. إكمال favorites.tsx
2. إكمال promo.tsx
3. إكمال rate-order.tsx
4. إضافة rating submission إلى Supabase
5. Commit: "feat: complete favorites, promos, and rating screens"
```

---

### **اليوم 5: الملف الشخصي والدردشة**

```bash
# Morning (4 ساعات)
1. إكمال profile/edit.tsx
2. إضافة image upload للملف الشخصي
3. Password reset functionality

# Afternoon (4 ساعات)
4. إكمال chat/partner/[partnerId].tsx
5. Real-time messaging setup
6. Commit: "feat: complete profile and partner chat screens"
```

---

### **اليوم 6: الدعم والمتجر والقانونيات**

```bash
# Full day (8 ساعات)
1. إكمال chat/support.tsx (ticket system)
2. إكمال restaurant/[id].tsx (full menu experience)
3. إكمال legal/consent.tsx
4. التأكد من التكامل bين جميع الشاشات
5. Commit: "feat: complete support, restaurant, and legal screens"
```

---

### **اليوم 7: Testing + Final Polish**

```bash
# Morning (4 ساعات)
1. اختبار شامل لجميع الشاشات
2. اختبار Dark Mode على جميع الشاشات
3. اختبار Push Notifications
4. اختبار PDF Export

# Afternoon (4 ساعات)
5. إصلاح الأخطاء والـ bugs
6. تحسين الأداء
7. Final commit: "chore: complete customer app with all features and full testing"
```

---

## 📋 Checklist المتطلبات الفنية

### Advanced Features على كل الشاشات:
- [ ] Dark Mode (colors من useDarkMode)
- [ ] Push Notifications (عند الأحداث المهمة)
- [ ] Lottie Animations (loading, success, error states)
- [ ] Accessibility Labels (A11yPresets)
- [ ] PDF Export (حيث ينطبق)
- [ ] Analytics Tracking (كل screen view والأحداث)

### لكل شاشة جديدة:
- [ ] TypeScript types محددة
- [ ] Error handling مع رسائل عربية
- [ ] Loading state مع Skeleton أو LoadingAnimation
- [ ] Empty state مع EmptyStateAnimation
- [ ] RTL support (لكل النصوص)
- [ ] Real-time updates (إن أمكن)

### Testing:
- [ ] تم تشغيل على جهاز حقيقي أو محاكي
- [ ] لا توجد أخطاء في Console
- [ ] الأداء مقبول (FPS ≥ 50)
- [ ] التطبيق يعمل بلا اتصال (caching)

---

## 🎁 النتيجة النهائية

بعد إكمال هذه الخطة سيكون التطبيق:

```
✅ 100% مكتمل من حيث الشاشات
✅ جميع الـ 6 advanced features مطبقة على كل مكان
✅ Type-safe 100% (no any)
✅ Performance optimized (60 FPS)
✅ Fully localized (Arabic)
✅ Tested على devices حقيقية
✅ Ready للإنتاج والإطلاق
```

**التقدير النهائي:** من 75% → 100% ✨

---

## 🚀 البدء الآن

```bash
cd apps/customer

# اليوم 1: تطبيق Advanced Features
# قم بفتح _layout.tsx وأضف DarkModeProvider
# ثم نسخ pattern الـ useDarkMode إلى جميع الشاشات

# قم بتنفيذ المهام حسب الجدول
# ارفع commit في نهاية كل يوم

git commit -m "feat: [day number] - [description]"
```

---

**تم بناء هذه الخطة بناءً على:**
- ✅ 1,975 سطر كود من المرحلة 2
- ✅ 31 شاشة موجودة في المشروع
- ✅ 13 شاشة تحتاج إكمال أو تحسين
- ✅ 6 advanced features محضرة للتطبيق الشامل

**المدة المتوقعة:** 5-7 أيام عمل بمعدل 8 ساعات/اليوم
