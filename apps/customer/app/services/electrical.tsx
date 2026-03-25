import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, Platform, Modal, Alert,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDarkMode } from '../hooks/useDarkMode';
import { analyticsTracker } from '../utils/analyticsTracker';
import { A11yPresets } from '../hooks/useAccessibility';

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

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
  const { isDarkMode, colors } = useDarkMode();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedTime, setSelectedTime]       = useState<string | null>(null);
  const [address, setAddress]                 = useState("");
  const [notes, setNotes]                     = useState("");
  const [showModal, setShowModal]             = useState(false);

  const svc = SERVICES.find(s => s.id === selectedService);

  useEffect(() => {
    analyticsTracker.trackScreenView('electrical_service');
  }, []);

  const handleBook = async () => {
    if (!selectedService || !selectedTime || !address.trim()) {
      Alert.alert("تنبيه", "يرجى اختيار الخدمة والوقت وإدخال العنوان");
      return;
    }
    analyticsTracker.trackEvent('technician_booking_initiated', {
      service: selectedService,
      price: svc?.price,
    });
    const supabase = getSB();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      await supabase.from("service_bookings").insert({
        customer_id:    user?.id ?? null,
        service_type:   "electrical",
        service_name:   svc?.label ?? selectedService,
        price:          svc?.price ?? 0,
        address,
        scheduled_time: selectedTime,
        notes:          notes || null,
      }).catch(() => {});
    }
    setShowModal(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "android" ? 28 : 58, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primarySoft }]}
          {...A11yPresets.button}
        >
          <Text style={{ fontSize: 20, color: colors.primary }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>⚡ كهرباء وصيانة مكيفات</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>فنيون معتمدون • ضمان على الشغل</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero banner */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>اختر الخدمة المطلوبة</Text>
          <View style={styles.grid}>
            {SERVICES.map(s => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSelectedService(s.id);
                  analyticsTracker.trackEvent('service_selected', { service_id: s.id });
                }}
                style={[
                  styles.serviceCard,
                  selectedService === s.id && [styles.serviceCardActive, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                {...A11yPresets.button}
              >
                <Text style={styles.serviceIcon}>{s.icon}</Text>
                <Text style={[styles.serviceLabel, selectedService === s.id && { color: colors.primary }, { color: colors.text }]}>{s.label}</Text>
                <Text style={[styles.serviceDesc, { color: colors.textMuted }]}>{s.desc}</Text>
                <Text style={[styles.servicePrice, selectedService === s.id && { color: colors.primary }, { color: colors.text }]}>
                  يبدأ من {s.price} جنيه
                </Text>
                {selectedService === s.id && (
                  <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time slots */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>اختر وقت الزيارة</Text>
          <View style={styles.timeRow}>
            {TIMES.map(t => (
              <Pressable
                key={t}
                onPress={() => {
                  setSelectedTime(t);
                  analyticsTracker.trackEvent('time_selected', { time: t });
                }}
                style={[
                  styles.timeChip,
                  selectedTime === t && [styles.timeChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                {...A11yPresets.button}
              >
                <Text style={[styles.timeText, selectedTime === t && { color: "white" }, { color: colors.text }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>العنوان</Text>
          <TextInput
            placeholder="شارع، رقم المبنى، الطابق..."
            value={address}
            onChangeText={setAddress}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                borderWidth: isDarkMode ? 1.5 : 1.5,
              }
            ]}
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="عنوان الخدمة"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>وصف المشكلة (اختياري)</Text>
          <TextInput
            placeholder="صف المشكلة أو ما تحتاجه بالتفصيل..."
            value={notes}
            onChangeText={setNotes}
            style={[
              styles.input,
              { height: 90, textAlignVertical: "top", paddingTop: 10, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
            ]}
            multiline
            placeholderTextColor={colors.textMuted}
            textAlign="right"
            accessibilityLabel="وصف المشكلة"
          />
        </View>

        {/* Guarantee badge */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={{
            backgroundColor: colors.primarySoft,
            borderRadius: 16, padding: 14,
            flexDirection: "row", alignItems: "center", gap: 10,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: colors.text, fontSize: 14 }}>ضمان 30 يوم</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                نضمن جودة العمل أو نُرسل الفني مرة أخرى مجاناً
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          {svc ? (
            <Text style={[styles.priceLabel, { color: colors.text }]}>يبدأ من: <Text style={{ color: colors.primary, fontWeight: "900" }}>{svc.price} جنيه</Text></Text>
          ) : (
            <Text style={[styles.priceLabel, { color: colors.text }]}>اختر الخدمة</Text>
          )}
          {selectedTime && <Text style={{ fontSize: 11, color: colors.textMuted }}>الوقت: {selectedTime}</Text>}
        </View>
        <Pressable
          onPress={handleBook}
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          {...A11yPresets.button}
        >
          <Text style={styles.bookBtnText}>احجز فني</Text>
        </Pressable>
      </View>

      {/* Confirmation modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay || "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>✅</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>تم الحجز بنجاح!</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              سيتواصل معك الفني خلال ساعة لتأكيد الموعد
            </Text>
            <View style={[styles.modalInfo, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>🔧 {svc?.label}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>🕐 {selectedTime}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>📍 {address}</Text>
              <Text style={[styles.modalInfoRow, { color: colors.text }]}>💰 يبدأ من {svc?.price} جنيه</Text>
            </View>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setShowModal(false); router.push("/(tabs)/home"); }}
              {...A11yPresets.button}
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
  heroSub:   { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 16 },
  heroStats: { flexDirection: "row", gap: 20 },
  heroStat:  { alignItems: "center", paddingHorizontal: 10 },
  heroStatVal: { fontSize: 16, fontWeight: "900", color: "white" },
  heroStatLbl: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "900", marginBottom: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%", borderRadius: 16, padding: 14,
    borderWidth: 1.5,
    position: "relative",
  },
  serviceCardActive: { borderWidth: 2 },
  serviceIcon:  { fontSize: 26, marginBottom: 6 },
  serviceLabel: { fontSize: 13, fontWeight: "800" },
  serviceDesc:  { fontSize: 11, marginTop: 2 },
  servicePrice: { fontSize: 13, fontWeight: "900", marginTop: 8 },
  checkBadge: {
    position: "absolute", top: 8, left: 8,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },

  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5,
  },
  timeChipActive: { borderWidth: 2 },
  timeText: { fontSize: 13, fontWeight: "700" },

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
  bookBtn:    {
    paddingVertical: 13, paddingHorizontal: 28,
    borderRadius: 14,
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  bookBtnText: { color: "white", fontWeight: "900", fontSize: 15 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40, alignItems: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "900", marginTop: 12 },
  modalSub:   { fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 16 },
  modalInfo:  {
    width: "100%",
    borderRadius: 16, padding: 16, gap: 8, marginBottom: 20,
  },
  modalInfoRow: { fontSize: 14, fontWeight: "700" },
  modalBtn: {
    width: "100%",
    paddingVertical: 14, borderRadius: 16, alignItems: "center",
  },
});
