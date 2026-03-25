import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, Alert, StatusBar, Platform, Share, TextInput,
} from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSupabase } from "../../hooks/useSupabase";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
} as const;

interface Referral {
  id: string;
  referred_name: string;
  reward_amount: number;
  used: boolean;
  created_at: string;
}

export default function ReferralsScreen() {
  const [referralCode, setReferralCode] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();

  useEffect(() => {
    analyticsTracker.trackScreenView("referrals_screen");
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
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

      // جلب كود الإحالة
      const { data: codeData } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!codeData) {
        // إنشاء كود جديد
        const newCode = `REF_${user.id.substring(0, 8).toUpperCase()}`;
        const { error } = await supabase.from("referral_codes").insert({
          user_id: user.id,
          code: newCode,
        });

        if (!error) {
          setReferralCode(newCode);
          setCodeGenerated(true);
        }
      } else {
        setReferralCode(codeData.code);
      }

      // جلب الأرباح والإحالات
      const { data: referralData } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (referralData) {
        setReferrals(referralData);
        const totalEarnings = referralData.reduce((sum, ref) => sum + (ref.used ? ref.reward_amount : 0), 0);
        setEarnings(totalEarnings);
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const shareReferral = async () => {
    try {
      analyticsTracker.trackEvent("share_referral_code", { code: referralCode });
      const message = `🎁 شارك معك كود الإحالة: ${referralCode}\n\n💰 احصل على 50 ج.م عند الاشتراك!\n\nحمّل التطبيق الآن: [رابط التطبيق]`;
      await Share.share({
        message,
        title: "كود الإحالة",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const copyToClipboard = async () => {
    try {
      analyticsTracker.trackEvent("copy_referral_code");
      await Clipboard.setStringAsync(referralCode);
      Alert.alert("✓", "تم نسخ الكود إلى الحافظة");
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 18,
        paddingBottom: 14,
        backgroundColor: "#4C1D95",
      }}>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("referrals_back");
            router.back();
          }}
          {...A11yPresets.pressable}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Text style={{ fontSize: 20, color: "white" }}>←</Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "white" }}>🎁 برنامج الإحالات</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 48 }}>⏳</Text>
            <Text style={{ color: C.textMuted, marginTop: 12 }}>جاري التحميل...</Text>
          </View>
        ) : (
          <>
            {/* Referral Code Card */}
            <View style={{
              backgroundColor: C.primarySoft,
              padding: 18,
              borderRadius: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: C.border,
            }}>
              <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>
                🔗 كود الإحالة الخاص بك
              </Text>

              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: C.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: "900",
                  color: C.primary,
                  flex: 1,
                  fontFamily: "monospace",
                }}>
                  {referralCode || "جاري التحميل..."}
                </Text>

                <Pressable
                  onPress={copyToClipboard}
                  {...A11yPresets.pressable}
                  style={{
                    backgroundColor: C.primary,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>📋 نسخ</Text>
                </Pressable>
              </View>

              {/* Share Button */}
              <Pressable
                onPress={shareReferral}
                {...A11yPresets.pressable}
                style={{
                  backgroundColor: C.primary,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                  📤 شارك الكود
                </Text>
              </Pressable>
            </View>

            {/* Earnings Card */}
            <View style={{
              backgroundColor: "#FEF3C7",
              padding: 18,
              borderRadius: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}>
              <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>
                💰 الأرباح الكلية
              </Text>
              <Text style={{ fontSize: 32, fontWeight: "900", color: C.warning }}>
                {earnings.toFixed(2)} ج.م
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                من {referrals.filter(r => r.used).length} إحالة ناجحة
              </Text>
            </View>

            {/* How It Works */}
            <View style={{
              backgroundColor: C.surface,
              padding: 18,
              borderRadius: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: C.border,
            }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 12 }}>
                📋 كيفية الربح؟
              </Text>

              {[
                { icon: "1️⃣", title: "شارك الكود", desc: "أرسل كودك لأصدقائك" },
                { icon: "2️⃣", title: "يسجلون", desc: "يقومون بالتسجيل والاشتراك" },
                { icon: "3️⃣", title: "احصل على مكافأة", desc: "50 ج.م لكل إحالة ناجحة" },
              ].map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: idx < 2 ? 12 : 0,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: C.text, marginBottom: 2 }}>{item.title}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Referrals List */}
            {referrals.length > 0 && (
              <View style={{
                backgroundColor: C.surface,
                padding: 18,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
              }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 12 }}>
                  📈 إحالاتك
                </Text>

                {referrals.map((referral) => (
                  <View
                    key={referral.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: C.text, marginBottom: 2 }}>
                        {referral.referred_name || "عميل جديد"}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.textMuted }}>
                        {new Date(referral.created_at).toLocaleDateString("ar-EG")}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{
                        fontWeight: "900",
                        fontSize: 14,
                        color: referral.used ? C.success : C.warning,
                        marginBottom: 2,
                      }}>
                        {referral.reward_amount.toFixed(2)} ج.م
                      </Text>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: referral.used ? C.success : C.warning,
                        backgroundColor: referral.used ? "#ECFDF5" : "#FFFBEB",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}>
                        {referral.used ? "✓ مفعلة" : "⏳ معلقة"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {referrals.length === 0 && (
              <View style={{
                backgroundColor: C.primarySoft,
                padding: 24,
                borderRadius: 16,
                alignItems: "center",
              }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
                <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 4 }}>
                  لم تقم بأي إحالات بعد
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>
                  شارك كودك الآن واحصل على أرباح سريعة!
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
