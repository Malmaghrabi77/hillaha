import React from "react";
import { View, Text, Pressable, StatusBar } from "react-native";
import { router } from "expo-router";
import { C, getSB } from "../_lib/constants";

export default function PendingApproval() {
  async function handleLogout() {
    const supabase = getSB();
    if (supabase) await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Decorative circles */}
      <View style={{ position: "absolute", top: -80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.primarySoft, opacity: 0.7 }} />
      <View style={{ position: "absolute", bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.pinkSoft, opacity: 0.6 }} />

      {/* Main content */}
      <View style={{ backgroundColor: C.surface, borderRadius: 28, padding: 32, borderWidth: 1, borderColor: C.border, elevation: 4, alignItems: "center", width: "100%" }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: C.warningSoft, justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
          <Text style={{ fontSize: 52 }}>⏳</Text>
        </View>

        <Text style={{ fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 12, textAlign: "center" }}>
          طلبك قيد المراجعة
        </Text>

        <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 24, marginBottom: 8 }}>
          تم استلام طلب التسجيل بنجاح وهو الآن{"\n"}
          تحت مراجعة الإدارة
        </Text>

        <View style={{ backgroundColor: C.primarySoft, borderRadius: 14, padding: 16, width: "100%", marginTop: 16, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, color: "#4C1D95", fontWeight: "700", textAlign: "center", lineHeight: 22 }}>
            سيتم إخطارك فور الموافقة على حسابك{"\n"}
            عادة ما يتم خلال 24 ساعة
          </Text>
        </View>

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
