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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getSupabase } from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    } catch (e) {
      console.warn("check_biometric:", e);
    }
  };

  const loadSavedEmail = async () => {
    try {
      const saved = await SecureStore.getItemAsync("PARTNER_EMAIL");
      if (saved) { setSavedEmail(saved); setEmail(saved); }
    } catch (e) {
      console.warn("load_saved_email:", e);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) { Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني"); return; }
    if (!password) { Alert.alert("خطأ", "يرجى إدخال كلمة المرور"); return; }

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) { Alert.alert("خطأ", "فشل الاتصال بالمنصة"); return; }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) { Alert.alert("خطأ", error.message || "فشل تسجيل الدخول"); return; }

      if (data.session) {
        // Verify user role is partner or super_admin
        const { data: profileData } = await (supabase as any)
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .single();

        const userRole = profileData?.role;
        if (userRole !== "partner" && userRole !== "super_admin") {
          await supabase.auth.signOut();
          Alert.alert("خطأ", "هذا الحساب ليس حساب شريك");
          return;
        }

        await SecureStore.setItemAsync("PARTNER_EMAIL", email.trim().toLowerCase());
        await SecureStore.setItemAsync("PARTNER_ACCESS_TOKEN", data.session.access_token);
        await SecureStore.setItemAsync("PARTNER_REFRESH_TOKEN", data.session.refresh_token || "");

        // Check if partner record exists
        const { data: partnerData } = await (supabase as any)
          .from("partners")
          .select("id")
          .eq("user_id", data.session.user.id)
          .single();

        if (!partnerData) {
          // Try to complete onboarding (for users who registered before the trigger fix)
          const { error: onboardError } = await (supabase as any).rpc("complete_partner_onboarding", {
            p_user_id: data.session.user.id,
          });
          if (onboardError) {
            console.warn("Onboarding RPC error:", onboardError.message);
            // Continue anyway — the partner record may already exist
          }
        }

        router.replace("/(root)/dashboard");
      }
    } catch (e) {
      console.warn("handle_login:", e);
      Alert.alert("خطأ", "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!savedEmail) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        promptMessage: "تحقق من هويتك للدخول",
      });
      if (result.success) {
        const accessToken = await SecureStore.getItemAsync("PARTNER_ACCESS_TOKEN");
        const refreshToken = await SecureStore.getItemAsync("PARTNER_REFRESH_TOKEN");
        if (accessToken && refreshToken) {
          const supabase = getSupabase();
          if (!supabase) {
            Alert.alert("خطأ", "فشل الاتصال بالمنصة");
            return;
          }
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error || !data.session) {
            // Session expired — clear stored tokens and show login form
            await SecureStore.deleteItemAsync("PARTNER_ACCESS_TOKEN");
            await SecureStore.deleteItemAsync("PARTNER_REFRESH_TOKEN");
            Alert.alert("خطأ", "انتهت الجلسة. سجّل دخولك مجدداً");
            return;
          }
          // Update stored tokens with refreshed values
          await SecureStore.setItemAsync("PARTNER_ACCESS_TOKEN", data.session.access_token);
          await SecureStore.setItemAsync("PARTNER_REFRESH_TOKEN", data.session.refresh_token || "");
          router.replace("/(root)/dashboard");
        } else {
          Alert.alert("خطأ", "انتهت الجلسة. سجّل دخولك مجدداً");
        }
      }
    } catch (e) {
      console.warn("biometric_login:", e);
      Alert.alert("خطأ", "فشل التحقق البيومتري");
    }
  };

  return (
    <View style={styles.container}>
      {/* Purple top section */}
      <View style={[styles.topSection, { paddingTop: insets.top + SPACING.xl }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>شريك حلّها</Text>
        <Text style={styles.brandSubtitle}>إدارة متجرك بسهولة</Text>
      </View>

      {/* White form card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formSection}
      >
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + SPACING.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>تسجيل الدخول</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                textAlign="right"
              />
            </View>

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
                textAlign="right"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
              )}
            </TouchableOpacity>

            {biometricAvailable && savedEmail && (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
                <Text style={styles.biometricButtonText}>🔐 الدخول بالبصمة</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotLink}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ليس لديك حساب؟{" "}
              <Text style={styles.footerLink} onPress={() => router.push("/(auth)/register")}>
                سجّل الآن
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.deepPurple },
  topSection: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    alignItems: "center",
    overflow: "hidden",
  },
  decorCircle1: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(139, 92, 246, 0.3)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -30,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(236, 72, 153, 0.2)",
  },
  logo: { width: 72, height: 72, marginBottom: SPACING.md },
  brandTitle: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "900",
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  brandSubtitle: {
    fontSize: FONT_SIZES.base,
    color: "rgba(255,255,255,0.7)",
  },
  formSection: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    marginTop: -SPACING.lg,
  },
  formContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  formTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  inputGroup: { marginBottom: SPACING.lg },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  loginButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "800",
    color: COLORS.textLight,
  },
  biometricButton: {
    backgroundColor: COLORS.primarySoft,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  biometricButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  forgotLink: {
    textAlign: "center",
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginTop: SPACING.lg,
  },
  footer: { alignItems: "center", marginTop: SPACING.xl, paddingBottom: SPACING.lg },
  footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  footerLink: { color: COLORS.primary, fontWeight: "800" },
});
