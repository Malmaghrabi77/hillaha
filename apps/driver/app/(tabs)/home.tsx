import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable,
  StatusBar, RefreshControl,
} from "react-native";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

interface AvailableOrder {
  _uuid:             string;
  id:                string;    // short display ID
  restaurant:        string;
  restaurantAddress: string;
  customerAddress:   string;
  items:             number;
  total:             number;
  deliveryFee:       number;
  paymentMethod:     string;
}

function mapOrder(row: any): AvailableOrder {
  return {
    _uuid:             row.id,
    id:                row.id.substring(0, 8).toUpperCase(),
    restaurant:        row.partners?.name ?? "المتجر",
    restaurantAddress: row.partners?.address ?? "",
    customerAddress:   row.delivery_address,
    items:             Array.isArray(row.items) ? row.items.length : 0,
    total:             Number(row.total),
    deliveryFee:       Number(row.delivery_fee),
    paymentMethod:     row.payment_method === "cash"      ? "كاش"
                     : row.payment_method === "instapay"  ? "إنستاباي"
                     : row.payment_method === "vodafone"  ? "فودافون كاش"
                     : row.payment_method,
  };
}

export default function HomeTab() {
  const [orders, setOrders]         = useState<AvailableOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline]         = useState(true);
  const [driverId, setDriverId]     = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSB();
    if (!supabase) return;

    // جلب ID السائق الحالي
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setDriverId(data.user.id);
    });

    async function loadOrders() {
      const { data } = await supabase!
        .from("orders")
        .select("*, partners(name, address)")
        .eq("status", "ready")
        .is("driver_id", null)
        .order("created_at", { ascending: false });
      if (data) setOrders(data.map(mapOrder));
    }
    loadOrders();

    // real-time: طلب جديد جاهز
    const channel = supabase
      .channel("driver-ready-orders")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: "status=eq.ready" },
        (payload) => { setOrders(prev => [mapOrder(payload.new), ...prev]); }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          // إذا أخذ سائق آخر الطلب → أزله من القائمة
          if (payload.new.driver_id && payload.new.driver_id !== driverId) {
            setOrders(prev => prev.filter(o => o._uuid !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  async function acceptOrder(uuid: string) {
    const supabase = getSB();
    if (!supabase || !driverId) return;
    await supabase.from("orders").update({
      driver_id:    driverId,
      status:       "picked_up",
      picked_up_at: new Date().toISOString(),
    }).eq("id", uuid);
    setOrders(prev => prev.filter(o => o._uuid !== uuid));
  }

  function rejectOrder(uuid: string) {
    setOrders(prev => prev.filter(o => o._uuid !== uuid));
  }

  async function onRefresh() {
    setRefreshing(true);
    const supabase = getSB();
    if (supabase) {
      const { data } = await supabase
        .from("orders")
        .select("*, partners(name, address)")
        .eq("status", "ready")
        .is("driver_id", null)
        .order("created_at", { ascending: false });
      if (data) setOrders(data.map(mapOrder));
    }
    setRefreshing(false);
  }

  const available = orders;
  const todayEarnings = 185;
  const todayDeliveries = 8;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.surface, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "900", color: C.text }}>مرحباً يا سائق! 👋</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
              {available.length} طلب{available.length !== 1 ? " متاح" : " متاح"} الآن
            </Text>
          </View>

          {/* ONLINE TOGGLE */}
          <Pressable
            onPress={() => setOnline(v => !v)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: online ? "#D1FAE5" : "#FEF2F2",
              borderWidth: 1.5,
              borderColor: online ? "#34D399" : "#FECACA",
            }}
          >
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: online ? "#059669" : C.danger,
            }} />
            <Text style={{
              fontSize: 13, fontWeight: "900",
              color: online ? "#059669" : C.danger,
            }}>
              {online ? "متاح" : "غير متاح"}
            </Text>
          </Pressable>
        </View>

        {/* TODAY STATS */}
        <View style={{
          flexDirection: "row", gap: 12, marginTop: 14,
        }}>
          {[
            { label: "أرباح اليوم",    value: `${todayEarnings} ج`,  bg: "#D1FAE5", color: "#059669" },
            { label: "توصيلات اليوم",  value: `${todayDeliveries}`,   bg: C.primarySoft, color: C.primary },
          ].map((s, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: s.bg, borderRadius: 12,
              padding: 12, alignItems: "center",
            }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ORDERS LIST */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {!online && (
          <View style={{
            backgroundColor: "#FEF2F2", borderRadius: 16, padding: 20,
            alignItems: "center", borderWidth: 1, borderColor: "#FECACA",
          }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>😴</Text>
            <Text style={{ fontSize: 15, fontWeight: "900", color: C.danger }}>أنت غير متاح حالياً</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: "center" }}>
              فعّل الحالة لاستقبال طلبات جديدة
            </Text>
          </View>
        )}

        {online && available.length === 0 && (
          <View style={{
            backgroundColor: C.surface, borderRadius: 16, padding: 32,
            alignItems: "center", borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>⏳</Text>
            <Text style={{ fontSize: 15, fontWeight: "900", color: C.text }}>في انتظار الطلبات</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>سيصلك إشعار عند وجود طلب قريب</Text>
          </View>
        )}

        {online && available.map(order => (
          <View key={order.id} style={{
            backgroundColor: C.surface, borderRadius: 18,
            borderWidth: 1, borderColor: C.border,
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
            overflow: "hidden",
          }}>
            {/* Order header */}
            <View style={{
              backgroundColor: C.primarySoft, padding: 14,
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: C.primary }}>{order.id}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{
                  backgroundColor: C.primary, borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11, color: "white", fontWeight: "700" }}>
                    📦 {order.items} بنود
                  </Text>
                </View>
                <View style={{
                  backgroundColor: "white", borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11, color: C.primary, fontWeight: "700" }}>
                    💳 {order.paymentMethod}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ padding: 16 }}>
              {/* Route */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginTop: 1 }}>🏪</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>{order.restaurant}</Text>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{order.restaurantAddress}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Text style={{ fontSize: 16, marginTop: 1 }}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>عنوان العميل</Text>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{order.customerAddress}</Text>
                  </View>
                </View>
              </View>

              {/* Info row */}
              <View style={{
                flexDirection: "row", backgroundColor: C.bg,
                borderRadius: 10, padding: 10, gap: 8, marginBottom: 14,
              }}>
                {[
                  { icon: "📦", label: `${order.items} بنود` },
                  { icon: "💳", label: order.paymentMethod },
                  { icon: "💵", label: `${order.total} ج` },
                ].map((item, i) => (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: "700" }}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Delivery fee highlight */}
              <View style={{
                backgroundColor: "#D1FAE5", borderRadius: 10, padding: 10,
                flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                marginBottom: 14,
              }}>
                <Text style={{ fontSize: 13, color: "#059669", fontWeight: "700" }}>💰 عمولتك على هذا الطلب</Text>
                <Text style={{ fontSize: 17, fontWeight: "900", color: "#059669" }}>{order.deliveryFee} ج</Text>
              </View>

              {/* ACTION BUTTONS */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => acceptOrder(order._uuid)}
                  style={{
                    flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: "center",
                    backgroundColor: C.primary,
                    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>قبول الطلب ✓</Text>
                </Pressable>
                <Pressable
                  onPress={() => rejectOrder(order._uuid)}
                  style={{
                    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center",
                    borderWidth: 1.5, borderColor: "#FECACA", backgroundColor: "#FEF2F2",
                  }}
                >
                  <Text style={{ color: C.danger, fontWeight: "900", fontSize: 14 }}>رفض</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
