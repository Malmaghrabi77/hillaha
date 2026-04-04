import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getSupabase } from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import { requestNotificationPermissions } from "@/lib/notifications";
import { savePushToken } from "@/lib/notificationService";

export default function IndexScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const supabase = getSupabase();

      if (!supabase) {
        router.replace("/(auth)/login");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userData?.user && !userError) {
        // Initialize notifications in background
        initNotifications();
        router.replace("/(root)/dashboard");
        return;
      } else {
        const email = await SecureStore.getItemAsync("PARTNER_EMAIL");
        const accessToken = await SecureStore.getItemAsync("PARTNER_ACCESS_TOKEN");
        const refreshToken = await SecureStore.getItemAsync("PARTNER_REFRESH_TOKEN");

        if (email && accessToken && refreshToken) {
          // Validate stored tokens before redirecting
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError || !sessionData.session) {
            await SecureStore.deleteItemAsync("PARTNER_ACCESS_TOKEN");
            await SecureStore.deleteItemAsync("PARTNER_REFRESH_TOKEN");
            router.replace("/(auth)/login");
            return;
          }
          initNotifications();
          router.replace("/(root)/dashboard");
        } else {
          router.replace("/(auth)/login");
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      router.replace("/(auth)/login");
    } finally {
      setChecking(false);
    }
  };

  const initNotifications = async () => {
    try {
      const pushToken = await requestNotificationPermissions();
      if (pushToken) {
        await savePushToken(pushToken);
      }
    } catch (e) {
      console.warn("init_notifications:", e);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8B5CF6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
});
