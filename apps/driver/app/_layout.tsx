import React, { Component, useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { usePushNotifications } from "../lib/usePushNotifications";

// NO SplashScreen API — let native splash auto-hide when React renders.
// This prevents the frozen splash issue entirely.

// ── Initialize Sentry for production error tracking ─────────────────────────
try {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  });
} catch {}

type Route = "/(auth)/login" | "/(auth)/pending-approval" | "/(auth)/rejected" | "/(tabs)/home";

// ── Error Boundary ──────────────────────────────────────────────────
class GlobalErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || "خطأ غير معروف" };
  }

  componentDidCatch(error: Error) {
    try { Sentry.captureException(error); } catch {}
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

// ── Main Layout ─────────────────────────────────────────────────────
function RootLayoutInner() {
  const [target, setTarget] = useState<Route | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sbInstance, setSbInstance] = useState<any>(null);

  // Register push notifications once we have a logged-in user
  usePushNotifications(sbInstance, userId);

  useEffect(() => {
    let mounted = true;

    // Safety fallback: go to login after 5s no matter what
    const fallback = setTimeout(() => {
      if (mounted && !target) setTarget("/(auth)/login");
    }, 5000);

    (async () => {
      try {
        // Lazy require to avoid top-level import crash
        const { getSB } = require("../lib/constants");
        const supabase = getSB();
        if (!supabase) { if (mounted) setTarget("/(auth)/login"); return; }
        if (mounted) setSbInstance(supabase);

        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((r) => setTimeout(() => r(null), 4000)),
        ]);

        if (!sessionResult || !(sessionResult as any).data?.session) {
          if (mounted) setTarget("/(auth)/login");
          return;
        }

        const userId = (sessionResult as any).data.session.user.id;
        if (mounted) setUserId(userId);

        const profileResult = await Promise.race([
          (supabase as any)
            .from("profiles")
            .select("driver_application_status, is_approved")
            .eq("id", userId)
            .single(),
          new Promise<null>((r) => setTimeout(() => r(null), 4000)),
        ]);

        if (!mounted) return;

        const status = (profileResult as any)?.data?.driver_application_status;
        if (status === "pending") setTarget("/(auth)/pending-approval");
        else if (status === "rejected") setTarget("/(auth)/rejected");
        else setTarget("/(tabs)/home");
      } catch {
        if (mounted) setTarget("/(auth)/login");
      } finally {
        clearTimeout(fallback);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bank-details" />
        <Stack.Screen name="chat/[orderId]" />
        <Stack.Screen name="support" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="withdraw" />
      </Stack>

      {/* Loading overlay while checking auth */}
      {!target && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: "center", alignItems: "center",
          backgroundColor: "#FAFAFF",
        }}>
          <Image
            source={require("../assets/halha-logo.png")}
            style={{ width: 120, height: 120, resizeMode: "contain", marginBottom: 24 }}
          />
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ marginTop: 16, color: "#6B6480", fontSize: 13, fontWeight: "600" }}>
            جاري التحميل...
          </Text>
        </View>
      )}

      {target && <Redirect href={target} />}
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <RootLayoutInner />
    </GlobalErrorBoundary>
  );
}
