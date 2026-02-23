import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// ── Prevent auto-hide: we control dismiss timing explicitly ──────────────────
// expo-router v6 already calls this, but calling it here is safe & idempotent.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Dismiss the native splash AFTER the root layout mounts.
  // index.tsx uses the same background colour (#0F0A1E) so the transition
  // is completely seamless — no flash.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Auth state changes after initial render
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      // lazy-require to avoid crashing if core is unavailable at bundle time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSupabase } = require("@hillaha/core") as any;
      const sb = getSupabase?.();
      if (sb) {
        const { data: { subscription } } = sb.auth.onAuthStateChange(
          (event: string, session: any) => {
            if (event === "INITIAL_SESSION") return; // handled in index.tsx
            if (event === "SIGNED_IN"  && session) router.replace("/(tabs)/home");
            if (event === "SIGNED_OUT")              router.replace("/");
          }
        );
        unsub = () => subscription.unsubscribe();
      }
    } catch { /* auth unavailable */ }
    return () => unsub?.();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"                options={{ headerShown: false }} />
      <Stack.Screen name="(auth)"               options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"               options={{ headerShown: false }} />
      <Stack.Screen name="legal/consent"        options={{ headerShown: false }} />
      <Stack.Screen name="restaurant/[id]"      options={{ headerShown: true,  title: "تفاصيل المتجر" }} />
      <Stack.Screen name="cart"                 options={{ headerShown: true,  title: "السلة" }} />
      <Stack.Screen name="checkout"             options={{ headerShown: true,  title: "الدفع" }} />
      <Stack.Screen name="tracking/[orderId]"   options={{ headerShown: true,  title: "تتبع الطلب" }} />
      <Stack.Screen name="medical"              options={{ headerShown: true,  title: "الخدمات الطبية" }} />
      <Stack.Screen name="medical/booking"      options={{ headerShown: true,  title: "حجز موعد طبيب" }} />
      <Stack.Screen name="medical/prescription" options={{ headerShown: true,  title: "رفع روشتة" }} />
      <Stack.Screen name="profile/edit"         options={{ headerShown: true,  title: "تعديل البيانات" }} />
      <Stack.Screen name="loyalty"              options={{ headerShown: true,  title: "نقاط الولاء" }} />
    </Stack>
  );
}
