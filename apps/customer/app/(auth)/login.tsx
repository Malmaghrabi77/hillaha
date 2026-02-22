import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable,
  ScrollView, Image, StatusBar, ActivityIndicator,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
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

const STORE_EMAIL = "hillaha_customer_email";
const STORE_PASS  = "hillaha_customer_pass";

export default function Login() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [biometricReady, setBioReady] = useState(false);
  const [bioLoading, setBioLoading]   = useState(false);

  // Check if biometric login is available
  useEffect(() => {
    async function checkBiometric() {
      const hasHw      = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      const savedEmail = await SecureStore.getItemAsync(STORE_EMAIL);
      setBioReady(hasHw && enrolled && !!savedEmail);
    }
    checkBiometric();
  }, []);

  // ── Email / password login ────────────────────────────────────────

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSB();
      if (!supabase) throw new Error("خطأ في الاتصال");
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) throw err;

      // Save credentials for future biometric login
      await SecureStore.setItemAsync(STORE_EMAIL, email.trim().toLowerCase());
      await SecureStore.setItemAsync(STORE_PASS,  password);
      setBioReady(true);

      router.replace("/(tabs)/home");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Invalid login credentials")) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (msg.includes("Email not confirmed")) {
        setError("يرجى تأكيد بريدك الإلكتروني أولاً");
      } else {
        setError("حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Biometric login ──────────────────────────────────────────────

  async function handleBiometricLogin() {
    setBioLoading(true);
    setError("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:  "تسجيل الدخول بالسمات الحيوية",
        cancelLabel:    "إلغاء",
        fallbackLabel:  "استخدم كلمة المرور",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        setBioLoading(false);
        return;
      }

      const savedEmail = await SecureStore.getItemAsync(STORE_EMAIL);
      const savedPass  = await SecureStore.getItemAsync(STORE_PASS);
      if (!savedEmail || !savedPass) {
        setError("يرجى تسجيل الدخول بالبريد والكلمة مرة واحدة أولاً");
        setBioLoading(false);
        return;
      }

      const supabase = getSB();
      if (!supabase) throw new Error("خطأ في الاتصال");
      const { error: err } = await supabase.auth.signInWithPassword({
        email: savedEmail,
        password: savedPass,
      });
      if (err) throw err;
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError("فشل تسجيل الدخول، يرجى استخدام البريد وكلمة المرور");
    } finally {
      setBioLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* BG CIRCLES */}
      <View style={{ position: "absolute", top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: C.primarySoft, opacity: 0.7 }} />
      <View style={{ position: "absolute", bottom: 100, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: C.pinkSoft, opacity: 0.5 }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* LOGO */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Image
            source={require("../../assets/hillaha-logo.png")}
            style={{ width: 80, height: 80, resizeMode: "contain", marginBottom: 12 }}
          />
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>تسجيل الدخول</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>أهلاً بعودتك لحلّها</Text>
        </View>

        {/* ── BIOMETRIC QUICK LOGIN ─────────────────────────── */}
        {biometricReady && (
          <Pressable
            onPress={handleBiometricLogin}
            disabled={bioLoading}
            style={{
              backgroundColor: C.primarySoft,
              borderRadius: 20, padding: 18, marginBottom: 20,
              alignItems: "center", gap: 8,
              borderWidth: 2, borderColor: C.primary,
              shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
            }}
          >
            {bioLoading ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <>
                <Text style={{ fontSize: 42 }}>🔐</Text>
                <Text style={{ fontWeight: "900", fontSize: 16, color: C.primary }}>دخول ببصمة الإصبع / الوجه</Text>
                <Text style={{ fontSize: 12, color: C.textMuted }}>اضغط للمصادقة الحيوية</Text>
              </>
            )}
          </Pressable>
        )}

        {/* DIVIDER */}
        {biometricReady && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>أو بالبريد وكلمة المرور</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>
        )}

        {/* ERROR */}
        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}>
            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        {/* EMAIL */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>البريد الإلكتروني</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="example@email.com" placeholderTextColor={C.textMuted}
              keyboardType="email-address" autoCapitalize="none"
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
            />
          </View>
        </View>

        {/* PASSWORD */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>كلمة المرور</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
            <TextInput
              value={password} onChangeText={setPassword}
              placeholder="كلمة المرور" placeholderTextColor={C.textMuted}
              secureTextEntry={!showPass}
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
            />
            <Pressable onPress={() => setShowPass(v => !v)}>
              <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>
        </View>

        {/* FORGOT PASSWORD */}
        <Pressable style={{ alignSelf: "flex-start", marginBottom: 24 }}>
          <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>نسيت كلمة المرور؟</Text>
        </Pressable>

        {/* LOGIN BUTTON */}
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={{
            paddingVertical: 16, borderRadius: 16, marginBottom: 16,
            backgroundColor: loading ? C.primarySoft : C.primary,
            alignItems: "center",
            shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>دخول</Text>
          }
        </Pressable>

        {/* DIVIDER */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <Text style={{ color: C.textMuted, fontSize: 12 }}>أو</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </View>

        {/* REGISTER LINK */}
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={{
            paddingVertical: 14, borderRadius: 16,
            borderWidth: 2, borderColor: C.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.primary, fontWeight: "900", fontSize: 15 }}>إنشاء حساب جديد</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
