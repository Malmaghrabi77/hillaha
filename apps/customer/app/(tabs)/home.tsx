import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, Animated,
  StatusBar, Platform, Image, Dimensions,
} from "react-native";
import { router } from "expo-router";
const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;
const SCREEN = Dimensions.get("window");

// ─── Data ──────────────────────────────────────────────────────────────────

const BANNERS = [
  {
    id: "1",
    title: "أول طلب مجاني التوصيل!",
    sub: "استخدم كود: HILLAHA1",
    cta: "اطلب دلوقتي",
    bg: "#7C3AED", accent: "#EC4899",
    image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&q=80",
  },
  {
    id: "2",
    title: "صيدلية النور توصل في 20 دقيقة",
    sub: "دواءك وصفتك على باب بيتك",
    cta: "اطلب الآن",
    bg: "#059669", accent: "#34D399",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80",
  },
  {
    id: "3",
    title: "احجز دكتور أونلاين",
    sub: "كشف من بيتك بدون طابور انتظار",
    cta: "احجز موعد",
    bg: "#2563EB", accent: "#60A5FA",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80",
  },
];

const CATEGORIES = [
  { id: "all",       label: "الكل",           icon: "🏠",  color: "#7C3AED", route: null },
  { id: "egyptian",  label: "كشري ومصري",      icon: "🥘",  color: "#92400E", route: null },
  { id: "shawarma",  label: "شاورما",          icon: "🌯",  color: "#D97706", route: null },
  { id: "burger",    label: "برجر",            icon: "🍔",  color: "#EF4444", route: null },
  { id: "pizza",     label: "بيتزا",           icon: "🍕",  color: "#F97316", route: null },
  { id: "chicken",   label: "فراخ",            icon: "🍗",  color: "#EAB308", route: null },
  { id: "cafe",      label: "قهوة وحلويات",    icon: "☕",  color: "#7C3AED", route: null },
  { id: "pharmacy",  label: "صيدلية",          icon: "💊",  color: "#059669", route: null },
  { id: "medical",   label: "طبيب",            icon: "🏥",  color: "#2563EB", route: null },
  { id: "cleaning",  label: "تنظيف",           icon: "🧹",  color: "#0891B2", route: "/services/cleaning" },
  { id: "electrical",label: "كهرباء وصيانة",   icon: "⚡",  color: "#D97706", route: "/services/electrical" },
  { id: "p2p",       label: "توصيل أغراض",     icon: "📦",  color: "#7C3AED", route: "/services/delivery" },
];

const SERVICES = [
  {
    id: "cleaning",
    title: "تنظيف المنزل",
    subtitle: "تنظيف شامل، ترتيب، غسيل ستائر",
    icon: "🧹",
    color: "#0891B2",
    bgColor: "#E0F7FA",
    route: "/services/cleaning",
    badge: "احجز الآن",
    badgeBg: "#0891B2",
  },
  {
    id: "electrical",
    title: "كهرباء وصيانة AC",
    subtitle: "إصلاح مكيفات، أعمال كهربائية",
    icon: "⚡",
    color: "#D97706",
    bgColor: "#FEF3C7",
    route: "/services/electrical",
    badge: "متاح الآن",
    badgeBg: "#D97706",
  },
  {
    id: "p2p",
    title: "توصيل من عميل لعميل",
    subtitle: "أرسل أو استلم أي غرض بسهولة",
    icon: "📦",
    color: "#7C3AED",
    bgColor: "#F3E8FF",
    route: "/services/delivery",
    badge: "سريع",
    badgeBg: "#7C3AED",
  },
];

