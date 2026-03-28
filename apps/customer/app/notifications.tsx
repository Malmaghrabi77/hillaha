import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Switch, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { SafeAreaScrollView } from "../src/components";

const NOTIFICATION_PREFS_KEY = "@hillaha_notification_prefs";

interface NotificationPrefs {
  orders: boolean;
  promotions: boolean;
  delivery: boolean;
  chat: boolean;
  system: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  orders: true,
  promotions: true,
  delivery: true,
  chat: true,
  system: true,
};

const SETTINGS = [
  { key: "orders" as const, icon: "📦", label: "تحديثات الطلبات", desc: "حالة الطلب والتوصيل" },
  { key: "promotions" as const, icon: "🎟️", label: "العروض والخصومات", desc: "عروض حصرية وأكواد خصم" },
  { key: "delivery" as const, icon: "🛵", label: "تتبع التوصيل", desc: "موقع المندوب وتحديثات التسليم" },
  { key: "chat" as const, icon: "💬", label: "الرسائل والمحادثات", desc: "رسائل الدعم والمندوب" },
  { key: "system" as const, icon: "⚙️", label: "إشعارات النظام", desc: "تحديثات التطبيق والصيانة" },
];

export default function Notifications() {
  const { colors } = useDarkMode();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATION_PREFS_KEY).then((raw) => {
      if (raw) {
        try { setPrefs(JSON.parse(raw)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const togglePref = async (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
  };

  const toggleAll = async (value: boolean) => {
    const updated: NotificationPrefs = {
      orders: value,
      promotions: value,
      delivery: value,
      chat: value,
      system: value,
    };
    setPrefs(updated);
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
  };

  const allEnabled = Object.values(prefs).every(Boolean);
  const allDisabled = Object.values(prefs).every((v) => !v);

  if (!loaded) return null;

  return (
    <SafeAreaScrollView variant="page" safeTop={false} backgroundColor={colors.bg} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Toggle All */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        padding: 16, borderRadius: 16, marginBottom: 16,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
            {allEnabled ? "إيقاف جميع الإشعارات" : "تفعيل جميع الإشعارات"}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            التحكم في كل الإشعارات دفعة واحدة
          </Text>
        </View>
        <Switch
          value={allEnabled}
          onValueChange={(val) => toggleAll(val)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Individual Settings */}
      {SETTINGS.map((item) => (
        <View
          key={item.key}
          style={{
            flexDirection: "row", alignItems: "center",
            padding: 16, borderRadius: 16, marginBottom: 10,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <View style={{
            width: 42, height: 42, borderRadius: 12,
            backgroundColor: colors.primarySoft,
            justifyContent: "center", alignItems: "center", marginRight: 14,
          }}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{item.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
          </View>
          <Switch
            value={prefs[item.key]}
            onValueChange={() => togglePref(item.key)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      ))}

      {/* Info Note */}
      <View style={{
        marginTop: 16, padding: 16, borderRadius: 16,
        backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + "30",
      }}>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20, textAlign: "right" }}>
          💡 يمكنك أيضاً التحكم في الإشعارات من إعدادات جهازك. بعض الإشعارات الهامة مثل تأكيد الطلب قد تصل حتى في حالة إيقاف الإشعارات.
        </Text>
      </View>
    </SafeAreaScrollView>
  );
}
