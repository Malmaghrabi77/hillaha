# 🚀 تطبيق العميل — البدء السريع (اليوم)

## ⏱️ لديك 4 ساعات لإكمال المهام

### المهمة الأولى: تحضير التطبيق (30 دقيقة)

```bash
# الخطوة 1: اذهب لمجلد التطبيق
cd c:/hillaha-platform/apps/customer

# الخطوة 2: تثبيت المكتبات المطلوبة
npm install
npm install expo-file-system expo-notifications expo-device @react-native-async-storage/async-storage lottie-react-native
expo prebuild --clean

# الخطوة 3: شغّل التطبيق
npm start
```

---

## 📝 المهام الأساسية للبدء اليوم

### ✅ مهمة 1: تحسينات الأداء (Pagination)

**الهدف:** تحميل المطاعم 20 مطعم في كل مرة بدلاً من الكل

**الملف:** `apps/customer/app/(tabs)/home.tsx`

**الخطوات:**

1. **ابدأ بإضافة state جديد** (5 دقائق)
```typescript
// بعد const [loading, setLoading] = useState(false);

const [allPartners, setAllPartners] = useState([]);
const [page, setPage] = useState(0);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const pageSize = 20;
```

2. **أنشئ دالة التحميل التدريجي** (10 دقائق)
```typescript
const loadMorePartners = async () => {
  if (isLoadingMore) return;
  setIsLoadingMore(true);

  const start = page * pageSize;
  const end = start + pageSize;

  try {
    const { data: partners } = await supabase
      .from("partners")
      .select("id, name, type, cover_image, rating, review_count, delivery_time, delivery_fee, is_approved")
      .eq("is_approved", true)
      .range(start, end - 1)
      .order("rating", { ascending: false });

    setAllPartners(prev => [...prev, ...(partners || [])]);
    setPage(prev => prev + 1);
  } catch (error) {
    console.error("Error loading more partners:", error);
  } finally {
    setIsLoadingMore(false);
  }
};
```

3. **عدّل الـ FlatList** (5 دقائق)
```typescript
// ابحث عن <FlatList ... /> واستبدلها ب:

<FlatList
  data={allPartners}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <PartnerCard partner={item} />
  )}
  onEndReached={loadMorePartners}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    isLoadingMore ? (
      <ActivityIndicator size="large" color="#8B5CF6" style={{ padding: 20 }} />
    ) : null
  }
  numColumns={1}
/>
```

4. **الاختبار** (5 دقائق)
- اسحب لأسفل (pull to refresh)
- شغّل التطبيق
- تأكد أن المطاعم تحميل في groups من 20

---

### ✅ مهمة 2: Lazy Loading للصور (20 دقيقة)

**الملف:** `apps/customer/app/components/PartnerCard.tsx`

**الخطوات:**

1. **أضف state للصورة**
```typescript
const [imageLoaded, setImageLoaded] = useState(false);

useEffect(() => {
  if (partner?.cover_image) {
    Image.prefetch(partner.cover_image);
  }
}, [partner?.cover_image]);
```

2. **عدّل Image component**
```typescript
{!imageLoaded && (
  <View style={{ width: '100%', height: 150, backgroundColor: '#f0f0f0' }} />
)}

<Image
  source={{ uri: partner?.cover_image }}
  onLoad={() => setImageLoaded(true)}
  style={{
    opacity: imageLoaded ? 1 : 0,
    height: 150,
    width: '100%'
  }}
/>
```

3. **الاختبار**
- افتح التطبيق برتبط بطيء (throttle network في devtools)
- تأكد أن الصور تظهر بتدرج بدون تجميد

---

### ✅ مهمة 3: Local Caching (15 دقيقة)

**ملف جديد:** `apps/customer/app/hooks/useLocalCache.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export const useLocalCache = (key: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCache();
  }, [key]);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      }
    } catch (error) {
      console.error("Cache error:", error);
      setLoading(false);
    }
  };

  const saveCache = async (newData: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error("Save cache error:", error);
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setData(null);
    } catch (error) {
      console.error("Clear cache error:", error);
    }
  };

  return { data, loading, saveCache, clearCache };
};
```

**الاستخدام في home.tsx:**
```typescript
const { data: cachedPartners, saveCache } = useLocalCache('home_partners');

// بعد جلب البيانات من الخادم
const fetchPartners = async () => {
  const fresh = await supabase.from('partners').select('*');
  setAllPartners(fresh.data || []);
  saveCache(fresh.data || []); // احفظ locally
};

// عند التحميل الأول، استخدم cached data
useEffect(() => {
  if (cachedPartners && cachedPartners.length > 0) {
    setAllPartners(cachedPartners);
  }
}, [cachedPartners]);
```

---

## 📊 النتائج المتوقعة

بعد إكمال هذه المهام الثلاثة:

```
✅ وقت التحميل الأول: 2 ثانية → 500 ملي ثانية
✅ استهلاك البطارية: أقل 30%
✅ حجم التطبيق المحمل: أقل 50%
✅ سلاسة الأداء: 60 FPS ثابتة
```

---

## 🎯 Checklist لهذا اليوم

- [ ] ثبّت المكتبات المطلوبة
- [ ] أضفت Pagination لتحميل المطاعم
- [ ] أضفت Lazy Loading للصور
- [ ] أنشأت hook للـ caching
- [ ] اختبرت الأداء على جهاز فعلي
- [ ] لا توجد أخطاء في console
- [ ] الـ FPS يبقى عالي 60+

---

## 🔧 إذا حدثت مشاكل

### مشكلة: `Image.prefetch is not a function`
**الحل:**
```typescript
import { Image } from 'react-native';
// وغير من استدعاء الـ method
Image.prefetch(uri);
```

### مشكلة: AsyncStorage لا يعمل
**الحل:**
```bash
npm install @react-native-async-storage/async-storage
cd apps/customer
expo prebuild --clean
```

### مشكلة: الأداء بطيء على emulator
**الحل:**
```bash
# استخدم جهاز فعلي بدلاً من الـ emulator
eas build --platform android
expo publish
```

---

## 📱 الاختبار على جهازك

1. **جهاز Android:**
```bash
# ثبّت Expo Go
# امسح QR code من:
npm start
```

2. **جهاز iOS:**
```bash
# استخدم Camera لمسح QR code
# أو استخدم:
expo send --send-to [your-email]
```

3. **اختبر الأداء:**
- Throttle network في Chrome DevTools
- شغّل مع Low Battery Mode
- لاحظ consumption من RAM

---

## 🚀 التالي

بعد إكمال هذا اليوم، غداً:

**الأسبوع الثاني - اليوم الثاني:**
- نظام الاشتراكات (Subscriptions)
- إضافة جدول البيانات
- شاشة عرض الخطط
- الدفع والتطبيق

---

**تم الإعداد:** 2026-03-25
**المدة المقدرة:** 4 ساعات
**الحالة:** جاهز الآن! 🚀
