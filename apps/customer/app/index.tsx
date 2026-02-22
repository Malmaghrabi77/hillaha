/**
 * app/index.tsx — نقطة الدخول
 *
 * الـ splash يُخفى من _layout.tsx على مستوى الـ module.
 * هذا الملف يتحقق من session المستخدم ثم يوجّهه للشاشة الصحيحة.
 */
import React, { useEffect } from "react";
import { View, Image, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function AppEntry() {
  useEffect(() => {
    let mounted = true;

    (async () => {
      let destination = "/(auth)";

      try {
        const core = require("@hillaha/core") as any;
        const sb   = core?.getSupabase?.();
        if (sb) {
          const result = await Promise.race([
            sb.auth.getSession(),
            new Promise<{ data: null }>(r => setTimeout(() => r({ data: null }), 3000)),
          ]);
          if (result?.data?.session) destination = "/(tabs)/home";
        }
      } catch { /* defaults to /(auth) */ }

      if (mounted) router.replace(destination as any);
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <View style={s.wrap}>
      <StatusBar style="light" backgroundColor="#0F0A1E" />

      {/* Logo — visible immediately, no fade-in animation */}
      <View style={s.logoWrap}>
        <View style={s.ring} />
        <Image
          source={require("../assets/halha-logo.png")}
          style={s.logo}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>

      <Text style={s.name}>حلّها</Text>
      <Text style={s.sub}>كل اللي تحتاجه في مكان واحد</Text>

      {/* Loading indicator — reassures user the app is working */}
      <ActivityIndicator
        size="small"
        color="rgba(139,92,246,0.6)"
        style={{ marginTop: 32 }}
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
    gap: 12,
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
    marginBottom: 8,
  },
  ring: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
  },
  logo:  { width: 96, height: 96 },
  name: {
    color: "white",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
  },
  sub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    textAlign: "center",
  },
});
