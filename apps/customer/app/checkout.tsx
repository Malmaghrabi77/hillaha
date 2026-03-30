import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, TextInput,
  ActivityIndicator, Image, Alert,
} from "react-native";
import { router } from "expo-router";
import { useCart } from "../lib/cartStore";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { useSupabase } from "../src/hooks/useSupabase";
import { analyticsTracker } from "../src/utils/analyticsTracker";
import { A11yPresets } from "../src/hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../src/constants/analyticsEvents";
import { SafeAreaScrollView, LocationPickerMap } from "../src/components";
import * as ImagePicker from "expo-image-picker";

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
}

type PayMethod = "cash" | "wallet" | "instapay" | "etisalat" | "vodafone" | "card";

const FALLBACK_ACCOUNTS = {
  instapay:  { account: "@malmaghrabi77",  instructions: "افتح تطبيق InstaPay وحوّل المبلغ إلى الحساب التالي" },
  etisalat:  { phone:   "01107549225",     instructions: "حوّل المبلغ عبر خدمة E& (اتصالات) إلى الرقم التالي" },
  vodafone:  { phone:   null as string | null, instructions: "سيتم الإعلان عن رقم محفظة Vodafone Cash قريباً" },
} as const;

const METHODS: { id: PayMethod; label: string; desc: string; icon: string; soon?: boolean }[] = [
  { id: "cash",      label: "كاش عند الاستلام", desc: "ادفع نقداً للمندوب",                           icon: "💵" },
  { id: "wallet",    label: "المحفظة",            desc: "ادفع من رصيد محفظتك",                         icon: "👛" },
  { id: "instapay",  label: "InstaPay",           desc: `تحويل لحظي — حساب: ${FALLBACK_ACCOUNTS.instapay.account}`, icon: "📲" },
  { id: "etisalat",  label: "E& (اتصالات)",       desc: `تحويل رصيد — ${FALLBACK_ACCOUNTS.etisalat.phone}`,        icon: "📡" },
  { id: "vodafone",  label: "Vodafone Cash",       desc: "الحساب قيد التحديد — قريباً",                icon: "📱", soon: true },
  { id: "card",      label: "بطاقة بنكية",         desc: "فيزا / ماستر كارد (قريباً)",                 icon: "💳", soon: true },
];

