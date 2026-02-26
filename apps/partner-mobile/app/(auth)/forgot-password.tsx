import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getSupabase } from "@hillaha/core";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("خطأ", "البريد الإلكتروني غير صحيح");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        Alert.alert("خطأ", "فشل الاتصال بالمنصة");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `partnermobile://reset-password`,
        }
      );

      if (error) {
        Alert.alert("خطأ", error.message || "فشل إرسال رابط إعادة تعيين");
        return;
      }

      setSent(true);
      Alert.alert(
        "تم الإرسال",
        "راجع بريدك الإلكتروني لتعليمات إعادة تعيين كلمة المرور"
      );
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء إرسال رابط إعادة التعيين");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.emoji}>✉️</Text>
          <Text style={styles.successTitle}>تم الإرسال بنجاح</Text>
          <Text style={styles.successMessage}>
            راجع بريدك الإلكتروني ({email}) لتلقي رابط إعادة تعيين كلمة المرور
          </Text>
          <Text style={styles.note}>
            إذا لم ترى الرسالة، تحقق من مجلد الرسائل غير المرغوب
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.buttonText}>العودة للدخول</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>إعادة تعيين المرور 🔐</Text>
          <Text style={styles.subtitle}>
            أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Illustration */}
          <View style={styles.illustration}>
            <Text style={styles.illustrationEmoji}>🔑</Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.input}
              placeholder="example@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              autoFocus
            />
          </View>

          {/* Description */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              سنرسل لك رابط آمن لإعادة تعيين كلمة مرورك. قد تستغرق الرسالة بعض الوقت للوصول.
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSendReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>إرسال رابط إعادة التعيين</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.buttonTextSecondary}>← العودة للدخول</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xxl,
    marginTop: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  illustration: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  infoBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    lineHeight: 20,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.surface,
  },
  buttonTextSecondary: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Success State
  successCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  successMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  note: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.xxl,
    fontStyle: "italic",
  },
});
