import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView,
  StyleSheet, Platform, Modal, Alert,
} from "react-native";
import { router } from "expo-router";
import { useDarkMode } from '../../src/hooks/useDarkMode';
import { useSupabase } from '../../src/hooks/useSupabase';
import { analyticsTracker } from '../../src/utils/analyticsTracker';
import { A11yPresets } from '../../src/hooks/useAccessibility';
import { ANALYTICS_EVENTS } from '../../src/constants/analyticsEvents';
import { SafeAreaScrollView } from '../../src/components';
import { LocationPickerMap } from '../../src/components/LocationPickerMap';
import { useServicePrices } from '../../src/hooks/useServicePrices';

const SIZES = [
  { id: "small",  label: "صغير",   desc: "يحمله بيد واحدة", icon: "📦", note: "مستندات، ملابس" },
  { id: "medium", label: "متوسط",  desc: "كرتونة صغيرة",    icon: "📫", note: "أجهزة صغيرة، هدايا" },
  { id: "large",  label: "كبير",   desc: "كرتونة كبيرة",    icon: "🗃️", note: "أجهزة كبيرة، أثاث خفيف" },
];

const FALLBACK_FEES: Record<string, number> = { small: 25, medium: 40, large: 60 };

export default function P2PDeliveryScreen() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const { prices: dbPrices } = useServicePrices('delivery_p2p');

  const DELIVERY_FEES = useMemo(() => {
    const fees = { ...FALLBACK_FEES };
    dbPrices.forEach(p => { fees[p.service_key] = p.price; });
    return fees;
  }, [dbPrices]);

  const [size, setSize]               = useState<string | null>(null);
  const [fromAddress, setFromAddress] = useState("");
  const [fromLat, setFromLat]         = useState<number | null>(null);
  const [fromLng, setFromLng]         = useState<number | null>(null);
  const [toAddress, setToAddress]     = useState("");
  const [toLat, setToLat]             = useState<number | null>(null);
  const [toLng, setToLng]             = useState<number | null>(null);
  const [senderName, setSenderName]   = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName]   = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [notes, setNotes]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  const fee = size ? DELIVERY_FEES[size] : null;

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.SERVICE_DELIVERY);
  }, []);

  const generateTracking = () =>
    "HLH-" + Math.random().toString(36).substring(2, 7).toUpperCase();

  const handleSend = async () => {
    if (!size || !fromAddress.trim() || !toAddress.trim() ||
        !senderPhone.trim() || !receiverPhone.trim()) {
      Alert.alert("تنبيه", "يرجى ملء جميع البيانات الأساسية (الحجم، العناوين، أرقام الهاتف)");
      return;
    }
    analyticsTracker.trackEvent(ANALYTICS_EVENTS.SERVICE.DELIVERY_INITIATED, {
      package_size: size,
      delivery_fee: fee,
    });
    const code = generateTracking();
    setTrackingCode(code);
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("delivery_requests").insert({
          sender_id:      user?.id ?? null,
          package_size:   size,
          from_address:   fromAddress,
          from_latitude:  fromLat,
          from_longitude: fromLng,
          to_address:     toAddress,
          to_latitude:    toLat,
          to_longitude:   toLng,
          sender_name:    senderName || null,
          sender_phone:   senderPhone,
          receiver_name:  receiverName || null,
          receiver_phone: receiverPhone,
          delivery_fee:   fee ?? 25,
          notes:          notes || null,
          tracking_code:  code,
        });
      } catch {}
    }
    setShowModal(true);
  };

  return (
    <SafeAreaScrollView variant="page" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "android" ? 28 : 58, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")}
          style={[styles.backBtn, { backgroundColor: colors.primarySoft }]}
          {...A11yPresets.button}
        >
          <Text style={{ fontSize: 20, color: colors.primary }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>📦 توصيل من عميل لعميل</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>أرسل أي شيء بسهولة وأمان</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroEmoji}>📦🚴</Text>
          <Text style={styles.heroTitle}>أرسل واستلم بسهولة</Text>
          <Text style={styles.heroSub}>توصيل سريع داخل مدينة قنا • تتبع حي • آمان مضمون</Text>
          <View style={styles.heroSteps}>
            {["أدخل البيانات","يُرسل لموصل","يُوصّل للمستلم"].map((s, i) => (
              <View key={s} style={{ alignItems: "center", flex: 1 }}>
                <View style={[styles.stepCircle, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                  <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 14 }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", marginTop: 4, textAlign: "center" }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Package size */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>حجم الطرد</Text>
          {SIZES.map(s => (
            <Pressable
              key={s.id}
              onPress={() => {
                setSize(s.id);
                analyticsTracker.trackEvent(ANALYTICS_EVENTS.SERVICE.PACKAGE_SIZE_SELECTED, { size: s.id });
              }}
              style={[
                styles.sizeRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                size === s.id && [styles.sizeRowActive, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
              ]}
              {...A11yPresets.button}
            >
              <Text style={{ fontSize: 28 }}>{s.icon}</Text>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.sizeLabel, { color: colors.text }, size === s.id && { color: colors.primary }]}>{s.label}</Text>
                <Text style={[styles.sizeDesc, { color: colors.textMuted }]}>{s.desc} — {s.note}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.sizeFee, { color: colors.text }, size === s.id && { color: colors.primary }]}>
                  {DELIVERY_FEES[s.id]} جنيه
                </Text>
                {size === s.id && (
                  <View style={[styles.checkDot, { marginTop: 4, backgroundColor: colors.primary }]}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>✓</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sender */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📤 بيانات المُرسِل</Text>
          <TextInput
            placeholder="اسم المُرسِل"
            value={senderName}
            onChangeText={setSenderName}
            style={[
              styles.input,
              { marginBottom: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="اسم المرسل"
          />
          <TextInput
            placeholder="رقم هاتف المُرسِل *"
            value={senderPhone}
            onChangeText={setSenderPhone}
            style={[
              styles.input,
              { marginBottom: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textAlign="right"
            accessibilityLabel="رقم هاتف المرسل"
          />
          <LocationPickerMap
            latitude={fromLat}
            longitude={fromLng}
            onLocationSelect={(lat, lng) => { setFromLat(lat); setFromLng(lng); }}
            height={160}
            colors={colors}
          />
          <TextInput
            placeholder="تفاصيل عنوان الاستلام (من) *"
            value={fromAddress}
            onChangeText={setFromAddress}
            style={[
              styles.input,
              { marginTop: 10, height: 56, textAlignVertical: "top", paddingTop: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            multiline
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="عنوان الاستلام"
          />
        </View>

        {/* Receiver */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📥 بيانات المُستلِم</Text>
          <TextInput
            placeholder="اسم المُستلِم"
            value={receiverName}
            onChangeText={setReceiverName}
            style={[
              styles.input,
              { marginBottom: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="اسم المستلم"
          />
          <TextInput
            placeholder="رقم هاتف المُستلِم *"
            value={receiverPhone}
            onChangeText={setReceiverPhone}
            style={[
              styles.input,
              { marginBottom: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textAlign="right"
            accessibilityLabel="رقم هاتف المستلم"
          />
          <LocationPickerMap
            latitude={toLat}
            longitude={toLng}
            onLocationSelect={(lat, lng) => { setToLat(lat); setToLng(lng); }}
            height={160}
            colors={colors}
          />
          <TextInput
            placeholder="تفاصيل عنوان التوصيل (إلى) *"
            value={toAddress}
            onChangeText={setToAddress}
            style={[
              styles.input,
              { marginTop: 10, height: 56, textAlignVertical: "top", paddingTop: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            multiline
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="عنوان التوصيل"
          />
        </View>

        {/* Notes */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ملاحظات للموصل (اختياري)</Text>
          <TextInput
            placeholder="تعليمات خاصة، طريق بديل..."
            value={notes}
            onChangeText={setNotes}
            style={[
              styles.input,
              { height: 70, textAlignVertical: "top", paddingTop: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            multiline
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="ملاحظات للموصل"
          />
        </View>

        {/* Reassurance */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={{
            backgroundColor: colors.primarySoft,
            borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 14, marginBottom: 8 }}>🛡️ ضمانات الخدمة</Text>
            {["تتبع الموصل مباشرةً في الخريطة","التواصل مع الموصل عبر التطبيق","التأكيد بالكود عند الاستلام"].map(g => (
              <Text key={g} style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>✓ {g}</Text>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          {fee != null ? (
            <Text style={[styles.priceLabel, { color: colors.text }]}>رسوم التوصيل: <Text style={{ color: colors.primary, fontWeight: "900" }}>{fee} جنيه</Text></Text>
          ) : (
            <Text style={[styles.priceLabel, { color: colors.text }]}>اختر حجم الطرد</Text>
          )}
          <Text style={{ fontSize: 11, color: colors.textMuted }}>دفع عند الاستلام أو بالمحفظة</Text>
        </View>
        <Pressable
          onPress={handleSend}
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          {...A11yPresets.button}
        >
          <Text style={styles.sendBtnText}>أرسل الآن</Text>
        </Pressable>
      </View>

      {/* Confirmation modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay || "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>🚴</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>طلب التوصيل مُرسَل!</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              يتم إرسال طلبك لأقرب موصل متاح الآن
            </Text>
            <View style={[styles.trackingBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>كود التتبع</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: colors.primary, letterSpacing: 3 }}>
                {trackingCode}
              </Text>
            </View>
            <View style={[styles.modalInfo, { backgroundColor: isDarkMode ? colors.bg : "#F8FAFC" }]}>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>📦 {SIZES.find(s => s.id === size)?.label}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>📤 من: {fromAddress}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>📥 إلى: {toAddress}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>📞 المستلم: {receiverPhone}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>💰 {fee} جنيه</Text>
            </View>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setShowModal(false); router.push("/(tabs)/orders"); }}
              {...A11yPresets.button}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>متابعة طلباتي</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border, marginTop: 8 }]}
              onPress={() => { setShowModal(false); router.push("/(tabs)/home"); }}
              {...A11yPresets.button}
            >
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>العودة للرئيسية</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "900" },
  headerSub:   { fontSize: 11, marginTop: 1 },

  hero: {
    margin: 16, borderRadius: 20, padding: 20,
    alignItems: "center",
  },
  heroEmoji: { fontSize: 42, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: "900", color: "white", marginBottom: 6 },
  heroSub:   { fontSize: 12, color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 16 },
  heroSteps: { flexDirection: "row", width: "100%", gap: 4 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "900", marginBottom: 12 },

  sizeRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  sizeRowActive: { borderWidth: 2 },
  sizeLabel: { fontSize: 14, fontWeight: "900" },
  sizeDesc:  { fontSize: 11, marginTop: 2 },
  sizeFee:   { fontSize: 14, fontWeight: "900" },
  checkDot:  {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },

  input: {
    borderWidth: 1.5,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14,
  },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    borderTopWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  priceLabel: { fontSize: 13, fontWeight: "700" },
  sendBtn: {
    paddingVertical: 13, paddingHorizontal: 28,
    borderRadius: 14,
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  sendBtnText: { color: "white", fontWeight: "900", fontSize: 15 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", marginTop: 10 },
  modalSub:   { fontSize: 13, textAlign: "center", marginTop: 6, marginBottom: 14 },
  trackingBox: {
    borderRadius: 16, padding: 16,
    alignItems: "center", width: "100%", marginBottom: 14,
    borderWidth: 1.5,
  },
  modalInfo: {
    width: "100%",
    borderRadius: 16, padding: 14, gap: 7, marginBottom: 18,
  },
  modalInfoRow: { fontSize: 13, fontWeight: "700" },
  modalBtn: {
    width: "100%",
    paddingVertical: 14, borderRadius: 16, alignItems: "center",
  },
});
