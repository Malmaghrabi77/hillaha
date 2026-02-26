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
    };

    if (role === "super_admin") {
      // Super Admin has all permissions
      setPermissions({
        ...basePermissions,
        manageUsers: true,
        assignPartners: true,
        viewAllOrders: true,
        viewRevenue: true,
        createAdmin: true,
        manageAdmins: true,
        viewAuditLogs: true,
      });
    } else {
      // Regular Admin (Frid Admin)
      setPermissions(basePermissions);
    }
  }, [role]);

  return permissions;
}
