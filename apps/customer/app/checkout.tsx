import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, Image,
} from "react-native";
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

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

type PayMethod = "cash" | "instapay" | "etisalat" | "vodafone" | "card";

// ── حسابات الدفع الرسمية لمنصة حلّها ─────────────────────────────────────────
// المصدر الحقيقي: جدول platform_settings في Supabase (قابل للتعديل من لوحة السوبر أدمن)
// التالي: قيم احتياطية فقط للحالات التي يتعذر فيها الاتصال
const FALLBACK_ACCOUNTS = {
  instapay:  { account: "@malmaghrabi77",  instructions: "افتح تطبيق InstaPay وحوّل المبلغ إلى الحساب التالي" },
  etisalat:  { phone:   "01107549225",     instructions: "حوّل المبلغ عبر خدمة E& (اتصالات) إلى الرقم التالي" },
  vodafone:  { phone:   null as string | null, instructions: "سيتم الإعلان عن رقم محفظة Vodafone Cash قريباً" },
} as const;

const METHODS: { id: PayMethod; label: string; desc: string; icon: string; soon?: boolean }[] = [
  { id: "cash",      label: "كاش عند الاستلام", desc: "ادفع نقداً للمندوب",                           icon: "💵" },
  { id: "instapay",  label: "InstaPay",           desc: `تحويل لحظي — حساب: ${FALLBACK_ACCOUNTS.instapay.account}`, icon: "📲" },
  { id: "etisalat",  label: "E& (اتصالات)",       desc: `تحويل رصيد — ${FALLBACK_ACCOUNTS.etisalat.phone}`,        icon: "📡" },
  { id: "vodafone",  label: "Vodafone Cash",       desc: "الحساب قيد التحديد — قريباً",                icon: "📱", soon: true },
  { id: "card",      label: "بطاقة بنكية",         desc: "فيزا / ماستر كارد (قريباً)",                 icon: "💳", soon: true },
];

