import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, Pressable, TextInput,
  ActivityIndicator, Image, Alert, Modal, Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useCart } from "../lib/cartStore";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { useSupabase } from "../src/hooks/useSupabase";
import { analyticsTracker } from "../src/utils/analyticsTracker";
import { A11yPresets } from "../src/hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../src/constants/analyticsEvents";
import { SafeAreaScrollView } from "../src/components";
import { LocationPickerMap } from "../src/components/LocationPickerMap";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { haversineKm, formatCurrency } from "../lib/utils";

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

type PayMethod = "cash" | "wallet" | "instapay" | "etisalat" | "vodafone" | "card" | "we_pay" | "orange_money" | "meeza" | "fawry" | "aman" | "bee" | "khazna";

// Fallback payment accounts — used ONLY when platform_settings fetch fails.
// Primary source is the `platform_settings` table (keys: instapay_account, etisalat_phone, vodafone_phone).
const FALLBACK_ACCOUNTS = {
  instapay:  { account: "@malmaghrabi77",  instructions: "افتح تطبيق InstaPay وحوّل المبلغ إلى الحساب التالي" },
  etisalat:  { phone:   "01107549225",     instructions: "حوّل المبلغ عبر خدمة E& (اتصالات) إلى الرقم التالي" },
  vodafone:  { phone:   null as string | null, instructions: "سيتم الإعلان عن رقم محفظة Vodafone Cash قريباً" },
} as const;

const FALLBACK_METHODS: { id: PayMethod; label: string; desc: string; icon: string; soon?: boolean }[] = [
  { id: "cash",      label: "كاش عند الاستلام", desc: "ادفع نقداً للمندوب",                           icon: "💵" },
  { id: "wallet",    label: "المحفظة",            desc: "ادفع من رصيد محفظتك",                         icon: "👛" },
  { id: "instapay",  label: "InstaPay",           desc: `تحويل لحظي — حساب: ${FALLBACK_ACCOUNTS.instapay.account}`, icon: "📲" },
  { id: "etisalat",  label: "E& (اتصالات)",       desc: `تحويل رصيد — ${FALLBACK_ACCOUNTS.etisalat.phone}`,        icon: "📡" },
  { id: "vodafone",  label: "Vodafone Cash",       desc: "الحساب قيد التحديد — قريباً",                icon: "📱", soon: true },
  { id: "card",      label: "بطاقة بنكية",         desc: "فيزا / ماستر كارد — دفع آمن عبر PayMob",     icon: "💳" },
];

