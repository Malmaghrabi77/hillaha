import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { HALHA_THEME } from "@halha/ui";
import { getSupabase } from "@halha/core";

const C = HALHA_THEME.colors;

type PayMethod = "cash" | "instapay" | "vodafone" | "card";

const METHODS: { id: PayMethod; label: string; desc: string; icon: string }[] = [
  { id: "cash",     label: "كاش عند الاستلام", desc: "ادفع نقداً للمندوب",               icon: "💵" },
  { id: "instapay", label: "InstaPay",           desc: "تحويل لحظي عبر تطبيق InstaPay",   icon: "📲" },
  { id: "vodafone", label: "Vodafone Cash",      desc: "تحويل عبر خطك Vodafone",           icon: "📱" },
  { id: "card",     label: "بطاقة بنكية",        desc: "فيزا / ماستر كارد (قريباً)",       icon: "💳" },
];

// بيانات الطلب — ستأتي من global cart state لاحقاً
const DEMO_CART = {
  items: [
    { name: "برجر كلاسيك", qty: 2, price: 85 },
    { name: "كوكاكولا",    qty: 2, price: 20 },
  ],
  subtotal: 210,
  deliveryFee: 15,
  discount: 20,
  total: 205,
  // أول شريك متاح في قاعدة البيانات — سيُعوَّض بـ cart context
  partnerName: "برجر لاند 🍔",
};

export default function Checkout() {
  const [method, setMethod]   = useState<PayMethod>("cash");
  const [address, setAddress] = useState("");
  const [note, setNote]       = useState("");
  const [phone, setPhone]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // تحميل بيانات المستخدم تلقائياً
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as any;
      if (meta?.phone) setPhone(meta.phone);
    });
  }, []);

  async function handleConfirm() {
    if (!address.trim()) return setError("يرجى إدخال عنوان التوصيل");
    setError("");
    setLoading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("خطأ في الاتصال");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      // جلب أول شريك من قاعدة البيانات كـ demo
      const { data: partners } = await supabase
        .from("partners")
        .select("id")
        .limit(1)
        .maybeSingle();

      const { data: order, error: insertError } = await supabase
        .from("orders")
        .insert({
          customer_id:      user.id,
          partner_id:       partners?.id ?? null,
          delivery_address: address.trim(),
          customer_phone:   phone.trim() || null,
          customer_note:    note.trim()  || null,
          items:            DEMO_CART.items,
          subtotal:         DEMO_CART.subtotal,
          delivery_fee:     DEMO_CART.deliveryFee,
          discount:         DEMO_CART.discount,
          total:            DEMO_CART.total,
          payment_method:   method,
          status:           "pending",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      router.replace(`/tracking/${order.id}`);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const loyaltyPoints = Math.floor(DEMO_CART.total / 10);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>

        {/* ORDER SUMMARY */}
        <View style={{
          padding: 16, borderRadius: 16, marginBottom: 16,
          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontWeight: "900", color: C.text, fontSize: 15, marginBottom: 12 }}>
            ملخص الطلب — {DEMO_CART.partnerName}
          </Text>
          {DEMO_CART.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>{item.name} × {item.qty}</Text>
              <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{item.price * item.qty} ج</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8 }} />
          {[
            { label: "المجموع الجزئي", value: `${DEMO_CART.subtotal} ج` },
            { label: "رسوم التوصيل",   value: `${DEMO_CART.deliveryFee} ج` },
            { label: "خصم",            value: `- ${DEMO_CART.discount} ج` },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{row.value}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "900", color: C.text, fontSize: 15 }}>الإجمالي</Text>
            <Text style={{ fontWeight: "900", color: C.primary, fontSize: 18 }}>{DEMO_CART.total} ج</Text>
          </View>
        </View>

        {/* DELIVERY ADDRESS */}
        <View style={{
          padding: 16, borderRadius: 16, marginBottom: 16,
          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontWeight: "900", color: C.text, fontSize: 14, marginBottom: 10 }}>
            📍 عنوان التوصيل
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="مثال: شارع التحرير، المعادي، الدور 3"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={2}
            style={{
              borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
              padding: 12, fontSize: 14, color: C.text,
              backgroundColor: C.bg, textAlign: "right",
              marginBottom: 10,
            }}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="رقم الهاتف للمندوب"
            placeholderTextColor={C.textMuted}
            keyboardType="phone-pad"
            style={{
              borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
              padding: 12, fontSize: 14, color: C.text,
              backgroundColor: C.bg, textAlign: "right",
              marginBottom: 10,
            }}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="ملاحظة للمطعم (اختياري)"
            placeholderTextColor={C.textMuted}
            style={{
              borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
              padding: 12, fontSize: 14, color: C.text,
              backgroundColor: C.bg, textAlign: "right",
            }}
          />
        </View>

        {/* PAYMENT METHODS */}
        <Text style={{ fontSize: 15, fontWeight: "900", color: C.text, marginBottom: 12 }}>
          طريقة الدفع
        </Text>
        {METHODS.map(m => (
          <Pressable
            key={m.id}
            onPress={() => m.id !== "card" && setMethod(m.id)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 16, marginBottom: 10,
              backgroundColor: method === m.id ? C.primarySoft : C.surface,
              borderWidth: 2,
              borderColor: method === m.id ? C.primary : C.border,
              opacity: m.id === "card" ? 0.5 : 1,
            }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              borderWidth: 2, borderColor: method === m.id ? C.primary : C.border,
              backgroundColor: method === m.id ? C.primary : "transparent",
              justifyContent: "center", alignItems: "center",
            }}>
              {method === m.id && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "white" }} />
              )}
            </View>
            <Text style={{ fontSize: 22 }}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: C.text, fontSize: 14 }}>{m.label}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{m.desc}</Text>
            </View>
            {m.id === "card" && (
              <View style={{ backgroundColor: C.warning, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>قريباً</Text>
              </View>
            )}
          </Pressable>
        ))}

        {/* LOYALTY */}
        <View style={{
          padding: 12, borderRadius: 16, marginTop: 4,
          backgroundColor: C.pinkSoft, borderWidth: 1, borderColor: C.pink,
          flexDirection: "row", alignItems: "center", gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>🎁</Text>
          <Text style={{ color: C.pink, fontWeight: "700", fontSize: 13 }}>
            ستكسب {loyaltyPoints} نقطة ولاء من هذا الطلب
          </Text>
        </View>
      </ScrollView>

      {/* CONFIRM BUTTON */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 16, backgroundColor: C.surface,
        borderTopWidth: 1, borderTopColor: C.border,
      }}>
        {error ? (
          <Text style={{
            color: C.danger, fontSize: 12, fontWeight: "700",
            textAlign: "center", marginBottom: 8,
          }}>{error}</Text>
        ) : null}
        <Pressable
          onPress={handleConfirm}
          disabled={loading}
          style={{
            backgroundColor: loading ? C.primarySoft : C.primary,
            paddingVertical: 16, borderRadius: 16, alignItems: "center",
            shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: loading ? 0 : 0.3, shadowRadius: 12, elevation: loading ? 0 : 6,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                تأكيد الطلب — {DEMO_CART.total} ج
              </Text>
          }
        </Pressable>
      </View>
    </View>
  );
}
