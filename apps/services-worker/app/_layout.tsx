import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {});

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

export default function RootLayout() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const init = async () => {
      try {
        SplashScreen.hideAsync().catch(() => {});
        const sb = getSB();
        if (!sb) { setBooted(true); return; }

        const result = await Promise.race([
          sb.auth.getSession(),
          new Promise<{ data: null }>(r => setTimeout(() => r({ data: null }), 4_000)),
        ]);

        if (result?.data?.session) {
          // Verify role is service_worker
          const { data: profile } = await sb
            .from("profiles")
            .select("role")
            .eq("id", result.data.session.user.id)
            .single();
          if (profile?.role === "service_worker") {
            router.replace("/(tabs)/bookings");
          } else {
            await sb.auth.signOut();
            router.replace("/(auth)/login");
          }
          setBooted(true);
          return;
        }

        const { data: { subscription } } = sb.auth.onAuthStateChange(
          (event: string, session: any) => {
            if (event === "SIGNED_OUT") router.replace("/(auth)/login");
          }
        );
        unsub = () => subscription.unsubscribe();
      } catch {
        /* fall through */
      }
      setBooted(true);
    };
    init();
    return () => unsub?.();
  }, []);

  if (!booted) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