export default function Checkout() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const cart = useCart();
  const { discount: discountParam, promoCode: promoCodeParam } = useLocalSearchParams<{ discount?: string; promoCode?: string }>();
  // Display discount from cart validation (server will re-validate on submit)
  const rawDiscount = Number(discountParam) || 0;
  const discountAmount = Math.max(0, Math.min(rawDiscount, cart.total));
  const finalTotal = Math.max(0, cart.total - discountAmount);
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
  const [locationSource, setLocationSource] = useState<"gps" | "manual" | null>(null);
  const [liveAccounts, setLiveAccounts] = useState<{
    instapay_account: string;
    etisalat_phone:   string;
    vodafone_phone:   string;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymobUrl, setPaymobUrl]         = useState<string | null>(null);
  const [paymobOrderId, setPaymobOrderId] = useState<string | null>(null);
  const [dbPayMethods, setDbPayMethods]   = useState<any[]>([]);
  const addressSelectedRef = useRef(false);

  // Delivery pricing
  const [deliveryRules, setDeliveryRules] = useState<any[]>([]);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [partnerLat, setPartnerLat] = useState<number | null>(null);
  const [partnerLng, setPartnerLng] = useState<number | null>(null);
  const [partnerCity, setPartnerCity] = useState("Qena");
  const [appliedRuleId, setAppliedRuleId] = useState<string | null>(null);
  const [tooFar, setTooFar] = useState(false);

  const isHighValue = finalTotal > 1000;
  const needsProof = method !== "cash" && method !== "wallet" && method !== "card";

  // Map DB payment_methods codes to checkout PayMethod IDs
  const CODE_TO_METHOD: Record<string, PayMethod> = {
    cash: "cash", wallet: "wallet", instapay: "instapay",
    etisalat_cash: "etisalat", vodafone_cash: "vodafone",
    credit_card: "card", debit_card: "card",
    we_pay: "we_pay", orange_money: "orange_money", meeza: "meeza",
    fawry: "fawry", aman: "aman", bee: "bee", khazna: "khazna",
  };

  const METHODS = useMemo(() => {
    if (!dbPayMethods.length) return FALLBACK_METHODS;
    return dbPayMethods
      .map(m => ({
        id: CODE_TO_METHOD[m.code] || m.code as PayMethod,
        label: m.name_ar || m.name,
        desc: m.description_ar || m.description || "",
        icon: m.icon || "💳",
      }))
      .filter(m => m.id);
  }, [dbPayMethods]);

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
          .catch((e: any) => console.warn("fetch_wallet_balance:", e));

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
                if (defaultAddr.latitude) {
                  setMapLat(defaultAddr.latitude);
                  setMapLng(defaultAddr.longitude ?? null);
                  setLocationSource("manual");
                  addressSelectedRef.current = true;
                }
              }
            }
          })
          .catch((e: any) => console.warn("fetch_saved_addresses:", e));
      }
    }).catch((e: any) => console.warn("get_user:", e));

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
      }).catch((e: any) => console.warn("fetch_platform_settings:", e));

    // Fetch partner location for delivery fee calculation
    if (cart.partnerId) {
      (supabase as any)
        .from("partners")
        .select("lat, lng, city, delivery_fee")
        .eq("id", cart.partnerId)
        .single()
        .then(({ data: p }: any) => {
          if (p?.lat) setPartnerLat(Number(p.lat));
          if (p?.lng) setPartnerLng(Number(p.lng));
          if (p?.city) setPartnerCity(p.city);
          // Set static delivery_fee as fallback until dynamic calculation runs
          if (p?.delivery_fee && Number(p.delivery_fee) > 0) {
            cart.setDeliveryFee(Number(p.delivery_fee));
          }
        })
        .catch((e: any) => console.warn("fetch_partner_location:", e));
    }

    // Fetch delivery pricing rules
    (supabase as any)
      .from("delivery_pricing_rules")
      .select("*")
      .eq("is_active", true)
      .then(({ data: rules }: any) => {
        if (rules?.length) setDeliveryRules(rules);
      })
      .catch((e: any) => console.warn("fetch_delivery_pricing_rules:", e));

    // Auto-request GPS location on checkout open — only if no saved address was selected
    (async () => {
      // Small delay to let saved address loading settle
      await new Promise(r => setTimeout(r, 500));
      if (addressSelectedRef.current) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        if (addressSelectedRef.current) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (addressSelectedRef.current) return;
        setMapLat(loc.coords.latitude);
        setMapLng(loc.coords.longitude);
        setLocationSource("gps");
      }
    })();
  }, []);

  // Fetch enabled payment methods from DB
  useEffect(() => {
    if (!supabase) return;
    (supabase as any)
      .from("payment_methods")
      .select("code, name, name_ar, description_ar, icon, is_enabled, category")
      .eq("is_enabled", true)
      .then(({ data }: any) => {
        if (data?.length) setDbPayMethods(data);
      })
      .catch((e: any) => console.warn("fetch_payment_methods:", e));
  }, [supabase]);

  // Auto-deselect cash if location is not GPS
  useEffect(() => {
    if (locationSource === null) return; // Don't change on initial render
    if (locationSource !== "gps" && method === "cash") {
      setMethod("wallet");
    }
  }, [locationSource]);

  // Dynamic delivery fee calculation based on distance
  useEffect(() => {
    if (mapLat == null || mapLng == null || partnerLat == null || partnerLng == null || deliveryRules.length === 0) {
      setTooFar(false);
      return;
    }
    const distance = haversineKm(mapLat, mapLng, partnerLat, partnerLng);
    setDeliveryDistance(Math.round(distance * 10) / 10);

    // Find applicable rule: city-specific first, then default
    const cityRule = deliveryRules.find((r: any) => r.city === partnerCity && !r.is_default);
    const defaultRule = deliveryRules.find((r: any) => r.is_default);
    const rule = cityRule || defaultRule;
    if (!rule) return;

    // Check max distance
    if (rule.max_distance_km && distance > Number(rule.max_distance_km)) {
      setTooFar(true);
      setAppliedRuleId(rule.id);
      return;
    }
    setTooFar(false);

    let fee = Number(rule.base_price);
    if (distance > Number(rule.base_distance_km)) {
      fee += (distance - Number(rule.base_distance_km)) * Number(rule.per_km_price);
    }
    fee = Math.max(Number(rule.min_fee), Math.min(Number(rule.max_fee), fee));
    fee = Math.round(fee * 100) / 100;

    cart.setDeliveryFee(fee);
    setAppliedRuleId(rule.id);
  }, [mapLat, mapLng, partnerLat, partnerLng, deliveryRules, partnerCity]);

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

    // Location is mandatory
    if (mapLat == null || mapLng == null) {
      return setError("يجب تحديد موقعك على الخريطة أو السماح بمشاركة الموقع قبل إرسال الطلب");
    }

    // Too far for delivery
    if (tooFar) {
      return setError("التوصيل غير متاح لهذا الموقع — المسافة تتجاوز الحد المسموح");
    }

    // Manual location (no GPS) → cash not allowed
    if (locationSource !== "gps" && method === "cash") {
      return setError("الدفع عند الاستلام متاح فقط عند مشاركة موقعك عبر GPS. اختر طريقة دفع أخرى أو اضغط \"استخدم موقعي الحالي\" في الخريطة.");
    }

    if (needsProof && !proofUri) return setError("يجب رفع صورة إثبات التحويل قبل تأكيد الطلب");

    // High-value + cash: not allowed
    if (isHighValue && method === "cash") {
      setError("الطلبات أكثر من 1000 جنيه لا تقبل الدفع كاش. استخدم المحفظة أو حوّل عبر أي محفظة إلكترونية.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (!supabase) throw new Error("خطأ في الاتصال");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      // Rate limit check
      const { data: rlAllowed } = await supabase.rpc("check_rate_limit", {
        p_user_id: user.id,
        p_action: "create_order",
        p_max_attempts: 5,
        p_window_minutes: 60,
      });
      if (rlAllowed === false) {
        setError("تجاوزت الحد المسموح من الطلبات. حاول مرة أخرى بعد قليل.");
        setLoading(false);
        return;
      }

      // Wallet balance validation
      if (method === "wallet") {
        if (walletBalance === null || walletBalance < finalTotal) {
          const bal = walletBalance ?? 0;
          setError(`رصيد المحفظة غير كافٍ (${bal.toFixed(2)} ج). المطلوب: ${finalTotal} ج`);
          setLoading(false);
          return;
        }
      }

      // PayMob card payment flow
      if (method === "card") {
        try {
          const { data: intentData, error: intentError } = await supabase.functions.invoke("paymob-intent", {
            body: {
              amount_cents: Math.round(finalTotal * 100),
              order_id: `temp_${Date.now()}`,
              customer_email: user.email || "",
              customer_phone: phone.trim() || "",
              customer_name: user.user_metadata?.full_name || "",
            },
          });
          if (intentError || !intentData?.payment_url) {
            throw new Error(intentData?.error || "تعذّر إنشاء رابط الدفع");
          }
          setPaymobUrl(intentData.payment_url);
          setPaymobOrderId(intentData.paymob_order_id || null);
          setLoading(false);
          return; // WebView will handle the rest
        } catch (e: any) {
          throw new Error(e?.message || "تعذّر الاتصال ببوابة الدفع");
        }
      }

      await createOrder(user, null);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  async function createOrder(user: any, paymobTransactionId: string | null) {
    if (!supabase) throw new Error("خطأ في الاتصال");

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
        p_amount: finalTotal,
        p_description: `دفع طلب — ${cart.partnerName ?? "طلب"}`,
      });
      if (!deductResult?.success) {
        throw new Error(deductResult?.error ?? "رصيد المحفظة غير كافٍ");
      }
      setWalletBalance(Number(deductResult.remaining));
    }

    // ── Create order via server-side RPC (validates prices, delivery fee, promo) ──
    const { data: orderResult, error: rpcError } = await (supabase as any).rpc(
      "create_validated_order",
      {
        p_partner_id:        cart.partnerId,
        p_items:             cart.itemList.map(i => ({ menu_item_id: i.id, qty: i.qty })),
        p_delivery_address:  address.trim(),
        p_delivery_lat:      mapLat,
        p_delivery_lng:      mapLng,
        p_location_source:   locationSource,
        p_customer_phone:    phone.trim() || null,
        p_customer_note:     note.trim()  || null,
        p_payment_method:    method,
        p_payment_proof_url: proofStorageUrl,
        p_promo_code:        promoCodeParam || null,
        p_delivery_type:     "platform",
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    if (!orderResult?.success) {
      throw new Error(orderResult?.error ?? "لم يتم إنشاء الطلب بشكل صحيح");
    }

    const orderId = orderResult.order_id;
    const serverTotal = orderResult.total;

    analyticsTracker.trackOrderCompleted(orderId, serverTotal, cart.partnerId!, method);
    cart.clearCart();

    if (orderResult.status === "awaiting_payment_approval") {
      Alert.alert(
        "تم إرسال الطلب",
        "طلبك بانتظار اعتماد إيصال الدفع من الإدارة. سيتم إشعارك عند الاعتماد.",
        [{ text: "حسناً", onPress: () => router.replace("/(tabs)/home") }]
      );
    } else {
      router.replace(`/tracking/${orderId}`);
    }
  }

  function handlePaymobResult(url: string) {
    // PayMob redirects to a success/failure URL with query params
    const isSuccess = url.includes("success=true") || url.includes("txn_response_code=APPROVED");
    const transactionMatch = url.match(/transaction_id=(\d+)/);
    const transactionId = transactionMatch ? transactionMatch[1] : null;

    setPaymobUrl(null);

    if (isSuccess) {
      setLoading(true);
      supabase?.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          createOrder(user, transactionId)
            .catch((e: any) => setError(e?.message ?? "حدث خطأ في إنشاء الطلب"))
            .finally(() => setLoading(false));
        }
      });
    } else {
      setError("فشل الدفع بالبطاقة. حاول مرة أخرى أو اختر طريقة دفع أخرى.");
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
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>{formatCurrency(item.price * item.qty)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          {[
            { label: "المجموع الجزئي", value: formatCurrency(cart.subtotal) },
            { label: "رسوم التوصيل",   value: deliveryDistance != null ? `${formatCurrency(cart.deliveryFee)} (${deliveryDistance} كم)` : formatCurrency(cart.deliveryFee) },
            ...(discountAmount > 0 ? [{ label: "الخصم", value: `- ${formatCurrency(discountAmount)}` }] : []),
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>{row.value}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>الإجمالي</Text>
            <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 18 }}>{formatCurrency(finalTotal)}</Text>
          </View>
        </View>

        {/* LOCATION STATUS */}
        <View style={{
          padding: 14, borderRadius: 14, marginBottom: 12,
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: locationSource === "gps" ? "#D1FAE5" : locationSource === "manual" ? "#FEF3C7" : "#FEF2F2",
          borderWidth: 1.5,
          borderColor: locationSource === "gps" ? "#34D399" : locationSource === "manual" ? "#F59E0B" : "#FECACA",
        }}>
          <Text style={{ fontSize: 20 }}>
            {locationSource === "gps" ? "✅" : locationSource === "manual" ? "📍" : "⚠️"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontWeight: "900", fontSize: 13,
              color: locationSource === "gps" ? "#065F46" : locationSource === "manual" ? "#92400E" : "#991B1B",
            }}>
              {locationSource === "gps" ? "تم تحديد موقعك عبر GPS" : locationSource === "manual" ? "تم تحديد الموقع يدوياً على الخريطة" : "يجب تحديد موقعك"}
            </Text>
            <Text style={{
              fontSize: 11, marginTop: 2,
              color: locationSource === "gps" ? "#047857" : locationSource === "manual" ? "#B45309" : "#DC2626",
            }}>
              {locationSource === "gps" ? "جميع طرق الدفع متاحة" : locationSource === "manual" ? "الدفع عند الاستلام غير متاح — استخدم طريقة دفع إلكترونية" : "شارك موقعك أو حدده يدوياً على الخريطة"}
            </Text>
          </View>
        </View>

        {/* TOO FAR WARNING */}
        {tooFar && (
          <View style={{
            padding: 14, borderRadius: 14, marginBottom: 12,
            backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FECACA",
          }}>
            <Text style={{ fontWeight: "900", color: "#991B1B", fontSize: 13, textAlign: "center" }}>
              عذراً، التوصيل غير متاح لهذا الموقع — المسافة تتجاوز الحد المسموح
            </Text>
          </View>
        )}

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
                      if (addr.latitude) {
                        setMapLat(addr.latitude);
                        setMapLng(addr.longitude ?? null);
                        setLocationSource("manual");
                      }
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
                  setLocationSource("manual");
                }}
                onGpsDetected={(lat, lng) => {
                  setMapLat(lat);
                  setMapLng(lng);
                  setLocationSource("gps");
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
          const walletInsufficient = isWallet && walletBalance !== null && walletBalance < finalTotal;
          const isCashBlocked = m.id === "cash" && locationSource !== "gps";
          const isDisabled = m.soon || walletInsufficient || isCashBlocked;
          const desc = isWallet && walletBalance !== null
            ? `رصيدك: ${walletBalance.toFixed(2)} جنيه`
            : isCashBlocked
              ? "غير متاح — يتطلب مشاركة الموقع عبر GPS"
              : m.desc;
          return (
          <Pressable
            key={m.id}
            onPress={() => !isDisabled && handleSetMethod(m.id)}
            {...A11yPresets.button(m.label, desc)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 16, marginBottom: 10,
              backgroundColor: method === m.id ? colors.primarySoft : colors.surface,
              borderWidth: 2,
              borderColor: method === m.id ? colors.primary : colors.border,
              opacity: isDisabled ? 0.4 : 1,
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
              <Text style={{ color: isCashBlocked ? "#DC2626" : colors.textMuted, fontSize: 12, marginTop: 2 }}>{desc}</Text>
            </View>
            {m.soon && (
              <View style={{ backgroundColor: colors.warning, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>قريباً</Text>
              </View>
            )}
          </Pressable>
        );
        })}

        {/* HIGH-VALUE ORDER INFO */}
        {isHighValue && method !== "wallet" && method !== "card" && (
          <View style={{
            padding: 16, borderRadius: 16, marginBottom: 12,
            backgroundColor: "#FEF3C7", borderWidth: 1.5, borderColor: "#F59E0B",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>📋</Text>
              <Text style={{ fontWeight: "900", color: "#92400E", fontSize: 13, flex: 1 }}>
                طلب أكثر من 1,000 جنيه — يتطلب اعتماد الإيصال
              </Text>
            </View>
            <Text style={{ color: "#78350F", fontSize: 12, lineHeight: 20 }}>
              {method === "cash"
                ? "الدفع كاش غير متاح للطلبات أكثر من 1,000 جنيه. استخدم المحفظة أو حوّل عبر أي محفظة إلكترونية."
                : "بعد رفع إيصال التحويل، سيتم مراجعته واعتماده من الإدارة ثم يأخذ الطلب مساره الطبيعي."}
            </Text>
            {method === "cash" && (
              <Pressable
                onPress={() => Linking.openURL("https://wa.me/201153624184?text=" + encodeURIComponent("مرحباً، أريد شحن محفظتي في تطبيق حلّها"))}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  paddingVertical: 12, borderRadius: 12, backgroundColor: "#25D366", marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 18 }}>💬</Text>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>اشحن محفظتك عبر واتساب</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* WALLET TOP-UP LINK (always visible when wallet selected but insufficient) */}
        {method === "wallet" && walletBalance !== null && walletBalance < finalTotal && (
          <View style={{
            padding: 16, borderRadius: 16, marginBottom: 12,
            backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#EF4444",
          }}>
            <Text style={{ fontWeight: "900", color: "#991B1B", fontSize: 13, marginBottom: 8 }}>
              رصيد المحفظة غير كافٍ ({walletBalance.toFixed(2)} ج من {finalTotal} ج)
            </Text>
            <Pressable
              onPress={() => {
                Linking.openURL("https://wa.me/201153624184?text=" + encodeURIComponent(`مرحباً، أريد شحن محفظتي بمبلغ ${Math.ceil(finalTotal - walletBalance)} جنيه في تطبيق حلّها`));
              }}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                paddingVertical: 12, borderRadius: 12,
                backgroundColor: "#25D366",
              }}
            >
              <Text style={{ fontSize: 18 }}>💬</Text>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                اشحن محفظتك عبر واتساب
              </Text>
            </Pressable>
          </View>
        )}

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
              {...A11yPresets.button("اختر صورة من المعرض", "انقر لاختيار صورة إثبات التحويل")}
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
                {proofUri ? "تغيير الصورة" : "اختر صورة من المعرض"}
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
          {...A11yPresets.button("تأكيد الطلب", `انقر لتأكيد الطلب - المجموع: ${finalTotal} جنيه`)}
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
                تأكيد الطلب — {formatCurrency(finalTotal)}
              </Text>
          }
        </Pressable>
      </View>

      {/* PayMob WebView Modal */}
      <Modal visible={!!paymobUrl} animationType="slide" onRequestClose={() => setPaymobUrl(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
            backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <Pressable onPress={() => {
              Alert.alert("إلغاء الدفع", "هل تريد إلغاء عملية الدفع؟", [
                { text: "متابعة الدفع", style: "cancel" },
                { text: "إلغاء", style: "destructive", onPress: () => setPaymobUrl(null) },
              ]);
            }}>
              <Text style={{ color: colors.danger, fontWeight: "800", fontSize: 14 }}>إلغاء</Text>
            </Pressable>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>الدفع الإلكتروني</Text>
            <View style={{ width: 40 }} />
          </View>
          {paymobUrl && (
            <WebView
              source={{ uri: paymobUrl }}
              onNavigationStateChange={(navState) => {
                const url = navState.url || "";
                if (url.includes("paymob-callback") || url.includes("txn_response_code")) {
                  handlePaymobResult(url);
                }
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 13 }}>جاري تحميل صفحة الدفع...</Text>
                </View>
              )}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
