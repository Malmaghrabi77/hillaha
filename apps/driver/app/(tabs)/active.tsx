import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, ScrollView,
  StatusBar, Animated, Platform,
} from "react-native";
import * as Location from "expo-location";
import { HALHA_THEME } from "@halha/ui";
import { getSupabase } from "@halha/core";

const C = HALHA_THEME.colors;

type DeliveryStep = 0 | 1 | 2 | 3;
type LocationStatus = "idle" | "tracking" | "denied" | "stopped";

const STEPS = [
  { icon: "✅", label: "تأكيد الاستلام من المطعم" },
  { icon: "🛵", label: "في الطريق للعميل" },
  { icon: "📍", label: "وصلت لعنوان العميل" },
  { icon: "🎉", label: "تم التسليم بنجاح" },
];

interface ActiveOrder {
  _uuid:             string;
  id:                string;
  restaurant:        string;
  restaurantAddress: string;
  customerName:      string;
  customerPhone:     string;
  customerAddress:   string;
  items:             string[];
  total:             number;
  deliveryFee:       number;
  paymentMethod:     string;
}

function mapActive(row: any): ActiveOrder {
  const items = Array.isArray(row.items)
    ? row.items.map((i: any) => `${i.name} × ${i.qty}`)
    : [];
  return {
    _uuid:             row.id,
    id:                row.id.substring(0, 8).toUpperCase(),
    restaurant:        row.partners?.name ?? "المتجر",
    restaurantAddress: row.partners?.address ?? "",
    customerName:      row.profiles?.full_name ?? "العميل",
    customerPhone:     row.customer_phone ?? "",
    customerAddress:   row.delivery_address,
    items,
    total:             Number(row.total),
    deliveryFee:       Number(row.delivery_fee),
    paymentMethod:     row.payment_method === "cash" ? "كاش"
                     : row.payment_method === "instapay" ? "إنستاباي"
                     : row.payment_method === "vodafone" ? "فودافون كاش"
                     : row.payment_method,
  };
}

