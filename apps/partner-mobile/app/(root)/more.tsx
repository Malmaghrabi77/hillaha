import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getSupabase } from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface StoreInfo {
  id: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  cover_image: string | null;
  is_open: boolean;
  delivery_time_min: number;
  min_order: number;
}

export default function MoreScreen() {
  const router = useRouter();
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    phone: "",
    address: "",
    coverUri: null as string | null,
    delivery_time_min: "30",
    min_order: "0",
  });

  useEffect(() => {
    loadStoreInfo();
  }, []);

  const loadStoreInfo = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await (supabase as any)
        .from("partners")
        .select("id, name, description, phone, address, cover_image, is_open, delivery_time_min, min_order")
        .eq("user_id", user.user.id)
        .single();

      if (data) {
        setStoreInfo({
          id: data.id,
          name: data.name || "",
          description: data.description || "",
          phone: data.phone || "",
          address: data.address || "",
          cover_image: data.cover_image || null,
          is_open: data.is_open ?? true,
          delivery_time_min: data.delivery_time_min || 30,
          min_order: data.min_order || 0,
        });
      }
    } catch (e) {
      console.error("Error loading store info:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = async () => {
    if (!storeInfo) return;
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const newStatus = !storeInfo.is_open;
      await (supabase as any)
        .from("partners")
        .update({ is_open: newStatus })
        .eq("id", storeInfo.id);
      setStoreInfo({ ...storeInfo, is_open: newStatus });
    } catch (e) {
      Alert.alert("خطأ", "فشل تغيير حالة المتجر");
    }
  };

  const openStoreEditor = () => {
    if (!storeInfo) return;
    setEditForm({
      name: storeInfo.name,
      description: storeInfo.description,
      phone: storeInfo.phone,
      address: storeInfo.address,
      coverUri: storeInfo.cover_image,
      delivery_time_min: storeInfo.delivery_time_min.toString(),
      min_order: storeInfo.min_order.toString(),
    });
    setShowStoreModal(true);
  };

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("خطأ", "نحتاج إذن الوصول للصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditForm({ ...editForm, coverUri: result.assets[0].uri });
    }
  };

  const uploadCover = async (uri: string): Promise<string | null> => {
    try {
      const supabase = getSupabase();
      if (!supabase || !storeInfo) return null;

      const fileName = `covers/${storeInfo.id}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, arrayBuffer, { contentType: "image/jpeg", upsert: true });

      if (error) return null;

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const saveStoreInfo = async () => {
    if (!storeInfo) return;
    if (!editForm.name?.trim()) {
      Alert.alert("خطأ", "اسم المتجر مطلوب");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let coverUrl = storeInfo.cover_image;
      if (editForm.coverUri && !editForm.coverUri.startsWith("http")) {
        const uploaded = await uploadCover(editForm.coverUri);
        if (!uploaded) {
          Alert.alert("خطأ", "فشل رفع صورة الغلاف");
          setSaving(false);
          return;
        }
        coverUrl = uploaded;
      }

      const { error } = await (supabase as any)
        .from("partners")
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
          cover_image: coverUrl,
          delivery_time_min: parseInt(editForm.delivery_time_min) || 30,
          min_order: parseFloat(editForm.min_order) || 0,
        })
        .eq("id", storeInfo.id);

      if (error) throw error;
      Alert.alert("تم", "تم تحديث بيانات المتجر");
      setShowStoreModal(false);
      loadStoreInfo();
    } catch (e) {
      Alert.alert("خطأ", "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          try {
            const supabase = getSupabase();
            if (supabase) await supabase.auth.signOut();
            await SecureStore.deleteItemAsync("PARTNER_EMAIL");
            await SecureStore.deleteItemAsync("PARTNER_ACCESS_TOKEN");
            await SecureStore.deleteItemAsync("PARTNER_REFRESH_TOKEN");
            router.replace("/(auth)/login");
          } catch {
            Alert.alert("خطأ", "فشل تسجيل الخروج");
          }
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger, rightElement }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!!rightElement}>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemIcon}>{icon}</Text>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, danger && { color: COLORS.danger }]}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <Text style={styles.menuItemChevron}>›</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Store Status Card */}
      {storeInfo && (
        <View style={styles.storeCard}>
          {storeInfo.cover_image ? (
            <Image source={{ uri: storeInfo.cover_image }} style={styles.storeCover} />
          ) : (
            <View style={[styles.storeCover, { backgroundColor: COLORS.primarySoft, justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ fontSize: 40 }}>🏪</Text>
            </View>
          )}
          <View style={styles.storeDetails}>
            <Text style={styles.storeName}>{storeInfo.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: storeInfo.is_open ? COLORS.success : COLORS.danger }]} />
            <Text style={[styles.storeStatus, { color: storeInfo.is_open ? COLORS.success : COLORS.danger }]}>
              {storeInfo.is_open ? "مفتوح" : "مغلق"}
            </Text>
          </View>
        </View>
      )}

      {/* Store Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>المتجر</Text>
        <MenuItem
          icon="🔄"
          title={storeInfo?.is_open ? "المتجر مفتوح" : "المتجر مغلق"}
          subtitle="تبديل حالة الاستقبال"
          rightElement={
            <Switch
              value={storeInfo?.is_open}
              onValueChange={toggleOpen}
              trackColor={{ false: COLORS.border, true: COLORS.success }}
            />
          }
        />
        <MenuItem
          icon="🛍️"
          title="إدارة المتجر"
          subtitle="الاسم، الوصف، الصورة، العنوان"
          onPress={openStoreEditor}
        />
      </View>

      {/* Navigation Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>التنقل السريع</Text>
        <MenuItem
          icon="📦"
          title="الطلبات"
          subtitle="إدارة الطلبات الواردة"
          onPress={() => router.push("/(root)/orders")}
        />
        <MenuItem
          icon="🍽️"
          title="القائمة"
          subtitle="إدارة المنتجات والأسعار"
          onPress={() => router.push("/(root)/menu")}
        />
        <MenuItem
          icon="💰"
          title="المالية"
          subtitle="المبيعات والعمولات"
          onPress={() => router.push("/(root)/finance")}
        />
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الدعم</Text>
        <MenuItem
          icon="💬"
          title="الدعم الفني"
          subtitle="محادثة مباشرة مع فريق الدعم"
          onPress={() => router.push("/chat/support" as any)}
        />
        <MenuItem
          icon="ℹ️"
          title="عن التطبيق"
          subtitle="شريك حلّها - النسخة 1.0.0"
          onPress={() => Alert.alert("شريك حلّها", "تطبيق إدارة المتجر\nمنصة حلّها للتوصيل\nالنسخة 1.0.0")}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      {/* Store Edit Modal */}
      <Modal visible={showStoreModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>إدارة المتجر</Text>

              <TouchableOpacity style={styles.coverPicker} onPress={pickCover}>
                {editForm.coverUri ? (
                  <Image source={{ uri: editForm.coverUri }} style={styles.coverPreview} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={styles.coverPickerText}>صورة الغلاف</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="اسم المتجر"
                value={editForm.name}
                onChangeText={(t) => setEditForm({ ...editForm, name: t })}
                textAlign="right"
              />
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="وصف المتجر"
                value={editForm.description}
                onChangeText={(t) => setEditForm({ ...editForm, description: t })}
                multiline
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="رقم الهاتف"
                value={editForm.phone}
                onChangeText={(t) => setEditForm({ ...editForm, phone: t })}
                keyboardType="phone-pad"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="العنوان"
                value={editForm.address}
                onChangeText={(t) => setEditForm({ ...editForm, address: t })}
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="وقت التوصيل (دقائق)"
                value={editForm.delivery_time_min}
                onChangeText={(t) => setEditForm({ ...editForm, delivery_time_min: t })}
                keyboardType="number-pad"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="الحد الأدنى للطلب (ج.م)"
                value={editForm.min_order}
                onChangeText={(t) => setEditForm({ ...editForm, min_order: t })}
                keyboardType="decimal-pad"
                textAlign="right"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => setShowStoreModal(false)}
                >
                  <Text style={styles.buttonCancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSave]}
                  onPress={saveStoreInfo}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.buttonSaveText}>حفظ</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  content: { paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  storeCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  storeCover: { width: "100%", height: 120 },
  storeDetails: {
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  storeName: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: SPACING.xs },
  storeStatus: { fontSize: FONT_SIZES.sm, fontWeight: "600" },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  menuItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuItemIcon: { fontSize: 24, marginLeft: SPACING.md },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: FONT_SIZES.base, fontWeight: "600", color: COLORS.text },
  menuItemSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  menuItemChevron: { fontSize: FONT_SIZES.lg, color: COLORS.textMuted },
  logoutButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  logoutText: { fontWeight: "700", fontSize: FONT_SIZES.base, color: "#FFF" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: "90%",
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.lg, textAlign: "center" },
  coverPicker: { marginBottom: SPACING.md, alignItems: "center" },
  coverPreview: { width: "100%", height: 140, borderRadius: BORDER_RADIUS.lg },
  coverPlaceholder: {
    width: "100%",
    height: 140,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  coverPickerText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, marginTop: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bg,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  modalActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md },
  button: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: "center" },
  buttonCancel: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  buttonCancelText: { fontWeight: "600", fontSize: FONT_SIZES.base, color: COLORS.text },
  buttonSave: { backgroundColor: COLORS.primary },
  buttonSaveText: { fontWeight: "700", fontSize: FONT_SIZES.base, color: "#FFF" },
});
