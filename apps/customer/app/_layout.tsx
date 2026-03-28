import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartProvider } from "../lib/cartStore";
import { LocaleProvider } from "../lib/i18n";
import { DarkModeProvider } from "../src/hooks/useDarkMode";

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
            // SIGNED_OUT is handled by account.tsx handleLogout — don't navigate here
            // to avoid race conditions with explicit logout navigation
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
    <SafeAreaProvider>
      <LocaleProvider>
        <CartProvider>
          <DarkModeProvider>
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
              <Stack.Screen name="notifications"        options={{ headerShown: true,  title: "الإشعارات" }} />
              <Stack.Screen name="change-password"      options={{ headerShown: true,  title: "تغيير كلمة المرور" }} />
              <Stack.Screen name="services/cleaning"    options={{ headerShown: false }} />
              <Stack.Screen name="services/electrical"  options={{ headerShown: false }} />
              <Stack.Screen name="services/delivery"    options={{ headerShown: false }} />
              <Stack.Screen name="addresses"            options={{ headerShown: true,  title: "العناوين" }} />
              <Stack.Screen name="favorites"            options={{ headerShown: true,  title: "المفضلة" }} />
              <Stack.Screen name="promo"                options={{ headerShown: true,  title: "العروض والخصومات" }} />
              <Stack.Screen name="rate-order"           options={{ headerShown: true,  title: "تقييم الطلب" }} />
              <Stack.Screen name="referrals"            options={{ headerShown: true,  title: "الإحالات" }} />
              <Stack.Screen name="subscriptions"        options={{ headerShown: true,  title: "الاشتراكات" }} />
              <Stack.Screen name="wallet"               options={{ headerShown: true,  title: "المحفظة" }} />
              <Stack.Screen name="chat/driver/[orderId]"    options={{ headerShown: true,  title: "محادثة السائق" }} />
              <Stack.Screen name="chat/partner/[partnerId]" options={{ headerShown: true,  title: "محادثة المتجر" }} />
              <Stack.Screen name="chat/support"         options={{ headerShown: true,  title: "الدعم الفني" }} />
            </Stack>
          </DarkModeProvider>
        </CartProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
