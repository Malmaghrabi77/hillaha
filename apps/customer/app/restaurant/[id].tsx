import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, Pressable, Animated, Alert, Image, ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCart } from "../../lib/cartStore";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { useSupabase } from "../../src/hooks/useSupabase";
import { analyticsTracker } from "../../src/utils/analyticsTracker";
import { A11yPresets } from "../../src/hooks/useAccessibility";
import { SafeAreaScrollView, SafeAreaDisplay } from "../../src/components";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

interface PartnerData {
  id: string;
  name: string;
  name_ar: string;
  type: string;
  cover_image: string | null;
  rating: number | null;
  review_count: number;
  delivery_time: string;
  delivery_fee: number;
  is_open: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  is_popular: boolean;
}

interface MenuSection {
  category: string;
  items: MenuItem[];
}

export default function Restaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerId = id ?? "";
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();

  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [menu, setMenu] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const cartBarAnim = useRef(new Animated.Value(0)).current;
  const cartStore = useCart();

  useEffect(() => {
    analyticsTracker.trackScreenView("restaurant_screen", { partnerId });
    loadData();
  }, [partnerId]);

  const loadData = async () => {
    if (!supabase || !partnerId) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      // Fetch partner info
      const { data: p, error: pErr } = await (supabase as any)
        .from("partners")
        .select("id, name, name_ar, type, cover_image, rating, review_count, delivery_time, delivery_fee, is_open")
        .eq("id", partnerId)
        .single();

      if (pErr || !p) {
        setError(true);
        setLoading(false);
        return;
      }

      setPartner(p);

      // Fetch menu items
      const { data: items } = await (supabase as any)
        .from("menu_items")
        .select("id, name, name_ar, description, price, image, category, is_popular")
        .eq("partner_id", partnerId)
        .eq("is_available", true)
        .order("is_popular", { ascending: false })
        .order("created_at", { ascending: true });

      // Group by category
      const categoryMap = new Map<string, MenuItem[]>();
      if (items && items.length > 0) {
        for (const item of items) {
          const cat = item.category || "أخرى";
          if (!categoryMap.has(cat)) categoryMap.set(cat, []);
          categoryMap.get(cat)!.push(item);
        }
      }

      const sections: MenuSection[] = [];
      for (const [category, catItems] of categoryMap) {
        sections.push({ category, items: catItems });
      }

      setMenu(sections);
    } catch (err) {
      console.error("Error loading restaurant:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Initialize cart bar if items already in cart
  useEffect(() => {
    if (cartStore.totalItems > 0) {
      cartBarAnim.setValue(1);
    }
  }, []);

  const totalItems = cartStore.totalItems;
  const totalPrice = cartStore.subtotal;

  const partnerName = partner?.name_ar || partner?.name || "";

  function addItem(item: MenuItem) {
    analyticsTracker.trackEvent("add_item_to_cart", { itemId: item.id, itemName: item.name_ar || item.name, price: item.price, partnerId });
    if (cartStore.hasConflict(partnerId)) {
      Alert.alert(
        "سلة من متجر آخر",
        "السلة تحتوي على منتجات من متجر آخر. هل تريد مسح السلة والبدء من جديد؟",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "مسح السلة",
            style: "destructive",
            onPress: () => {
              cartStore.clearCart();
              cartStore.addItem({
                id: item.id, name: item.name_ar || item.name, nameAr: item.name_ar || item.name,
                price: item.price, image: item.image || "",
                partnerId, partnerName,
              });
            },
          },
        ]
      );
      return;
    }

    const wasEmpty = totalItems === 0;
    cartStore.addItem({
      id: item.id, name: item.name_ar || item.name, nameAr: item.name_ar || item.name,
      price: item.price, image: item.image || "",
      partnerId, partnerName,
    });

    if (wasEmpty) {
      Animated.spring(cartBarAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    }
  }

  function removeItem(itemId: string) {
    analyticsTracker.trackEvent("remove_item_from_cart", { itemId, partnerId });
    const qty = cartStore.items[itemId]?.qty ?? 0;
    cartStore.removeItem(itemId);
    if (qty <= 1 && totalItems <= 1) {
      Animated.timing(cartBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }

  const cartBarTranslate = cartBarAnim.interpolate({
    inputRange: [0, 1], outputRange: [100, 0],
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaDisplay variant="fullscreen" safeTop={false} safeBottom={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 14 }}>جاري التحميل...</Text>
        </View>
      </SafeAreaDisplay>
    );
  }

  // Error state
  if (error || !partner) {
    return (
      <SafeAreaDisplay variant="fullscreen" safeTop={false} safeBottom={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏪</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 8 }}>المتجر غير متوفر</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24 }}>
            لم نتمكن من تحميل بيانات المتجر. تأكد من اتصالك بالإنترنت.
          </Text>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")}
            style={{ backgroundColor: C.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>العودة</Text>
          </Pressable>
        </View>
      </SafeAreaDisplay>
    );
  }

  return (
    <SafeAreaDisplay variant="fullscreen" safeTop={false} safeBottom={false}>
      {/* ── IMMERSIVE COVER ──────────────────────────────────── */}
      <View style={{ height: 240, overflow: "hidden" }}>
        {partner.cover_image ? (
          <Image
            source={{ uri: partner.cover_image }}
            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          />
        ) : (
          <View style={{ width: "100%", height: "100%", backgroundColor: C.primarySoft, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 64 }}>🏪</Text>
          </View>
        )}
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 90,
          backgroundColor: "rgba(0,0,0,0.38)",
        }} />
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          backgroundColor: "rgba(0,0,0,0.30)",
        }} />

        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("restaurant_close");
            router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
          }}
          {...A11yPresets.pressable}
          style={{
            position: "absolute", top: 52, right: 16,
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: colors.surface,
            justifyContent: "center", alignItems: "center",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 18 }}>✕</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("restaurant_chat", { partnerId });
            router.push(`/chat/partner/${partnerId}` as any);
          }}
          {...A11yPresets.pressable}
          style={{
            position: "absolute", top: 52, right: 62,
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: colors.surface,
            justifyContent: "center", alignItems: "center",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 18 }}>💬</Text>
        </Pressable>

        <View style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
          <Text style={{
            fontSize: 24, fontWeight: "900", color: "white",
            textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
          }}>
            {partnerName}
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
            {partner.type}
          </Text>
        </View>
      </View>

      {/* ── RESTAURANT INFO ──────────────────────────────────── */}
      <View style={{
        backgroundColor: colors.surface,
        paddingTop: 14, paddingHorizontal: 18, paddingBottom: 0,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { icon: "🕐", label: partner.delivery_time },
              { icon: "🛵", label: `توصيل ${partner.delivery_fee} جنيه` },
              { icon: partner.is_open ? "🟢" : "🔴", label: partner.is_open ? "متاح الآن" : "مغلق" },
            ].map((m, i) => (
              <View key={i} style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: colors.lightBg2, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 10,
                borderWidth: 1, borderColor: colors.lightBg3,
              }}>
                <Text style={{ fontSize: 11 }}>{m.icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={{
            backgroundColor: colors.lightBg1, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12,
            flexDirection: "row", alignItems: "center", gap: 4,
          }}>
            <Text style={{ fontSize: 13, color: colors.ratingText, fontWeight: "900" }}>★</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.ratingDark }}>
              {partner.rating ? Number(partner.rating).toFixed(1) : "—"}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>({partner.review_count})</Text>
          </View>
        </View>

        {menu.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 4, paddingBottom: 0 }}
            style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
          >
            {menu.map((section, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  analyticsTracker.trackEvent("change_menu_tab", { category: section.category });
                  setActiveTab(i);
                }}
                {...A11yPresets.pressable}
                style={{
                  paddingVertical: 10, paddingHorizontal: 16,
                  borderBottomWidth: 2.5,
                  borderBottomColor: activeTab === i ? C.primary : "transparent",
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: activeTab === i ? "900" : "600",
                  color: activeTab === i ? C.primary : colors.textMuted,
                }}>
                  {section.category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── MENU ITEMS ──────────────────────────────────────── */}
      <SafeAreaScrollView variant="page" contentContainerStyle={{ paddingBottom: 120 }}>
        {menu.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: "700" }}>
              لا توجد منتجات حالياً
            </Text>
          </View>
        ) : (
          menu[activeTab]?.items.map((item) => (
            <View key={item.id} style={{
              flexDirection: "row", alignItems: "center",
              padding: 14, borderRadius: 18, marginBottom: 12,
              backgroundColor: colors.surface,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
              borderWidth: 1, borderColor: colors.lightBg2,
            }}>
              <View style={{
                width: 78, height: 78, borderRadius: 18, overflow: "hidden",
                marginLeft: 14, position: "relative",
                shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
              }}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                  />
                ) : (
                  <View style={{ width: "100%", height: "100%", backgroundColor: C.primarySoft, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 28 }}>🍽️</Text>
                  </View>
                )}
                {item.is_popular && (
                  <View style={{
                    position: "absolute", top: 0, right: 0,
                    backgroundColor: colors.danger, paddingVertical: 3, paddingHorizontal: 6,
                    borderBottomLeftRadius: 10,
                  }}>
                    <Text style={{ color: "white", fontSize: 8, fontWeight: "900" }}>شائع</Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>{item.name_ar || item.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={{ color: C.primary, fontWeight: "900", fontSize: 16, marginTop: 6 }}>
                  {item.price} جنيه
                </Text>
              </View>

              {cartStore.items[item.id]?.qty ? (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  backgroundColor: colors.primarySoft, borderRadius: 14, padding: 4,
                }}>
                  <Pressable
                    onPress={() => removeItem(item.id)}
                    {...A11yPresets.pressable}
                    style={{
                      width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface,
                      justifyContent: "center", alignItems: "center",
                      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "900", color: C.primary }}>−</Text>
                  </Pressable>
                  <Text style={{ fontWeight: "900", color: C.primary, fontSize: 16, minWidth: 22, textAlign: "center" }}>
                    {cartStore.items[item.id].qty}
                  </Text>
                  <Pressable
                    onPress={() => addItem(item)}
                    {...A11yPresets.pressable}
                    style={{
                      width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary,
                      justifyContent: "center", alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "900", color: "white" }}>+</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => addItem(item)}
                  {...A11yPresets.pressable}
                  style={{
                    width: 38, height: 38, borderRadius: 12, backgroundColor: C.primary,
                    justifyContent: "center", alignItems: "center",
                    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "white" }}>+</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </SafeAreaScrollView>

      {/* ── FLOATING CART BAR ───────────────────────────────── */}
      {totalItems > 0 && (
        <Animated.View style={{
          position: "absolute", bottom: 0, left: 0, right: 0, padding: 16,
          transform: [{ translateY: cartBarTranslate }],
        }}>
          <Pressable
            onPress={() => {
              analyticsTracker.trackEvent("view_cart", { totalItems, totalPrice });
              router.push("/cart");
            }}
            {...A11yPresets.pressable}
            style={{
              backgroundColor: C.primary, borderRadius: 20,
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingVertical: 16, paddingHorizontal: 20,
              shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
            }}
          >
            <View style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              width: 34, height: 34, borderRadius: 10,
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>{totalItems}</Text>
            </View>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>عرض السلة</Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 16 }}>
              {totalPrice} جنيه
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaDisplay>
  );
}
