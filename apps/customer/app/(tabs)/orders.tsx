import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSupabase } from "../../hooks/useSupabase";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";
import { LoadingAnimation, EmptyStateAnimation } from "../hooks/useLottieAnimations";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";

// ── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; bg: string; bgDark: string; color: string; colorDark: string }> = {
  pending:      { label: "⏳ في الانتظار",        bg: "#FEF3C7", bgDark: "#78350F", color: "#92400E", colorDark: "#FDE047" },
  accepted:     { label: "✅ مؤكد",               bg: "#D1FAE5", bgDark: "#064E3B", color: "#065F46", colorDark: "#6EE7B7" },
  preparing:    { label: "👨‍🍳 يُحضَّر",         bg: "#EDE9FE", bgDark: "#3730A3", color: "#5B21B6", colorDark: "#C4B5FD" },
  ready:        { label: "🔔 جاهز للتوصيل",      bg: "#FEF9C3", bgDark: "#713F12", color: "#713F12", colorDark: "#FCD34D" },
  picked_up:    { label: "🛵 في الطريق",          bg: "#DBEAFE", bgDark: "#0C2340", color: "#1E40AF", colorDark: "#93C5FD" },
  delivered:    { label: "✅ تم التسليم",         bg: "#D1FAE5", bgDark: "#064E3B", color: "#065F46", colorDark: "#6EE7B7" },
  cancelled:    { label: "❌ ملغي",               bg: "#FEE2E2", bgDark: "#7F1D1D", color: "#991B1B", colorDark: "#FCA5A5" },
};

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "picked_up"];

interface OrderRow {
  id:         string;
  status:     string;
  total:      number;
  created_at: string;
  items:      { name: string; qty: number }[];
  partners:   { name_ar: string } | null;
}

export default function Orders() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [orders,     setOrders]     = useState<OrderRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest,    setIsGuest]    = useState(false);

  async function fetchOrders(silent = false) {
    if (!silent) setLoading(true);
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

  useEffect(() => {
    // 📊 تتبع عرض الشاشة
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.ORDERS);
  }, []);

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  function onRefresh() { setRefreshing(true); fetchOrders(true); }

  // ── Guest ──────────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text, marginBottom: 8, textAlign: "center" }}>
          سجّل دخولك لعرض طلباتك
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
          تتبع طلباتك الحالية والسابقة من هنا
        </Text>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent(ANALYTICS_EVENTS.AUTH.LOGIN_FROM_ORDERS_CLICKED, {});
            router.push("/(auth)/login");
          }}
          {...A11yPresets.button("تسجيل الدخول", "انقر لتسجيل الدخول وعرض طلباتك")}
          style={{
            backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 36,
            borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
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
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <LoadingAnimation speed={1.5} />
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <EmptyStateAnimation width={120} height={120} />
        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text, marginBottom: 8, marginTop: 20 }}>
          لا توجد طلبات بعد
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
          اطلب الآن وتابع حالة طلبك هنا
        </Text>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent(ANALYTICS_EVENTS.ORDER.NOW_FROM_EMPTY_CLICKED, {});
            router.push("/(tabs)/home");
          }}
          {...A11yPresets.button("اطلب الآن", "انقر للانتقال إلى صفحة الطلب")}
          style={{
            backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 36,
            borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
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
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      {...A11yPresets.listItem("قائمة الطلبات", 0, 1)}
    >
      <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text, marginBottom: 16 }}>طلباتي</Text>

      if (active.length > 0 && (
        <>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: 10 }}>
            الطلبات الجارية
          </Text>
          {active.map(o => <OrderCard key={o.id} order={o} active isDarkMode={isDarkMode} colors={colors} />)}
        </>
      )}

      {past.length > 0 && (
        <>
          <Text style={{
            fontSize: 13, fontWeight: "700", color: colors.textMuted,
            marginBottom: 10, marginTop: active.length > 0 ? 16 : 0,
          }}>
            الطلبات السابقة
          </Text>
          {past.map(o => <OrderCard key={o.id} order={o} active={false} isDarkMode={isDarkMode} colors={colors} />)}
        </>
      )}
    </ScrollView>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, active, isDarkMode, colors }: { order: OrderRow; active: boolean; isDarkMode: boolean; colors: any }) {
  const st      = STATUS[order.status] ?? STATUS.pending;
  const shortId = order.id.substring(0, 8).toUpperCase();
  const date    = new Date(order.created_at);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const items   = order.items ?? [];
  const itemCount = items.reduce((s, i) => s + (i.qty ?? 1), 0);

  return (
    <Pressable
      onPress={() => {
        if (active) {
          analyticsTracker.trackEvent(ANALYTICS_EVENTS.ORDER.CARD_CLICKED, { orderId: order.id, status: order.status });
          router.push(`/tracking/${order.id}`);
        }
      }}
      {...A11yPresets.listItem(`طلب رقم ${shortId} - حالة ${st.label}`, 0, 1)}
      style={{
        backgroundColor: colors.surface, borderRadius: 18, marginBottom: 12, padding: 16,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <View>
          <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>
            {order.partners?.name_ar ?? "المتجر"}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            #{shortId}  •  {dateStr}
          </Text>
        </View>
        <View style={{
          backgroundColor: isDarkMode ? st.bgDark : st.bg,
          paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10
        }}>
          <Text style={{ color: isDarkMode ? st.colorDark : st.color, fontWeight: "900", fontSize: 11 }}>
            {st.label}
          </Text>
        </View>
      </View>

      {/* Items */}
      {items.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 14 }}>🛍️</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
            {itemCount} {itemCount === 1 ? "منتج" : "منتجات"}
            {items[0] ? ` • ${items[0].name}` : ""}
            {items.length > 1 ? ` و${items.length - 1} آخرين` : ""}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 16 }}>
          {Number(order.total)} جنيه
        </Text>
        {active && (
          <View style={{
            backgroundColor: colors.primarySoft, paddingVertical: 7, paddingHorizontal: 14,
            borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6,
          }}>
            <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>تتبع الطلب</Text>
            <Text style={{ color: colors.primary, fontSize: 12 }}>←</Text>
          </View>
        )}
        {!active && order.status === "delivered" && (
          <Pressable
            onPress={() => {
              analyticsTracker.trackEvent(ANALYTICS_EVENTS.ORDER.REORDER_CLICKED, { orderId: order.id });
              router.push("/(tabs)/home");
            }}
            {...A11yPresets.button("اطلب مجدداً", "انقر لإعادة نفس الطلب")}
            style={{
              backgroundColor: colors.primarySoft, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>اطلب مجدداً</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
