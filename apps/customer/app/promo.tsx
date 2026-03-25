import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, TextInput,
  Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSupabase } from "../hooks/useSupabase";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";
import { AppHeader, SafeAreaScrollView } from '../components';

interface Coupon {
  id: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_order: number;
  max_discount: number;
  expires_at: string;
  description: string;
  is_active: boolean;
}

interface UserCoupon {
  id: string;
  coupon_id: string;
  used_count: number;
  coupons: Coupon;
}

export default function PromoCode() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.PROMO);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchCoupons();
    }, [])
  );

  async function fetchCoupons() {
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_coupons")
        .select(`
          id, coupon_id, used_count,
          coupons(id, code, discount_type, discount_value, min_order, max_discount, expires_at, description, is_active)
        `)
        .eq("user_id", user.id)
        .eq("coupons.is_active", true);

      if (data) setCoupons(data as any);
    } catch (error) {
      console.log("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) {
      Alert.alert("خطأ", "الرجاء إدخال كود الخصم");
      return;
    }

    setApplying(true);
    const supabase = getSB();
    if (!supabase) { setApplying(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get coupon
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!couponData) {
        analyticsTracker.trackEvent(ANALYTICS_EVENTS.PROMO.CODE_INVALID, {
          coupon_code: couponCode.toUpperCase(),
          reason: 'invalid_or_expired',
        });
        Alert.alert("خطأ", "كود الخصم غير صحيح أو منتهي الصلاحية");
        setApplying(false);
        return;
      }

      // Check if already applied
      const { data: existingCoupon } = await supabase
        .from("user_coupons")
        .select("id")
        .eq("user_id", user.id)
        .eq("coupon_id", couponData.id)
        .maybeSingle();

      if (existingCoupon) {
        analyticsTracker.trackEvent(ANALYTICS_EVENTS.PROMO.CODE_APPLIED, {
          coupon_code: couponCode.toUpperCase(),
        });
        Alert.alert("تنبيه", "لديك هذا الكود بالفعل!");
        setApplying(false);
        return;
      }

      // Add coupon to user
      await supabase.from("user_coupons").insert({
        user_id: user.id,
        coupon_id: couponData.id,
      });

      analyticsTracker.trackEvent(ANALYTICS_EVENTS.PROMO.CODE_APPLIED, {
        coupon_code: couponCode.toUpperCase(),
        coupon_id: couponData.id,
        discount_value: couponData.discount_value,
        discount_type: couponData.discount_type,
      });

      Alert.alert("نجاح!", "تم إضافة كود الخصم بنجاح");
      setCouponCode("");
      fetchCoupons();
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء إضافة الكود");
      console.log("Error applying coupon:", error);
    } finally {
      setApplying(false);
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
      <SafeAreaScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <AppHeader
          title="الرموز الترويجية"
          icon="🎁"
          trackingScreen="promo"
          showBackButton={false}
        />

        <View style={{ padding: 16 }}>
          {/* Apply Coupon Card */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16, padding: 16,
            marginBottom: 20,
            borderWidth: 1, borderColor: colors.primary,
          }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12 }}>
              هل لديك كود خصم؟
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="أدخل الكود هنا"
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  backgroundColor: colors.lightBg2,
                  borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: 12, paddingVertical: 12,
                  fontSize: 14, color: colors.text, textAlign: "right",
                }}
              />
              <Pressable
                onPress={applyCoupon}
                disabled={applying}
                {...A11yPresets.button()}
                accessibilityLabel="إضافة كود الخصم"
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16, borderRadius: 12,
                  justifyContent: "center", alignItems: "center",
                  opacity: applying ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>إضافة</Text>
              </Pressable>
            </View>
          </View>

          {/* Coupons List */}
          {coupons.length === 0 ? (
            <View style={{ alignItems: "center", marginVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎟️</Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: "700" }}>لم تضف أي كود خصم</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>أضف كود خصم للاستمتاع بعروضنا</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {coupons.map(uc => {
                const c = uc.coupons;
                const disountText = c.discount_type === "percent"
                  ? `${c.discount_value}% خصم`
                  : `خصم ${c.discount_value} جنيه`;

                return (
                  <View
                    key={uc.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 16, padding: 14,
                      borderWidth: 1.5, borderColor: colors.primary,
                      borderStyle: "dashed",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                      <View style={{
                        flex: 1,
                        backgroundColor: colors.primarySoft,
                        paddingVertical: 12, paddingHorizontal: 16,
                        borderRadius: 12,
                        alignItems: "center",
                      }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "700" }}>الخصم</Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.primary, marginTop: 2 }}>
                          {disountText}
                        </Text>
                      </View>

                      <View style={{ flex: 1.5, gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>
                          {c.code}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {c.description}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                          💳 الحد الأدنى: {c.min_order} جنيه • الحد الأقصى: {c.max_discount} جنيه
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                          ✓ ينتهي: {new Date(c.expires_at).toLocaleDateString("ar-EG")}
                        </Text>
                      </View>
                    </View>

                    {/* Copy Button */}
                    <Pressable
                      onPress={() => {
                        analyticsTracker.trackEvent(ANALYTICS_EVENTS.PROMO.CODE_COPIED, {
                          coupon_code: c.code,
                          coupon_id: c.id,
                        });
                        // Copy to clipboard in real app
                        Alert.alert("تم", `تم نسخ الكود: ${c.code}`);
                      }}
                      {...A11yPresets.button()}
                      accessibilityLabel={`نسخ كود الخصم ${c.code}`}
                      style={{
                        backgroundColor: colors.primarySoft,
                        paddingVertical: 8, borderRadius: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>نسخ الكود</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </SafeAreaScrollView>
    </View>
  );
}
