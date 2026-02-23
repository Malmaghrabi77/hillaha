import React, { useState, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: "⏳ في الانتظار", bg: "#FEF3C7", color: "#92400E" },
  confirmed:  { label: "✅ مؤكد",        bg: "#D1FAE5", color: "#065F46" },
  preparing:  { label: "👨‍🍳 يُحضَّر",  bg: "#EDE9FE", color: "#5B21B6" },
  delivering: { label: "🛵 في الطريق",   bg: "#DBEAFE", color: "#1E40AF" },
  done:       { label: "✅ تم التسليم",  bg: "#D1FAE5", color: "#065F46" },
  cancelled:  { label: "❌ ملغي",         bg: "#FEE2E2", color: "#991B1B" },
};

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "delivering"];

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
  id:         string;
  status:     string;
  total:      number;
  created_at: string;
  items:      { name: string; qty: number }[];
  partners:   { name_ar: string } | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Orders() {
  const [orders,     setOrders]     = useState<OrderRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest,    setIsGuest]    = useState(false);

  async function fetchOrders(silent = false) {
    if (!silent) setLoading(true);
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); setLoading(false); return; }

      const { data } = await supabase
        .from("orders")
        .select("id, status, total, created_at, items, partners(name_ar)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      setOrders((data as OrderRow[]) ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Refresh on focus so status changes are visible on return from tracking
  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  function onRefresh() { setRefreshing(true); fetchOrders(true); }

  // ── Guest ──────────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 8, textAlign: "center" }}>
          سجّل دخولك لعرض طلباتك
        </Text>
        <Text style={{ color: C.textMuted, textAlign: "center", fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
          تتبع طلباتك الحالية والسابقة من هنا
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={{
            backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 36,
            borderRadius: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>تسجيل الدخول</Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>📦</Text>
        <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 8 }}>
          لا توجد طلبات بعد
        </Text>
        <Text style={{ color: C.textMuted, textAlign: "center", fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
          اطلب الآن وتابع حالة طلبك هنا
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/home")}
          style={{
            backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 36,
            borderRadius: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>اطلب الآن</Text>
        </Pressable>
      </View>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const past   = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <Text style={{ fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 16 }}>طلباتي</Text>

      {active.length > 0 && (
        <>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.textMuted, marginBottom: 10 }}>
            الطلبات الجارية
          </Text>
          {active.map(o => <OrderCard key={o.id} order={o} active />)}
        </>
      )}

      {past.length > 0 && (
        <>
          <Text style={{
            fontSize: 13, fontWeight: "700", color: C.textMuted,
            marginBottom: 10, marginTop: active.length > 0 ? 16 : 0,
          }}>
            الطلبات السابقة
          </Text>
          {past.map(o => <OrderCard key={o.id} order={o} active={false} />)}
        </>
      )}
    </ScrollView>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, active }: { order: OrderRow; active: boolean }) {
  const st      = STATUS[order.status] ?? STATUS.pending;
  const shortId = order.id.substring(0, 8).toUpperCase();
  const date    = new Date(order.created_at);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const items   = order.items ?? [];
  const itemCount = items.reduce((s, i) => s + (i.qty ?? 1), 0);

  return (
    <Pressable
      onPress={() => active ? router.push(`/tracking/${order.id}`) : undefined}
      style={{
        backgroundColor: C.surface, borderRadius: 18, marginBottom: 12, padding: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? C.primary : C.border,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <View>
          <Text style={{ fontWeight: "900", color: C.text, fontSize: 15 }}>
            {order.partners?.name_ar ?? "المتجر"}
          </Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
            #{shortId}  •  {dateStr}
          </Text>
        </View>
        <View style={{ backgroundColor: st.bg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10 }}>
          <Text style={{ color: st.color, fontWeight: "900", fontSize: 11 }}>{st.label}</Text>
        </View>
      </View>

      {/* Items */}
      {items.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 14 }}>🛍️</Text>
          <Text style={{ color: C.textMuted, fontSize: 13 }} numberOfLines={1}>
            {itemCount} {itemCount === 1 ? "منتج" : "منتجات"}
            {items[0] ? ` • ${items[0].name}` : ""}
            {items.length > 1 ? ` و${items.length - 1} آخرين` : ""}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "900", color: C.primary, fontSize: 16 }}>
          {Number(order.total)} جنيه
        </Text>
        {active && (
          <View style={{
            backgroundColor: C.primarySoft, paddingVertical: 7, paddingHorizontal: 14,
            borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6,
          }}>
            <Text style={{ color: C.primary, fontWeight: "900", fontSize: 13 }}>تتبع الطلب</Text>
            <Text style={{ color: C.primary, fontSize: 12 }}>←</Text>
          </View>
        )}
        {!active && order.status === "done" && (
          <Pressable
            onPress={() => router.push("/(tabs)/home")}
            style={{
              backgroundColor: "#F3F4F6", paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12,
            }}
          >
            <Text style={{ color: "#374151", fontWeight: "700", fontSize: 13 }}>اطلب مجدداً</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
