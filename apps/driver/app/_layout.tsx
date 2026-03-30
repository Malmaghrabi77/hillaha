import React, { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { getSB } from "../lib/constants";

try { SplashScreen.preventAutoHideAsync(); } catch {}

type Route = "/(auth)/login" | "/(auth)/pending-approval" | "/(auth)/rejected" | "/(tabs)/home";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function RootLayout() {
  const [target, setTarget] = useState<Route | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const supabase = getSB();

      const { data } = await withTimeout(supabase.auth.getSession(), 4000);
      if (!data.session) {
        setTarget("/(auth)/login");
        return;
      }

      const userId = data.session.user.id;
      const { data: profile } = await withTimeout(
        (supabase as any)
          .from("profiles")
          .select("driver_application_status, is_approved")
          .eq("id", userId)
          .single(),
        4000
      );

      const status = profile?.driver_application_status;
      if (status === "pending") {
        setTarget("/(auth)/pending-approval");
      } else if (status === "rejected") {
        setTarget("/(auth)/rejected");
      } else {
        setTarget("/(tabs)/home");
      }
    } catch {
      setTarget("/(auth)/login");
    } finally {
      SplashScreen.hideAsync().catch(() => {});
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
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
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      )}

      {/* Navigate once auth check is done */}
      {target && <Redirect href={target} />}
    </SafeAreaProvider>
  );
}
