import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, Linking } from "react-native";
import { router } from "expo-router";

// عناوين البريد الإلكتروني الرسمية لمنصة حلّها
const EMAILS = {
  info: "info@hillaha.com",           // معلومات عامة والتواصل مع العملاء
  webmaster: "webmaster@hillaha.com", // طلبات تسجيل الشركاء الجدد
} as const;
const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

const MENU = [
  { icon: "📦", label: "طلباتي السابقة",    route: "/(tabs)/orders" },
  { icon: "📍", label: "عناويني المحفوظة",  route: null },
  { icon: "💳", label: "طرق الدفع",          route: null },
  { icon: "🎁", label: "نقاط الولاء",        route: "/loyalty" },
  { icon: "🔔", label: "الإشعارات",          route: null },
  { icon: "📄", label: "الشروط والأحكام",    route: "/legal/consent" },
  { icon: "🔒", label: "تغيير كلمة المرور", route: null },
];

export default function Account() {
  const [userName, setUserName]   = useState("...");
  const [userEmail, setUserEmail] = useState("...");

  useEffect(() => {
    const supabase = getSB();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* HEADER */}
      <View style={{
        backgroundColor: C.surface,
        borderBottomWidth: 1, borderBottomColor: C.border,
        paddingBottom: 24, paddingTop: 52,
      }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Image
            source={require("../../assets/halha-logo.png")}
            style={{ width: 40, height: 40, resizeMode: "contain" }}
          />
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: C.primarySoft,
            borderWidth: 3, borderColor: C.primary,
            justifyContent: "center", alignItems: "center",
            marginBottom: 12,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.text }}>{userName}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{userEmail}</Text>

          <View style={{
            marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: C.pinkSoft, paddingVertical: 5, paddingHorizontal: 14,
            borderRadius: 20, borderWidth: 1, borderColor: C.pink,
          }}>
            <Text style={{ fontSize: 14 }}>🎁</Text>
            <Text style={{ fontWeight: "900", color: C.pink, fontSize: 13 }}>120 نقطة ولاء</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/profile/edit")}
          style={{
            marginTop: 16, marginHorizontal: 20,
            paddingVertical: 10, borderRadius: 14,
            borderWidth: 1.5, borderColor: C.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.primary, fontWeight: "700", fontSize: 14 }}>تعديل البيانات ✏️</Text>
        </Pressable>
      </View>

      {/* MENU */}
      <ScrollView style={{ padding: 16 }}>
        {MENU.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => item.route && router.push(item.route as any)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 16, marginBottom: 10,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
            }}
          >
            <View style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: item.label === "نقاط الولاء" ? C.pinkSoft : C.primarySoft,
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            </View>
            <Text style={{ flex: 1, fontWeight: "700", color: C.text, fontSize: 15 }}>{item.label}</Text>
            <Text style={{ color: C.textMuted, fontSize: 18 }}>←</Text>
          </Pressable>
        ))}

        {/* CONTACT */}
        <View style={{
          marginTop: 8, marginBottom: 10, padding: 16, borderRadius: 16,
          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontWeight: "800", color: C.textMuted, fontSize: 11, marginBottom: 10, letterSpacing: 1 }}>
            تواصل معنا
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${EMAILS.info}?subject=استفسار من تطبيق حلّها`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 18 }}>📧</Text>
            </View>
            <View>
              <Text style={{ fontWeight: "700", color: C.text, fontSize: 14 }}>معلومات واستفسارات</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{EMAILS.info}</Text>
            </View>
          </Pressable>
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 6 }} />
          <Pressable
            onPress={() => Linking.openURL(`mailto:${EMAILS.webmaster}?subject=طلب تسجيل شريك جديد`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.pinkSoft, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 18 }}>🤝</Text>
            </View>
            <View>
              <Text style={{ fontWeight: "700", color: C.text, fontSize: 14 }}>تسجيل شريك جديد</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{EMAILS.webmaster}</Text>
            </View>
          </Pressable>
        </View>

        {/* LOGOUT */}
        <Pressable
          onPress={handleLogout}
          style={{
            marginTop: 8, padding: 16, borderRadius: 16,
            backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FECACA",
            alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
          }}
        >
          <Text style={{ fontSize: 18 }}>🚪</Text>
          <Text style={{ fontWeight: "900", color: "#EF4444", fontSize: 15 }}>تسجيل الخروج</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}
