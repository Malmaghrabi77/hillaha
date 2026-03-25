import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, Image,
  StatusBar, Platform, ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSupabase } from "../hooks/useSupabase";
import { analyticsTracker } from "../utils/analyticsTracker";
import { A11yPresets } from "../hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";

interface FavoritePartner {
  id: string;
  partner_id: string;
  created_at: string;
  partners: {
    id: string;
    name: string;
    type: string;
    cover_image: string | null;
    rating: number | null;
    review_count: number;
    delivery_time: string;
    delivery_fee: number;
  };
}

export default function Favorites() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [favorites, setFavorites] = useState<FavoritePartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.FAVORITES);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
    }, [])
  );

  async function fetchFavorites() {
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("favorites")
        .select(`
          id, partner_id, created_at,
          partners(id, name, type, cover_image, rating, review_count, delivery_time, delivery_fee)
        `)
        .eq("user_id", user.id)
        .eq("partners.is_approved", true)
        .order("created_at", { ascending: false });

      if (data) setFavorites(data as any);
    } catch (error) {
      console.log("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(partnerId: string) {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      analyticsTracker.trackEvent('favorite_removed', {
        partner_id: partnerId,
        timestamp: new Date().toISOString(),
      });

      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("partner_id", partnerId);

      fetchFavorites();
    } catch (error) {
      console.log("Error removing favorite:", error);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderColor: colors.border,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent(ANALYTICS_EVENTS.NAVIGATION.BACK_PRESSED, { screen: 'favorites' });
            router.back();
          }}
          {...A11yPresets.button()}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>❤️ المفضلة</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{favorites.length} متجر</Text>
        </View>
      </View>

      {favorites.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: "700" }}>لم تضف أي متجر للمفضلة</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>ابدأ بإضافة متاجرك المفضلة</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
          <View style={{ gap: 12 }}>
            {favorites.map(fav => {
              const p = fav.partners;
              return (
                <Pressable
                  key={fav.id}
                  onPress={() => {
                    analyticsTracker.trackEvent(ANALYTICS_EVENTS.FAVORITES.CARD_PRESSED, {
                      partner_id: p.id,
                      partner_name: p.name,
                    });
                    router.push(`/restaurant/${p.id}`);
                  }}
                  {...A11yPresets.button()}
                  style={{
                    borderRadius: 16, overflow: "hidden",
                    backgroundColor: colors.surface,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
                  }}
                >
                  {/* Cover Image */}
                  <View style={{ height: 140, overflow: "hidden", position: "relative" }}>
                    <Image
                      source={{ uri: p.cover_image || "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80" }}
                      style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                    />

                    {/* Remove Heart Button */}
                    <Pressable
                      onPress={() => removeFavorite(p.id)}
                      {...A11yPresets.button()}
                      accessibilityLabel={`إزالة ${p.name} من المفضلة`}
                      style={{
                        position: "absolute", top: 12, right: 12,
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: "rgba(255,255,255,0.95)",
                        justifyContent: "center", alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>❤️</Text>
                    </Pressable>
                  </View>

                  {/* Info */}
                  <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{p.type}</Text>
                      </View>
                      {p.rating && (
                        <View style={{
                          flexDirection: "row", alignItems: "center", gap: 2,
                          backgroundColor: "#FEF3C7",
                          paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8,
                        }}>
                          <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "900" }}>★</Text>
                          <Text style={{ fontSize: 12, fontWeight: "900", color: "#92400E" }}>
                            {p.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Meta Info */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 3,
                        backgroundColor: "#F9FAFB", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
                      }}>
                        <Text style={{ fontSize: 11 }}>🕐</Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151" }}>{p.delivery_time}</Text>
                      </View>
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 3,
                        backgroundColor: "#F9FAFB", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
                      }}>
                        <Text style={{ fontSize: 11 }}>🛵</Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151" }}>{p.delivery_fee} جنيه</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
