import React, { useState } from "react";
import { View, Text, Pressable, Image, StatusBar, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRegistration } from "../../lib/registration-context";
import { C } from "../../lib/constants";

const TOTAL_STEPS = 7;

export default function Step6Selfie() {
  const { data, update } = useRegistration();
  const [error, setError] = useState("");

  const isBicycle = data.vehicleType === "bicycle";
  const currentProgress = isBicycle ? 5 : 6;

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
      update({ selfieUri: result.assets[0].uri });
      setError("");
    }
  }

  function next() {
    setError("");
    if (!data.selfieUri) return setError("يرجى التقاط صورتك الشخصية");
    router.push("/(auth)/register/step7-review");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />
      <View style={{ position: "absolute", bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.pinkSoft, opacity: 0.6 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>صورتك الشخصية</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>التقط صورة سيلفي واضحة — يراها العملاء والمتاجر</Text>
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

        <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, elevation: 4, alignItems: "center" }}>
          {/* Info note */}
          <View style={{ backgroundColor: C.primarySoft, borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: C.border, width: "100%" }}>
            <Text style={{ fontSize: 13, color: "#4C1D95", fontWeight: "700", textAlign: "center", lineHeight: 22 }}>
              صورتك الشخصية ستكون معرّفك الدائم في التطبيق{"\n"}
              يراها العملاء والمتاجر للتحقق من هويتك
            </Text>
          </View>

          {/* Selfie preview / placeholder */}
          <Pressable onPress={takeSelfie} style={{ marginBottom: 20 }}>
            {data.selfieUri ? (
              <View style={{ width: 160, height: 160, borderRadius: 80, overflow: "hidden", borderWidth: 4, borderColor: C.primary, elevation: 8 }}>
                <Image source={{ uri: data.selfieUri }} style={{ width: "100%", height: "100%" }} />
              </View>
            ) : (
              <View style={{ width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: C.primary, borderStyle: "dashed", backgroundColor: C.primarySoft, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 52 }}>📷</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.primary, marginTop: 6 }}>اضغط للتصوير</Text>
              </View>
            )}
          </Pressable>

          {data.selfieUri && (
            <Pressable onPress={takeSelfie} style={{ marginBottom: 20, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.border }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.textMuted }}>إعادة التصوير</Text>
            </Pressable>
          )}

          {!data.selfieUri && (
            <Pressable
              onPress={takeSelfie}
              style={{ width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.primary, marginBottom: 16 }}
            >
              <Text style={{ color: C.primary, fontWeight: "900", fontSize: 15 }}>التقط صورتك الآن 📸</Text>
            </Pressable>
          )}

          <Pressable
            onPress={next}
            style={{ width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: data.selfieUri ? C.primary : "#E5E7EB", elevation: data.selfieUri ? 6 : 0 }}
          >
            <Text style={{ color: data.selfieUri ? "white" : "#9CA3AF", fontWeight: "900", fontSize: 16 }}>التالي — مراجعة وإرسال</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
