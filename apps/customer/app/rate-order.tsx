import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  StatusBar, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", warning: "#F59E0B",
} as const;

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
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [partnerRating, setPartnerRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
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
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        backgroundColor: C.surface,
        borderBottomWidth: 1, borderColor: C.border,
      }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: C.text }}>⭐ قيّم طلبك</Text>
        <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>مساعدتك تساعد الآخرين على الاختيار الأفضل</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        {/* Partner Rating */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16, padding: 16,
          marginBottom: 16,
          borderWidth: 1, borderColor: C.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                {order?.partners?.name || "المتجر"}
              </Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>قيّم المتجر</Text>
            </View>
          </View>

          {/* Stars */}
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => setPartnerRating(star)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 36 }}>
                  {partnerRating >= star ? "⭐" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          {partnerRating > 0 && (
            <Text style={{ fontSize: 12, color: C.primary, marginTop: 10, fontWeight: "700", textAlign: "right" }}>
              تقييمك: {partnerRating} من 5 نجوم
            </Text>
          )}
        </View>

        {/* Driver Rating */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16, padding: 16,
          marginBottom: 16,
          borderWidth: 1, borderColor: C.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 28 }}>🛵</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                {order?.driver?.full_name || "المندوب"}
              </Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>قيّم المندوب</Text>
            </View>
          </View>

          {/* Stars */}
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => setDriverRating(star)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 36 }}>
                  {driverRating >= star ? "⭐" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          {driverRating > 0 && (
            <Text style={{ fontSize: 12, color: C.primary, marginTop: 10, fontWeight: "700", textAlign: "right" }}>
              تقييمك: {driverRating} من 5 نجوم
            </Text>
          )}
        </View>

        {/* Comment */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16, padding: 16,
          marginBottom: 16,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 10 }}>💬 أضف تعليق (اختياري)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="شارك تجربتك مع الآخرين..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            Style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12, borderWidth: 1, borderColor: C.border,
              paddingHorizontal: 12, paddingVertical: 12,
              fontSize: 14, color: C.text, textAlign: "right",
            }}
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12, borderWidth: 1, borderColor: C.border,
              paddingHorizontal: 12, paddingVertical: 12,
              fontSize: 14, color: C.text, textAlign: "right",
            }}
          />
          <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
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
      <View style={{ padding: 16, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.surface }}>
        <Pressable
          onPress={submitRating}
          disabled={submitting}
          style={{
            backgroundColor: C.primary,
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
