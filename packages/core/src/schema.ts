// ─── Entity types for Hillaha platform ───────────────────────────────────────
// Adapted from Hillaha-Services shared/schema.ts for use across all apps.
// Supabase uses snake_case column names; these types use camelCase.

export type Category = {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  image?: string;
  type: "food" | "service";
  sortOrder: number;
};

export type Partner = {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  coverImage?: string;
  categoryId?: string;
  type: "restaurant" | "store" | "pharmacy" | "clinic";
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  isFeatured: boolean;
  tags: string[];
  address?: string;
  city: string;
  phone?: string;
  commissionRate: number;
  isApproved: boolean;
};

export type MenuItem = {
  id: string;
  partnerId: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  image?: string;
  category?: string;
  isAvailable: boolean;
  isPopular: boolean;
};

export type Service = {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  icon: string;
  image?: string;
  basePrice: number;
  priceUnit: "per_hour" | "per_visit" | "per_wash" | "per_trip";
  rating: number;
  isAvailable: boolean;
};

export type CartLineItem = {
  menuItemId: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  image?: string;
};

export type Order = {
  id: string;
  customerId: string;
  partnerId?: string;
  driverId?: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "delivering"
    | "done"
    | "cancelled";
  items: CartLineItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: "cash" | "wallet_transfer" | "card";
  paymentStatus: "pending" | "paid" | "failed";
  paymentProofUrl?: string;
  deliveryAddress: string;
  customerPhone?: string;
  customerNote?: string;
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: string;
};

export type Driver = {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  vehicleType?: string;
  vehiclePlate?: string;
  city: string;
  commissionRate: number;
  totalDeliveries: number;
  totalEarnings: number;
  isOnline: boolean;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
};

export type Admin = {
  id: string;
  username: string;
  name: string;
  nameAr?: string;
  email?: string;
  role: "admin" | "master";
  isActive: boolean;
  createdAt: string;
};

export type PlatformSettings = {
  key: string;
  value: string;
};
