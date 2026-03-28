import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, Pressable, Modal,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { useSupabase } from "../../src/hooks/useSupabase";
import { analyticsTracker } from "../../src/utils/analyticsTracker";
import { A11yPresets } from "../../src/hooks/useAccessibility";
import { LoadingAnimation, EmptyStateAnimation } from "../../src/hooks/useLottieAnimations";
import { ANALYTICS_EVENTS } from "../../src/constants/analyticsEvents";
import { SafeAreaScrollView } from '../../src/components';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; bg: string; bgDark: string; color: string; colorDark: string }> = {
  pending:      { label: "⏳ في الانتظار",        bg: "#FEF3C7", bgDark: "#78350F", color: "#92400E", colorDark: "#FDE047" },
  accepted:     { label: "✅ مؤكد",               bg: "#D1FAE5", bgDark: "#064E3B", color: "#065F46", colorDark: "#6EE7B7" },
  preparing:    { label: "👨‍🍳 يُحضَّر",         bg: "#EDE9FE", bgDark: "#3730A3", color: "#5B21B6", colorDark: "#C4B5FD" },
  ready:        { label: "🔔 جاهز للتوصيل",      bg: "#FEF9C3", bgDark: "#713F12", color: "#713F12", colorDark: "#FCD34D" },
  picked_up:    { label: "🛵 في الطريق",          bg: "#DBEAFE", bgDark: "#0C2340", color: "#1E40AF", colorDark: "#93C5FD" },
  delivered:    { label: "✅ تم التسليم",         bg: "#D1FAE5", bgDark: "#064E3B", color: "#065F46", colorDark: "#6EE7B7" },
  cancelled:    { label: "❌ ملغي",               bg: "#FEE2E2", bgDark: "#7F1D1D", color: "#991B1B", colorDark: "#FCA5A5" },
  confirmed:    { label: "✅ مؤكد",               bg: "#D1FAE5", bgDark: "#064E3B", color: "#065F46", colorDark: "#6EE7B7" },
  in_progress:  { label: "🔧 جاري التنفيذ",      bg: "#EDE9FE", bgDark: "#3730A3", color: "#5B21B6", colorDark: "#C4B5FD" },
  completed:    { label: "✅ مكتمل",              bg: "#D1FAE5", bgDark: "#064E3B", color: "#065F46", colorDark: "#6EE7B7" },
  assigned:     { label: "🛵 تم التعيين",         bg: "#DBEAFE", bgDark: "#0C2340", color: "#1E40AF", colorDark: "#93C5FD" },
  picked:       { label: "📦 تم الاستلام",        bg: "#EDE9FE", bgDark: "#3730A3", color: "#5B21B6", colorDark: "#C4B5FD" },
};

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "picked_up", "confirmed", "in_progress", "assigned", "picked"];

// ── Unified order type ───────────────────────────────────────────────────────
type OrderSource = "order" | "service" | "delivery";

interface UnifiedOrder {
  id: string;
  source: OrderSource;
  status: string;
  title: string;
  subtitle: string;
  total: number;
  created_at: string;
  icon: string;
  // Extra details for modal
  details: Record<string, string>;
}

const SERVICE_ICONS: Record<string, string> = {
  cleaning: "🧹",
  electrical: "⚡",
};

const SIZE_LABELS: Record<string, string> = {
  small: "صغير",
  medium: "متوسط",
  large: "كبير",
};

