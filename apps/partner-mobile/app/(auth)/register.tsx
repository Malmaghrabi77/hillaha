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
import * as SecureStore from "expo-secure-store";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المتجر");
      return false;
    }

    if (!formData.ownerName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسمك");
      return false;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Alert.alert("خطأ", "البريد الإلكتروني غير صحيح");
      return false;
    }

    if (!formData.phone.match(/^\+?[\d\s-]{10,}$/)) {
      Alert.alert("خطأ", "رقم الهاتف غير صحيح");
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return false;
    }

    if (formData.password !== formData.passwordConfirm) {
      Alert.alert("خطأ", "كلمات المرور غير متطابقة");
      return false;
    }

    if (!acceptTerms) {
      Alert.alert("خطأ", "يجب قبول الشروط والأحكام");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        Alert.alert("خطأ", "فشل الاتصال بالمنصة");
        return;
      }

      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName.trim(),
            business_name: formData.businessName.trim(),
            phone: formData.phone.trim(),
            role: "partner",
          },
        },
      });

      if (error) {
        Alert.alert("خطأ", error.message || "فشل التسجيل");
        return;
      }

      if (data.user) {
        // Save credentials
        await SecureStore.setItemAsync("PARTNER_EMAIL", formData.email.trim().toLowerCase());

        Alert.alert(
          "نجح التسجيل",
          "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
          [
            {
              text: "تم",
              onPress: () => router.push("/(auth)/login"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>انضم إلينا 🚀</Text>
          <Text style={styles.subtitle}>اصبح شريكاً في منصة حلّها</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Business Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المتجر/الشركة</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: كشري الشرقاوي"
              placeholderTextColor={COLORS.textMuted}
              value={formData.businessName}
              onChangeText={(text) => setFormData({...formData, businessName: text})}
              editable={!loading}
            />
          </View>

          {/* Owner Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المالك</Text>
            <TextInput
              style={styles.input}
              placeholder="اسمك"
              placeholderTextColor={COLORS.textMuted}
              value={formData.ownerName}
              onChangeText={(text) => setFormData({...formData, ownerName: text})}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.input}
              placeholder="example@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput
              style={styles.input}
              placeholder="01012345678"
              placeholderTextColor={COLORS.textMuted}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>تأكيد كلمة المرور</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={formData.passwordConfirm}
              onChangeText={(text) => setFormData({...formData, passwordConfirm: text})}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
            disabled={loading}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              أوافق على{" "}
              <Text style={styles.link}>الشروط والأحكام</Text>
            </Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>إنشاء حساب</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            هل لديك حساب بالفعل؟{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(auth)/login")}
            >
              دخول
            </Text>
          </Text>
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
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
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
  },
  form: {
    flex: 1,
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
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
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
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  link: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
