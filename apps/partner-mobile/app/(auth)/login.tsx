import React, { useState, useEffect } from "react";
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
import * as LocalAuthentication from "expo-local-authentication";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  useEffect(() => {
    checkBiometric();
    loadSavedEmail();
  }, []);

  const checkBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error("Biometric check failed:", error);
    }
  };

  const loadSavedEmail = async () => {
    try {
      const saved = await SecureStore.getItemAsync("PARTNER_EMAIL");
      if (saved) {
        setSavedEmail(saved);
        setEmail(saved);
      }
    } catch (error) {
      console.error("Failed to load saved email:", error);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("خطأ", "البريد الإلكتروني غير صحيح");
      return;
    }

    if (!password) {
      Alert.alert("خطأ", "يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        Alert.alert("خطأ", "فشل الاتصال بالمنصة");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert("خطأ", error.message || "فشل تسجيل الدخول");
        return;
      }

      if (data.session) {
        // Save credentials for biometric login
        await SecureStore.setItemAsync("PARTNER_EMAIL", email.trim().toLowerCase());
        await SecureStore.setItemAsync("PARTNER_ACCESS_TOKEN", data.session.access_token);
        await SecureStore.setItemAsync("PARTNER_REFRESH_TOKEN", data.session.refresh_token || "");

        // Navigate to dashboard
        router.replace("/(root)/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!savedEmail) {
      Alert.alert("تنبيه", "لا توجد بيانات محفوظة للدخول البيومتري");
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: "تحقق من هويتك للدخول",
      });

      if (result.success) {
        const token = await SecureStore.getItemAsync("PARTNER_ACCESS_TOKEN");
        if (token) {
          router.replace("/(root)/dashboard");
        } else {
          Alert.alert("خطأ", "انتهت جلسة الدخول. يرجى تسجيل الدخول مجددًا");
        }
      }
    } catch (error) {
      console.error("Biometric error:", error);
      Alert.alert("خطأ", "فشل التحقق البيومتري");
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
          <Text style={styles.title}>مرحباً بك 👋</Text>
          <Text style={styles.subtitle}>شريك حلّها</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>دخول</Text>
            )}
          </TouchableOpacity>

          {/* Biometric Login */}
          {biometricAvailable && savedEmail && (
            <>
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.line} />
              </View>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleBiometricLogin}
              >
                <Text style={styles.buttonText}>🔐 بيومتري</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={styles.link}>هل نسيت كلمة المرور؟</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            لا تملك حساب؟{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(auth)/register")}
            >
              سجل الآن
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
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xxl,
    marginTop: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  link: {
    textAlign: "center",
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: "center",
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
