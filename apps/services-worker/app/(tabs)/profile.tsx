import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, Alert, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";

const C = {
  bg: "#FAFAFF",      surface: "#FFFFFF",
  primary: "#7C3AED", primarySoft: "#EDE9FE",
  text: "#1F1B2E",    textMuted: "#6B6480",
  border: "#E7E3FF",  danger: "#EF4444",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

export default function Profile() {
  const [profile,  setProfile]  = useState<{ full_name: string; phone: string; role: string } | null>(null);
  const [email,    setEmail]    = useState("");
  const [stats,    setStats]    = useState({ completed: 0, total: 0 });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const sb = getSB();
    if (!sb) { setLoading(false); return; }

    sb.auth.getUser().then(async ({ data }: any) => {
      const user = data.user;
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? "");

      const [{ data: prof }, { data: jobs }] = await Promise.all([
        sb.from("profiles").select("full_name, phone, role").eq("id", user.id).single(),
        sb.from("service_bookings").select("price, status"),
      ]);
      if (prof) setProfile(prof);
      if (jobs) {
        const completed = jobs.filter((j: any) => j.status === "completed");
        setStats({
          completed: completed.length,
          total: completed.reduce((s: number, j: any) => s + (j.price ?? 0), 0),
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          const sb = getSB();
          await sb?.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const MENU_ITEMS = [
    { icon: "📋", label: "سجل الخدمات",         onPress: () => router.push("/(tabs)/history") },
    { icon: "📞", label: "تواصل مع الإدارة",     onPress: () => {} },
    { icon: "📜", label: "شروط الاستخدام",        onPress: () => {} },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{
        backgroundColor: C.primary,
        paddingTop: Platform.OS === "android" ? 40 : 60,
        paddingHorizontal: 18, paddingBottom: 30,
        alignItems: "center",
      }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: "rgba(255,255,255,0.2)",
          justifyContent: "center", alignItems: "center",
          marginBottom: 12,
        }}>
          <Text style={{ fontSize: 38 }}>🔧</Text>
        </View>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
          {profile?.full_name || "العامل"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>{email}</Text>
        {profile?.phone && (
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 }}>
            📞 {profile.phone}
          </Text>
        )}
        <View style={{
          backgroundColor: "#34D399", paddingVertical: 4, paddingHorizontal: 12,
          borderRadius: 20, marginTop: 10,
        }}>
          <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>✓ عامل خدمات — نشط</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          {[
            { label: "خدمة مكتملة", value: stats.completed, icon: "✅" },
            { label: "جنيه مكتسب",  value: stats.total,     icon: "💰" },
          ].map((item, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: C.surface, borderRadius: 16,
              padding: 16, alignItems: "center",
              borderWidth: 1, borderColor: C.border,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: C.primary }}>{item.value}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: "center" }}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18,
          borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 16,
        }}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={i}
              onPress={item.onPress}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                padding: 16,
                borderBottomWidth: i < MENU_ITEMS.length - 1 ? 1 : 0,
                borderColor: C.border,
              }}
            >
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.text }}>
                {item.label}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={{
            backgroundColor: "#FEE2E2", borderRadius: 16, padding: 16,
            alignItems: "center", borderWidth: 1, borderColor: "#FCA5A5",
          }}
        >
          <Text style={{ color: C.danger, fontWeight: "900", fontSize: 15 }}>
            🚪 تسجيل الخروج
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
