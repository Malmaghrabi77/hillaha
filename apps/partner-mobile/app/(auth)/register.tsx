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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabase } from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "@/lib/theme";

type Step = "verify" | "register";

interface InvitationInfo {
  invitation_id: string;
  name: string;
  phone: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("verify");
  const [verifying, setVerifying] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    businessName: "",
    ownerName: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Step 1: Verify invitation email
  const verifyEmail = async () => {
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Alert.alert("خطأ", "البريد الإلكتروني غير صحيح");
      return;
    }

    setVerifying(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        Alert.alert("خطأ", "فشل الاتصال بالمنصة");
        return;
      }

      const { data, error } = await (supabase as any).rpc("verify_invitation_email", {
        p_email: formData.email.trim().toLowerCase(),
      });

      if (error) {
        Alert.alert("خطأ", "فشل التحقق من الدعوة");
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert(
          "لا توجد دعوة",
          "هذا البريد غير مسجل في نظام الدعوات.\n\nللانضمام كشريك في منصة حلّها، يجب أن يقوم أحد المسؤولين بدعوتك أولاً.\n\nتواصل مع فريق حلّها للحصول على دعوة.",
          [{ text: "فهمت" }]
        );
        return;
      }

      const inv = data[0];

      if (inv.status === "registered") {
        Alert.alert(
          "تم التسجيل مسبقاً",
          "هذا البريد مسجل بالفعل. استخدم تسجيل الدخول.",
          [{ text: "تسجيل الدخول", onPress: () => router.push("/(auth)/login") }]
        );
        return;
      }

      if (inv.status === "pending") {
        Alert.alert(
          "الدعوة قيد المراجعة",
          "دعوتك لا تزال قيد المراجعة من قبل الإدارة. سيتم إشعارك عند الموافقة.",
          [{ text: "فهمت" }]
        );
        return;
      }

      if (inv.status === "rejected") {
        Alert.alert("دعوة مرفوضة", "تم رفض هذه الدعوة. تواصل مع الإدارة لمزيد من المعلومات.");
        return;
      }

      if (!inv.is_valid) {
        Alert.alert("خطأ", "الدعوة غير صالحة أو منتهية الصلاحية");
        return;
      }

      // Invitation is accepted — proceed to registration
      setInvitation({
        invitation_id: inv.invitation_id,
        name: inv.name || "",
        phone: inv.phone || "",
      });

      // Pre-fill from invitation data
      setFormData((prev) => ({
        ...prev,
        businessName: inv.name || prev.businessName,
        phone: inv.phone || prev.phone,
      }));

