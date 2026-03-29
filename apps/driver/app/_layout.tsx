import React, { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { getSB } from "../lib/constants";

SplashScreen.hideAsync().catch(() => {});

type Route = "/(auth)/login" | "/(auth)/pending-approval" | "/(auth)/rejected" | "/(tabs)/home";

export default function RootLayout() {
  const [target, setTarget] = useState<Route | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const supabase = getSB();

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setTarget("/(auth)/login");
        return;
      }

      const userId = data.session.user.id;
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("driver_application_status, is_approved")
        .eq("id", userId)
        .single();

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
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
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
