import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Image } from "react-native";
import { router } from "expo-router";
import { useCart } from "../lib/cartStore";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

export default function Cart() {
  const cart = useCart();
  const [promo, setPromo]     = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [discount, setDiscount] = useState(0);

  const subtotal    = cart.subtotal;
  const deliveryFee = cart.deliveryFee;
  const total       = subtotal + deliveryFee - discount;
  const loyaltyEarn = cart.loyaltyEarn;

  function applyPromo() {
    if (promo.trim().toUpperCase() === "HILLAHA1") {
      setDiscount(15);
      setPromoOn(false);
    }
  }

  if (cart.totalItems === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 28 }}>
        <View style={{
          width: 110, height: 110, borderRadius: 55,
          backgroundColor: "#F3F0FF",
          justifyContent: "center", alignItems: "center", marginBottom: 20,
        }}>
          <Text style={{ fontSize: 52 }}>🛒</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827", marginBottom: 8 }}>السلة فارغة</Text>
        <Text style={{ color: "#9CA3AF", textAlign: "center", fontSize: 14, lineHeight: 22 }}>
          أضف منتجات من متجر لتتمكن من الطلب
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/home")}
          style={{
            marginTop: 28, paddingVertical: 14, paddingHorizontal: 32,
            backgroundColor: C.primary, borderRadius: 16,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>تصفح المتاجر</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>

        {/* ── RESTAURANT HEADER ──────────────────────────── */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 18, marginBottom: 16,
          backgroundColor: "white",
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: "#EDE9FE",
            justifyContent: "center", alignItems: "center",
          }}>
            <Text style={{ fontSize: 24 }}>🏪</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", color: "#111827", fontSize: 15 }}>
              {cart.partnerName ?? "المتجر"}
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              🛵 {deliveryFee} جنيه توصيل
            </Text>
          </View>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>إضافة</Text>
          </Pressable>
        </View>

        {/* ── ITEMS ─────────────────────────────────────── */}
        <View style={{
          backgroundColor: "white", borderRadius: 20, overflow: "hidden",
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
          marginBottom: 14,
        }}>
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontWeight: "900", color: "#111827", fontSize: 15 }}>
              المنتجات ({cart.totalItems})
            </Text>
          </View>
          {cart.itemList.map((item, idx) => (
            <View key={item.id} style={{
              flexDirection: "row", alignItems: "center",
              padding: 14, gap: 12,
              borderBottomWidth: idx < cart.itemList.length - 1 ? 1 : 0,
              borderBottomColor: "#F9FAFB",
            }}>
              <View style={{
                width: 50, height: 50, borderRadius: 13,
                backgroundColor: "#F9FAFB",
                overflow: "hidden",
                justifyContent: "center", alignItems: "center",
              }}>
                {item.image
                  ? <Image source={{ uri: item.image }} style={{ width: 50, height: 50, resizeMode: "cover" }} />
                  : <Text style={{ fontSize: 26 }}>🍽️</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: "#111827", fontSize: 14 }}>{item.nameAr}</Text>
                <Text style={{ color: C.primary, fontWeight: "900", marginTop: 4, fontSize: 14 }}>
                  {item.price * item.qty} جنيه
                </Text>
              </View>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: "#F3F0FF", borderRadius: 12, padding: 4, gap: 6,
              }}>
                <Pressable
                  onPress={() => cart.removeItem(item.id)}
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    backgroundColor: "white",
                    justifyContent: "center", alignItems: "center",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: C.primary }}>−</Text>
                </Pressable>
                <Text style={{ fontWeight: "900", color: C.primary, fontSize: 15, minWidth: 20, textAlign: "center" }}>
                  {item.qty}
                </Text>
                <Pressable
                  onPress={() => cart.addItem({
                    id: item.id, name: item.name, nameAr: item.nameAr,
                    price: item.price, image: item.image,
                    partnerId: cart.partnerId!, partnerName: cart.partnerName!,
                  })}
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    backgroundColor: C.primary,
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
          backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 14,
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontWeight: "900", color: "#111827", fontSize: 15 }}>📍 عنوان التوصيل</Text>
            <Pressable>
              <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>تغيير</Text>
            </Pressable>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12,
          }}>
            <Text style={{ fontSize: 18 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#374151", fontSize: 13 }}>قنا — وسط المدينة</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>شارع النيل، أمام الكورنيش</Text>
            </View>
          </View>
        </View>

        {/* ── PROMO CODE ────────────────────────────────── */}
        {discount > 0 ? (
          <View style={{
            backgroundColor: "#F0FDF4", borderRadius: 16, padding: 14,
            borderWidth: 1.5, borderColor: "#86EFAC",
            flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 20 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: "#166534", fontSize: 14 }}>تم تطبيق الكود!</Text>
              <Text style={{ color: "#16A34A", fontSize: 12, marginTop: 2 }}>خصم 15 جنيه على طلبك</Text>
            </View>
            <Pressable onPress={() => setDiscount(0)}>
              <Text style={{ color: "#9CA3AF", fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setPromoOn(v => !v)}
            style={{
              backgroundColor: "white", borderRadius: 16, padding: 14,
              flexDirection: "row", alignItems: "center", gap: 10, marginBottom: promoOn ? 0 : 14,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: "#FDF4FF",
              justifyContent: "center", alignItems: "center",
            }}>
              <Text style={{ fontSize: 18 }}>🎟️</Text>
            </View>
            <Text style={{ flex: 1, fontWeight: "700", color: "#374151", fontSize: 14 }}>
              هل لديك كود خصم؟
            </Text>
            <Text style={{ color: C.primary, fontWeight: "900", fontSize: 18 }}>
              {promoOn ? "▴" : "▾"}
            </Text>
          </Pressable>
        )}
        {promoOn && !discount && (
          <View style={{
            backgroundColor: "white", borderRadius: 16, padding: 14,
            flexDirection: "row", gap: 10, marginBottom: 14,
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
            borderTopWidth: 1, borderTopColor: "#F3F4F6",
          }}>
            <TextInput
              value={promo}
              onChangeText={setPromo}
              placeholder="أدخل كود الخصم"
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1, borderWidth: 1.5, borderColor: "#E5E7EB",
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                fontSize: 14, color: "#111827", textAlign: "right",
              }}
            />
            <Pressable
              onPress={applyPromo}
              style={{
                paddingHorizontal: 18, borderRadius: 12,
                backgroundColor: C.primary, justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>تطبيق</Text>
            </Pressable>
          </View>
        )}

        {/* ── LOYALTY ───────────────────────────────────── */}
        <View style={{
          backgroundColor: "#F3F0FF", borderRadius: 16, padding: 12,
          flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
          borderWidth: 1, borderColor: "#DDD6FE",
        }}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
          <Text style={{ color: "#5B21B6", fontWeight: "700", fontSize: 13, flex: 1 }}>
            ستكسب <Text style={{ fontWeight: "900" }}>{loyaltyEarn} نقطة ولاء</Text> من هذا الطلب!
          </Text>
        </View>

        {/* ── ORDER SUMMARY ─────────────────────────────── */}
        <View style={{
          backgroundColor: "white", borderRadius: 20, overflow: "hidden",
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontWeight: "900", color: "#111827", fontSize: 15 }}>ملخص الطلب</Text>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            {[
              { label: "المجموع الجزئي", value: `${subtotal} جنيه`, bold: false },
              { label: "رسوم التوصيل",   value: `+ ${deliveryFee} جنيه`, bold: false },
              ...(discount > 0 ? [{ label: "خصم الكود", value: `- ${discount} جنيه`, bold: false, green: true }] : []),
            ].map((row: any, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#6B7280", fontSize: 14 }}>{row.label}</Text>
                <Text style={{ fontWeight: "700", color: row.green ? "#059669" : "#374151", fontSize: 14 }}>
                  {row.value}
                </Text>
              </View>
            ))}
            <View style={{ height: 1.5, backgroundColor: "#F3F4F6", marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "900", color: "#111827", fontSize: 16 }}>الإجمالي</Text>
              <Text style={{ fontWeight: "900", color: C.primary, fontSize: 18 }}>{total} جنيه</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── CHECKOUT BUTTON ───────────────────────────────── */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 16, backgroundColor: "white",
        borderTopWidth: 1, borderTopColor: "#F3F4F6",
      }}>
        <Pressable
          onPress={() => router.push("/checkout")}
          style={{
            backgroundColor: C.primary, borderRadius: 18,
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            paddingVertical: 16, paddingHorizontal: 22,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
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
