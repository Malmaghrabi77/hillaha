import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { router } from "expo-router";
const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

// 20 نقاط = 20 جنيه | الحد الأدنى للاستبدال 20 نقطة | 1 نقطة لكل 250 جنيه مشتريات
const POINTS_PER_EGP   = 250;
const MIN_REDEEM       = 20;
const EGP_PER_POINT    = 1;

const REWARDS = [
  {
    id: "1", title: "خصم 20 جنيه",  subtitle: "الحد الأدنى للاستبدال",
    points: 20,  icon: "💸", available: true,  highlight: true,
  },
  {
    id: "2", title: "خصم 50 جنيه",  subtitle: "وفّر على طلبك القادم",
    points: 50,  icon: "🏷️", available: true,  highlight: false,
  },
  {
    id: "3", title: "توصيل مجاني",  subtitle: "توصيل مجاني على أي طلب",
    points: 100, icon: "🛵", available: false, highlight: false,
  },
  {
    id: "4", title: "وجبة مجانية",  subtitle: "وجبة مجانية من أي مطعم",
    points: 200, icon: "🍽️", available: false, highlight: false,
  },
];

const HISTORY = [
  { text: "طلب من مطعم الشيف",     points: "+2",  egp: "500 جنيه",  date: "أمس",           credit: true },
  { text: "طلب من كافيه ريلاكس",   points: "+1",  egp: "300 جنيه",  date: "منذ 3 أيام",    credit: true },
  { text: "استبدال خصم 20 جنيه",   points: "-20", egp: "",          date: "منذ أسبوع",      credit: false },
  { text: "طلب من صيدلية النور",   points: "+1",  egp: "250 جنيه",  date: "منذ أسبوعين",   credit: true },
  { text: "تقييم المطعم",          points: "+2",  egp: "",          date: "منذ أسبوعين",   credit: true },
];

const MY_POINTS      = 47;
const LEVEL_THRESHOLD = 100;

const LEVELS = [
  { name: "برونزي",  min: 0,   max: 50,  color: "#92400E", bg: "#FEF3C7" },
  { name: "فضي",    min: 50,  max: 100, color: "#374151", bg: "#F3F4F6" },
  { name: "ذهبي",   min: 100, max: 200, color: "#D97706", bg: "#FEF9C3" },
  { name: "بلاتيني", min: 200, max: Infinity, color: "#7C3AED", bg: "#EDE9FE" },
];

function getCurrentLevel() {
  return LEVELS.find(l => MY_POINTS >= l.min && MY_POINTS < l.max) ?? LEVELS[0];
}
function getNextLevel() {
  const idx = LEVELS.findIndex(l => MY_POINTS >= l.min && MY_POINTS < l.max);
  return LEVELS[idx + 1] ?? null;
}

