import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

/**
 * ✅ Safe Area Utilities
 * توفير إدارة موحدة للـ Safe Area والأجهزة المختلفة
 */

export interface SafeAreaMetrics {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  isLandscape: boolean;
  isSmallPhone: boolean;
  isMediumDevice: boolean;
  isLargeTablet: boolean;
}

/**
 * ✅ Hook: useSafeAreaMetrics
 * يوفر معلومات Safe Area كاملة مع تصنيفات الجهاز
 */
export const useSafeAreaMetrics = (): SafeAreaMetrics => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isSmallPhone = width < 375; // iPhone SE, iPhone 8
  const isMediumDevice = width >= 375 && width < 768; // Normal phones
  const isLargeTablet = width >= 768; // Tablets

  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    width,
    height,
    isLandscape,
    isSmallPhone,
    isMediumDevice,
    isLargeTablet,
  };
};

/**
 * ✅ Responsive Design Constants
 */
export const RESPONSIVE = {
  // Screen size breakpoints
  BREAKPOINTS: {
    SMALL_PHONE: 375,     // iPhone SE, etc.
    MEDIUM_PHONE: 414,    // iPhone 11, etc.
    LARGE_PHONE: 500,     // Large Android phones
    TABLET: 768,          // iPad and large tablets
  },

  // Padding/Margin standards
  SPACING: {
    MICRO: 4,
    TINY: 8,
    SMALL: 12,
    BASE: 16,
    MEDIUM: 20,
    LARGE: 24,
    XLARGE: 32,
    XXLARGE: 48,
  },

  // Common component sizes
  SIZES: {
    TAP_TARGET: 44, // Min tap target size (accessibility)
    ICON_SMALL: 20,
    ICON_BASE: 24,
    ICON_LARGE: 32,
    ICON_XLARGE: 48,
  },

  // Border radius
  BORDER_RADIUS: {
    SMALL: 8,
    BASE: 12,
    MEDIUM: 16,
    LARGE: 20,
    ROUND: 999,
  },

  // Font sizes (should be scaled based on device)
  FONT: {
    XS: 10,
    SMALL: 12,
    BASE: 14,
    MEDIUM: 16,
    LARGE: 18,
    XLARGE: 20,
    XXLARGE: 24,
    TITLE: 28,
    HERO: 32,
  },
};

/**
 * ✅ Function: getResponsiveSpacing
 * أحجام الـ padding/margin بناءً على حجم الجهاز
 */
export const getResponsiveSpacing = (
  baseSpacing: number,
  metrics: SafeAreaMetrics
): number => {
  if (metrics.isSmallPhone) {
    return Math.max(baseSpacing * 0.75, 4);
  }
  if (metrics.isLargeTablet) {
    return baseSpacing * 1.25;
  }
  return baseSpacing;
};

/**
 * ✅ Function: getResponsiveFontSize
 * أحجام الخطوط بناءً على حجم الجهاز
 */
export const getResponsiveFontSize = (
  baseFontSize: number,
  metrics: SafeAreaMetrics
): number => {
  if (metrics.isSmallPhone) {
    return Math.max(baseFontSize * 0.9, 10);
  }
  if (metrics.isLargeTablet) {
    return baseFontSize * 1.15;
  }
  return baseFontSize;
};

/**
 * ✅ Function: getResponsiveWidth
 * عرض الـ containers بناءً على حجم الجهاز
 */
export const getResponsiveWidth = (
  metrics: SafeAreaMetrics,
  percentage: number = 100
): number => {
  const availableWidth = metrics.width - metrics.left - metrics.right;
  return (availableWidth * percentage) / 100;
};

/**
 * ✅ Function: createSafeAreaPadding
 * إنشاء padding object يأخذ في الاعتبار Safe Area
 */
export const createSafeAreaPadding = (
  metrics: SafeAreaMetrics,
  options: {
    horizontal?: number;
    vertical?: number;
    top?: number;
    bottom?: number;
    includeSafeArea?: boolean;
  } = {}
) => {
  const {
    horizontal = RESPONSIVE.SPACING.BASE,
    vertical = RESPONSIVE.SPACING.BASE,
    top,
    bottom,
    includeSafeArea = true,
  } = options;

  return {
    paddingHorizontal: horizontal + (includeSafeArea ? metrics.left + metrics.right : 0),
    paddingTop: (top ?? vertical) + (includeSafeArea ? metrics.top : 0),
    paddingBottom: (bottom ?? vertical) + (includeSafeArea ? metrics.bottom : 0),
  };
};

/**
 * ✅ Function: createKeyboardAvoidingPadding
 * padding خاص بـ inputs والـ forms (يتجنب لوحة المفاتيح)
 */
export const createKeyboardAvoidingPadding = (
  metrics: SafeAreaMetrics,
  baseBottom: number = RESPONSIVE.SPACING.MEDIUM
) => {
  return {
    paddingBottom: baseBottom + metrics.bottom,
  };
};

/**
 * ✅ Function: createScrollViewContentInset
 * contentInset صحيح للـ ScrollView والـ FlatList
 * يضمن عدم إخفاء المحتوى تحت شريط التنقل السفلي
 */
export const createScrollViewContentInset = (
  metrics: SafeAreaMetrics,
  addedBottom: number = 0
) => {
  return {
    contentInset: {
      bottom: metrics.bottom + addedBottom,
    },
    contentContainerStyle: {
      paddingBottom: metrics.bottom + addedBottom,
    },
  };
};

/**
 * ✅ Constants: Standard Safe Area Configurations
 */
export const SAFE_AREA_CONFIGS = {
  // Full screen with safe area
  FULL_SCREEN: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },

  // Standard page with padding
  STANDARD_PAGE: {
    paddingHorizontal: RESPONSIVE.SPACING.BASE,
    paddingVertical: RESPONSIVE.SPACING.BASE,
  },

  // Card/Modal with padding
  CARD: {
    paddingHorizontal: RESPONSIVE.SPACING.MEDIUM,
    paddingVertical: RESPONSIVE.SPACING.MEDIUM,
  },

  // Bottom sheet safe area
  BOTTOM_SHEET: {
    paddingHorizontal: RESPONSIVE.SPACING.MEDIUM,
    paddingTop: RESPONSIVE.SPACING.MEDIUM,
    paddingBottom: RESPONSIVE.SPACING.XLARGE,
  },
};
