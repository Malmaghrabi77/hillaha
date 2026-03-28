import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Modal, FlatList, ScrollView,
  Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useDarkMode } from '../../src/hooks/useDarkMode';
import { useSupabase } from '../../src/hooks/useSupabase';
import { analyticsTracker } from '../../src/utils/analyticsTracker';
import { A11yPresets } from '../../src/hooks/useAccessibility';
import { LoadingAnimation } from '../../src/hooks/useLottieAnimations';
import { ANALYTICS_EVENTS } from '../../src/constants/analyticsEvents';
import { SafeAreaScrollView } from '../../src/components';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience_years: number;
  rating: number;
  available_slots: string[];
}

const SPECIALIZATIONS = [
  { id: 'cardio', label: '🫀 أمراض القلب', icon: '🫀' },
  { id: 'general', label: '⚕️ طبيب عام', icon: '⚕️' },
  { id: 'dental', label: '🦷 أسنان', icon: '🦷' },
  { id: 'neuro', label: '🧠 أعصاب', icon: '🧠' },
  { id: 'derma', label: '🧴 جلدية', icon: '🧴' },
  { id: 'ortho', label: '🦴 عظام', icon: '🦴' },
];

const TIME_SLOTS = ['08:00 ص', '09:00 ص', '10:00 ص', '02:00 م', '03:00 م', '04:00 م'];

