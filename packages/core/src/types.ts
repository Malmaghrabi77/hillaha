export type CountryCode = "EG" | "SA";
export type UserRole = "customer" | "driver" | "partner" | "super_admin";
export type PartnerType = "restaurant" | "store" | "pharmacy" | "clinic";
export type DeliveryType = "platform" | "self";
export type PaymentMethod = "cash" | "wallet_transfer" | "card";
export type ConsentType = "customer_terms" | "partner_terms" | "driver_terms" | "medical_terms";

export type MonthlyCommissionRule = {
  baseRate: number;
  targetCompletedOrders: number;
  afterTargetRate: number;
  resetsMonthly: boolean;
};

export const DEFAULT_MONTHLY_COMMISSION_RULE: MonthlyCommissionRule = {
  baseRate: 0.10,
  targetCompletedOrders: 1000,
  afterTargetRate: 0.08,
  resetsMonthly: true,
};

export type DeliveryBand = { minKm: number; maxKm: number | null; fee: number; appCommissionRate: number };
