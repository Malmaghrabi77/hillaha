import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView, StatusBar, Platform, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { analyticsTracker } from "../src/utils/analyticsTracker";
import { A11yPresets } from "../src/hooks/useAccessibility";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

interface MedicalService {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  bgColor: string;
  route: string;
  badge?: string;
}

const MEDICAL_SERVICES: MedicalService[] = [
  {
    id: "booking",
    title: "حجز موعد طبيب",
    subtitle: "استشارة طبية فورية",
    description: "احجز موعد مع أطباء متخصصين وحصل على استشارة طبية عن بعد",
    icon: "👨‍⚕️",
    bgColor: "#DBEAFE",
    route: "/medical/booking",
    badge: "جديد",
  },
  {
    id: "prescription",
    title: "إدارة الروشتات",
    subtitle: "رفع وتتبع الأدوية",
    description: "رفع روشتات طبية وتتبع طلبات الأدوية الخاصة بك",
    icon: "💊",
    bgColor: "#FEE2E4",
    route: "/medical/prescription",
  },
];

export default function Medical() {
  const { isDarkMode, colors } = useDarkMode();

  useEffect(() => {
    analyticsTracker.trackScreenView("medical_hub_screen");
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={{
        backgroundColor: colors.surface,
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 18,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("medical_back");
            router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
          }}
          {...A11yPresets.pressable}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}
        >
          <Text style={{ fontSize: 20, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, marginBottom: 6 }}>
          🏥 الخدمات الطبية
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          احصل على استشارات طبية وإدارة الأدوية
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Services Grid */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {MEDICAL_SERVICES.map((service) => (
            <Pressable
              key={service.id}
              onPress={() => {
                analyticsTracker.trackEvent("medical_service_open", { serviceId: service.id, serviceName: service.title });
                router.push(service.route as any);
              }}
              {...A11yPresets.pressable}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                {/* Icon Box */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: service.bgColor,
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 28 }}>{service.icon}</Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>
                      {service.title}
                    </Text>
                    {service.badge && (
                      <View style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 3,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                      }}>
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>
                          {service.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 6 }}>
                    {service.subtitle}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                    {service.description}
                  </Text>
                </View>

                {/* Arrow */}
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.primarySoft,
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 16 }}>→</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Info Card */}
        <View style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 18,
          padding: 18,
          borderWidth: 1,
          borderColor: "#86EFAC",
          marginBottom: 20,
        }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Text style={{ fontSize: 24 }}>ℹ️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#166534", marginBottom: 4 }}>
                معلومات مهمة
              </Text>
              <Text style={{ fontSize: 12, color: "#166534", lineHeight: 18 }}>
                جميع الاستشارات الطبية تتم مع أطباء معتمدين. يتم حفظ جميع البيانات الطبية بسرية تامة وفق معايير الحماية العالمية.
              </Text>
            </View>
          </View>
        </View>

        {/* Features List */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text, marginBottom: 12 }}>
            ✨ المميزات
          </Text>
          {[
            { icon: "🕐", text: "استشارات متاحة 24/7" },
            { icon: "👨‍⚕️", text: "أطباء متخصصون معتمدون" },
            { icon: "🔒", text: "بيانات طبية آمنة وسرية" },
            { icon: "💬", text: "رد سريع على الاستفسارات" },
          ].map((feature, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
              <Text style={{ fontSize: 16 }}>{feature.icon}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
