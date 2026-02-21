import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, ScrollView,
  StatusBar, Animated, Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { HALHA_THEME } from "@halha/ui";
import { getSupabase } from "@halha/core";

const C      = HALHA_THEME.colors;
const SCREEN = { height: 800 };
const QENA_DEFAULT = { latitude: 26.1551, longitude: 32.7160 };

const STEP_CONFIG = [
  { id: 0, label: "تم استلام الطلب",  desc: "المطعم استلم طلبك",          icon: "✅", color: "#7C3AED" },
  { id: 1, label: "قيد التجهيز",      desc: "الشيف يحضر طلبك الآن",       icon: "👨‍🍳", color: "#F59E0B" },
  { id: 2, label: "خرج للتوصيل",      desc: "المندوب في الطريق إليك",      icon: "🛵", color: "#2563EB" },
  { id: 3, label: "تم التسليم",        desc: "استمتع بطلبك 😊",            icon: "🎉", color: "#059669" },
];

// Supabase status → step index
function statusToStep(status: string): number {
  switch (status) {
    case "accepted":  return 0;
    case "preparing": return 1;
    case "ready":
    case "picked_up": return 2;
    case "delivered": return 3;
    default:          return 0;
  }
}

interface DriverCoord {
  latitude:  number;
  longitude: number;
  heading:   number | null;
}

interface OrderInfo {
  id:           string;
  status:       string;
  driverName:   string;
  driverPhone:  string;
  driverRating: string;
  totalEgp:     number;
  restaurantLat: number;
  restaurantLng: number;
  customerLat:   number;
  customerLng:   number;
}

