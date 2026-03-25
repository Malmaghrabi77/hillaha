import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Platform, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSupabase } from "../../hooks/useSupabase";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";
import { SafeAreaScrollView } from "../components";

export default function EditProfile() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.PROFILE_EDIT);
    loadUserData();
  }, []);

  async function loadUserData() {
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? "");
      const metadata = user.user_metadata as any;
      setFullName(metadata?.full_name ?? "");
      setPhone(metadata?.phone ?? "");
    } catch (error) {
      console.log("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert("خطأ", "الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    setSaving(true);
    const supabase = getSB();
    if (!supabase) { setSaving(false); return; }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      });

      if (error) throw error;

      analyticsTracker.trackEvent(ANALYTICS_EVENTS.PROFILE.UPDATED, { hasPhone: !!phone });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.back();
      }, 1500);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ البيانات");
      console.log("Error saving data:", error);
    } finally {
      setSaving(false);
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
    <SafeAreaScrollView variant="page">
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderColor: colors.border,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Pressable
          onPress={() => router.back()}
          {...A11yPresets.button("العودة", "انقر للعودة")}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>✏️ تعديل البيانات</Text>
        </View>
      </View>

      <View
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: colors.primarySoft,
            borderWidth: 3, borderColor: colors.primary,
            justifyContent: "center", alignItems: "center",
            marginBottom: 14,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ fontSize: 48 }}>👤</Text>
          </View>
          <Pressable
            {...A11yPresets.button("تحميل صورة", "انقر لتحميل صورة ملف شخصي")}
            style={{
              paddingVertical: 7, paddingHorizontal: 18, borderRadius: 20,
              borderWidth: 1.5, borderColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>تحميل صورة</Text>
          </Pressable>
        </View>

        {/*Email (Read-only) */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 8 }}>
            البريد الإلكتروني (غير قابل للتعديل)
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
            backgroundColor: colors.primarySoft, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <Text style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}>
              {email}
            </Text>
          </View>
        </View>

        {/* Full Name */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
            الاسم الكامل *
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
            backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>👤</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="أدخل اسمك الكامل"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
            />
          </View>
        </View>

        {/* Phone */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
            رقم الهاتف *
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
            backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>📞</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="01212345678"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={{
          backgroundColor: isDarkMode ? "#0C4A6E" : "#F0F9FF",
          borderRadius: 12, padding: 14,
          borderWidth: 1, borderColor: isDarkMode ? "#0E7490" : "#BAE6FD",
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 12, color: isDarkMode ? "#67E8F9" : "#0369A1", fontWeight: "600", textAlign: "right" }}>
            ℹ️ هذه البيانات ستُستخدم فقط لتوصيل طلباتك
          </Text>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          {...A11yPresets.button("حفظ البيانات", "انقر لحفظ بيانات الملف الشخصي")}
          style={{
            paddingVertical: 16, borderRadius: 14,
            backgroundColor: saved ? colors.success : colors.primary,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            alignItems: "center",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              {saved ? "✓ تم الحفظ" : "حفظ البيانات"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaScrollView>
  );
}


