/**
 * Partner Mobile App - Push Notifications Setup
 * معالج الإشعارات الفورية للتطبيق
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useRef, useEffect } from "react";
import { useRouter, useSegments } from "expo-router";

// تكوين سلوك الإشعارات كلما كان التطبيق نشطاً
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Hook للتعامل مع الإشعارات في التطبيق
 */
export function useNotifications() {
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // استقبال الإشعارات عندما يكون التطبيق مفتوحاً
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📬 إشعار وارد:", notification);
        // يمكن هنا تحديث حالة التطبيق أو إعادة تحميل البيانات
      });

    // التعامل مع النقر على الإشعار
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 تم النقر على الإشعار:", response);

        const data = response.notification.request.content.data;

        // التنقل حسب الإشعار
        if (data.orderId) {
          router.push("/(root)/orders");
        } else if (data.type === "review") {
          router.push("/(root)/reviews");
        } else if (data.type === "settlement") {
          router.push("/(root)/finance");
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);
}

/**
 * طلب صلاحيات الإشعارات من المستخدم
 */
export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.log("⚠️ يجب استخدام جهاز حقيقي للإشعارات");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("❌ تم رفض صلاحية الإشعارات");
    return null;
  }

  // الحصول على Expo Push Token
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      throw new Error("EXPO_PUBLIC_PROJECT_ID غير موجود");
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("✅ Expo Push Token:", token);
    return token;
  } catch (error) {
    console.error("❌ خطأ في الحصول على Push Token:", error);
    return null;
  }
}

/**
 * أنواع الإشعارات
 */
export const NOTIFICATION_TYPES = {
  NEW_ORDER: "new_order",      // طلب جديد
  ORDER_ACCEPTED: "order_accepted",  // تم قبول الطلب
  ORDER_DELIVERED: "order_delivered",  // تم تسليم الطلب
  NEW_REVIEW: "new_review",    // تقييم جديد
  SETTLEMENT: "settlement",      // تسوية أسبوعية
  SYSTEM_UPDATE: "system_update",  // تحديث نظام
} as const;

/**
 * نماذج الإشعارات
 */
export const notificationTemplates = {
  newOrder: (customerName: string, amount: number, orderId: string) => ({
    title: "📦 طلب جديد!",
    body: `طلب من ${customerName} بمبلغ ${amount.toFixed(0)} ج.م`,
    data: { orderId, type: NOTIFICATION_TYPES.NEW_ORDER },
    sound: "default",
  }),

  newReview: (customerName: string, rating: number) => ({
    title: "⭐ تقييم جديد",
    body: `${customerName} قيّمك بـ ${"⭐".repeat(rating)}`,
    data: { type: NOTIFICATION_TYPES.NEW_REVIEW },
    sound: "notification",
  }),

  weeklySettlement: (amount: number) => ({
    title: "💰 تسوية أسبوعية",
    body: `تم تحويل ${amount.toFixed(0)} ج.م إلى حسابك`,
    data: { type: NOTIFICATION_TYPES.SETTLEMENT },
    sound: "default",
  }),

  systemUpdate: (message: string) => ({
    title: "🔔 تحديث النظام",
    body: message,
    data: { type: NOTIFICATION_TYPES.SYSTEM_UPDATE },
    sound: "notification",
  }),
} as const;
