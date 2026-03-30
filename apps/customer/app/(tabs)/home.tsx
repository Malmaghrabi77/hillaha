import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, Animated, FlatList,
  Image, Dimensions, ActivityIndicator, RefreshControl, ImageBackground,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDarkMode } from '../../src/hooks/useDarkMode';
import { useSupabase } from '../../src/hooks/useSupabase';
import { analyticsTracker } from '../../src/utils/analyticsTracker';
import { A11yPresets } from '../../src/hooks/useAccessibility';
import { ANALYTICS_EVENTS } from '../../src/constants/analyticsEvents';
import { SafeAreaDisplay } from '../../src/components';

const SCREEN = Dimensions.get("window");

// ─── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_BANNERS = [
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

const DEFAULT_CATEGORIES = [
  { id: "all", label: "الكل", icon: "🏠", color: "#7C3AED", route: null },
  { id: "restaurant", label: "مطاعم", icon: "🍽️", color: "#F97316", route: null },
  { id: "pharmacy", label: "صيدلية", icon: "💊", color: "#059669", route: null },
  { id: "clinic", label: "عيادات", icon: "🏥", color: "#2563EB", route: null },
  { id: "store", label: "محلات", icon: "🏪", color: "#EAB308", route: null },
  { id: "cleaning", label: "تنظيف", icon: "🧹", color: "#0891B2", route: "/services/cleaning" },
  { id: "electrical", label: "كهرباء وصيانة", icon: "⚡", color: "#D97706", route: "/services/electrical" },
  { id: "delivery", label: "توصيل أغراض", icon: "📦", color: "#7C3AED", route: "/services/delivery" },
];

const DEFAULT_SERVICES = [
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
    id: "delivery",
    title: "توصيل من عميل لعميل",
    subtitle: "أرسل أو استلم أي غرض بسهولة",
    icon: "📦",
    color: "#7C3AED",
    bgColor: "#F3E8FF",
    route: "/services/delivery",
    badge: "سريع",
    badgeBg: "#7C3AED",
  },
  {
    id: "medical",
    title: "خدمات طبية",
    subtitle: "حجز دكتور، رفع روشتة",
    icon: "🏥",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    route: "/medical",
    badge: "جديد",
    badgeBg: "#2563EB",
  },
];

const FALLBACK_PARTNERS = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "الشرقاوي",
    type: "restaurant",
    cover_image: "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=700&q=85",
    delivery_time: "20-30 دقيقة",
    delivery_fee: 10,
    rating: 4.8,
    review_count: 1850,
    tag: "الأكثر طلباً",
    tagColor: "#7C3AED",
  },
];

// ─── Types ──────────────────────────────────────────────────────────────

interface Partner {
  id: string;
  name: string;
  type: string;
  cover_image: string | null;
  delivery_time: string;
  delivery_fee: number;
  rating: number | null;
  review_count: number;
}

interface Banner {
  id: string;
  title: string;
  sub: string;
  cta: string;
  bg: string;
  accent: string;
  image: string | null;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  route: string | null;
}

interface Service {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  route: string;
  badge: string;
  badgeBg: string;
}

// ─── PartnerCard Component with Lazy Loading ────────────────────────────────────

interface PartnerCardProps {
  partner: Partner;
  onPress: () => void;
}

