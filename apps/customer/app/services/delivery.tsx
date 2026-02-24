import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, Platform, Modal, Alert,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

const C = {
  bg: "#FAF5FF",   surface: "#FFFFFF",
  primary: "#7C3AED", primarySoft: "#F3E8FF",
  text: "#3B0764",   textMuted: "#6B21A8",
  border: "#DDD6FE",
} as const;

const SIZES = [
  { id: "small",  label: "صغير",   desc: "يحمله بيد واحدة", icon: "📦", note: "مستندات، ملابس" },
  { id: "medium", label: "متوسط",  desc: "كرتونة صغيرة",    icon: "📫", note: "أجهزة صغيرة، هدايا" },
  { id: "large",  label: "كبير",   desc: "كرتونة كبيرة",    icon: "🗃️", note: "أجهزة كبيرة، أثاث خفيف" },
];

const DELIVERY_FEES: Record<string, number> = { small: 25, medium: 40, large: 60 };

export default function P2PDeliveryScreen() {
  const [size, setSize]               = useState<string | null>(null);
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress]     = useState("");
  const [senderName, setSenderName]   = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName]   = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [notes, setNotes]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  const fee = size ? DELIVERY_FEES[size] : null;

  const generateTracking = () =>
    "HLH-" + Math.random().toString(36).substring(2, 7).toUpperCase();

  const handleSend = () => {
    if (!size || !fromAddress.trim() || !toAddress.trim() ||
        !senderPhone.trim() || !receiverPhone.trim()) {
      Alert.alert("تنبيه", "يرجى ملء جميع البيانات الأساسية (الحجم، العناوين، أرقام الهاتف)");
      return;
    }
    setTrackingCode(generateTracking());
    setShowModal(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "android" ? 28 : 58 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20, color: C.primary }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>📦 توصيل من عميل لعميل</Text>
          <Text style={styles.headerSub}>أرسل أي شيء بسهولة وأمان</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>📦🚴</Text>
          <Text style={styles.heroTitle}>أرسل واستلم بسهولة</Text>
          <Text style={styles.heroSub}>توصيل سريع داخل مدينة قنا • تتبع حي • آمان مضمون</Text>
          <View style={styles.heroSteps}>
            {["أدخل البيانات","يُرسل لموصل","يُوصّل للمستلم"].map((s, i) => (
              <View key={s} style={{ alignItems: "center", flex: 1 }}>
                <View style={styles.stepCircle}>
                  <Text style={{ color: C.primary, fontWeight: "900", fontSize: 14 }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", marginTop: 4, textAlign: "center" }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Package size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>حجم الطرد</Text>
          {SIZES.map(s => (
            <Pressable
              key={s.id}
              onPress={() => setSize(s.id)}
              style={[styles.sizeRow, size === s.id && styles.sizeRowActive]}
            >
              <Text style={{ fontSize: 28 }}>{s.icon}</Text>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.sizeLabel, size === s.id && { color: C.primary }]}>{s.label}</Text>
                <Text style={styles.sizeDesc}>{s.desc} — {s.note}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.sizeFee, size === s.id && { color: C.primary }]}>
                  {DELIVERY_FEES[s.id]} جنيه
                </Text>
                {size === s.id && (
                  <View style={[styles.checkDot, { marginTop: 4 }]}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>✓</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📤 بيانات المُرسِل</Text>
          <TextInput
            placeholder="اسم المُرسِل"
            value={senderName}
            onChangeText={setSenderName}
            style={[styles.input, { marginBottom: 10 }]}
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
          <TextInput
            placeholder="رقم هاتف المُرسِل *"
            value={senderPhone}
            onChangeText={setSenderPhone}
            style={[styles.input, { marginBottom: 10 }]}
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            textAlign="right"
          />
          <TextInput
            placeholder="عنوان الاستلام (من) *"
            value={fromAddress}
            onChangeText={setFromAddress}
            style={[styles.input, { height: 72, textAlignVertical: "top", paddingTop: 10 }]}
            multiline
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
        </View>

        {/* Receiver */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 بيانات المُستلِم</Text>
          <TextInput
            placeholder="اسم المُستلِم"
            value={receiverName}
            onChangeText={setReceiverName}
            style={[styles.input, { marginBottom: 10 }]}
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
          <TextInput
            placeholder="رقم هاتف المُستلِم *"
            value={receiverPhone}
            onChangeText={setReceiverPhone}
            style={[styles.input, { marginBottom: 10 }]}
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            textAlign="right"
          />
          <TextInput
            placeholder="عنوان التوصيل (إلى) *"
            value={toAddress}
            onChangeText={setToAddress}
            style={[styles.input, { height: 72, textAlignVertical: "top", paddingTop: 10 }]}
            multiline
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
        </View>

        {/* Notes */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>ملاحظات للموصل (اختياري)</Text>
          <TextInput
            placeholder="تعليمات خاصة، طريق بديل..."
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 70, textAlignVertical: "top", paddingTop: 10 }]}
            multiline
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
        </View>

        {/* Reassurance */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={{
            backgroundColor: C.primarySoft, borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontWeight: "900", color: C.text, fontSize: 14, marginBottom: 8 }}>🛡️ ضمانات الخدمة</Text>
            {["تتبع الموصل مباشرةً في الخريطة","التواصل مع الموصل عبر التطبيق","التأكيد بالكود عند الاستلام"].map(g => (
              <Text key={g} style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>✓ {g}</Text>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          {fee != null ? (
            <Text style={styles.priceLabel}>رسوم التوصيل: <Text style={{ color: C.primary, fontWeight: "900" }}>{fee} جنيه</Text></Text>
          ) : (
            <Text style={styles.priceLabel}>اختر حجم الطرد</Text>
          )}
          <Text style={{ fontSize: 11, color: C.textMuted }}>دفع عند الاستلام أو بالمحفظة</Text>
        </View>
        <Pressable onPress={handleSend} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>أرسل الآن</Text>
        </Pressable>
      </View>

      {/* Confirmation modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>🚴</Text>
            <Text style={styles.modalTitle}>طلب التوصيل مُرسَل!</Text>
            <Text style={styles.modalSub}>
              يتم إرسال طلبك لأقرب موصل متاح الآن
            </Text>
            <View style={styles.trackingBox}>
              <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>كود التتبع</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: C.primary, letterSpacing: 3 }}>
                {trackingCode}
              </Text>
            </View>
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoRow}>📦 {SIZES.find(s => s.id === size)?.label}</Text>
              <Text style={styles.modalInfoRow}>📤 من: {fromAddress}</Text>
              <Text style={styles.modalInfoRow}>📥 إلى: {toAddress}</Text>
              <Text style={styles.modalInfoRow}>📞 المستلم: {receiverPhone}</Text>
              <Text style={styles.modalInfoRow}>💰 {fee} جنيه</Text>
            </View>
            <Pressable
              style={styles.modalBtn}
              onPress={() => { setShowModal(false); router.push("/(tabs)/home"); }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>العودة للرئيسية</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  headerSub:   { fontSize: 11, color: C.textMuted, marginTop: 1 },

  hero: {
    margin: 16, borderRadius: 20, padding: 20,
    backgroundColor: C.primary, alignItems: "center",
  },
  heroEmoji: { fontSize: 42, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: "900", color: "white", marginBottom: 6 },
  heroSub:   { fontSize: 12, color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 16 },
  heroSteps: { flexDirection: "row", width: "100%", gap: 4 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: C.text, marginBottom: 12 },

  sizeRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  sizeRowActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  sizeLabel: { fontSize: 14, fontWeight: "900", color: C.text },
  sizeDesc:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  sizeFee:   { fontSize: 14, fontWeight: "900", color: C.text },
  checkDot:  {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center",
  },

  input: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    borderTopWidth: 1, borderColor: C.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  priceLabel: { fontSize: 13, color: C.text, fontWeight: "700" },
  sendBtn: {
    backgroundColor: C.primary, paddingVertical: 13, paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  sendBtnText: { color: "white", fontWeight: "900", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: C.text, marginTop: 10 },
  modalSub:   { fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 6, marginBottom: 14 },
  trackingBox: {
    backgroundColor: C.primarySoft, borderRadius: 16, padding: 16,
    alignItems: "center", width: "100%", marginBottom: 14,
    borderWidth: 1.5, borderColor: C.border,
  },
  modalInfo: {
    width: "100%", backgroundColor: "#F8FAFC",
    borderRadius: 16, padding: 14, gap: 7, marginBottom: 18,
  },
  modalInfoRow: { fontSize: 13, fontWeight: "700", color: C.text },
  modalBtn: {
    width: "100%", backgroundColor: C.primary,
    paddingVertical: 14, borderRadius: 16, alignItems: "center",
  },
});
