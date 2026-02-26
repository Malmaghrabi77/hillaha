"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { StatsCard } from "./components/StatsCard";

const C = {
  primary: "#8B5CF6",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
};

interface DashboardStats {
  totalUsers: number;
  totalPartners: number;
  totalOrders: number;
  totalRevenue: number;
  pendingApprovals: number;
  pendingPayments: number;
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

      // Load total orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true });

      // Load pending approvals
      const { count: pendingApprovalsCount } = await supabase
        .from("partner_approvals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      // Load total revenue (sum of order totals)
      const { data: revenueData } = await supabase
        .from("orders")
        .select("total")
        .eq("status", "delivered");

      const totalRevenue = (revenueData || []).reduce(
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
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          لوحة القيادة
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          مرحباً {auth.isSuperAdmin ? "السوبر أدمن" : "المدير"} - {auth.user?.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatsCard
          label="إجمالي المستخدمين"
          value={stats.totalUsers}
          icon="👥"
          color="primary"
        />
        <StatsCard
          label="إجمالي الشركاء"
          value={stats.totalPartners}
          icon="🏪"
          color="primary"
        />
        <StatsCard
          label="إجمالي الطلبات"
          value={stats.totalOrders}
          icon="📦"
          color="success"
        />
        <StatsCard
          label="إجمالي الإيرادات"
          value={`${stats.totalRevenue.toFixed(0)} ج.م`}
          icon="💰"
          color="primary"
        />
        {stats.pendingApprovals > 0 && (
          <StatsCard
            label="موافقات معلقة"
            value={stats.pendingApprovals}
            icon="⏳"
            color="warning"
          />
        )}
      </div>

      {/* Quick Actions */}
      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: 0, marginBottom: 16 }}>
          الإجراءات السريعة
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          <a
            href="/admin/partners"
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#EDE9FE",
              color: C.primary,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#DDD6FE";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#EDE9FE";
            }}
          >
            🏪 الشركاء
          </a>

          <a
            href="/admin/payments"
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#D1FAE5",
              color: "#34D399",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#A7F3D0";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#D1FAE5";
            }}
          >
            💳 المدفوعات
          </a>

          <a
            href="/admin/orders"
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#FEF3C7",
              color: "#F59E0B",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#FDE68A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#FEF3C7";
            }}
          >
            📦 الطلبات
          </a>
        </div>
      </div>
    </div>
  );
}
