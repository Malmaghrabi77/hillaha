import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Stack } from "expo-router";

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#FAFAFF" }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "900", marginBottom: 12, textAlign: "center" }}>
        حدث خطأ في صفحة المصادقة
      </Text>
      <ScrollView style={{ maxHeight: 300, width: "100%", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <Text style={{ color: "#DC2626", fontSize: 12 }}>
          {error?.message ?? "Unknown error"}
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 8 }}>
          {error?.stack?.slice(0, 800) ?? ""}
        </Text>
      </ScrollView>
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
        animation: "slide_from_right",
      }}
    />
  );
}
