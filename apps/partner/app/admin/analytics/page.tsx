"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

interface AnalyticsData {
  monthlyRevenueData: { month: string; revenue: number }[];
  orderDistributionData: { name: string; value: number }[];
  managerPerformanceData: { name: string; revenue: number; orders: number }[];
  userGrowthData: { month: string; customers: number; partners: number; drivers: number }[];
  topPartnersData: { name: string; revenue: number; orders: number }[];
}

export default function AnalyticsPage() {
  const auth = useAdminAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    monthlyRevenueData: [],
    orderDistributionData: [],
    managerPerformanceData: [],
    userGrowthData: [],
    topPartnersData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user || !auth.isSuperAdmin) return;
    loadAnalytics();
  }, [auth.user]);

  const loadAnalytics = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Monthly revenue data (last 6 months)
      const monthlyData: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data: monthOrders } = await (supabase
          .from("orders") as any)
          .select("total")
          .eq("status", "delivered")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

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
      const { data: orderStats } = await (supabase
        .from("orders") as any)
        .select("status");

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

      // User growth (last 6 months)
      const userGrowthData: { month: string; customers: number; partners: number; drivers: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { count: customersCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "customer")
          .lte("created_at", monthEnd.toISOString());

        const { count: partnersCount } = await supabase
          .from("partners")
          .select("id", { count: "exact", head: true })
          .lte("created_at", monthEnd.toISOString());

        const { count: driversCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "driver")
          .lte("created_at", monthEnd.toISOString());

        userGrowthData.push({
          month: monthStart.toLocaleDateString("ar-EG", { month: "short", year: "2-digit" }),
          customers: customersCount || 0,
          partners: partnersCount || 0,
          drivers: driversCount || 0,
        });
      }

      // Top partners by revenue
      const { data: partnerOrders } = await (supabase
        .from("orders") as any)
        .select("partner_id, total")
        .eq("status", "delivered");

      const partnerRevenueMap = new Map<string, { revenue: number; orders: number }>();
      ((partnerOrders as any[]) || []).forEach((order: any) => {
        const current = partnerRevenueMap.get(order.partner_id) || { revenue: 0, orders: 0 };
        partnerRevenueMap.set(order.partner_id, {
          revenue: current.revenue + (order.total || 0),
          orders: current.orders + 1,
        });
      });

      const topPartnersData: { name: string; revenue: number; orders: number }[] = [];
      const sortedPartners = Array.from(partnerRevenueMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

      for (const [partnerId, data] of sortedPartners) {
        const { data: partner } = await supabase
          .from("partners")
          .select("name")
          .eq("id", partnerId)
          .single();

        topPartnersData.push({
          name: (partner as any)?.name || "غير معروف",
          revenue: Math.round(data.revenue),
          orders: data.orders,
        });
      }

      setAnalytics({
        monthlyRevenueData: monthlyData,
        orderDistributionData: orderDistribution,
        managerPerformanceData: [],
        userGrowthData: userGrowthData,
        topPartnersData: topPartnersData,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
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
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 20px 0" }}>
          {title}
        </h2>
        {children}
      </div>
    );
  };

  const PIE_COLORS = [C.primary, C.success, C.warning, "#F97316", "#06B6D4"];

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

  if (!auth.isSuperAdmin) {
    return (
      <div dir="rtl" style={{ padding: "24px" }}>
        <div
          style={{
            padding: 24,
            borderRadius: 16,
            background: C.dangerLight,
            border: `2px solid ${C.danger}`,
            textAlign: "center",
          }}
        >
          <h2 style={{ color: C.danger, margin: "0 0 8px 0" }}>🔒 الوصول مرفوض</h2>
          <p style={{ color: C.textMuted }}>هذه الصفحة متاحة فقط للسوبر أدمن</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
          📊 التحليلات والإحصائيات
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          تقارير وبيانات شاملة عن أداء المنصة
        </p>
      </div>

      {/* Monthly Revenue Chart */}
      <ChartSection title="📈 اتجاه الإيرادات الشهرية (آخر 6 أشهر)">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={analytics.monthlyRevenueData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" stroke={C.textMuted} />
            <YAxis stroke={C.textMuted} />
            <Tooltip
              contentStyle={{ background: C.surface, border: `1px solid ${C.border}` }}
              formatter={(value) => `${value} ج.م`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={C.primary}
              strokeWidth={3}
              dot={{ fill: C.primary, r: 5 }}
              activeDot={{ r: 7 }}
              name="الإيرادات"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Order Distribution & Growth Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Order Distribution */}
        <ChartSection title="📊 توزيع حالات الطلبات">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={analytics.orderDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.orderDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* User Growth Stats */}
        <ChartSection title="👥 نمو المستخدمين">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.userGrowthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" stroke={C.textMuted} />
              <YAxis stroke={C.textMuted} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}` }} />
              <Legend />
              <Bar dataKey="customers" fill={C.primary} name="عملاء" />
              <Bar dataKey="partners" fill={C.success} name="شركاء" />
              <Bar dataKey="drivers" fill={C.warning} name="مندوبون" />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      </div>

      {/* Top Partners Table */}
      {analytics.topPartnersData.length > 0 && (
        <ChartSection title="🏆 أفضل 10 شركاء بالإيرادات">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الترتيب</th>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>اسم الشريك</th>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الإيرادات</th>
                  <th style={{ padding: 12, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>عدد الطلبات</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topPartnersData.map((partner, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 12, color: C.text, fontSize: 13 }}>#{index + 1}</td>
                    <td style={{ padding: 12, color: C.text, fontSize: 13 }}>{partner.name}</td>
                    <td style={{ padding: 12, color: C.success, fontSize: 13, fontWeight: 600 }}>{partner.revenue.toLocaleString()} ج.م</td>
                    <td style={{ padding: 12, color: C.textMuted, fontSize: 13 }}>{partner.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartSection>
      )}

      {/* Export Button */}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            background: C.primary,
            color: "white",
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.primaryDark;
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.primary;
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          📥 طباعة التقرير
        </button>
      </div>
    </div>
  );
}