export default function Orders() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [orders, setOrders]         = useState<UnifiedOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]       = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);

  async function fetchOrders(silent = false) {
    if (!silent) setLoading(true);
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); setLoading(false); return; }

      const all: UnifiedOrder[] = [];

      // 1. Restaurant/store orders
      try {
        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, status, total, created_at, items, partners(name_ar)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (ordersData) {
          for (const o of ordersData as any[]) {
            const items = o.items ?? [];
            const itemCount = items.reduce((s: number, i: any) => s + (i.qty ?? 1), 0);
            all.push({
              id: o.id,
              source: "order",
              status: o.status,
              title: o.partners?.name_ar ?? "طلب مطعم",
              subtitle: itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? "منتج" : "منتجات"}${items[0] ? ` • ${items[0].name}` : ""}${items.length > 1 ? ` و${items.length - 1} آخرين` : ""}`
                : "طلب",
              total: Number(o.total),
              created_at: o.created_at,
              icon: "🍽️",
              details: {
                "نوع الطلب": "طلب مطعم / متجر",
                "المتجر": o.partners?.name_ar ?? "-",
                "المنتجات": items.map((i: any) => `${i.name} × ${i.qty}`).join("، ") || "-",
                "الإجمالي": `${Number(o.total)} جنيه`,
              },
            });
          }
        }
      } catch {}

      // 2. Service bookings (cleaning, electrical)
      try {
        const { data: servicesData } = await supabase
          .from("service_bookings")
          .select("id, service_type, service_name, price, address, scheduled_time, notes, status, created_at")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (servicesData) {
          for (const s of servicesData as any[]) {
            all.push({
              id: s.id,
              source: "service",
              status: s.status ?? "pending",
              title: s.service_name ?? (s.service_type === "cleaning" ? "خدمة تنظيف" : "خدمة كهرباء"),
              subtitle: s.scheduled_time ? `الموعد: ${s.scheduled_time}` : "في الانتظار",
              total: Number(s.price ?? 0),
              created_at: s.created_at,
              icon: SERVICE_ICONS[s.service_type] ?? "🔧",
              details: {
                "نوع الخدمة": s.service_type === "cleaning" ? "تنظيف منزلي" : "كهرباء وصيانة",
                "الخدمة": s.service_name ?? "-",
                "الموعد": s.scheduled_time ?? "-",
                "العنوان": s.address ?? "-",
                "ملاحظات": s.notes ?? "-",
                "السعر": `${Number(s.price ?? 0)} جنيه`,
              },
            });
          }
        }
      } catch {}

      // 3. Delivery requests
      try {
        const { data: deliveryData } = await supabase
          .from("delivery_requests")
          .select("id, package_size, from_address, to_address, sender_phone, receiver_phone, receiver_name, delivery_fee, tracking_code, notes, status, created_at")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (deliveryData) {
          for (const d of deliveryData as any[]) {
            all.push({
              id: d.id,
              source: "delivery",
              status: d.status ?? "pending",
              title: `توصيل ${SIZE_LABELS[d.package_size] ?? d.package_size ?? ""}`,
              subtitle: d.tracking_code ? `كود التتبع: ${d.tracking_code}` : "في الانتظار",
              total: Number(d.delivery_fee ?? 0),
              created_at: d.created_at,
              icon: "📦",
              details: {
                "نوع الخدمة": "توصيل طرد",
                "حجم الطرد": SIZE_LABELS[d.package_size] ?? d.package_size ?? "-",
                "كود التتبع": d.tracking_code ?? "-",
                "من": d.from_address ?? "-",
                "إلى": d.to_address ?? "-",
                "هاتف المستلم": d.receiver_phone ?? "-",
                "اسم المستلم": d.receiver_name ?? "-",
                "ملاحظات": d.notes ?? "-",
                "رسوم التوصيل": `${Number(d.delivery_fee ?? 0)} جنيه`,
              },
            });
          }
        }
      } catch {}

      // Sort all by date descending
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(all);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaScrollView
        variant="page"
        safeBottom={false}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        {...A11yPresets.listItem("قائمة الطلبات", 0, 1)}
      >
        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text, marginBottom: 16 }}>طلباتي</Text>

        {active.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: 10 }}>
              الطلبات الجارية ({active.length})
            </Text>
            {active.map(o => (
              <OrderCard
                key={`${o.source}-${o.id}`}
                order={o}
                active
                isDarkMode={isDarkMode}
                colors={colors}
                onPress={() => {
                  if (o.source === "order") {
                    analyticsTracker.trackEvent(ANALYTICS_EVENTS.ORDER.CARD_CLICKED, { orderId: o.id, status: o.status });
                    router.push(`/tracking/${o.id}`);
                  } else {
                    setSelectedOrder(o);
                  }
                }}
              />
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={{
              fontSize: 13, fontWeight: "700", color: colors.textMuted,
              marginBottom: 10, marginTop: active.length > 0 ? 16 : 0,
            }}>
              الطلبات السابقة ({past.length})
            </Text>
            {past.map(o => (
              <OrderCard
                key={`${o.source}-${o.id}`}
                order={o}
                active={false}
                isDarkMode={isDarkMode}
                colors={colors}
                onPress={() => setSelectedOrder(o)}
              />
            ))}
          </>
        )}
      </SafeAreaScrollView>

      {/* Order Detail Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: 40, paddingHorizontal: 16, paddingTop: 16,
            maxHeight: "80%",
          }}>
            <View style={{
              width: 44, height: 5, borderRadius: 3,
              backgroundColor: colors.border,
              alignSelf: "center", marginBottom: 16,
            }} />

            {selectedOrder && (
              <>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 14,
                    backgroundColor: colors.primarySoft,
                    justifyContent: "center", alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 26 }}>{selectedOrder.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>
                      {selectedOrder.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      #{selectedOrder.id.substring(0, 8).toUpperCase()} • {formatDate(selectedOrder.created_at)}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: isDarkMode
                      ? (STATUS[selectedOrder.status]?.bgDark ?? "#78350F")
                      : (STATUS[selectedOrder.status]?.bg ?? "#FEF3C7"),
                    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10,
                  }}>
                    <Text style={{
                      color: isDarkMode
                        ? (STATUS[selectedOrder.status]?.colorDark ?? "#FDE047")
                        : (STATUS[selectedOrder.status]?.color ?? "#92400E"),
                      fontWeight: "900", fontSize: 11,
                    }}>
                      {STATUS[selectedOrder.status]?.label ?? `⏳ ${selectedOrder.status}`}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={{
                  backgroundColor: colors.surface, borderRadius: 16, padding: 14,
                  borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 16,
                }}>
                  {Object.entries(selectedOrder.details).map(([key, value]) => (
                    value && value !== "-" ? (
                      <View key={key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted, minWidth: 90 }}>{key}</Text>
                        <Text style={{ fontSize: 13, color: colors.text, flex: 1, textAlign: "right", fontWeight: "600" }}>{value}</Text>
                      </View>
                    ) : null
                  ))}
                </View>

                {/* Total */}
                <View style={{
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  backgroundColor: colors.primarySoft, borderRadius: 14, padding: 14, marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>المبلغ</Text>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: colors.primary }}>{selectedOrder.total} جنيه</Text>
                </View>

                {/* Track button for active restaurant orders */}
                {selectedOrder.source === "order" && ACTIVE_STATUSES.includes(selectedOrder.status) && (
                  <Pressable
                    onPress={() => {
                      setSelectedOrder(null);
                      router.push(`/tracking/${selectedOrder.id}`);
                    }}
                    style={{
                      backgroundColor: colors.primary,
                      paddingVertical: 14, borderRadius: 14, alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>تتبع الطلب 🛵</Text>
                  </Pressable>
                )}

                {/* Close */}
                <Pressable
                  onPress={() => setSelectedOrder(null)}
                  style={{
                    borderWidth: 1.5, borderColor: colors.border,
                    paddingVertical: 13, borderRadius: 14, alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>إغلاق</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function getSourceLabel(source: OrderSource): string {
  switch (source) {
    case "order":    return "مطعم / متجر";
    case "service":  return "خدمة منزلية";
    case "delivery": return "توصيل طرد";
  }
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order, active, isDarkMode, colors, onPress,
}: {
  order: UnifiedOrder; active: boolean; isDarkMode: boolean; colors: any; onPress: () => void;
}) {
  const st      = STATUS[order.status] ?? STATUS.pending;
  const shortId = order.id.substring(0, 8).toUpperCase();
  const dateStr = formatDate(order.created_at);

  return (
    <Pressable
      onPress={onPress}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}>
            <Text style={{ fontSize: 20 }}>{order.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>
              {order.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              #{shortId}  •  {dateStr}
            </Text>
          </View>
        </View>
        <View style={{
          backgroundColor: isDarkMode ? st.bgDark : st.bg,
          paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10,
        }}>
          <Text style={{ color: isDarkMode ? st.colorDark : st.color, fontWeight: "900", fontSize: 11 }}>
            {st.label}
          </Text>
        </View>
      </View>

      {/* Subtitle */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "600" }}>
          {getSourceLabel(order.source)}
        </Text>
        <Text style={{ color: colors.border }}>•</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
          {order.subtitle}
        </Text>
      </View>

      {/* Footer */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 16 }}>
          {order.total} جنيه
        </Text>
        {active && order.source === "order" && (
          <View style={{
            backgroundColor: colors.primarySoft, paddingVertical: 7, paddingHorizontal: 14,
            borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6,
          }}>
            <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>تتبع الطلب</Text>
            <Text style={{ color: colors.primary, fontSize: 12 }}>←</Text>
          </View>
        )}
        {active && order.source !== "order" && (
          <View style={{
            backgroundColor: colors.primarySoft, paddingVertical: 7, paddingHorizontal: 14,
            borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6,
          }}>
            <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>عرض التفاصيل</Text>
            <Text style={{ color: colors.primary, fontSize: 12 }}>←</Text>
          </View>
        )}
        {!active && order.source === "order" && order.status === "delivered" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => {
                analyticsTracker.trackEvent(ANALYTICS_EVENTS.ORDER.RATE_CLICKED, { orderId: order.id });
                router.push(`/rate-order?orderId=${order.id}` as any);
              }}
              {...A11yPresets.button("قيّم الطلب", "انقر لتقييم هذا الطلب")}
              style={{
                backgroundColor: isDarkMode ? "#713F12" : "#FEF3C7", paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12,
              }}
            >
              <Text style={{ color: isDarkMode ? "#FDE047" : "#92400E", fontWeight: "700", fontSize: 13 }}>قيّم ⭐</Text>
            </Pressable>
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
          </View>
        )}
        {!active && order.source !== "order" && (
          <View style={{
            backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
            paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12,
          }}>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }}>عرض التفاصيل</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
