import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, Pressable,
  ScrollView, Image, ActivityIndicator,
  Modal, FlatList, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getCustomerSupabase as getSupabase, getCustomerSupabase } from "../../lib/supabase";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { COUNTRIES, detectCountryIndex, searchCountries } from "../../src/constants/countryCodes";

// Lazy-load native modules to prevent crash if they fail to initialize
let LocalAuthentication: typeof import("expo-local-authentication") | null = null;
let SecureStore: typeof import("expo-secure-store") | null = null;
try { LocalAuthentication = require("expo-local-authentication"); } catch {}
try { SecureStore = require("expo-secure-store"); } catch {}

const STORE_EMAIL   = "hillaha_customer_email";
const STORE_REFRESH = "hillaha_customer_refresh";

type AuthMode = "email" | "phone";

export default function Login() {
  const { colors } = useDarkMode();
  const [authMode, setAuthMode]       = useState<AuthMode>("email");
  const [countryIdx, setCountryIdx]   = useState(() => detectCountryIndex());
  const [showCountry, setShowCountry] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [phone, setPhone]             = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [biometricReady, setBioReady] = useState(false);
  const [bioLoading, setBioLoading]   = useState(false);

  // OTP state
  const [otpSent, setOtpSent]         = useState(false);
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Check if biometric login is available
  useEffect(() => {
    async function checkBiometric() {
      try {
        if (!LocalAuthentication || !SecureStore) { setBioReady(false); return; }
        const hasHw      = await LocalAuthentication.hasHardwareAsync();
        const enrolled   = await LocalAuthentication.isEnrolledAsync();
        const savedEmail   = await SecureStore.getItemAsync(STORE_EMAIL);
        const savedRefresh = await SecureStore.getItemAsync(STORE_REFRESH);
        setBioReady(hasHw && enrolled && !!savedEmail && !!savedRefresh);
      } catch {
        setBioReady(false);
      }
    }
    checkBiometric();
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Email / password login ──────────────────────────────────────────
  async function handleEmailLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال — تأكد من استقرار الإنترنت");
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) throw err;

      // Save credentials for future biometric login
      if (SecureStore && data.session?.refresh_token) {
        try {
          await SecureStore.setItemAsync(STORE_EMAIL, email.trim().toLowerCase());
          await SecureStore.setItemAsync(STORE_REFRESH, data.session.refresh_token);
          setBioReady(true);
        } catch {}
      }

      router.replace("/(tabs)/home");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Invalid login credentials")) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (msg.includes("Email not confirmed")) {
        setError("يرجى تأكيد بريدك الإلكتروني أولاً");
      } else {
        setError("حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Biometric login ─────────────────────────────────────────────────
  async function handleBiometricLogin() {
    setBioLoading(true);
    setError("");
    try {
      if (!LocalAuthentication || !SecureStore) {
        setError("المصادقة الحيوية غير متاحة");
        setBioLoading(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:  "تسجيل الدخول بالسمات الحيوية",
        cancelLabel:    "إلغاء",
        fallbackLabel:  "استخدم كلمة المرور",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        setBioLoading(false);
        return;
      }

      const savedEmail   = await SecureStore!.getItemAsync(STORE_EMAIL);
      const savedRefresh = await SecureStore!.getItemAsync(STORE_REFRESH);

      if (!savedEmail || !savedRefresh) {
        setError("يرجى تسجيل الدخول بالبريد وكلمة المرور مرة واحدة أولاً");
        setBioLoading(false);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال — تأكد من استقرار الإنترنت");

      const { data: sessionData, error: err } = await supabase.auth.refreshSession({
        refresh_token: savedRefresh,
      });

      if (err || !sessionData.session) {
        // Refresh token expired — clear stored tokens
        await SecureStore!.deleteItemAsync(STORE_REFRESH);
        setError("انتهت الجلسة — سجّل دخولك بالبريد وكلمة المرور مجدداً");
        setBioLoading(false);
        return;
      }

      // Update stored refresh token with the new one
      await SecureStore!.setItemAsync(STORE_REFRESH, sessionData.session.refresh_token);

      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError("فشل تسجيل الدخول، يرجى استخدام البريد وكلمة المرور");
    } finally {
      setBioLoading(false);
    }
  }

  // ── Phone OTP: send code ────────────────────────────────────────────
  async function handlePhoneSendOtp() {
    setError("");
    if (!phone.trim()) return setError("يرجى إدخال رقم الهاتف");

    const cleanPhone = phone.trim().replace(/^0+/, "");
    if (cleanPhone.length < 10) return setError("رقم الهاتف غير صحيح");

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال — تأكد من استقرار الإنترنت");

      const fullPhone = COUNTRIES[countryIdx].code + cleanPhone;
      const { error: err } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (err) throw err;
      setOtpSent(true);
      setResendTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Phone provider") || msg.includes("not enabled") || msg.includes("phone_provider_disabled")) {
        setError("خدمة الرسائل القصيرة غير متاحة حالياً — يرجى الدخول بالبريد الإلكتروني");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("تم إرسال الكود مسبقاً — انتظر قليلاً ثم حاول مرة أخرى");
      } else {
        setError(`خطأ: ${msg || "حدث خطأ في إرسال الكود"}`);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Phone OTP: verify code ──────────────────────────────────────────
  async function handleVerifyOtp() {
    setError("");
    const otpCode = otp.join("");
    if (otpCode.length < 6) return setError("يرجى إدخال كود التحقق كاملاً");

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال");

      const cleanPhone = phone.trim().replace(/^0+/, "");
      const fullPhone = COUNTRIES[countryIdx].code + cleanPhone;

      const { error: err } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode,
        type: "sms",
      });
      if (err) throw err;

      router.replace("/(tabs)/home");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Token has expired") || msg.includes("expired")) {
        setError("انتهت صلاحية كود التحقق — اطلب كود جديد");
      } else if (msg.includes("Invalid") || msg.includes("invalid")) {
        setError("كود التحقق غير صحيح — تأكد من الأرقام");
      } else {
        setError(`خطأ: ${msg || "فشل التحقق"}`);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── OTP helpers ─────────────────────────────────────────────────────
  function handleOtpChange(text: string, index: number) {
    const digit = text.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0) return;
    await handlePhoneSendOtp();
  }

  function maskedPhone() {
    const p = phone.trim();
    if (p.length <= 4) return p;
    return p.slice(0, 4) + "****" + p.slice(-2);
  }

  // ══════════════════════════════════════════════════════════════════════
  // OTP VERIFICATION SCREEN
  // ══════════════════════════════════════════════════════════════════════
  if (otpSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>📱</Text>
            <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, marginBottom: 8 }}>
              كود التحقق
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: "center", lineHeight: 22, fontSize: 14 }}>
              تم إرسال كود التحقق إلى{"\n"}
              <Text style={{ fontWeight: "700", color: colors.primary }}>{maskedPhone()}</Text>
            </Text>
          </View>

          {error ? (
            <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}>
              <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
            </View>
          ) : null}

          {/* OTP Inputs */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 28 }}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={r => { otpRefs.current[i] = r; }}
                value={digit}
                onChangeText={t => handleOtpChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                style={{
                  width: 48, height: 56, borderRadius: 14,
                  borderWidth: 2, borderColor: digit ? colors.primary : colors.border,
                  backgroundColor: digit ? colors.primarySoft : colors.surface,
                  fontSize: 22, fontWeight: "900", color: colors.text,
                  textAlign: "center",
                }}
              />
            ))}
          </View>

          {/* Verify Button */}
          <Pressable
            onPress={handleVerifyOtp}
            disabled={loading}
            style={{
              paddingVertical: 16, borderRadius: 16, marginBottom: 16,
              backgroundColor: loading ? colors.primarySoft : colors.primary,
              alignItems: "center",
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>تأكيد الكود</Text>
            }
          </Pressable>

          {/* Resend */}
          <Pressable onPress={handleResendOtp} disabled={resendTimer > 0} style={{ alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: resendTimer > 0 ? colors.textMuted : colors.primary, fontWeight: "700", fontSize: 13 }}>
              {resendTimer > 0
                ? `إعادة إرسال الكود (${resendTimer} ثانية)`
                : "إعادة إرسال الكود"
              }
            </Text>
          </Pressable>

          {/* Back */}
          <Pressable onPress={() => { setOtpSent(false); setError(""); setOtp(["", "", "", "", "", ""]); }} style={{ alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              ← تغيير رقم الهاتف
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // MAIN LOGIN FORM
  // ══════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* LOGO */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Image
            source={require("../../assets/hillaha-logo.png")}
            style={{ width: 80, height: 80, resizeMode: "contain", marginBottom: 12 }}
          />
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 20, color: colors.text, fontWeight: "900", marginBottom: 8 }}>حلها يحلها</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16, color: colors.primary, fontWeight: "900" }}>7illaha</Text>
              <Image
                source={require("../../assets/hillaha-logo.png")}
                style={{ width: 20, height: 20, resizeMode: "contain" }}
              />
              <Text style={{ fontSize: 16, color: colors.primary, fontWeight: "900" }}>7illaha</Text>
            </View>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>تسجيل الدخول</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>أهلاً بعودتك لحلّها</Text>
        </View>

        {/* ── BIOMETRIC QUICK LOGIN ─────────────────────────── */}
        {biometricReady && (
          <Pressable
            onPress={handleBiometricLogin}
            disabled={bioLoading}
            style={{
              backgroundColor: colors.primarySoft,
              borderRadius: 20, padding: 18, marginBottom: 20,
              alignItems: "center", gap: 8,
              borderWidth: 2, borderColor: colors.primary,
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
            }}
          >
            {bioLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={{ fontSize: 42 }}>🔐</Text>
                <Text style={{ fontWeight: "900", fontSize: 16, color: colors.primary }}>دخول ببصمة الإصبع / الوجه</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>اضغط للمصادقة الحيوية</Text>
              </>
            )}
          </Pressable>
        )}

        {/* DIVIDER */}
        {biometricReady && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>أو</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
        )}

        {/* MODE TOGGLE */}
        <View style={{
          flexDirection: "row", borderRadius: 14, overflow: "hidden",
          borderWidth: 1.5, borderColor: colors.border, marginBottom: 20,
        }}>
          <Pressable
            onPress={() => { setAuthMode("email"); setError(""); }}
            style={{
              flex: 1, paddingVertical: 12, alignItems: "center",
              backgroundColor: authMode === "email" ? colors.primary : colors.surface,
            }}
          >
            <Text style={{
              fontWeight: "800", fontSize: 13,
              color: authMode === "email" ? "white" : colors.textMuted,
            }}>
              ✉️ بالبريد الإلكتروني
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setAuthMode("phone"); setError(""); }}
            style={{
              flex: 1, paddingVertical: 12, alignItems: "center",
              backgroundColor: authMode === "phone" ? colors.primary : colors.surface,
            }}
          >
            <Text style={{
              fontWeight: "800", fontSize: 13,
              color: authMode === "phone" ? "white" : colors.textMuted,
            }}>
              📞 برقم الهاتف
            </Text>
          </Pressable>
        </View>

        {/* ERROR */}
        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}>
            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        {/* ── EMAIL MODE ──────────────────────────────────────── */}
        {authMode === "email" && (
          <>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>البريد الإلكتروني</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>✉️</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  placeholder="example@email.com" placeholderTextColor={colors.textMuted}
                  keyboardType="email-address" autoCapitalize="none"
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>كلمة المرور</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
                <TextInput
                  value={password} onChangeText={setPassword}
                  placeholder="كلمة المرور" placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
                <Pressable onPress={() => setShowPass(v => !v)}>
                  <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => {
                if (!email.trim()) {
                  setError("أدخل بريدك الإلكتروني أولاً لإعادة تعيين كلمة المرور");
                  return;
                }
                setLoading(true);
                const sb = getCustomerSupabase();
                if (sb) {
                  sb.auth.resetPasswordForEmail(email.trim())
                    .then(() => { Alert.alert("تم الإرسال", "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"); })
                    .catch(() => { Alert.alert("خطأ", "تعذّر إرسال رابط إعادة التعيين، تأكد من صحة البريد الإلكتروني"); })
                    .finally(() => setLoading(false));
                } else { setLoading(false); }
              }}
              style={{ alignSelf: "flex-start", marginBottom: 24 }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>نسيت كلمة المرور؟</Text>
            </Pressable>

            <Pressable
              onPress={handleEmailLogin}
              disabled={loading}
              style={{
                paddingVertical: 16, borderRadius: 16, marginBottom: 16,
                backgroundColor: loading ? colors.primarySoft : colors.primary,
                alignItems: "center",
                shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
              }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>دخول</Text>
              }
            </Pressable>
          </>
        )}

        {/* ── PHONE MODE ──────────────────────────────────────── */}
        {authMode === "phone" && (
          <>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>رقم الهاتف</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <Pressable
                  onPress={() => { setCountrySearch(""); setShowCountry(true); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text style={{ fontSize: 18 }}>{COUNTRIES[countryIdx].flag}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>{COUNTRIES[countryIdx].code}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>▼</Text>
                </Pressable>
                <TextInput
                  value={phone} onChangeText={setPhone}
                  placeholder="رقم الهاتف" placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
              </View>
            </View>

            <Pressable
              onPress={handlePhoneSendOtp}
              disabled={loading}
              style={{
                paddingVertical: 16, borderRadius: 16, marginBottom: 16,
                backgroundColor: loading ? colors.primarySoft : colors.primary,
                alignItems: "center",
                shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
              }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>إرسال كود التحقق</Text>
              }
            </Pressable>
          </>
        )}

        {/* DIVIDER */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>أو</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* REGISTER LINK */}
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={{
            paddingVertical: 14, borderRadius: 16,
            borderWidth: 2, borderColor: colors.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 15 }}>إنشاء حساب جديد</Text>
        </Pressable>
      </ScrollView>

      {/* ── COUNTRY PICKER MODAL ──────────────────────────────── */}
      <Modal visible={showCountry} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "75%", paddingTop: 16,
          }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text, textAlign: "center", marginBottom: 12 }}>اختر الدولة</Text>

            {/* Search */}
            <View style={{
              marginHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center",
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
              backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
            }}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="ابحث عن الدولة..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
              />
            </View>

            {/* List */}
            <FlatList
              data={searchCountries(countrySearch)}
              keyExtractor={item => item.iso}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = COUNTRIES[countryIdx].iso === item.iso;
                return (
                  <Pressable
                    onPress={() => {
                      const idx = COUNTRIES.findIndex(c => c.iso === item.iso);
                      if (idx >= 0) setCountryIdx(idx);
                      setShowCountry(false);
                      setCountrySearch("");
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12,
                      paddingVertical: 14, paddingHorizontal: 20,
                      backgroundColor: isSelected ? colors.primarySoft : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 }}>{item.nameAr}</Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>{item.code}</Text>
                    {isSelected && <Text style={{ fontSize: 16, color: colors.primary }}>✓</Text>}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20 }} />}
              style={{ maxHeight: 400 }}
            />

            <Pressable
              onPress={() => { setShowCountry(false); setCountrySearch(""); }}
              style={{ padding: 16, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.danger }}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* BG CIRCLES */}
      <View style={{ position: "absolute", top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.primarySoft, opacity: 0.7 }} />
      <View style={{ position: "absolute", bottom: 100, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.pinkSoft, opacity: 0.5 }} />
    </SafeAreaView>
  );
}