export default function Booking() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [specialization, setSpecialization] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [consultationType, setConsultationType] = useState<'video' | 'phone' | 'in-clinic'>('video');
  const [loading, setLoading] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.DOCTOR_BOOKING);
  }, []);

  const loadDoctors = async (spec: string) => {
    setLoading(true);
    if (!supabase) { setLoading(false); return; }

    try {
      const { data } = await supabase
        .from('doctors')
        .select('*')
        .eq('specialization', spec)
        .gt('rating', 3.5)
        .limit(20);

      setDoctors((data as Doctor[]) ?? []);
    } catch (error) {
      console.log('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationSelect = (spec: string) => {
    setSpecialization(spec);
    loadDoctors(spec);
    analyticsTracker.trackEvent(ANALYTICS_EVENTS.MEDICAL.SPECIALIZATION_SELECTED, { specialization: spec });
  };

  const bookAppointment = async () => {
    if (!selectedDoctor || !date || !time) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const { error } = await supabase.from('doctor_bookings').insert({
        user_id: user.id,
        doctor_id: selectedDoctor.id,
        booking_date: date,
        booking_time: time,
        consultation_type: consultationType,
        notes: notes || null,
        status: 'pending',
      });

      if (error) throw error;

      analyticsTracker.trackEvent(ANALYTICS_EVENTS.MEDICAL.APPOINTMENT_BOOKED, {
        doctorId: selectedDoctor.id,
        specialization,
        consultationType,
      });

      alert('تم حجز الموعد بنجاح! سيتلقى الطبيب طلبك قريباً.');
      router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
    } catch (error: any) {
      alert(`خطأ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!specialization) {
    return (
      <SafeAreaScrollView variant="page" style={{ backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{
          backgroundColor: colors.primary,
          paddingTop: Platform.OS === 'android' ? 20 : 60,
          paddingHorizontal: 18,
          paddingBottom: 24,
        }}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
            {...A11yPresets.button("العودة", "انقر للعودة إلى الخلف")}
          >
            <Text style={{ fontSize: 20, color: 'white' }}>←</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>حجز موعد طبيب</Text>
          </Pressable>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            اختر التخصص الطبي المطلوب
          </Text>
        </View>

        {/* Specializations Grid */}
        <View style={{ padding: 16, paddingBottom: 40 }}>
          {SPECIALIZATIONS.map((spec) => (
            <Pressable
              key={spec.id}
              onPress={() => handleSpecializationSelect(spec.id)}
              {...A11yPresets.button(spec.label, `اختر تخصص ${spec.label}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 16,
                borderRadius: 16,
                marginBottom: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 32 }}>{spec.icon}</Text>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>
                {spec.label}
              </Text>
              <Text style={{ color: colors.textMuted, marginLeft: 'auto' }}>→</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaScrollView>
    );
  }

  return (
    <SafeAreaScrollView variant="page" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'android' ? 20 : 60,
        paddingHorizontal: 18,
        paddingBottom: 24,
      }}>
        <Pressable
          onPress={() => setSpecialization(null)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
          {...A11yPresets.button("العودة", "انقر للعودة إلى خيارات التخصص")}
        >
          <Text style={{ fontSize: 20, color: 'white' }}>←</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>
            {SPECIALIZATIONS.find(s => s.id === specialization)?.label}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingAnimation />
        </View>
      ) : (
        <View contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Doctors List */}
          <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
            الأطباء المتاحون ({doctors.length})
          </Text>

          {doctors.map((doc) => (
            <Pressable
              key={doc.id}
              onPress={() => {
                setSelectedDoctor(doc);
                setShowDoctorModal(true);
                analyticsTracker.trackEvent('doctor_selected', { doctorId: doc.id });
              }}
              {...A11yPresets.button(doc.name, `اختر الطبيب ${doc.name}`)}
              style={{
                padding: 16,
                borderRadius: 16,
                marginBottom: 12,
                backgroundColor: selectedDoctor?.id === doc.id ? colors.primarySoft : colors.surface,
                borderWidth: selectedDoctor?.id === doc.id ? 2 : 1,
                borderColor: selectedDoctor?.id === doc.id ? colors.primary : colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '900', color: colors.text, fontSize: 15 }}>
                    {doc.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                    {doc.experience_years} سنة خبرة • {doc.specialization}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                  <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 13 }}>
                    {doc.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Doctor Modal */}
      <Modal visible={showDoctorModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '80%',
          }}>
            <Pressable
              onPress={() => setShowDoctorModal(false)}
              style={{ alignItems: 'center', marginBottom: 16 }}
              {...A11yPresets.button("إغلاق", "انقر لإغلاق النافذة")}
            >
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </Pressable>

            <ScrollView>
              {selectedDoctor && (
                <>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 16 }}>
                    حجز موعد مع {selectedDoctor.name}
                  </Text>

                  {/* Consultation Type */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 10 }}>
                    نوع الاستشارة
                  </Text>
                  {(['video', 'phone', 'in-clinic'] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setConsultationType(type)}
                      {...A11yPresets.button(
                        type === 'video' ? 'استشارة بالفيديو' : type === 'phone' ? 'استشارة هاتفية' : 'زيارة في العيادة',
                        `اختر ${type === 'video' ? 'استشارة بالفيديو' : type === 'phone' ? 'استشارة هاتفية' : 'زيارة في العيادة'}`
                      )}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        marginBottom: 8,
                        backgroundColor: consultationType === type ? colors.primarySoft : colors.bg,
                        borderWidth: 1,
                        borderColor: consultationType === type ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '700' }}>
                        {type === 'video' && '📹 فيديو'}
                        {type === 'phone' && '📞 هاتفي'}
                        {type === 'in-clinic' && '🏥 في العيادة'}
                      </Text>
                    </Pressable>
                  ))}

                  {/* Date */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 10, marginTop: 16 }}>
                    التاريخ
                  </Text>
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    style={{
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      color: colors.text,
                      backgroundColor: colors.bg,
                    }}
                  />

                  {/* Time */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 10 }}>
                    الوقت
                  </Text>
                  <FlatList
                    scrollEnabled={false}
                    data={TIME_SLOTS}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => setTime(item)}
                        {...A11yPresets.button(item, `اختر الوقت ${item}`)}
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: time === item ? colors.primary : colors.bg,
                          borderWidth: 1,
                          borderColor: time === item ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{
                          color: time === item ? 'white' : colors.text,
                          fontWeight: '700',
                          textAlign: 'center',
                        }}>
                          {item}
                        </Text>
                      </Pressable>
                    )}
                    keyExtractor={(item) => item}
                  />

                  {/* Notes */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 10 }}>
                    ملاحظات إضافية (اختياري)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="اكتب أي ملاحظات طبية..."
                    multiline
                    numberOfLines={3}
                    style={{
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 20,
                      color: colors.text,
                      backgroundColor: colors.bg,
                      textAlignVertical: 'top',
                    }}
                  />

                  {/* Book Button */}
                  <Pressable
                    onPress={bookAppointment}
                    disabled={loading}
                    {...A11yPresets.button("حجز الموعد", "انقر لتأكيد حجز الموعد مع الطبيب")}
                    style={{
                      backgroundColor: loading ? colors.primarySoft : colors.primary,
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      marginBottom: 20,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>
                        حجز الموعد الآن
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaScrollView>
  );
}