function PartnerCard({ partner, onPress }: PartnerCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isDarkMode, colors } = useDarkMode();

  useEffect(() => {
    // ✅ Prefetch the image
    if (partner?.cover_image) {
      Image.prefetch(partner.cover_image).catch(() => {});
    }
  }, [partner?.cover_image]);

  return (
    <Pressable
      onPress={onPress}
      {...A11yPresets.button()}
      style={{
        marginBottom: 16,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: colors.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 14,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* ✅ Lazy Loaded Cover Image */}
      <View style={{ height: 155, overflow: "hidden", backgroundColor: colors.lightBg3 }}>
        {!imageLoaded && (
          <View style={{ width: "100%", height: "100%", backgroundColor: colors.lightBg3 }} />
        )}
        <Image
          source={{ uri: partner.cover_image || "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=700&q=85" }}
          style={{
            width: "100%",
            height: "100%",
            resizeMode: "cover",
            opacity: imageLoaded ? 1 : 0,
          }}
          onLoad={() => setImageLoaded(true)}
        />
        {/* Gradient overlay bottom */}
        <View style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 70,
          backgroundColor: colors.overlayLight,
        }} />
      </View>

      {/* Info */}
      <View style={{ padding: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>{partner.name}</Text>
          {partner.rating && (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              backgroundColor: colors.lightBg1,
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 10,
            }}>
              <Text style={{ fontSize: 13, color: colors.ratingText, fontWeight: "900" }}>★</Text>
              <Text style={{ fontSize: 13, fontWeight: "900", color: colors.ratingDark }}>
                {partner.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {partner.type} • {partner.review_count}+ تقييم
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.lightBg2,
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 10,
          }}>
            <Text style={{ fontSize: 12 }}>🕐</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
              {partner.delivery_time}
            </Text>
          </View>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.lightBg2,
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 10,
          }}>
            <Text style={{ fontSize: 12 }}>🛵</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
              {partner.delivery_fee} جنيه
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Home Component ────────────────────────────────────────────────────────────