export default function Tracking() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [orderInfo,   setOrderInfo]   = useState<OrderInfo | null>(null);
  const [step,        setStep]        = useState(0);
  const [driverCoord, setDriverCoord] = useState<DriverCoord | null>(null);
  const [eta,         setEta]         = useState(25);
  const [loading,     setLoading]     = useState(true);

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  // Pulse for active step
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [step]);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Pulse driver marker
  useEffect(() => {}, [driverCoord?.latitude, driverCoord?.longitude]);

  // Load order + subscribe to realtime
  useEffect(() => {
    if (!orderId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    async function loadOrder() {
      setLoading(true);
      const { data } = await supabase!
        .from("orders")
        .select(`
          id, status, total, delivery_fee,
          driver_lat, driver_lng, driver_heading,
          partners(name, address, lat, lng),
          profiles!orders_customer_id_fkey(full_name, phone),
          driver:profiles!orders_driver_id_fkey(full_name, phone)
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (data) {
        const currentStep = statusToStep(data.status);
        setStep(currentStep);
        setEta(Math.max(0, 25 - currentStep * 7));

        // Use partner lat/lng if available, else default to Qena area
        const restLat = data.partners?.lat ?? QENA_DEFAULT.latitude + 0.005;
        const restLng = data.partners?.lng ?? QENA_DEFAULT.longitude - 0.008;
        const custLat = QENA_DEFAULT.latitude - 0.004;
        const custLng = QENA_DEFAULT.longitude + 0.006;

        setOrderInfo({
          id:           data.id.substring(0, 8).toUpperCase(),
          status:       data.status,
          driverName:   (data as any).driver?.full_name ?? "أحمد المندوب",
          driverPhone:  (data as any).driver?.phone ?? "",
          driverRating: "4.9",
          totalEgp:     Number(data.total),
          restaurantLat: restLat,
          restaurantLng: restLng,
          customerLat:   custLat,
          customerLng:   custLng,
        });

        if (data.driver_lat && data.driver_lng) {
          setDriverCoord({
            latitude:  Number(data.driver_lat),
            longitude: Number(data.driver_lng),
            heading:   data.driver_heading ? Number(data.driver_heading) : null,
          });
        }
      }
      setLoading(false);
    }

    loadOrder();

    // Realtime subscription
    const channel = supabase
      .channel(`tracking-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const d = payload.new;

          // Update step / status
          const newStep = statusToStep(d.status);
          setStep(newStep);
          setEta(prev => Math.max(0, prev - 1));

          // Update driver marker
          if (d.driver_lat && d.driver_lng) {
            setDriverCoord({
              latitude:  Number(d.driver_lat),
              longitude: Number(d.driver_lng),
              heading:   d.driver_heading ? Number(d.driver_heading) : null,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const isDelivered   = step === 3;
  const stepCfg       = STEP_CONFIG[step];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F9FAFB", justifyContent: "center", alignItems: "center" }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🛵</Text>
        <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "700" }}>جاري تحميل بيانات الطلب…</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <StatusBar barStyle={step < 2 ? "dark-content" : "light-content"} translucent backgroundColor="transparent" />

      {/* ── MAP PLACEHOLDER (top 58%) ─────────────────────────────────── */}
      <View style={{
        height: SCREEN.height * 0.58,
        backgroundColor: "#E8E4F0",
        justifyContent: "center", alignItems: "center",
      }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "700" }}>
          تتبع المندوب على الخريطة
        </Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
          متاح قريباً
        </Text>

        {/* Back button overlay */}
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute", top: Platform.OS === "android" ? 28 : 54,
            right: 16,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "white",
            justifyContent: "center", alignItems: "center",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 16 }}>✕</Text>
        </Pressable>

        {/* Order ID pill */}
        <View style={{
          position: "absolute", top: Platform.OS === "android" ? 28 : 54,
          left: 16,
          backgroundColor: "white",
          paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#374151" }}>
            طلب #{orderInfo?.id ?? "…"}
          </Text>
        </View>
      </View>

      {/* ── BOTTOM PANEL (bottom 42%) ─────────────────────────────────── */}
      <View style={{
        flex: 1, backgroundColor: "#F9FAFB",
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        marginTop: -22,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
      }}>
        {/* Handle bar */}
        <View style={{
          width: 44, height: 5, borderRadius: 3,
          backgroundColor: "#E5E7EB",
          alignSelf: "center", marginTop: 10, marginBottom: 2,
        }} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36, gap: 12 }}
        >
          {/* STATUS BANNER */}
          <View style={{
            borderRadius: 22, overflow: "hidden",
            shadowColor: stepCfg.color, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
          }}>
            <View style={{
              backgroundColor: isDelivered ? "#059669" : stepCfg.color,
              paddingVertical: 18, paddingHorizontal: 20,
              flexDirection: "row", alignItems: "center", gap: 14,
              overflow: "hidden",
            }}>
              {/* Deco circle */}
              <View style={{
                position: "absolute", right: -30, top: -30,
                width: 110, height: 110, borderRadius: 55,
                backgroundColor: "rgba(255,255,255,0.1)",
              }} />

              {/* Icon bubble */}
              <Animated.View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center", alignItems: "center",
                transform: [{ scale: pulseAnim }],
              }}>
                <Text style={{ fontSize: 28 }}>{stepCfg.icon}</Text>
              </Animated.View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700" }}>
                  الحالة الحالية
                </Text>
                <Text style={{ color: "white", fontSize: 17, fontWeight: "900", marginTop: 2 }}>
                  {stepCfg.label}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
                  {stepCfg.desc}
                </Text>
              </View>

              {/* ETA */}
              {!isDelivered && (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}>
                    الوقت
                  </Text>
                  <Text style={{ color: "white", fontSize: 28, fontWeight: "900", lineHeight: 32 }}>
                    {eta}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700" }}>
                    دقيقة
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* PROGRESS DOTS */}
          <View style={{
            backgroundColor: "white", borderRadius: 20, padding: 18,
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {STEP_CONFIG.map((s, i) => {
                const isDone    = i < step;
                const isActive  = i === step;
                return (
                  <React.Fragment key={s.id}>
                    <View style={{ alignItems: "center", flex: i < STEP_CONFIG.length - 1 ? undefined : 1 }}>
                      <Animated.View style={{
                        width: isActive ? 46 : 38, height: isActive ? 46 : 38,
                        borderRadius: isActive ? 23 : 19,
                        backgroundColor: isDone ? s.color : isActive ? s.color : "#F3F4F6",
                        justifyContent: "center", alignItems: "center",
                        transform: [{ scale: isActive ? pulseAnim : 1 }],
                        shadowColor: isActive ? s.color : "transparent",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isActive ? 0.45 : 0, shadowRadius: 8, elevation: isActive ? 4 : 0,
                      }}>
                        {isDone
                          ? <Text style={{ color: "white", fontSize: 14, fontWeight: "900" }}>✓</Text>
                          : <Text style={{ fontSize: isActive ? 20 : 16 }}>{s.icon}</Text>
                        }
                      </Animated.View>
                      <Text style={{
                        marginTop: 6, fontSize: 10,
                        fontWeight: isActive ? "900" : "600",
                        color: isDone || isActive ? s.color : "#9CA3AF",
                        textAlign: "center", maxWidth: 60,
                      }}>
                        {s.label}
                      </Text>
                    </View>
                    {i < STEP_CONFIG.length - 1 && (
                      <View style={{
                        flex: 1, height: 3, borderRadius: 2, marginBottom: 18,
                        backgroundColor: isDone ? s.color : "#F3F4F6",
                        marginHorizontal: 4,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* DRIVER CARD (step >= 2) */}
          {step >= 2 && (
            <View style={{
              backgroundColor: "white", borderRadius: 20, padding: 16,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
            }}>
              <Text style={{ fontWeight: "900", color: "#111827", fontSize: 14, marginBottom: 14 }}>
                🛵 مندوبك
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: "#EDE9FE",
                  borderWidth: 2.5, borderColor: "#7C3AED",
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Text style={{ fontSize: 26 }}>🧑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: "#111827", fontSize: 16 }}>
                    {orderInfo?.driverName ?? "المندوب"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <Text style={{ color: "#F59E0B", fontWeight: "900", fontSize: 13 }}>★</Text>
                    <Text style={{ fontWeight: "700", color: "#374151", fontSize: 13 }}>
                      {orderInfo?.driverRating}
                    </Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>• 247+ توصيلة</Text>
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  <Pressable style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: "#D1FAE5",
                    justifyContent: "center", alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 20 }}>📞</Text>
                  </Pressable>
                  <Pressable style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: "#EDE9FE",
                    justifyContent: "center", alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 20 }}>💬</Text>
                  </Pressable>
                </View>
              </View>

              {/* Live GPS indicator */}
              {!!driverCoord && step === 2 && (
                <View style={{
                  marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8,
                  backgroundColor: "#F0FDF4", borderRadius: 12, padding: 10,
                  borderWidth: 1, borderColor: "#A7F3D0",
                }}>
                  <Animated.View style={{
                    width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981",
                    transform: [{ scale: pulseAnim }],
                  }} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#065F46" }}>
                    موقع المندوب يتحدث مباشرة على الخريطة
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* DELIVERED ACTIONS */}
          {isDelivered && (
            <View style={{ gap: 12 }}>
              <Pressable style={{
                backgroundColor: "#7C3AED", borderRadius: 18,
                paddingVertical: 16, alignItems: "center",
                shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
              }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                  ⭐ قيّم طلبك واكسب 2 نقطة
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace("/(tabs)/home")}
                style={{
                  paddingVertical: 14, borderRadius: 18,
                  borderWidth: 1.5, borderColor: "#E5E7EB",
                  backgroundColor: "white", alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "700", fontSize: 15 }}>
                  العودة للرئيسية 🏠
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
}
