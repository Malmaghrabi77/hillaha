import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView,
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

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("تنبيه", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    const supabase = getSB();
    if (!supabase) { Alert.alert("خطأ", "تعذّر الاتصال بالخادم"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) { Alert.alert("خطأ في تسجيل الدخول", error.message); return; }

      // Verify role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();

      if (profile?.role !== "service_worker") {
        await supabase.auth.signOut();
        Alert.alert("غير مصرح", "هذا الحساب ليس حساب عامل خدمات.\nتواصل مع الإدارة.");
        return;
      }

      router.replace("/(tabs)/bookings");
    } catch (e: any) {
      Alert.alert("خطأ", e.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={{
          backgroundColor: C.primary, paddingTop: Platform.OS === "android" ? 50 : 80,
          paddingBottom: 40, paddingHorizontal: 24, alignItems: "center",
        }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🔧</Text>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "white" }}>حلّها — عامل خدمات</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6, textAlign: "center" }}>
            بوابة فريق الخدمات المنزلية
          </Text>
        </View>

        {/* Form */}
        <View style={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.text, textAlign: "center", marginBottom: 8 }}>
            تسجيل دخول
          </Text>

          <View style={{ gap: 12 }}>
            <TextInput
              placeholder="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: C.text, textAlign: "right",
              }}
              placeholderTextColor={C.textMuted}
            />
            <TextInput
              placeholder="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{
                backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: C.text, textAlign: "right",
              }}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#A78BFA" : C.primary,
              borderRadius: 16, paddingVertical: 16, alignItems: "center",
              shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
              marginTop: 8,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>دخول</Text>
            }
          </Pressable>

          <View style={{
            backgroundColor: C.primarySoft, borderRadius: 14, padding: 14, marginTop: 8,
            borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ color: C.primary, fontSize: 13, fontWeight: "700", textAlign: "center" }}>
              📞 للتسجيل أو الدعم، تواصل مع مشرف حلّها
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