export default function Home() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [activeCategory, setActiveCategory] = useState("all");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);

  // ✅ Pagination states
  const [allPartners, setAllPartners] = useState<Partner[]>(FALLBACK_PARTNERS);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePartners, setHasMorePartners] = useState(true);
  const pageSize = 20;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bannerRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Load more partners with pagination
  const loadMorePartners = async (pageNum: number = page) => {
    if (isLoadingMore || !hasMorePartners) return;
    setIsLoadingMore(true);

    try {
      if (!supabase) {
        setIsLoadingMore(false);
        return;
      }

      const start = pageNum * pageSize;
      const end = start + pageSize;

      const { data: partnersData } = await supabase
        .from("partners")
        .select("id, name, type, cover_image, delivery_time, delivery_fee, rating, review_count")
        .eq("is_approved", true)
        .range(start, end - 1)
        .order("rating", { ascending: false });

      if (partnersData && partnersData.length > 0) {
        setAllPartners(prev => [...prev, ...(partnersData as Partner[])]);
        setPage(pageNum + 1);

        // ✅ Save to cache
        const cacheKey = `partners_page_${pageNum}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(partnersData));

        if (partnersData.length < pageSize) {
          setHasMorePartners(false);
        }
      } else {
        setHasMorePartners(false);
      }
    } catch {
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ✅ Load cached partners on app start
  const loadCachedPartners = async () => {
    try {
      for (let p = 0; p < 3; p++) {
        const cacheKey = `partners_page_${p}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setAllPartners(prev => [...prev, ...data]);
          setPage(p + 1);
        }
      }
    } catch {
    }
  };

  // ✅ Fetch initial data
  useFocusEffect(
    React.useCallback(() => {
      analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.HOME);

      async function fetchData() {

        try {
          // ✅ Load cached partners first (instant display)
          await loadCachedPartners();

          if (!supabase) {
            setLoading(false);
            return;
          }

          // ✅ Load first page with pagination
          const { data: partnersData } = await supabase
            .from("partners")
            .select("id, name, type, cover_image, delivery_time, delivery_fee, rating, review_count")
            .eq("is_approved", true)
            .range(0, pageSize - 1)
            .order("rating", { ascending: false });

          // Fetch banners
          const { data: bannersData } = await supabase
            .from("banners")
            .select("id, title, sub, cta, bg, accent, image")
            .eq("is_active", true)
            .order("position", { ascending: true })
            .limit(10);

          // Fetch categories
          const { data: categoriesData } = await supabase
            .from("categories")
            .select("id, label, icon, color, route")
            .eq("is_active", true)
            .order("position", { ascending: true });

          // Fetch services
          const { data: servicesData } = await supabase
            .from("services")
            .select("id, title, subtitle, icon, color, bg_color, route, badge, badge_bg")
            .eq("is_active", true)
            .order("position", { ascending: true });

          if (partnersData && partnersData.length > 0) {
            setAllPartners(partnersData as Partner[]);
            setPage(1);
            // ✅ Cache the first page
            await AsyncStorage.setItem("partners_page_0", JSON.stringify(partnersData));
          }

          if (bannersData && bannersData.length > 0) {
            setBanners(bannersData as Banner[]);
          }

          if (categoriesData && categoriesData.length > 0) {
            setCategories(categoriesData as Category[]);
          }

          if (servicesData && servicesData.length > 0) {
            const mapped = servicesData.map((s: any) => ({
              ...s,
              bgColor: s.bg_color,
              badgeBg: s.badge_bg,
            }));
            setServices(mapped as Service[]);
          }
        } catch {
        } finally {
          setLoading(false);
        }
      }

      fetchData();
    }, [])
  );

  // ✅ Pull to refresh
  const handleRefresh = async () => {
    analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.REFRESH);
    setRefreshing(true);
    try {
      await AsyncStorage.multiRemove([
        "partners_page_0",
        "partners_page_1",
        "partners_page_2",
      ]);
      setAllPartners(FALLBACK_PARTNERS);
      setPage(0);
      setHasMorePartners(true);

      if (supabase) {
        const { data: partnersData } = await supabase
          .from("partners")
          .select("id, name, type, cover_image, delivery_time, delivery_fee, rating, review_count")
          .eq("is_approved", true)
          .range(0, pageSize - 1)
          .order("rating", { ascending: false });

        if (partnersData && partnersData.length > 0) {
          setAllPartners(partnersData as Partner[]);
          setPage(1);
          await AsyncStorage.setItem("partners_page_0", JSON.stringify(partnersData));
        }
      }
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-scroll carousel
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % (banners.length || 1);
        bannerRef.current?.scrollTo({ x: next * SCREEN.width, animated: true });
        return next;
      });
    }, 3500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length]);

  // Loyalty pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const filtered = allPartners.filter(p =>
    activeCategory === "all" || p.type === activeCategory
  );

  return (
    <SafeAreaDisplay variant="page" safeBottom={false} backgroundColor={colors.bg}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={{
        paddingBottom: 14,
        backgroundColor: colors.deepPurple,
        marginHorizontal: -16,
        paddingHorizontal: 18,
      }}>
        {/* Top row */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}>
          <View>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>
              توصيل إلى
            </Text>
            <Pressable
              onPress={() => router.push("/addresses")}
              {...A11yPresets.button()}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "white" }}>
                📍 موقع التوصيل
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>▾</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable
              onPress={() => router.push("/notifications")}
              {...A11yPresets.button()}
              style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.15)",
              justifyContent: "center",
              alignItems: "center",
            }} >
              <Text style={{ fontSize: 17 }}>🔔</Text>
              <View style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.pink,
                borderWidth: 1.5,
                borderColor: colors.deepPurple,
              }} />
            </Pressable>
            <View style={{ alignItems: "center", gap: 2 }}>
              <Image
                source={require("../../assets/hillaha-logo.png")}
                style={{ width: 38, height: 38, resizeMode: "contain" }}
              />
              <View style={{ alignItems: "center", gap: 1 }}>
                <Text style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.95)",
                  fontWeight: "800",
                }}>
                  حلها يحلها
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          {...A11yPresets.button()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "white",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 16, opacity: 0.5 }}>🔍</Text>
          <Text style={{
            flex: 1,
            fontSize: 14,
            color: "#9CA3AF",
            textAlign: "right",
          }}>
            ابحث عن مطعم، صيدلية، طبيب...
          </Text>
        </Pressable>
      </View>

      {/* ✅ Main ScrollView with RefreshControl */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── BANNER CAROUSEL ────────────────────────────────── */}
        <View>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN.width);
              setBannerIndex(idx);
            }}
          >
            {banners.map((b) => (
              <View
                key={b.id}
                style={{
                  width: SCREEN.width,
                  height: 170,
                  backgroundColor: b.bg,
                  overflow: "hidden",
                }}
              >
                {/* Decorative circles */}
                <View style={{
                  position: "absolute",
                  top: -50,
                  left: -30,
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: "rgba(255,255,255,0.07)",
                }} />
                <View style={{
                  position: "absolute",
                  bottom: -40,
                  right: 80,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: b.accent,
                  opacity: 0.3,
                }} />

                {/* Banner image */}
                <View style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 128,
                  height: 128,
                  borderRadius: 20,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}>
                  <Image
                    source={{
                      uri: b.image || "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&q=80"
                    }}
                    style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                  />
                  <View style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: `${b.bg}25`,
                  }} />
                </View>

                {/* Text section */}
                <View style={{
                  flex: 1,
                  justifyContent: "center",
                  paddingHorizontal: 20,
                  paddingRight: 160,
                }}>
                  <View style={{
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(255,255,255,0.22)",
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: 20,
                    marginBottom: 8,
                  }}>
                    <Text style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: "700",
                    }}>
                      عرض محدود
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 17,
                    fontWeight: "900",
                    color: "white",
                    lineHeight: 23,
                  }}>
                    {b.title}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    marginTop: 4,
                  }}>
                    {b.sub}
                  </Text>
                  <Pressable
                    onPress={() => {
                      analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.BANNER_CLICKED, { bannerId: b.id });
                      router.push(`/restaurant/${b.id}`);
                    }}
                    style={{
                      marginTop: 10,
                      alignSelf: "flex-start",
                      backgroundColor: "white",
                      paddingVertical: 7,
                      paddingHorizontal: 16,
                      borderRadius: 22,
                    }}
                  >
                    <Text style={{
                      fontWeight: "900",
                      color: b.bg,
                      fontSize: 12,
                    }}>
                      {b.cta}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
          }}>
            {banners.map((_, i) => (
              <View
                key={i}
                style={{
                  width: bannerIndex === i ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: bannerIndex === i ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        </View>

        {/* ── CATEGORIES ─────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}
        >
          {categories.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.CATEGORY_SELECTED, { categoryId: cat.id });
                  if (cat.route) {
                    router.push(cat.route as any);
                    return;
                  }
                  setActiveCategory(cat.id);
                }}
                {...A11yPresets.button()}
                style={{ alignItems: "center", gap: 6, minWidth: 64 }}
              >
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 20,
                  backgroundColor: isActive ? cat.color : colors.lightBg3,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: isActive ? cat.color : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  elevation: isActive ? 4 : 0,
                  borderWidth: isActive ? 0 : 1.5,
                  borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                </View>
                <Text style={{
                  fontSize: 11,
                  fontWeight: isActive ? "900" : "600",
                  color: isActive ? cat.color : colors.textMuted,
                  textAlign: "center",
                }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── LOYALTY CARD ───────────────────────────────────── */}
        <Animated.View style={{
          transform: [{ scale: pulseAnim }],
          marginHorizontal: 16,
          marginTop: 18,
        }}>
          <Pressable
            onPress={() => router.push("/loyalty")}
            {...A11yPresets.button()}
            style={{
              borderRadius: 20,
              overflow: "hidden",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.deepPurple,
              padding: 16,
              gap: 14,
            }}
          >
            <View style={{
              position: "absolute",
              top: -20,
              left: -20,
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "rgba(236,72,153,0.2)",
            }} />
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: "rgba(255,255,255,0.15)",
              justifyContent: "center",
              alignItems: "center",
            }}>
              <Text style={{ fontSize: 24 }}>🎁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                fontWeight: "700",
              }}>
                نقاط الولاء
              </Text>
              <Text style={{
                color: "white",
                fontSize: 16,
                fontWeight: "900",
                marginTop: 2,
              }}>
                نقاطك تُحوّل لخصومات!
              </Text>
              <Text style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                marginTop: 2,
              }}>
                1 نقطة لكل 250 جنيه • حد أدنى 20 نقطة
              </Text>
            </View>
            <View style={{
              backgroundColor: colors.pink,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 12,
            }}>
              <Text style={{
                color: "white",
                fontWeight: "900",
                fontSize: 12,
              }}>
                استبدل
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── HOME SERVICES ──────────────────────────────────── */}
        <View style={{ marginTop: 24 }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            marginBottom: 14,
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: "900",
              color: colors.text,
            }}>
              🏠 خدمات المنزل والتوصيل
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          >
            {services.map(srv => (
              <Pressable
                key={srv.id}
                onPress={() => {
                  analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.SERVICE_CLICKED, { serviceId: srv.id });
                  router.push(srv.route as any);
                }}
                {...A11yPresets.button()}
                style={{
                  width: 175,
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: srv.bgColor,
                  borderWidth: 1.5,
                  borderColor: `${srv.color}30`,
                  padding: 16,
                  gap: 8,
                  shadowColor: srv.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  elevation: 3,
                }}
              >
                <View style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 28 }}>{srv.icon}</Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: srv.color,
                  lineHeight: 20,
                }}>
                  {srv.title}
                </Text>
                <Text style={{
                  fontSize: 11,
                  color: "#6B7280",
                  lineHeight: 16,
                }}>
                  {srv.subtitle}
                </Text>
                <View style={{
                  alignSelf: "flex-start",
                  backgroundColor: srv.badgeBg,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  marginTop: 4,
                }}>
                  <Text style={{
                    color: "white",
                    fontSize: 11,
                    fontWeight: "800",
                  }}>
                    {srv.badge}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── FEATURED (horizontal scroll) ───────────────────── */}
        {activeCategory === "all" && (
          <View style={{ marginTop: 24 }}>
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              marginBottom: 14,
            }}>
              <Text style={{
                fontSize: 17,
                fontWeight: "900",
                color: colors.text,
              }}>
                ⚡ عروض مميزة
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/search")}
                {...A11yPresets.button()}>
                <Text style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 13,
                }}>
                  عرض الكل
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
            >
              {allPartners.slice(0, 5).map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.PARTNER_CLICKED, { partnerId: p.id });
                    router.push(`/restaurant/${p.id}`);
                  }}
                  {...A11yPresets.button()}
                  style={{
                    width: 170,
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: colors.surface,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  {/* Cover image */}
                  <View style={{ height: 110, overflow: "hidden", backgroundColor: "#f0f0f0" }}>
                    <Image
                      source={{
                        uri: p.cover_image || "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=200&q=80"
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        resizeMode: "cover",
                      }}
                    />
                    <View style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 50,
                      backgroundColor: "rgba(0,0,0,0.18)",
                    }} />
                  </View>
                  {/* Info */}
                  <View style={{ padding: 12 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: colors.text,
                    }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        color: "#F59E0B",
                        fontWeight: "900",
                      }}>
                        ★ {p.rating?.toFixed(1)}
                      </Text>
                      <Text style={{
                        fontSize: 10,
                        color: colors.textMuted,
                      }}>
                        ({p.review_count})
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <View style={{
                        backgroundColor: colors.lightBg3,
                        paddingVertical: 3,
                        paddingHorizontal: 7,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: colors.textMuted,
                          fontWeight: "600",
                        }}>
                          🕐 {p.delivery_time}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: colors.lightBg3,
                        paddingVertical: 3,
                        paddingHorizontal: 7,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: colors.textMuted,
                          fontWeight: "600",
                        }}>
                          🛵 {p.delivery_fee}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── ALL PARTNERS (vertical with pagination) ───────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: "900",
              color: colors.text,
            }}>
              {activeCategory === "all"
                ? "🏪 جميع الشركاء"
                : categories.find(c => c.id === activeCategory)?.label}
            </Text>
            <Text style={{
              fontSize: 12,
              color: "#9CA3AF",
            }}>
              {filtered.length} متجر
            </Text>
          </View>

          {filtered.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={{
                color: colors.textMuted,
                marginTop: 12,
                fontWeight: "700",
              }}>
                لا توجد نتائج
              </Text>
            </View>
          )}

          {filtered.map(p => (
            <PartnerCard
              key={p.id}
              partner={p}
              onPress={() => router.push(`/restaurant/${p.id}`)}
            />
          ))}

          {/* ✅ Load More Button */}
          {hasMorePartners && filtered.length > 0 && (
            <Pressable
              onPress={() => {
                analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.LOAD_MORE, { page });
                loadMorePartners();
              }}
              disabled={isLoadingMore}
              {...A11yPresets.button()}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 20,
                opacity: isLoadingMore ? 0.5 : 1,
              }}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Text style={{
                  color: colors.primary,
                  fontWeight: "900",
                  fontSize: 16,
                }}>
                  ↓ تحميل المزيد
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaDisplay>
  );
}
