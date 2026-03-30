import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, I18nManager } from "react-native";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartProvider } from "../lib/cartStore";
import { LocaleProvider } from "../lib/i18n";
import { getCustomerSupabase } from "../lib/supabase";
import { DarkModeProvider } from "../src/hooks/useDarkMode";

// ── Prevent auto-hide: we control dismiss timing ──────────────────────────────
try { SplashScreen.preventAutoHideAsync(); } catch {};

// ── Global ErrorBoundary for production crash debugging ──────────────────────
class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GlobalErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#0F0A1E" }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "900", marginBottom: 12, textAlign: "center" }}>
            حدث خطأ في التطبيق
          </Text>
          <ScrollView style={{ maxHeight: 300, width: "100%", backgroundColor: "#1A1040", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: "#F87171", fontSize: 12, fontFamily: "monospace" }}>
              {this.state.error?.message ?? "Unknown error"}
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 8, fontFamily: "monospace" }}>
              {this.state.error?.stack?.slice(0, 800) ?? ""}
            </Text>
          </ScrollView>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#0F0A1E" }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "900", marginBottom: 12, textAlign: "center" }}>
        حدث خطأ في الصفحة
      </Text>
      <ScrollView style={{ maxHeight: 300, width: "100%", backgroundColor: "#1A1040", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <Text style={{ color: "#F87171", fontSize: 12, fontFamily: "monospace" }}>
          {error?.message ?? "Unknown error"}
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 8, fontFamily: "monospace" }}>
          {error?.stack?.slice(0, 800) ?? ""}
        </Text>
      </ScrollView>
      <Pressable
        onPress={retry}
        style={{ backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 }}
      >
        <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

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
        // Force RTL for Arabic
        try { I18nManager.allowRTL(true); I18nManager.forceRTL(true); } catch {}

        SplashScreen.hideAsync().catch(() => {});

        const sb = getCustomerSupabase();

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
    <GlobalErrorBoundary>
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
                <Stack.Screen name="referrals/index"       options={{ headerShown: true,  title: "الإحالات" }} />
                <Stack.Screen name="subscriptions/index"   options={{ headerShown: true,  title: "الاشتراكات" }} />
                <Stack.Screen name="wallet"               options={{ headerShown: true,  title: "المحفظة" }} />
                <Stack.Screen name="chat/driver/[orderId]"    options={{ headerShown: true,  title: "محادثة السائق" }} />
                <Stack.Screen name="chat/partner/[partnerId]" options={{ headerShown: true,  title: "محادثة المتجر" }} />
                <Stack.Screen name="chat/support"         options={{ headerShown: true,  title: "الدعم الفني" }} />
              </Stack>
            </DarkModeProvider>
          </CartProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}
