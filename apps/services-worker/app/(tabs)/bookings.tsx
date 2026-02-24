import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, Alert, Platform,
} from "react-native";

const C = {
  bg: "#FAFAFF",      surface: "#FFFFFF",
  primary: "#7C3AED", primarySoft: "#EDE9FE",
  text: "#1F1B2E",    textMuted: "#6B6480",
  border: "#E7E3FF",  success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
} as const;

type Booking = {
  id: string;
  service_type: string;
  service_name: string;
  price: number;
  address: string;
  scheduled_time: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
};

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

const SERVICE_ICONS: Record<string, string> = {
  cleaning:   "🧹",
  electrical: "⚡",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "قيد الانتظار", color: "#D97706", bg: "#FEF3C7" },
  accepted:   { label: "مقبول",        color: "#7C3AED", bg: "#EDE9FE" },
  in_progress:{ label: "جارٍ التنفيذ", color: "#2563EB", bg: "#DBEAFE" },
  completed:  { label: "مكتمل",        color: "#059669", bg: "#D1FAE5" },
  cancelled:  { label: "ملغي",         color: "#EF4444", bg: "#FEE2E2" },
};

export default function Bookings() {
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId,       setMyId]       = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<"pending" | "accepted">("pending");

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const sb = getSB();
    if (!sb) { setLoading(false); return; }

    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user) setMyId(user.id);

      const { data } = await sb
        .from("service_bookings")
        .select("*")
        .in("status", ["pending", "accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);

      setBookings((data as Booking[]) ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Real-time subscription
  useEffect(() => {
    const sb = getSB();
    if (!sb) return;
    const channel = sb
      .channel("service_bookings_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_bookings" },
        () => fetchBookings(true))
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [fetchBookings]);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    const sb = getSB();
    if (!sb) return;
    const { error } = await sb
      .from("service_bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) {
      Alert.alert("خطأ", "تعذّر تحديث الحالة");
    } else {
      fetchBookings(true);
    }
  };

  const handleAccept = (b: Booking) => {
    Alert.alert("قبول الطلب", `قبول طلب "${b.service_name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "قبول", onPress: () => updateStatus(b.id, "accepted") },
    ]);
  };

  const handleStart = (b: Booking) => {
    Alert.alert("بدء التنفيذ", "تأكيد بدء تنفيذ الخدمة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "بدء", onPress: () => updateStatus(b.id, "in_progress") },
    ]);
  };

  const handleComplete = (b: Booking) => {
    Alert.alert("إتمام الخدمة", "تأكيد إتمام الخدمة وتسليمها للعميل؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "إتمام ✓", onPress: () => updateStatus(b.id, "completed") },
    ]);
  };

  const pending  = bookings.filter(b => b.status === "pending");
  const accepted = bookings.filter(b => b.status === "accepted" || b.status === "in_progress");

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
        paddingHorizontal: 18, paddingBottom: 16,
      }}>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" }}>
          حلّها — عامل خدمات
        </Text>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900", marginTop: 4 }}>
          🔧 طلبات الخدمة
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          {[
            { key: "pending",  label: `قيد الانتظار (${pending.length})` },
            { key: "accepted", label: `نشطة (${accepted.length})` },
          ].map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as "pending" | "accepted")}
              style={{
                paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
                backgroundColor: activeTab === tab.key
                  ? "white"
                  : "rgba(255,255,255,0.2)",
              }}
            >
              <Text style={{
                fontWeight: "900", fontSize: 12,
                color: activeTab === tab.key ? C.primary : "white",
              }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchBookings(); }}
            colors={[C.primary]}
          />
        }
      >
        {(activeTab === "pending" ? pending : accepted).length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Text style={{ fontSize: 52 }}>
              {activeTab === "pending" ? "✅" : "📋"}
            </Text>
            <Text style={{ color: C.textMuted, marginTop: 12, fontWeight: "700", fontSize: 16 }}>
              {activeTab === "pending" ? "لا توجد طلبات جديدة" : "لا توجد طلبات نشطة"}
            </Text>
          </View>
        )}

        {(activeTab === "pending" ? pending : accepted).map(b => {
          const statusInfo = STATUS_LABELS[b.status] ?? STATUS_LABELS.pending;
          const d = new Date(b.created_at);
          const dateStr = `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

          return (
            <View key={b.id} style={{
              backgroundColor: C.surface, borderRadius: 20, marginBottom: 14,
              borderWidth: 1, borderColor: C.border,
              shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
            }}>
              {/* Top row */}
              <View style={{ padding: 16, paddingBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: C.primarySoft,
                      justifyContent: "center", alignItems: "center",
                    }}>
                      <Text style={{ fontSize: 24 }}>{SERVICE_ICONS[b.service_type] ?? "🔧"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "900", color: C.text }} numberOfLines={1}>
                        {b.service_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {b.service_type === "cleaning" ? "تنظيف منزل" : "كهرباء وصيانة"} • {dateStr}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
                    backgroundColor: statusInfo.bg,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "900", color: statusInfo.color }}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={{ marginTop: 12, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>📍</Text>
                    <Text style={{ fontSize: 13, color: C.text, fontWeight: "600", flex: 1 }} numberOfLines={2}>
                      {b.address}
                    </Text>
                  </View>
                  {b.scheduled_time && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13 }}>🕐</Text>
                      <Text style={{ fontSize: 13, color: C.textMuted }}>
                        الوقت المحدد: {b.scheduled_time}
                      </Text>
                    </View>
                  )}
                  {b.notes && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13 }}>📝</Text>
                      <Text style={{ fontSize: 12, color: C.textMuted, flex: 1 }} numberOfLines={2}>
                        {b.notes}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Price + CTA */}
              <View style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: 16, paddingVertical: 12,
                borderTopWidth: 1, borderColor: C.border,
              }}>
                <View>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>قيمة الخدمة</Text>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: C.primary }}>
                    {b.price} جنيه
                  </Text>
                </View>

                {b.status === "pending" && (
                  <Pressable
                    onPress={() => handleAccept(b)}
                    style={{
                      backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 20,
                      borderRadius: 12,
                      shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>قبول ✓</Text>
                  </Pressable>
                )}

                {b.status === "accepted" && (
                  <Pressable
                    onPress={() => handleStart(b)}
                    style={{
                      backgroundColor: "#2563EB", paddingVertical: 10, paddingHorizontal: 20,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>بدء التنفيذ ▶</Text>
                  </Pressable>
                )}

                {b.status === "in_progress" && (
                  <Pressable
                    onPress={() => handleComplete(b)}
                    style={{
                      backgroundColor: "#059669", paddingVertical: 10, paddingHorizontal: 20,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>إتمام ✓</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
