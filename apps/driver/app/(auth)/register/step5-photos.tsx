import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, StatusBar, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRegistration } from "../../lib/registration-context";
import { C, VEHICLE_LABELS } from "../../lib/constants";

const TOTAL_STEPS = 7;

export default function Step5Photos() {
  const { data, update } = useRegistration();
  const [error, setError] = useState("");

  const isBicycle = data.vehicleType === "bicycle";

  async function pickImage() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مرفوضة", "يرجى تفعيل صلاحية الكاميرا من الإعدادات");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      update({ vehiclePhotoUri: result.assets[0].uri });
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      update({ vehiclePhotoUri: result.assets[0].uri });
    }
  }

  function next() {
    setError("");
    if (!data.vehiclePhotoUri) return setError(`يرجى التقاط صورة ${isBicycle ? "الدراجة" : "المركبة"}`);
    if (!isBicycle && !data.vehiclePlate.trim()) return setError("يرجى إدخال رقم اللوحة");
    router.push("/(auth)/register/step6-selfie");
  }

  // Determine progress — bicycle skips step 4
  const currentProgress = isBicycle ? 4 : 5;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>
            {isBicycle ? "صورة الدراجة" : "صورة المركبة"}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
            {isBicycle ? "ارفع صورة واضحة للدراجة الهوائية" : "ارفع صورة واضحة للمركبة مع رقم اللوحة"}
          </Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: i < currentProgress ? C.primary : C.border }} />
          ))}
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: C.dangerSoft }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, elevation: 4 }}>
          {/* Vehicle plate (not for bicycle) */}
          {!isBicycle && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>رقم اللوحة</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🔢</Text>
                <TextInput
                  value={data.vehiclePlate}
                  onChangeText={(v) => update({ vehiclePlate: v })}
                  placeholder="أ ب ج 1234"
                  placeholderTextColor={C.textMuted}
                  style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
                />
              </View>
            </View>
          )}

          {/* Vehicle photo */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8 }}>
            صورة {isBicycle ? "الدراجة" : "المركبة"}
          </Text>
          {data.vehiclePhotoUri ? (
            <View style={{ marginBottom: 16 }}>
              <Image source={{ uri: data.vehiclePhotoUri }} style={{ width: "100%", height: 200, borderRadius: 16 }} resizeMode="cover" />
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
              <Pressable onPress={pickImage} style={{ flex: 1, paddingVertical: 28, borderRadius: 16, borderWidth: 2, borderColor: C.primary, borderStyle: "dashed", backgroundColor: C.primarySoft, alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.primary }}>التقط صورة</Text>
              </Pressable>
              <Pressable onPress={pickFromGallery} style={{ flex: 1, paddingVertical: 28, borderRadius: 16, borderWidth: 2, borderColor: C.border, borderStyle: "dashed", backgroundColor: C.bg, alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 32 }}>🖼️</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted }}>من المعرض</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={next}
            style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: C.primary, elevation: 6 }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>التالي — صورتك الشخصية 📸</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
