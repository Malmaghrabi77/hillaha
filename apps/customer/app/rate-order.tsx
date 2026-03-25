import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  StatusBar, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useDarkMode } from "../hooks/useDarkMode";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

interface OrderInfo {
  id: string;
  partner_id: string;
  driver_id: string;
  total: number;
  partners: { name: string };
  driver: { full_name: string };
}

export default function RateOrder() {
  const { isDarkMode, colors } = useDarkMode();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [partnerRating, setPartnerRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    analyticsTracker.trackScreenView(`rate_order_${orderId}`);
    loadOrder();
  }, []);

  async function loadOrder() {
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }

    try {
      const { data } = await supabase
        .from("orders")
        .select(`
          id, total, partner_id, driver_id,
          partners!inner(name),
          driver:profiles!orders_driver_id_fkey(full_name)
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (data) setOrder(data as any);
    } catch (error) {
      console.log("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitRating() {
    if (partnerRating === 0 || driverRating === 0) {
      Alert.alert("خطأ", "الرجاء تقييم المتجر والمندوب");
      return;
    }

    setSubmitting(true);
    const supabase = getSB();
    if (!supabase) { setSubmitting(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      analyticsTracker.trackEvent('order_rating_submitted', {
        order_id: orderId,
        partner_rating: partnerRating,
        driver_rating: driverRating,
        has_comment: comment.length > 0,
        comment_length: comment.length,
      });

      // Save review
      await supabase.from("reviews").insert({
        order_id: orderId,
        user_id: user.id,
        partner_id: order?.partner_id,
        driver_id: order?.driver_id,
        partner_rating: partnerRating,
        driver_rating: driverRating,
        comment: comment,
      });

      // Update order as reviewed
      await supabase
        .from("orders")
        .update({ is_reviewed: true })
        .eq("id", orderId);

      Alert.alert("شكراً!", "تم حفظ تقييمك بنجاح", [
        { text: "حسناً", onPress: () => router.replace("/(tabs)/orders") },
      ]);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ التقييم");
      console.log("Error submitting rating:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderColor: colors.border,
      }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>⭐ قيّم طلبك</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>مساعدتك تساعد الآخرين على الاختيار الأفضل</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        {/* Partner Rating */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16, padding: 16,
          marginBottom: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                {order?.partners?.name || "المتجر"}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>قيّم المتجر</Text>
            </View>
          </View>

          {/* Stars */}
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => {
                  analyticsTracker.trackEvent('partner_rating_selected', {
                    rating: star,
                    order_id: orderId,
                  });
                  setPartnerRating(star);
                }}
                {...A11yPresets.button()}
                accessibilityLabel={`تقييم المتجر ${star} نجوم`}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 36 }}>
                  {partnerRating >= star ? "⭐" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          {partnerRating > 0 && (
            <Text style={{ fontSize: 12, color: colors.primary, marginTop: 10, fontWeight: "700", textAlign: "right" }}>
              تقييمك: {partnerRating} من 5 نجوم
            </Text>
          )}
        </View>

        {/* Driver Rating */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16, padding: 16,
          marginBottom: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 28 }}>🛵</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                {order?.driver?.full_name || "المندوب"}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>قيّم المندوب</Text>
            </View>
          </View>

          {/* Stars */}
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => {
                  analyticsTracker.trackEvent('driver_rating_selected', {
                    rating: star,
                    order_id: orderId,
                  });
                  setDriverRating(star);
                }}
                {...A11yPresets.button()}
                accessibilityLabel={`تقييم المندوب ${star} نجوم`}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 36 }}>
                  {driverRating >= star ? "⭐" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          {driverRating > 0 && (
            <Text style={{ fontSize: 12, color: colors.primary, marginTop: 10, fontWeight: "700", textAlign: "right" }}>
              تقييمك: {driverRating} من 5 نجوم
            </Text>
          )}
        </View>

        {/* Comment */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16, padding: 16,
          marginBottom: 16,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 10 }}>💬 أضف تعليق (اختياري)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="شارك تجربتك مع الآخرين..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12, borderWidth: 1, borderColor: colors.border,
              paddingHorizontal: 12, paddingVertical: 12,
              fontSize: 14, color: colors.text, textAlign: "right",
            }}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
            {comment.length}/500
          </Text>
        </View>

        {/* Info Box */}
        <View style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: "#A7F3D0",
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 12, color: "#065F46", fontWeight: "600", textAlign: "right" }}>
            💡 تقييمك يساعد على تحسين الخدمة وتقديم تجربة أفضل للجميع
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={{ padding: 16, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        <Pressable
          onPress={submitRating}
          disabled={submitting}
          {...A11yPresets.button()}
          accessibilityLabel="إرسال التقييم"
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 16, borderRadius: 16,
            alignItems: "center",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>إرسال التقييم</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
