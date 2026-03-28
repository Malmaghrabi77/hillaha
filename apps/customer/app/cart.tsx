import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Image } from "react-native";
import { router } from "expo-router";
import { useCart } from "../lib/cartStore";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { analyticsTracker } from "../src/utils/analyticsTracker";
import { A11yPresets } from "../src/hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../src/constants/analyticsEvents";
import { SafeAreaScrollView, SafeAreaDisplay } from "../src/components";

export default function Cart() {
  const { isDarkMode, colors } = useDarkMode();
  const cart = useCart();
  const [promo, setPromo]     = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.CART);
  }, []);

  const subtotal    = cart.subtotal;
  const deliveryFee = cart.deliveryFee;
  const total       = subtotal + deliveryFee - discount;
  const loyaltyEarn = cart.loyaltyEarn;

  function applyPromo() {
    if (promo.trim().toUpperCase() === "HILLAHA1") {
      analyticsTracker.trackEvent(ANALYTICS_EVENTS.CART.PROMO_APPLIED, { code: 'HILLAHA1', discount: 15 });
      setDiscount(15);
      setPromoOn(false);
    }
  }

  if (cart.totalItems === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <View style={{
          width: 110, height: 110, borderRadius: 55,
          backgroundColor: colors.primarySoft,
          justifyContent: "center", alignItems: "center", marginBottom: 20,
        }}>
          <Text style={{ fontSize: 52 }}>🛒</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text, marginBottom: 8 }}>السلة فارغة</Text>
        <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 14, lineHeight: 22 }}>
          أضف منتجات من متجر لتتمكن من الطلب
        </Text>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent(ANALYTICS_EVENTS.HOME.BROWSE_STORES, {});
            router.push("/(tabs)/home");
          }}
          {...A11yPresets.button("تصفح المتاجر", "انقر للانتقال إلى صفحة المتاجر")}
          style={{
            marginTop: 28, paddingVertical: 14, paddingHorizontal: 32,
            backgroundColor: colors.primary, borderRadius: 16,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>تصفح المتاجر</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaScrollView variant="page">

        {/* ── RESTAURANT HEADER ──────────────────────────── */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 18, marginBottom: 16,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: colors.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}>
            <Text style={{ fontSize: 24 }}>🏪</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>
              {cart.partnerName ?? "المتجر"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              🛵 {deliveryFee} جنيه توصيل
            </Text>
          </View>
          <Pressable
            onPress={() => {
              analyticsTracker.trackEvent(ANALYTICS_EVENTS.CART.ADD_MORE_ITEMS, {});
              router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
            }}
            {...A11yPresets.button("إضافة المزيد", "انقر لإضافة منتجات أخرى")}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>إضافة</Text>
          </Pressable>
        </View>

        {/* ── ITEMS ─────────────────────────────────────── */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: 20, overflow: "hidden",
          shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
          marginBottom: 14,
        }}>
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>
              المنتجات ({cart.totalItems})
            </Text>
          </View>
          {cart.itemList.map((item, idx) => (
            <View key={item.id} style={{
              flexDirection: "row", alignItems: "center",
              padding: 14, gap: 12,
              borderBottomWidth: idx < cart.itemList.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
              <View style={{
                width: 50, height: 50, borderRadius: 13,
                backgroundColor: colors.primarySoft,
                overflow: "hidden",
                justifyContent: "center", alignItems: "center",
              }}>
                {item.image
                  ? <Image source={{ uri: item.image }} style={{ width: 50, height: 50, resizeMode: "cover" }} />
                  : <Text style={{ fontSize: 26 }}>🍽️</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 14 }}>{item.nameAr}</Text>
                <Text style={{ color: colors.primary, fontWeight: "900", marginTop: 4, fontSize: 14 }}>
                  {item.price * item.qty} جنيه
                </Text>
              </View>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: colors.primarySoft, borderRadius: 12, padding: 4, gap: 6,
              }}>
                <Pressable
                  onPress={() => {
                    analyticsTracker.trackEvent(ANALYTICS_EVENTS.CART.ITEM_REMOVED, { itemId: item.id });
                    cart.removeItem(item.id);
                  }}
                  {...A11yPresets.button("إزالة", "انقر لإزالة هذا المنتج")}
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    backgroundColor: colors.surface,
                    justifyContent: "center", alignItems: "center",
                    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: colors.primary }}>−</Text>
                </Pressable>
                <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 15, minWidth: 20, textAlign: "center" }}>
                  {item.qty}
                </Text>
                <Pressable
                  onPress={() => {
                    analyticsTracker.trackEvent(ANALYTICS_EVENTS.CART.ITEM_ADDED, { itemId: item.id });
                    cart.addItem({
                      id: item.id, name: item.name, nameAr: item.nameAr,
                      price: item.price, image: item.image,
                      partnerId: cart.partnerId!, partnerName: cart.partnerName!,
                    });
                  }}
                  {...A11yPresets.button("إضافة", "انقر لإضافة كمية")}
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    backgroundColor: colors.primary,
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "white" }}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* ── DELIVERY ADDRESS ──────────────────────────── */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 14,
          shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>📍 عنوان التوصيل</Text>
            <Pressable {...A11yPresets.button("تغيير العنوان", "انقر لتغيير عنوان التوصيل")}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>تغيير</Text>
            </Pressable>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12,
          }}>
            <Text style={{ fontSize: 18 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>قنا — وسط المدينة</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>شارع النيل، أمام الكورنيش</Text>
            </View>
          </View>
        </View>

        {/* ── PROMO CODE ──────────────────────────────── */}
        {discount > 0 ? (
          <View style={{
            backgroundColor: isDarkMode ? colors.surfaceSecondary : colors.lightBg1, borderRadius: 16, padding: 14,
            borderWidth: 1.5, borderColor: isDarkMode ? colors.success : colors.ratingText,
            flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 20 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: isDarkMode ? colors.success : colors.ratingDark, fontSize: 14 }}>تم تطبيق الكود!</Text>
              <Text style={{ color: isDarkMode ? colors.success : colors.ratingDark, fontSize: 12, marginTop: 2 }}>خصم 15 جنيه على طلبك</Text>
            </View>
            <Pressable onPress={() => setDiscount(0)}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setPromoOn(v => !v)}
            {...A11yPresets.button("إدخال كود خصم", "انقر لإظهار حقل إدخال الكود")}
            style={{
              backgroundColor: colors.surface, borderRadius: 16, padding: 14,
              flexDirection: "row", alignItems: "center", gap: 10, marginBottom: promoOn ? 0 : 14,
              shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: colors.pinkSoft,
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 18 }}>🎟️</Text>
            </View>
            <Text style={{ flex: 1, fontWeight: "700", color: colors.text, fontSize: 14 }}>
              هل لديك كود خصم؟
            </Text>
            <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 18 }}>
              {promoOn ? "▴" : "▾"}
            </Text>
          </Pressable>
        )}
        {promoOn && !discount && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 16, padding: 14,
            flexDirection: "row", gap: 10, marginBottom: 14,
            shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
            borderTopWidth: 1, borderTopColor: colors.border,
          }}>
            <TextInput
              value={promo}
              onChangeText={setPromo}
              placeholder="أدخل كود الخصم"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1, borderWidth: 1.5, borderColor: colors.border,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                fontSize: 14, color: colors.text, textAlign: "right",
                backgroundColor: colors.bg,
              }}
            />
            <Pressable
              onPress={applyPromo}
              {...A11yPresets.button("تطبيق الكود", "انقر لتطبيق كود الخصم")}
              style={{
                paddingHorizontal: 18, borderRadius: 12,
                backgroundColor: colors.primary, justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>تطبيق</Text>
            </Pressable>
          </View>
        )}

        {/* ── LOYALTY ─────────────────────────────────── */}
        <View style={{
          backgroundColor: colors.primarySoft, borderRadius: 16, padding: 12,
          flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13, flex: 1 }}>
            ستكسب <Text style={{ fontWeight: "900" }}>{loyaltyEarn} نقطة ولاء</Text> من هذا الطلب!
          </Text>
        </View>

        {/* ── ORDER SUMMARY ───────────────────────────── */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: 20, overflow: "hidden",
          shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>ملخص الطلب</Text>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            {[
              { label: "المجموع الجزئي", value: `${subtotal} جنيه`, bold: false },
              { label: "رسوم التوصيل",   value: `+ ${deliveryFee} جنيه`, bold: false },
              ...(discount > 0 ? [{ label: "خصم الكود", value: `- ${discount} جنيه`, bold: false, green: true }] : []),
            ].map((row: any, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{row.label}</Text>
                <Text style={{ fontWeight: "700", color: row.green ? colors.success : colors.text, fontSize: 14 }}>
                  {row.value}
                </Text>
              </View>
            ))}
            <View style={{ height: 1.5, backgroundColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>الإجمالي</Text>
              <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 18 }}>{total} جنيه</Text>
            </View>
          </View>
        </View>
      </SafeAreaScrollView>

      {/* ── CHECKOUT BUTTON ──────────────────────────────── */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 16, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent(ANALYTICS_EVENTS.CART.CHECKOUT_INITIATED, { total, itemCount: cart.totalItems });
            router.push("/checkout");
          }}
          {...A11yPresets.button("إتمام الطلب", `انقر للانتقال إلى الدفع - المجموع: ${total} جنيه`)}
          style={{
            backgroundColor: colors.primary, borderRadius: 18,
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            paddingVertical: 16, paddingHorizontal: 22,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
          }}
        >
          <View style={{
            backgroundColor: "rgba(255,255,255,0.25)",
            paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
          }}>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>
              {cart.totalItems} منتج
            </Text>
          </View>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>إتمام الطلب</Text>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 16 }}>{total} جنيه</Text>
        </Pressable>
      </View>
    </View>
  );
}
