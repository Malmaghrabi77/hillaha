import { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { getSupabase } from "@hillaha/core";
import * as SecureStore from "expo-secure-store";
import {
  requestNotificationPermissions,
  useNotifications,
} from "@/lib/notifications";
import { savePushToken } from "@/lib/notificationService";

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // تفعيل الإشعارات والاستماع لها
  useNotifications();

  useEffect(() => {
    checkAuth();
    initializeNotifications();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setIsLoggedIn(false);
        return;
      }

      // Check for existing session
      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setIsLoggedIn(true);
      } else {
        // Try to retrieve from secure store for biometric login
        const email = await SecureStore.getItemAsync("PARTNER_EMAIL");
        const token = await SecureStore.getItemAsync("PARTNER_ACCESS_TOKEN");

        if (email && token) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsLoggedIn(false);
    }
  };

  const initializeNotifications = async () => {
    try {
      // طلب صلاحيات الإشعارات
      const pushToken = await requestNotificationPermissions();

      if (pushToken) {
        // حفظ الـ token في قاعدة البيانات
        const saved = await savePushToken(pushToken);
        if (saved) {
          console.log("✅ تم تفعيل الإشعارات بنجاح");
        }
      } else {
        console.log("⚠️ لم يتم تفعيل الإشعارات");
      }
    } catch (error) {
      console.error("❌ خطأ في تهيئة الإشعارات:", error);
    }
  };

  // Still loading auth state
  if (isLoggedIn === null) {
    return null;
  }

  // If not logged in, redirect to auth stack
  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in - return dashboard stack
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(root)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar barStyle="dark-content" />
    </>
  );
}


