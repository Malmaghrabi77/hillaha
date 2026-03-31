"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import type { AdminRole } from "@hillaha/core";

export interface AdminPermissions {
  // Dashboard
  viewDashboard: boolean;

  // User Management
  viewUsers: boolean;
  manageUsers: boolean;

  // Partner Management
  viewPartners: boolean;
  managePartners: boolean;
  approvePartners: boolean;
  assignPartners: boolean;

  // Orders
  viewAllOrders: boolean;
  viewAssignedOrders: boolean;
  manageOrders: boolean;

  // Payments & Commissions
  viewPayments: boolean;
  managePayments: boolean;
  settlePayments: boolean;
  viewRevenue: boolean;

  // Analytics
  viewAnalytics: boolean;

  // Admin Management (Super Admin only)
  createAdmin: boolean;
  manageAdmins: boolean;
  viewAuditLogs: boolean;

  // Wallet Codes
  generateWalletCodes: boolean;
  approveWalletCodes: boolean;

  // Financial / Card Analytics
  viewCardAnalytics: boolean;

  // Security
  viewSecurityAlerts: boolean;

  // Pricing Management
  managePricing: boolean;
  approvePricing: boolean;

  // Payment Methods
  managePaymentMethods: boolean;

  // Payment Approval (high-value orders)
  approvePayments: boolean;
}

export function useAdminPermissions(
  role: AdminRole | null
): AdminPermissions {
  const [permissions, setPermissions] = useState<AdminPermissions>({
    viewDashboard: false,
    viewUsers: false,
    manageUsers: false,
    viewPartners: false,
    managePartners: false,
    approvePartners: false,
    assignPartners: false,
    viewAllOrders: false,
    viewAssignedOrders: false,
    manageOrders: false,
    viewPayments: false,
    managePayments: false,
    settlePayments: false,
    viewRevenue: false,
    viewAnalytics: false,
    createAdmin: false,
    manageAdmins: false,
    viewAuditLogs: false,
    generateWalletCodes: false,
    approveWalletCodes: false,
    viewCardAnalytics: false,
    viewSecurityAlerts: false,
    managePricing: false,
    approvePricing: false,
    managePaymentMethods: false,
    approvePayments: false,
  });

  useEffect(() => {
    if (!role) return;

    const basePermissions: AdminPermissions = {
      // Shared by all admins
      viewDashboard: true,
      viewUsers: true,
      manageUsers: false,
      viewPartners: true,
      managePartners: true,
      approvePartners: true,
      assignPartners: false,
      viewAllOrders: false,
      viewAssignedOrders: true,
      manageOrders: true,
      viewPayments: true,
      managePayments: true,
      settlePayments: true,
      viewRevenue: false,
      viewAnalytics: true,
      createAdmin: false,
      manageAdmins: false,
      viewAuditLogs: false,
      generateWalletCodes: false,
      approveWalletCodes: false,
      viewCardAnalytics: false,
      viewSecurityAlerts: false,
      managePricing: true,
      approvePricing: false,
      managePaymentMethods: false,
      approvePayments: false,
    };

    if (role === "super_admin") {
      setPermissions({
        ...basePermissions,
        manageUsers: true,
        assignPartners: true,
        viewAllOrders: true,
        viewRevenue: true,
        createAdmin: true,
        manageAdmins: true,
        viewAuditLogs: true,
        generateWalletCodes: true,
        approveWalletCodes: true,
        viewCardAnalytics: true,
        viewSecurityAlerts: true,
        managePricing: true,
        approvePricing: true,
        managePaymentMethods: true,
        approvePayments: true,
      });
    } else if (role === "accountant") {
      setPermissions({
        ...basePermissions,
        viewUsers: false,
        manageUsers: false,
        viewPartners: false,
        managePartners: false,
        approvePartners: false,
        viewAssignedOrders: false,
        manageOrders: false,
        viewPayments: true,
        managePayments: false,
        settlePayments: false,
        viewRevenue: true,
        viewAnalytics: true,
        generateWalletCodes: true,
        approveWalletCodes: false,
        viewCardAnalytics: true,
        viewSecurityAlerts: true,
        managePricing: true,
        approvePricing: false,
        managePaymentMethods: false,
        approvePayments: true,
      });
    } else {
      // Regular Admin / Regional Manager
      setPermissions({
        ...basePermissions,
        generateWalletCodes: true,
        managePricing: true,
        managePaymentMethods: true,
        approvePayments: true,
      });
    }
  }, [role]);

  return permissions;
}
