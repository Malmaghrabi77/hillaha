/**
 * عناوين البريد الإلكتروني الرسمية لمنصة حلّها
 * ─────────────────────────────────────────────
 * info@hillaha.com      — معلومات عامة عن التطبيق
 * webmaster@hillaha.com — طلبات تسجيل الشركاء الجدد
 * admin1@hillaha.com    — مدير التطبيق (مفوَّض من السوبرادمن)
 * masteradmin@hillaha.com — السوبرادمن (طلبات الشركاء الرسمية)
 */

export const HILLAHA_EMAILS = {
  /** معلومات عامة — للعملاء والاستفسارات */
  info: "info@hillaha.com",

  /** تسجيل الشركاء الجدد — كل طلب تسجيل يُرسل إلى هذا العنوان */
  webmaster: "webmaster@hillaha.com",

  /** مدير التطبيق المفوَّض من السوبرادمن */
  admin: "admin1@hillaha.com",

  /** السوبرادمن — طلبات الشركاء الرسمية */
  masterAdmin: "masteradmin@hillaha.com",
} as const;

export type HillahaEmailKey = keyof typeof HILLAHA_EMAILS;
