import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, Image,
} from "react-native";
import { router } from "expo-router";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF",      surface: "#FFFFFF",
  border: "#E7E3FF",  text: "#1F1B2E",
  textMuted: "#6B6480",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

interface Partner {
  id: string;
  name_ar: string;
  category: string;
  rating: number | null;
  delivery_time: string | null;
  delivery_fee: number | null;
  cover_image: string | null;
}

const POPULAR_TAGS = ["مطاعم", "شاورما", "برجر", "صيدلية", "قهوة وحلويات", "طبيب"];

export default function Search() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      const supabase = getSB();
      if (!supabase) return;
      setLoading(true);
      try {
        const { data } = await supabase
          .from("partners")
          .select("id, name_ar, category, rating, delivery_time, delivery_fee, cover_image")
          .or(`name_ar.ilike.%${query}%,name.ilike.%${query}%,category.ilike.%${query}%`)
          .order("rating", { ascending: false })
          .limit(20);
        setResults((data as Partner[]) ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{
        padding: 16, backgroundColor: C.surface,
        borderBottomWidth: 1, borderBottomColor: C.border,
        paddingTop: 52,
      }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 12 }}>بحث</Text>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: C.bg, borderRadius: 14,
          borderWidth: 1.5, borderColor: C.border,
          paddingHorizontal: 12, paddingVertical: 10, gap: 8,
        }}>
          <Text style={{ fontSize: 16, opacity: 0.5 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن مطعم، صيدلية، طبيب..."
            placeholderTextColor={C.textMuted}
            autoFocus
            style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right" }}
          />
          {loading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : query.length > 0 ? (
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {query.length === 0 && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.textMuted, marginBottom: 12 }}>
              الأكثر بحثاً
            </Text>
            {POPULAR_TAGS.map(tag => (
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

        {query.length > 0 && !loading && results.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={{ color: C.textMuted, fontSize: 15, fontWeight: "700" }}>
              لا توجد نتائج لـ "{query}"
            </Text>
          </View>
        )}

        {results.map(p => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/restaurant/${p.id}`)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              padding: 12, borderRadius: 18, marginBottom: 10,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}
          >
            <View style={{
              width: 60, height: 60, borderRadius: 14,
              backgroundColor: C.primarySoft, overflow: "hidden",
            }}>
              {p.cover_image ? (
                <Image
                  source={{ uri: p.cover_image }}
                  style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 26 }}>🏪</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: C.text, fontSize: 15 }}>{p.name_ar}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{p.category}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                {p.rating != null && (
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#F59E0B" }}>
                    ★ {Number(p.rating).toFixed(1)}
                  </Text>
                )}
                {p.delivery_time && (
                  <Text style={{ fontSize: 11, color: C.textMuted }}>🕐 {p.delivery_time}</Text>
                )}
              </View>
            </View>
            <View style={{ backgroundColor: C.primarySoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 }}>
              <Text style={{ color: C.primary, fontWeight: "900", fontSize: 12 }}>
                {p.delivery_fee != null ? `${p.delivery_fee} ج` : "اطلب"}
              </Text>
            </View>
          </Pressable>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
