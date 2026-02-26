"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { useAdminPermissions } from "./hooks/useAdminPermissions";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#34D399",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiredPermission?: keyof any;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "لوحة القيادة", icon: "📊", requiredPermission: "viewDashboard" },
  { href: "/admin/partners", label: "الشركاء", icon: "🏪" },
  { href: "/admin/payments", label: "المدفوعات", icon: "💳" },
  { href: "/admin/payments-config", label: "إعدادات الدفع", icon: "⚙️" },
  { href: "/admin/promotions", label: "العروض", icon: "🎁" },
  { href: "/admin/approve-offers", label: "اعتماد العروض", icon: "✅" },
  { href: "/admin/orders", label: "الطلبات", icon: "📦" },
  { href: "/admin/users", label: "المستخدمون", icon: "👥" },
  { href: "/admin/analytics", label: "التحليلات", icon: "📈" },
  { href: "/admin/invite-admin", label: "دعوة مدير", icon: "📨" },
  { href: "/admin/admin-management", label: "إدارة النظام", icon: "⚙️", superAdminOnly: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAdminAuth();
  const permissions = useAdminPermissions(auth.role);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Show loading spinner while checking auth
  if (auth.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: `4px solid ${C.primarySoft}`,
            borderTopColor: C.primary,
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Only render if authenticated as admin
  if (!auth.isAdmin || !auth.user) {
    return null;
  }

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (item.superAdminOnly && !auth.isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          backgroundColor: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>👑</span>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.text }}>
              Hillaha Admin
            </h1>
          </div>
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
            {auth.isSuperAdmin ? "Super Admin" : "Frid Admin"}
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  marginBottom: 8,
                  borderRadius: 12,
                  border: "none",
                  background: isActive ? C.primarySoft : "transparent",
                  color: isActive ? C.primary : C.text,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s",
                  textAlign: "right",
                  direction: "rtl",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = C.primarySoft + "40";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 12px", borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: C.dangerSoft,
              color: C.danger,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "right",
              direction: "rtl",
            }}
          >
            العودة للأساسي
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top Bar */}
        <div
          style={{
            backgroundColor: C.surface,
            borderBottom: `1px solid ${C.border}`,
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: "8px 12px",
              border: "none",
              background: C.primarySoft,
              color: C.primary,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            {sidebarOpen ? "☰" : "☰"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>
              مرحباً: {auth.user.email}
            </span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: C.primarySoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              👤
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
