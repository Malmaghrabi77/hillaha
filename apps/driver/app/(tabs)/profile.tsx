import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable,
  StatusBar, ActivityIndicator, Image,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { C, getSB } from "../../lib/constants";

const VEHICLE_LABELS: Record<string, string> = { car: "سيارة", scooter: "سكوتر / فيسبا", bicycle: "دراجة هوائية" };
const VEHICLE_ICONS: Record<string, string> = { car: "🚗", scooter: "🛵", bicycle: "🚲" };

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  vehicleType: string | null;
  isApproved: boolean;
  rating: number;
  completedOrders: number;
  totalEarnings: number;
  maxDistance: number | null;
  avatarUrl: string | null;
}

export default function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setLoading(false); return; }

    const userId = userData.user.id;
    const meta = userData.user.user_metadata as any;

    const { data: profileData } = await (supabase as any)
      .from("profiles")
      .select("full_name, phone, vehicle_type, is_approved, rating, completed_orders, total_earnings, max_delivery_distance_km, avatar_url")
      .eq("id", userId)
      .single();

    // Fetch real stats from orders table
    const { data: ordersData } = await (supabase as any)
      .from("orders")
      .select("delivery_fee")
      .eq("driver_id", userId)
      .eq("status", "delivered");

    const deliveredCount = ordersData?.length ?? 0;
    const realEarnings = (ordersData ?? []).reduce(
      (sum: number, o: any) => sum + (Number(o.delivery_fee) || 0), 0
    );

    setProfile({
      name: profileData?.full_name || meta?.full_name || userData.user.email?.split("@")[0] || "المندوب",
      email: userData.user.email || "",
      phone: profileData?.phone || meta?.phone || "",
      vehicleType: profileData?.vehicle_type || null,
      isApproved: profileData?.is_approved ?? true,
      rating: profileData?.rating ? Number(profileData.rating) : 0,
      completedOrders: deliveredCount,
      totalEarnings: realEarnings,
      maxDistance: profileData?.max_delivery_distance_km ? Number(profileData.max_delivery_distance_km) : null,
      avatarUrl: profileData?.avatar_url || null,
    });
    setLoading(false);
  }

  async function handleLogout() {
    try {
      await SecureStore.deleteItemAsync("hillaha_driver_email");
      await SecureStore.deleteItemAsync("hillaha_driver_refresh_token");
    } catch {}
    const supabase = getSB();
    if (supabase) await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const vehicleIcon = profile.vehicleType ? (VEHICLE_ICONS[profile.vehicleType] || "🛵") : "🛵";
  const vehicleLabel = profile.vehicleType ? (VEHICLE_LABELS[profile.vehicleType] || profile.vehicleType) : "";

  const STATS = [
    { label: "التقييم", value: profile.rating > 0 ? `${profile.rating.toFixed(1)} ⭐` : "—", color: C.warning, bg: "#FEF3C7" },
    { label: "إجمالي توصيلات", value: `${profile.completedOrders}`, color: C.primary, bg: C.primarySoft },
    { label: "إجمالي الأرباح", value: `${profile.totalEarnings.toFixed(0)} ج`, color: "#059669", bg: "#D1FAE5" },
  ];

  const MENU_ITEMS: { icon: string; label: string; onPress?: () => void }[] = [
    { icon: "👛", label: "المحفظة", onPress: () => router.push("/(tabs)/wallet") },
    { icon: "📋", label: "سجل التوصيلات", onPress: () => router.push("/(tabs)/earnings") },
    { icon: "💳", label: "بيانات الحساب البنكي", onPress: () => router.push("/bank-details") },
    { icon: "📞", label: "الدعم الفني", onPress: () => router.push("/support") },
    { icon: "📄", label: "الشروط والأحكام", onPress: () => router.push("/terms") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.primary, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 28,
        alignItems: "center",
      }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: "rgba(255,255,255,0.2)",
          justifyContent: "center", alignItems: "center", marginBottom: 12,
          borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
          overflow: "hidden",
        }}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <Text style={{ fontSize: 36 }}>{vehicleIcon}</Text>
          )}
        </View>
        <Text style={{ fontSize: 18, fontWeight: "900", color: "white" }}>{profile.name}</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{profile.email}</Text>

        {/* Vehicle type + approval badge */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {vehicleLabel ? (
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, color: "white", fontWeight: "700" }}>{vehicleIcon} {vehicleLabel}</Text>
            </View>
          ) : null}
          <View style={{ backgroundColor: profile.isApproved ? "rgba(52,211,153,0.3)" : "rgba(245,158,11,0.3)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 }}>
            <Text style={{ fontSize: 12, color: "white", fontWeight: "700" }}>
              {profile.isApproved ? "مندوب معتمد ✓" : "قيد المراجعة ⏳"}
            </Text>
          </View>
        </View>

        {/* Bicycle distance limit */}
        {profile.maxDistance && (
          <View style={{ marginTop: 8, backgroundColor: "rgba(245,158,11,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: "white", fontWeight: "700" }}>الحد الأقصى: {profile.maxDistance} كم لكل اتجاه</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* STATS */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {STATS.map((s, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: s.bg, borderRadius: 14, padding: 12, alignItems: "center",
            }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2, textAlign: "center" }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* STATUS CARD */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: C.border,
          flexDirection: "row", alignItems: "center", gap: 14,
        }}>
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: profile.isApproved ? "#D1FAE5" : "#FEF3C7",
            justifyContent: "center", alignItems: "center",
          }}>
            <Text style={{ fontSize: 22 }}>{profile.isApproved ? "✅" : "⏳"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>
              {profile.isApproved ? "حسابك نشط" : "حسابك قيد المراجعة"}
            </Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {profile.isApproved
                ? "مؤهل لاستقبال الطلبات"
                : "سيتم إخطارك فور الموافقة على حسابك"}
            </Text>
          </View>
        </View>

        {/* MENU */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 18,
          borderWidth: 1, borderColor: C.border, overflow: "hidden",
        }}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={i}
              onPress={item.onPress}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                padding: 16,
                borderBottomWidth: i < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: C.primarySoft,
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.text }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* LOGOUT */}
        <Pressable
          onPress={handleLogout}
          style={{
            paddingVertical: 14, borderRadius: 16, alignItems: "center",
            backgroundColor: "#FEF2F2",
            borderWidth: 1.5, borderColor: "#FECACA",
          }}
        >
          <Text style={{ color: C.danger, fontWeight: "900", fontSize: 15 }}>
            تسجيل الخروج
          </Text>
        </Pressable>

        <View style={{ height: 10 }} />
      </ScrollView>
    </View>
  );
}
