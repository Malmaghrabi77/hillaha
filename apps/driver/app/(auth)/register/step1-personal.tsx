import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StatusBar, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useRegistration } from "../../_lib/registration-context";
import { C } from "../../_lib/constants";

const TOTAL_STEPS = 7;

export default function Step1Personal() {
  const { data, update } = useRegistration();
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  function next() {
    setError("");
    if (!data.fullName.trim()) return setError("يرجى إدخال الاسم");
    if (!data.phone.trim()) return setError("يرجى إدخال رقم الهاتف");
    if (!data.email.trim()) return setError("يرجى إدخال البريد الإلكتروني");
    if (data.password.length < 6)
      return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    router.push("/(auth)/register/step2-vehicle");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />
      <View style={{ position: "absolute", bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.pinkSoft, opacity: 0.6 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>انضم كمندوب</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>أدخل بياناتك الشخصية</Text>
        </View>

        {/* Progress bar */}
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: i < 1 ? C.primary : C.border }} />
          ))}
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: "#FECACA" }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, elevation: 4 }}>
          {/* Name */}
          <Field label="الاسم الكامل" icon="👤" value={data.fullName} onChange={(v) => update({ fullName: v })} placeholder="محمد أحمد" />
          {/* Phone */}
          <Field label="رقم الهاتف" icon="📱" value={data.phone} onChange={(v) => update({ phone: v })} placeholder="01xxxxxxxxx" keyboardType="phone-pad" />
          {/* Email */}
          <Field label="البريد الإلكتروني" icon="✉️" value={data.email} onChange={(v) => update({ email: v })} placeholder="example@email.com" keyboardType="email-address" autoCapitalize="none" />
          {/* Password */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>كلمة المرور</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
              <Text style={{ fontSize: 18 }}>🔒</Text>
              <TextInput
                value={data.password}
                onChangeText={(v) => update({ password: v })}
                placeholder="6 أحرف على الأقل"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                style={{ flex: 1, fontSize: 14, color: C.text }}
              />
              <Pressable onPress={() => setShowPass((v) => !v)}>
                <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={next}
            style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: C.primary, elevation: 6 }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>التالي — نوع المركبة 🚗</Text>
          </Pressable>
        </View>

        <Text style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.textMuted }}>
          عندك حساب بالفعل؟{" "}
          <Text onPress={() => router.replace("/(auth)/login")} style={{ color: C.primary, fontWeight: "700" }}>تسجيل الدخول</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

function Field({ label, icon, value, onChange, placeholder, keyboardType, autoCapitalize }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
        />
      </View>
    </View>
  );
}
