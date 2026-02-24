import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, Platform,
} from "react-native";

const C = {
  bg: "#FAFAFF",      surface: "#FFFFFF",
  primary: "#7C3AED", primarySoft: "#EDE9FE",
  text: "#1F1B2E",    textMuted: "#6B6480",
  border: "#E7E3FF",  success: "#34D399",
} as const;

type Booking = {
  id: string;
  service_type: string;
  service_name: string;
  price: number;
  address: string;
  scheduled_time: string | null;
  status: string;
  created_at: string;
};

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

const SERVICE_ICONS: Record<string, string> = {
  cleaning:   "🧹",
  electrical: "⚡",
};

export default function History() {
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);

  const fetchHistory = async () => {
    const sb = getSB();
    if (!sb) { setLoading(false); return; }
    try {
      const { data } = await sb
        .from("service_bookings")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);

      const items = (data as Booking[]) ?? [];
      setBookings(items);
      setTotalEarned(items.reduce((sum, b) => sum + (b.price ?? 0), 0));
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{
        backgroundColor: C.primary,
        paddingTop: Platform.OS === "android" ? 40 : 60,
        paddingHorizontal: 18, paddingBottom: 20,
      }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>📅 سجل الخدمات</Text>
        <View style={{
          flexDirection: "row", gap: 16, marginTop: 16,
        }}>
          <View style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 14, padding: 14, alignItems: "center",
          }}>
            <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>{bookings.length}</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 }}>خدمة مكتملة</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 14, padding: 14, alignItems: "center",
          }}>
            <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>{totalEarned}</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 }}>جنيه مكتسب</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchHistory(); }}
            colors={[C.primary]}
          />
        }
      >
        {bookings.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Text style={{ fontSize: 52 }}>📋</Text>
            <Text style={{ color: C.textMuted, marginTop: 12, fontWeight: "700" }}>
              لا توجد خدمات مكتملة بعد
            </Text>
          </View>
        )}

        {bookings.map(b => {
          const d = new Date(b.created_at);
          const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
          return (
            <View key={b.id} style={{
              backgroundColor: C.surface, borderRadius: 18, marginBottom: 12,
              borderWidth: 1, borderColor: C.border, padding: 14,
              flexDirection: "row", alignItems: "center", gap: 12,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: "#D1FAE5",
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 22 }}>{SERVICE_ICONS[b.service_type] ?? "🔧"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }} numberOfLines={1}>
                  {b.service_name}
                </Text>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }} numberOfLines={1}>
                  📍 {b.address}
                </Text>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{dateStr}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#059669" }}>
                  +{b.price} ج
                </Text>
                <View style={{
                  backgroundColor: "#D1FAE5", paddingVertical: 3, paddingHorizontal: 8,
                  borderRadius: 8, marginTop: 4,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: "900", color: "#059669" }}>✓ مكتمل</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
