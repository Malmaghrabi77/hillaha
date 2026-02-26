import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "@/lib/theme";

const Tab = createBottomTabNavigator();

// Placeholder screens (to be replaced with actual components)
const Dashboard = () => (
  <View style={styles.placeholder}>
    <Text>Dashboard</Text>
  </View>
);

const Orders = () => (
  <View style={styles.placeholder}>
    <Text>Orders</Text>
  </View>
);

const Menu = () => (
  <View style={styles.placeholder}>
    <Text>Menu</Text>
  </View>
);

const Finance = () => (
  <View style={styles.placeholder}>
    <Text>Finance</Text>
  </View>
);

const Reviews = () => (
  <View style={styles.placeholder}>
    <Text>Reviews</Text>
  </View>
);

const More = () => (
  <View style={styles.placeholder}>
    <Text>More</Text>
  </View>
);

export default function RootLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: SPACING.sm,
          paddingTop: SPACING.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: -SPACING.sm,
        },
      }}
    >
      <Tab.Screen
        name="dashboard"
        component={Dashboard}
        options={{
          title: "الرئيسية",
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                fontSize: 20,
                color,
                opacity: focused ? 1 : 0.6,
              }}
            >
              📊
            </Text>
          ),
        }}
      />

      <Tab.Screen
        name="orders"
        component={Orders}
        options={{
          title: "الطلبات",
          tabBarLabel: "الطلبات",
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                fontSize: 20,
                color,
                opacity: focused ? 1 : 0.6,
              }}
            >
              📦
            </Text>
          ),
        }}
      />

      <Tab.Screen
        name="menu"
        component={Menu}
        options={{
          title: "القائمة",
          tabBarLabel: "القائمة",
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                fontSize: 20,
                color,
                opacity: focused ? 1 : 0.6,
              }}
            >
              🍽️
            </Text>
          ),
        }}
      />

      <Tab.Screen
        name="finance"
        component={Finance}
        options={{
          title: "المالية",
          tabBarLabel: "المالية",
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                fontSize: 20,
                color,
                opacity: focused ? 1 : 0.6,
              }}
            >
              💰
            </Text>
          ),
        }}
      />

      <Tab.Screen
        name="reviews"
        component={Reviews}
        options={{
          title: "التقييمات",
          tabBarLabel: "التقييمات",
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                fontSize: 20,
                color,
                opacity: focused ? 1 : 0.6,
              }}
            >
              ⭐
            </Text>
          ),
        }}
      />

      <Tab.Screen
        name="more"
        component={More}
        options={{
          title: "المزيد",
          tabBarLabel: "المزيد",
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                fontSize: 20,
                color,
                opacity: focused ? 1 : 0.6,
              }}
            >
              ⋯
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
});
