import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * ✅ Advanced Accessibility
 * تحسينات الوصولية للمستخدمين ذوي الإعاقة
 */

export interface AccessibilityLabel {
  label: string;
  hint?: string;
  role?: 'button' | 'link' | 'image' | 'text' | 'header';
  state?: 'disabled' | 'selected' | 'checked' | 'expanded';
}

export const useAccessibility = () => {
  const [a11yEnabled, setA11yEnabled] = useState(false);

  useEffect(() => {
    checkAccessibilityEnabled();
  }, []);

  const checkAccessibilityEnabled = async () => {
    try {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      setA11yEnabled(enabled);
    } catch (error) {
      console.log("Accessibility check error:", error);
    }
  };

  // ✅ Create accessible labels
  const createLabel = (label: string, hint?: string): AccessibilityLabel => ({
    label,
    hint,
  });

  // ✅ Common accessibility labels
  const labels = {
    // Navigation
    backButton: createLabel("رجوع", "اضغط للعودة إلى الصفحة السابقة"),
    homeButton: createLabel("الصفحة الرئيسية", "اضغط للذهاب للصفحة الرئيسية"),
    searchButton: createLabel("بحث", "اضغط للبحث عن متجر أو منتج"),
    cartButton: createLabel("السلة", "اضغط لعرض محتويات السلة"),
    profileButton: createLabel("الملف الشخصي", "اضغط لعرض بيانات الملف الشخصي"),

    // Actions
    addButton: createLabel("إضافة", "اضغط لإضافة العنصر"),
    removeButton: createLabel("حذف", "اضغط لحذف العنصر"),
    saveButton: createLabel("حفظ", "اضغط لحفظ التغييرات"),
    submitButton: createLabel("إرسال", "اضغط لإرسال النموذج"),
    cancelButton: createLabel("إلغاء", "اضغط لإلغاء العملية"),

    // Checkout
    checkoutButton: createLabel("إتمام الشراء", "اضغط لإتمام عملية الدفع"),
    payButton: createLabel("دفع", "اضغط للدفع"),
    confirmButton: createLabel("تأكيد", "اضغط للتأكيد"),

    // Items
    partnerCard: (name: string) =>
      createLabel(
        `متجر ${name}`,
        `اضغط لرؤية منتجات ${name}، التقييم`
      ),
    productCard: (name: string, price: number) =>
      createLabel(
        `المنتج ${name}`,
        `السعر ${price} جنيه، اضغط لإضافة إلى السلة`
      ),
    favoriteButton: createLabel(
      "إضافة للمفضلة",
      "اضغط لإضافة هذا المتجر إلى المفضلة"
    ),

    // Order
    orderStatus: (status: string) =>
      createLabel(
        `حالة الطلب: ${status}`,
        `طلبك ${status}، اضغط لعرض التفاصيل`
      ),
    trackOrder: createLabel(
      "تتبع الطلب",
      "اضغط لرؤية موقع المندوب على الخريطة"
    ),
    contactDriver: createLabel(
      "الاتصال بالمندوب",
      "اضغط للاتصال المباشر بالمندوب"
    ),

    // Rating
    ratingInput: (current: number, max: number = 5) =>
      createLabel(
        `التقييم ${current} من ${max} نجوم`,
        "اضغط لتغيير التقييم"
      ),
    submitReview: createLabel(
      "إرسال التقييم",
      "اضغط لإرسال تقييمك وملاحظاتك"
    ),
  };

  // ✅ Dynamic label generator
  const generateLabel = (key: string, params?: any): string => {
    const labelMap: Record<string, (p?: any) => string> = {
      // Categories
      restaurant: () => "مطعم",
      pharmacy: () => "صيدلية",
      clinic: () => "عيادة",
      store: () => "متجر",

      // Delivery statuses
      pending: () => "الطلب قيد الانتظار",
      accepted: () => "تم قبول الطلب",
      preparing: () => "الطلب تحت التحضير",
      ready: () => "الطلب جاهز",
      on_way: () => "الطلب في الطريق",
      delivered: () => "تم التوصيل",
      cancelled: () => "تم إلغاء الطلب",

      // Price labels
      pricePerItem: (p) => `السعر: ${p.price} جنيه لكل ${p.item}`,
      totalPrice: (p) => `الإجمالي: ${p.total} جنيه`,
      discount: (p) => `خصم ${p.percent}% (${p.amount} جنيه)`,
      delivery_fee: (p) => `رسم التوصيل: ${p.fee} جنيه`,

      // Ratings
      rating: (p) => `التقييم: ${p.rating} من 5 نجوم من ${p.count} تقييم`,
      your_rating: (p) => `تقييمك: ${p.rating} من 5 نجوم`,

      // Time
      delivery_time: (p) => `وقت التوصيل: ${p.time} دقيقة`,
      opening_hours: (p) => `ساعات العمل: من ${p.start} إلى ${p.end}`,

      // Loyalty
      loyalty_points: (p) => `نقاط الولاء: ${p.points} نقطة`,
      earn_points: (p) => `قم بهذا الشراء واكسب ${p.points} نقطة`,

      // Notifications
      order_update: (p) => `تحديث جديد: ${p.message}`,
      promo_available: (p) => `عرض جديد: ${p.promo} بخصم ${p.discount}%`,
    };

    const generator = labelMap[key];
    return generator ? generator(params) : key;
  };

  // ✅ Announce message for screen readers
  const announceMessage = async (message: string) => {
    try {
      if (a11yEnabled) {
        await AccessibilityInfo.announceForAccessibility(message);
      }
    } catch (error) {
      console.log("Announce error:", error);
    }
  };

  // ✅ Focus on element
  const focusOn = async (ref: any) => {
    try {
      if (ref?.current) {
        const tag = findNodeHandle(ref.current);
        if (tag) {
          await AccessibilityInfo.setAccessibilityFocus(tag);
        }
      }
    } catch (error) {
      console.log("Focus error:", error);
    }
  };

  return {
    a11yEnabled,
    createLabel,
    labels,
    generateLabel,
    announceMessage,
    focusOn,
  };
};

// ✅ Accessibility preset for components
export const A11yPresets = {
  // Button presets
  button: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button',
  }),

  // Pressable with state
  pressable: (label: string, pressed: boolean = false, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button',
    accessibilityState: { disabled: false, selected: pressed },
  }),

  // Image
  image: (label: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'image',
  }),

  // Text/Header
  header: (label: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'header',
  }),

  // List item
  listItem: (label: string, index: number, size: number) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: `عنصر ${index + 1} من ${size}`,
    accessibilityRole: 'button',
  }),

  // Form input
  textInput: (label: string, value: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: `حقل الإدخال، القيمة الحالية: ${value}`,
  }),

  // Status/State
  status: (label: string, state: 'enabled' | 'disabled' | 'selected') => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityState: { disabled: state === 'disabled', selected: state === 'selected' },
  }),
};

// Re-export for convenience
import { findNodeHandle } from 'react-native';
