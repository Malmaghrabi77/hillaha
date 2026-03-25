/**
 * Centralized Analytics Events Constants
 * Ensures consistent event naming across the entire app
 * Pattern: FEATURE.ACTION or FEATURE_DETAILED_ACTION
 */

export const ANALYTICS_EVENTS = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCREEN VIEWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SCREEN: {
    HOME: 'screen_home',
    SEARCH: 'screen_search',
    ORDERS: 'screen_orders',
    ACCOUNT: 'screen_account',
    CART: 'screen_cart',
    CHECKOUT: 'screen_checkout',
    TRACKING: 'screen_tracking',
    FAVORITES: 'screen_favorites',
    ADDRESSES: 'screen_addresses',
    LOYALTY: 'screen_loyalty',
    PROMO: 'screen_promo',
    RATE_ORDER: 'screen_rate_order',
    MEDICAL_HUB: 'screen_medical_hub',
    DOCTOR_BOOKING: 'screen_doctor_booking',
    PRESCRIPTION: 'screen_prescription',
    CHAT_PARTNER: 'screen_chat_partner',
    CHAT_DRIVER: 'screen_chat_driver',
    CHAT_SUPPORT: 'screen_chat_support',
    RESTAURANT: 'screen_restaurant',
    LEGAL_CONSENT: 'screen_legal_consent',
    SUBSCRIPTIONS: 'screen_subscriptions',
    REFERRALS: 'screen_referrals',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NAVIGATION ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  NAVIGATION: {
    BACK_PRESSED: 'nav_back_pressed',
    CATEGORY_SELECTED: 'nav_category_selected',
    PARTNER_CLICKED: 'nav_partner_clicked',
    BANNER_CLICKED: 'nav_banner_clicked',
    SERVICE_CLICKED: 'nav_service_clicked',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FAVORITES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FAVORITES: {
    ADDED: 'favorite_added',
    REMOVED: 'favorite_removed',
    CARD_PRESSED: 'favorite_card_pressed',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEARCH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SEARCH: {
    QUERY_SUBMITTED: 'search_query_submitted',
    RESULT_CLICKED: 'search_result_clicked',
    FILTER_APPLIED: 'search_filter_applied',
    FILTER_RESET: 'search_filter_reset',
    POPULAR_TAG_CLICKED: 'search_popular_tag_clicked',
    SORT_CHANGED: 'search_sort_changed',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CART & CHECKOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CART: {
    ITEM_ADDED: 'cart_item_added',
    ITEM_REMOVED: 'cart_item_removed',
    QUANTITY_CHANGED: 'cart_quantity_changed',
    PROMO_APPLIED: 'cart_promo_applied',
    PROMO_REMOVED: 'cart_promo_removed',
    CHECKOUT_INITIATED: 'cart_checkout_initiated',
  },

  CHECKOUT: {
    PAYMENT_METHOD_SELECTED: 'checkout_payment_method_selected',
    PROOF_UPLOADED: 'checkout_proof_uploaded',
    ORDER_COMPLETED: 'checkout_order_completed',
    ORDER_FAILED: 'checkout_order_failed',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ORDERS & TRACKING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ORDER: {
    VIEWED: 'order_viewed',
    REORDER_CLICKED: 'order_reorder_clicked',
    CANCELLED: 'order_cancelled',
    TRACKING_OPENED: 'order_tracking_opened',
    DRIVER_CALLED: 'order_driver_called',
    DRIVER_CHATTED: 'order_driver_chatted',
  },

  TRACKING: {
    MAP_OPENED: 'tracking_map_opened',
    DRIVER_INFO_VIEWED: 'tracking_driver_info_viewed',
    CALL_DRIVER: 'tracking_call_driver',
    CHAT_DRIVER: 'tracking_chat_driver',
    RATE_ORDER: 'tracking_rate_order',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ADDRESSES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ADDRESS: {
    ADDED: 'address_added',
    UPDATED: 'address_updated',
    DELETED: 'address_deleted',
    SET_DEFAULT: 'address_set_default',
    EDIT_INITIATED: 'address_edit_initiated',
    ADD_INITIATED: 'address_add_initiated',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOYALTY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LOYALTY: {
    REWARD_REDEEMED: 'loyalty_reward_redeemed',
    POINTS_VIEWED: 'loyalty_points_viewed',
    HISTORY_VIEWED: 'loyalty_history_viewed',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MEDICAL SERVICES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MEDICAL: {
    SERVICE_OPENED: 'medical_service_opened',
    SPECIALIZATION_SELECTED: 'medical_specialization_selected',
    DOCTOR_SELECTED: 'medical_doctor_selected',
    APPOINTMENT_BOOKED: 'medical_appointment_booked',
    PRESCRIPTION_UPLOADED: 'medical_prescription_uploaded',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHAT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CHAT: {
    MESSAGE_SENT: 'chat_message_sent',
    CALL_INITIATED: 'chat_call_initiated',
    FILE_SHARED: 'chat_file_shared',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RATINGS & REVIEWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RATING: {
    SUBMITTED: 'rating_submitted',
    PARTNER_RATED: 'rating_partner_rated',
    DRIVER_RATED: 'rating_driver_rated',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTHENTICATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AUTH: {
    LOGIN_INITIATED: 'auth_login_initiated',
    REGISTER_INITIATED: 'auth_register_initiated',
    LOGOUT: 'auth_logout',
    PASSWORD_RESET: 'auth_password_reset',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HOME SCREEN ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HOME: {
    REFRESH: 'home_refresh',
    BANNER_CLICKED: 'home_banner_clicked',
    CATEGORY_SELECTED: 'home_category_selected',
    SERVICE_CLICKED: 'home_service_clicked',
    PARTNER_CLICKED: 'home_partner_clicked',
    LOAD_MORE: 'home_load_more',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROMO & REFERRALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PROMO: {
    CODE_APPLIED: 'promo_code_applied',
    CODE_INVALID: 'promo_code_invalid',
    CODE_COPIED: 'promo_code_copied',
  },

  REFERRAL: {
    CODE_SHARED: 'referral_code_shared',
    CODE_COPIED: 'referral_code_copied',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESTAURANT & SERVICES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RESTAURANT: {
    MENU_VIEWED: 'restaurant_menu_viewed',
    ITEM_ADDED: 'restaurant_item_added',
    ITEM_REMOVED: 'restaurant_item_removed',
    CART_VIEWED: 'restaurant_cart_viewed',
  },

  SERVICE: {
    CLEANING_INITIATED: 'service_cleaning_initiated',
    ELECTRICAL_INITIATED: 'service_electrical_initiated',
    DELIVERY_INITIATED: 'service_delivery_initiated',
  },
} as const;

// Type for analytics event keys
export type AnalyticsEventKey =
  | typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS][keyof typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]];
