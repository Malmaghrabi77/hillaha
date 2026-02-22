import React from "react";
import {
  View, Text, Pressable, Image,
  StatusBar, Dimensions,
} from "react-native";
import { router } from "expo-router";

const SCREEN = Dimensions.get("window");

export default function AuthIndex() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0F0A1E" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      {/* Background Glows */}
      <View pointerEvents="none" style={{
        position: "absolute", top: -80, right: -60,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: "rgba(139,92,246,0.18)",
      }} />
      <View pointerEvents="none" style={{
        position: "absolute", top: 200, left: -80,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: "rgba(236,72,153,0.12)",
      }} />
      <View pointerEvents="none" style={{
        position: "absolute", bottom: 150, right: -40,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(139,92,246,0.1)",
      }} />

      {/* LOGO SECTION */}
      <View style={{
        height: SCREEN.height * 0.52,
        alignItems: "center", justifyContent: "flex-end",
        paddingBottom: 30,
      }}>
        <View style={{ alignItems: "center" }}>
          <View style={{
            width: 140, height: 140, borderRadius: 70,
            backgroundColor: "rgba(139,92,246,0.15)",
            borderWidth: 1.5, borderColor: "rgba(139,92,246,0.35)",
            justifyContent: "center", alignItems: "center",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6, shadowRadius: 30, elevation: 12,
            marginBottom: 6,
          }}>
            <View style={{
              position: "absolute",
              width: 170, height: 170, borderRadius: 85,
              borderWidth: 1, borderColor: "rgba(139,92,246,0.15)",
            }} />
            <Image
              source={require("../../assets/hillaha-logo.png")}
              style={{ width: 100, height: 100, resizeMode: "contain" }}
            />
          </View>
        </View>

        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Text style={{
            fontSize: 42, fontWeight: "900", letterSpacing: -1,
            color: "white",
          }}>
            حلّها
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: "rgba(139,92,246,0.5)" }} />
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>
              كل اللي تحتاجه في مكان واحد
            </Text>
            <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: "rgba(236,72,153,0.5)" }} />
          </View>
        </View>
      </View>

      {/* SERVICES CHIPS */}
      <View style={{
        flexDirection: "row", justifyContent: "center",
        gap: 10, marginBottom: 36, flexWrap: "wrap", paddingHorizontal: 20,
      }}>
        {[
          { icon: "🍔", label: "مطاعم" },
          { icon: "💊", label: "صيدلية" },
          { icon: "🏥", label: "طبيب" },
          { icon: "🛵", label: "توصيل سريع" },
        ].map(s => (
          <View key={s.label} style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
          }}>
            <Text style={{ fontSize: 14 }}>{s.icon}</Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* BUTTONS */}
      <View style={{ paddingHorizontal: 24, gap: 12 }}>
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={{
            paddingVertical: 17, borderRadius: 18,
            backgroundColor: "#8B5CF6",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.55, shadowRadius: 16, elevation: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", textAlign: "center", fontSize: 17 }}>
            إنشاء حساب جديد
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={{
            paddingVertical: 16, borderRadius: 18,
            borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
            backgroundColor: "rgba(255,255,255,0.07)",
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "800", textAlign: "center", fontSize: 16 }}>
            تسجيل الدخول
          </Text>
        </Pressable>
      </View>

      {/* FOOTER */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 28, marginBottom: 20 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" }} />
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          متاح في قنا، مصر
        </Text>
        <Text style={{ fontSize: 12, color: "rgba(139,92,246,0.6)" }}>وقريباً في المملكة</Text>
      </View>
    </View>
  );
}
