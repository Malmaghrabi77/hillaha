import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  ScrollView, Image, StatusBar, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { HALHA_THEME } from "@halha/ui";
import { getSupabase } from "@halha/core";

const C = HALHA_THEME.colors;

export default function Register() {
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [agreed, setAgreed]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  async function handleRegister() {
    setError("");
    if (!name.trim())             return setError("يرجى إدخال الاسم الكامل");
    if (!phone.trim())            return setError("يرجى إدخال رقم الهاتف");
    if (!email.trim())            return setError("يرجى إدخال البريد الإلكتروني");
    if (password.length < 8)     return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (password !== confirm)    return setError("كلمتا المرور غير متطابقتين");
    if (!agreed)                  return setError("يجب الموافقة على الشروط والأحكام للمتابعة");

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال");

      const { error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            role: "customer",
          },
        },
      });
      if (err) throw err;
      setSuccess(true);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("already registered") || msg.includes("User already registered")) {
        setError("هذا البريد الإلكتروني مسجل بالفعل — يمكنك تسجيل الدخول");
      } else if (msg.includes("Password should be")) {
        setError("كلمة المرور ضعيفة جداً، استخدم حروف وأرقام");
      } else if (msg.includes("invalid")) {
        setError("صيغة البريد الإلكتروني غير صحيحة");
      } else {
        setError("حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 45,
          backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center", marginBottom: 20,
        }}>
          <Text style={{ fontSize: 44 }}>✓</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 10 }}>
          تم إنشاء حسابك!
        </Text>
        <Text style={{ color: C.textMuted, textAlign: "center", lineHeight: 22, fontSize: 14, marginBottom: 30 }}>
          تم إرسال رابط تأكيد إلى بريدك الإلكتروني{"\n"}
          <Text style={{ fontWeight: "700", color: C.primary }}>{email}</Text>
          {"\n"}يرجى تأكيد الحساب ثم تسجيل الدخول
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{
            width: "100%", paddingVertical: 16, borderRadius: 16,
            backgroundColor: C.primary,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", textAlign: "center", fontSize: 16 }}>
            تسجيل الدخول
          </Text>
        </Pressable>
      </View>
    );
  }

  const FIELDS = [
    { label: "الاسم الكامل",      value: name,     setter: setName,     icon: "👤", keyboard: "default",       placeholder: "مصطفى محمد" },
    { label: "رقم الهاتف",        value: phone,    setter: setPhone,    icon: "📞", keyboard: "phone-pad",      placeholder: "01012345678" },
    { label: "البريد الإلكتروني", value: email,    setter: setEmail,    icon: "✉️",  keyboard: "email-address",   placeholder: "example@email.com" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={{
        position: "absolute", top: -60, left: -50,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: C.pinkSoft, opacity: 0.6,
      }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Image
            source={require("../../assets/halha-logo.png")}
            style={{ width: 64, height: 64, resizeMode: "contain", marginBottom: 10 }}
          />
          <Text style={{ fontSize: 22, fontWeight: "900", color: C.text }}>إنشاء حساب جديد</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>انضم لحلّها دلوقتي</Text>
        </View>

        {/* ERROR */}
        {error ? (
          <View style={{
            padding: 12, borderRadius: 12, marginBottom: 16,
            backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
          }}>
            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* TEXT FIELDS */}
        {FIELDS.map((f, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>
              {f.label}
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center",
              borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
              backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>{f.icon}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.setter as any}
                placeholder={f.placeholder}
                placeholderTextColor={C.textMuted}
                keyboardType={f.keyboard as any}
                autoCapitalize="none"
                style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
              />
            </View>
          </View>
        ))}

        {/* PASSWORD */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>
            كلمة المرور
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="8 أحرف على الأقل"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPass}
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
            />
            <Pressable onPress={() => setShowPass(v => !v)}>
              <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>
        </View>

        {/* CONFIRM PASSWORD */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>
            تأكيد كلمة المرور
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5,
            borderColor: confirm && confirm !== password ? "#FECACA" : C.border,
            borderRadius: 14,
            backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="أعد كتابة كلمة المرور"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPass}
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
            />
            {confirm.length > 0 && (
              <Text style={{ fontSize: 16 }}>{confirm === password ? "✅" : "❌"}</Text>
            )}
          </View>
        </View>

        {/* CONSENT CHECKBOX */}
        <Pressable
          onPress={() => setAgreed(v => !v)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            padding: 14, borderRadius: 14, marginBottom: 20,
            backgroundColor: agreed ? C.primarySoft : C.surface,
            borderWidth: 1.5, borderColor: agreed ? C.primary : C.border,
          }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 8,
            borderWidth: 2, borderColor: agreed ? C.primary : C.border,
            backgroundColor: agreed ? C.primary : "transparent",
            justifyContent: "center", alignItems: "center",
          }}>
            {agreed && <Text style={{ color: "white", fontSize: 14, fontWeight: "900" }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 20 }}>
            أوافق على{" "}
            <Text
              style={{ color: C.primary, fontWeight: "700" }}
              onPress={() => router.push("/legal/consent")}
            >
              الشروط والأحكام
            </Text>
            {" "}بما فيها ضمان رضا العميل
          </Text>
        </Pressable>

        {/* REGISTER BUTTON */}
        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={{
            paddingVertical: 16, borderRadius: 16, marginBottom: 16,
            backgroundColor: loading ? C.primarySoft : C.pink,
            alignItems: "center",
            shadowColor: C.pink, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>إنشاء الحساب</Text>
          }
        </Pressable>

        {/* LOGIN LINK */}
        <Pressable onPress={() => router.replace("/(auth)/login")} style={{ alignItems: "center" }}>
          <Text style={{ color: C.textMuted, fontSize: 13 }}>
            عندك حساب بالفعل؟{" "}
            <Text style={{ color: C.primary, fontWeight: "700" }}>تسجيل الدخول</Text>
          </Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}
