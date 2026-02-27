"use client";
import React, { useState, useEffect } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
};

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  profiles?: { full_name: string };
}

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  averageRating: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "بانتظار القبول", color: C.warning,  bg: "#FEF3C7" },
  accepted:  { label: "مقبول",          color: C.primary,  bg: C.primarySoft },
  preparing: { label: "قيد التجهيز",    color: C.primary,  bg: C.primarySoft },
  out_for_delivery: { label: "في الطريق", color: "#059669", bg: "#D1FAE5" },
  delivered: { label: "مُسلَّم",         color: "#059669",  bg: "#D1FAE5" },
  cancelled: { label: "ملغي",           color: C.danger,   bg: "#FEE2E2" },
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    averageRating: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Get today's orders
      const { data: todayOrdersData, error: ordersError } = await (supabase
        .from("orders") as any)
        .select("id, total, status, created_at, profiles(full_name)")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (ordersError) throw ordersError;

      const todayOrders = todayOrdersData || [];
      const todayRevenue = todayOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const pendingOrders = todayOrders.filter(o => o.status === 'pending').length;

      // Get partner rating
      const { data: partnerData, error: partnerError } = await (supabase
        .from("partners") as any)
        .select("average_rating")
        .single();

      if (partnerError) console.log("Partner rating not available");

      setStats({
        todayOrders: todayOrders.length,
        todayRevenue,
        pendingOrders,
        averageRating: partnerData?.average_rating || 0,
      });

      // Get recent orders (last 5)
      const { data: recentData, error: recentError } = await (supabase
        .from("orders") as any)
        .select("id, total, status, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setRecentOrders(recentData || []);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const STAT_CARDS = [
    { label: "طلبات اليوم", value: stats.todayOrders.toString(), icon: "📦", color: C.primary, bg: C.primarySoft },
    { label: "إيراد اليوم", value: `${stats.todayRevenue.toFixed(0)} ر.س`, icon: "💰", color: "#059669", bg: "#D1FAE5" },
    { label: "بانتظار القبول", value: stats.pendingOrders.toString(), icon: "⏳", color: C.warning, bg: "#FEF3C7" },
    { label: "التقييم", value: `${stats.averageRating.toFixed(1)} ⭐`, icon: "⭐", color: C.pink, bg: C.pinkSoft },
  ];

  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>
          مرحباً! 👋
        </h1>
        <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — نظرة عامة على أداء متجرك اليوم
        </p>
      </div>

      {error && (
        <div style={{
          background: "#FEE2E2", color: C.danger, padding: 16, borderRadius: 12, marginBottom: 20,
          fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{
            background: C.surface, borderRadius: 18, padding: 20,
            border: `1px solid ${C.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: s.bg, fontSize: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
            }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* RECENT ORDERS */}
      <div style={{
        background: C.surface, borderRadius: 20, padding: 24,
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.text }}>آخر الطلبات</h2>
          <a href="/dashboard/orders" style={{
            padding: "6px 14px", borderRadius: 20,
            background: C.primarySoft, color: C.primary,
            fontWeight: 700, fontSize: 12,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            عرض الكل →
          </a>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", border: "3px solid " + C.border,
              borderTopColor: C.primary, margin: "0 auto 12px",
              animation: "spin 1s linear infinite",
            }} />
            جاري التحميل...
          </div>
        ) : recentOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
            لا توجد طلبات في هذا اليوم
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentOrders.map((order) => {
              const timeAgo = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 1000 / 60);
              const timeLabel = timeAgo < 1 ? "الآن" : timeAgo < 60 ? `منذ ${timeAgo} د` : `منذ ${Math.floor(timeAgo / 60)} س`;
              const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: C.text, bg: C.bg };

              return (
                <div key={order.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: 16, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>
                      #{order.id.substring(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted }}>
                      {order.profiles?.full_name || "عميل مجهول"}
                    </div>
                  </div>

                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text }}>
                      {order.total.toFixed(0)} ر.س
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {timeLabel}
                    </div>
                  </div>

                  <div style={{
                    padding: "6px 12px", borderRadius: 20,
                    background: statusInfo.bg, color: statusInfo.color,
                    fontWeight: 700, fontSize: 12,
                  }}>
                    {statusInfo.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
