/**
 * app/index.tsx — نقطة الدخول الوحيدة لتطبيق الزبون
 *
 * التدفق:
 *   1. يُخفى الـ native splash فوراً (module level)
 *   2. يظهر اللوجو + السلوجان العربي + السلوجان الإنجليزي
 *   3. في الخلفية: يفحص الجلسة + ينتظر 3 ثوانٍ على الأقل
 *   4. بعد 3 ثوانٍ: يوجّه لصفحة الدخول أو قائمة المتاجر
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

// أخفِ الـ native splash فوراً — قبل أي render لـ React
SplashScreen.hideAsync().catch(() => {});

export default function AppEntry() {
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // شغّل فحص الجلسة و3 ثوانٍ بالتوازي — انتظر الاثنين
    const sessionCheck = async (): Promise<"/(tabs)/home" | "/(auth)"> => {
      try {
        const core = require("@hillaha/core") as any;
        const sb = core?.getSupabase?.();
        if (sb) {
          const result = await Promise.race([
            sb.auth.getSession(),
            new Promise<{ data: null }>((r) =>
              setTimeout(() => r({ data: null }), 5000)
            ),
          ]);
          if (result?.data?.session) return "/(tabs)/home";
        }
      } catch { /* defaults to auth */ }
      return "/(auth)";
    };

    const timer = new Promise<void>((r) => setTimeout(r, 3000));

    Promise.all([sessionCheck(), timer]).then(([dest]) => {
      if (mounted) setDestination(dest);
    });

    return () => { mounted = false; };
  }, []);

  if (destination) return <Redirect href={destination as any} />;

  return (
    <View style={s.wrap}>
      <StatusBar style="light" backgroundColor="#0F0A1E" />

      {/* اللوجو */}
      <View style={s.logoWrap}>
        <View style={s.ring} />
        <Image
          source={require("../assets/hillaha-logo.png")}
          style={s.logo}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>

      {/* السلوجان العربي */}
      <Text style={s.nameAr}>حلّها</Text>

      {/* السلوجان الإنجليزي */}
      <Text style={s.nameEn}>Hillaha</Text>

      {/* مؤشر التحميل */}
      <ActivityIndicator
        size="small"
        color="rgba(139,92,246,0.6)"
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#0F0A1E",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(139,92,246,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  ring: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
  },
  logo: { width: 96, height: 96 },
  nameAr: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
  },
  nameEn: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 2,
  },
});