      setStep("register");
    } catch (e) {
      Alert.alert("خطأ", "حدث خطأ أثناء التحقق");
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Register
  const validateForm = () => {
    if (!formData.businessName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المتجر");
      return false;
    }
    if (!formData.ownerName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسمك");
      return false;
    }
    if (!formData.phone.match(/^\+?[\d\s-]{10,}$/)) {
      Alert.alert("خطأ", "رقم الهاتف غير صحيح");
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
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

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName.trim(),
            business_name: formData.businessName.trim(),
            phone: formData.phone.trim(),
            role: "partner",
            invitation_id: invitation?.invitation_id || null,
          },
        },
      });

      if (error) {
        Alert.alert("خطأ", error.message || "فشل التسجيل");
        return;
      }

      if (data.user) {
        await SecureStore.setItemAsync("PARTNER_EMAIL", formData.email.trim().toLowerCase());

        Alert.alert(
          "تم التسجيل بنجاح!",
          "تم إنشاء حسابك وربطه بمتجرك.\n\nيرجى التحقق من بريدك الإلكتروني لتفعيل الحساب، ثم سجّل الدخول.",
          [{ text: "تسجيل الدخول", onPress: () => router.push("/(auth)/login") }]
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
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={[styles.topSection, { paddingTop: insets.top + SPACING.lg }]}>
        <TouchableOpacity
          onPress={() => (step === "register" ? setStep("verify") : router.back())}
          style={styles.backButton}
        >
          <Text style={styles.backText}>→ {step === "register" ? "تغيير البريد" : "عودة"}</Text>
        </TouchableOpacity>
        <Image source={require("../../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandTitle}>انضم كشريك</Text>
        {step === "verify" && (
          <Text style={styles.brandSubtitle}>أدخل بريدك الإلكتروني للتحقق من الدعوة</Text>
        )}
        {step === "register" && (
          <Text style={styles.brandSubtitle}>أكمل بياناتك لإنشاء الحساب</Text>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formSection}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {step === "verify" ? (
            /* ──── Step 1: Email Verification ──── */
            <View style={styles.form}>
              <View style={styles.invitationNote}>
                <Text style={styles.invitationNoteTitle}>كيف تنضم كشريك؟</Text>
                <Text style={styles.invitationNoteText}>
                  1. يقوم أحد مسؤولي حلّها بإرسال دعوة لبريدك الإلكتروني{"\n"}
                  2. يتم مراجعة الدعوة والموافقة عليها{"\n"}
                  3. تُدخل بريدك هنا للتحقق ثم تُكمل التسجيل
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.email}
                  onChangeText={(t) => setFormData({ ...formData, email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!verifying}
                  textAlign="right"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, verifying && styles.buttonDisabled]}
                onPress={verifyEmail}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>التحقق من الدعوة</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  هل لديك حساب بالفعل؟{" "}
                  <Text style={styles.footerLink} onPress={() => router.push("/(auth)/login")}>
                    دخول
                  </Text>
                </Text>
              </View>
            </View>
          ) : (
            /* ──── Step 2: Registration Form ──── */
            <View style={styles.form}>
              {/* Invitation badge */}
              <View style={styles.invitationBadge}>
                <Text style={styles.invitationBadgeIcon}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invitationBadgeTitle}>دعوة مؤكدة</Text>
                  <Text style={styles.invitationBadgeEmail}>{formData.email}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>اسم المتجر/الشركة</Text>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: مطعم الشرقاوي"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.businessName}
                  onChangeText={(t) => setFormData({ ...formData, businessName: t })}
                  editable={!loading}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>اسم المالك</Text>
                <TextInput
                  style={styles.input}
                  placeholder="اسمك الكامل"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.ownerName}
                  onChangeText={(t) => setFormData({ ...formData, ownerName: t })}
                  editable={!loading}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>رقم الهاتف</Text>
                <TextInput
                  style={styles.input}
                  placeholder="01012345678"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.phone}
                  onChangeText={(t) => setFormData({ ...formData, phone: t })}
                  keyboardType="phone-pad"
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
                  value={formData.password}
                  onChangeText={(t) => setFormData({ ...formData, password: t })}
                  secureTextEntry
                  editable={!loading}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.passwordConfirm}
                  onChangeText={(t) => setFormData({ ...formData, passwordConfirm: t })}
                  secureTextEntry
                  editable={!loading}
                  textAlign="right"
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptTerms(!acceptTerms)}
                disabled={loading}
              >
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  أوافق على <Text style={styles.link}>الشروط والأحكام</Text>
                </Text>
              </TouchableOpacity>

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
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.deepPurple },
  topSection: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    alignItems: "center",
  },
  backButton: { alignSelf: "flex-start", marginBottom: SPACING.sm },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: FONT_SIZES.sm, fontWeight: "600" },
  logo: { width: 48, height: 48, marginBottom: SPACING.sm },
  brandTitle: { fontSize: FONT_SIZES.xl, fontWeight: "900", color: COLORS.textLight },
  brandSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.7)",
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  formSection: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  form: { flex: 1 },
  // Invitation note card
  invitationNote: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  invitationNoteTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  invitationNoteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 22,
  },
  // Invitation badge
  invitationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "#34D399",
    gap: SPACING.sm,
  },
  invitationBadgeIcon: { fontSize: 24 },
  invitationBadgeTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: "#065F46",
  },
  invitationBadgeEmail: {
    fontSize: FONT_SIZES.xs,
    color: "#047857",
    marginTop: 2,
  },
  // Inputs
  inputGroup: { marginBottom: SPACING.lg },
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
  // Checkbox
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
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkmark: { color: COLORS.surface, fontSize: FONT_SIZES.lg, fontWeight: "bold" },
  checkboxLabel: { fontSize: FONT_SIZES.sm, color: COLORS.text, flex: 1 },
  link: { color: COLORS.primary, fontWeight: "700" },
  // Buttons
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  buttonPrimary: { backgroundColor: COLORS.primary },
  buttonText: { fontSize: FONT_SIZES.base, fontWeight: "700", color: COLORS.surface },
  buttonDisabled: { opacity: 0.5 },
  // Footer
  footer: { alignItems: "center", marginTop: SPACING.lg },
  footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  footerLink: { color: COLORS.primary, fontWeight: "700" },
});
