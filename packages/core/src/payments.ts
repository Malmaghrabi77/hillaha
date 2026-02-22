/**
 * payments.ts — إعدادات حسابات الدفع المركزية لمنصة حلّها
 *
 * يُعدَّل هذا الملف فقط لتحديث بيانات الحسابات.
 * جميع شاشات الدفع تستخدم هذه الثوابت مباشرةً.
 */

export const HILLAHA_PAYMENT_ACCOUNTS = {
  /**
   * InstaPay — يُحوَّل الإجمالي لهذا الحساب.
   * المستخدم يفتح تطبيق InstaPay ويُحوِّل يدوياً.
   */
  instapay: {
    account: "@malmaghrabi77",
    instructions: "افتح تطبيق InstaPay وحوّل المبلغ إلى الحساب أدناه",
  },

  /**
   * E& (اتصالات) — تحويل عبر خط الشبكة.
   * يُرسَل المبلغ لرقم الهاتف المُسجَّل أدناه.
   */
  etisalat: {
    phone: "01107549225",
    instructions: "افتح تطبيق E& أو اطلب تحويل رصيد إلى الرقم أدناه",
  },

  /**
   * Vodafone Cash — سيُحدَّد الحساب لاحقاً.
   */
  vodafone: {
    phone: null as string | null,   // TODO: يُضاف الرقم عند الجهوزية
    instructions: "سيتم الإعلان عن رقم المحفظة قريباً",
  },
} as const;

export type HillahaPaymentMethod = keyof typeof HILLAHA_PAYMENT_ACCOUNTS | "cash" | "card";
