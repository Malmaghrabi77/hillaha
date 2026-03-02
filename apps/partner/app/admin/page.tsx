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
  totalRevenue30Days: number;
  revenueChangePercent: number;
  completedOrdersCount: number;
  activeDriversCount: number;
  orderCompletionRate: number;
  activePartnersCount: number;
  pendingPartnersCount: number;
  regionalManagersCount: number;
  pendingPaymentsAmount: number;
  platformRating: number;
  monthlyRevenueData: { month: string; revenue: number }[];
  managerPerformanceData: { name: string; revenue: number; partners: number }[];
  orderDistributionData: { name: string; value: number }[];
  recentAdminActions: { id: string; admin: string; action: string; entity: string; timestamp: string }[];
}

export default function AdminDashboard() {
  const auth = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue30Days: 0,
    revenueChangePercent: 0,
    completedOrdersCount: 0,
    activeDriversCount: 0,
    orderCompletionRate: 0,
    activePartnersCount: 0,
    pendingPartnersCount: 0,
    regionalManagersCount: 0,
    pendingPaymentsAmount: 0,
    platformRating: 0,
    monthlyRevenueData: [],
    managerPerformanceData: [],
    orderDistributionData: [],
    recentAdminActions: [],
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

      // Get assigned partners for Regional Manager
      let assignedPartnerIds: string[] = [];
      if (!auth.isSuperAdmin && auth.user) {
        const { data: assignments } = await (supabase
          .from("admin_assignments") as any)
          .select("partner_id")
          .eq("admin_id", auth.user.id)
          .eq("status", "active");

        assignedPartnerIds = ((assignments as any[]) || []).map(a => a.partner_id);
      }

      // Revenue for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let revenueQuery = (supabase
        .from("orders") as any)
        .select("total, created_at")
        .eq("status", "delivered")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Filter by assigned partners if Regional Manager
      if (!auth.isSuperAdmin && assignedPartnerIds.length > 0) {
        revenueQuery = revenueQuery.in("partner_id", assignedPartnerIds);
      }

      const { data: last30DaysOrders } = await revenueQuery;

      const totalRevenue30 = ((last30DaysOrders as any[]) || []).reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      // Revenue for 30 days before that
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      let prevRevenueQuery = (supabase
        .from("orders") as any)
        .select("total")
        .eq("status", "delivered")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      if (!auth.isSuperAdmin && assignedPartnerIds.length > 0) {
        prevRevenueQuery = prevRevenueQuery.in("partner_id", assignedPartnerIds);
      }

      const { data: prev30DaysOrders } = await prevRevenueQuery;

      const prevRevenue30 = ((prev30DaysOrders as any[]) || []).reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      const revenueChange = prevRevenue30 > 0
        ? ((totalRevenue30 - prevRevenue30) / prevRevenue30) * 100
        : 0;

      // Completed orders count
      let completedQuery = supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered");

      if (!auth.isSuperAdmin && assignedPartnerIds.length > 0) {
        completedQuery = completedQuery.in("partner_id", assignedPartnerIds);
      }

      const { count: completedCount } = await completedQuery;

      // Total orders count
      let totalOrdersQuery = supabase
        .from("orders")
        .select("id", { count: "exact", head: true });

      if (!auth.isSuperAdmin && assignedPartnerIds.length > 0) {
        totalOrdersQuery = totalOrdersQuery.in("partner_id", assignedPartnerIds);
      }

      const { count: totalOrdersCount } = await totalOrdersQuery;

      const completionRate = totalOrdersCount && totalOrdersCount > 0
        ? ((completedCount || 0) / totalOrdersCount) * 100
        : 0;

      // Active drivers count (only for Super Admin)
      let activeDrivers = 0;
      if (auth.isSuperAdmin) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "driver")
          .eq("is_active", true);
        activeDrivers = count || 0;
      }

      // Active and pending partners (only for Super Admin)
      let activePartners = 0;
      let pendingPartners = 0;
      if (auth.isSuperAdmin) {
        const { count: ap } = await supabase
          .from("partners")
          .select("id", { count: "exact", head: true })
          .eq("is_open", true);

        const { count: pp } = await supabase
          .from("partners")
          .select("id", { count: "exact", head: true })
          .eq("is_open", false);

        activePartners = ap || 0;
        pendingPartners = pp || 0;
      } else {
        // For Regional Manager, count only assigned partners
        if (assignedPartnerIds.length > 0) {
          const { data: assignedPartnersData } = await (supabase
            .from("partners") as any)
            .select("id, is_open")
            .in("id", assignedPartnerIds);

          activePartners = ((assignedPartnersData as any[]) || []).filter(p => p.is_open).length;
          pendingPartners = ((assignedPartnersData as any[]) || []).filter(p => !p.is_open).length;
        }
      }

      // Regional managers count
      const { count: managers } = await supabase
        .from("admin_invitations")
        .select("id", { count: "exact", head: true })
        .eq("admin_type", "regional_manager")
        .eq("status", "accepted");

      // Pending payments
      const { data: pendingPaymentsData } = await (supabase
        .from("admin_commissions") as any)
        .select("earned_amount")
        .is("settled_date", null);

      const pendingPayments = ((pendingPaymentsData as any[]) || []).reduce(
        (sum, payment) => sum + (payment.earned_amount || 0),
        0
      );

      // Platform rating (average of partner ratings)
      const { data: ratingsData } = await (supabase
        .from("partners") as any)
        .select("rating");

      const avgRating = ((ratingsData as any[]) || []).length > 0
        ? (ratingsData as any[]).reduce((sum: number, p: any) => sum + (p.rating || 0), 0) / (ratingsData as any[]).length
        : 0;

      // Monthly revenue data (last 6 months)
      const monthlyData: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        let monthQuery = (supabase
          .from("orders") as any)
          .select("total")
          .eq("status", "delivered")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        if (!auth.isSuperAdmin && assignedPartnerIds.length > 0) {
          monthQuery = monthQuery.in("partner_id", assignedPartnerIds);
        }

        const { data: monthOrders } = await monthQuery;

        const monthRevenue = ((monthOrders as any[]) || []).reduce(
          (sum, order) => sum + (order.total || 0),
          0
        );

        monthlyData.push({
          month: monthStart.toLocaleDateString("ar-EG", { month: "short", year: "2-digit" }),
          revenue: Math.round(monthRevenue),
        });
      }

      // Order distribution
      let orderStatsQuery = (supabase
        .from("orders") as any)
        .select("status");

      if (!auth.isSuperAdmin && assignedPartnerIds.length > 0) {
        orderStatsQuery = orderStatsQuery.in("partner_id", assignedPartnerIds);
      }

      const { data: orderStats } = await orderStatsQuery;

      const statusCounts = {
        pending: 0,
        completed: 0,
        cancelled: 0,
      };

      ((orderStats as any[]) || []).forEach((order: any) => {
        if (order.status === "pending") statusCounts.pending++;
        else if (order.status === "delivered") statusCounts.completed++;
        else if (order.status === "cancelled") statusCounts.cancelled++;
      });

      const orderDistribution = [
        { name: "قيد الانتظار", value: statusCounts.pending },
        { name: "مكتملة", value: statusCounts.completed },
        { name: "ملغاة", value: statusCounts.cancelled },
      ].filter(item => item.value > 0);

      // Recent admin actions (only for Super Admin)
      let actionsWithNames: any[] = [];
      if (auth.isSuperAdmin) {
        const { data: adminActions } = await (supabase
          .from("admin_logs") as any)
          .select("id, admin_id, action, entity_type, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        actionsWithNames = await Promise.all(((adminActions as any[]) || []).map(async (action: any) => {
          const { data: admin } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", action.admin_id)
            .single();

          return {
            id: action.id,
            admin: (admin as any)?.full_name || "غير معروف",
            action: action.action,
            entity: action.entity_type,
            timestamp: new Date(action.created_at).toLocaleDateString("ar-EG"),
          };
        }));
      }

      setStats({
        totalRevenue30Days: totalRevenue30,
        revenueChangePercent: revenueChange,
        completedOrdersCount: completedCount || 0,
        activeDriversCount: activeDrivers || 0,
        orderCompletionRate: completionRate,
        activePartnersCount: activePartners || 0,
        pendingPartnersCount: pendingPartners || 0,
        regionalManagersCount: managers || 0,
        pendingPaymentsAmount: pendingPayments,
        platformRating: parseFloat(avgRating.toFixed(1)),
        monthlyRevenueData: monthlyData,
        managerPerformanceData: [], // TODO: Load from admin_assignments
        orderDistributionData: orderDistribution,
        recentAdminActions: actionsWithNames,
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

  const ChartSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: "0 1px 3px rgba(139, 92, 246, 0.1)",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 20px 0" }}>
          {title}
        </h3>
        {children}
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
              🎯 لوحة التحكم - {auth.isSuperAdmin ? "السوبر أدمن" : "المدير الإقليمي"}
            </h1>
            <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
              مرحباً {auth.user?.email}
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

      {/* Main Stats Grid - 6 Cards for Super Admin, 5 for Regional Manager */}
      {auth.isSuperAdmin && (
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
            <StatCard
              label="إجمالي الإيرادات (30 يوم)"
              value={`${stats.totalRevenue30Days.toFixed(0)} ج.م`}
              icon="💰"
              color="primary"
              trend={{ value: Math.round(Math.abs(stats.revenueChangePercent)), isPositive: stats.revenueChangePercent >= 0 }}
            />
            <StatCard
              label="الطلبات المكتملة"
              value={stats.completedOrdersCount}
              icon="✅"
              color="success"
            />
            <StatCard
              label="الشركاء النشطين"
              value={stats.activePartnersCount}
              icon="🏪"
              color="primary"
            />
            <StatCard
              label="المديرين الإقليميين"
              value={`${stats.regionalManagersCount}/33`}
              icon="👨‍💼"
              color="warning"
            />
            <StatCard
              label="دفعات معلقة"
              value={`${stats.pendingPaymentsAmount.toFixed(0)} ج.م`}
              icon="⏳"
              color="danger"
            />
            <StatCard
              label="متوسط التقييم"
              value={`${stats.platformRating.toFixed(1)} ⭐`}
              icon="⭐"
              color="success"
            />
          </div>
        </div>
      )}

      {/* Regional Manager Stats Grid - 5 Cards */}
      {!auth.isSuperAdmin && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: 1 }}>
            📊 إحصائيات الشركاء المسندة
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard
              label="إجمالي الإيرادات (30 يوم)"
              value={`${stats.totalRevenue30Days.toFixed(0)} ج.م`}
              icon="💰"
              color="primary"
              trend={{ value: Math.round(Math.abs(stats.revenueChangePercent)), isPositive: stats.revenueChangePercent >= 0 }}
            />
            <StatCard
              label="عدد الشركاء المسندة"
              value={stats.activePartnersCount}
              icon="🏪"
              color="primary"
            />
            <StatCard
              label="إجمالي الطلبات"
              value={stats.completedOrdersCount}
              icon="📦"
              color="success"
            />
            <StatCard
              label="دفعات معلقة"
              value={`${stats.pendingPaymentsAmount.toFixed(0)} ج.م`}
              icon="⏳"
              color="danger"
            />
            <StatCard
              label="متوسط التقييم"
              value={`${stats.platformRating.toFixed(1)} ⭐`}
              icon="⭐"
              color="success"
            />
          </div>
        </div>
      )}

      {/* Charts Section */}
      {auth.isSuperAdmin && (
        <>
          <ChartSection title="📈 اتجاه الإيرادات (6 أشهر)">
            <div style={{
              padding: 32,
              backgroundColor: C.surfaceLight,
              borderRadius: 12,
              textAlign: "center",
              color: C.textMuted,
              minHeight: 300
            }}>
              <p style={{ margin: 0 }}>📊 الرسم البياني سيتم تحميله على العميل</p>
              <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>البيانات: {stats.monthlyRevenueData.length} شهور</p>
            </div>
          </ChartSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 24 }}>
            <ChartSection title="📊 توزيع حالات الطلبات">
              <div style={{
                padding: 32,
                backgroundColor: C.surfaceLight,
                borderRadius: 12,
                textAlign: "center",
                color: C.textMuted,
                minHeight: 250
              }}>
                <p style={{ margin: 0 }}>📊 البيانات متاحة</p>
                <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>عدد الحالات: {stats.orderDistributionData.length}</p>
              </div>
            </ChartSection>

            <ChartSection title="👥 معدل إتمام الطلبات">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: C.textMuted, fontSize: 14 }}>نسبة الإتمام</span>
                    <span style={{ fontWeight: 700, color: C.primary }}>{stats.orderCompletionRate.toFixed(1)}%</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: C.success,
                        width: `${Math.min(stats.orderCompletionRate, 100)}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>المندوبين النشطين</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{stats.activeDriversCount}</p>
                  </div>
                  <div>
                    <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>الشركاء المعلقين</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{stats.pendingPartnersCount}</p>
                  </div>
                </div>
              </div>
            </ChartSection>
          </div>
        </>
      )}

      {/* Regional Manager Charts Section */}
      {!auth.isSuperAdmin && (
        <>
          <ChartSection title="📈 اتجاه الإيرادات (6 أشهر)">
            <div style={{
              padding: 32,
              backgroundColor: C.surfaceLight,
              borderRadius: 12,
              textAlign: "center",
              color: C.textMuted,
              minHeight: 300
            }}>
              <p style={{ margin: 0 }}>📊 الرسم البياني سيتم تحميله على العميل</p>
              <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>البيانات: {stats.monthlyRevenueData.length} شهور</p>
            </div>
          </ChartSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 24 }}>
            <ChartSection title="📊 توزيع الإيرادات حسب الشريك">
              <div style={{
                padding: 32,
                backgroundColor: C.surfaceLight,
                borderRadius: 12,
                textAlign: "center",
                color: C.textMuted,
                minHeight: 250
              }}>
                <p style={{ margin: 0 }}>📊 البيانات متاحة</p>
                <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>عدد البيانات: {stats.orderDistributionData.length}</p>
              </div>
            </ChartSection>

            <ChartSection title="📋 حالات الطلبات">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: C.textMuted, fontSize: 14 }}>معدل الإتمام</span>
                    <span style={{ fontWeight: 700, color: C.primary }}>{stats.orderCompletionRate.toFixed(1)}%</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: C.success,
                        width: `${Math.min(stats.orderCompletionRate, 100)}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>الشركاء النشطة</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{stats.activePartnersCount}</p>
                  </div>
                  <div>
                    <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>الشركاء المعلقة</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{stats.pendingPartnersCount}</p>
                  </div>
                </div>
              </div>
            </ChartSection>
          </div>
        </>
      )}

      {/* Activity Section */}
      {auth.isSuperAdmin && stats.recentAdminActions.length > 0 && (
        <ChartSection title="📋 آخر الإجراءات الإدارية">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>المدير</th>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الإجراء</th>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>نوع</th>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAdminActions.map((action) => (
                  <tr key={action.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 12, color: C.text, fontSize: 13 }}>{action.admin}</td>
                    <td style={{ padding: 12, color: C.text, fontSize: 13 }}>{action.action}</td>
                    <td style={{ padding: 12, color: C.textMuted, fontSize: 13 }}>{action.entity}</td>
                    <td style={{ padding: 12, color: C.textMuted, fontSize: 13 }}>{action.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartSection>
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
