import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable,
  StatusBar, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";

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

export default function ProfileTab() {
  const [name, setName]     = useState("المندوب");
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as any;
      setName(meta?.full_name ?? data.user?.email?.split("@")[0] ?? "المندوب");
      setEmail(data.user?.email ?? "");
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    const supabase = getSB();
    if (supabase) await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const STATS = [
    { label: "التقييم",      value: "4.9 ⭐",  color: C.warning, bg: "#FEF3C7" },
    { label: "إجمالي توصيلات", value: "247",   color: C.primary, bg: C.primarySoft },
    { label: "معدل القبول",  value: "94%",    color: "#059669", bg: "#D1FAE5" },
  ];

  const MENU_ITEMS = [
    { icon: "📋", label: "سجل التوصيلات" },
    { icon: "💳", label: "بيانات الحساب البنكي" },
    { icon: "📞", label: "الدعم الفني" },
    { icon: "📄", label: "الشروط والأحكام" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.primary, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 28,
        alignItems: "center",
      }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: "rgba(255,255,255,0.2)",
          justifyContent: "center", alignItems: "center", marginBottom: 12,
          borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
        }}>
          <Text style={{ fontSize: 32 }}>🛵</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "900", color: "white" }}>{name}</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{email}</Text>
        <View style={{
          marginTop: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 5,
        }}>
          <Text style={{ fontSize: 12, color: "white", fontWeight: "700" }}>مندوب توصيل معتمد ✓</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* STATS */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {STATS.map((s, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: s.bg, borderRadius: 14, padding: 12, alignItems: "center",
            }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2, textAlign: "center" }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* STATUS CARD */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: C.border,
          flexDirection: "row", alignItems: "center", gap: 14,
        }}>
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: "#D1FAE5",
            justifyContent: "center", alignItems: "center",
          }}>
            <Text style={{ fontSize: 22 }}>✅</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>حسابك نشط</Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              مؤهل لاستقبال الطلبات في منطقة القاهرة الكبرى
            </Text>
          </View>
        </View>

        {/* MENU */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18,
          borderWidth: 1, borderColor: C.border, overflow: "hidden",
        }}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={i}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                padding: 16,
                borderBottomWidth: i < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: C.primarySoft,
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.text }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* LOGOUT */}
        <Pressable
          onPress={handleLogout}
          style={{
            paddingVertical: 14, borderRadius: 16, alignItems: "center",
            backgroundColor: "#FEF2F2",
            borderWidth: 1.5, borderColor: "#FECACA",
          }}
        >
          <Text style={{ color: C.danger, fontWeight: "900", fontSize: 15 }}>
            تسجيل الخروج
          </Text>
        </Pressable>

        <View style={{ height: 10 }} />
      </ScrollView>
    </View>
  );
}