export default function Checkout() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const cart = useCart();
  const [method, setMethod]             = useState<PayMethod>("cash");
  const [address, setAddress]           = useState("");
  const [note, setNote]                 = useState("");
  const [phone, setPhone]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [proofUri, setProofUri]         = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showMap, setShowMap]           = useState(false);
  const [mapLat, setMapLat]             = useState<number | null>(null);
  const [mapLng, setMapLng]             = useState<number | null>(null);
  const [liveAccounts, setLiveAccounts] = useState<{
    instapay_account: string;
    etisalat_phone:   string;
    vodafone_phone:   string;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const needsProof = method === "instapay" || method === "etisalat";

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.CHECKOUT);

    if (!supabase) return;

    supabase.auth.getUser().then(({ data }: any) => {
      const meta = data.user?.user_metadata as any;
      if (meta?.phone) setPhone(meta.phone);

      // Fetch wallet balance
      const userId = data.user?.id;
      if (userId) {
        supabase.rpc("get_wallet_balance", { p_customer_id: userId })
          .then(({ data: bal }: any) => {
            if (bal !== null && bal !== undefined) setWalletBalance(Number(bal));
          })
          .catch(() => {});

        // Fetch saved addresses
        (supabase as any)
          .from("addresses")
          .select("*")
          .eq("user_id", userId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .then(({ data: addrs }: any) => {
            if (addrs?.length) {
              setSavedAddresses(addrs);
              // Auto-select default address
              const defaultAddr = addrs.find((a: SavedAddress) => a.is_default) || addrs[0];
              if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
                const fullAddr = [defaultAddr.street, defaultAddr.building, defaultAddr.floor ? `دور ${defaultAddr.floor}` : "", defaultAddr.apartment ? `شقة ${defaultAddr.apartment}` : ""].filter(Boolean).join("، ");
                setAddress(fullAddr);
                if (defaultAddr.latitude) setMapLat(defaultAddr.latitude);
                if (defaultAddr.longitude) setMapLng(defaultAddr.longitude);
              }
            }
          })
          .catch(() => {});
      }
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

  function handleSetMethod(m: PayMethod) {
    analyticsTracker.trackEvent(ANALYTICS_EVENTS.CHECKOUT.PAYMENT_METHOD_SELECTED, { method: m });
    setMethod(m);
    setProofUri(null);
    setError("");
  }

  async function pickProof() {
    try {
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
        analyticsTracker.trackEvent(ANALYTICS_EVENTS.CHECKOUT.PAYMENT_PROOF_UPLOADED, {});
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
      if (!supabase) throw new Error("خطأ في الاتصال");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      // Wallet balance validation
      if (method === "wallet") {
        if (walletBalance === null || walletBalance < cart.total) {
          const bal = walletBalance ?? 0;
          setError(`رصيد المحفظة غير كافٍ (${bal.toFixed(2)} ج). المطلوب: ${cart.total} ج`);
          setLoading(false);
          return;
        }
      }

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

      // Wallet deduction
      if (method === "wallet") {
        const { data: deductResult } = await supabase.rpc("deduct_wallet_balance", {
          p_customer_id: user.id,
          p_amount: cart.total,
          p_description: `دفع طلب — ${cart.partnerName ?? "طلب"}`,
        });
        if (!deductResult?.success) {
          throw new Error(deductResult?.error ?? "رصيد المحفظة غير كافٍ");
        }
        setWalletBalance(Number(deductResult.remaining));
      }

      const { data: order, error: insertError } = await supabase
        .from("orders")
        .insert({
          customer_id:       user.id,
          partner_id:        cart.partnerId,
          delivery_address:  address.trim(),
          delivery_lat:      mapLat,
          delivery_lng:      mapLng,
          customer_phone:    phone.trim() || null,
          customer_note:     note.trim()  || null,
          items:             cart.itemList.map(i => ({ name: i.nameAr, qty: i.qty, price: i.price })),
          subtotal:          cart.subtotal,
          delivery_fee:      cart.deliveryFee,
          discount:          0,
          total:             cart.total,
          payment_method:    (method === "cash" || method === "card") ? method : "wallet_transfer",
          payment_proof_url: proofStorageUrl,
          status:            "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Order insert error:", JSON.stringify(insertError));
        throw insertError;
      }

      if (!order?.id) {
        throw new Error("لم يتم إنشاء الطلب بشكل صحيح");
      }

      analyticsTracker.trackOrderCompleted(order.id, cart.total, cart.partnerId!, method);
      cart.clearCart();
      router.replace(`/tracking/${order.id}`);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const loyaltyPoints = cart.loyaltyEarn;
  const accounts = liveAccounts
    ? {
        instapay: { account: liveAccounts.instapay_account, instructions: FALLBACK_ACCOUNTS.instapay.instructions },
        etisalat: { phone:   liveAccounts.etisalat_phone,   instructions: FALLBACK_ACCOUNTS.etisalat.instructions },
      }
    : FALLBACK_ACCOUNTS;

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaScrollView variant="modal">
      {/* ORDER SUMMARY */}
        <View style={{
          padding: 16, borderRadius: 16, marginBottom: 16,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15, marginBottom: 12 }}>
            ملخص الطلب — {cart.partnerName ?? "المتجر"}
          </Text>
          {cart.itemList.map((item, i) => (
            <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item.nameAr} × {item.qty}</Text>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>{item.price * item.qty} ج</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          {[
            { label: "المجموع الجزئي", value: `${cart.subtotal} ج` },
            { label: "رسوم التوصيل",   value: `${cart.deliveryFee} ج` },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>{row.value}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>الإجمالي</Text>
            <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 18 }}>{cart.total} ج</Text>
          </View>
        </View>

        {/* DELIVERY ADDRESS */}
        <View style={{
          padding: 16, borderRadius: 16, marginBottom: 16,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ fontWeight: "900", color: colors.text, fontSize: 14, marginBottom: 10 }}>
            📍 عنوان التوصيل
          </Text>

          {/* Saved addresses selector */}
          {savedAddresses.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, textAlign: "right" }}>
                اختر من عناوينك المحفوظة:
              </Text>
              {savedAddresses.map(addr => {
                const isSelected = selectedAddressId === addr.id;
                const fullAddr = [addr.label, addr.street, addr.building].filter(Boolean).join(" — ");
                return (
                  <Pressable
                    key={addr.id}
                    onPress={() => {
                      setSelectedAddressId(addr.id);
                      const parts = [addr.street, addr.building, addr.floor ? `دور ${addr.floor}` : "", addr.apartment ? `شقة ${addr.apartment}` : ""].filter(Boolean).join("، ");
                      setAddress(parts);
                      setShowMap(false);
                      if (addr.latitude) setMapLat(addr.latitude);
                      if (addr.longitude) setMapLng(addr.longitude);
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 10,
                      padding: 12, borderRadius: 12, marginBottom: 6,
                      backgroundColor: isSelected ? colors.primarySoft : colors.bg,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      borderWidth: 2, borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                      justifyContent: "center", alignItems: "center",
                    }}>
                      {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "white" }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "800", color: colors.text, fontSize: 13 }}>
                        {addr.label || "عنوان"} {addr.is_default ? "⭐" : ""}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{fullAddr}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* New address via map */}
          <Pressable
            onPress={() => {
              setSelectedAddressId(null);
              setShowMap(!showMap);
            }}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              paddingVertical: 10, borderRadius: 12, marginBottom: 10,
              backgroundColor: showMap ? colors.primarySoft : colors.bg,
              borderWidth: 1.5,
              borderColor: showMap ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 16 }}>🗺️</Text>
            <Text style={{ fontWeight: "800", color: showMap ? colors.primary : colors.text, fontSize: 13 }}>
              {savedAddresses.length > 0 ? "تحديد عنوان جديد على الخريطة" : "حدد موقعك على الخريطة"}
            </Text>
          </Pressable>

          {showMap && (
            <View style={{ marginBottom: 10 }}>
              <LocationPickerMap
                latitude={mapLat}
                longitude={mapLng}
                onLocationSelect={(lat, lng) => {
                  setMapLat(lat);
                  setMapLng(lng);
                }}
                height={200}
                colors={colors}
              />
            </View>
          )}

          <TextInput
            value={address}
            onChangeText={(t) => { setAddress(t); if (selectedAddressId) setSelectedAddressId(null); }}
            placeholder="مثال: شارع التحرير، المعادي، الدور 3"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            style={{
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
              padding: 12, fontSize: 14, color: colors.text,
              backgroundColor: colors.bg, textAlign: "right", marginBottom: 10,
            }}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="رقم الهاتف للمندوب"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={{
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
              padding: 12, fontSize: 14, color: colors.text,
              backgroundColor: colors.bg, textAlign: "right", marginBottom: 10,
            }}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="ملاحظة للمطعم (اختياري)"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
              padding: 12, fontSize: 14, color: colors.text,
              backgroundColor: colors.bg, textAlign: "right",
            }}
          />
        </View>

        {/* PAYMENT METHODS */}
        <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text, marginBottom: 12 }}>
          طريقة الدفع
        </Text>
        {METHODS.map(m => {
          const isWallet = m.id === "wallet";
          const walletInsufficient = isWallet && walletBalance !== null && walletBalance < cart.total;
          const desc = isWallet && walletBalance !== null
            ? `رصيدك: ${walletBalance.toFixed(2)} جنيه`
            : m.desc;
          return (
          <Pressable
            key={m.id}
            onPress={() => !m.soon && !walletInsufficient && handleSetMethod(m.id)}
            {...A11yPresets.button(m.label, desc)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 16, marginBottom: 10,
              backgroundColor: method === m.id ? colors.primarySoft : colors.surface,
              borderWidth: 2,
              borderColor: method === m.id ? colors.primary : colors.border,
              opacity: m.soon || walletInsufficient ? 0.5 : 1,
            }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              borderWidth: 2, borderColor: method === m.id ? colors.primary : colors.border,
              backgroundColor: method === m.id ? colors.primary : "transparent",
              justifyContent: "center", alignItems: "center",
            }}>
              {method === m.id && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "white" }} />
              )}
            </View>
            <Text style={{ fontSize: 22 }}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: colors.text, fontSize: 14 }}>{m.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{m.desc}</Text>
            </View>
            {m.soon && (
              <View style={{ backgroundColor: colors.warning, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>قريباً</Text>
              </View>
            )}
          </Pressable>
        );
        })}

        {/* TRANSFER INSTRUCTIONS */}
        {(method === "instapay" || method === "etisalat") && (() => {
          const acct = accounts[method as "instapay" | "etisalat"];
          const value = method === "instapay"
            ? (acct as typeof FALLBACK_ACCOUNTS.instapay).account
            : (acct as typeof FALLBACK_ACCOUNTS.etisalat).phone;
          return (
            <View style={{
              padding: 16, borderRadius: 16, marginBottom: 12,
              backgroundColor: isDarkMode ? "#064E3B" : colors.lightBg1,
              borderWidth: 1.5, borderColor: isDarkMode ? colors.success : colors.ratingText,
            }}>
              <Text style={{ fontWeight: "900", color: isDarkMode ? colors.success : colors.ratingDark, fontSize: 13, marginBottom: 6 }}>
                📋 تعليمات التحويل
              </Text>
              <Text style={{ color: isDarkMode ? colors.success : colors.ratingDark, fontSize: 13, marginBottom: 10, lineHeight: 20 }}>
                {acct.instructions}
              </Text>
              <View style={{
                backgroundColor: isDarkMode ? "#0F766E" : colors.lightBg3, borderRadius: 10,
                paddingVertical: 10, paddingHorizontal: 14, alignItems: "center",
              }}>
                <Text style={{ color: isDarkMode ? "#CCFBF1" : colors.textSecondary, fontWeight: "900", fontSize: 20, letterSpacing: 1, textAlign: "center" }}>
                  {value}
                </Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8, textAlign: "center" }}>
                اكتب رقم طلبك في ملاحظة التحويل حتى نتعرف عليك
              </Text>
            </View>
          );
        })()}

        {/* رفع إثبات الدفع */}
        {needsProof && (
          <View style={{
            padding: 16, borderRadius: 16, marginBottom: 16,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: proofUri ? colors.success : colors.warning,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 18 }}>{proofUri ? "✅" : "📎"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: colors.text, fontSize: 14 }}>
                  رفع إثبات التحويل
                </Text>
                <Text style={{ color: colors.danger, fontSize: 11, fontWeight: "700" }}>
                  إلزامي — لا يمكن تأكيد الطلب بدونه
                </Text>
              </View>
            </View>

            {proofUri ? (
              <View style={{ marginBottom: 10 }}>
                <Image
                  source={{ uri: proofUri }}
                  style={{
                    width: "100%", height: 160, borderRadius: 12,
                    resizeMode: "cover", backgroundColor: colors.border,
                  }}
                />
                <Text style={{
                  color: colors.success, fontWeight: "700", fontSize: 12,
                  textAlign: "center", marginTop: 6,
                }}>
                  تم اختيار صورة الإثبات
                </Text>
              </View>
            ) : (
              <View style={{
                height: 100, borderRadius: 12, borderWidth: 2,
                borderColor: colors.border, borderStyle: "dashed",
                justifyContent: "center", alignItems: "center", marginBottom: 10,
                backgroundColor: colors.bg,
              }}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>🖼️</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>لم يتم اختيار صورة بعد</Text>
              </View>
            )}

            <Pressable
              onPress={pickProof}
              {...A11yPresets.button("اختر صورة من المعرج", "انقر لاختيار صورة إثبات التحويل")}
              style={{
                paddingVertical: 12, borderRadius: 12, alignItems: "center",
                backgroundColor: proofUri ? colors.pinkSoft : colors.primarySoft,
                borderWidth: 1.5,
                borderColor: proofUri ? colors.pink : colors.primary,
              }}
            >
              <Text style={{
                fontWeight: "900", fontSize: 14,
                color: proofUri ? colors.pink : colors.primary,
              }}>
                {proofUri ? "تغيير الصورة" : "اختر صورة من المعرج"}
              </Text>
            </Pressable>

            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              التقط لقطة شاشة لإشعار التحويل ثم ارفعها هنا
            </Text>
          </View>
        )}

        {/* LOYALTY */}
        <View style={{
          padding: 12, borderRadius: 16, marginTop: 4,
          backgroundColor: colors.pinkSoft, borderWidth: 1, borderColor: colors.pink,
          flexDirection: "row", alignItems: "center", gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>🎁</Text>
          <Text style={{ color: colors.pink, fontWeight: "700", fontSize: 13 }}>
            ستكسب {loyaltyPoints} نقطة ولاء من هذا الطلب
          </Text>
        </View>
      </SafeAreaScrollView>

      {/* CONFIRM BUTTON */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 16, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        {needsProof && !proofUri && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: isDarkMode ? "#78350F" : colors.lightBg1, borderRadius: 10,
            paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8,
          }}>
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <Text style={{ color: isDarkMode ? colors.ratingText : colors.ratingDark, fontSize: 12, fontWeight: "700", flex: 1 }}>
              ارفع صورة إثبات التحويل أولاً
            </Text>
          </View>
        )}
        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            {error}
          </Text>
        ) : null}
        <Pressable
          onPress={handleConfirm}
          disabled={loading || uploadingProof || (needsProof && !proofUri)}
          {...A11yPresets.button("تأكيد الطلب", `انقر لتأكيد الطلب - المجموع: ${cart.total} جنيه`)}
          style={{
            backgroundColor: (loading || uploadingProof || (needsProof && !proofUri)) ? colors.primarySoft : colors.primary,
            paddingVertical: 16, borderRadius: 16, alignItems: "center",
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: (loading || uploadingProof) ? 0 : 0.3,
            shadowRadius: 12,
            elevation: (loading || uploadingProof) ? 0 : 6,
          }}
        >
          {(loading || uploadingProof)
            ? <ActivityIndicator color="white" />
            : <Text style={{
                color: (needsProof && !proofUri) ? colors.textMuted : "white",
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
