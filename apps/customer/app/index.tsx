import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  I18nManager,
} from "react-native";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

// ── Force RTL ─────────────────────────────────────────────────────────────────
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

type Phase = "splash" | "auth";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:          "#0F0A1E",   // same as native splash → seamless transition
  surface:     "#1A1040",
  purple:      "#8B5CF6",
  purpleDark:  "#6D28D9",
  purpleGlow:  "#A78BFA",
  pink:        "#EC4899",
  white:       "#FFFFFF",
  whiteAlpha:  "rgba(255,255,255,0.75)",
  borderAlpha: "rgba(139,92,246,0.25)",
} as const;

export default function AppEntry() {
  const [phase, setPhase]           = useState<Phase>("splash");
  const [destination, setDest]      = useState<string | null>(null);

  // animations
  const splashOpacity   = useRef(new Animated.Value(1)).current;
  const authOpacity     = useRef(new Animated.Value(0)).current;
  const authTranslateY  = useRef(new Animated.Value(32)).current;
  const logoScale       = useRef(new Animated.Value(0.85)).current;
  const logoOpacity     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    // ── Animate logo in on mount ───────────────────────────────────────────
    Animated.parallel([
      Animated.timing(logoScale,   { toValue: 1,   duration: 600, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1,   duration: 600, useNativeDriver: true }),
    ]).start();

    // ── Session check + 3-second splash ───────────────────────────────────
    const checkSession = async (): Promise<"home" | "auth"> => {
      try {
        const core = require("@hillaha/core") as any;
        const sb   = core?.getSupabase?.();
        if (sb) {
          const result = await Promise.race([
            sb.auth.getSession(),
            new Promise<{ data: null }>(r => setTimeout(() => r({ data: null }), 5_000)),
          ]);
          if (result?.data?.session) return "home";
        }
      } catch { /* supabase unavailable */ }
      return "auth";
    };

    Promise.all([
      checkSession(),
      new Promise<void>(r => setTimeout(r, 3_000)),
    ]).then(([result]) => {
      if (!mounted) return;

      if (result === "home") {
        setDest("/(tabs)/home");
        return;
      }

      // ── Crossfade to auth landing ────────────────────────────────────────
      Animated.parallel([
        Animated.timing(splashOpacity,  { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(authOpacity,    { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
        Animated.timing(authTranslateY, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
      ]).start(() => { if (mounted) setPhase("auth"); });
    });

    return () => { mounted = false; };
  }, []);

  if (destination) return <Redirect href={destination as any} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Phase 1: Splash ── */}
      {phase === "splash" && (
        <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
          <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity, alignItems: "center" }}>
            <Image
              source={require("../assets/hillaha-logo.png")}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.splashArabic}>حلّها</Text>
          <Text style={styles.splashEnglish}>Hillaha</Text>
          <Text style={styles.splashTagline}>كل احتياجاتك في مكان واحد</Text>
        </Animated.View>
      )}

      {/* ── Phase 2: Auth Landing ── */}
      <Animated.View
        style={[
          styles.authContainer,
          { opacity: authOpacity, transform: [{ translateY: authTranslateY }] },
          phase === "splash" && styles.hidden,
        ]}
        pointerEvents={phase === "auth" ? "auto" : "none"}
      >
        {/* Logo area */}
        <View style={styles.authTop}>
          <Image
            source={require("../assets/hillaha-logo.png")}
            style={styles.authLogo}
            resizeMode="contain"
          />
          <Text style={styles.authBrand}>حلّها</Text>
          <Text style={styles.authTagline}>كل احتياجاتك في مكان واحد</Text>
        </View>

        {/* Feature chips */}
        <View style={styles.chips}>
          {["🛒 مطاعم وتوصيل", "🏥 خدمات طبية", "🎁 نقاط الولاء"].map(label => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Auth buttons */}
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.btnPrimaryText}>إنشاء حساب جديد</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.btnSecondaryText}>تسجيل الدخول</Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          بالمتابعة أنت توافق على{" "}
          <Text style={styles.termsLink} onPress={() => router.push("/legal/consent")}>
            شروط الاستخدام وسياسة الخصوصية
          </Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  hidden: {
    position: "absolute",
    opacity: 0,
  },

  // ── Splash ────────────────────────────────────────────────────────────────
  splashContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  splashLogo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  splashArabic: {
    fontSize: 48,
    fontWeight: "900",
    color: C.white,
    letterSpacing: -1,
  },
  splashEnglish: {
    fontSize: 22,
    fontWeight: "700",
    color: C.purpleGlow,
    marginTop: 2,
    letterSpacing: 3,
  },
  splashTagline: {
    fontSize: 15,
    color: C.whiteAlpha,
    marginTop: 12,
    textAlign: "center",
  },

  // ── Auth Landing ──────────────────────────────────────────────────────────
  authContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "flex-end",
  },
  authTop: {
    alignItems: "center",
    marginBottom: 32,
  },
  authLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  authBrand: {
    fontSize: 36,
    fontWeight: "900",
    color: C.white,
    letterSpacing: -0.5,
  },
  authTagline: {
    fontSize: 14,
    color: C.whiteAlpha,
    marginTop: 6,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  chip: {
    borderWidth: 1,
    borderColor: C.borderAlpha,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(139,92,246,0.1)",
  },
  chipText: {
    color: C.purpleGlow,
    fontSize: 13,
    fontWeight: "600",
  },

  buttons: {
    gap: 12,
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: C.purple,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnPrimaryText: {
    color: C.white,
    fontSize: 17,
    fontWeight: "800",
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: C.purple,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondaryPressed: {
    backgroundColor: "rgba(139,92,246,0.1)",
  },
  btnSecondaryText: {
    color: C.purpleGlow,
    fontSize: 17,
    fontWeight: "700",
  },

  terms: {
    textAlign: "center",
    color: C.whiteAlpha,
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: C.purpleGlow,
    textDecorationLine: "underline",
  },
});
