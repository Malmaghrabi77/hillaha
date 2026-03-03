import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, Image, Modal,
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
  name: string;
  type: string;
  cover_image: string | null;
  rating: number | null;
  review_count: number;
  delivery_time: string;
  delivery_fee: number;
}

const POPULAR_TAGS = ["مطاعم", "شاورما", "برجر", "صيدلية", "قهوة وحلويات", "طبيب"];

const SORT_OPTIONS = [
  { id: "rating", label: "الأفضل تقييماً", icon: "⭐" },
  { id: "fastest", label: "الأسرع توصيلاً", icon: "🚀" },
  { id: "cheapest", label: "الأرخص توصيل", icon: "💰" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [sortBy, setSortBy] = useState("rating");
  const [minRating, setMinRating] = useState(0);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState(50);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function searchPartners() {
    const supabase = getSB();
    if (!supabase) return;

    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("partners")
        .select("id, name, type, cover_image, rating, review_count, delivery_time, delivery_fee")
        .eq("is_approved", true);

      // Search filter
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,type.ilike.%${query}%`);
      }

      // Rating filter
      if (minRating > 0) {
        queryBuilder = queryBuilder.gte("rating", minRating);
      }

      // Delivery fee filter
      queryBuilder = queryBuilder.lte("delivery_fee", maxDeliveryFee);

      // Sort
      if (sortBy === "rating") {
        queryBuilder = queryBuilder.order("rating", { ascending: false });
      } else if (sortBy === "fastest") {
        queryBuilder = queryBuilder.order("delivery_time", { ascending: true });
      } else if (sortBy === "cheapest") {
        queryBuilder = queryBuilder.order("delivery_fee", { ascending: true });
      }

      const { data } = await queryBuilder.limit(30);
      setResults((data as Partner[]) ?? []);
    } catch (error) {
      console.log("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() && minRating === 0 && maxDeliveryFee === 50) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchPartners();
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, minRating, maxDeliveryFee]);

  useEffect(() => {
    searchPartners();
  }, [sortBy]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{
        padding: 16, backgroundColor: C.surface,
        borderBottomWidth: 1, borderBottomColor: C.border,
        paddingTop: 52,
      }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 12 }}>بحث</Text>

        {/* Search Bar */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
        }}>
          <View style={{
            flex: 1, flexDirection: "row", alignItems: "center",
            backgroundColor: C.bg, borderRadius: 14,
            borderWidth: 1.5, borderColor: C.border,
            paddingHorizontal: 12, paddingVertical: 10,
          }}>
            <Text style={{ fontSize: 16, opacity: 0.5 }}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث عن مطعم، صيدلية..."
              placeholderTextColor={C.textMuted}
              autoFocus
              style={{ flex: 1, fontSize: 14, color: C.text, textAlign: "right", marginRight: 8 }}
            />
            {loading ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : query.length > 0 ? (
              <Pressable onPress={() => setQuery("")}>
                <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setShowFilters(true)}
            style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: C.primarySoft,
              justifyContent: "center", alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </Pressable>
        </View>

        {/* Sort Options */}
        {results.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {SORT_OPTIONS.map(opt => (
              <Pressable
                key={opt.id}
                onPress={() => setSortBy(opt.id)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
                  backgroundColor: sortBy === opt.id ? C.primary : C.bg,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: sortBy === opt.id ? C.primary : C.border,
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: "700",
                  color: sortBy === opt.id ? "white" : C.text,
                }}>
                  {opt.icon} {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 80 }}>
        {query.length === 0 && minRating === 0 && maxDeliveryFee === 50 && (
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

        {(query.length > 0 || minRating > 0 || maxDeliveryFee < 50) && !loading && results.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={{ color: C.textMuted, fontSize: 15, fontWeight: "700" }}>
              لا توجد نتائج
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
              جرب البحث بكلمات أخرى
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
            }}
          >
            <View style={{
              width: 70, height: 70, borderRadius: 14,
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
              <Text style={{ fontWeight: "900", color: C.text, fontSize: 14 }}>{p.name}</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{p.type}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                {p.rating ? (
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#F59E0B" }}>
                    ★ {p.rating.toFixed(1)} ({p.review_count})
                  </Text>
                ) : null}
                <Text style={{ fontSize: 10, color: C.textMuted }}>•</Text>
                <Text style={{ fontSize: 11, color: C.textMuted }}>🕐 {p.delivery_time}</Text>
              </View>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "900", color: C.primary }}>
                {p.delivery_fee} ج
              </Text>
              <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>توصيل</Text>
            </View>
          </Pressable>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{
            marginTop: "auto",
            backgroundColor: C.bg,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: 40, paddingHorizontal: 16, paddingTop: 20,
          }}>
            <View style={{
              width: 44, height: 5, borderRadius: 3,
              backgroundColor: "#E5E7EB",
              alignSelf: "center", marginBottom: 20,
            }} />

            <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 20 }}>
              تصفية النتائج
            </Text>

            {/* Min Rating */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 10 }}>
                التقييم الأدنى: ⭐ {minRating.toFixed(1)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[0, 3, 4, 4.5].map(val => (
                  <Pressable
                    key={val}
                    onPress={() => setMinRating(val)}
                    style={{
                      flex: 1, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: minRating === val ? C.primary : C.surface,
                      borderWidth: 1,
                      borderColor: minRating === val ? C.primary : C.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: "700",
                      color: minRating === val ? "white" : C.text,
                      textAlign: "center",
                    }}>
                      {val === 0 ? "الكل" : `${val}+`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Max Delivery Fee */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 10 }}>
                حد أقصى لرسوم التوصيل: {maxDeliveryFee} جنيه
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[15, 25, 50].map(val => (
                  <Pressable
                    key={val}
                    onPress={() => setMaxDeliveryFee(val)}
                    style={{
                      flex: 1, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: maxDeliveryFee === val ? C.primary : C.surface,
                      borderWidth: 1,
                      borderColor: maxDeliveryFee === val ? C.primary : C.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: "700",
                      color: maxDeliveryFee === val ? "white" : C.text,
                      textAlign: "center",
                    }}>
                      {val} ج
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  setMinRating(0);
                  setMaxDeliveryFee(50);
                }}
                style={{
                  flex: 1, borderWidth: 1.5, borderColor: C.primary,
                  paddingVertical: 13, borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: C.primary, fontWeight: "700", fontSize: 14 }}>إعادة تعيين</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilters(false)}
                style={{
                  flex: 1, backgroundColor: C.primary,
                  paddingVertical: 13, borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>تطبيق</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
