import React from "react";
import { View, Text } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: "#8B5CF6", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#FFFFFF", fontSize: 52, fontWeight: "bold" }}>حلّها ✓</Text>
      <Text style={{ color: "#FFFFFF", fontSize: 18, marginTop: 12 }}>JS يعمل</Text>
    </View>
  );
}
