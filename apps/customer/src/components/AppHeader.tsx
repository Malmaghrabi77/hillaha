import React from 'react';
import { View, Text, Pressable, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import { useDarkMode } from '../hooks/useDarkMode';
import { analyticsTracker } from '../utils/analyticsTracker';
import { ANALYTICS_EVENTS } from '../constants/analyticsEvents';
import { A11yPresets } from '../hooks/useAccessibility';

/**
 * ✅ Reusable App Header Component
 * يوفر رأس الصفحة الموحد مع زر الرجوع والعنوان
 *
 * الاستخدام:
 * <AppHeader
 *   title="المفضلة"
 *   subtitle="5 متاجر"
 *   icon="❤️"
 *   onBackPress={() => router.back()}
 *   trackingScreen="favorites"
 * />
 */

interface AppHeaderProps {
  // Title text displayed prominently
  title: string;

  // Optional subtitle/description text
  subtitle?: string;

  // Optional emoji or icon displayed before title
  icon?: string;

  // Callback when back button is pressed (defaults to router.back())
  onBackPress?: () => void;

  // Screen name for analytics tracking (optional)
  trackingScreen?: string;

  // Custom back button label for accessibility
  backButtonLabel?: string;

  // Show back button (default: true)
  showBackButton?: boolean;

  // Right-side action button (optional)
  rightContent?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  icon,
  onBackPress,
  trackingScreen,
  backButtonLabel = 'رجوع',
  showBackButton = true,
  rightContent,
}: AppHeaderProps) {
  const { isDarkMode, colors } = useDarkMode();

  const handleBackPress = () => {
    if (trackingScreen) {
      analyticsTracker.trackEvent(ANALYTICS_EVENTS.NAVIGATION.BACK_PRESSED, {
        screen: trackingScreen,
      });
    }
    if (onBackPress) {
      onBackPress();
    } else {
      router.canGoBack() ? router.back() : router.replace("/(tabs)/home" as any);
    }
  };

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      <View
        style={{
          paddingTop: Platform.OS === 'android' ? 18 : 54,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {showBackButton && (
          <Pressable
            onPress={handleBackPress}
            {...A11yPresets.button(backButtonLabel)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.primarySoft,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>←</Text>
          </Pressable>
        )}

        {/* Title Section */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {icon && <Text style={{ fontSize: 18 }}>{icon}</Text>}
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: colors.text,
                flex: 1,
              }}
            >
              {title}
            </Text>
          </View>
          {subtitle && (
            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Content (optional actions) */}
        {rightContent}
      </View>
    </>
  );
}
