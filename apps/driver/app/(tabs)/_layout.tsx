import { Tabs } from "expo-router";
import { HALHA_THEME } from "@halha/ui";

const C = HALHA_THEME.colors;

export default function TabsLayout() {
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
          paddingBottom: 8,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="home"     options={{ title: "الطلبات",  tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} /> }} />
      <Tabs.Screen name="active"   options={{ title: "توصيل نشط", tabBarIcon: ({ color }) => <TabIcon emoji="🛵" color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: "الأرباح",   tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} /> }} />
      <Tabs.Screen name="profile"  options={{ title: "حسابي",    tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require("react-native");
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}
