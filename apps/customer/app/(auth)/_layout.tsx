import React from "react";
import { View, Text, Pressable } from "react-native";
import { Stack } from "expo-router";

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#FAFAFF" }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "900", marginBottom: 12, textAlign: "center" }}>
        حدث خطأ في صفحة المصادقة
      </Text>
      <View style={{ width: "100%", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <Text style={{ color: "#DC2626", fontSize: 13, textAlign: "center" }}>
          حدث خطأ غير متوقع. يرجى إعادة المحاولة أو التواصل مع الدعم إذا استمرت المشكلة.
        </Text>
      </View>
      <Pressable
        onPress={retry}
        style={{ backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 }}
      >
        <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "default",
      }}
    />
  );
}
