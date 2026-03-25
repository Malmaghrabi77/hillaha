# 📱 خطة تطبيق العميل — الأسبوع الثاني

**التاريخ:** 2026-03-25
**المجال:** تطبيق العميل (Customer App)
**المدة:** أسبوع واحد (36 ساعة)
**الحالة:** جاهز للبدء الآن

---

## 📊 نظرة عامة على التطبيق الحالي

### الحالة الحالية:
```
✅ 31 شاشة مطبقة
✅ 100% من الميزات الأساسية
✅ نظام دردشة حي
✅ تتبع الطلب مع الخرائط
✅ نظام التقييمات والمراجعات
```

### المشاكل الموجودة:
```
⚠️ الأداء بطيء عند تحميل الكثير من المطاعم
⚠️ استهلاك بطارية عالي (GPS مستمر)
⚠️ حجم التطبيق كبير (need optimization)
⚠️ لا يوجد وضع مظلم
⚠️ إشعارات غير مطبقة
```

---

## 🎯 الأسبوع الثاني: التحسينات والميزات الجديدة

### المهمة 1: تحسينات الأداء (4 ساعات)

#### 1.1 تطبيق Pagination للمطاعم

**الملف:** `apps/customer/app/(tabs)/home.tsx`

```typescript
// إضافة state جديد
const [page, setPage] = useState(0);
const [allPartners, setAllPartners] = useState([]);
const [isLoadingMore, setIsLoadingMore] = useState(false);

const pageSize = 20; // 20 مطعم لكل صفحة

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

// في الـ render:
<FlatList
  data={allPartners}
  renderItem={({ item }) => <PartnerCard partner={item} />}
  onEndReached={loadMorePartners}
  onEndReachedThreshold={0.5}
  ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
/>
```

**الجهد:** 2 ساعات
**التأثير:** تقليل وقت التحميل الأول 50%

#### 1.2 Lazy Loading للصور

**الملف:** `apps/customer/app/components/PartnerCard.tsx`

```typescript
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';

const PartnerCard = ({ partner }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Pre-cache images
    if (partner.cover_image) {
      Image.prefetch(partner.cover_image);
    }
  }, [partner.cover_image]);

  return (
    <Pressable>
      {!imageLoaded && (
        <View style={{ background: '#f0f0f0', height: 200 }} />
      )}
      <Image
        source={{ uri: partner.cover_image }}
        onLoad={() => setImageLoaded(true)}
        style={{ opacity: imageLoaded ? 1 : 0.5 }}
      />
    </Pressable>
  );
};
```

**الجهد:** 1.5 ساعات
**التأثير:** صور تظهر بسلاسة دون freeze

#### 1.3 Caching البيانات

**الملف:** جديد - `apps/customer/app/hooks/useLocalCache.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocalCache = (key: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    };

    loadCache();
  }, [key]);

  const saveCache = async (newData: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error("Save cache error:", error);
    }
  };

  return { data, loading, saveCache };
};
```

**استخدام:**
```typescript
const { data: cachedPartners, saveCache } = useLocalCache('partners');

// عند جلب البيانات
const { data: freshPartners } = await supabase.from('partners').select('*');
saveCache(freshPartners);
```

**الجهد:** 1 ساعة
**التأثير:** لا تحميل من الخادم إذا كانت البيانات موجودة locally

---

### المهمة 2: نظام الاشتراكات (8 ساعات)

#### 2.1 إضافة جدول البيانات

**في Supabase SQL:**
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'yearly', 'lifetime')),
  name text NOT NULL,
  discount_percent numeric(3,1) DEFAULT 10,
  price numeric(10,2) NOT NULL,
  max_orders_per_month int,
  description text,
  is_active boolean DEFAULT true,
  started_at timestamp DEFAULT now(),
  expires_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id),
  active boolean DEFAULT true,
  discount_applied numeric(3,1),
  started_at timestamp DEFAULT now(),
  expires_at timestamp
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_subscriptions" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "users_manage_own_subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

**الجهد:** 1 ساعة

#### 2.2 شاشة عرض الخطط

**ملف جديد:** `apps/customer/app/subscriptions/index.tsx`

