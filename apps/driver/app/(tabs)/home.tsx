import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable,
  StatusBar, RefreshControl, Alert, Linking,
} from "react-native";
import * as Location from "expo-location";
import { C, getSB, haversineDistance, MAX_BICYCLE_DISTANCE_KM } from "../../lib/constants";

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
  partnerLat:        number | null;
  partnerLng:        number | null;
  deliveryLat:       number | null;
  deliveryLng:       number | null;
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
    partnerLat:        row.partners?.lat ?? null,
    partnerLng:        row.partners?.lng ?? null,
    deliveryLat:       row.delivery_lat ?? null,
    deliveryLng:       row.delivery_lng ?? null,
    paymentMethod:     ({ cash: "كاش", instapay: "إنستاباي", vodafone: "فودافون كاش", etisalat: "اتصالات كاش", wallet: "المحفظة", wallet_transfer: "تحويل محفظة", card: "بطاقة", we_pay: "وي باي", orange_money: "اورانج موني", meeza: "ميزة", fawry: "فوري", aman: "أمان", bee: "بي", khazna: "خزنة" } as Record<string, string>)[row.payment_method] ?? row.payment_method,
  };
}

export default function HomeTab() {
  const [orders, setOrders]         = useState<AvailableOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline]         = useState(true);
  const [driverId, setDriverId]     = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [maxDistance, setMaxDistance]  = useState<number | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const walletActive = walletBalance !== null && walletBalance > 0;

  // Driver location for proximity sorting
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setDriverLat(loc.coords.latitude);
        setDriverLng(loc.coords.longitude);
      }
    })();
  }, []);

  useEffect(() => {
    const supabase = getSB();
    if (!supabase) return;

    // جلب ID السائق الحالي + نوع المركبة
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setDriverId(data.user.id);
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("vehicle_type, max_delivery_distance_km, is_online")
          .eq("id", data.user.id)
          .single();
        if (profile) {
          setVehicleType(profile.vehicle_type);
          setMaxDistance(profile.max_delivery_distance_km ? Number(profile.max_delivery_distance_km) : null);
          if (typeof profile.is_online === "boolean") setOnline(profile.is_online);
        }

        // Get today's stats from delivered orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayOrders } = await (supabase as any)
          .from("orders")
          .select("delivery_fee")
          .eq("driver_id", data.user.id)
          .eq("status", "delivered")
          .gte("delivered_at", today.toISOString());

        setTodayDeliveries(todayOrders?.length || 0);
        setTodayEarnings(todayOrders?.reduce((sum: number, o: any) => sum + (o.delivery_fee || 0), 0) || 0);

        // Fetch driver wallet balance
        const { data: bal } = await (supabase as any).rpc("get_driver_wallet_balance", { p_driver_id: data.user.id });
        if (bal !== null && bal !== undefined) setWalletBalance(Number(bal));
      }
    });

    async function loadOrders() {
      const { data } = await supabase!
        .from("orders")
        .select("*, partners(name, address, lat, lng)")
        .eq("status", "ready")
        .eq("delivery_type", "platform")
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
        (payload) => {
          if (payload.new.delivery_type === "self") return;
          setOrders(prev => [mapOrder(payload.new), ...prev]);
        }
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

    // Credit limit check: wallet balance must cover the order total
    if (!walletActive) {
      Alert.alert(
        "المحفظة غير مفعّلة",
        "يجب شحن محفظتك أولاً لقبول الطلبات.\nتواصل عبر واتساب لطلب كود شحن.",
        [
          { text: "إلغاء", style: "cancel" },
          { text: "شحن المحفظة", onPress: () => Linking.openURL("https://wa.me/201153624184?text=" + encodeURIComponent("مرحباً، أريد شحن محفظتي كسائق في تطبيق حلّها")) },
        ]
      );
      return;
    }

    const order = orders.find(o => o._uuid === uuid);
    if (order && order.total > walletBalance!) {
      Alert.alert(
        "الحد الائتماني غير كافٍ",
        `رصيد محفظتك (${walletBalance!.toFixed(2)} ج) أقل من قيمة الطلب (${order.total} ج).\nاشحن محفظتك لزيادة الحد الائتماني.`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "شحن المحفظة", onPress: () => Linking.openURL("https://wa.me/201153624184?text=" + encodeURIComponent(`مرحباً، أريد شحن محفظتي بمبلغ ${Math.ceil(order.total - walletBalance!)} جنيه كسائق في تطبيق حلّها`)) },
        ]
      );
      return;
    }

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
        .select("*, partners(name, address, lat, lng)")
        .eq("status", "ready")
        .eq("delivery_type", "platform")
        .is("driver_id", null)
        .order("created_at", { ascending: false });
      if (data) setOrders(data.map(mapOrder));
    }
    setRefreshing(false);
  }

  // Compute distance from driver to partner
  const getOrderDistance = (o: AvailableOrder): number | null => {
    if (driverLat == null || driverLng == null || o.partnerLat == null || o.partnerLng == null) return null;
    return haversineDistance(driverLat, driverLng, o.partnerLat, o.partnerLng);
  };

  const available = ((vehicleType === "bicycle")
    ? orders.filter(o => {
        if (!o.partnerLat || !o.partnerLng || !o.deliveryLat || !o.deliveryLng) return true;
        return haversineDistance(o.partnerLat, o.partnerLng, o.deliveryLat, o.deliveryLng) <= (maxDistance || MAX_BICYCLE_DISTANCE_KM);
      })
    : orders
  ).sort((a, b) => {
    const dA = getOrderDistance(a);
    const dB = getOrderDistance(b);
    if (dA != null && dB != null) return dA - dB;
    if (dA != null) return -1;
    if (dB != null) return 1;
    return 0;
  });

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
            onPress={async () => {
              const newStatus = !online;
              setOnline(newStatus);
              const sb = getSB();
              if (sb && driverId) {
                await (sb as any).from("profiles").update({ is_online: newStatus }).eq("id", driverId);
              }
            }}
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

      {/* Bicycle distance banner */}
      {vehicleType === "bicycle" && (
        <View style={{ marginHorizontal: 20, marginTop: 12, backgroundColor: "#FEF3C7", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#F59E0B", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 20 }}>🚲</Text>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#92400E" }}>حساب دراجة — الحد الأقصى {maxDistance || 2} كم لكل اتجاه</Text>
        </View>
      )}

      {/* WALLET ACTIVATION REQUIRED */}
      {!walletActive && walletBalance !== null && (
        <View style={{
          marginHorizontal: 16, marginTop: 12, backgroundColor: "#FEF2F2",
          borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: "#EF4444",
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 24 }}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#991B1B" }}>
                يجب تفعيل المحفظة
              </Text>
              <Text style={{ fontSize: 12, color: "#7F1D1D", marginTop: 2 }}>
                اشحن محفظتك لتتمكن من قبول الطلبات. حدك الائتماني = رصيد محفظتك.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => Linking.openURL("https://wa.me/201153624184?text=" + encodeURIComponent("مرحباً، أريد شحن محفظتي كسائق في تطبيق حلّها"))}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              paddingVertical: 12, borderRadius: 12, backgroundColor: "#25D366",
            }}
          >
            <Text style={{ fontSize: 18 }}>💬</Text>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>اطلب كود شحن عبر واتساب</Text>
          </Pressable>
        </View>
      )}

      {/* WALLET BALANCE / CREDIT LIMIT */}
      {walletActive && (
        <View style={{
          marginHorizontal: 16, marginTop: 12, backgroundColor: "#D1FAE5",
          borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#34D399",
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18 }}>💳</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#065F46" }}>الحد الائتماني</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#059669" }}>{walletBalance!.toFixed(2)} ج</Text>
        </View>
      )}

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

              {/* Distance badge */}
              {(() => { const d = getOrderDistance(order); return d != null ? (
                <View style={{
                  backgroundColor: C.primarySoft, borderRadius: 10, padding: 10,
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 14,
                }}>
                  <Text style={{ fontSize: 13, color: C.primary, fontWeight: "700" }}>📍 المسافة من موقعك</Text>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.primary }}>
                    {d < 1 ? `${Math.round(d * 1000)} م` : `${d.toFixed(1)} كم`}
                  </Text>
                </View>
              ) : null; })()}

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
