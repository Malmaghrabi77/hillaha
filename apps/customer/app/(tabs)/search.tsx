import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { HALHA_THEME } from "@halha/ui";

const C = HALHA_THEME.colors;

const ALL = [
  { id: "1", name: "مطعم الشيف",    type: "مطاعم",   icon: "🍔", rating: "4.8" },
  { id: "2", name: "بيتزا ستار",    type: "مطاعم",   icon: "🍕", rating: "4.6" },
  { id: "3", name: "صيدلية النور",  type: "صيدليات", icon: "💊", rating: "4.9" },
  { id: "4", name: "كافيه ريلاكس", type: "كافيهات", icon: "☕", rating: "4.7" },
  { id: "5", name: "عيادة الأمل",   type: "طبيب",    icon: "🏥", rating: "4.8" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const results = query.length > 0
    ? ALL.filter(p => p.name.includes(query) || p.type.includes(query))
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 52 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 12 }}>بحث</Text>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: C.bg, borderRadius: 12,
          borderWidth: 1, borderColor: C.border,
          paddingHorizontal: 12, paddingVertical: 10, gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن مطعم، صيدلية، طبيب..."
            placeholderTextColor={C.textMuted}
            autoFocus
            style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {query.length === 0 && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.textMuted, marginBottom: 12 }}>الأكثر بحثاً</Text>
            {["مطاعم", "صيدليات", "كافيهات", "طبيب"].map(tag => (
              <Pressable key={tag} onPress={() => setQuery(tag)} style={{
                padding: 14, borderRadius: 14, marginBottom: 10,
                backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              }}>
                <Text style={{ fontWeight: "700", color: C.text }}>{tag}</Text>
                <Text style={{ color: C.textMuted }}>←</Text>
              </Pressable>
            ))}
          </View>
        )}

        {query.length > 0 && results.length === 0 && (
          <Text style={{ color: C.textMuted, textAlign: "center", marginTop: 40, fontSize: 15 }}>
            لا توجد نتائج لـ "{query}"
          </Text>
        )}

        {results.map(p => (
          <Pressable key={p.id} onPress={() => router.push(`/restaurant/${p.id}`)} style={{
            flexDirection: "row", alignItems: "center", gap: 14,
            padding: 14, borderRadius: 16, marginBottom: 10,
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
          }}>
            <View style={{
              width: 50, height: 50, borderRadius: 14,
              backgroundColor: C.primarySoft,
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 24 }}>{p.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: C.text, fontSize: 15 }}>{p.name}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{p.type}</Text>
            </View>
            <Text style={{ color: C.primary, fontWeight: "700" }}>⭐ {p.rating}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