export default function ActiveTab() {
  const [order, setOrder]               = useState<ActiveOrder | null>(null);
  const [step, setStep]                 = useState<DeliveryStep>(0);
  const [done, setDone]                 = useState(false);
  const [locationStatus, setLocStatus]  = useState<LocationStatus>("idle");

  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const gpsPulse    = useRef(new Animated.Value(1)).current;
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const orderUuid   = useRef<string | null>(null);

  // Pulse animation for status
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // GPS dot pulse (when tracking)
  useEffect(() => {
    if (locationStatus !== "tracking") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(gpsPulse, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(gpsPulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [locationStatus]);

  // Load active order from Supabase
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    async function load() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;
      const { data } = await supabase!
        .from("orders")
        .select("*, partners(name, address), profiles(full_name, phone)")
        .eq("driver_id", user.id)
        .eq("status", "picked_up")
        .maybeSingle();
      if (data) {
        setOrder(mapActive(data));
        orderUuid.current = data.id;
      }
    }
    load();

    const channel = supabase
      .channel("driver-active-order")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          if (payload.new.status === "picked_up") {
            setOrder(mapActive(payload.new));
            orderUuid.current = payload.new.id;
          }
          if (payload.new.status === "delivered") {
            setOrder(null);
            setDone(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopLocationTracking();
    };
  }, []);

  // ── GPS helpers ──────────────────────────────────────────────────────

  async function startLocationTracking() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocStatus("denied");
        return;
      }

      // Request background permission on Android for foreground service
      if (Platform.OS === "android") {
        await Location.requestBackgroundPermissionsAsync().catch(() => null);
      }

      setLocStatus("tracking");

      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.High,
          timeInterval:     4000,   // every 4 seconds
          distanceInterval: 10,     // or every 10 meters
        },
        async (loc) => {
          const supabase = getSupabase();
          if (!supabase || !orderUuid.current) return;
          await supabase.from("orders").update({
            driver_lat:     loc.coords.latitude,
            driver_lng:     loc.coords.longitude,
            driver_heading: loc.coords.heading ?? null,
          }).eq("id", orderUuid.current);
        }
      );
    } catch {
      setLocStatus("idle");
    }
  }

  async function stopLocationTracking(clearDb = false) {
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
    setLocStatus("stopped");

    if (clearDb && orderUuid.current) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("orders").update({
          driver_lat:     null,
          driver_lng:     null,
          driver_heading: null,
        }).eq("id", orderUuid.current);
      }
    }
  }

  // ── Step advance ─────────────────────────────────────────────────────

  async function advance() {
    if (step === 0) {
      // تأكيد الاستلام → ابدأ التتبع
      setStep(1);
      await startLocationTracking();
    } else if (step === 1) {
      // وصل للعميل → وقف التتبع
      setStep(2);
      await stopLocationTracking(false);
    } else if (step === 2) {
      setStep(3);
    } else {
      // التسليم النهائي
      const supabase = getSupabase();
      if (supabase && orderUuid.current) {
        await supabase.from("orders").update({
          status:       "delivered",
          delivered_at: new Date().toISOString(),
          driver_lat:   null,
          driver_lng:   null,
          driver_heading: null,
        }).eq("id", orderUuid.current);
      }
      setDone(true);
      setOrder(null);
      setStep(0);
      orderUuid.current = null;
    }
  }

  const ACTION_LABELS: Record<DeliveryStep, string> = {
    0: "✅ تأكيد الاستلام وبدء التتبع",
    1: "📍 وصلت للعميل",
    2: "سلّمت الطلب — المرحلة التالية",
    3: "🎉 تأكيد التسليم النهائي",
  };

  // ── Delivered screen ─────────────────────────────────────────────────

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{
          width: 110, height: 110, borderRadius: 55,
          backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center",
          marginBottom: 20,
          shadowColor: "#059669", shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
        }}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: "900", color: C.text, marginBottom: 8 }}>تم التسليم!</Text>
        <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center", marginBottom: 8 }}>
          أحسنت! نقاطك والأرباح تضاف لحسابك
        </Text>
        <Text style={{ fontSize: 36, fontWeight: "900", color: "#059669", marginBottom: 32 }}>
          +20 ج 💰
        </Text>
        <Pressable
          onPress={() => setDone(false)}
          style={{
            paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16,
            backgroundColor: C.primary,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 14, elevation: 7,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>العودة للطلبات</Text>
        </Pressable>
      </View>
    );
  }

  // ── No active order ───────────────────────────────────────────────────

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🛵</Text>
        <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 8 }}>
          لا يوجد توصيل نشط
        </Text>
        <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>
          اقبل طلباً من تبويب "الطلبات" ليظهر هنا
        </Text>
      </View>
    );
  }

  // ── Active order ─────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.primary,
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 20, paddingBottom: 20,
      }}>
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 4 }}>توصيل نشط</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "white" }}>#{order.id}</Text>

          {/* GPS Status Badge */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: "rgba(255,255,255,0.18)",
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
          }}>
            {locationStatus === "tracking" ? (
              <>
                <Animated.View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: "#34D399",
                  transform: [{ scale: gpsPulse }],
                }} />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>GPS نشط</Text>
              </>
            ) : locationStatus === "denied" ? (
              <>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" }} />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>GPS محظور</Text>
              </>
            ) : locationStatus === "stopped" ? (
              <>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B" }} />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>GPS موقف</Text>
              </>
            ) : (
              <>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)" }} />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 12 }}>🛵 في الطريق</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* GPS DENIED WARNING */}
        {locationStatus === "denied" && (
          <View style={{
            backgroundColor: "#FEF3C7", borderRadius: 14, padding: 14,
            flexDirection: "row", alignItems: "center", gap: 10,
            borderWidth: 1, borderColor: "#FCD34D",
          }}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: "#92400E", fontSize: 13 }}>
                صلاحية الموقع مرفوضة
              </Text>
              <Text style={{ color: "#B45309", fontSize: 12, marginTop: 2 }}>
                العميل لن يرى موقعك على الخريطة. فعّل الموقع من الإعدادات.
              </Text>
            </View>
          </View>
        )}

        {/* PROGRESS STEPS */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 18,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: C.textMuted, marginBottom: 14 }}>
            مراحل التوصيل
          </Text>
          {STEPS.map((s, i) => {
            const isDone    = i < step;
            const isCurrent = i === step;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: i < STEPS.length - 1 ? 16 : 0 }}>
                <View style={{ alignItems: "center", marginLeft: 12 }}>
                  <Animated.View style={{
                    width: 34, height: 34, borderRadius: 17,
                    justifyContent: "center", alignItems: "center",
                    backgroundColor: isDone ? "#D1FAE5" : isCurrent ? C.primarySoft : C.bg,
                    borderWidth: 2,
                    borderColor: isDone ? "#059669" : isCurrent ? C.primary : C.border,
                    transform: [{ scale: isCurrent ? pulseAnim : 1 }],
                  }}>
                    <Text style={{ fontSize: 14 }}>{isDone ? "✓" : s.icon}</Text>
                  </Animated.View>
                  {i < STEPS.length - 1 && (
                    <View style={{
                      width: 2, height: 26, marginTop: 4,
                      backgroundColor: isDone ? "#059669" : C.border,
                    }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingTop: 7 }}>
                  <Text style={{
                    fontSize: 13, fontWeight: isCurrent ? "900" : "700",
                    color: isDone ? "#059669" : isCurrent ? C.primary : C.textMuted,
                  }}>
                    {s.label}
                  </Text>
                  {/* GPS note on step 1 */}
                  {isCurrent && i === 1 && (
                    <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                      {locationStatus === "tracking"
                        ? "📡 موقعك يُرسل للعميل كل 4 ثوانٍ"
                        : "سيبدأ إرسال موقعك تلقائياً"}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* RESTAURANT CARD */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 10 }}>
            🏪 المطعم — نقطة الاستلام
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "900", color: C.text }}>{order.restaurant}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>{order.restaurantAddress}</Text>
        </View>

        {/* CUSTOMER CARD */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 10 }}>
            👤 العميل — نقطة التسليم
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "900", color: C.text }}>{order.customerName}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>{order.customerAddress}</Text>
          {order.customerPhone ? (
            <Pressable style={{
              marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: 8, paddingVertical: 11, borderRadius: 12,
              backgroundColor: "#D1FAE5", borderWidth: 1, borderColor: "#34D399",
            }}>
              <Text style={{ fontSize: 16 }}>📞</Text>
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#059669" }}>
                اتصال — {order.customerPhone}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* ORDER SUMMARY */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 10 }}>
            📦 تفاصيل الطلب
          </Text>
          {order.items.map((item, i) => (
            <Text key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>• {item}</Text>
          ))}
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border,
          }}>
            <Text style={{ fontSize: 13, color: C.textMuted }}>💳 {order.paymentMethod}</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>{order.total} ج</Text>
          </View>
          <View style={{
            backgroundColor: "#D1FAE5", borderRadius: 10, padding: 10, marginTop: 10,
            flexDirection: "row", justifyContent: "space-between",
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#059669" }}>عمولتك</Text>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#059669" }}>{order.deliveryFee} ج</Text>
          </View>
        </View>

        {/* ACTION BUTTON */}
        <Pressable
          onPress={advance}
          style={{
            paddingVertical: 17, borderRadius: 16, alignItems: "center",
            backgroundColor: step === 3 ? "#059669" : C.primary,
            shadowColor: step === 3 ? "#059669" : C.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
            {ACTION_LABELS[step]}
          </Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}
