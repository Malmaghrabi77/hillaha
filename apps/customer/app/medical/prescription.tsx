import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  Platform, TextInput, Image, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useDarkMode } from '../../src/hooks/useDarkMode';
import { useSupabase } from '../../src/hooks/useSupabase';
import { analyticsTracker } from '../../src/utils/analyticsTracker';
import { A11yPresets } from '../../src/hooks/useAccessibility';
import { LoadingAnimation, SuccessAnimation } from '../../src/hooks/useLottieAnimations';
import { ANALYTICS_EVENTS } from '../../src/constants/analyticsEvents';
import { SafeAreaScrollView } from '../../src/components';

export default function Prescription() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [pharmacy, setPharmacy] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.PRESCRIPTION);
  }, []);

  const pickPrescriptionImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يجب السماح بالوصول للصور لرفع الروشتة');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        analyticsTracker.trackEvent(ANALYTICS_EVENTS.MEDICAL.PRESCRIPTION_UPLOADED, {});
        setPrescriptionImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('خطأ', 'تعذّر فتح المعرض، حاول مرة أخرى');
    }
  };

  const uploadPrescription = async () => {
    if (!prescriptionImage || !pharmacy.trim()) {
      Alert.alert('تنبيه', 'يرجى اختيار صورة الروشتة واختيار صيدلية');
      return;
    }

    setLoading(true);
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      setUploadingImage(true);
      const response = await fetch(prescriptionImage);
      const blob = await response.blob();
      const ext = prescriptionImage.split('.').pop()?.split('?')[0] ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('prescriptions')
        .upload(path, blob, { contentType: `image/${ext}`, upsert: true });

      if (uploadErr) throw uploadErr;

      // Use signed URL instead of public URL for medical image privacy
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('prescriptions')
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days expiry

      if (signedUrlError) throw signedUrlError;

      const imageUrl = signedUrlData.signedUrl;

      const { error: insertErr } = await supabase.from('prescription_requests').insert({
        user_id: user.id,
        prescription_image_url: imageUrl,
        pharmacy_id: pharmacy,
        notes: notes || null,
        status: 'pending',
      });

      if (insertErr) throw insertErr;

      analyticsTracker.trackEvent(ANALYTICS_EVENTS.MEDICAL.PRESCRIPTION_UPLOADED, {
        pharmacy,
        hasNotes: !!notes,
      });

      setSuccess(true);
      setTimeout(() => {
        router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
      }, 2000);
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <SuccessAnimation />
        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 20, textAlign: 'center' }}>
          تم تقديم الروشتة بنجاح!
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10, textAlign: 'center' }}>
          ستقوم الصيدلية بتجهيز الأدوية والتواصل معك قريباً
        </Text>
      </View>
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
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          {...A11yPresets.button("العودة", "انقر للعودة إلى الخلف")}
        >
          <Text style={{ fontSize: 20, color: 'white' }}>←</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>رفع روشتة طبية</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Prescription Image */}
        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
          صورة الروشتة الطبية
        </Text>

        {prescriptionImage ? (
          <View style={{ marginBottom: 20 }}>
            <Image
              source={{ uri: prescriptionImage }}
              style={{
                width: '100%',
                height: 300,
                borderRadius: 16,
                backgroundColor: colors.bg,
              }}
            />
            <Pressable
              onPress={pickPrescriptionImage}
              {...A11yPresets.button("تغيير الصورة", "انقر لاختيار صورة أخرى")}
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>تغيير الصورة</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={pickPrescriptionImage}
            {...A11yPresets.button("اختر صورة الروشتة", "انقر لاختيار صورة من المعرض")}
            style={{
              height: 200,
              borderRadius: 16,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.border,
              backgroundColor: colors.primarySoft,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📸</Text>
            <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'center' }}>
              اضغط لاختيار صورة الروشتة
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
              أو ارسم / صور الروشتة الطبية
            </Text>
          </Pressable>
        )}

        {/* Pharmacy Selection */}
        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
          الصيدلية المسؤولة
        </Text>

        <TextInput
          value={pharmacy}
          onChangeText={setPharmacy}
          placeholder="اكتب اسم الصيدلية أو رقمها"
          style={{
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            color: colors.text,
            backgroundColor: colors.surface,
            fontSize: 14,
            textAlign: 'right',
          }}
        />

        {/* Notes */}
        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
          ملاحظات إضافية (اختياري)
        </Text>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="أي معلومات إضافية يجب على الصيدلي معرفتها؟"
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            color: colors.text,
            backgroundColor: colors.surface,
            fontSize: 14,
            textAlign: 'right',
            textAlignVertical: 'top',
          }}
        />

        {/* Info Box */}
        <View style={{
          backgroundColor: colors.primarySoft,
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
            ℹ️ معلومة مهمة
          </Text>
          <Text style={{ fontSize: 12, color: colors.primary, marginTop: 8, lineHeight: 18 }}>
            تأكد من وضوح صورة الروشتة لأن الصيدلي سيعتمد عليها لتجهيز الأدوية. سيتم التواصل معك للتأكيد قبل التحضير.
          </Text>
        </View>
      </ScrollView>
        <Pressable
          onPress={uploadPrescription}
          disabled={loading || !prescriptionImage || !pharmacy.trim()}
          {...A11yPresets.button("إرسال الروشتة", "انقر لإرسال الروشتة الطبية للصيدلية")}
          style={{
            backgroundColor: (loading || !prescriptionImage || !pharmacy.trim()) ? colors.primarySoft : colors.primary,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: loading ? 0 : 0.3,
            shadowRadius: 12,
            elevation: loading ? 0 : 6,
          }}
        >
          {(loading || uploadingImage) ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{
              color: (!prescriptionImage || !pharmacy.trim()) ? colors.textMuted : 'white',
              fontWeight: '900',
              fontSize: 15,
            }}>
              إرسال الروشتة
            </Text>
          )}
        </Pressable>
    </SafeAreaScrollView>
  );
}
