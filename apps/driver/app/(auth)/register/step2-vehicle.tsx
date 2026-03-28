import React, { useState } from "react";
import { View, Text, Pressable, StatusBar, ScrollView } from "react-native";
import { router } from "expo-router";
import { useRegistration, VehicleType } from "../../_lib/registration-context";
import { C, MAX_BICYCLE_DISTANCE_KM } from "../../_lib/constants";

const TOTAL_STEPS = 7;

const VEHICLES: { type: VehicleType; icon: string; label: string; desc: string }[] = [
  { type: "car", icon: "🚗", label: "سيارة", desc: "توصيل بالسيارة — بدون تحديد سنة الصنع" },
  { type: "scooter", icon: "🛵", label: "سكوتر / فيسبا", desc: "توصيل بالسكوتر أو الموتوسيكل" },
  { type: "bicycle", icon: "🚲", label: "دراجة هوائية", desc: `الحد الأقصى ${MAX_BICYCLE_DISTANCE_KM} كم لكل اتجاه` },
];

export default function Step2Vehicle() {
  const { data, update } = useRegistration();
  const [error, setError] = useState("");

  function next() {
    setError("");
    if (!data.vehicleType) return setError("يرجى اختيار نوع المركبة");
    router.push("/(auth)/register/step3-identity");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>نوع المركبة</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>اختر نوع المركبة التي ستوصّل بها</Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: i < 2 ? C.primary : C.border }} />
          ))}
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: C.dangerSoft }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: 14, marginBottom: 24 }}>
          {VEHICLES.map((v) => {
            const selected = data.vehicleType === v.type;
            return (
              <Pressable
                key={v.type}
                onPress={() => update({ vehicleType: v.type })}
                style={{
                  backgroundColor: selected ? C.primarySoft : C.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 2.5,
                  borderColor: selected ? C.primary : C.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  elevation: selected ? 4 : 1,
                }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: selected ? C.primary : C.bg, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 28 }}>{v.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>{v.label}</Text>
                  <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{v.desc}</Text>
                </View>
                {selected && (
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "white", fontWeight: "900" }}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {data.vehicleType === "bicycle" && (
          <View style={{ backgroundColor: C.warningSoft, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.warning }}>
            <Text style={{ color: "#92400E", fontWeight: "700", fontSize: 13, textAlign: "center", lineHeight: 22 }}>
              ملاحظة: المسافة القصوى للتوصيل بالدراجة {MAX_BICYCLE_DISTANCE_KM} كم لكل اتجاه{"\n"}
              لا يُشترط وجود رخصة قيادة للدراجة الهوائية
            </Text>
          </View>
        )}

        <Pressable
          onPress={next}
          style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: data.vehicleType ? C.primary : "#E5E7EB", elevation: data.vehicleType ? 6 : 0 }}
        >
          <Text style={{ color: data.vehicleType ? "white" : "#9CA3AF", fontWeight: "900", fontSize: 16 }}>التالي — إثبات الهوية 🪪</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
