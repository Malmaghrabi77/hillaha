import React from 'react';
import { View, Text } from 'react-native';

const C = { bg: "#FAFAFF", text: "#1F1B2E", textMuted: "#6B6480" } as const;

export default function Booking() {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: C.bg }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: C.text }}>حجز موعد طبيب</Text>
      <Text style={{ marginTop: 8, color: C.textMuted }}>قريباً</Text>
    </View>
  );
}
