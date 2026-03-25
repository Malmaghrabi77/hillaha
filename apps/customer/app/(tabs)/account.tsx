import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, Linking } from "react-native";
import { router } from "expo-router";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSupabase } from "../../hooks/useSupabase";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";

// عناوين البريد الإلكتروني الرسمية لمنصة حلّها
const EMAILS = {
  info: "info@hillaha.com",
  webmaster: "webmaster@hillaha.com",
} as const;

const MENU = [
  { icon: "📦", label: "طلباتي السابقة",    route: "/(tabs)/orders" },
  { icon: "📍", label: "عناويني المحفوظة",  route: "/addresses" },
  { icon: "❤️", label: "المفضلة",            route: "/favorites" },
  { icon: "🎟️", label: "أكود الخصم",        route: "/promo" },
  { icon: "🎁", label: "نقاط الولاء",        route: "/loyalty" },
  { icon: "💳", label: "طرق الدفع",          route: null },
  { icon: "🔔", label: "الإشعارات",          route: null },
  { icon: "📄", label: "الشروط والأحكام",    route: "/legal/consent" },
  { icon: "🔒", label: "تغيير كلمة المرور", route: null },
];

export default function Account() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [userName, setUserName]   = useState("...");
  const [userEmail, setUserEmail] = useState("...");

  useEffect(() => {
    // 📊 تتبع عرض الشاشة
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.ACCOUNT);

    if (!supabase) return;
    supabase.auth.getUser().then(({ data }: any) => {
      if (data.user) {
        setUserEmail(data.user.email ?? "");
        const meta = data.user.user_metadata as any;
        setUserName(meta?.full_name ?? meta?.name ?? data.user.email?.split("@")[0] ?? "مستخدم");
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = getSB();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/(auth)");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* HEADER */}
      <View style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        paddingBottom: 24, paddingTop: 52,
      }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Image
            source={require("../../assets/hillaha-logo.png")}
            style={{ width: 40, height: 40, resizeMode: "contain" }}
            {...A11yPresets.image("شعار تطبيق حلّها")}
          />
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: isDarkMode ? colors.primarySoft : colors.primarySoft,
            borderWidth: 3, borderColor: colors.primary,
            justifyContent: "center", alignItems: "center",
            marginBottom: 12,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{userName}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{userEmail}</Text>

          <View style={{
            marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: colors.pinkSoft, paddingVertical: 5, paddingHorizontal: 14,
            borderRadius: 20, borderWidth: 1, borderColor: colors.pink,
          }}>
            <Text style={{ fontSize: 14 }}>🎁</Text>
            <Text style={{ fontWeight: "900", color: colors.pink, fontSize: 13 }}>120 نقطة ولاء</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent(ANALYTICS_EVENTS.PROFILE.EDIT_CLICKED, {});
            router.push("/profile/edit");
          }}
          {...A11yPresets.button("تعديل البيانات الشخصية", "انقر للانتقال إلى صفحة تعديل البيانات")}
          style={{
            marginTop: 16, marginHorizontal: 20,
            paddingVertical: 10, borderRadius: 14,
            borderWidth: 1.5, borderColor: colors.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>تعديل البيانات ✏️</Text>
        </Pressable>
      </View>

      {/* MENU */}
      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 80 }}>
        {MENU.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => {
              if (item.route) {
                analyticsTracker.trackEvent(ANALYTICS_EVENTS.NAVIGATION.MENU_ITEM_CLICKED, { label: item.label });
                router.push(item.route as any);
              }
            }}
            {...A11yPresets.button(item.label, `انقر للانتقال إلى ${item.label}`)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 16, marginBottom: 10,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            }}
          >
            <View style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: item.label === "نقاط الولاء" ? colors.pinkSoft : colors.primarySoft,
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            </View>
            <Text style={{ flex: 1, fontWeight: "700", color: colors.text, fontSize: 15 }}>{item.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>←</Text>
          </Pressable>
        ))}

        {/* CONTACT */}
        <View style={{
          marginTop: 8, marginBottom: 10, padding: 16, borderRadius: 16,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontWeight: "800", color: colors.textMuted, fontSize: 11, marginBottom: 10, letterSpacing: 1 }}>
            تواصل معنا
          </Text>
          <Pressable
            onPress={() => {
              analyticsTracker.trackEvent(ANALYTICS_EVENTS.CONTACT.EMAIL_CLICKED, { type: 'info' });
              Linking.openURL(`mailto:${EMAILS.info}?subject=استفسار من تطبيق حلّها`);
            }}
            {...A11yPresets.button("معلومات واستفسارات", `بريد إلكتروني: ${EMAILS.info}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 18 }}>📧</Text>
            </View>
            <View>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>معلومات واستفسارات</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{EMAILS.info}</Text>
            </View>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
          <Pressable
            onPress={() => {
              analyticsTracker.trackEvent(ANALYTICS_EVENTS.CONTACT.EMAIL_CLICKED, { type: 'webmaster' });
              Linking.openURL(`mailto:${EMAILS.webmaster}?subject=طلب تسجيل شريك جديد`);
            }}
            {...A11yPresets.button("تسجيل شريك جديد", `بريد إلكتروني: ${EMAILS.webmaster}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.pinkSoft, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 18 }}>🤝</Text>
            </View>
            <View>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>تسجيل شريك جديد</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{EMAILS.webmaster}</Text>
            </View>
          </Pressable>
        </View>

        {/* LOGOUT */}
          <Pressable
            onPress={handleLogout}
            {...A11yPresets.button("تسجيل الخروج", "انقر لتسجيل الخروج من حسابك")}
            style={{
              marginTop: 8, padding: 16, borderRadius: 16,
              backgroundColor: isDarkMode ? colors.dangerSoft : "#FEF2F2",
              borderWidth: 1.5, borderColor: isDarkMode ? colors.danger : "#FECACA",
              alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>🚪</Text>
            <Text style={{ fontWeight: "900", color: colors.danger, fontSize: 15 }}>تسجيل الخروج</Text>
          </Pressable>
      </ScrollView>
    </View>
  );
}
