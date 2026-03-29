import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, StatusBar, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRegistration, IdentityType } from "../../../lib/registration-context";
import { C, IDENTITY_LABELS } from "../../../lib/constants";

const TOTAL_STEPS = 7;

export default function Step3Identity() {
  const { data, update } = useRegistration();
  const [error, setError] = useState("");

  async function pickImage() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مرفوضة", "يرجى تفعيل صلاحية الكاميرا من الإعدادات");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      update({ identityPhotoUri: result.assets[0].uri });
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      update({ identityPhotoUri: result.assets[0].uri });
    }
  }

  function next() {
    setError("");
    if (!data.identityType) return setError("يرجى اختيار نوع الهوية");
    if (!data.identityNumber.trim()) return setError("يرجى إدخال رقم الهوية");
    if (!data.identityPhotoUri) return setError("يرجى التقاط صورة الهوية");
    // Skip license step for bicycle
    if (data.vehicleType === "bicycle") {
      router.push("/(auth)/register/step5-photos");
    } else {
      router.push("/(auth)/register/step4-license");
    }
  }

  const types: { key: IdentityType; label: string; icon: string }[] = [
    { key: "national_id", label: "بطاقة رقم قومي", icon: "🪪" },
    { key: "passport", label: "جواز سفر", icon: "🛂" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>إثبات الهوية</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>ارفع صورة واضحة لبطاقة الهوية أو جواز السفر</Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: i < 3 ? C.primary : C.border }} />
          ))}
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: C.dangerSoft }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, elevation: 4 }}>
          {/* Identity type toggle */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 12 }}>نوع الهوية</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {types.map((t) => {
              const selected = data.identityType === t.key;
              return (
                <Pressable
                  key={t.key!}
                  onPress={() => update({ identityType: t.key })}
                  style={{
                    flex: 1, padding: 14, borderRadius: 14,
                    borderWidth: 2, borderColor: selected ? C.primary : C.border,
                    backgroundColor: selected ? C.primarySoft : C.bg,
                    alignItems: "center", gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{t.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? C.primary : C.textMuted }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Identity number */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>رقم الهوية</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
              <Text style={{ fontSize: 18 }}>🔢</Text>
              <TextInput
                value={data.identityNumber}
                onChangeText={(v) => update({ identityNumber: v })}
                placeholder="أدخل رقم الهوية"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
              />
            </View>
          </View>

          {/* Photo upload */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8 }}>صورة الهوية</Text>
          {data.identityPhotoUri ? (
            <View style={{ marginBottom: 16 }}>
              <Image source={{ uri: data.identityPhotoUri }} style={{ width: "100%", height: 200, borderRadius: 16 }} resizeMode="cover" />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10, justifyContent: "center" }}>
                <Pressable onPress={pickImage} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted }}>إعادة التصوير 📷</Text>
                </Pressable>
                <Pressable onPress={pickFromGallery} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted }}>من المعرض 🖼️</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <Pressable
                onPress={pickImage}
                style={{ flex: 1, paddingVertical: 28, borderRadius: 16, borderWidth: 2, borderColor: C.primary, borderStyle: "dashed", backgroundColor: C.primarySoft, alignItems: "center", gap: 8 }}
              >
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.primary }}>التقط صورة</Text>
              </Pressable>
              <Pressable
                onPress={pickFromGallery}
                style={{ flex: 1, paddingVertical: 28, borderRadius: 16, borderWidth: 2, borderColor: C.border, borderStyle: "dashed", backgroundColor: C.bg, alignItems: "center", gap: 8 }}
              >
                <Text style={{ fontSize: 32 }}>🖼️</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted }}>من المعرض</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={next}
            style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: C.primary, elevation: 6 }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              {data.vehicleType === "bicycle" ? "التالي — صورة الدراجة 🚲" : "التالي — رخصة المركبة 📄"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
