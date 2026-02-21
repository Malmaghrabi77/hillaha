import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getSupabase } from "@halha/core";

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setChecking(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setChecking(false);
      if (data.session) router.replace("/(tabs)/home");
      else router.replace("/(auth)/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN")  router.replace("/(tabs)/home");
      if (event === "SIGNED_OUT") router.replace("/(auth)/login");
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
