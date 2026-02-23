import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// ── أخذ تحكم كامل في الـ splash بغض النظر عن سلوك expo-router ─────────────
SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Inline colors only — zero workspace-package imports at module level ──────
const PURPLE = "#8B5CF6";
const WHITE  = "#FFFFFF";
const DARK   = "#1F1B2E";

export default function RootLayout() {
  useEffect(() => {
    // نُخفي الـ native splash بعد أن يُركَّب الـ layout
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSupabase } = require("@hillaha/core") as any;
      const sb = getSupabase?.();
      if (sb) {
        const { data: { subscription } } = sb.auth.onAuthStateChange(
          (event: string, session: any) => {
            if (event === "INITIAL_SESSION") return;
            if (event === "SIGNED_IN"  && session) router.replace("/(tabs)/home");
            if (event === "SIGNED_OUT")              router.replace("/(auth)");
          }
        );
        unsub = () => subscription.unsubscribe();
      }
    } catch { /* auth unavailable */ }
    return () => unsub?.();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle:       { backgroundColor: WHITE },
        headerTintColor:   PURPLE,
        headerTitleStyle:  { fontWeight: "900", color: DARK, fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index"               options={{ headerShown: false }} />
      <Stack.Screen name="(auth)"              options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"              options={{ headerShown: false }} />
      <Stack.Screen name="legal/consent"       options={{ headerShown: false }} />
      <Stack.Screen name="restaurant/[id]"     options={{ title: "تفاصيل المتجر" }} />
      <Stack.Screen name="cart"                options={{ title: "🛒 السلة" }} />
      <Stack.Screen name="checkout"            options={{ title: "الدفع" }} />
      <Stack.Screen name="tracking/[orderId]"  options={{ title: "📦 تتبع الطلب" }} />
      <Stack.Screen name="medical"             options={{ title: "🏥 الخدمات الطبية" }} />
      <Stack.Screen name="medical/booking"     options={{ title: "حجز موعد طبيب" }} />
      <Stack.Screen name="medical/prescription" options={{ title: "رفع روشتة" }} />
      <Stack.Screen name="profile/edit"        options={{ title: "تعديل البيانات" }} />
      <Stack.Screen name="loyalty"             options={{ title: "🎁 نقاط الولاء" }} />
    </Stack>
  );
}
