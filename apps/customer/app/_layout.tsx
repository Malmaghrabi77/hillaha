import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { CartProvider } from "../lib/cartStore";
import { LocaleProvider } from "../lib/i18n";

// ── Prevent auto-hide: we control dismiss timing ──────────────────────────────
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    // ── Single auth source of truth ────────────────────────────────────────
    // 1. Hide native splash immediately (index.tsx shows a JS splash instead)
    // 2. Check current session once
    // 3. Listen for future auth changes
    let unsub: (() => void) | null = null;

    const init = async () => {
      try {
        SplashScreen.hideAsync().catch(() => {});

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSupabase } = require("@hillaha/core") as any;
        const sb = getSupabase?.();

        if (!sb) {
          setBooted(true);
          return;
        }

        // Check existing session (with 4s timeout)
        const result = await Promise.race([
          sb.auth.getSession(),
          new Promise<{ data: null }>(r => setTimeout(() => r({ data: null }), 4_000)),
        ]);

        if (result?.data?.session) {
          // Logged in — skip splash/auth landing entirely
          router.replace("/(tabs)/home");
          setBooted(true);
          return;
        }

        // Not logged in — listen for future sign-in/out
        const { data: { subscription } } = sb.auth.onAuthStateChange(
          (event: string, session: any) => {
            if (event === "SIGNED_IN"  && session) router.replace("/(tabs)/home");
            if (event === "SIGNED_OUT")              router.replace("/");
          }
        );
        unsub = () => subscription.unsubscribe();
      } catch {
        /* auth unavailable — fall through to index.tsx */
      }

      setBooted(true);
    };

    init();
    return () => unsub?.();
  }, []);

  // Don't render the navigator until we know the auth state —
  // prevents a flash of the wrong screen.
  if (!booted) return null;

  return (
    <LocaleProvider>
      <CartProvider>
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
          <Stack.Screen name="services/cleaning"    options={{ headerShown: false }} />
          <Stack.Screen name="services/electrical"  options={{ headerShown: false }} />
          <Stack.Screen name="services/delivery"    options={{ headerShown: false }} />
        </Stack>
      </CartProvider>
    </LocaleProvider>
  );
}
