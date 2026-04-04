import React, { Component } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nManager, View, Text, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

// Force RTL for Arabic
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  I18nManager.allowRTL(true);
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || "خطأ غير معروف" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAFF", padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#1F1B2E", textAlign: "center", marginBottom: 8 }}>
            حدث خطأ في التطبيق
          </Text>
          <Text style={{ fontSize: 13, color: "#6B6480", textAlign: "center", marginBottom: 24 }}>
            {this.state.error}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: "" })}
            style={{ backgroundColor: "#8B5CF6", paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(root)" />
          <Stack.Screen name="chat" options={{ presentation: "modal" }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
