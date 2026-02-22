import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
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

export default function EditProfile() {
  const [name, setName]     = useState("مصطفى محمد");
  const [phone, setPhone]   = useState("01012345678");
  const [email, setEmail]   = useState("malmaghrabi77@gmail.com");
  const [city, setCity]     = useState("قنا");
  const [address, setAddress] = useState("وسط المدينة، شارع النيل");
  const [saved, setSaved]   = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 1200);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* AVATAR */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 45,
          backgroundColor: C.primarySoft,
          borderWidth: 3, borderColor: C.primary,
          justifyContent: "center", alignItems: "center",
          marginBottom: 10,
        }}>
          <Text style={{ fontSize: 44 }}>👤</Text>
        </View>
        <Pressable style={{
          paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
          borderWidth: 1.5, borderColor: C.primary,
        }}>
          <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>تغيير الصورة</Text>
        </Pressable>
      </View>

      {/* FIELDS */}
      {[
        { label: "الاسم الكامل",      value: name,    setter: setName,    icon: "👤", keyboardType: "default" },
        { label: "رقم الهاتف",        value: phone,   setter: setPhone,   icon: "📞", keyboardType: "phone-pad" },
        { label: "البريد الإلكتروني", value: email,   setter: setEmail,   icon: "✉️",  keyboardType: "email-address" },
        { label: "المدينة",           value: city,    setter: setCity,    icon: "🏙️", keyboardType: "default" },
        { label: "العنوان",           value: address, setter: setAddress, icon: "📍", keyboardType: "default" },
      ].map((field, i) => (
        <View key={i} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>
            {field.label}
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>{field.icon}</Text>
            <TextInput
              value={field.value}
              onChangeText={field.setter as any}
              keyboardType={field.keyboardType as any}
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>
      ))}

      {/* SAVE BUTTON */}
      <Pressable
        onPress={handleSave}
        style={{
          marginTop: 8, paddingVertical: 16, borderRadius: 16,
          backgroundColor: saved ? C.success : C.primary,
          shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
          {saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
        </Text>
      </Pressable>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}
