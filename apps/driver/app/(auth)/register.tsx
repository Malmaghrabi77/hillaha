import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  Image, StatusBar, ActivityIndicator,
  ScrollView, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { getSupabase } from "@halha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", danger: "#EF4444",
  success: "#059669",
};

type Step = 1 | 2;

export default function DriverRegister() {
  const [step, setStep]         = useState<Step>(1);
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [selfieUri, setSelfieUri]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // ── Step 1 validation ─────────────────────────────────

  function goToSelfie() {
    setError("");
    if (!name.trim())        return setError("يرجى إدخال الاسم");
    if (!phone.trim())       return setError("يرجى إدخال رقم الهاتف");
    if (!email.trim())       return setError("يرجى إدخال البريد الإلكتروني");
    if (password.length < 6) return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    setStep(2);
  }

  // ── Take selfie ─────────────────────────────────────────

  async function takeSelfie() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مرفوضة", "حلّها يحتاج الكاميرا لالتقاط صورتك. فعّل الصلاحية من الإعدادات.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelfieUri(result.assets[0].uri);
      setError("");
    }
  }

  // ── Submit ───────────────────────────────────────────────

  async function handleRegister() {
    setError("");
    if (!selfieUri) return setError("يرجى التقاط صورتك الشخصية للمتابعة");
    setLoading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال");

      // 1. Sign up
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim(), phone: phone.trim(), role: "driver" },
        },
      });
      if (signUpErr) throw signUpErr;
      if (!data.user) throw new Error("فشل إنشاء الحساب");

      const userId   = data.user.id;
      const filePath = `drivers/${userId}.jpg`;

      // 2. Upload selfie to Supabase Storage → avatars/drivers/{userId}.jpg
      const fetchRes  = await fetch(selfieUri);
      const blob      = await fetchRes.blob();
      const arrayBuf  = await blob.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuf, { contentType: "image/jpeg", upsert: true });
      if (uploadErr) throw uploadErr;

      // 3. Get public URL and persist to profile
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await supabase.from("profiles").upsert({
        id:         userId,
        full_name:  name.trim(),
        phone:      phone.trim(),
        role:       "driver",
        avatar_url: publicUrl,
      });

      Alert.alert(
        "تم التسجيل! 🎉",
        "تم إنشاء حسابك بنجاح. تحقق من بريدك لتأكيد الحساب.",
        [{ text: "حسناً", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("already registered") || msg.includes("User already registered"))
        setError("هذا البريد الإلكتروني مسجل مسبقاً");
      else
        setError("حدث خطأ في التسجيل، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* BG circles */}
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />
      <View style={{ position: "absolute", bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.pinkSoft, opacity: 0.6 }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* BACK */}
        <Pressable
          onPress={() => step === 2 ? setStep(1) : router.back()}
          style={{ alignSelf: "flex-start", marginBottom: 20 }}
        >
          <Text style={{ fontSize: 22, color: C.textMuted }}>←</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>انضم كمندوب</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" }}>
            {step === 1 ? "أدخل بياناتك للتسجيل" : "التقط صورتك الشخصية كمعرّف"}
          </Text>
        </View>

        {/* STEP INDICATORS */}
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {([1, 2] as const).map(s => (
            <View key={s} style={{
              height: 5, flex: 1, borderRadius: 3,
              backgroundColor: s <= step ? C.primary : C.border,
            }} />
          ))}
        </View>

        {/* ERROR */}
        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        {/* ── STEP 1: INFO ─────────────────────────────── */}
        {step === 1 && (
          <View style={{
            backgroundColor: C.surface, borderRadius: 24, padding: 24,
            borderWidth: 1, borderColor: C.border,
            shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1, shadowRadius: 20, elevation: 4,
          }}>
            {/* Name */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>الاسم الكامل</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>👤</Text>
                <TextInput
                  value={name} onChangeText={setName}
                  placeholder="محمد أحمد" placeholderTextColor={C.textMuted}
                  style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>رقم الهاتف</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>📱</Text>
                <TextInput
                  value={phone} onChangeText={setPhone}
                  placeholder="01xxxxxxxxx" placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
                />
              </View>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>البريد الإلكتروني</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>✉️</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  placeholder="example@email.com" placeholderTextColor={C.textMuted}
                  keyboardType="email-address" autoCapitalize="none"
                  style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>كلمة المرور</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
                <TextInput
                  value={password} onChangeText={setPassword}
                  placeholder="6 أحرف على الأقل" placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPass}
                  style={{ flex: 1, fontSize: 14, color: C.text }}
                />
                <Pressable onPress={() => setShowPass(v => !v)}>
                  <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={goToSelfie}
              style={{
                paddingVertical: 16, borderRadius: 16, alignItems: "center",
                backgroundColor: C.primary,
                shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>التالي — صورتك الشخصية 📷</Text>
            </Pressable>
          </View>
        )}

        {/* ── STEP 2: SELFIE ───────────────────────────── */}
        {step === 2 && (
          <View style={{
            backgroundColor: C.surface, borderRadius: 24, padding: 24,
            borderWidth: 1, borderColor: C.border,
            shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1, shadowRadius: 20, elevation: 4,
            alignItems: "center",
          }}>

            {/* Info note */}
            <View style={{ backgroundColor: C.primarySoft, borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: C.border, width: "100%" }}>
              <Text style={{ fontSize: 13, color: "#4C1D95", fontWeight: "700", textAlign: "center", lineHeight: 22 }}>
                صورتك الشخصية ستكون معرّفك الدائم في التطبيق{"\n"}
                يراها العملاء والمتاجر للتحقق من هويتك
              </Text>
            </View>

            {/* Selfie preview / placeholder */}
            <Pressable onPress={takeSelfie} style={{ marginBottom: 20 }}>
              {selfieUri ? (
                <View style={{
                  width: 160, height: 160, borderRadius: 80, overflow: "hidden",
                  borderWidth: 4, borderColor: C.primary,
                  shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
                }}>
                  <Image source={{ uri: selfieUri }} style={{ width: "100%", height: "100%" }} />
                </View>
              ) : (
                <View style={{
                  width: 160, height: 160, borderRadius: 80,
                  borderWidth: 3, borderColor: C.primary, borderStyle: "dashed",
                  backgroundColor: C.primarySoft,
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Text style={{ fontSize: 52 }}>📷</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.primary, marginTop: 6 }}>اضغط للتصوير</Text>
                </View>
              )}
            </Pressable>

            {/* Retake button */}
            {selfieUri && (
              <Pressable
                onPress={takeSelfie}
                style={{ marginBottom: 20, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.textMuted }}>إعادة التصوير 🔄</Text>
              </Pressable>
            )}

            {!selfieUri && (
              <Pressable
                onPress={takeSelfie}
                style={{ width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.primary, marginBottom: 16 }}
              >
                <Text style={{ color: C.primary, fontWeight: "900", fontSize: 15 }}>📸 التقط صورتك الآن</Text>
              </Pressable>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleRegister}
              disabled={loading || !selfieUri}
              style={{
                width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center",
                backgroundColor: (!selfieUri || loading) ? "#E5E7EB" : C.success,
                shadowColor: C.success,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: loading || !selfieUri ? 0 : 0.35, shadowRadius: 12,
                elevation: loading || !selfieUri ? 0 : 6,
              }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: !selfieUri ? "#9CA3AF" : "white", fontWeight: "900", fontSize: 16 }}>إنشاء الحساب ✓</Text>
              }
            </Pressable>
          </View>
        )}

        <Text style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.textMuted }}>
          عندك حساب بالفعل؟{" "}
          <Text onPress={() => router.replace("/(auth)/login")} style={{ color: C.primary, fontWeight: "700" }}>تسجيل الدخول</Text>
        </Text>

      </ScrollView>
    </View>
  );
}
