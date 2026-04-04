import React, { useState } from "react";
import { View, Text, Pressable, Image, StatusBar, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useRegistration } from "../../../lib/registration-context";
import { uploadDriverDocuments } from "../../../lib/upload-helpers";
import { C, VEHICLE_LABELS, IDENTITY_LABELS } from "../../../lib/constants";
import { getSB } from "../../../lib/constants";

const TOTAL_STEPS = 7;

export default function Step7Review() {
  const { data } = useRegistration();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isBicycle = data.vehicleType === "bicycle";

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const supabase = getSB();
      if (!supabase) throw new Error("خطأ في الاتصال");

      // Check if user is already signed in (re-apply case)
      const { data: existingSession } = await supabase.auth.getSession();
      let userId: string;

      if (existingSession?.session?.user) {
        // Re-apply: user already has an account
        userId = existingSession.session.user.id;
      } else {
        // New registration: create auth user
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          options: {
            data: { full_name: data.fullName.trim(), phone: data.phone.trim(), role: "driver" },
          },
        });
        if (signUpErr) throw signUpErr;
        if (!authData.user) throw new Error("فشل إنشاء الحساب");
        userId = authData.user.id;
      }

      // 2. Upload all documents
      const urls = await uploadDriverDocuments(supabase, userId, {
        identityPhotoUri: data.identityPhotoUri!,
        licensePhotoUri: data.licensePhotoUri,
        vehiclePhotoUri: data.vehiclePhotoUri,
        selfieUri: data.selfieUri!,
      });

      // 3. Parse license expiry date
      let expiryDate: string | null = null;
      if (data.licenseExpiryDate) {
        const parts = data.licenseExpiryDate.split("/");
        if (parts.length === 3) {
          expiryDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      // 4. Insert or update driver application (upsert for re-apply)
      const { error: appErr } = await (supabase as any).from("driver_applications").upsert({
        user_id: userId,
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        vehicle_type: data.vehicleType,
        vehicle_plate: isBicycle ? null : data.vehiclePlate.trim() || null,
        identity_type: data.identityType,
        identity_number: data.identityNumber.trim(),
        identity_photo_url: urls.identityPhotoUrl,
        license_number: isBicycle ? null : data.licenseNumber.trim() || null,
        license_expiry_date: isBicycle ? null : expiryDate,
        license_photo_url: urls.licensePhotoUrl,
        vehicle_photo_url: urls.vehiclePhotoUrl,
        selfie_url: urls.selfieUrl,
        ocr_result: data.ocrResult,
        status: "pending",
      });
      if (appErr) throw appErr;

      // 5. Update profiles (role is set by handle_new_user trigger, not client)
      await (supabase as any).from("profiles").upsert({
        id: userId,
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        avatar_url: urls.selfieUrl,
        vehicle_type: data.vehicleType,
        is_approved: false,
        driver_application_status: "pending",
        max_delivery_distance_km: isBicycle ? 2 : null,
      });

      Alert.alert(
        "تم إرسال الطلب!",
        "سيتم مراجعة طلبك من قبل الإدارة. سنخطرك فور الموافقة.",
        [{ text: "حسناً", onPress: () => router.replace("/(auth)/pending-approval") }]
      );
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("already registered") || msg.includes("User already registered")) {
        setError("هذا البريد الإلكتروني مسجل مسبقاً");
      } else {
        setError("حدث خطأ: " + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, color: C.textMuted }}>→</Text>
        </Pressable>

        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>مراجعة الطلب</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>تأكد من جميع البيانات قبل الإرسال</Text>
        </View>

        {/* Progress - full */}
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: C.primary }} />
          ))}
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: C.dangerSoft }}>
            <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : null}

        {/* Personal info section */}
        <Section title="البيانات الشخصية" icon="👤" editStep="step1-personal">
          <InfoRow label="الاسم" value={data.fullName} />
          <InfoRow label="الهاتف" value={data.phone} />
          <InfoRow label="الإيميل" value={data.email} />
        </Section>

        {/* Vehicle section */}
        <Section title="المركبة" icon="🚗" editStep="step2-vehicle">
          <InfoRow label="النوع" value={VEHICLE_LABELS[data.vehicleType || ""] || "—"} />
          {!isBicycle && <InfoRow label="رقم اللوحة" value={data.vehiclePlate || "—"} />}
        </Section>

        {/* Identity section */}
        <Section title="إثبات الهوية" icon="🪪" editStep="step3-identity">
          <InfoRow label="نوع الهوية" value={IDENTITY_LABELS[data.identityType || ""] || "—"} />
          <InfoRow label="رقم الهوية" value={data.identityNumber} />
          {data.identityPhotoUri && (
            <Image source={{ uri: data.identityPhotoUri }} style={{ width: "100%", height: 120, borderRadius: 12, marginTop: 8 }} resizeMode="cover" />
          )}
        </Section>

        {/* License section */}
        {!isBicycle && (
          <Section title="رخصة المركبة" icon="📄" editStep="step4-license">
            <InfoRow label="رقم الرخصة" value={data.licenseNumber || "—"} />
            <InfoRow label="تاريخ الانتهاء" value={data.licenseExpiryDate || "—"} />
            {data.licensePhotoUri && (
              <Image source={{ uri: data.licensePhotoUri }} style={{ width: "100%", height: 120, borderRadius: 12, marginTop: 8 }} resizeMode="cover" />
            )}
          </Section>
        )}

        {/* Vehicle photo */}
        <Section title={isBicycle ? "صورة الدراجة" : "صورة المركبة"} icon={isBicycle ? "🚲" : "🚗"} editStep="step5-photos">
          {data.vehiclePhotoUri && (
            <Image source={{ uri: data.vehiclePhotoUri }} style={{ width: "100%", height: 140, borderRadius: 12 }} resizeMode="cover" />
          )}
        </Section>

        {/* Selfie */}
        <Section title="الصورة الشخصية" icon="📸" editStep="step6-selfie">
          {data.selfieUri && (
            <View style={{ alignItems: "center" }}>
              <Image source={{ uri: data.selfieUri }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.primary }} />
            </View>
          )}
        </Section>

        {/* Submit button */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            paddingVertical: 18, borderRadius: 16, alignItems: "center", marginBottom: 40,
            backgroundColor: loading ? "#E5E7EB" : C.success, elevation: loading ? 0 : 6,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>إرسال الطلب للمراجعة</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, editStep, children }: { title: string; icon: string; editStep: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14, elevation: 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
          <Text style={{ fontSize: 15, fontWeight: "900", color: C.text }}>{title}</Text>
        </View>
        <Pressable onPress={() => router.push(`/(auth)/register/${editStep}` as any)}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.primary }}>تعديل</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, color: C.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{value}</Text>
    </View>
  );
}
