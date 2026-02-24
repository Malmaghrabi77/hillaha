import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, Platform, Modal, Alert,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

const C = {
  bg: "#FFFBEB",   surface: "#FFFFFF",
  primary: "#D97706", primarySoft: "#FEF3C7",
  text: "#78350F",   textMuted: "#92400E",
  border: "#FDE68A",
} as const;

const SERVICES = [
  { id: "ac_service",   label: "صيانة مكيف",       desc: "فحص وتنظيف وإصلاح",  price: 150, icon: "❄️" },
  { id: "ac_install",   label: "تركيب مكيف",       desc: "تركيب احترافي مضمون",  price: 250, icon: "🔧" },
  { id: "ac_gas",       label: "شحن فريون",        desc: "شحن كامل للمكيف",     price: 200, icon: "💨" },
  { id: "elec_fix",     label: "إصلاح كهرباء",    desc: "أقسام ووصلات كهربائية",price: 100, icon: "⚡" },
  { id: "elec_install", label: "تركيب إضاءة",     desc: "ليدات وإضاءة منزلية", price: 80,  icon: "💡" },
  { id: "safety",       label: "فحص أمان كهربائي", desc: "تقرير شامل للمنزل",   price: 120, icon: "🛡️" },
];

const TIMES = ["8:00 ص","10:00 ص","12:00 م","2:00 م","4:00 م","6:00 م"];

export default function ElectricalScreen() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedTime, setSelectedTime]       = useState<string | null>(null);
  const [address, setAddress]                 = useState("");
  const [notes, setNotes]                     = useState("");
  const [showModal, setShowModal]             = useState(false);

  const svc = SERVICES.find(s => s.id === selectedService);

  const handleBook = () => {
    if (!selectedService || !selectedTime || !address.trim()) {
      Alert.alert("تنبيه", "يرجى اختيار الخدمة والوقت وإدخال العنوان");
      return;
    }
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
          <Text style={styles.headerTitle}>⚡ كهرباء وصيانة مكيفات</Text>
          <Text style={styles.headerSub}>فنيون معتمدون • ضمان على الشغل</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero banner */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>⚡❄️</Text>
          <Text style={styles.heroTitle}>فنيون موثوقون في قنا</Text>
          <Text style={styles.heroSub}>خبرة 10 سنوات • أدوات متخصصة • ضمان على جميع الأعمال</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>500+</Text>
              <Text style={styles.heroStatLbl}>طلب منجز</Text>
            </View>
            <View style={[styles.heroStat, { borderLeftWidth: 1, borderColor: "rgba(255,255,255,0.3)" }]}>
              <Text style={styles.heroStatVal}>4.8 ★</Text>
              <Text style={styles.heroStatLbl}>تقييم الفنيين</Text>
            </View>
            <View style={[styles.heroStat, { borderLeftWidth: 1, borderColor: "rgba(255,255,255,0.3)" }]}>
              <Text style={styles.heroStatVal}>3 ساعة</Text>
              <Text style={styles.heroStatLbl}>وقت الاستجابة</Text>
            </View>
          </View>
        </View>

        {/* Service type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اختر الخدمة المطلوبة</Text>
          <View style={styles.grid}>
            {SERVICES.map(s => (
              <Pressable
                key={s.id}
                onPress={() => setSelectedService(s.id)}
                style={[styles.serviceCard, selectedService === s.id && styles.serviceCardActive]}
              >
                <Text style={styles.serviceIcon}>{s.icon}</Text>
                <Text style={[styles.serviceLabel, selectedService === s.id && { color: C.primary }]}>{s.label}</Text>
                <Text style={styles.serviceDesc}>{s.desc}</Text>
                <Text style={[styles.servicePrice, selectedService === s.id && { color: C.primary }]}>
                  يبدأ من {s.price} جنيه
                </Text>
                {selectedService === s.id && (
                  <View style={styles.checkBadge}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اختر وقت الزيارة</Text>
          <View style={styles.timeRow}>
            {TIMES.map(t => (
              <Pressable
                key={t}
                onPress={() => setSelectedTime(t)}
                style={[styles.timeChip, selectedTime === t && styles.timeChipActive]}
              >
                <Text style={[styles.timeText, selectedTime === t && { color: "white" }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>العنوان</Text>
          <TextInput
            placeholder="شارع، رقم المبنى، الطابق..."
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وصف المشكلة (اختياري)</Text>
          <TextInput
            placeholder="صف المشكلة أو ما تحتاجه بالتفصيل..."
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 90, textAlignVertical: "top", paddingTop: 10 }]}
            multiline
            placeholderTextColor="#94A3B8"
            textAlign="right"
          />
        </View>

        {/* Guarantee badge */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={{
            backgroundColor: C.primarySoft, borderRadius: 16, padding: 14,
            flexDirection: "row", alignItems: "center", gap: 10,
            borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: C.text, fontSize: 14 }}>ضمان 30 يوم</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                نضمن جودة العمل أو نُرسل الفني مرة أخرى مجاناً
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          {svc ? (
            <Text style={styles.priceLabel}>يبدأ من: <Text style={{ color: C.primary, fontWeight: "900" }}>{svc.price} جنيه</Text></Text>
          ) : (
            <Text style={styles.priceLabel}>اختر الخدمة</Text>
          )}
          {selectedTime && <Text style={{ fontSize: 11, color: C.textMuted }}>الوقت: {selectedTime}</Text>}
        </View>
        <Pressable onPress={handleBook} style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>احجز فني</Text>
        </Pressable>
      </View>

      {/* Confirmation modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>✅</Text>
            <Text style={styles.modalTitle}>تم الحجز بنجاح!</Text>
            <Text style={styles.modalSub}>
              سيتواصل معك الفني خلال ساعة لتأكيد الموعد
            </Text>
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoRow}>🔧 {svc?.label}</Text>
              <Text style={styles.modalInfoRow}>🕐 {selectedTime}</Text>
              <Text style={styles.modalInfoRow}>📍 {address}</Text>
              <Text style={styles.modalInfoRow}>💰 يبدأ من {svc?.price} جنيه</Text>
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
  heroSub:   { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 16 },
  heroStats: { flexDirection: "row", gap: 20 },
  heroStat:  { alignItems: "center", paddingHorizontal: 10 },
  heroStatVal: { fontSize: 16, fontWeight: "900", color: "white" },
  heroStatLbl: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: C.text, marginBottom: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%", borderRadius: 16, padding: 14,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: "#E2E8F0",
    position: "relative",
  },
  serviceCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  serviceIcon:  { fontSize: 26, marginBottom: 6 },
  serviceLabel: { fontSize: 13, fontWeight: "800", color: C.text },
  serviceDesc:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  servicePrice: { fontSize: 13, fontWeight: "900", color: C.text, marginTop: 8 },
  checkBadge: {
    position: "absolute", top: 8, left: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center",
  },

  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  timeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  timeText: { fontSize: 13, fontWeight: "700", color: C.text },

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
  bookBtn:    {
    backgroundColor: C.primary, paddingVertical: 13, paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  bookBtnText: { color: "white", fontWeight: "900", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40, alignItems: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: C.text, marginTop: 12 },
  modalSub:   { fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 8, marginBottom: 16 },
  modalInfo:  {
    width: "100%", backgroundColor: C.primarySoft,
    borderRadius: 16, padding: 16, gap: 8, marginBottom: 20,
  },
  modalInfoRow: { fontSize: 14, fontWeight: "700", color: C.text },
  modalBtn: {
    width: "100%", backgroundColor: C.primary,
    paddingVertical: 14, borderRadius: 16, alignItems: "center",
  },
});
