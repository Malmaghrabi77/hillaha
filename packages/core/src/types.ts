export type CountryCode = "EG" | "SA";
export type UserRole = "customer" | "driver" | "partner" | "admin" | "super_admin";
export type AdminRole = "admin" | "super_admin";
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

// Admin Dashboard Types
export type AdminAssignment = {
  id: string;
  admin_id: string;
  partner_id: string;
  assigned_at: string;
  assigned_by?: string;
  status: "active" | "inactive";
};

export type AdminLog = {
  id: string;
  admin_id: string;
  action: string;
  entity_type: "partner" | "user" | "order" | "payment";
  entity_id: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  created_at: string;
};

export type AdminCommission = {
  id: string;
  partner_id: string;
  month: string; // YYYY-MM
  base_commission: number;
  override_commission?: number;
  earned_amount: number;
  settled_amount: number;
  settled_date?: string;
  settled_by?: string;
  notes?: string;
  created_at: string;
};

export type PartnerApproval = {
  id: string;
  partner_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  assigned_to?: string;
};

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  assigned_partners_count?: number;
};

export type AdminInvitation = {
  id: string;
  email: string;
  name: string;
  phone: string;
  admin_type: "regional_manager" | "regular_admin";
  invited_by: string;
  status: "pending" | "accepted" | "rejected";
  super_admin_approval: "pending" | "approved" | "rejected";
  approved_by_super_admin?: string;
  super_admin_notes?: string;
  can_be_invited_by?: "super_admin" | "regional_manager" | "super_admin,regional_manager";
  created_at: string;
  accepted_at?: string;
  approved_at?: string;
  accepted_user_id?: string;
};

export type RegionalManagerApprovalRecord = {
  admin_id: string;
  name: string;
  status: "approved" | "pending" | "rejected";
  approved_at?: string;
};

export type PartnerApprovalHistory = {
  id: string;
  partner_id: string;
  admin_id: string;
  admin_name: string;
  admin_role: "regional_manager" | "super_admin";
  action: "approved" | "rejected";
  notes?: string;
  created_at: string;
};

export type PartnerInvitation = {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: "pending" | "accepted" | "rejected";
  invited_by: string;
  invited_by_role: "super_admin" | "regional_manager" | "regular_admin";
  invited_type?: string;
  regional_manager_approval?: "pending" | "approved" | "rejected" | null;
  super_admin_approval?: "pending" | "approved" | "rejected" | null;
  approved_by_regional_manager?: string;
  approved_by_super_admin?: string;
  approval_notes?: string;
  rejection_reason?: string;
  created_at: string;
  accepted_at?: string;
  approved_at?: string;
  regional_manager_approved_at?: string;
};

export type StoreAdmin = {
  id: string;
  email: string;
  name: string;
  phone: string;
  store_id?: string;
  store_name?: string;
  partner_id: string;
  assigned_by: string;
  status: "active" | "inactive" | "pending";
  user_id?: string;
  created_at: string;
  activated_at?: string;
};
