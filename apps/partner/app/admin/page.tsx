"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "./hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
  primaryLight: "#C4B5FD",
  primaryDark: "#6D28D9",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  surfaceLight: "#FAFAFF",
  border: "#E7E3FF",
};

interface DashboardStats {
  totalUsers: number;
  totalPartners: number;
  totalOrders: number;
  totalRevenue: number;
  pendingApprovals: number;
  pendingPayments: number;
  activePartners: number;
  completedOrders: number;
}

export default function AdminDashboard() {
  const auth = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPartners: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    pendingPayments: 0,
    activePartners: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user) return;
    loadStats();
  }, [auth.user]);

  const loadStats = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Load total users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      // Load total partners
      const { count: partnersCount } = await supabase
        .from("partners")
        .select("id", { count: "exact", head: true });

      // Load active partners
      const { count: activePartnersCount } = await supabase
        .from("partners")
        .select("id", { count: "exact", head: true })
        .eq("is_open", true);

      // Load total orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true });

      // Load completed orders
      const { count: completedOrdersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered");

      // Load pending approvals
      const { count: pendingApprovalsCount } = await supabase
        .from("partner_approvals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      // Load total revenue (sum of order totals)
      const { data: revenueData } = await (supabase
        .from("orders") as any)
        .select("total")
        .eq("status", "delivered");

      const totalRevenue = ((revenueData as any[]) || []).reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      setStats({
        totalUsers: usersCount || 0,
        totalPartners: partnersCount || 0,
        totalOrders: ordersCount || 0,
        totalRevenue,
        pendingApprovals: pendingApprovalsCount || 0,
        pendingPayments: 0,
        activePartners: activePartnersCount || 0,
        completedOrders: completedOrdersCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    label,
    value,
    icon,
    color,
    trend,
  }: {
    label: string;
    value: string | number;
    icon: string;
    color: keyof typeof colorMap;
    trend?: { value: number; isPositive: boolean };
  }) => {
    const colorMap = {
      primary: { bg: "#EDE9FE", text: C.primary, icon: "#8B5CF6" },
      success: { bg: C.successLight, text: C.success, icon: "#10B981" },
      warning: { bg: C.warningLight, text: C.warning, icon: "#F59E0B" },
      danger: { bg: C.dangerLight, text: C.danger, icon: "#EF4444" },
    };

    const colors = colorMap[color];

    return (
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: "0 1px 3px rgba(139, 92, 246, 0.1)",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 8px 24px rgba(139, 92, 246, 0.15)";
          el.style.borderColor = C.primary;
          el.style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 1px 3px rgba(139, 92, 246, 0.1)";
          el.style.borderColor = C.border;
          el.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            {icon}
          </div>
          {trend && (
            <div
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                background: trend.isPositive ? C.successLight : C.dangerLight,
                color: trend.isPositive ? C.success : C.danger,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 8px 0", fontWeight: 600 }}>
          {label}
        </p>
        <h3 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0 }}>
          {value}
        </h3>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: `4px solid ${C.border}`,
              borderTopColor: C.primary,
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: C.textMuted }}>جاري تحميل البيانات...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
              🎯 لوحة التحكم
            </h1>
            <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
              مرحباً {auth.isSuperAdmin ? "السوبر أدمن" : "المدير"} • {auth.user?.email}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 4 }}>
              تاريخ اليوم
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>
              {new Date().toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: 1 }}>
          📊 الإحصائيات الرئيسية
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <StatCard label="إجمالي المستخدمين" value={stats.totalUsers} icon="👥" color="primary" />
          <StatCard label="إجمالي الشركاء" value={stats.totalPartners} icon="🏪" color="success" />
          <StatCard label="الشركاء النشطين" value={stats.activePartners} icon="✨" color="primary" />
          <StatCard label="الطلبات الإجمالية" value={stats.totalOrders} icon="📦" color="warning" />
          <StatCard label="الطلبات المكتملة" value={stats.completedOrders} icon="✅" color="success" />
          <StatCard label="الإيرادات الكلية" value={`${stats.totalRevenue.toFixed(0)} ج.م`} icon="💰" color="primary" />
        </div>
      </div>

      {/* Alerts & Pending Actions */}
      {stats.pendingApprovals > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: 1 }}>
            ⚠️ الإجراءات المعلقة
          </h2>
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: C.warningLight,
              border: `2px solid ${C.warning}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: C.warning, margin: "0 0 4px 0" }}>
                {stats.pendingApprovals} موافقات معلقة
              </h3>
              <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
                تنتظر موافقتك على طلبات شركاء جدد
              </p>
            </div>
            <a
              href="/admin/partners"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: C.warning,
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = C.primaryDark;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = C.warning;
              }}
            >
              عرض التفاصيل
            </a>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: 1 }}>
          ⚡ الإجراءات السريعة
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { href: "/admin/partners", label: "إدارة الشركاء", icon: "🏪", color: C.primary },
            { href: "/admin/payments", label: "إدارة المدفوعات", icon: "💳", color: C.success },
            { href: "/admin/orders", label: "عرض الطلبات", icon: "📦", color: C.warning },
            { href: "/admin/users", label: "إدارة المستخدمين", icon: "👥", color: C.primary },
            auth.isSuperAdmin && { href: "/admin/admin-management", label: "إدارة النظام", icon: "⚙️", color: "#EC4899" },
            { href: "/admin/analytics", label: "التحليلات", icon: "📈", color: C.success },
          ]
            .filter(Boolean)
            .map((action) => (
              <a
                key={action.href}
                href={action.href}
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  background: C.surface,
                  border: `1.5px solid ${C.border}`,
                  color: C.text,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  textAlign: "right",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = action.color + "15";
                  el.style.borderColor = action.color;
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = C.surface;
                  el.style.borderColor = C.border;
                  el.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: 20 }}>{action.icon}</span>
                <span>{action.label}</span>
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}
