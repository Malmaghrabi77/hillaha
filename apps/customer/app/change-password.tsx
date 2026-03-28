import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { useSupabase } from "../src/hooks/useSupabase";
import { SafeAreaScrollView } from "../src/components";

export default function ChangePassword() {
  const { colors } = useDarkMode();
  const supabase = useSupabase();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("خطأ", "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("خطأ", "كلمة المرور الجديدة غير متطابقة");
      return;
    }

    setLoading(true);
    try {
      if (!supabase) {
        Alert.alert("خطأ", "غير متصل بالخادم");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert("خطأ", error.message || "فشل تغيير كلمة المرور");
      } else {
        Alert.alert("تم بنجاح ✅", "تم تغيير كلمة المرور بنجاح", [
          { text: "حسناً", onPress: () => router.canGoBack() ? router.back() : router.replace("/(tabs)/home") },
        ]);
      }
    } catch {
      Alert.alert("خطأ", "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    textAlign: "right" as const,
  };

  return (
    <SafeAreaScrollView variant="page" safeTop={false} backgroundColor={colors.bg} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Info */}
      <View style={{
        padding: 16, borderRadius: 16, marginBottom: 20,
        backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + "30",
      }}>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20, textAlign: "right" }}>
          🔒 لحماية حسابك، اختر كلمة مرور قوية تحتوي على أحرف وأرقام ورموز.
        </Text>
      </View>

      {/* Current Password */}
      <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14, marginBottom: 8, textAlign: "right" }}>
        كلمة المرور الحالية
      </Text>
      <View style={{ marginBottom: 16 }}>
        <TextInput
          style={inputStyle}
          placeholder="أدخل كلمة المرور الحالية"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showCurrent}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <Pressable
          onPress={() => setShowCurrent(!showCurrent)}
          style={{ position: "absolute", left: 16, top: 16 }}
        >
          <Text style={{ fontSize: 18 }}>{showCurrent ? "🙈" : "👁️"}</Text>
        </Pressable>
      </View>

      {/* New Password */}
      <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14, marginBottom: 8, textAlign: "right" }}>
        كلمة المرور الجديدة
      </Text>
      <View style={{ marginBottom: 16 }}>
        <TextInput
          style={inputStyle}
          placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showNew}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Pressable
          onPress={() => setShowNew(!showNew)}
          style={{ position: "absolute", left: 16, top: 16 }}
        >
          <Text style={{ fontSize: 18 }}>{showNew ? "🙈" : "👁️"}</Text>
        </Pressable>
      </View>

      {/* Confirm Password */}
      <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14, marginBottom: 8, textAlign: "right" }}>
        تأكيد كلمة المرور الجديدة
      </Text>
      <TextInput
        style={[inputStyle, { marginBottom: 24 }]}
        placeholder="أعد إدخال كلمة المرور الجديدة"
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!showNew}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Submit Button */}
      <Pressable
        onPress={handleChangePassword}
        disabled={loading}
        style={{
          backgroundColor: loading ? colors.textMuted : colors.primary,
          paddingVertical: 16, borderRadius: 16, alignItems: "center",
          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 16 }}>تغيير كلمة المرور</Text>
        )}
      </Pressable>
    </SafeAreaScrollView>
  );
}
