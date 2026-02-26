/**
 * Partner Mobile App - Notifications Manager Service
 * خدمة إدارة الإشعارات والـ Push Tokens
 */

import { getSupabase } from "@hillaha/core";

/**
 * حفظ Expo Push Token في قاعدة البيانات
 */
export async function savePushToken(pushToken: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    // البحث عن شريك المستخدم
    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user.user.id)
      .single();

    if (!partner) {
      console.error("❌ لم يتم العثور على بيانات الشريك");
      return false;
    }

    // تحديث الـ push token
    const { error } = await supabase
      .from("partners")
      .update({
        push_token: pushToken,
        last_notification_at: new Date().toISOString(),
      })
      .eq("id", partner.id);

    if (error) {
      console.error("❌ خطأ في حفظ الـ Push Token:", error);
      return false;
    }

    console.log("✅ تم حفظ Push Token بنجاح");
    return true;
  } catch (error) {
    console.error("❌ خطأ في savePushToken:", error);
    return false;
  }
}

/**
 * تحديث تفضيلات الإشعارات
 */
export async function updateNotificationPreferences(preferences: {
  new_order?: boolean;
  order_updates?: boolean;
  reviews?: boolean;
  settlements?: boolean;
  system_updates?: boolean;
}): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: partner } = await supabase
      .from("partners")
      .select("id, notification_preferences")
      .eq("user_id", user.user.id)
      .single();

    if (!partner) return false;

    const updatedPrefs = {
      ...(partner.notification_preferences || {}),
      ...preferences,
    };

    const { error } = await supabase
      .from("partners")
      .update({ notification_preferences: updatedPrefs })
      .eq("id", partner.id);

    if (error) {
      console.error("❌ خطأ في تحديث التفضيلات:", error);
      return false;
    }

    console.log("✅ تم تحديث التفضيلات بنجاح");
    return true;
  } catch (error) {
    console.error("❌ خطأ في updateNotificationPreferences:", error);
    return false;
  }
}

/**
 * تفعيل/تعطيل الإشعارات
 */
export async function toggleNotifications(enabled: boolean): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user.user.id)
      .single();

    if (!partner) return false;

    const { error } = await supabase
      .from("partners")
      .update({ notifications_enabled: enabled })
      .eq("id", partner.id);

    if (error) {
      console.error("❌ خطأ في تحديث الإشعارات:", error);
      return false;
    }

    console.log(`✅ تم ${enabled ? "تفعيل" : "تعطيل"} الإشعارات`);
    return true;
  } catch (error) {
    console.error("❌ خطأ في toggleNotifications:", error);
    return false;
  }
}

/**
 * جلب سجل الإشعارات
 */
export async function getNotificationLogs(limit: number = 20) {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user.user.id)
      .single();

    if (!partner) return [];

    const { data: logs, error } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ خطأ في جلب السجلات:", error);
      return [];
    }

    return logs || [];
  } catch (error) {
    console.error("❌ خطأ في getNotificationLogs:", error);
    return [];
  }
}

/**
 * تسجيل إشعار في السجل
 */
export async function logNotification(
  partnerId: string,
  notificationType: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from("notification_logs")
      .insert({
        partner_id: partnerId,
        notification_type: notificationType,
        title,
        body,
        data: data || {},
        status: "sent",
      });

    if (error) {
      console.error("❌ خطأ في تسجيل الإشعار:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ خطأ في logNotification:", error);
    return false;
  }
}

/**
 * تحديث حالة الإشعار (قراءة/عدم قراءة)
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from("notification_logs")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) {
      console.error("❌ خطأ في تحديث حالة الإشعار:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ خطأ في markNotificationAsRead:", error);
    return false;
  }
}

/**
 * حذف إشعار
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from("notification_logs")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("❌ خطأ في حذف الإشعار:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ خطأ في deleteNotification:", error);
    return false;
  }
}
