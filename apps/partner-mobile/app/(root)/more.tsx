import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { getSupabase } from "@hillaha/core";
import * as SecureStore from "expo-secure-store";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

export default function MoreScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          try {
            const supabase = getSupabase();
            if (supabase) {
              await supabase.auth.signOut();
            }
            await SecureStore.deleteItemAsync("PARTNER_EMAIL");
            await SecureStore.deleteItemAsync("PARTNER_ACCESS_TOKEN");
            router.replace("/(auth)/login");
          } catch (error) {
            Alert.alert("خطأ", "فشل تسجيل الخروج");
          }
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger }: any) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
    >
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemIcon}>{icon}</Text>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, danger && {color: COLORS.danger}]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      <Text style={styles.menuItemChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الحساب</Text>
        <MenuItem
          icon="👤"
          title="البيانات الشخصية"
          subtitle="عدّل معلومات حسابك"
          onPress={() => Alert.alert("قريباً", "هذه الميزة قيد التطوير")}
        />
        <MenuItem
          icon="🛍️"
          title="إدارة المتجر"
          subtitle="معلومات المتجر والشعار"
          onPress={() => Alert.alert("قريباً", "هذه الميزة قيد التطوير")}
        />
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإعدادات</Text>
        <MenuItem
          icon="📱"
          title="الإشعارات"
          subtitle="تحكم في الإشعارات"
          onPress={() => Alert.alert("قريباً", "هذه الميزة قيد التطوير")}
        />
        <MenuItem
          icon="💳"
          title="الحساب البنكي"
          subtitle="معلومات الدفع والعمولة"
          onPress={() => Alert.alert("قريباً", "هذه الميزة قيد التطوير")}
        />
        <MenuItem
          icon="🌍"
          title="اللغة"
          subtitle="العربية"
          onPress={() => Alert.alert("قريباً", "هذه الميزة قيد التطوير")}
        />
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الدعم والمساعدة</Text>
        <MenuItem
          icon="💬"
          title="الدعم الفني"
          subtitle="تواصل معنا"
          onPress={() => Alert.alert("الدعم", "support@hillaha.com\n01234567890")}
        />
        <MenuItem
          icon="📖"
          title="الشروط والخصوصية"
          subtitle="اقرأ الشروط"
          onPress={() => Alert.alert("قريباً", "هذه الميزة قيد التطوير")}
        />
      </View>

      {/* General Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>عام</Text>
        <MenuItem
          icon="ℹ️"
          title="عن التطبيق"
          subtitle="النسخة 1.0.0"
          onPress={() => Alert.alert("عن التطبيق", "تطبيق الشركاء - منصة حلّها\nالنسخة 1.0.0")}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.button, styles.buttonLogout]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
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
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  menuItemSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  menuItemChevron: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    fontWeight: "300",
  },
  button: {
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  buttonLogout: {
    backgroundColor: COLORS.danger,
    marginTop: SPACING.lg,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: FONT_SIZES.base,
    color: COLORS.surface,
  },
});
