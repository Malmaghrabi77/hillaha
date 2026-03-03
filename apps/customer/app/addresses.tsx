import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  StatusBar, Platform, Alert, Modal, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", danger: "#EF4444",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

interface Address {
  id: string;
  label: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  notes?: string;
  is_default: boolean;
  created_at: string;
}

export default function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    label: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    notes: "",
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function fetchAddresses() {
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (data) setAddresses(data as Address[]);
    } catch (error) {
      console.log("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    if (!form.label || !form.street || !form.building || !form.apartment) {
      Alert.alert("خطأ", "الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    const supabase = getSB();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingId) {
        // Update existing address
        await supabase
          .from("addresses")
          .update({
            label: form.label,
            street: form.street,
            building: form.building,
            floor: form.floor,
            apartment: form.apartment,
            notes: form.notes,
          })
          .eq("id", editingId);
      } else {
        // Create new address
        await supabase.from("addresses").insert({
          user_id: user.id,
          label: form.label,
          street: form.street,
          building: form.building,
          floor: form.floor,
          apartment: form.apartment,
          notes: form.notes,
          is_default: addresses.length === 0,
        });
      }

      setForm({ label: "", street: "", building: "", floor: "", apartment: "", notes: "" });
      setEditingId(null);
      setShowModal(false);
      fetchAddresses();
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ العنوان");
      console.log("Error saving address:", error);
    }
  }

  async function deleteAddress(id: string) {
    Alert.alert(
      "حذف العنوان",
      "هل تريد حذف هذا العنوان؟",
      [
        { text: "إلغاء", onPress: () => {} },
        {
          text: "حذف",
          onPress: async () => {
            const supabase = getSB();
            if (!supabase) return;
            await supabase.from("addresses").delete().eq("id", id);
            fetchAddresses();
          },
          style: "destructive",
        },
      ]
    );
  }

  async function setDefault(id: string) {
    const supabase = getSB();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unset all other defaults
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set this as default
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);

      fetchAddresses();
    } catch (error) {
      console.log("Error setting default:", error);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        backgroundColor: C.surface,
        borderBottomWidth: 1, borderColor: C.border,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: C.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: C.text }}>📍 عناويني</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {addresses.length === 0 ? (
            <View style={{ alignItems: "center", marginVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📍</Text>
              <Text style={{ color: C.textMuted, fontSize: 14, fontWeight: "700" }}>لا توجد عناوين محفوظة</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>أضف عنوانك الأول الآن</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {addresses.map(addr => (
                <View
                  key={addr.id}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 2,
                    borderColor: addr.is_default ? C.primary : C.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>{addr.label}</Text>
                        {addr.is_default && (
                          <View style={{ backgroundColor: C.primary, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 }}>
                            <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>افتراضي</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: C.textMuted }}>
                        {addr.street} • البناء: {addr.building} • الدور: {addr.floor} • الشقة: {addr.apartment}
                      </Text>
                      {addr.notes && (
                        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontStyle: "italic" }}>
                          ملاحظات: {addr.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        setEditingId(addr.id);
                        setForm({
                          label: addr.label,
                          street: addr.street,
                          building: addr.building,
                          floor: addr.floor,
                          apartment: addr.apartment,
                          notes: addr.notes || "",
                        });
                        setShowModal(true);
                      }}
                      style={{
                        flex: 1, backgroundColor: C.primarySoft,
                        paddingVertical: 8, borderRadius: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: C.primary, fontWeight: "700", fontSize: 12 }}>تعديل</Text>
                    </Pressable>
                    {!addr.is_default && (
                      <Pressable
                        onPress={() => setDefault(addr.id)}
                        style={{
                          flex: 1, borderWidth: 1.5, borderColor: C.primary,
                          paddingVertical: 8, borderRadius: 10,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: C.primary, fontWeight: "700", fontSize: 12 }}>اجعله افتراضياً</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => deleteAddress(addr.id)}
                      style={{
                        width: 40, height: 40, borderRadius: 10,
                        backgroundColor: "#FEE2E4",
                        justifyContent: "center", alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <Pressable
          onPress={() => {
            setEditingId(null);
            setForm({ label: "", street: "", building: "", floor: "", apartment: "", notes: "" });
            setShowModal(true);
          }}
          style={{
            backgroundColor: C.primary,
            paddingVertical: 16, borderRadius: 16,
            alignItems: "center",
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>+ إضافة عنوان جديد</Text>
        </Pressable>
      </View>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{
            marginTop: "auto",
            backgroundColor: C.bg,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: 40, paddingHorizontal: 16, paddingTop: 20,
          }}>
            <View style={{
              width: 44, height: 5, borderRadius: 3,
              backgroundColor: "#E5E7EB",
              alignSelf: "center", marginBottom: 16,
            }} />

            <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 16 }}>
              {editingId ? "تعديل العنوان" : "إضافة عنوان جديد"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "70%" }}>
              <View style={{ gap: 12 }}>
                {/* Label */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6 }}>اسم العنوان *</Text>
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: C.surface,
                    borderRadius: 12, borderWidth: 1, borderColor: C.border,
                    paddingHorizontal: 12,
                  }}>
                    <TextInput
                      value={form.label}
                      onChangeText={(t) => setForm({ ...form, label: t })}
                      placeholder="البيت، العمل، أخرى"
                      placeholderTextColor={C.textMuted}
                      style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: C.text, textAlign: "right" }}
                    />
                  </View>
                </View>

                {/* Street */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6 }}>الشارع *</Text>
                  <TextInput
                    value={form.street}
                    onChangeText={(t) => setForm({ ...form, street: t })}
                    placeholder="مثال: شارع أحمد عرابي"
                    placeholderTextColor={C.textMuted}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 12, borderWidth: 1, borderColor: C.border,
                      paddingHorizontal: 12, paddingVertical: 12,
                      fontSize: 14, color: C.text, textAlign: "right",
                    }}
                  />
                </View>

                {/* Building & Floor Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6 }}>البناء *</Text>
                    <TextInput
                      value={form.building}
                      onChangeText={(t) => setForm({ ...form, building: t })}
                      placeholder="مثال: 45"
                      placeholderTextColor={C.textMuted}
                      style={{
                        backgroundColor: C.surface,
                        borderRadius: 12, borderWidth: 1, borderColor: C.border,
                        paddingHorizontal: 12, paddingVertical: 12,
                        fontSize: 14, color: C.text, textAlign: "right",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6 }}>الدور</Text>
                    <TextInput
                      value={form.floor}
                      onChangeText={(t) => setForm({ ...form, floor: t })}
                      placeholder="مثال: 3"
                      placeholderTextColor={C.textMuted}
                      style={{
                        backgroundColor: C.surface,
                        borderRadius: 12, borderWidth: 1, borderColor: C.border,
                        paddingHorizontal: 12, paddingVertical: 12,
                        fontSize: 14, color: C.text, textAlign: "right",
                      }}
                    />
                  </View>
                </View>

                {/* Apartment */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6 }}>الشقة *</Text>
                  <TextInput
                    value={form.apartment}
                    onChangeText={(t) => setForm({ ...form, apartment: t })}
                    placeholder="مثال: 12"
                    placeholderTextColor={C.textMuted}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 12, borderWidth: 1, borderColor: C.border,
                      paddingHorizontal: 12, paddingVertical: 12,
                      fontSize: 14, color: C.text, textAlign: "right",
                    }}
                  />
                </View>

                {/* Notes */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6 }}>ملاحظات إضافية</Text>
                  <TextInput
                    value={form.notes}
                    onChangeText={(t) => setForm({ ...form, notes: t })}
                    placeholder="مثال: بجانب المسجد، الباب الأزرق"
                    placeholderTextColor={C.textMuted}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 12, borderWidth: 1, borderColor: C.border,
                      paddingHorizontal: 12, paddingVertical: 12,
                      fontSize: 14, color: C.text, textAlign: "right",
                    }}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => setShowModal(false)}
                style={{
                  flex: 1, borderWidth: 1.5, borderColor: C.border,
                  paddingVertical: 14, borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: C.text, fontWeight: "700", fontSize: 14 }}>إلغاء</Text>
              </Pressable>
              <Pressable
                onPress={saveAddress}
                style={{
                  flex: 1, backgroundColor: C.primary,
                  paddingVertical: 14, borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>حفظ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
