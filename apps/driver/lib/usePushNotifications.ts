import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";

// Deferred handler setup to avoid module-level side effects
let handlerConfigured = false;
function ensureHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function usePushNotifications(supabase: any, userId: string | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notifListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!userId || !supabase) return;

    ensureHandler();

    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Save token to Supabase
        (supabase as any)
          .from("push_tokens")
          .upsert(
            {
              user_id: userId,
              token,
              device_type: Device.osName || Platform.OS,
              device_model: Device.modelName || "unknown",
              app_type: "driver",
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,app_type" }
          )
          .then(() => {});
      }
    });

    // Listen for incoming notifications
    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received in foreground — handler already shows alert
    });

    // Listen for notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === "delivery" && data?.order_id) {
        router.push(`/delivery/${data.order_id}`);
      }
    });

    return () => {
      if (notifListener.current) Notifications.removeNotificationSubscription(notifListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [userId, supabase]);

  return { expoPushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined,
    });

    // Set up Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "إشعارات التوصيل",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });
    }

    return tokenData.data;
  } catch {
    return null;
  }
}
