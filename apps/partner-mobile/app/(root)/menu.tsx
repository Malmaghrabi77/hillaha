import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getSupabase } from "@/lib/supabase";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string | null;
  available: boolean;
}

const CATEGORIES = [
  "وجبات رئيسية",
  "مقبلات",
  "مشروبات",
  "حلويات",
  "سلطات",
  "ساندويتشات",
  "أخرى",
];

export default function MenuScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "وجبات رئيسية",
    imageUri: null as string | null,
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: partnerData } = await (supabase as any)
        .from("partners")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (partnerData?.id) {
        setPartnerId(partnerData.id);
        const { data: menuData } = await (supabase as any)
          .from("menu_items")
          .select("id, name, description, price, category, image, is_available")
          .eq("partner_id", partnerData.id)
          .order("category", { ascending: true })
          .order("created_at", { ascending: false });

        if (menuData) {
          setItems(
            menuData.map((item: any) => ({
              id: item.id,
              name: item.name || "",
              description: item.description || "",
              price: item.price || 0,
              category: item.category || "أخرى",
              image: item.image || null,
              available: item.is_available !== false,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading menu:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("خطأ", "نحتاج إذن الوصول للصور لرفع صورة المنتج");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({ ...formData, imageUri: result.assets[0].uri });
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const supabase = getSupabase();
      if (!supabase) return null;

      const fileName = `menu/${partnerId}/${Date.now()}.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (e) {
      console.error("Image upload failed:", e);
      return null;
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "وجبات رئيسية",
      imageUri: null,
    });
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      imageUri: item.image,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الصنف");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert("خطأ", "يرجى إدخال سعر صحيح");
      return;
    }
    if (!formData.imageUri && !editingItem) {
      Alert.alert("خطأ", "يرجى رفع صورة للمنتج");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase || !partnerId) return;

      let imageUrl = editingItem?.image || null;

      // Upload new image if local file
      if (formData.imageUri && !formData.imageUri.startsWith("http")) {
        const uploaded = await uploadImage(formData.imageUri);
        if (!uploaded) {
          Alert.alert("خطأ", "فشل رفع الصورة، حاول مرة أخرى");
          setSaving(false);
          return;
        }
        imageUrl = uploaded;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        image: imageUrl,
        is_available: true,
      };

      if (editingItem) {
        const { error } = await (supabase as any)
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id)
          .eq("partner_id", partnerId);
        if (error) throw error;
        Alert.alert("تم", "تم تحديث الصنف بنجاح");
      } else {
        const { error } = await (supabase as any)
          .from("menu_items")
          .insert({ ...payload, partner_id: partnerId });
        if (error) throw error;
        Alert.alert("تم", "تم إضافة الصنف بنجاح");
      }

      setShowModal(false);
      loadMenuItems();
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ الصنف");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (itemId: string, currentAvailable: boolean) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      await (supabase as any)
        .from("menu_items")
        .update({ is_available: !currentAvailable })
        .eq("id", itemId)
        .eq("partner_id", partnerId);
      loadMenuItems();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert("تأكيد الحذف", "هل تريد حذف هذا الصنف نهائياً؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            const supabase = getSupabase();
            if (!supabase) return;
            await (supabase as any).from("menu_items").delete().eq("id", itemId).eq("partner_id", partnerId);
            loadMenuItems();
          } catch (error) {
            Alert.alert("خطأ", "فشل حذف الصنف");
          }
        },
      },
    ]);
  };

  // Group items by category
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "أخرى";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>قائمة المنتجات</Text>
        <Text style={styles.subtitle}>{items.length} صنف</Text>
      </View>

      <FlatList
        data={Object.entries(grouped)}
        renderItem={({ item: [category, categoryItems] }) => (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {categoryItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.noImage]}>
                    <Text style={styles.noImageText}>📷</Text>
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  <Text style={styles.itemPrice}>{item.price.toFixed(0)} ج.م</Text>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[
                      styles.availBtn,
                      item.available ? styles.availBtnActive : styles.availBtnInactive,
                    ]}
                    onPress={() => toggleAvailability(item.id, item.available)}
                  >
                    <Text style={styles.availBtnText}>
                      {item.available ? "متاح" : "غير متاح"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => deleteItem(item.id)}>
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        keyExtractor={([category]) => category}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>🍽️</Text>
            <Text style={styles.emptyText}>لم تضف أي منتجات بعد</Text>
            <Text style={styles.emptySubtext}>اضغط الزر أدناه لإضافة أول منتج</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ إضافة منتج جديد</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingItem ? "تعديل المنتج" : "منتج جديد"}
              </Text>

              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {formData.imageUri ? (
                  <Image source={{ uri: formData.imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Text style={{ fontSize: 32 }}>📷</Text>
                    <Text style={styles.imagePickerText}>
                      اضغط لرفع صورة المنتج *
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="اسم المنتج *"
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                textAlign="right"
              />

              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="وصف المنتج (اختياري)"
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
                multiline
                textAlign="right"
              />

              <TextInput
                style={styles.input}
                placeholder="السعر (ج.م) *"
                value={formData.price}
                onChangeText={(t) => setFormData({ ...formData, price: t })}
                keyboardType="decimal-pad"
                textAlign="right"
              />

              {/* Category Selector */}
              <Text style={styles.fieldLabel}>التصنيف</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      formData.category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.buttonCancelText}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonSave]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.buttonSaveText}>
                      {editingItem ? "حفظ التعديلات" : "إضافة"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  title: { fontSize: FONT_SIZES["2xl"], fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 80 },
  categorySection: { marginBottom: SPACING.lg },
  categoryTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.md,
  },
  noImage: {
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  noImageText: { fontSize: 22 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONT_SIZES.base, fontWeight: "600", color: COLORS.text },
  itemDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  itemPrice: { fontSize: FONT_SIZES.sm, fontWeight: "700", color: COLORS.primary, marginTop: 2 },
  itemActions: { alignItems: "center", gap: SPACING.sm },
  availBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  availBtnActive: { backgroundColor: COLORS.success },
  availBtnInactive: { backgroundColor: COLORS.danger },
  availBtnText: { color: "#FFF", fontWeight: "600", fontSize: FONT_SIZES.xs },
  emptyState: { alignItems: "center", paddingVertical: SPACING.xl * 2 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: "600", color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.sm },
  addButton: {
    position: "absolute",
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addButtonText: { color: "#FFF", fontWeight: "700", fontSize: FONT_SIZES.base },
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
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  imagePicker: { marginBottom: SPACING.md, alignItems: "center" },
  imagePreview: {
    width: 160,
    height: 160,
    borderRadius: BORDER_RADIUS.lg,
  },
  imagePickerPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, marginTop: SPACING.sm, fontWeight: "600" },
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
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  categoryPicker: { marginBottom: SPACING.lg, flexDirection: "row" },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: FONT_SIZES.sm, color: COLORS.text },
  categoryChipTextActive: { color: "#FFF", fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  buttonCancel: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  buttonCancelText: { fontWeight: "600", fontSize: FONT_SIZES.base, color: COLORS.text },
  buttonSave: { backgroundColor: COLORS.primary },
  buttonSaveText: { fontWeight: "700", fontSize: FONT_SIZES.base, color: "#FFF" },
});
