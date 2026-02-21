import React, { useState } from "react";
import { View, Text, ScrollView, StatusBar, Pressable } from "react-native";
import { HALHA_THEME } from "@halha/ui";

const C = HALHA_THEME.colors;

const PERIODS = ["هذا الأسبوع", "هذا الشهر", "الكل"];

const WEEKLY_DATA = [
  { day: "سبت",  deliveries: 6,  earnings: 120 },
  { day: "أحد",  deliveries: 9,  earnings: 180 },
  { day: "إثن",  deliveries: 8,  earnings: 160 },
  { day: "ثلا",  deliveries: 11, earnings: 220 },
  { day: "أربع", deliveries: 5,  earnings: 100 },
  { day: "خميس", deliveries: 12, earnings: 240 },
  { day: "جمعة", deliveries: 8,  earnings: 160 },
];

const HISTORY = [
  { id: "ORD-101", restaurant: "برجر لاند 🍔", time: "11:45 ص", earnings: 20, distance: "3.2 كم" },
  { id: "ORD-098", restaurant: "بيتزا هت 🍕",  time: "10:20 ص", earnings: 25, distance: "5.8 كم" },
  { id: "ORD-095", restaurant: "كافيه مون ☕",  time: "09:05 ص", earnings: 15, distance: "2.1 كم" },
  { id: "ORD-091", restaurant: "صيدلية النيل 💊", time: "أمس 08:40 م", earnings: 18, distance: "4.0 كم" },
  { id: "ORD-088", restaurant: "سوشي باوند 🍣", time: "أمس 06:15 م", earnings: 30, distance: "7.2 كم" },
  { id: "ORD-085", restaurant: "برجر لاند 🍔", time: "أمس 04:30 م", earnings: 20, distance: "3.5 كم" },
];

const maxEarnings = Math.max(...WEEKLY_DATA.map(d => d.earnings));

export default function EarningsTab() {
  const [period, setPeriod] = useState("هذا الأسبوع");

  const totalEarnings   = WEEKLY_DATA.reduce((s, d) => s + d.earnings, 0);
  const totalDeliveries = WEEKLY_DATA.reduce((s, d) => s + d.deliveries, 0);
  const avgPerDelivery  = Math.round(totalEarnings / totalDeliveries);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.primary, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 24,
      }}>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>إجمالي الأرباح</Text>
        <Text style={{ fontSize: 36, fontWeight: "900", color: "white" }}>{totalEarnings} ج</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          {totalDeliveries} توصيلة · متوسط {avgPerDelivery} ج / توصيلة
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* PERIOD TABS */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {PERIODS.map(p => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: "center",
                backgroundColor: period === p ? C.primary : C.surface,
                borderWidth: 1, borderColor: period === p ? C.primary : C.border,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "700",
                color: period === p ? "white" : C.textMuted,
              }}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* STATS ROW */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "الأرباح",    value: `${totalEarnings} ج`, icon: "💰", color: "#059669", bg: "#D1FAE5" },
            { label: "التوصيلات", value: `${totalDeliveries}`,  icon: "📦", color: C.primary, bg: C.primarySoft },
            { label: "المتوسط",   value: `${avgPerDelivery} ج`, icon: "📊", color: C.warning, bg: "#FEF3C7" },
          ].map((s, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: s.bg, borderRadius: 14, padding: 12, alignItems: "center",
            }}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* BAR CHART */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 18,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 14 }}>
            الأرباح اليومية (ج)
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100 }}>
            {WEEKLY_DATA.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 9, color: C.textMuted }}>{d.earnings}</Text>
                <View style={{
                  width: "100%", borderRadius: 6,
                  backgroundColor: i === WEEKLY_DATA.length - 1 ? C.primary : C.primarySoft,
                  height: (d.earnings / maxEarnings) * 70,
                  minHeight: 6,
                }} />
                <Text style={{ fontSize: 9, color: C.textMuted }}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* HISTORY */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 18,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 14 }}>
            آخر التوصيلات
          </Text>
          {HISTORY.map((h, i) => (
            <View key={h.id} style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingVertical: 11,
              borderBottomWidth: i < HISTORY.length - 1 ? 1 : 0,
              borderBottomColor: C.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{h.restaurant}</Text>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {h.time} · {h.distance}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#059669" }}>+{h.earnings} ج</Text>
            </View>
          ))}
        </View>

        {/* SETTLEMENT NOTE */}
        <View style={{
          backgroundColor: C.primarySoft, borderRadius: 14, padding: 14,
          flexDirection: "row", alignItems: "center", gap: 12,
        }}>
          <Text style={{ fontSize: 24 }}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: C.primary }}>
              التسوية الأسبوعية القادمة
            </Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              يتم تحويل أرباحك كل جمعة تلقائياً
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
