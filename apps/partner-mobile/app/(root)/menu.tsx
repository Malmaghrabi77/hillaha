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
} from "react-native";
import { getSupabase } from "@hillaha/core";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
  emoji?: string;
}

export default function MenuScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    emoji: "🍽️",
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

      const { data: partnerData } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (partnerData?.id) {
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false });

        if (menuData) {
          setItems(
            menuData.map((item: any) => ({
              id: item.id || "",
              name: item.name || "",
              price: item.price || 0,
              available: item.is_available !== false,
              emoji: item.emoji || "🍽️",
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

  const handleAddItem = async () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: partnerData } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (partnerData?.id) {
        const { error } = await supabase.from("menu_items").insert({
          partner_id: partnerData.id,
          name: formData.name,
          price: parseFloat(formData.price),
          emoji: formData.emoji,
          is_available: true,
        });

        if (error) {
          Alert.alert("خطأ", "فشل إضافة الصنف");
          return;
        }

        setFormData({ name: "", price: "", emoji: "🍽️" });
        setShowAddModal(false);
        loadMenuItems();
        Alert.alert("نجح", "تم إضافة الصنف بنجاح");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء إضافة الصنف");
    }
  };

  const toggleAvailability = async (itemId: string, currentAvailable: boolean) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !currentAvailable })
        .eq("id", itemId);

      if (!error) {
        loadMenuItems();
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert("تأكيد", "هل تريد حذف هذا الصنف؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            const supabase = getSupabase();
            if (!supabase) return;

            const { error } = await supabase
              .from("menu_items")
              .delete()
              .eq("id", itemId);

            if (!error) {
              loadMenuItems();
              Alert.alert("نجح", "تم حذف الصنف");
            }
          } catch (error) {
            Alert.alert("خطأ", "فشل حذف الصنف");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={({ item }) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemContent}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.price.toFixed(0)} ج.م</Text>
              </View>
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
                  {item.available ? "متاح ✓" : "غير متاح"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteItem(item.id)}
              >
                <Text>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>➕ إضافة صنف جديد</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>صنف جديد</Text>

            <TextInput
              style={styles.input}
              placeholder="اسم الصنف"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="السعر"
              value={formData.price}
              onChangeText={(text) => setFormData({...formData, price: text})}
              keyboardType="decimal-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="الرمز التعبيري"
              value={formData.emoji}
              onChangeText={(text) => setFormData({...formData, emoji: text})}
              maxLength={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.buttonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonAdd]}
                onPress={handleAddItem}
              >
                <Text style={styles.buttonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    padding: SPACING.lg,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemEmoji: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  itemPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  itemActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  availBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  availBtnActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  availBtnInactive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  availBtnText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: FONT_SIZES.xs,
  },
  deleteBtn: {
    paddingHorizontal: SPACING.md,
  },
  addButton: {
    margin: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  addButtonText: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: FONT_SIZES.base,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: COLORS.border,
  },
  buttonAdd: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: FONT_SIZES.base,
    color: COLORS.surface,
  },
});
