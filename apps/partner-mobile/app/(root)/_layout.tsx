import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";
import { useNotifications } from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";

const TAB_ITEMS = [
  { name: "dashboard", title: "الرئيسية", icon: "📊" },
  { name: "orders", title: "الطلبات", icon: "📦" },
  { name: "menu", title: "القائمة", icon: "🍽️" },
  { name: "finance", title: "المالية", icon: "💰" },
  { name: "reviews", title: "التقييمات", icon: "⭐" },
  { name: "more", title: "المزيد", icon: "⚙️" },
] as const;

export default function RootLayout() {
  useNotifications();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) { router.replace("/(auth)/login"); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/(auth)/login"); return; }
        setReady(true);
      } catch {
        router.replace("/(auth)/login");
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, SPACING.sm),
          paddingTop: SPACING.sm,
          height: 60 + Math.max(insets.bottom, SPACING.sm),
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.xs,
          fontWeight: "700",
        },
      }}
    >
      {TAB_ITEMS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarLabel: title,
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerActive: {
    backgroundColor: COLORS.primarySoft,
  },
  icon: {
    fontSize: 18,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
});
