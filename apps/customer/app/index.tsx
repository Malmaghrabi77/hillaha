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
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

// ── Force RTL ─────────────────────────────────────────────────────────────────
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:          "#0F0A1E",
  surface:     "#1A1040",
  purple:      "#8B5CF6",
  purpleDark:  "#6D28D9",
  purpleGlow:  "#A78BFA",
  pink:        "#EC4899",
  white:       "#FFFFFF",
  whiteAlpha:  "rgba(255,255,255,0.75)",
  borderAlpha: "rgba(139,92,246,0.25)",
} as const;

// ── This screen is pure UI — all auth routing is handled in _layout.tsx ───────
export default function AppEntry() {
  const [showAuth, setShowAuth] = useState(false);

  const logoScale      = useRef(new Animated.Value(0.8)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const splashOpacity  = useRef(new Animated.Value(1)).current;
  const authOpacity    = useRef(new Animated.Value(0)).current;
  const authSlide      = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    let mounted = true;

    // Animate logo in
    Animated.parallel([
      Animated.timing(logoScale,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // After 1.5 s crossfade to auth landing
    const t = setTimeout(() => {
      if (!mounted) return;
      Animated.parallel([
        Animated.timing(splashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(authOpacity,   { toValue: 1, duration: 400, delay: 150, useNativeDriver: true }),
        Animated.timing(authSlide,     { toValue: 0, duration: 400, delay: 150, useNativeDriver: true }),
      ]).start(() => { if (mounted) setShowAuth(true); });
    }, 1_500);

    return () => { mounted = false; clearTimeout(t); };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Splash ── */}
      {!showAuth && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
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

      {/* ── Auth landing ── */}
      <Animated.View
        style={[
          styles.auth,
          { opacity: authOpacity, transform: [{ translateY: authSlide }] },
        ]}
        pointerEvents={showAuth ? "auto" : "none"}
      >
        <View style={styles.authTop}>
          <Image
            source={require("../assets/hillaha-logo.png")}
            style={styles.authLogo}
            resizeMode="contain"
          />
          <Text style={styles.authBrand}>حلّها</Text>
          <Text style={styles.authTagline}>كل احتياجاتك في مكان واحد</Text>
        </View>

        <View style={styles.chips}>
          {["🛒 مطاعم وتوصيل", "🏥 خدمات طبية", "🎁 نقاط الولاء"].map(label => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.btnPrimaryText}>إنشاء حساب جديد</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && { backgroundColor: "rgba(139,92,246,0.1)" }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.btnSecondaryText}>تسجيل الدخول</Text>
          </Pressable>
        </View>

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
  root:  { flex: 1, backgroundColor: C.bg },

  // Splash
  splash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  splashLogo:    { width: 120, height: 120, marginBottom: 24 },
  splashArabic:  { fontSize: 48, fontWeight: "900", color: C.white, letterSpacing: -1 },
  splashEnglish: { fontSize: 22, fontWeight: "700", color: C.purpleGlow, marginTop: 2, letterSpacing: 3 },
  splashTagline: { fontSize: 15, color: C.whiteAlpha, marginTop: 12, textAlign: "center" },

  // Auth landing
  auth: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "flex-end",
  },
  authTop:    { alignItems: "center", marginBottom: 32 },
  authLogo:   { width: 80, height: 80, marginBottom: 12 },
  authBrand:  { fontSize: 36, fontWeight: "900", color: C.white, letterSpacing: -0.5 },
  authTagline:{ fontSize: 14, color: C.whiteAlpha, marginTop: 6 },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  chip:     { borderWidth: 1, borderColor: C.borderAlpha, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(139,92,246,0.1)" },
  chipText: { color: C.purpleGlow, fontSize: 13, fontWeight: "600" },

  buttons: { gap: 12, marginBottom: 20 },
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
  btnPrimaryText:   { color: C.white, fontSize: 17, fontWeight: "800" },
  btnSecondary:     { borderWidth: 1.5, borderColor: C.purple, paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  btnSecondaryText: { color: C.purpleGlow, fontSize: 17, fontWeight: "700" },

  terms:     { textAlign: "center", color: C.whiteAlpha, fontSize: 12, lineHeight: 18 },
  termsLink: { color: C.purpleGlow, textDecorationLine: "underline" },
});