```typescript
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { getSupabase } from '@hillaha/core';

export default function SubscriptionsScreen() {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      // جلب الخطط المتاحة
      const { data: plansData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('is_active', true);

      // جلب اشتراك المستخدم الحالي
      const { data: userSub } = await supabase
        .from('user_subscriptions')
        .select('*, subscriptions(*)')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      setPlans(plansData || []);
      setCurrentSubscription(userSub);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribePlan = async (planId: string) => {
    try {
      // إلغاء الاشتراك القديم
      if (currentSubscription) {
        await supabase
          .from('user_subscriptions')
          .update({ active: false })
          .eq('id', currentSubscription.id);
      }

      // إضافة اشتراك جديد
      const { data: newSub, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_id: planId,
          active: true,
          started_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('نجح', 'تم تفعيل الخطة بنجاح');
      loadPlans();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        خطط الاشتراك
      </Text>

      {plans.map((plan) => (
        <View
          key={plan.id}
          style={{
            borderWidth: 2,
            borderColor: currentSubscription?.subscription_id === plan.id ? '#8B5CF6' : '#ddd',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            backgroundColor: currentSubscription?.subscription_id === plan.id ? '#f0f0ff' : 'white'
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            {plan.name}
          </Text>
          <Text style={{ color: '#666', marginBottom: 8 }}>
            {plan.description}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#8B5CF6', marginBottom: 12 }}>
            {plan.price.toFixed(2)} ج.م / شهر
          </Text>
          <Text style={{ color: '#10B981', marginBottom: 12 }}>
            💰 خصم {plan.discount_percent}% على جميع الطلبات
          </Text>

          <Pressable
            onPress={() => subscribePlan(plan.id)}
            disabled={currentSubscription?.subscription_id === plan.id}
            style={{
              backgroundColor: currentSubscription?.subscription_id === plan.id
                ? '#ccc'
                : '#8B5CF6',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {currentSubscription?.subscription_id === plan.id
                ? '✓ الخطة الحالية'
                : 'اشترك الآن'
              }
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
```

**الجهد:** 4 ساعات

#### 2.3 إضافة الخطة للتطبيق

- إضافة link في `account.tsx`
- إضافة icon وللـ tab navigation
- ربط الخصم مع الـ checkout

**الجهد:** 2 ساعات

---

### المهمة 3: نظام الإحالات (6 ساعات)

#### 3.1 جدول البيانات

```sql
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id),
  referred_id uuid REFERENCES auth.users(id),
  reward_amount numeric(10,2) DEFAULT 50,
  used boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  code text UNIQUE NOT NULL,
  uses int DEFAULT 0,
  max_uses int,
  created_at timestamp DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
```

#### 3.2 شاشة الإحالات

**ملف جديد:** `apps/customer/app/referrals/index.tsx`

```typescript
import { useState, useEffect } from 'react';
import { View, Text, Pressable, Share, TextInput, Alert } from 'react-native';
import { getSupabase } from '@hillaha/core';
import * as Clipboard from 'expo-clipboard';

export default function ReferralsScreen() {
  const [referralCode, setReferralCode] = useState('');
  const [earnings, setEarnings] = useState(0);
  const supabase = getSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    // جلب كود الإحالة
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .single();

    if (!codeData) {
      // إنشاء كود جديد
      const newCode = `REF_${user.id.substring(0, 8)}`;
      await supabase.from('referral_codes').insert({
        user_id: user.id,
        code: newCode
      });
      setReferralCode(newCode);
    } else {
      setReferralCode(codeData.code);
    }

    // جلب الأرباح
    const { data: referrals } = await supabase
      .from('referrals')
      .select('reward_amount')
      .eq('referrer_id', user.id)
      .eq('used', true);

    const totalEarnings = referrals?.reduce((sum, ref) => sum + ref.reward_amount, 0) || 0;
    setEarnings(totalEarnings);
  };

  const shareReferral = async () => {
    const message = `شارك معك كود الإحالة: ${referralCode}\nاحصل على 50 ج.م عند الاشتراك!`;
    try {
      await Share.share({
        message,
        title: 'كود الإحالة'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setStringAsync(referralCode);
    Alert.alert('تم النسخ', 'تم نسخ الكود إلى الحافظة');
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>
        🎁 برنامج الإحالات
      </Text>

      <View style={{
        backgroundColor: '#EDE9FE',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24
      }}>
        <Text style={{ color: '#666', marginBottom: 8 }}>كود الإحالة الخاص بك:</Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#8B5CF6',
            flex: 1
          }}>
            {referralCode}
          </Text>
          <Pressable
            onPress={copyToClipboard}
            style={{ padding: 8, backgroundColor: '#8B5CF6', borderRadius: 8 }}
          >
            <Text style={{ color: 'white' }}>📋</Text>
          </Pressable>
        </View>
      </View>

      <View style={{
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24
      }}>
        <Text style={{ color: '#666', marginBottom: 4 }}>الأرباح الكلية:</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#F59E0B' }}>
          {earnings.toFixed(2)} ج.م
        </Text>
      </View>

      <Pressable
        onPress={shareReferral}
        style={{
          backgroundColor: '#8B5CF6',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          📤 شارك الكود
        </Text>
      </Pressable>
    </View>
  );
}
```

**الجهد:** 5 ساعات

---

### المهمة 4: تحسينات UX/UI (10 ساعات)

#### 4.1 الرسوم المتحركة (Animations)

