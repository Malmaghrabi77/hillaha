import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HALHA_THEME } from "@halha/ui";
import { getSupabase } from "@halha/core";
import { View, ActivityIndicator } from "react-native";

const C = HALHA_THEME.colors;

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setChecking(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setChecking(false);
      if (data.session) {
        router.replace("/(tabs)/home");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/(tabs)/home");
      }
      if (event === "SIGNED_OUT") {
        router.replace("/(auth)");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.surface },
          headerTintColor: C.primary,
          headerTitleStyle: { fontWeight: "900", color: C.text, fontSize: 16 },
          headerBackTitle: "رجوع",
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="legal/consent" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant/[id]" options={{ title: "تفاصيل المتجر", headerShown: true }} />
        <Stack.Screen name="cart" options={{ title: "🛒 السلة", headerShown: true }} />
        <Stack.Screen name="checkout" options={{ title: "الدفع", headerShown: true }} />
        <Stack.Screen name="tracking/[orderId]" options={{ title: "📦 تتبع الطلب", headerShown: true }} />
        <Stack.Screen name="medical" options={{ title: "🏥 الخدمات الطبية", headerShown: true }} />
        <Stack.Screen name="medical/booking" options={{ title: "حجز موعد طبيب", headerShown: true }} />
        <Stack.Screen name="medical/prescription" options={{ title: "رفع روشتة", headerShown: true }} />
        <Stack.Screen name="profile/edit" options={{ title: "تعديل البيانات", headerShown: true }} />
        <Stack.Screen name="loyalty" options={{ title: "🎁 نقاط الولاء", headerShown: true }} />
      </Stack>
    </>
  );
}
