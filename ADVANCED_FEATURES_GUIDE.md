# 🚀 دليل الميزات المتقدمة - Hillaha Customer App

## 📋 القائمة

1. [Dark Mode Support](#dark-mode)
2. [Push Notifications](#push-notifications)
3. [Lottie Animations](#lottie-animations)
4. [Advanced Accessibility](#accessibility)
5. [PDF Export](#pdf-export)
6. [Advanced Analytics](#analytics)

---

## 🌙 Dark Mode Support {#dark-mode}

### الاستخدام:

```typescript
import { DarkModeProvider, useDarkMode } from '@/hooks/useDarkMode';

// في _layout.tsx
<DarkModeProvider>
  <YourApp />
</DarkModeProvider>

// في أي شاشة
function HomeScreen() {
  const { isDarkMode, toggleDarkMode, colors } = useDarkMode();

  return (
    <View style={{ backgroundColor: colors.bg }}>
      <Text style={{ color: colors.text }}>محتوى مظلم أو فاتح</Text>

      <Pressable onPress={toggleDarkMode}>
        <Text>{isDarkMode ? '☀️ وضع فاتح' : '🌙 وضع مظلم'}</Text>
      </Pressable>
    </View>
  );
}
```

### الألوان المتاحة:
- **Light Mode**: ألوان فاتحة ومريحة للعين
- **Dark Mode**: ألوان غامقة توفر البطارية على OLED

---

## 🔔 Push Notifications {#push-notifications}

### الاستخدام:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function OrderTrackingScreen() {
  const {
    expoPushToken,
    sendLocalNotification,
    notifyOrderStatus,
  } = usePushNotifications();

  // ✅ إشعار حالة الطلب
  const handleOrderUpdate = async (status) => {
    await notifyOrderStatus(orderId, status);
  };

  // ✅ إشعار ترويجي
  const sendPromo = async () => {
    await sendPromoNotification(
      "عرض حصري!",
      "احصل على 20% خصم على طلبك الأول"
    );
  };

  return (
    <View>
      {/* محتوى الشاشة */}
    </View>
  );
}
```

### الإشعارات المدعومة:
- ✅ تحديثات حالة الطلب (مقبول، جاهز، في الطريق، موصول)
- ✅ عروض ترويجية
- ✅ إشعارات محلية فورية
- ✅ حفظ الـ token على السيرفر

---

## ✨ Lottie Animations {#lottie-animations}

### الاستخدام:

```typescript
import {
  LoadingAnimation,
  SuccessAnimation,
  EmptyStateAnimation,
  ResultScreen,
} from '@/hooks/useLottieAnimations';

function OrderSuccessScreen() {
  return (
    <ResultScreen
      type="success"
      title="تم الطلب بنجاح!"
      subtitle="سيصل إليك خلال 30 دقيقة"
      actionButton={
        <Pressable onPress={continueShop}>
          <Text>متابعة التسوق</Text>
        </Pressable>
      }
    />
  );
}

// استخدام مباشر
function SearchScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <View>
      {loading && <LoadingAnimation speed={1.5} />}
    </View>
  );
}
```

### الرسوم المتحركة المتاحة:
- 🔄 Loading
- ✅ Success
- ❌ Error
- 📦 Empty State
- 🚗 Delivery
- 💳 Payment
- 🎉 Celebration

---

## ♿ Advanced Accessibility {#accessibility}

### الاستخدام:

```typescript
import { useAccessibility, A11yPresets } from '@/hooks/useAccessibility';

function AccessibleButton() {
  const { labels } = useAccessibility();

  return (
    <Pressable {...A11yPresets.button(labels.labels.checkoutButton.label)}>
      <Text>إتمام الشراء</Text>
    </Pressable>
  );
}

// مثال متقدم
function ProductCard({ product }) {
  const { generateLabel, announceMessage } = useAccessibility();

  const handlePress = async () => {
    const message = generateLabel('product_view', { name: product.name });
    announceMessage(message);
  };

  return (
    <Pressable
      onPress={handlePress}
      {...A11yPresets.listItem(product.name, 0, 10)}
    >
      <Image
        {...A11yPresets.image(`صورة ${product.name}`)}
        source={{ uri: product.image }}
      />
    </Pressable>
  );
}
```

### الميزات:
- ✅ Labels واضحة لكل عنصر
- ✅ Hints شاملة لمستخدمي Screen Reader
- ✅ States مناسبة (disabled, selected, etc)
- ✅ Announcements للأحداث المهمة

---

## 📄 PDF Export {#pdf-export}

### الاستخدام:

```typescript
import {
  exportOrderReceipt,
  exportUserReport,
} from '@/utils/pdfExport';

// تصدير فاتورة الطلب
async function downloadReceipt(orderId) {
  const receipt = {
    orderId,
    date: '25/03/2026',
    customer: {
      name: 'محمد علي',
      phone: '01012345678',
      email: 'user@example.com',
    },
    partner: {
      name: 'مطعم الشرقاوي',
      type: 'مطعم',
    },
    items: [
      { name: 'كشري', quantity: 1, price: 30 },
      { name: 'عصير', quantity: 2, price: 10 },
    ],
    subtotal: 50,
    discount: 5,
    deliveryFee: 10,
    total: 55,
    deliveryAddress: 'قنا، وسط المدينة',
    status: 'موصول',
  };

  await exportOrderReceipt(receipt);
}

// تصدير تقرير الإنفاق
async function downloadMonthlyReport() {
  const report = {
    period: 'monthly',
    totalOrders: 15,
    totalSpent: 750,
    averageOrderValue: 50,
    loyaltyPoints: 120,
    redeemedPoints: 30,
    favoritePartners: [
      { name: 'الشرقاوي', visits: 5 },
      { name: 'كنتاكي', visits: 3 },
    ],
    monthlyBreakdown: [
      { month: 'مارس', orders: 10, spent: 500 },
      { month: 'أبريل', orders: 5, spent: 250 },
    ],
  };

  await exportUserReport(report);
}
```

### الميزات:
- ✅ تصدير الفواتير والإيصالات
- ✅ تقارير الإنفاق الشاملة
- ✅ دعم العربية الكامل
- ✅ مشاركة مباشرة عبر النظام

---

## 📊 Advanced Analytics {#analytics}

### الاستخدام:

```typescript
import { analyticsTracker } from '@/utils/analyticsTracker';

function HomeScreen() {
  useEffect(() => {
    // تتبع عرض الشاشة
    analyticsTracker.trackScreenView('home');

    // تتبع البحث
    analyticsTracker.trackSearch('مطعم', 45);

    // تتبع الإضافة للسلة
    analyticsTracker.trackAddToCart('item123', 30, 2);
  }, []);

  return (
    // محتوى الشاشة
  );
}

// تتبع إكمال الطلب
async function completeCheckout(order) {
  await analyticsTracker.trackOrderCompleted(
    order.id,
    order.total,
    order.partnerId,
    order.paymentMethod
  );
}

// الحصول على إحصائيات المستخدم
async function showAnalytics() {
  const userId = user.id;
  const analytics = await analyticsTracker.getUserAnalytics(userId);

  console.log(`
    📊 إحصائياتك:
    - إجمالي الطلبات: ${analytics.totalOrders}
    - الإنفاق الكلي: ${analytics.totalSpent} ج.م
    - المتوسط: ${analytics.averageOrderValue} ج.م
    - المستوى: ${analytics.loyaltyTier}
  `);
}
```

### الإحصائيات المتتبعة:
- 📈 إجمالي الطلبات والإنفاق
- 🎯 المتاجر والفئات المفضلة
- 💳 عمليات الدفع والعربات المهجورة
- ⭐ التقييمات والمراجعات
- 🔄 معدلات الاحتفاظ والتحويل

---

## 🎯 ملخص رسريع

### التثبيت والإعداد:

```typescript
// 1. أضف في _layout.tsx
import { DarkModeProvider } from '@/hooks/useDarkMode';

export default function Layout() {
  return (
    <DarkModeProvider>
      <Stack />
    </DarkModeProvider>
  );
}

// 2. استخدم الـ hooks في أي شاشة
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAccessibility } from '@/hooks/useAccessibility';

// 3. تتبع الأحداث
import { analyticsTracker } from '@/utils/analyticsTracker';
```

---

## ✨ الميزات الإجمالية

| الميزة | الحالة | الفائدة |
|-------|-------|---------|
| Dark Mode | ✅ 100% | توفير البطارية + راحة العين |
| Push Notifications | ✅ 100% | تحديثات فورية وإشعارات ترويجية |
| Lottie Animations | ✅ 100% | تجربة بصرية احترافية |
| Accessibility | ✅ 100% | أشمل للمستخدمين ذوي الإعاقة |
| PDF Export | ✅ 100% | فواتير وتقارير سهلة |
| Advanced Analytics | ✅ 100% | فهم أفضل لسلوك المستخدمين |

---

**تم تطوير جميع الميزات بجودة عالية وجاهزة للإنتاج!** 🚀
