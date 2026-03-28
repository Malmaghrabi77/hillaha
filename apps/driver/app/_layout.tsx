import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.hideAsync().catch(() => {});

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSB();
    if (!supabase) { setChecking(false); return; }

    supabase.auth.getSession().then(async ({ data }: any) => {
      if (!data.session) {
        setChecking(false);
        router.replace("/(auth)/login");
        return;
      }

      // Check driver approval status
      const userId = data.session.user.id;
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("driver_application_status, is_approved")
        .eq("id", userId)
        .single();

      setChecking(false);

      if (!profile) {
        router.replace("/(tabs)/home");
        return;
      }

      const status = profile.driver_application_status;

      if (status === "pending") {
        router.replace("/(auth)/pending-approval");
      } else if (status === "rejected") {
        router.replace("/(auth)/rejected");
      } else {
        // approved or null (legacy drivers)
        router.replace("/(tabs)/home");
      }
    }).catch(() => {
      setChecking(false);
      router.replace("/(auth)/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === "SIGNED_OUT") {
        router.replace("/(auth)/login");
        return;
      }
      if (event === "SIGNED_IN" && session) {
        // Check approval status on sign-in
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("driver_application_status, is_approved")
          .eq("id", session.user.id)
          .single();

        const status = profile?.driver_application_status;
        if (status === "pending") {
          router.replace("/(auth)/pending-approval");
        } else if (status === "rejected") {
          router.replace("/(auth)/rejected");
        } else {
          router.replace("/(tabs)/home");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAFF" }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
