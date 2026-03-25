import React from 'react';
import { View, ViewProps, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaMetrics, RESPONSIVE } from '../utils/safeArea';

/**
 * ✅ SafeAreaDisplay Component
 * يغلف المحتوى مع ضمان توافق أجهزة مختلفة
 *
 * الاستخدام:
 * <SafeAreaDisplay variant="page">
 *   <Text>محتوى آمن</Text>
 * </SafeAreaDisplay>
 */

interface SafeAreaDisplayProps extends ViewProps {
  variant?: 'fullscreen' | 'page' | 'card' | 'modal';
  safeBottom?: boolean;
  safeTop?: boolean;
  children: React.ReactNode;
  backgroundColor?: string;
}

export function SafeAreaDisplay({
  variant = 'page',
  safeBottom = true,
  safeTop = true,
  children,
  backgroundColor,
  style,
  ...props
}: SafeAreaDisplayProps) {
  const metrics = useSafeAreaMetrics();

  const getPadding = () => {
    const baseSpacing = RESPONSIVE.SPACING.BASE;
    const responsiveSpacing = metrics.isSmallPhone ? baseSpacing * 0.8 : baseSpacing;

    switch (variant) {
      case 'fullscreen':
        return {
          paddingTop: safeTop ? metrics.top : 0,
          paddingBottom: safeBottom ? metrics.bottom : 0,
          paddingHorizontal: 0,
        };

      case 'page':
        return {
          paddingTop: safeTop ? metrics.top + responsiveSpacing : responsiveSpacing,
          paddingBottom: safeBottom ? metrics.bottom + responsiveSpacing : responsiveSpacing,
          paddingHorizontal: responsiveSpacing,
        };

      case 'card':
        return {
          paddingTop: safeTop ? metrics.top + responsiveSpacing * 1.5 : responsiveSpacing * 1.5,
          paddingBottom: safeBottom ? metrics.bottom + responsiveSpacing * 1.5 : responsiveSpacing * 1.5,
          paddingHorizontal: responsiveSpacing * 1.5,
        };

      case 'modal':
        return {
          paddingTop: safeTop ? metrics.top + responsiveSpacing : responsiveSpacing,
          paddingBottom: safeBottom ? metrics.bottom + RESPONSIVE.SPACING.XLARGE : RESPONSIVE.SPACING.XLARGE,
          paddingHorizontal: responsiveSpacing,
        };

      default:
        return {};
    }
  };

  return (
    <RNSafeAreaView
      edges={
        [
          safeTop && 'top',
          safeBottom && 'bottom',
          'left',
          'right',
        ].filter(Boolean) as Array<'top' | 'bottom' | 'left' | 'right'>
      }
      style={[
        {
          flex: 1,
          backgroundColor: backgroundColor ?? '#FAFAFF',
        },
        style,
      ]}
      {...props}
    >
      <View
        style={[
          {
            flex: 1,
            ...getPadding(),
          },
        ]}
      >
        {children}
      </View>
    </RNSafeAreaView>
  );
}

/**
 * ✅ SafeAreaScrollView Component
 * ScrollView مع SafeArea support
 *
 * الاستخدام:
 * <SafeAreaScrollView variant="page">
 *   <Text>محتوى قابل للتمرير</Text>
 * </SafeAreaScrollView>
 */

interface SafeAreaScrollViewProps extends ScrollViewProps {
  variant?: 'page' | 'card' | 'modal' | 'fullscreen';
  safeBottom?: boolean;
  safeTop?: boolean;
}

export function SafeAreaScrollView({
  variant = 'page',
  safeBottom = true,
  safeTop = true,
  children,
  contentContainerStyle,
  style,
  scrollEventThrottle = 16,
  ...props
}: SafeAreaScrollViewProps) {
  const metrics = useSafeAreaMetrics();

  const getPadding = () => {
    const baseSpacing = RESPONSIVE.SPACING.BASE;
    const responsiveSpacing = metrics.isSmallPhone ? baseSpacing * 0.8 : baseSpacing;

    switch (variant) {
      case 'fullscreen':
        return {
          paddingTop: safeTop ? metrics.top : 0,
          paddingBottom: safeBottom ? metrics.bottom : 0,
          paddingHorizontal: 0,
        };

      case 'page':
        return {
          paddingTop: safeTop ? metrics.top + responsiveSpacing : responsiveSpacing,
          paddingBottom: safeBottom ? metrics.bottom + responsiveSpacing : responsiveSpacing,
          paddingHorizontal: responsiveSpacing,
        };

      case 'card':
        return {
          paddingTop: safeTop ? metrics.top + responsiveSpacing * 1.5 : responsiveSpacing * 1.5,
          paddingBottom: safeBottom ? metrics.bottom + responsiveSpacing * 1.5 : responsiveSpacing * 1.5,
          paddingHorizontal: responsiveSpacing * 1.5,
        };

      case 'modal':
        return {
          paddingTop: safeTop ? metrics.top + responsiveSpacing : responsiveSpacing,
          paddingBottom: safeBottom ? metrics.bottom + RESPONSIVE.SPACING.XLARGE : RESPONSIVE.SPACING.XLARGE,
          paddingHorizontal: responsiveSpacing,
        };

      default:
        return {};
    }
  };

  return (
    <ScrollView
      scrollEventThrottle={scrollEventThrottle}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          flexGrow: 1,
          ...getPadding(),
        },
        contentContainerStyle,
      ]}
      style={style}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

/**
 * ✅ SafeAreaFlatList Helper
 * Functions to calculate proper insets for FlatList
 */

export const getFlatListInsets = (metrics: useSafeAreaMetrics) => ({
  contentInsetAdjustmentBehavior: 'automatic' as const,
  scrollIndicatorInsets: {
    bottom: metrics.bottom,
  },
  contentInset: {
    bottom: metrics.bottom,
  },
});
