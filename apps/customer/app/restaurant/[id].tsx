import React, { useRef } from "react";
import {
  View, Text, Pressable, ScrollView,
  StatusBar, Animated, Alert, Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCart } from "../../lib/cartStore";
const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

// ─── Data — IDs match seed.sql UUIDs ─────────────────────────────────────────

const RESTAURANTS: Record<string, {
  name: string; nameAr: string; type: string; rating: string; reviewCount: string;
  time: string; fee: string; coverImage: string; promo?: string;
  menu: {
    category: string;
    items: { id: string; name: string; nameAr: string; price: number; desc: string; image: string; popular?: boolean }[];
  }[];
}> = {
  "10000000-0000-0000-0000-000000000001": {
    name: "Al Sharkawy", nameAr: "الشرقاوي", type: "كشري ومصري",
    rating: "4.8", reviewCount: "1850+", time: "20-30 دقيقة", fee: "10 جنيه",
    coverImage: "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=900&q=90",
    promo: "أفضل كشري في قنا — منذ 1980",
    menu: [
      {
        category: "الأكثر طلباً 🔥",
        items: [
          { id: "sh1_kbr",  name: "Koshary Large",  nameAr: "كشري كبير",  price: 20, desc: "كشري بالأرز والعدس والمكرونة — حجم كبير",  image: "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=200&q=80", popular: true },
          { id: "sh1_wst",  name: "Koshary Medium", nameAr: "كشري وسط",   price: 15, desc: "كشري بالأرز والعدس والمكرونة — حجم وسط",   image: "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=200&q=80", popular: true },
        ],
      },
      {
        category: "الإضافات",
        items: [
          { id: "sh1_fl",   name: "Ful Medames",    nameAr: "فول مدمس",   price: 12, desc: "فول إسكندراني بالزيت والليمون والثوم",   image: "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=200&q=80" },
          { id: "sh1_ta",   name: "Falafel",        nameAr: "طعمية",      price: 10, desc: "6 قطع طعمية مقرمشة",                       image: "https://images.unsplash.com/photo-1614273888655-602f7b97ed4e?w=200&q=80" },
        ],
      },
      {
        category: "مشروبات",
        items: [
          { id: "sh1_pp",   name: "Pepsi",          nameAr: "بيبسي",      price: 10, desc: "علبة 330 مل",                             image: "https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=200&q=80" },
        ],
      },
    ],
  },

  "10000000-0000-0000-0000-000000000002": {
    name: "Shawarma El Reem", nameAr: "شاورما الريم", type: "شاورما",
    rating: "4.6", reviewCount: "1200+", time: "25-35 دقيقة", fee: "12 جنيه",
    coverImage: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=900&q=90",
    menu: [
      {
        category: "الشاورما 🌯",
        items: [
          { id: "sh2_chw",  name: "Chicken Shawarma", nameAr: "شاورما دجاج",     price: 45, desc: "شاورما دجاج بالخبز العربي والثوم والخيار", image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=200&q=80", popular: true },
          { id: "sh2_mpl",  name: "Meat Plate",       nameAr: "طبق شاورما لحم",  price: 75, desc: "طبق أرز وشاورما لحم مع سلطة",             image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80", popular: true },
        ],
      },
      {
        category: "المشويات",
        items: [
          { id: "sh2_mix",  name: "Mixed Grills",     nameAr: "مشكل مشويات",    price: 110, desc: "تشكيلة لحوم ودجاج مشوية",               image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80" },
          { id: "sh2_hms",  name: "Hummus",           nameAr: "حمص بالطحينة",   price: 25,  desc: "حمص ناعم بزيت الزيتون والبابريكا",      image: "https://images.unsplash.com/photo-1577805947697-89e18249d767?w=200&q=80" },
        ],
      },
    ],
  },

  "10000000-0000-0000-0000-000000000003": {
    name: "Burger House", nameAr: "برجر هاوس", type: "برجر",
    rating: "4.5", reviewCount: "780+", time: "30-40 دقيقة", fee: "15 جنيه",
    coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=90",
    promo: "اطلب أكتر من 100 جنيه واحصل على مشروب مجاني",
    menu: [
      {
        category: "البرجر 🍔",
        items: [
          { id: "sh3_cls",  name: "Classic Burger", nameAr: "برجر كلاسيك",  price: 85,  desc: "لحمة بقري مشوية مع جبن وخس وطماطم",       image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80", popular: true },
          { id: "sh3_dbl",  name: "Double Smash",   nameAr: "دبل سماش",     price: 130, desc: "بطتين لحمة مع جبن مزدوج وصوص سري",         image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=200&q=80", popular: true },
        ],
      },
      {
        category: "الإضافات",
        items: [
          { id: "sh3_frs",  name: "Loaded Fries",   nameAr: "بطاطس محملة", price: 55,  desc: "بطاطس مقرمشة مع جبن وبيكون وجالابينو",    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&q=80" },
        ],
      },
      {
        category: "مشروبات",
        items: [
          { id: "sh3_mlk",  name: "Oreo Milkshake", nameAr: "ميلك شيك أوريو", price: 60, desc: "مشروب كريمي بالأوريو والشوكولاتة",       image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80" },
        ],
      },
    ],
  },

  "10000000-0000-0000-0000-000000000004": {
    name: "Pizza Planet", nameAr: "بيتزا بلانيت", type: "بيتزا",
    rating: "4.4", reviewCount: "560+", time: "30-45 دقيقة", fee: "15 جنيه",
    coverImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=90",
    menu: [
      {
        category: "البيتزا 🍕",
        items: [
          { id: "sh4_mrg",  name: "Margherita",   nameAr: "مارجريتا",    price: 90,  desc: "طماطم وجبن موزاريلا وريحان طازج",         image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80", popular: true },
          { id: "sh4_pep",  name: "Pepperoni",    nameAr: "بيبروني",     price: 110, desc: "بيبروني وموزاريلا وصوص طماطم",             image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80", popular: true },
        ],
      },
      {
        category: "الإضافات",
        items: [
          { id: "sh4_grl",  name: "Garlic Bread", nameAr: "خبز بالثوم", price: 35,  desc: "خبز فرنسي بالثوم والزبدة والجبن",          image: "https://images.unsplash.com/photo-1619531040576-f9416740661e?w=200&q=80" },
        ],
      },
    ],
  },

  "10000000-0000-0000-0000-000000000005": {
    name: "Chicken Master", nameAr: "تشيكن ماستر", type: "فراخ",
    rating: "4.7", reviewCount: "920+", time: "25-35 دقيقة", fee: "12 جنيه",
    coverImage: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&q=90",
    menu: [
      {
        category: "الوجبات 🍗",
        items: [
          { id: "sh5_crs",  name: "Crispy Meal",     nameAr: "وجبة كريسبي",  price: 80, desc: "فراخ كريسبي مع بطاطس وعصير",              image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=200&q=80", popular: true },
          { id: "sh5_grll", name: "Grilled Chicken", nameAr: "دجاج مشوي",    price: 95, desc: "نصف دجاجة مشوية مع أرز وسلطة",            image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=200&q=80" },
          { id: "sh5_wng",  name: "Chicken Wings",   nameAr: "أجنحة دجاج",   price: 70, desc: "8 أجنحة بالصوص الحار أو البارد",           image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=200&q=80", popular: true },
        ],
      },
    ],
  },

  "10000000-0000-0000-0000-000000000006": {
    name: "Cafe Nile", nameAr: "كافيه النيل", type: "قهوة وحلويات",
    rating: "4.9", reviewCount: "1100+", time: "15-25 دقيقة", fee: "12 جنيه",
    coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=90",
    menu: [
      {
        category: "المشروبات ☕",
        items: [
          { id: "sh6_spl",  name: "Spanish Latte",  nameAr: "سبانش لاتيه", price: 55, desc: "إسبريسو مع حليب مكثف بالسكر",              image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80", popular: true },
          { id: "sh6_trk",  name: "Turkish Coffee", nameAr: "قهوة تركي",   price: 25, desc: "قهوة تركية على الرمال الساخنة",             image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&q=80" },
        ],
      },
      {
        category: "الحلويات",
        items: [
          { id: "sh6_knf",  name: "Kunafa",   nameAr: "كنافة",   price: 60, desc: "كنافة بالجبن والقطر الساخن",                    image: "https://images.unsplash.com/photo-1567380177-1d2bf7a3bd6b?w=200&q=80", popular: true },
          { id: "sh6_bsb",  name: "Basbousa", nameAr: "بسبوسة",  price: 30, desc: "بسبوسة بالقشطة والقطر",                         image: "https://images.unsplash.com/photo-1575853121743-60c24f0a7502?w=200&q=80" },
        ],
      },
    ],
  },
};

// Fallback for unknown IDs — default to الشرقاوي
const FALLBACK_ID = "10000000-0000-0000-0000-000000000001";

// ─── Component ───────────────────────────────────────────────────────────────

export default function Restaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerId = id ?? FALLBACK_ID;
  const data = RESTAURANTS[partnerId] ?? RESTAURANTS[FALLBACK_ID];

  const [activeTab, setActiveTab] = React.useState(0);
  const cartBarAnim = useRef(new Animated.Value(0)).current;
  const cartStore = useCart();

  const totalItems = cartStore.totalItems;
  const totalPrice = cartStore.subtotal;

  function addItem(item: { id: string; nameAr: string; price: number; image: string }) {
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
                id: item.id, name: item.nameAr, nameAr: item.nameAr,
                price: item.price, image: item.image,
                partnerId, partnerName: data.nameAr,
              });
            },
          },
        ]
      );
      return;
    }

    const wasEmpty = totalItems === 0;
    cartStore.addItem({
      id: item.id, name: item.nameAr, nameAr: item.nameAr,
      price: item.price, image: item.image,
      partnerId, partnerName: data.nameAr,
    });

    if (wasEmpty) {
      Animated.spring(cartBarAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    }
  }

  function removeItem(itemId: string) {
    const qty = cartStore.items[itemId]?.qty ?? 0;
    cartStore.removeItem(itemId);
    if (qty <= 1 && totalItems <= 1) {
      Animated.timing(cartBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }

  const cartBarTranslate = cartBarAnim.interpolate({
    inputRange: [0, 1], outputRange: [100, 0],
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── IMMERSIVE COVER ──────────────────────────────────── */}
      <View style={{ height: 240, overflow: "hidden" }}>
        <Image
          source={{ uri: data.coverImage }}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
        />
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 90,
          backgroundColor: "rgba(0,0,0,0.38)",
        }} />
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          backgroundColor: "rgba(0,0,0,0.30)",
        }} />

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

        <View style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
          <Text style={{
            fontSize: 24, fontWeight: "900", color: "white",
            textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
          }}>
            {data.nameAr}
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
            {data.type}
          </Text>
        </View>
      </View>

      {/* ── RESTAURANT INFO ──────────────────────────────────── */}
      <View style={{
        backgroundColor: "white",
        paddingTop: 14, paddingHorizontal: 18, paddingBottom: 0,
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
      }}>
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

      {/* ── MENU ITEMS ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {data.menu[activeTab].items.map((item) => (
          <View key={item.id} style={{
            flexDirection: "row", alignItems: "center",
            padding: 14, borderRadius: 18, marginBottom: 12,
            backgroundColor: "white",
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
            borderWidth: 1, borderColor: "#F9FAFB",
          }}>
            <View style={{
              width: 78, height: 78, borderRadius: 18, overflow: "hidden",
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
                  backgroundColor: "#EF4444", paddingVertical: 3, paddingHorizontal: 6,
                  borderBottomLeftRadius: 10,
                }}>
                  <Text style={{ color: "white", fontSize: 8, fontWeight: "900" }}>شائع</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: "#111827", fontSize: 15 }}>{item.nameAr}</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
                {item.desc}
              </Text>
              <Text style={{ color: C.primary, fontWeight: "900", fontSize: 16, marginTop: 6 }}>
                {item.price} جنيه
              </Text>
            </View>

            {cartStore.items[item.id]?.qty ? (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: "#F3F0FF", borderRadius: 14, padding: 4,
              }}>
                <Pressable
                  onPress={() => removeItem(item.id)}
                  style={{
                    width: 32, height: 32, borderRadius: 10, backgroundColor: "white",
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
        ))}
      </ScrollView>

      {/* ── FLOATING CART BAR ───────────────────────────────── */}
      {totalItems > 0 && (
        <Animated.View style={{
          position: "absolute", bottom: 0, left: 0, right: 0, padding: 16,
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