export default function Checkout() {
  const cart = useCart();
  const [method, setMethod]             = useState<PayMethod>("cash");
  const [address, setAddress]           = useState("");
  const [note, setNote]                 = useState("");
  const [phone, setPhone]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  // إثبات الدفع
  const [proofUri, setProofUri]         = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // حسابات الاستلام المُحمَّلة من Supabase
  const [liveAccounts, setLiveAccounts] = useState<{
    instapay_account: string;
    etisalat_phone:   string;
    vodafone_phone:   string;
  } | null>(null);

  // هل طريقة الدفع المختارة تتطلب رفع إثبات؟
  const needsProof = method === "instapay" || method === "etisalat";

  // تحميل بيانات المستخدم + حسابات الاستلام من Supabase
  useEffect(() => {
    const supabase = getSB();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }: any) => {
      const meta = data.user?.user_metadata as any;
      if (meta?.phone) setPhone(meta.phone);
    }).catch(() => {});

    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["instapay_account", "etisalat_phone", "vodafone_phone"])
      .then(({ data }: any) => {
        if (!data?.length) return;
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setLiveAccounts({
          instapay_account: map["instapay_account"] || FALLBACK_ACCOUNTS.instapay.account,
          etisalat_phone:   map["etisalat_phone"]   || FALLBACK_ACCOUNTS.etisalat.phone,
          vodafone_phone:   map["vodafone_phone"]    || "",
        });
      }).catch(() => {});
  }, []);

  // عند تغيير طريقة الدفع: إعادة تعيين الإثبات
  function handleSetMethod(m: PayMethod) {
    setMethod(m);
    setProofUri(null);
    setError("");
  }

  // اختيار صورة إثبات التحويل من المعرض
  async function pickProof() {
    try {
      const ImagePicker = require("expo-image-picker") as any;
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("يجب السماح بالوصول للصور لرفع إثبات التحويل");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setProofUri(result.assets[0].uri);
        setError("");
      }
    } catch {
      setError("تعذّر فتح المعرض، حاول مرة أخرى");
    }
  }

  async function handleConfirm() {
    if (!address.trim()) return setError("يرجى إدخال عنوان التوصيل");
    if (needsProof && !proofUri) return setError("يجب رفع صورة إثبات التحويل قبل تأكيد الطلب");
    setError("");
    setLoading(true);

    try {
      const supabase = getSB();
      if (!supabase) throw new Error("خطأ في الاتصال");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      // رفع صورة الإثبات إلى Supabase Storage
      let proofStorageUrl: string | null = null;
      if (proofUri && needsProof) {
        setUploadingProof(true);
        try {
          const response = await fetch(proofUri);
          const blob = await response.blob();
          const ext  = proofUri.split(".").pop()?.split("?")[0] ?? "jpg";
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("payment-proofs")
            .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from("payment-proofs")
              .getPublicUrl(path);
            proofStorageUrl = publicUrl;
          }
        } finally {
          setUploadingProof(false);
        }
      }

      const { data: order, error: insertError } = await supabase
        .from("orders")
        .insert({
          customer_id:       user.id,
          partner_id:        cart.partnerId,
          delivery_address:  address.trim(),
          customer_phone:    phone.trim() || null,
          customer_note:     note.trim()  || null,
          items:             cart.itemList.map(i => ({ name: i.nameAr, qty: i.qty, price: i.price })),
          subtotal:          cart.subtotal,
          delivery_fee:      cart.deliveryFee,
          discount:          0,
          total:             cart.total,
          // map UI method → DB enum (instapay/etisalat/vodafone → wallet_transfer)
          payment_method:    (method === "cash" || method === "card")
            ? method
            : "wallet_transfer",
          payment_proof_url: proofStorageUrl,
          status:            "pending",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      cart.clearCart();
      router.replace(`/tracking/${order.id}`);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const loyaltyPoints = cart.loyaltyEarn;

  // حسابات الاستلام النشطة (live أو fallback)
  const accounts = liveAccounts
    ? {
        instapay: { account: liveAccounts.instapay_account, instructions: FALLBACK_ACCOUNTS.instapay.instructions },
        etisalat: { phone:   liveAccounts.etisalat_phone,   instructions: FALLBACK_ACCOUNTS.etisalat.instructions },
      }
    : FALLBACK_ACCOUNTS;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>

        {/* ORDER SUMMARY */}
        <View style={{
          padding: 16, borderRadius: 16, marginBottom: 16,
          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontWeight: "900", color: C.text, fontSize: 15, marginBottom: 12 }}>
            ملخص الطلب — {cart.partnerName ?? "المتجر"}
          </Text>
          {cart.itemList.map((item, i) => (
            <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>{item.nameAr} × {item.qty}</Text>
              <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{item.price * item.qty} ج</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8 }} />
          {[
            { label: "المجموع الجزئي", value: `${cart.subtotal} ج` },
            { label: "رسوم التوصيل",   value: `${cart.deliveryFee} ج` },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{row.value}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "900", color: C.text, fontSize: 15 }}>الإجمالي</Text>
            <Text style={{ fontWeight: "900", color: C.primary, fontSize: 18 }}>{cart.total} ج</Text>
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
              backgroundColor: C.bg, textAlign: "right", marginBottom: 10,
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
              backgroundColor: C.bg, textAlign: "right", marginBottom: 10,
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
            onPress={() => !m.soon && handleSetMethod(m.id)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 16, marginBottom: 10,
              backgroundColor: method === m.id ? C.primarySoft : C.surface,
              borderWidth: 2,
              borderColor: method === m.id ? C.primary : C.border,
              opacity: m.soon ? 0.5 : 1,
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
            {m.soon && (
              <View style={{ backgroundColor: C.warning, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>قريباً</Text>
              </View>
            )}
          </Pressable>
        ))}

        {/* TRANSFER INSTRUCTIONS — يظهر عند اختيار InstaPay أو E& */}
        {(method === "instapay" || method === "etisalat") && (() => {
          const acct = accounts[method as "instapay" | "etisalat"];
          const value = method === "instapay"
            ? (acct as typeof FALLBACK_ACCOUNTS.instapay).account
            : (acct as typeof FALLBACK_ACCOUNTS.etisalat).phone;
          return (
            <View style={{
              padding: 16, borderRadius: 16, marginBottom: 12,
              backgroundColor: "#F0FDF4", borderWidth: 1.5, borderColor: "#86EFAC",
            }}>
              <Text style={{ fontWeight: "900", color: "#15803D", fontSize: 13, marginBottom: 6 }}>
                📋 تعليمات التحويل
              </Text>
              <Text style={{ color: "#166534", fontSize: 13, marginBottom: 10, lineHeight: 20 }}>
                {acct.instructions}
              </Text>
              <View style={{
                backgroundColor: "#DCFCE7", borderRadius: 10,
                paddingVertical: 10, paddingHorizontal: 14, alignItems: "center",
              }}>
                <Text style={{ color: "#14532D", fontWeight: "900", fontSize: 20, letterSpacing: 1, textAlign: "center" }}>
                  {value}
                </Text>
              </View>
              <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 8, textAlign: "center" }}>
                اكتب رقم طلبك في ملاحظة التحويل حتى نتعرف عليك
              </Text>
            </View>
          );
        })()}

        {/* ── رفع إثبات الدفع (إلزامي للمحافظ الإلكترونية) ── */}
        {needsProof && (
          <View style={{
            padding: 16, borderRadius: 16, marginBottom: 16,
            backgroundColor: C.surface,
            borderWidth: 2,
            borderColor: proofUri ? "#86EFAC" : C.warning,
          }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 18 }}>{proofUri ? "✅" : "📎"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: C.text, fontSize: 14 }}>
                  رفع إثبات التحويل
                </Text>
                <Text style={{ color: C.danger, fontSize: 11, fontWeight: "700" }}>
                  إلزامي — لا يمكن تأكيد الطلب بدونه
                </Text>
              </View>
            </View>

            {/* صورة الإثبات المختارة */}
            {proofUri ? (
              <View style={{ marginBottom: 10 }}>
                <Image
                  source={{ uri: proofUri }}
                  style={{
                    width: "100%", height: 160, borderRadius: 12,
                    resizeMode: "cover", backgroundColor: C.border,
                  }}
                />
                <Text style={{
                  color: "#15803D", fontWeight: "700", fontSize: 12,
                  textAlign: "center", marginTop: 6,
                }}>
                  تم اختيار صورة الإثبات
                </Text>
              </View>
            ) : (
              <View style={{
                height: 100, borderRadius: 12, borderWidth: 2,
                borderColor: C.border, borderStyle: "dashed",
                justifyContent: "center", alignItems: "center", marginBottom: 10,
                backgroundColor: C.bg,
              }}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>🖼️</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>لم يتم اختيار صورة بعد</Text>
              </View>
            )}

            {/* زر الاختيار / التغيير */}
            <Pressable
              onPress={pickProof}
              style={{
                paddingVertical: 12, borderRadius: 12, alignItems: "center",
                backgroundColor: proofUri ? "#DCFCE7" : C.primarySoft,
                borderWidth: 1.5,
                borderColor: proofUri ? "#86EFAC" : C.primary,
              }}
            >
              <Text style={{
                fontWeight: "900", fontSize: 14,
                color: proofUri ? "#15803D" : C.primary,
              }}>
                {proofUri ? "تغيير الصورة" : "اختر صورة من المعرض"}
              </Text>
            </Pressable>

            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              التقط لقطة شاشة لإشعار التحويل ثم ارفعها هنا
            </Text>
          </View>
        )}

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
        {/* تحذير: الإثبات مطلوب */}
        {needsProof && !proofUri && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: "#FEF3C7", borderRadius: 10,
            paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8,
          }}>
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <Text style={{ color: "#92400E", fontSize: 12, fontWeight: "700", flex: 1 }}>
              ارفع صورة إثبات التحويل أولاً
            </Text>
          </View>
        )}
        {error ? (
          <Text style={{ color: C.danger, fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            {error}
          </Text>
        ) : null}
        <Pressable
          onPress={handleConfirm}
          disabled={loading || uploadingProof || (needsProof && !proofUri)}
          style={{
            backgroundColor: (loading || uploadingProof || (needsProof && !proofUri)) ? C.primarySoft : C.primary,
            paddingVertical: 16, borderRadius: 16, alignItems: "center",
            shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: (loading || uploadingProof) ? 0 : 0.3,
            shadowRadius: 12,
            elevation: (loading || uploadingProof) ? 0 : 6,
          }}
        >
          {(loading || uploadingProof)
            ? <ActivityIndicator color="white" />
            : <Text style={{
                color: (needsProof && !proofUri) ? C.textMuted : "white",
                fontWeight: "900", fontSize: 16,
              }}>
                تأكيد الطلب — {cart.total} ج
              </Text>
          }
        </Pressable>
      </View>
    </View>
  );
}
