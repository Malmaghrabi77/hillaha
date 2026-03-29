import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",
} as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          height: 62 + Math.max(insets.bottom - 8, 0),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="home"     options={{ title: "الطلبات",  tabBarIcon: () => <TabIcon emoji="📦" /> }} />
      <Tabs.Screen name="active"   options={{ title: "توصيل نشط", tabBarIcon: () => <TabIcon emoji="🛵" /> }} />
      <Tabs.Screen name="earnings" options={{ title: "الأرباح",   tabBarIcon: () => <TabIcon emoji="💰" /> }} />
      <Tabs.Screen name="profile"  options={{ title: "حسابي",    tabBarIcon: () => <TabIcon emoji="👤" /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}
