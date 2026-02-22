import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

const C = { bg: "#FAFAFF", surface: "#FFFFFF", border: "#E7E3FF", text: "#1F1B2E" } as const;

export default function Orders() {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: C.bg }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 12 }}>طلباتي</Text>
      <Pressable
        onPress={() => router.push('/tracking/demo')}
        style={{ padding: 16, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
      >
        <Text style={{ fontWeight: '900', color: C.text }}>تتبع طلب تجريبي</Text>
      </Pressable>
    </View>
  );
}