```typescript
import { Animated } from 'react-native';
import LottieView from 'lottie-react-native';

// في Home.tsx - عند تحميل المطاعم
const fadeAnim = new Animated.Value(0);

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 500,
    useNativeDriver: true,
  }).start();
}, []);

return (
  <Animated.View style={{ opacity: fadeAnim }}>
    {/* restaurant list */}
  </Animated.View>
);

// للحالات الفارغة
<LottieView
  source={require('../../assets/animations/empty.json')}
  autoPlay
  loop
  style={{ height: 200 }}
/>
```

**الجهد:** 4 ساعات

#### 4.2 وضع مظلم (Dark Mode)

```typescript
// hooks جديد: useDarkMode.ts
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useDarkMode = () => {
  const systemDarkMode = useColorScheme() === 'dark';
  const [darkMode, setDarkMode] = useState(systemDarkMode);

  useEffect(() => {
    loadDarkModeSetting();
  }, []);

  const loadDarkModeSetting = async () => {
    const saved = await AsyncStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(JSON.parse(saved));
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    await AsyncStorage.setItem('darkMode', JSON.stringify(newValue));
  };

  const colors = darkMode ? {
    background: '#1F1B2E',
    surface: '#2A2540',
    text: '#FFFFFF',
    textMuted: '#B8B0CC',
    primary: '#C4B5FD'
  } : {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1F1B2E',
    textMuted: '#6B6480',
    primary: '#8B5CF6'
  };

  return { darkMode, toggleDarkMode, colors };
};
```

**الجهد:** 5 ساعات

#### 4.3 تحسينات Accessibility

```typescript
// إضافة accessibility labels
<Pressable
  accessible={true}
  accessibilityLabel="اضغط لعرض تفاصيل المطعم"
  accessibilityRole="button"
  onPress={...}
>
  {/* content */}
</Pressable>

// زيادة حجم الخطوط للمسنين
<Text style={{
  fontSize: userPreferences.fontSize === 'large' ? 18 : 14,
  ...
}}>
  {text}
</Text>
```

**الجهد:** 1 ساعة

---

### المهمة 5: نظام الإشعارات (10 ساعات)

#### 5.1 إعداد Expo Push Notifications

```bash
npm install expo-notifications
npm install expo-device
```

#### 5.2 كود الإشعارات

**ملف جديد:** `apps/customer/app/hooks/usePushNotifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { getSupabase } from '@hillaha/core';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const supabase = getSupabase();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return;
    }

    // الحصول على token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // حفظ في قاعدة البيانات
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token: token,
        device_type: Device.osName,
        updated_at: new Date()
      });
  };

  const sendLocalNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
      },
      trigger: { seconds: 2 },
    });
  };

  return { sendLocalNotification };
};
```

#### 5.3 استقبال الإشعارات

```typescript
// في checkout.tsx - عند وضع الطلب
const handleCheckout = async () => {
  // ... كود الطلب

  // إرسال إشعار محلي
  await sendLocalNotification(
    'تم استقبال الطلب',
    'تم استقبال طلبك برقم #' + orderId
  );

  // الاستماع للتحديثات من الخادم
  const subscription = supabase
    .channel(`order:${orderId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderId}`
    }, (payload) => {
      if (payload.new.status === 'accepted') {
        sendLocalNotification(
          '✅ تم قبول الطلب',
          'تم قبول طلبك بنجاح'
        );
      }
      if (payload.new.status === 'ready') {
        sendLocalNotification(
          '🚗 طلبك جاهز',
          'يقوم المندوب بالانطلاق نحوك'
        );
      }
      if (payload.new.status === 'delivered') {
        sendLocalNotification(
          '🎉 تم التوصيل',
          'تم توصيل طلبك بنجاح'
        );
      }
    })
    .subscribe();

  return () => subscription.unsubscribe();
};
```

**الجهد:** 8 ساعات

---

## 📊 ملخص الأسبوع الثاني

| المهمة | الساعات | الحالة |
|--------|---------|--------|
| تحسينات الأداء | 4 س | ✅ |
| نظام الاشتراكات | 8 س | ✅ |
| نظام الإحالات | 6 س | ✅ |
| تحسينات UX/UI | 10 س | ✅ |
| نظام الإشعارات | 10 س | ✅ |
| **المجموع** | **36 س** | **✅** |

---

## 🎯 معايير النجاح

- [ ] الأداء: تحميل المطاعم بدون تأخير
- [ ] الاشتراكات: يمكن للمستخدم الاشتراك والحصول على خصم
- [ ] الإحالات: يمكن مشاركة الكود وجني الأرباح
- [ ] الرسوم المتحركة: انتقالات سلسة
- [ ] الوضع المظلم: يعمل على جميع الشاشات
- [ ] الإشعارات: تصل للمستخدم في الوقت المناسب

---

## 🔄 الخطوات التالية (الأسبوع الثالث)

- تطبيق المندوب
- خرائط وتتبع حي
- دردشة محسّنة
- إحصائيات المندوب

---

**تم الإعداد:** 2026-03-25
**الحالة:** جاهز للبدء الفوري
