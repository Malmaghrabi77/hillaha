import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, StatusBar, ScrollView, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRegistration } from "../../lib/registration-context";
import { C } from "../../lib/constants";
import { extractTextFromImage, extractExpiryDate, isDocumentValid, formatDate } from "../../lib/ocr";

const TOTAL_STEPS = 7;

export default function Step4License() {
  const { data, update } = useRegistration();
  const [error, setError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

  // If bicycle, skip this step (shouldn't reach here, but safety)
  if (data.vehicleType === "bicycle") {
    router.replace("/(auth)/register/step5-photos");
    return null;
  }

  async function processOCR(uri: string) {
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const ocrText = await extractTextFromImage(uri);
      if (!ocrText) {
        setOcrResult("لم يتم التعرف على نص — أدخل البيانات يدوياً");
        return;
      }

      // Save full OCR text for admin review
      update({ ocrResult: ocrText });

      const expiryDate = extractExpiryDate(ocrText);
      if (expiryDate) {
        const formatted = formatDate(expiryDate);
        update({ licenseExpiryDate: formatted });

        if (isDocumentValid(expiryDate)) {
          setOcrResult(`✅ رخصة سارية حتى ${formatted}`);
        } else {
          setOcrResult(`❌ الرخصة منتهية الصلاحية (${formatted})`);
        }
      } else {
        setOcrResult("لم يتم استخراج تاريخ الانتهاء — أدخله يدوياً");
      }
    } catch {
      setOcrResult("فشل في قراءة الصورة — أدخل البيانات يدوياً");
    } finally {
      setOcrLoading(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مرفوضة", "يرجى تفعيل صلاحية الكاميرا من الإعدادات");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      update({ licensePhotoUri: result.assets[0].uri });
      processOCR(result.assets[0].uri);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      update({ licensePhotoUri: result.assets[0].uri });
      processOCR(result.assets[0].uri);
    }
  }

  function isExpired(): boolean {
    if (!data.licenseExpiryDate) return false;
    const parts = data.licenseExpiryDate.split("/");
    if (parts.length !== 3) return false;
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return d < new Date();
  }

  function next() {
    setError("");
    if (!data.licenseNumber.trim()) return setError("يرجى إدخال رقم الرخصة");
    if (!data.licenseExpiryDate.trim()) return setError("يرجى إدخال تاريخ انتهاء الرخصة");
    if (isExpired()) return setError("الرخصة منتهية الصلاحية! يرجى تجديدها أولاً");
    if (!data.licensePhotoUri) return setError("يرجى التقاط صورة الرخصة");
    router.push("/(auth)/register/step5-photos");
  }

  const expired = isExpired();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>رخصة المركبة</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>ارفع صورة واضحة للرخصة ويجب أن تكون سارية</Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: i < 4 ? C.primary : C.border }} />
          ))}
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: C.dangerSoft }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, elevation: 4 }}>
          {/* License photo — FIRST, so OCR can auto-fill the date */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8 }}>صورة الرخصة (سيتم استخراج البيانات تلقائياً)</Text>
          {data.licensePhotoUri ? (
            <View style={{ marginBottom: 16 }}>
              <Image source={{ uri: data.licensePhotoUri }} style={{ width: "100%", height: 200, borderRadius: 16 }} resizeMode="cover" />
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

          {/* OCR Result / Loading */}
          {ocrLoading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, backgroundColor: C.primarySoft, borderRadius: 12, padding: 12 }}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.primary }}>جاري قراءة بيانات الرخصة...</Text>
            </View>
          )}
          {ocrResult && !ocrLoading && (
            <View style={{
              marginBottom: 16, borderRadius: 12, padding: 12,
              backgroundColor: ocrResult.startsWith("✅") ? C.successSoft : ocrResult.startsWith("❌") ? C.dangerSoft : C.warningSoft,
            }}>
              <Text style={{
                fontSize: 12, fontWeight: "700", textAlign: "center",
                color: ocrResult.startsWith("✅") ? "#059669" : ocrResult.startsWith("❌") ? C.danger : "#92400E",
              }}>{ocrResult}</Text>
            </View>
          )}

          {/* License number */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>رقم الرخصة</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
              <Text style={{ fontSize: 18 }}>📄</Text>
              <TextInput
                value={data.licenseNumber}
                onChangeText={(v) => update({ licenseNumber: v })}
                placeholder="رقم الرخصة"
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
              />
            </View>
          </View>

          {/* Expiry date */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6 }}>تاريخ انتهاء الرخصة (يوم/شهر/سنة)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: expired ? C.danger : C.border, borderRadius: 14, backgroundColor: expired ? C.dangerSoft : C.bg, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
              <Text style={{ fontSize: 18 }}>📅</Text>
              <TextInput
                value={data.licenseExpiryDate}
                onChangeText={(v) => update({ licenseExpiryDate: v })}
                placeholder="31/12/2027"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                style={{ flex: 1, fontSize: 14, color: expired ? C.danger : C.text, textAlign: "right" }}
              />
            </View>
            {expired && (
              <Text style={{ color: C.danger, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                الرخصة منتهية الصلاحية! يرجى تجديدها أولاً
              </Text>
            )}
            {data.licenseExpiryDate && !expired && data.licenseExpiryDate.split("/").length === 3 && (
              <Text style={{ color: C.success, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                رخصة سارية
              </Text>
            )}
          </View>

          <Pressable
            onPress={next}
            style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: C.primary, elevation: 6 }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>التالي — صورة المركبة 🚗</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
