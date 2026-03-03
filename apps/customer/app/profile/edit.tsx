import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StatusBar, Platform, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    const supabase = getSB();
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
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: C.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: C.text }}>✏️ تعديل البيانات</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: C.primarySoft,
            borderWidth: 3, borderColor: C.primary,
            justifyContent: "center", alignItems: "center",
            marginBottom: 14,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
          }}>
            <Text style={{ fontSize: 48 }}>👤</Text>
          </View>
          <Pressable style={{
            paddingVertical: 7, paddingHorizontal: 18, borderRadius: 20,
            borderWidth: 1.5, borderColor: C.primary,
          }}>
            <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>تحميل صورة</Text>
          </Pressable>
        </View>

        {/* Email (Read-only) */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8 }}>
            البريد الإلكتروني (غير قابل للتعديل)
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: "#F9FAFB", paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <Text style={{ flex: 1, fontSize: 14, color: C.textMuted, textAlign: "right" }}>
              {email}
            </Text>
          </View>
        </View>

        {/* Full Name */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 8 }}>
            الاسم الكامل *
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>👤</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="أدخل اسمك الكامل"
              placeholderTextColor={C.textMuted}
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
            />
          </View>
        </View>

        {/* Phone */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 8 }}>
            رقم الهاتف *
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>📞</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="01212345678"
              placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={{
          backgroundColor: "#F0F9FF",
          borderRadius: 12, padding: 14,
          borderWidth: 1, borderColor: "#BAE6FD",
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 12, color: "#0369A1", fontWeight: "600", textAlign: "right" }}>
            ℹ️ هذه البيانات ستُستخدم فقط لتوصيل طلباتك
          </Text>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 16, borderRadius: 14,
            backgroundColor: saved ? C.success : C.primary,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
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
      </ScrollView>
    </View>
  );
}

