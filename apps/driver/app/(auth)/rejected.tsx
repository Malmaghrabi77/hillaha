import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StatusBar, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { C, getSB } from "../_lib/constants";

export default function Rejected() {
  const [reason, setReason] = useState<string | null>(null);
  const [reapplying, setReapplying] = useState(false);

  useEffect(() => {
    loadRejectionReason();
  }, []);

  async function loadRejectionReason() {
    const supabase = getSB();
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;
    const { data } = await (supabase as any)
      .from("driver_applications")
      .select("rejection_reason")
      .eq("user_id", session.session.user.id)
      .single();
    if (data?.rejection_reason) setReason(data.rejection_reason);
  }

  async function handleReapply() {
    setReapplying(true);
    try {
      const supabase = getSB();
      if (!supabase) return;
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      const userId = session.session.user.id;

      // Delete old application so user can re-submit
      await (supabase as any)
        .from("driver_applications")
        .delete()
        .eq("user_id", userId);

      // Reset profile status
      await (supabase as any)
        .from("profiles")
        .update({ driver_application_status: null, is_approved: false })
        .eq("id", userId);

      // Navigate to registration (step2 — personal info already on file)
      router.replace("/(auth)/register/step2-vehicle");
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء إعادة التقديم. حاول مرة أخرى.");
    } finally {
      setReapplying(false);
    }
  }

  async function handleLogout() {
    const supabase = getSB();
    if (supabase) await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.dangerSoft, opacity: 0.5 }} />

      <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 32, borderWidth: 1, borderColor: C.border, elevation: 4, alignItems: "center", width: "100%" }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: C.dangerSoft, justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
          <Text style={{ fontSize: 52 }}>❌</Text>
        </View>

        <Text style={{ fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 12, textAlign: "center" }}>
          تم رفض الطلب
        </Text>

        <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 24, marginBottom: 8 }}>
          للأسف تم رفض طلب تسجيلك كمندوب
        </Text>

        {reason && (
          <View style={{ backgroundColor: C.dangerSoft, borderRadius: 14, padding: 16, width: "100%", marginTop: 8, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.danger, marginBottom: 4 }}>سبب الرفض:</Text>
            <Text style={{ fontSize: 13, color: "#7F1D1D", lineHeight: 22 }}>{reason}</Text>
          </View>
        )}

        <View style={{ backgroundColor: C.primarySoft, borderRadius: 14, padding: 16, width: "100%", marginTop: 8, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, color: "#4C1D95", fontWeight: "700", textAlign: "center", lineHeight: 22 }}>
            يمكنك إعادة التقديم بعد تصحيح البيانات{"\n"}
            أو التواصل مع الدعم الفني
          </Text>
        </View>

        <Pressable
          onPress={handleReapply}
          disabled={reapplying}
          style={{ width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: C.primary, elevation: 4, marginBottom: 12 }}
        >
          {reapplying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>إعادة التقديم</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleLogout}
          style={{ width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: C.danger }}
        >
          <Text style={{ color: C.danger, fontWeight: "900", fontSize: 15 }}>تسجيل الخروج</Text>
        </Pressable>
      </View>
    </View>
  );
}
