import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef, useState } from 'react';

/**
 * ✅ Push Notifications Hook
 * تسجيل الأجهزة وإرسال الإشعارات المحلية
 */

interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

// تعريف معالج الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [notification, setNotification] = useState<any>(undefined);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const supabase = (() => {
    try {
      return (require("@hillaha/core") as any).getSupabase?.() ?? null;
    } catch {
      return null;
    }
  })();

  // ✅ Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listen to notifications when app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen to notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response.notification.request.content.data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
      console.log("⚠️ Must use physical device for Push Notifications");
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log("⚠️ Permission not granted for push notifications");
        return;
      }

      // Get the push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);

      // Save token to database
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('push_tokens').upsert({
            user_id: user.id,
            token: token,
            device_type: Device.osName,
            device_model: Device.modelName,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Set notification channel for Android
      if (Device.osName === 'Android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log("✅ Push notifications registered:", token);
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    }
  }

  // ✅ Send local notification
  const sendLocalNotification = async (content: NotificationContent) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          sound: content.sound || true,
          badge: content.badge || 1,
        },
        trigger: { seconds: 1 },
      });

      console.log("✅ Local notification scheduled");
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  // ✅ Send notification for order updates
  const notifyOrderStatus = async (orderId: string, status: string, message: string) => {
    const notifications: Record<string, NotificationContent> = {
      accepted: {
        title: "✅ تم قبول الطلب",
        body: `تم قبول طلبك برقم #${orderId}`,
        data: { orderId, status },
      },
      ready: {
        title: "🚗 طلبك جاهز",
        body: "يقوم المندوب بالانطلاق نحوك الآن",
        data: { orderId, status },
      },
      on_way: {
        title: "📍 المندوب في الطريق",
        body: "يصل إليك خلال 15 دقيقة تقريباً",
        data: { orderId, status },
      },
      delivered: {
        title: "🎉 تم التوصيل",
        body: "شكراً لطلبك، هل أنت راضٍ عنه؟",
        data: { orderId, status },
      },
    };

    const notif = notifications[status] || {
      title: "تحديث الطلب",
      body: message,
      data: { orderId, status },
    };

    await sendLocalNotification(notif);
  };

  // ✅ Send promotional notification
  const sendPromoNotification = async (title: string, description: string, promoCode?: string) => {
    await sendLocalNotification({
      title,
      body: description,
      data: { promoCode },
    });
  };

  return {
    expoPushToken,
    notification,
    sendLocalNotification,
    notifyOrderStatus,
    sendPromoNotification,
  };
};
