/**
 * app/index.tsx — نقطة الدخول الوحيدة
 *
 * يتولى بالكامل:
 *   1. إخفاء الـ native splash فوراً (module level)
 *   2. عرض شاشة الترحيب (لوجو + سلوجان) لمدة 3 ثوانٍ
 *   3. فحص الجلسة في الخلفية
 *   4. انتقال سلس إلى شاشة الدخول/التسجيل (إذا لا توجد جلسة)
 *      أو توجيه مباشر للمتاجر (إذا توجد جلسة)
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, Pressable,
  Animated, Dimensions, StyleSheet,
} from "react-native";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

const { height: SCREEN_H } = Dimensions.get("window");

// ── ثوابت الألوان ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0F0A1E",
  purple:  "#8B5CF6",
  pink:    "#EC4899",
  white:   "#FFFFFF",
  muted:   "rgba(255,255,255,0.45)",
  glass:   "rgba(255,255,255,0.07)",
  border:  "rgba(255,255,255,0.12)",
  glow1:   "rgba(139,92,246,0.18)",
  glow2:   "rgba(236,72,153,0.12)",
  glow3:   "rgba(139,92,246,0.10)",
  ring1:   "rgba(139,92,246,0.15)",
  ring2:   "rgba(139,92,246,0.35)",
  ring3:   "rgba(139,92,246,0.15)",
};

type Phase = "splash" | "auth";

// ─────────────────────────────────────────────────────────────────────────────
export default function AppEntry() {
  const [phase, setPhase]           = useState<Phase>("splash");
  const [destination, setDestination] = useState<string | null>(null);

  // قيم الأنيميشن
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const authOpacity   = useRef(new Animated.Value(0)).current;
  const authTranslate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    let mounted = true;

    const sessionCheck = async (): Promise<"home" | "auth"> => {
      try {
        const core = require("@hillaha/core") as any;
        const sb   = core?.getSupabase?.();
        if (sb) {
          const result = await Promise.race([
            sb.auth.getSession(),
            new Promise<{ data: null }>(r => setTimeout(() => r({ data: null }), 5000)),
          ]);
          if (result?.data?.session) return "home";
        }
      } catch { /* default to auth */ }
      return "auth";
    };

    const timer = new Promise<void>(r => setTimeout(r, 3000));

    Promise.all([sessionCheck(), timer]).then(([result]) => {
      if (!mounted) return;

      if (result === "home") {
        setDestination("/(tabs)/home");
        return;
      }

      // انتقال سلس: fade out splash → fade in auth
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0, duration: 350, useNativeDriver: true,
        }),
        Animated.timing(authOpacity, {
          toValue: 1, duration: 500, delay: 200, useNativeDriver: true,
        }),
        Animated.timing(authTranslate, {
          toValue: 0, duration: 500, delay: 200, useNativeDriver: true,
        }),
      ]).start(() => setPhase("auth"));
    });

    return () => { mounted = false; };
  }, []);

  if (destination) return <Redirect href={destination as any} />;

  return (
    <View style={s.root}>
      <StatusBar style="light" backgroundColor={C.bg} />

      {/* ── خلفية متوهجة ────────────────────────────────────────────── */}
      <View pointerEvents="none" style={[s.glow, { top: -80,  right: -60,  width: 300, height: 300, borderRadius: 150, backgroundColor: C.glow1 }]} />
      <View pointerEvents="none" style={[s.glow, { top: 200,  left:  -80, width: 240, height: 240, borderRadius: 120, backgroundColor: C.glow2 }]} />
      <View pointerEvents="none" style={[s.glow, { bottom: 160, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: C.glow3 }]} />

      {/* ════════════════════════════════════════════════════════════════
          PHASE 1 — شاشة الترحيب (Splash)
      ════════════════════════════════════════════════════════════════ */}
      <Animated.View
        pointerEvents={phase === "splash" ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, s.center, { opacity: splashOpacity }]}
      >
        {/* اللوجو */}
        <View style={s.logoRing}>
          <View style={s.logoRingOuter} />
          <Image
            source={require("../assets/hillaha-logo.png")}
            style={s.logoImg}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>

        {/* النصوص */}
        <Text style={s.nameAr}>حلّها</Text>
        <Text style={s.nameEn}>Hillaha</Text>
        <Text style={s.tagline}>كل اللي تحتاجه في مكان واحد</Text>
      </Animated.View>

      {/* ════════════════════════════════════════════════════════════════
          PHASE 2 — صفحة الدخول / التسجيل (Auth Landing)
      ════════════════════════════════════════════════════════════════ */}
      <Animated.View
        pointerEvents={phase === "auth" ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          { opacity: authOpacity, transform: [{ translateY: authTranslate }] },
        ]}
      >
        {/* قسم اللوجو العلوي — 52% من الشاشة */}
        <View style={[s.heroSection, { height: SCREEN_H * 0.52 }]}>
          <View style={s.logoRing}>
            <View style={s.logoRingOuter} />
            <Image
              source={require("../assets/hillaha-logo.png")}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={s.nameAr}>حلّها</Text>
            <View style={s.dividerRow}>
              <View style={[s.divider, { backgroundColor: "rgba(139,92,246,0.5)" }]} />
              <Text style={s.subTagline}>كل اللي تحتاجه في مكان واحد</Text>
              <View style={[s.divider, { backgroundColor: "rgba(236,72,153,0.5)" }]} />
            </View>
          </View>
        </View>

        {/* شرائح الخدمات */}
        <View style={s.chipsRow}>
          {[
            { icon: "🍔", label: "مطاعم"    },
            { icon: "💊", label: "صيدلية"   },
            { icon: "🏥", label: "طبيب"     },
            { icon: "🛵", label: "توصيل سريع" },
          ].map(chip => (
            <View key={chip.label} style={s.chip}>
              <Text style={{ fontSize: 14 }}>{chip.icon}</Text>
              <Text style={s.chipLabel}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* أزرار الدخول */}
        <View style={s.btns}>
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={({ pressed }) => [s.btnPrimary, pressed && { opacity: 0.88 }]}
          >
            <Text style={s.btnPrimaryText}>إنشاء حساب جديد</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [s.btnSecondary, pressed && { opacity: 0.75 }]}
          >
            <Text style={s.btnSecondaryText}>تسجيل الدخول</Text>
          </Pressable>
        </View>

        {/* تذييل */}
        <View style={s.footer}>
          <View style={s.footerDot} />
          <Text style={s.footerText}>متاح في قنا، مصر</Text>
          <Text style={s.footerAccent}> وقريباً في المملكة</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ── الأنماط ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  glow:   { position: "absolute" },

  // لوجو
  logoRing: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: C.ring1,
    borderWidth: 1.5, borderColor: C.ring2,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 30, elevation: 12,
    marginBottom: 6,
  },
  logoRingOuter: {
    position: "absolute",
    width: 170, height: 170, borderRadius: 85,
    borderWidth: 1, borderColor: C.ring3,
  },
  logoImg: { width: 96, height: 96 },

  // نصوص splash
  nameAr: {
    fontSize: 44, fontWeight: "900", letterSpacing: -1,
    color: C.white, textAlign: "center",
  },
  nameEn: {
    fontSize: 16, fontWeight: "700", letterSpacing: 4,
    color: C.muted, textAlign: "center", marginTop: 4,
  },
  tagline: {
    fontSize: 13, color: C.muted, textAlign: "center", marginTop: 8,
  },

  // hero section
  heroSection: {
    alignItems: "center", justifyContent: "flex-end", paddingBottom: 30,
  },
  dividerRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4,
  },
  divider: { width: 20, height: 2, borderRadius: 1 },
  subTagline: {
    fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600",
  },

  // شرائح
  chipsRow: {
    flexDirection: "row", justifyContent: "center",
    gap: 10, marginBottom: 36, flexWrap: "wrap", paddingHorizontal: 20,
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: C.glass,
    borderWidth: 1, borderColor: C.border,
  },
  chipLabel: {
    fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600",
  },

  // أزرار
  btns: { paddingHorizontal: 24, gap: 12 },
  btnPrimary: {
    paddingVertical: 17, borderRadius: 18,
    backgroundColor: C.purple,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 16, elevation: 10,
  },
  btnPrimaryText: {
    color: C.white, fontWeight: "900",
    textAlign: "center", fontSize: 17,
  },
  btnSecondary: {
    paddingVertical: 16, borderRadius: 18,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: C.glass,
  },
  btnSecondaryText: {
    color: "rgba(255,255,255,0.9)", fontWeight: "800",
    textAlign: "center", fontSize: 16,
  },

  // تذييل
  footer: {
    flexDirection: "row", justifyContent: "center",
    gap: 4, marginTop: 28, marginBottom: 20,
  },
  footerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
  },
  footerText:   { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  footerAccent: { fontSize: 12, color: "rgba(139,92,246,0.7)"  },
});
