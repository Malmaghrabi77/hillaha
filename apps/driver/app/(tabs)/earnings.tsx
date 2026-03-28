import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StatusBar, Pressable, ActivityIndicator } from "react-native";
import { C, getSB } from "../lib/constants";

const PERIODS = ["هذا الأسبوع", "هذا الشهر", "الكل"] as const;
type Period = typeof PERIODS[number];

const DAY_NAMES = ["أحد", "إثن", "ثلا", "أربع", "خميس", "جمعة", "سبت"];

interface DeliveryRecord {
  id: string;
  partnerName: string;
  deliveredAt: string;
  deliveryFee: number;
}

interface DayData {
  day: string;
  deliveries: number;
  earnings: number;
}

export default function EarningsTab() {
  const [period, setPeriod] = useState<Period>("هذا الأسبوع");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DeliveryRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);

  useEffect(() => {
    loadEarnings(period);
  }, [period]);

  async function loadEarnings(p: Period) {
    setLoading(true);
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setLoading(false); return; }
    const userId = userData.user.id;

    // Build date filter
    const now = new Date();
    let fromDate: string | null = null;

    if (p === "هذا الأسبوع") {
      // Saturday to Friday week (matching settlement)
      const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
      const daysSinceSat = (dayOfWeek + 1) % 7; // 0=Sat, 1=Sun...
      const sat = new Date(now);
      sat.setDate(now.getDate() - daysSinceSat);
      sat.setHours(0, 0, 0, 0);
      fromDate = sat.toISOString();
    } else if (p === "هذا الشهر") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = firstOfMonth.toISOString();
    }

    // Fetch delivered orders
    let query = (supabase as any)
      .from("orders")
      .select("id, delivered_at, delivery_fee, partners(name)")
      .eq("driver_id", userId)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false });

    if (fromDate) {
      query = query.gte("delivered_at", fromDate);
    }

    const { data: orders } = await query;

    if (!orders || orders.length === 0) {
      setHistory([]);
      setWeeklyData([]);
      setTotalEarnings(0);
      setTotalDeliveries(0);
      setLoading(false);
      return;
    }

    // Map to history records
    const records: DeliveryRecord[] = orders.map((o: any) => ({
      id: o.id.substring(0, 8).toUpperCase(),
      partnerName: o.partners?.name || "متجر",
      deliveredAt: o.delivered_at,
      deliveryFee: Number(o.delivery_fee) || 0,
    }));

    setHistory(records);
    setTotalDeliveries(records.length);
    setTotalEarnings(records.reduce((s, r) => s + r.deliveryFee, 0));

    // Build weekly chart data (last 7 days for "this week", or per-day breakdown)
    if (p === "هذا الأسبوع") {
      const dayMap = new Map<number, { deliveries: number; earnings: number }>();
      const dayOfWeek = now.getDay();
      const daysSinceSat = (dayOfWeek + 1) % 7;

      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - daysSinceSat + i);
        dayMap.set(d.getDay(), { deliveries: 0, earnings: 0 });
      }

      for (const r of records) {
        const d = new Date(r.deliveredAt);
        const dw = d.getDay();
        const entry = dayMap.get(dw);
        if (entry) {
          entry.deliveries++;
          entry.earnings += r.deliveryFee;
        }
      }

      // Build in order: Sat, Sun, Mon, Tue, Wed, Thu, Fri
      const weekOrder = [6, 0, 1, 2, 3, 4, 5]; // JS day indexes
      const chartData: DayData[] = weekOrder.map(dw => ({
        day: DAY_NAMES[dw],
        deliveries: dayMap.get(dw)?.deliveries || 0,
        earnings: dayMap.get(dw)?.earnings || 0,
      }));
      setWeeklyData(chartData);
    } else {
      // For month/all, group by last 7 most recent days with deliveries
      const dayTotals = new Map<string, { day: string; deliveries: number; earnings: number }>();
      for (const r of records) {
        const d = new Date(r.deliveredAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!dayTotals.has(key)) {
          dayTotals.set(key, { day: DAY_NAMES[d.getDay()], deliveries: 0, earnings: 0 });
        }
        const entry = dayTotals.get(key)!;
        entry.deliveries++;
        entry.earnings += r.deliveryFee;
      }
      setWeeklyData(Array.from(dayTotals.values()).slice(0, 7));
    }

    setLoading(false);
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "م" : "ص";
    const h12 = hours % 12 || 12;
    const timeStr = `${h12}:${mins} ${ampm}`;

    if (isToday) return timeStr;
    if (isYesterday) return `أمس ${timeStr}`;
    return `${d.getDate()}/${d.getMonth() + 1} ${timeStr}`;
  }

  const avgPerDelivery = totalDeliveries > 0 ? Math.round(totalEarnings / totalDeliveries) : 0;
  const maxEarnings = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => d.earnings), 1) : 1;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.primary, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 24,
      }}>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>إجمالي الأرباح</Text>
        <Text style={{ fontSize: 36, fontWeight: "900", color: "white" }}>
          {loading ? "..." : `${totalEarnings} ج`}
        </Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          {loading ? "" : `${totalDeliveries} توصيلة · متوسط ${avgPerDelivery} ج / توصيلة`}
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

        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <>
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
            {weeklyData.length > 0 && (
              <View style={{
                backgroundColor: C.surface, borderRadius: 18, padding: 18,
                borderWidth: 1, borderColor: C.border,
              }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 14 }}>
                  الأرباح اليومية (ج)
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100 }}>
                  {weeklyData.map((d, i) => (
                    <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                      <Text style={{ fontSize: 9, color: C.textMuted }}>{d.earnings}</Text>
                      <View style={{
                        width: "100%", borderRadius: 6,
                        backgroundColor: i === weeklyData.length - 1 ? C.primary : C.primarySoft,
                        height: (d.earnings / maxEarnings) * 70,
                        minHeight: 6,
                      }} />
                      <Text style={{ fontSize: 9, color: C.textMuted }}>{d.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* HISTORY */}
            <View style={{
              backgroundColor: C.surface, borderRadius: 18, padding: 18,
              borderWidth: 1, borderColor: C.border,
            }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 14 }}>
                آخر التوصيلات
              </Text>
              {history.length === 0 ? (
                <Text style={{ textAlign: "center", color: C.textMuted, fontSize: 13, paddingVertical: 20 }}>
                  لا توجد توصيلات بعد
                </Text>
              ) : (
                history.slice(0, 10).map((h, i) => (
                  <View key={h.id} style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingVertical: 11,
                    borderBottomWidth: i < Math.min(history.length, 10) - 1 ? 1 : 0,
                    borderBottomColor: C.border,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{h.partnerName}</Text>
                      <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {formatTime(h.deliveredAt)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: "#059669" }}>+{h.deliveryFee} ج</Text>
                  </View>
                ))
              )}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
