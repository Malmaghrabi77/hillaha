import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef, useState } from 'react';
import { getCustomerSupabase } from '../../lib/supabase';

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

// تعريف معالج الإشعارات — deferred to avoid module-level native calls
let _handlerSet = false;
function ensureNotificationHandler() {
  if (_handlerSet) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    _handlerSet = true;
  } catch {}
}

export const usePushNotifications = () => {
  ensureNotificationHandler();
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [notification, setNotification] = useState<any>(undefined);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const supabase = (() => {
    try {
      return getCustomerSupabase();
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
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
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

    } catch {
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

    } catch {
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
