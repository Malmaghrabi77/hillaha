/**
 * i18n.ts — Arabic/English translations for Hillaha customer app.
 * Ported from Hillaha-Services/client/src/lib/i18n.tsx and adapted for React Native.
 *
 * Usage:
 *   import { t, useLocale } from "@/lib/i18n";
 *   const { lang, setLang } = useLocale();
 *   t("home.search_placeholder", lang)
 */

import React, { createContext, useContext, useState } from "react";

// ─── Translation map ───────────────────────────────────────────────────────────

const translations = {
  // ── App & Branding ──────────────────────────────────────────────────────────
  "app.name":        { ar: "حلّها",         en: "Hillaha" },
  "app.tagline":     { ar: "حلها يحلها",    en: "Hillaha Handles It" },
  "app.city":        { ar: "قنا، مصر",      en: "Qena, Egypt" },

  // ── Navigation ──────────────────────────────────────────────────────────────
  "nav.home":        { ar: "الرئيسية",  en: "Home" },
  "nav.search":      { ar: "بحث",       en: "Search" },
  "nav.orders":      { ar: "طلباتي",    en: "Orders" },
  "nav.account":     { ar: "حسابي",     en: "Account" },

  // ── Home screen ─────────────────────────────────────────────────────────────
  "home.deliver_to":             { ar: "توصيل إلى",                      en: "Deliver to" },
  "home.search_placeholder":     { ar: "ابحث عن مطعم، صيدلية، طبيب...", en: "Search restaurants, pharmacy..." },
  "home.search_btn":             { ar: "بحث",                            en: "Search" },
  "home.limited_offer":          { ar: "عرض محدود",                      en: "Limited Offer" },
  "home.featured":               { ar: "⚡ عروض مميزة",                   en: "⚡ Featured Deals" },
  "home.view_all":               { ar: "عرض الكل",                       en: "View All" },
  "home.all_partners":           { ar: "🏪 جميع الشركاء",                 en: "🏪 All Partners" },
  "home.no_results":             { ar: "لا توجد نتائج",                   en: "No results" },

  // ── Categories ──────────────────────────────────────────────────────────────
  "cat.all":         { ar: "الكل",            en: "All" },
  "cat.food":        { ar: "مطاعم",           en: "Restaurants" },
  "cat.burger":      { ar: "برجر",            en: "Burgers" },
  "cat.shawarma":    { ar: "شاورما",          en: "Shawarma" },
  "cat.pizza":       { ar: "بيتزا",           en: "Pizza" },
  "cat.chicken":     { ar: "فراخ",            en: "Chicken" },
  "cat.healthy":     { ar: "صحي",             en: "Healthy" },
  "cat.coffee":      { ar: "قهوة وحلويات",    en: "Coffee & Desserts" },
  "cat.egyptian":    { ar: "كشري ومصري",      en: "Koshary & Egyptian" },
  "cat.cafe":        { ar: "كافيهات",         en: "Cafes" },
  "cat.pharmacy":    { ar: "صيدلية",          en: "Pharmacy" },
  "cat.medical":     { ar: "طبيب",            en: "Doctor" },

  // ── Partner / Restaurant card ────────────────────────────────────────────────
  "partner.open":          { ar: "متاح الآن",         en: "Open Now" },
  "partner.closed":        { ar: "مغلق حالياً",        en: "Closed" },
  "partner.delivery_time": { ar: "وقت التوصيل",        en: "Delivery Time" },
  "partner.delivery_fee":  { ar: "رسوم التوصيل",       en: "Delivery Fee" },
  "partner.min_order":     { ar: "الحد الأدنى للطلب", en: "Min. Order" },
  "partner.rating":        { ar: "التقييم",            en: "Rating" },
  "partner.reviews":       { ar: "تقييم",              en: "reviews" },
  "partner.discount":      { ar: "خصم",                en: "Off" },
  "partner.new":           { ar: "جديد",               en: "New" },
  "partner.popular":       { ar: "الأكثر طلباً",       en: "Most Ordered" },
  "partner.fast":          { ar: "توصيل سريع",         en: "Fast Delivery" },

  // ── Restaurant detail ────────────────────────────────────────────────────────
  "restaurant.add":                { ar: "إضافة",                  en: "Add" },
  "restaurant.view_cart":          { ar: "عرض السلة",              en: "View Cart" },
  "restaurant.promo_label":        { ar: "🎁",                     en: "🎁" },
  "restaurant.popular_badge":      { ar: "شائع",                   en: "Popular" },

  // ── Menu ────────────────────────────────────────────────────────────────────
  "menu.category.main":     { ar: "الأطباق الرئيسية",  en: "Main Dishes" },
  "menu.category.sides":    { ar: "الجانبية",           en: "Sides" },
  "menu.category.drinks":   { ar: "مشروبات",            en: "Drinks" },
  "menu.category.desserts": { ar: "الحلويات",           en: "Desserts" },

  // ── Cart ────────────────────────────────────────────────────────────────────
  "cart.title":           { ar: "السلة",                 en: "Cart" },
  "cart.empty":           { ar: "السلة فارغة",           en: "Cart is empty" },
  "cart.empty_sub":       { ar: "أضف منتجات من متجر لتتمكن من الطلب", en: "Add items from a store to place an order" },
  "cart.browse":          { ar: "تصفح المتاجر",          en: "Browse Stores" },
  "cart.items":           { ar: "المنتجات",              en: "Items" },
  "cart.add_more":        { ar: "إضافة",                 en: "Add More" },
  "cart.delivery_address":{ ar: "📍 عنوان التوصيل",     en: "📍 Delivery Address" },
  "cart.change_address":  { ar: "تغيير",                 en: "Change" },
  "cart.promo_question":  { ar: "هل لديك كود خصم؟",     en: "Have a promo code?" },
  "cart.promo_applied":   { ar: "تم تطبيق الكود!",       en: "Code applied!" },
  "cart.promo_discount":  { ar: "خصم",                   en: "discount" },
  "cart.promo_enter":     { ar: "أدخل كود الخصم",        en: "Enter promo code" },
  "cart.promo_apply":     { ar: "تطبيق",                 en: "Apply" },
  "cart.loyalty_earn":    { ar: "ستكسب",                 en: "You'll earn" },
  "cart.loyalty_points":  { ar: "نقطة ولاء",             en: "loyalty points" },
  "cart.subtotal":        { ar: "المجموع الجزئي",        en: "Subtotal" },
  "cart.delivery_fee":    { ar: "رسوم التوصيل",          en: "Delivery Fee" },
  "cart.discount":        { ar: "خصم الكود",             en: "Promo Discount" },
  "cart.total":           { ar: "الإجمالي",              en: "Total" },
  "cart.checkout_btn":    { ar: "إتمام الطلب",           en: "Checkout" },
  "cart.conflict_title":  { ar: "سلة من متجر آخر",       en: "Different store" },
  "cart.conflict_msg":    { ar: "السلة تحتوي على منتجات من متجر آخر. هل تريد مسح السلة والبدء من جديد؟", en: "Your cart has items from another store. Clear and start over?" },
  "cart.conflict_clear":  { ar: "مسح السلة",             en: "Clear Cart" },
  "cart.conflict_cancel": { ar: "إلغاء",                 en: "Cancel" },

  // ── Checkout ────────────────────────────────────────────────────────────────
  "checkout.title":         { ar: "الدفع",                              en: "Checkout" },
  "checkout.order_summary": { ar: "ملخص الطلب",                        en: "Order Summary" },
  "checkout.address":       { ar: "📍 عنوان التوصيل",                  en: "📍 Delivery Address" },
  "checkout.address_ph":    { ar: "مثال: شارع التحرير، المعادي، الدور 3", en: "e.g. 123 Main Street, Floor 3" },
  "checkout.phone_ph":      { ar: "رقم الهاتف للمندوب",                en: "Phone number for delivery" },
  "checkout.note_ph":       { ar: "ملاحظة للمطعم (اختياري)",           en: "Note to restaurant (optional)" },
  "checkout.payment":       { ar: "طريقة الدفع",                       en: "Payment Method" },
  "checkout.confirm_btn":   { ar: "تأكيد الطلب",                       en: "Confirm Order" },
  "checkout.uploading":     { ar: "جاري الرفع...",                      en: "Uploading..." },
  "checkout.address_req":   { ar: "يرجى إدخال عنوان التوصيل",         en: "Please enter delivery address" },
  "checkout.proof_req":     { ar: "يجب رفع صورة إثبات التحويل قبل تأكيد الطلب", en: "Please upload payment proof first" },

  // ── Payment methods ──────────────────────────────────────────────────────────
  "pay.cash":           { ar: "كاش عند الاستلام",    en: "Cash on Delivery" },
  "pay.cash_desc":      { ar: "ادفع نقداً للمندوب",  en: "Pay cash to the driver" },
  "pay.instapay":       { ar: "InstaPay",             en: "InstaPay" },
  "pay.instapay_desc":  { ar: "تحويل لحظي",           en: "Instant transfer" },
  "pay.etisalat":       { ar: "E& (اتصالات)",         en: "E& (Etisalat)" },
  "pay.etisalat_desc":  { ar: "تحويل رصيد",           en: "Balance transfer" },
  "pay.vodafone":       { ar: "Vodafone Cash",        en: "Vodafone Cash" },
  "pay.card":           { ar: "بطاقة بنكية",          en: "Bank Card" },
  "pay.soon":           { ar: "قريباً",               en: "Coming Soon" },
  "pay.instructions":   { ar: "📋 تعليمات التحويل",   en: "📋 Transfer Instructions" },

  // ── Proof of payment ────────────────────────────────────────────────────────
  "proof.title":       { ar: "رفع إثبات التحويل",         en: "Upload Payment Proof" },
  "proof.required":    { ar: "إلزامي — لا يمكن تأكيد الطلب بدونه", en: "Required to confirm order" },
  "proof.pick":        { ar: "اختر صورة من المعرض",       en: "Choose from gallery" },
  "proof.change":      { ar: "تغيير الصورة",             en: "Change image" },
  "proof.selected":    { ar: "تم اختيار صورة الإثبات",   en: "Proof image selected" },
  "proof.none":        { ar: "لم يتم اختيار صورة بعد",   en: "No image selected yet" },
  "proof.tip":         { ar: "التقط لقطة شاشة لإشعار التحويل ثم ارفعها هنا", en: "Take a screenshot of the transfer notification and upload it here" },
  "proof.warn":        { ar: "ارفع صورة إثبات التحويل أولاً", en: "Upload payment proof first" },

  // ── Orders screen ───────────────────────────────────────────────────────────
  "orders.title":       { ar: "طلباتي",           en: "My Orders" },
  "orders.empty":       { ar: "لا توجد طلبات بعد", en: "No orders yet" },
  "orders.empty_sub":   { ar: "اطلب الآن وتابع حالة طلبك هنا", en: "Order now and track your orders here" },
  "orders.status.pending":    { ar: "في الانتظار",     en: "Pending" },
  "orders.status.accepted":   { ar: "مقبول",           en: "Accepted" },
  "orders.status.preparing":  { ar: "يُحضَّر",         en: "Preparing" },
  "orders.status.ready":      { ar: "جاهز للاستلام",   en: "Ready" },
  "orders.status.picked_up":  { ar: "تم الاستلام",     en: "Picked Up" },
  "orders.status.delivered":  { ar: "تم التسليم",       en: "Delivered" },
  "orders.status.cancelled":  { ar: "ملغي",             en: "Cancelled" },

  // ── Tracking ────────────────────────────────────────────────────────────────
  "track.title":       { ar: "تتبع الطلب",          en: "Track Order" },
  "track.driver":      { ar: "المندوب في الطريق!",  en: "Driver on the way!" },
  "track.preparing":   { ar: "يُحضَّر طلبك الآن",  en: "Preparing your order..." },
  "track.delivered":   { ar: "تم التسليم!",          en: "Delivered!" },

  // ── Auth ────────────────────────────────────────────────────────────────────
  "auth.login":           { ar: "تسجيل دخول",            en: "Sign In" },
  "auth.register":        { ar: "إنشاء حساب",            en: "Create Account" },
  "auth.email":           { ar: "البريد الإلكتروني",      en: "Email" },
  "auth.phone":           { ar: "رقم الهاتف",            en: "Phone Number" },
  "auth.password":        { ar: "كلمة المرور",           en: "Password" },
  "auth.name":            { ar: "الاسم الكامل",           en: "Full Name" },
  "auth.login_btn":       { ar: "تسجيل الدخول",          en: "Sign In" },
  "auth.register_btn":    { ar: "إنشاء الحساب",          en: "Create Account" },
  "auth.biometric":       { ar: "دخول بالبصمة",          en: "Biometric Login" },
  "auth.no_account":      { ar: "ليس لديك حساب؟",        en: "Don't have an account?" },
  "auth.have_account":    { ar: "لديك حساب؟",            en: "Have an account?" },
  "auth.forgot_password": { ar: "نسيت كلمة المرور؟",    en: "Forgot Password?" },
  "auth.or":              { ar: "أو",                     en: "Or" },
  "auth.guest":           { ar: "تصفح بدون تسجيل",       en: "Browse as Guest" },
  "auth.verify_sent":     { ar: "تم إرسال رابط تأكيد إلى بريدك الإلكتروني", en: "Verification link sent to your email" },

  // ── Account screen ───────────────────────────────────────────────────────────
  "account.title":        { ar: "حسابي",             en: "My Account" },
  "account.edit":         { ar: "تعديل البيانات",    en: "Edit Profile" },
  "account.orders":       { ar: "طلباتي",            en: "My Orders" },
  "account.loyalty":      { ar: "نقاط الولاء",       en: "Loyalty Points" },
  "account.settings":     { ar: "الإعدادات",         en: "Settings" },
  "account.logout":       { ar: "تسجيل الخروج",      en: "Sign Out" },
  "account.guest_title":  { ar: "أنت غير مسجل",     en: "Not logged in" },
  "account.guest_sub":    { ar: "سجّل دخولك للاستفادة من جميع الميزات", en: "Sign in to access all features" },

  // ── Loyalty ─────────────────────────────────────────────────────────────────
  "loyalty.title":       { ar: "نقاط الولاء",                  en: "Loyalty Points" },
  "loyalty.balance":     { ar: "رصيد نقاطك الحالي",             en: "Current Balance" },
  "loyalty.points_unit": { ar: "نقطة",                          en: "pts" },
  "loyalty.redeem":      { ar: "استبدال",                       en: "Redeem" },
  "loyalty.unavailable": { ar: "غير متاح",                     en: "Unavailable" },
  "loyalty.done":        { ar: "✓ تم",                          en: "✓ Done" },
  "loyalty.rule_1":      { ar: "1 نقطة لكل 250 جنيه مشتريات", en: "1 point per 250 EGP spent" },
  "loyalty.rule_2":      { ar: "الحد الأدنى للاستبدال 20 نقطة", en: "Min. 20 points to redeem" },
  "loyalty.rule_3":      { ar: "1 نقطة = 1 جنيه خصم",          en: "1 point = 1 EGP discount" },
  "loyalty.rule_4":      { ar: "النقاط لا تنتهي صلاحيتها",    en: "Points never expire" },
  "loyalty.rule_5":      { ar: "يمكن تجميع النقاط مع العروض", en: "Stackable with promotions" },

  // ── Search ───────────────────────────────────────────────────────────────────
  "search.title":       { ar: "بحث",                   en: "Search" },
  "search.placeholder": { ar: "ابحث عن مطعم أو خدمة...", en: "Search restaurants or services..." },
  "search.filter_all":  { ar: "الكل",                  en: "All" },
  "search.filter_food": { ar: "مطاعم",                 en: "Restaurants" },
  "search.filter_svc":  { ar: "خدمات",                 en: "Services" },
  "search.no_results":  { ar: "لا توجد نتائج",          en: "No results found" },
  "search.try_other":   { ar: "جرّب كلمة بحث أخرى",    en: "Try a different search term" },

  // ── Services ─────────────────────────────────────────────────────────────────
  "services.title":     { ar: "الخدمات المنزلية",  en: "Home Services" },
  "services.book":      { ar: "احجز الآن",          en: "Book Now" },
  "services.per_hour":  { ar: "جنيه/ساعة",         en: "EGP/hr" },
  "services.per_visit": { ar: "جنيه/زيارة",        en: "EGP/visit" },
  "services.per_wash":  { ar: "جنيه/غسيل",         en: "EGP/wash" },
  "services.per_trip":  { ar: "جنيه/رحلة",         en: "EGP/trip" },

  // ── Medical ──────────────────────────────────────────────────────────────────
  "medical.title":       { ar: "خدمات طبية",         en: "Medical Services" },
  "medical.booking":     { ar: "حجز موعد طبيب",     en: "Book a Doctor" },
  "medical.prescription":{ ar: "رفع روشتة",          en: "Upload Prescription" },

  // ── Errors & misc ────────────────────────────────────────────────────────────
  "error.generic":      { ar: "حدث خطأ، حاول مرة أخرى",     en: "An error occurred, please try again" },
  "error.no_internet":  { ar: "تحقق من اتصال الإنترنت",       en: "Check your internet connection" },
  "error.login_req":    { ar: "يجب تسجيل الدخول أولاً",      en: "Please sign in first" },
  "common.loading":     { ar: "جاري التحميل...",              en: "Loading..." },
  "common.save":        { ar: "حفظ",                          en: "Save" },
  "common.cancel":      { ar: "إلغاء",                        en: "Cancel" },
  "common.confirm":     { ar: "تأكيد",                        en: "Confirm" },
  "common.close":       { ar: "إغلاق",                        en: "Close" },
  "common.back":        { ar: "رجوع",                         en: "Back" },
  "common.retry":       { ar: "إعادة المحاولة",               en: "Retry" },
  "common.done":        { ar: "تم",                           en: "Done" },
  "common.yes":         { ar: "نعم",                          en: "Yes" },
  "common.no":          { ar: "لا",                           en: "No" },
  "common.currency":    { ar: "جنيه",                         en: "EGP" },
} as const;

export type TranslationKey = keyof typeof translations;
export type Lang = "ar" | "en";

// ─── Pure translate function ──────────────────────────────────────────────────

export function t(key: TranslationKey, lang: Lang = "ar"): string {
  return translations[key]?.[lang] ?? key;
}

// ─── Context & Provider ───────────────────────────────────────────────────────

type LocaleContextValue = {
  lang:    Lang;
  setLang: (l: Lang) => void;
  t:       (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  lang:    "ar",
  setLang: () => {},
  t:       (k) => t(k, "ar"),
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  const tBound = (key: TranslationKey) => t(key, lang);

  return (
    <LocaleContext.Provider value={{ lang, setLang, t: tBound }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
