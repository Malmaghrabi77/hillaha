import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, Pressable,
  ScrollView, Image, ActivityIndicator,
  Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getCustomerSupabase as getSupabase } from "../../lib/supabase";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { COUNTRIES, detectCountryIndex, searchCountries, type CountryCode } from "../../src/constants/countryCodes";

type AuthMode = "email" | "phone";

export default function Register() {
  const { colors } = useDarkMode();
  const [authMode, setAuthMode]     = useState<AuthMode>("email");
  const [countryIdx, setCountryIdx] = useState(() => detectCountryIndex());
  const [showCountry, setShowCountry] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [name, setName]             = useState("");
  const [phone, setPhone]           = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  // OTP state
  const [otpSent, setOtpSent]       = useState(false);
  const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Email registration (unchanged) ──────────────────────────────────
  async function handleEmailRegister() {
    setError("");
    if (!name.trim())             return setError("يرجى إدخال الاسم الكامل");
    if (!phone.trim())            return setError("يرجى إدخال رقم الهاتف");
    if (!email.trim())            return setError("يرجى إدخال البريد الإلكتروني");
    if (password.length < 8)      return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (password !== confirm)     return setError("كلمتا المرور غير متطابقتين");
    if (!agreed)                  return setError("يجب الموافقة على الشروط والأحكام للمتابعة");

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال — تأكد من استقرار الإنترنت");

      const { error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            role: "customer",
          },
        },
      });
      if (err) throw err;
      setSuccess(true);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("already registered") || msg.includes("User already registered")) {
        setError("هذا البريد الإلكتروني مسجل بالفعل — يمكنك تسجيل الدخول");
      } else if (msg.includes("Password should be")) {
        setError("كلمة المرور ضعيفة جداً، استخدم حروف وأرقام");
      } else if (msg.includes("invalid")) {
        setError("صيغة البريد الإلكتروني غير صحيحة");
      } else {
        setError(`خطأ: ${msg || "حدث خطأ، يرجى المحاولة مرة أخرى"}`);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Phone OTP: send code ────────────────────────────────────────────
  async function handlePhoneSendOtp() {
    setError("");
    if (!name.trim())    return setError("يرجى إدخال الاسم الكامل");
    if (!phone.trim())   return setError("يرجى إدخال رقم الهاتف");
    if (!agreed)         return setError("يجب الموافقة على الشروط والأحكام للمتابعة");

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
        setError("خدمة الرسائل القصيرة غير متاحة حالياً — يرجى التسجيل بالبريد الإلكتروني");
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

      // Update user metadata with name
      await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          role: "customer",
        },
      });

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

  // ── OTP input handler ───────────────────────────────────────────────
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

  // ── Resend OTP ──────────────────────────────────────────────────────
  async function handleResendOtp() {
    if (resendTimer > 0) return;
    await handlePhoneSendOtp();
  }

  // ── Mask phone for display ──────────────────────────────────────────
  function maskedPhone() {
    const p = phone.trim();
    if (p.length <= 4) return p;
    return p.slice(0, 4) + "****" + p.slice(-2);
  }

  // ══════════════════════════════════════════════════════════════════════
  // EMAIL SUCCESS SCREEN
  // ══════════════════════════════════════════════════════════════════════
  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 45,
          backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center", marginBottom: 20,
        }}>
          <Text style={{ fontSize: 44 }}>✓</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, marginBottom: 10 }}>
          تم إنشاء حسابك!
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: "center", lineHeight: 22, fontSize: 14, marginBottom: 30 }}>
          تم إرسال رابط تأكيد إلى بريدك الإلكتروني{"\n"}
          <Text style={{ fontWeight: "700", color: colors.primary }}>{email}</Text>
          {"\n"}يرجى تأكيد الحساب ثم تسجيل الدخول
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{
            width: "100%", paddingVertical: 16, borderRadius: 16,
            backgroundColor: colors.primary,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", textAlign: "center", fontSize: 16 }}>
            تسجيل الدخول
          </Text>
        </Pressable>
      </View>
    );
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
  // MAIN REGISTRATION FORM
  // ══════════════════════════════════════════════════════════════════════
  const selectedCountry = COUNTRIES[countryIdx];

  const fields = authMode === "email" ? [
    { label: "الاسم الكامل",      value: name,  setter: setName,  icon: "👤", keyboard: "default",        placeholder: "مصطفى محمد" },
    { label: "رقم الهاتف",        value: phone, setter: setPhone, icon: "📞", keyboard: "phone-pad",      placeholder: "01012345678" },
    { label: "البريد الإلكتروني", value: email, setter: setEmail, icon: "✉️",  keyboard: "email-address",  placeholder: "example@email.com" },
  ] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <View style={{
        position: "absolute", top: -60, left: -50,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: colors.pinkSoft, opacity: 0.6,
      }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Image
            source={require("../../assets/hillaha-logo.png")}
            style={{ width: 80, height: 80, resizeMode: "contain", marginBottom: 16 }}
          />
          <View style={{ alignItems: "center", marginBottom: 16 }}>
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
          <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>إنشاء حساب جديد</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>انضم لحلّها دلوقتي</Text>
        </View>

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
          <View style={{
            padding: 12, borderRadius: 12, marginBottom: 16,
            backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
          }}>
            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* TEXT FIELDS — email mode */}
        {fields && fields.map((f, i) => (
          <View key={`email-${i}`} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>
              {f.label}
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center",
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
              backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>{f.icon}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.setter as any}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.keyboard as any}
                autoCapitalize="none"
                style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
              />
            </View>
          </View>
        ))}

        {/* PHONE MODE FIELDS */}
        {authMode === "phone" && (
          <>
            {/* Name */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>الاسم الكامل</Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
                backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
              }}>
                <Text style={{ fontSize: 18 }}>👤</Text>
                <TextInput
                  value={name} onChangeText={setName}
                  placeholder="مصطفى محمد" placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
              </View>
            </View>

            {/* Phone with country picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>رقم الهاتف</Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
                backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
              }}>
                <Pressable
                  onPress={() => { setShowCountry(true); setCountrySearch(""); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text style={{ fontSize: 20 }}>{selectedCountry.flag}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>{selectedCountry.code}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>▼</Text>
                </Pressable>
                <TextInput
                  value={phone} onChangeText={setPhone}
                  placeholder="01012345678" placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
              </View>
            </View>
          </>
        )}

        {/* PASSWORD (email mode only) */}
        {authMode === "email" && (
          <>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>
                كلمة المرور
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
                backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
              }}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="8 أحرف على الأقل"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
                <Pressable onPress={() => setShowPass(v => !v)}>
                  <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 6 }}>
                تأكيد كلمة المرور
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                borderWidth: 1.5,
                borderColor: confirm && confirm !== password ? "#FECACA" : colors.border,
                borderRadius: 14,
                backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
              }}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="أعد كتابة كلمة المرور"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}
                />
                {confirm.length > 0 && (
                  <Text style={{ fontSize: 16 }}>{confirm === password ? "✅" : "❌"}</Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* CONSENT CHECKBOX */}
        <Pressable
          onPress={() => setAgreed(v => !v)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            padding: 14, borderRadius: 14, marginBottom: 20,
            backgroundColor: agreed ? colors.primarySoft : colors.surface,
            borderWidth: 1.5, borderColor: agreed ? colors.primary : colors.border,
          }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 8,
            borderWidth: 2, borderColor: agreed ? colors.primary : colors.border,
            backgroundColor: agreed ? colors.primary : "transparent",
            justifyContent: "center", alignItems: "center",
          }}>
            {agreed && <Text style={{ color: "white", fontSize: 14, fontWeight: "900" }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 }}>
            أوافق على{" "}
            <Text
              style={{ color: colors.primary, fontWeight: "700" }}
              onPress={() => router.push("/legal/consent")}
            >
              الشروط والأحكام
            </Text>
            {" "}بما فيها ضمان رضا العميل
          </Text>
        </Pressable>

        {/* REGISTER BUTTON */}
        <Pressable
          onPress={authMode === "email" ? handleEmailRegister : handlePhoneSendOtp}
          disabled={loading}
          style={{
            paddingVertical: 16, borderRadius: 16, marginBottom: 16,
            backgroundColor: loading ? colors.primarySoft : colors.pink,
            alignItems: "center",
            shadowColor: colors.pink, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                {authMode === "email" ? "إنشاء الحساب" : "إرسال كود التحقق"}
              </Text>
          }
        </Pressable>

        {/* LOGIN LINK */}
        <Pressable onPress={() => router.replace("/(auth)/login")} style={{ alignItems: "center" }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            عندك حساب بالفعل؟{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>تسجيل الدخول</Text>
          </Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* COUNTRY PICKER MODAL */}
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
              onPress={() => setShowCountry(false)}
              style={{ padding: 16, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border }}
            >
              <Text style={{ fontWeight: "700", color: colors.textMuted, fontSize: 15 }}>إغلاق</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
