import React, { useState, useRef } from "react";
import {
  View, Text, Pressable, ScrollView,
  StatusBar, Animated, Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { HALHA_THEME } from "@halha/ui";

const C = HALHA_THEME.colors;

// ─── Data ───────────────────────────────────────────────────────────────────

const RESTAURANTS: Record<string, {
  name: string; type: string; rating: string; reviewCount: string;
  time: string; fee: string; coverImage: string;
  promo?: string;
  menu: {
    category: string;
    items: {
      name: string; price: number; desc: string;
      image: string; popular?: boolean;
    }[];
  }[];
}> = {
  "1": {
    name: "مطعم الشيف", type: "مطاعم", rating: "4.8", reviewCount: "340+",
    time: "25-35 دقيقة", fee: "15 جنيه",
    coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=90",
    promo: "اطلب أكتر من 100 جنيه واحصل على مشروب مجاني",
    menu: [
      {
        category: "الأكثر طلباً 🔥",
        items: [
          {
            name: "برجر كلاسيك",   price: 85,
            desc: "لحمة بقري مشوية مع جبن وخس وطماطم",
            image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80",
            popular: true,
          },
          {
            name: "تشيكن برجر",    price: 75,
            desc: "فيليه دجاج مقرمش مع صوص خاص",
            image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=200&q=80",
            popular: true,
          },
        ],
      },
      {
        category: "الوجبات الرئيسية",
        items: [
          {
            name: "بيتزا لحمة",    price: 120,
            desc: "عجينة طازجة مع لحمة مفرومة وموزاريلا",
            image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
          },
          {
            name: "باستا بولونيز",  price: 95,
            desc: "باستا بصوص اللحمة الإيطالي",
            image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&q=80",
          },
        ],
      },
      {
        category: "المشروبات",
        items: [
          {
            name: "كوكاكولا",      price: 20,
            desc: "علبة 330 مل",
            image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&q=80",
          },
          {
            name: "عصير ليمون",    price: 25,
            desc: "طازج بالنعناع",
            image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&q=80",
          },
        ],
      },
    ],
  },
  "2": {
    name: "بيتزا ستار", type: "مطاعم", rating: "4.6", reviewCount: "210+",
    time: "30-40 دقيقة", fee: "15 جنيه",
    coverImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=90",
    menu: [
      {
        category: "البيتزا",
        items: [
          {
            name: "بيتزا مارجريتا",    price: 90,
            desc: "طماطم وجبن موزاريلا وريحان",
            image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80",
            popular: true,
          },
          {
            name: "بيتزا خضار",        price: 95,
            desc: "فلفل وبصل وزيتون وفطر",
            image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80",
          },
          {
            name: "بيتزا لحمة وجبن",   price: 130,
            desc: "لحمة مفرومة وجبن أصفر",
            image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
          },
        ],
      },
    ],
  },
  "3": {
    name: "صيدلية النور", type: "صيدليات", rating: "4.9", reviewCount: "520+",
    time: "20-30 دقيقة", fee: "10 جنيه",
    coverImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=90",
    menu: [
      {
        category: "مستلزمات طبية",
        items: [
          {
            name: "باراسيتامول",         price: 15,
            desc: "مسكن ألم وخافض حرارة",
            image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80",
            popular: true,
          },
          {
            name: "فيتامين C",           price: 45,
            desc: "أقراص مكمل غذائي",
            image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&q=80",
          },
          {
            name: "كمامات طبية 10 قطع", price: 30,
            desc: "كمامات جراحية معقمة",
            image: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=200&q=80",
          },
        ],
      },
    ],
  },
  "4": {
    name: "كافيه ريلاكس", type: "كافيهات", rating: "4.7", reviewCount: "180+",
    time: "15-25 دقيقة", fee: "12 جنيه",
    coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=90",
    menu: [
      {
        category: "المشروبات الساخنة ☕",
        items: [
          {
            name: "قهوة عربي",    price: 30,
            desc: "قهوة مختصة بالهيل",
            image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80",
            popular: true,
          },
          {
            name: "كابتشينو",     price: 45,
            desc: "إسبريسو مع حليب مبخر",
            image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=200&q=80",
          },
          {
            name: "شاي أخضر",    price: 20,
            desc: "شاي أخضر مع نعناع",
            image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&q=80",
          },
        ],
      },
      {
        category: "المعجنات",
        items: [
          {
            name: "كرواسان جبن",  price: 35,
            desc: "كرواسان طازج محشو بالجبن",
            image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200&q=80",
          },
        ],
      },
    ],
  },
  "5": {
    name: "عيادة الأمل", type: "طبيب", rating: "4.8", reviewCount: "95+",
    time: "بحجز مسبق", fee: "50 جنيه",
    coverImage: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&q=90",
    menu: [
      {
        category: "التخصصات المتاحة",
        items: [
          {
            name: "طب عام",            price: 150,
            desc: "كشف عام وتشخيص أمراض",
            image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&q=80",
            popular: true,
          },
          {
            name: "طب أطفال",          price: 180,
            desc: "متخصص أطفال وحديثي الولادة",
            image: "https://images.unsplash.com/photo-1588776814546-1ffedbe47425?w=200&q=80",
          },
          {
            name: "أمراض باطنية",      price: 200,
            desc: "تخصص أمراض الجهاز الهضمي",
            image: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=200&q=80",
          },
        ],
      },
    ],
  },
};

type CartItem = { name: string; price: number; image: string; qty: number };

// ─── Component ──────────────────────────────────────────────────────────────

export default function Restaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data   = RESTAURANTS[id ?? "1"] ?? RESTAURANTS["1"];
  const [cart, setCart]           = useState<Record<string, CartItem>>({});
  const [activeTab, setActiveTab] = useState(0);
  const cartBarAnim = useRef(new Animated.Value(0)).current;

  const totalItems = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const totalPrice = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);

  function addItem(item: { name: string; price: number; image: string }) {
    const wasEmpty = totalItems === 0;
    setCart(prev => ({
      ...prev,
      [item.name]: { ...item, qty: (prev[item.name]?.qty ?? 0) + 1 },
    }));
    if (wasEmpty) {
      Animated.spring(cartBarAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    }
  }

  function removeItem(name: string) {
    setCart(prev => {
      const next = { ...prev };
      if ((next[name]?.qty ?? 0) <= 1) {
        delete next[name];
        if (Object.keys(next).length === 0) {
          Animated.timing(cartBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
      } else {
        next[name] = { ...next[name], qty: next[name].qty - 1 };
      }
      return next;
    });
  }

  const cartBarTranslate = cartBarAnim.interpolate({
    inputRange: [0, 1], outputRange: [100, 0],
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── IMMERSIVE COVER ────────────────────────────────── */}
      <View style={{ height: 240, overflow: "hidden" }}>
        {/* Real cover photo */}
        <Image
          source={{ uri: data.coverImage }}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
        />
        {/* Gradient overlay — darker at top for status bar, and at bottom for blur merge */}
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 90,
          backgroundColor: "rgba(0,0,0,0.38)",
        }} />
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          backgroundColor: "rgba(0,0,0,0.30)",
        }} />

        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute", top: 52, right: 16,
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: "rgba(255,255,255,0.9)",
            justifyContent: "center", alignItems: "center",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 18 }}>✕</Text>
        </Pressable>

        {/* Restaurant name overlay on cover */}
        <View style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: "white", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
            {data.name}
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
            {data.type}
          </Text>
        </View>
      </View>

      {/* ── RESTAURANT INFO CARD ───────────────────────────── */}
      <View style={{
        backgroundColor: "white",
        paddingTop: 14, paddingHorizontal: 18, paddingBottom: 0,
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
      }}>
        {/* Rating + meta chips */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { icon: "🕐", label: data.time },
              { icon: "🛵", label: `توصيل ${data.fee}` },
              { icon: "🟢", label: "متاح الآن" },
            ].map((m, i) => (
              <View key={i} style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: "#F9FAFB", paddingVertical: 5, paddingHorizontal: 9, borderRadius: 10,
                borderWidth: 1, borderColor: "#F3F4F6",
              }}>
                <Text style={{ fontSize: 11 }}>{m.icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151" }}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={{
            backgroundColor: "#FFF7ED", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12,
            flexDirection: "row", alignItems: "center", gap: 4,
          }}>
            <Text style={{ fontSize: 13, color: "#F59E0B", fontWeight: "900" }}>★</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#92400E" }}>{data.rating}</Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>({data.reviewCount})</Text>
          </View>
        </View>

        {/* Promo banner */}
        {data.promo && (
          <View style={{
            marginBottom: 12, padding: 10, borderRadius: 12,
            backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC",
            flexDirection: "row", alignItems: "center", gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>🎁</Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#166534", fontWeight: "700" }}>{data.promo}</Text>
          </View>
        )}

        {/* Category tabs */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, paddingBottom: 0 }}
          style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
        >
          {data.menu.map((section, i) => (
            <Pressable
              key={i}
              onPress={() => setActiveTab(i)}
              style={{
                paddingVertical: 10, paddingHorizontal: 16,
                borderBottomWidth: 2.5,
                borderBottomColor: activeTab === i ? C.primary : "transparent",
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: activeTab === i ? "900" : "600",
                color: activeTab === i ? C.primary : "#9CA3AF",
              }}>
                {section.category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── MENU ITEMS ─────────────────────────────────────── */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {data.menu[activeTab].items.map((item, ii) => (
          <View key={ii} style={{
            flexDirection: "row", alignItems: "center",
            padding: 14, borderRadius: 18, marginBottom: 12,
            backgroundColor: "white",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
            borderWidth: 1, borderColor: "#F9FAFB",
          }}>
            {/* Real item image */}
            <View style={{
              width: 78, height: 78, borderRadius: 18,
              overflow: "hidden",
              marginLeft: 14, position: "relative",
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
            }}>
              <Image
                source={{ uri: item.image }}
                style={{ width: "100%", height: "100%", resizeMode: "cover" }}
              />
              {item.popular && (
                <View style={{
                  position: "absolute", top: 0, right: 0,
                  backgroundColor: "#EF4444",
                  paddingVertical: 3, paddingHorizontal: 6,
                  borderBottomLeftRadius: 10,
                }}>
                  <Text style={{ color: "white", fontSize: 8, fontWeight: "900" }}>شائع</Text>
                </View>
              )}
            </View>

            {/* Details */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: "#111827", fontSize: 15 }}>{item.name}</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
                {item.desc}
              </Text>
              <Text style={{ color: C.primary, fontWeight: "900", fontSize: 16, marginTop: 6 }}>
                {item.price} جنيه
              </Text>
            </View>

            {/* QTY Controls */}
            {cart[item.name]?.qty ? (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: "#F3F0FF", borderRadius: 14, padding: 4,
              }}>
                <Pressable
                  onPress={() => removeItem(item.name)}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: "white",
                    justifyContent: "center", alignItems: "center",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: C.primary }}>−</Text>
                </Pressable>
                <Text style={{ fontWeight: "900", color: C.primary, fontSize: 16, minWidth: 22, textAlign: "center" }}>
                  {cart[item.name].qty}
                </Text>
                <Pressable
                  onPress={() => addItem(item)}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: C.primary,
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "white" }}>+</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => addItem(item)}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: C.primary,
                  justifyContent: "center", alignItems: "center",
                  shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: "900", color: "white" }}>+</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── FLOATING CART BAR ──────────────────────────────── */}
      {totalItems > 0 && (
        <Animated.View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: 16,
          transform: [{ translateY: cartBarTranslate }],
        }}>
          <Pressable
            onPress={() => router.push("/cart")}
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
    </View>
  );
}
