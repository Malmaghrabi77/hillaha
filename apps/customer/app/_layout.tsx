import React, { useEffect } from "react";
import { Stack, router } from "expo-router";

// ── Inline colors only — zero workspace-package imports at module level ──────
const PURPLE = "#8B5CF6";
const WHITE  = "#FFFFFF";
const DARK   = "#1F1B2E";

export default function RootLayout() {
  // Auth-state listener — runs for the entire app lifetime.
  // Uses require() inside try/catch so a module error here never
  // blocks the layout from rendering or showing screens.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSupabase } = require("@hillaha/core") as any;
      const sb = getSupabase?.();
      if (sb) {
        const { data: { subscription } } = sb.auth.onAuthStateChange(
          (event: string, session: any) => {
            // INITIAL_SESSION يُعالَج فقط في index.tsx (شاشة الترحيب)
            // هنا نستجيب فقط لتغييرات الحالة التي تحدث أثناء استخدام التطبيق
            if (event === "INITIAL_SESSION") return;
            if (event === "SIGNED_IN"  && session) router.replace("/(tabs)/home");
            if (event === "SIGNED_OUT")              router.replace("/(auth)");
          }
        );
        unsub = () => subscription.unsubscribe();
      }
    } catch { /* auth unavailable — app stays on current screen */ }
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
      {/* Initialization screen — our custom JS splash */}
      <Stack.Screen name="index"               options={{ headerShown: false }} />

      {/* Auth group */}
      <Stack.Screen name="(auth)"              options={{ headerShown: false }} />

      {/* Main tabs */}
      <Stack.Screen name="(tabs)"              options={{ headerShown: false }} />

      {/* Other screens */}
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