export default function Loyalty() {
  const [redeemTried, setRedeemTried] = useState<string | null>(null);

  const level     = getCurrentLevel();
  const nextLevel = getNextLevel();
  const progress  = nextLevel
    ? (MY_POINTS - level.min) / (nextLevel.min - level.min)
    : 1;
  const pointsToNext = nextLevel ? nextLevel.min - MY_POINTS : 0;

  function handleRedeem(reward: typeof REWARDS[0]) {
    if (!reward.available) return;
    if (MY_POINTS < reward.points) return;
    setRedeemTried(reward.id);
    setTimeout(() => setRedeemTried(null), 2000);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── HERO CARD ──────────────────────────────────── */}
        <View style={{
          margin: 16, borderRadius: 28, overflow: "hidden",
          shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
        }}>
          <View style={{ padding: 26, backgroundColor: "#4C1D95" }}>
            {/* Deco circles */}
            <View style={{
              position: "absolute", top: -50, left: -50,
              width: 180, height: 180, borderRadius: 90,
              backgroundColor: "rgba(255,255,255,0.05)",
            }} />
            <View style={{
              position: "absolute", bottom: -30, right: -30,
              width: 140, height: 140, borderRadius: 70,
              backgroundColor: "#EC4899", opacity: 0.25,
            }} />

            {/* Logo + level badge */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <Image
                source={require("../assets/halha-logo.png")}
                style={{ width: 44, height: 44, resizeMode: "contain", tintColor: "white" }}
              />
              <View style={{
                paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20,
                backgroundColor: level.bg,
              }}>
                <Text style={{ color: level.color, fontWeight: "900", fontSize: 13 }}>
                  ⭐ {level.name}
                </Text>
              </View>
            </View>

            {/* Points display */}
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "700" }}>
              رصيد نقاطك الحالي
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 }}>
              <Text style={{ color: "white", fontSize: 56, fontWeight: "900", lineHeight: 62 }}>
                {MY_POINTS}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
                نقطة
              </Text>
            </View>

            {/* Conversion note */}
            <View style={{
              flexDirection: "row", gap: 6, marginTop: 6, marginBottom: 18,
              flexWrap: "wrap",
            }}>
              <View style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
              }}>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700" }}>
                  💳 {MY_POINTS} جنيه خصم متاح
                </Text>
              </View>
              <View style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
              }}>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" }}>
                  الحد الأدنى للاستبدال: 20 نقطة
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            {nextLevel && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" }}>
                    {level.name} ← {nextLevel.name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                    {MY_POINTS} / {nextLevel.min}
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" }}>
                  <View style={{
                    height: 8, borderRadius: 4,
                    width: `${Math.min(progress * 100, 100)}%` as any,
                    backgroundColor: "#EC4899",
                  }} />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 5 }}>
                  {pointsToNext} نقطة للمستوى {nextLevel.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── EARNING RULES ──────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 12 }}>
            كيف تكسب نقاط؟
          </Text>
          <View style={{ gap: 10 }}>
            {/* Main earning rule */}
            <View style={{
              borderRadius: 18, padding: 16,
              backgroundColor: "#F3F0FF",
              borderWidth: 1.5, borderColor: "#C4B5FD",
              flexDirection: "row", alignItems: "center", gap: 14,
            }}>
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: "#7C3AED",
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 26 }}>🛒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: "#4C1D95", fontSize: 15 }}>
                  1 نقطة لكل 250 جنيه
                </Text>
                <Text style={{ color: "#6D28D9", fontSize: 12, marginTop: 2 }}>
                  تُضاف تلقائياً عند التسليم
                </Text>
              </View>
              <View style={{
                backgroundColor: "#7C3AED",
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
              }}>
                <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>أساسي</Text>
              </View>
            </View>

            {/* Secondary earning methods */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { icon: "⭐", title: "تقييم طلبك", pts: "+2 نقطة", color: "#F59E0B", bg: "#FEF3C7" },
                { icon: "👥", title: "دعوة صديق",  pts: "+20 نقطة", color: "#059669", bg: "#D1FAE5" },
              ].map((item, i) => (
                <View key={i} style={{
                  flex: 1, borderRadius: 16, padding: 14,
                  backgroundColor: item.bg,
                  borderWidth: 1, borderColor: `${item.color}40`,
                  alignItems: "center", gap: 6,
                }}>
                  <Text style={{ fontSize: 26 }}>{item.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: item.color, textAlign: "center" }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: item.color }}>{item.pts}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── REWARDS ────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 12 }}>
            المكافآت المتاحة
          </Text>

          {REWARDS.map(r => {
            const canRedeem = r.available && MY_POINTS >= r.points;
            const isRedeemed = redeemTried === r.id;

            return (
              <View key={r.id} style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                padding: 16, borderRadius: 20, marginBottom: 10,
                backgroundColor: r.highlight ? "#F3F0FF" : C.surface,
                borderWidth: r.highlight ? 2 : 1,
                borderColor: r.highlight ? "#7C3AED" : C.border,
                shadowColor: r.highlight ? "#7C3AED" : "#000",
                shadowOffset: { width: 0, height: r.highlight ? 4 : 2 },
                shadowOpacity: r.highlight ? 0.15 : 0.05,
                shadowRadius: r.highlight ? 10 : 6,
                elevation: r.highlight ? 4 : 1,
                opacity: canRedeem ? 1 : 0.55,
              }}>
                {/* Icon */}
                <View style={{
                  width: 54, height: 54, borderRadius: 16,
                  backgroundColor: canRedeem ? (r.highlight ? "#7C3AED" : "#EDE9FE") : "#F3F4F6",
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Text style={{ fontSize: 26 }}>{r.icon}</Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "900", color: C.text, fontSize: 15 }}>{r.title}</Text>
                    {r.highlight && (
                      <View style={{
                        backgroundColor: "#7C3AED",
                        paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8,
                      }}>
                        <Text style={{ color: "white", fontSize: 9, fontWeight: "900" }}>الحد الأدنى</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{r.subtitle}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#7C3AED" }}>{r.points} نقطة</Text>
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>= {r.points} جنيه خصم</Text>
                  </View>
                </View>

                {/* CTA */}
                <Pressable
                  disabled={!canRedeem}
                  onPress={() => handleRedeem(r)}
                  style={{
                    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14,
                    backgroundColor: isRedeemed ? "#059669" : canRedeem ? "#7C3AED" : "#E5E7EB",
                    shadowColor: canRedeem ? "#7C3AED" : "transparent",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3, shadowRadius: 8, elevation: canRedeem ? 4 : 0,
                  }}
                >
                  <Text style={{
                    fontWeight: "900", fontSize: 13,
                    color: canRedeem ? "white" : "#9CA3AF",
                  }}>
                    {isRedeemed ? "✓ تم" : canRedeem ? "استبدال" : "غير متاح"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ── HOW IT WORKS ───────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, borderRadius: 18, padding: 16, marginBottom: 20,
          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontWeight: "900", color: C.text, fontSize: 15, marginBottom: 12 }}>
            📖 قواعد نظام الولاء
          </Text>
          {[
            { icon: "✅", text: "1 نقطة لكل 250 جنيه مشتريات" },
            { icon: "✅", text: "الحد الأدنى للاستبدال 20 نقطة" },
            { icon: "✅", text: "1 نقطة = 1 جنيه خصم" },
            { icon: "✅", text: "النقاط لا تنتهي صلاحيتها" },
            { icon: "✅", text: "يمكن تجميع النقاط مع العروض" },
          ].map((rule, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: i < 4 ? 8 : 0 }}>
              <Text style={{ fontSize: 14 }}>{rule.icon}</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: "600" }}>{rule.text}</Text>
            </View>
          ))}
        </View>

        {/* ── HISTORY ────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 12 }}>
            سجل النقاط
          </Text>
          {HISTORY.map((h, i) => (
            <View key={i} style={{
              flexDirection: "row", alignItems: "center",
              padding: 14, borderRadius: 16, marginBottom: 8,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12, marginLeft: 12,
                backgroundColor: h.credit ? "#D1FAE5" : "#FEE2E2",
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 18 }}>{h.credit ? "⬆️" : "⬇️"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{h.text}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>{h.date}</Text>
                  {h.egp ? (
                    <>
                      <Text style={{ color: C.textMuted, fontSize: 11 }}>•</Text>
                      <Text style={{ color: C.textMuted, fontSize: 11 }}>قيمة الطلب: {h.egp}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <Text style={{
                fontWeight: "900", fontSize: 16,
                color: h.credit ? "#059669" : "#EF4444",
              }}>
                {h.points}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
