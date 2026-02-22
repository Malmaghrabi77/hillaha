import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
export default function Medical() {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#FAFAFF" }}>
      <Text style={{ fontSize: 18, fontWeight: "900", color: "#1F1B2E" }}>خدمات طبية</Text>
      <View style={{ height: 12 }} />
      <Pressable onPress={() => router.push("/medical/booking")} style={{ padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E3FF", marginBottom: 12 }}>
        <Text style={{ fontWeight: "900", color: "#1F1B2E" }}>حجز موعد طبيب</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/medical/prescription")} style={{ padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E3FF" }}>
        <Text style={{ fontWeight: "900", color: "#1F1B2E" }}>رفع روشتة</Text>
      </Pressable>
    </View>
  );
}