// IDs match seed.sql UUIDs (10000000-0000-0000-0000-00000000000x)
const PARTNERS = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "الشرقاوي",     type: "egyptian",
    coverImage: "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=700&q=85",
    time: "20-30 د", fee: "10 جنيه", rating: "4.8",
    reviewCount: "1850+", tag: "الأكثر طلباً", tagColor: "#7C3AED", discount: "",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "شاورما الريم", type: "shawarma",
    coverImage: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=700&q=85",
    time: "25-35 د", fee: "12 جنيه", rating: "4.6",
    reviewCount: "1200+", tag: "", tagColor: "", discount: "",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "برجر هاوس",   type: "burger",
    coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=85",
    time: "30-40 د", fee: "15 جنيه", rating: "4.5",
    reviewCount: "780+", tag: "", tagColor: "", discount: "15%",
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    name: "بيتزا بلانيت", type: "pizza",
    coverImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=85",
    time: "30-45 د", fee: "15 جنيه", rating: "4.4",
    reviewCount: "560+", tag: "", tagColor: "", discount: "",
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    name: "تشيكن ماستر", type: "chicken",
    coverImage: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=700&q=85",
    time: "25-35 د", fee: "12 جنيه", rating: "4.7",
    reviewCount: "920+", tag: "جديد", tagColor: "#2563EB", discount: "",
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    name: "كافيه النيل",  type: "cafe",
    coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&q=85",
    time: "15-25 د", fee: "12 جنيه", rating: "4.9",
    reviewCount: "1100+", tag: "مميز", tagColor: "#7C3AED", discount: "",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [bannerIndex, setBannerIndex]       = useState(0);
  const bannerRef  = useRef<ScrollView>(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll carousel
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * SCREEN.width, animated: true });
        return next;
      });
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Loyalty pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const filtered = PARTNERS.filter(p =>
    activeCategory === "all" || p.type === activeCategory
  );

  const featured = PARTNERS.filter(p => p.discount || p.tag);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 18, paddingBottom: 14,
        backgroundColor: "#4C1D95",
      }}>
        {/* Top row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>توصيل إلى</Text>
            <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "white" }}>📍 قنا، وسط المدينة</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>▾</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.15)",
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 17 }}>🔔</Text>
              <View style={{
                position: "absolute", top: 6, right: 6,
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: "#EC4899",
                borderWidth: 1.5, borderColor: "#4C1D95",
              }} />
            </Pressable>
            <View style={{ alignItems: "center", gap: 2 }}>
              <Image
                source={require("../../assets/hillaha-logo.png")}
                style={{ width: 38, height: 38, resizeMode: "contain" }}
              />
              <View style={{ alignItems: "center", gap: 1 }}>
                <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.95)", fontWeight: "800" }}>حلها يحلها</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Text style={{ fontSize: 7, color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>7illaha</Text>
                  <Image
                    source={require("../../assets/hillaha-logo.png")}
                    style={{ width: 10, height: 10 }}
                  />
                  <Text style={{ fontSize: 7, color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>7illaha</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: "white", borderRadius: 16,
            paddingHorizontal: 14, paddingVertical: 12,
            shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 16, opacity: 0.5 }}>🔍</Text>
          <Text style={{ flex: 1, fontSize: 14, color: "#9CA3AF", textAlign: "right" }}>
            ابحث عن مطعم، صيدلية، طبيب...
          </Text>
          <View style={{
            backgroundColor: "#F3F0FF", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
          }}>
            <Text style={{ fontSize: 11, color: "#7C3AED", fontWeight: "700" }}>بحث</Text>
          </View>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── BANNER CAROUSEL ────────────────────────────────── */}
        <View>
          <ScrollView
            ref={bannerRef}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN.width);
              setBannerIndex(idx);
            }}
          >
            {BANNERS.map((b) => (
              <View
                key={b.id}
                style={{
                  width: SCREEN.width, height: 170,
                  backgroundColor: b.bg,
                  overflow: "hidden",
                }}
              >
                {/* Decorative circles */}
                <View style={{
                  position: "absolute", top: -50, left: -30,
                  width: 180, height: 180, borderRadius: 90,
                  backgroundColor: "rgba(255,255,255,0.07)",
                }} />
                <View style={{
                  position: "absolute", bottom: -40, right: 80,
                  width: 140, height: 140, borderRadius: 70,
                  backgroundColor: b.accent, opacity: 0.3,
                }} />

                {/* Real food image on the right */}
                <View style={{
                  position: "absolute", top: 16, right: 16,
                  width: 128, height: 128, borderRadius: 20,
                  overflow: "hidden",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 8,
                }}>
                  <Image
                    source={{ uri: b.image }}
                    style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                  />
                  {/* Slight overlay so image blends with banner bg */}
                  <View style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: `${b.bg}25`,
                  }} />
                </View>

                {/* Text section */}
                <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20, paddingRight: 160 }}>
                  <View style={{
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(255,255,255,0.22)",
                    paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20, marginBottom: 8,
                  }}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>عرض محدود</Text>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: "white", lineHeight: 23 }}>
                    {b.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                    {b.sub}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/restaurant/1")}
                    style={{
                      marginTop: 10, alignSelf: "flex-start",
                      backgroundColor: "white",
                      paddingVertical: 7, paddingHorizontal: 16,
                      borderRadius: 22,
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: b.bg, fontSize: 12 }}>{b.cta}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 10 }}>
            {BANNERS.map((_, i) => (
              <View key={i} style={{
                width: bannerIndex === i ? 20 : 6,
                height: 6, borderRadius: 3,
                backgroundColor: bannerIndex === i ? C.primary : "#D1D5DB",
              }} />
            ))}
          </View>
        </View>

        {/* ── CATEGORIES ─────────────────────────────────────── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  if (cat.route) { router.push(cat.route as any); return; }
                  setActiveCategory(cat.id);
                }}
                style={{ alignItems: "center", gap: 6, minWidth: 64 }}
              >
                <View style={{
                  width: 60, height: 60, borderRadius: 20,
                  backgroundColor: isActive ? cat.color : "#F3F4F6",
                  justifyContent: "center", alignItems: "center",
                  shadowColor: isActive ? cat.color : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35, shadowRadius: 6, elevation: isActive ? 4 : 0,
                  borderWidth: isActive ? 0 : 1.5,
                  borderColor: "#E5E7EB",
                }}>
                  <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                </View>
                <Text style={{
                  fontSize: 11, fontWeight: isActive ? "900" : "600",
                  color: isActive ? cat.color : "#6B7280",
                }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── LOYALTY CARD ───────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }], marginHorizontal: 16, marginTop: 18 }}>
          <Pressable
            onPress={() => router.push("/loyalty")}
            style={{
              borderRadius: 20, overflow: "hidden",
              flexDirection: "row", alignItems: "center",
              backgroundColor: "#4C1D95", padding: 16, gap: 14,
            }}
          >
            <View style={{
              position: "absolute", top: -20, left: -20,
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: "rgba(236,72,153,0.2)",
            }} />
            <View style={{
              width: 50, height: 50, borderRadius: 25,
              backgroundColor: "rgba(255,255,255,0.15)",
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 24 }}>🎁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700" }}>نقاط الولاء</Text>
              <Text style={{ color: "white", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
                47 نقطة = 47 جنيه خصم
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }}>
                1 نقطة لكل 250 جنيه • حد أدنى 20 نقطة
              </Text>
            </View>
            <View style={{
              backgroundColor: "#EC4899",
              paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
            }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>استبدل</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── HOME SERVICES ──────────────────────────────────── */}
        <View style={{ marginTop: 24 }}>
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", paddingHorizontal: 16, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>🏠 خدمات المنزل والتوصيل</Text>
          </View>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          >
            {SERVICES.map(srv => (
              <Pressable
                key={srv.id}
                onPress={() => router.push(srv.route as any)}
                style={{
                  width: 175, borderRadius: 20, overflow: "hidden",
                  backgroundColor: srv.bgColor,
                  borderWidth: 1.5, borderColor: `${srv.color}30`,
                  padding: 16, gap: 8,
                  shadowColor: srv.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
                }}
              >
                <View style={{
                  width: 52, height: 52, borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Text style={{ fontSize: 28 }}>{srv.icon}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "900", color: srv.color, lineHeight: 20 }}>
                  {srv.title}
                </Text>
                <Text style={{ fontSize: 11, color: "#6B7280", lineHeight: 16 }}>
                  {srv.subtitle}
                </Text>
                <View style={{
                  alignSelf: "flex-start",
                  backgroundColor: srv.badgeBg,
                  paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, marginTop: 4,
                }}>
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>{srv.badge}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── FEATURED (horizontal scroll) ───────────────────── */}
        {activeCategory === "all" && (
          <View style={{ marginTop: 24 }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", paddingHorizontal: 16, marginBottom: 14,
            }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>⚡ عروض مميزة</Text>
              <Pressable>
                <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>عرض الكل</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
            >
              {featured.map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/restaurant/${p.id}`)}
                  style={{
                    width: 170, borderRadius: 20, overflow: "hidden",
                    backgroundColor: C.surface,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
                    borderWidth: 1, borderColor: "#F3F4F6",
                  }}
                >
                  {/* Real cover image */}
                  <View style={{ height: 110, overflow: "hidden" }}>
                    <Image
                      source={{ uri: p.coverImage }}
                      style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                    />
                    {/* Dark gradient overlay */}
                    <View style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
                      backgroundColor: "rgba(0,0,0,0.18)",
                    }} />
                    {p.discount ? (
                      <View style={{
                        position: "absolute", top: 8, right: 8,
                        backgroundColor: "#EF4444",
                        paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8,
                      }}>
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>خصم {p.discount}</Text>
                      </View>
                    ) : p.tag ? (
                      <View style={{
                        position: "absolute", top: 8, right: 8,
                        backgroundColor: p.tagColor,
                        paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8,
                      }}>
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>{p.tag}</Text>
                      </View>
                    ) : null}
                  </View>
                  {/* Info */}
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: "#F59E0B", fontWeight: "900" }}>★ {p.rating}</Text>
                      <Text style={{ fontSize: 10, color: "#9CA3AF" }}>({p.reviewCount})</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <View style={{ backgroundColor: "#F3F4F6", paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: "600" }}>🕐 {p.time}</Text>
                      </View>
                      <View style={{ backgroundColor: "#F3F4F6", paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: "600" }}>🛵 {p.fee}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── ALL PARTNERS (vertical) ─────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", marginBottom: 14,
          }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>
              {activeCategory === "all" ? "🏪 جميع الشركاء" : CATEGORIES.find(c => c.id === activeCategory)?.label}
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
              {filtered.length} متجر
            </Text>
          </View>

          {filtered.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={{ color: C.textMuted, marginTop: 12, fontWeight: "700" }}>لا توجد نتائج</Text>
            </View>
          )}

          {filtered.map(p => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/restaurant/${p.id}`)}
              style={{
                marginBottom: 16, borderRadius: 22, overflow: "hidden",
                backgroundColor: C.surface,
                shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.09, shadowRadius: 14, elevation: 4,
                borderWidth: 1, borderColor: "#F3F4F6",
              }}
            >
              {/* Real Cover Image */}
              <View style={{ height: 155, overflow: "hidden" }}>
                <Image
                  source={{ uri: p.coverImage }}
                  style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                />
                {/* Gradient overlay bottom */}
                <View style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 70,
                  backgroundColor: "rgba(0,0,0,0.22)",
                }} />
                {/* Badges */}
                <View style={{ position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" }}>
                  {p.discount ? (
                    <View style={{
                      backgroundColor: "#EF4444",
                      paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
                    }}>
                      <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>خصم {p.discount}</Text>
                    </View>
                  ) : <View />}
                  {p.tag ? (
                    <View style={{
                      backgroundColor: p.tagColor,
                      paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
                    }}>
                      <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>{p.tag}</Text>
                    </View>
                  ) : <View />}
                </View>
              </View>

              {/* Info */}
              <View style={{ padding: 14, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>{p.name}</Text>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 3,
                    backgroundColor: "#FFF7ED",
                    paddingVertical: 4, paddingHorizontal: 9, borderRadius: 10,
                  }}>
                    <Text style={{ fontSize: 13, color: "#F59E0B", fontWeight: "900" }}>★</Text>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#92400E" }}>{p.rating}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                  {p.type}  •  {p.reviewCount} تقييم
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 4,
                    backgroundColor: "#F9FAFB", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10,
                  }}>
                    <Text style={{ fontSize: 12 }}>🕐</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{p.time}</Text>
                  </View>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 4,
                    backgroundColor: "#F9FAFB", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10,
                  }}>
                    <Text style={{ fontSize: 12 }}>🛵</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{p.fee}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
