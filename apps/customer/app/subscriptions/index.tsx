import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { useSupabase } from "../../src/hooks/useSupabase";
import { analyticsTracker } from "../../src/utils/analyticsTracker";
import { A11yPresets } from "../../src/hooks/useAccessibility";
import { SafeAreaScrollView } from "../../src/components";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
} as const;

interface Subscription {
  id: string;
  name: string;
  plan_type: "monthly" | "yearly" | "lifetime";
  price: number;
  discount_percent: number;
  description: string;
  max_orders_per_month?: number;
}

export default function SubscriptionsScreen() {
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();

  useEffect(() => {
    analyticsTracker.trackScreenView("subscriptions_screen");
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // جلب الخطط المتاحة
      const { data: plansData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      // جلب اشتراك المستخدم الحالي
      const { data: userSub } = await supabase
        .from("user_subscriptions")
        .select("*, subscriptions(*)")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      setPlans(plansData || []);
      setCurrentSubscription(userSub);
    } catch (error) {
      console.error("Error loading plans:", error);
      Alert.alert("خطأ", "فشل في تحميل الخطط");
    } finally {
      setLoading(false);
    }
  };

  const subscribePlan = async (planId: string) => {
    if (!supabase) {
      Alert.alert("خطأ", "لم يتمكن من الاتصال بالخادم");
      return;
    }

    analyticsTracker.trackEvent("subscribe_plan", { planId });
    setSubscribing(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("خطأ", "يجب تسجيل الدخول أولاً");
        setSubscribing(null);
        return;
      }

      // إلغاء الاشتراك القديم
      if (currentSubscription) {
        await supabase
          .from("user_subscriptions")
          .update({ active: false })
          .eq("id", currentSubscription.id);
      }

      // إضافة اشتراك جديد
      const { error } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: user.id,
          subscription_id: planId,
          active: true,
          started_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert("نجح", "✅ تم تفعيل الخطة بنجاح");
      await loadPlans();
    } catch (error) {
      console.error("Error subscribing:", error);
      Alert.alert("خطأ", "فشل الاشتراك في الخطة");
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <SafeAreaScrollView variant="page">
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 18,
        paddingBottom: 14,
        backgroundColor: "#4C1D95",
      }}>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("subscriptions_back");
            router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
          }}
          {...A11yPresets.pressable}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Text style={{ fontSize: 20, color: "white" }}>←</Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "white" }}>خطط الاشتراك</Text>
        </Pressable>
      </View>

      <View contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 48 }}>⏳</Text>
            <Text style={{ color: C.textMuted, marginTop: 12 }}>جاري التحميل...</Text>
          </View>
        ) : plans.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={{ color: C.textMuted, marginTop: 12 }}>لا توجد خطط متاحة</Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View
              key={plan.id}
              style={{
                borderWidth: 2,
                borderColor: currentSubscription?.subscription_id === plan.id ? C.primary : "#E0E7FF",
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                backgroundColor: currentSubscription?.subscription_id === plan.id ? C.primarySoft : C.surface,
              }}
            >
              {/* Badge */}
              {currentSubscription?.subscription_id === plan.id && (
                <View style={{
                  alignSelf: "flex-start",
                  backgroundColor: C.primary,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 8,
                }}>
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>✓ الخطة الحالية</Text>
                </View>
              )}

              <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 4 }}>
                {plan.name}
              </Text>

              <Text style={{ color: C.textMuted, marginBottom: 12, fontSize: 13 }}>
                {plan.description}
              </Text>

              {/* Price */}
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: C.primary }}>
                  {plan.price.toFixed(2)}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 14 }}>
                  ج.م /{plan.plan_type === "monthly" ? "شهر" : plan.plan_type === "yearly" ? "سنة" : "مدى الحياة"}
                </Text>
              </View>

              {/* Discount Badge */}
              <View style={{
                backgroundColor: "#ECFDF5",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}>
                <Text style={{ color: C.success, fontWeight: "900", fontSize: 13 }}>
                  💰 خصم {plan.discount_percent}% على جميع الطلبات
                </Text>
              </View>

              {/* Benefits */}
              {plan.max_orders_per_month && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16 }}>📦</Text>
                  <Text style={{ color: C.text, fontWeight: "600" }}>
                    حد أقصى {plan.max_orders_per_month} طلب شهرياً
                  </Text>
                </View>
              )}

              {/* Subscribe Button */}
              <Pressable
                onPress={() => subscribePlan(plan.id)}
                disabled={currentSubscription?.subscription_id === plan.id || subscribing === plan.id}
                {...A11yPresets.pressable}
                style={{
                  backgroundColor: currentSubscription?.subscription_id === plan.id ? "#D1D5DB" : C.primary,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: subscribing === plan.id ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                  {subscribing === plan.id ? "جاري المعالجة..." : currentSubscription?.subscription_id === plan.id ? "✓ الخطة الحالية" : "اشترك الآن"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </SafeAreaScrollView>
  );
}
