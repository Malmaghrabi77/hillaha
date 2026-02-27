"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
};

interface AnalyticsData {
  hourlyOrders: Array<{ hour: string; orders: number }>;
  topItems: Array<{ name: string; count: number }>;
  paymentMethods: Array<{ name: string; value: number }>;
  weeklyTrend: Array<{ day: string; sales: number; orders: number }>;
  deliveryMetrics: {
    avgDeliveryTime: number;
    completionRate: number;
    onTimeRate: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        setLoading(false);
        return;
      }

      // Placeholder data structure - will be replaced with real queries
      setData({
        hourlyOrders: [
          { hour: "08:00", orders: 5 },
          { hour: "09:00", orders: 8 },
          { hour: "10:00", orders: 12 },
          { hour: "11:00", orders: 15 },
          { hour: "12:00", orders: 24 },
          { hour: "13:00", orders: 18 },
          { hour: "14:00", orders: 10 },
          { hour: "15:00", orders: 9 },
          { hour: "16:00", orders: 8 },
          { hour: "17:00", orders: 14 },
          { hour: "18:00", orders: 22 },
          { hour: "19:00", orders: 28 },
          { hour: "20:00", orders: 25 },
          { hour: "21:00", orders: 18 },
        ],
        topItems: [
          { name: "برجر كلاسيك", count: 156 },
          { name: "بيتزا لحمة", count: 143 },
          { name: "باستا بولونيز", count: 98 },
          { name: "تشيكن برجر", count: 87 },
          { name: "برجر دبل", count: 72 },
        ],
        paymentMethods: [
          { name: "تحويل بنكي", value: 45 },
          { name: "الدفع عند الاستقبال", value: 35 },
          { name: "محفظة رقمية", value: 20 },
        ],
        weeklyTrend: [
          { day: "السبت", sales: 2800, orders: 34 },
          { day: "الأحد", sales: 3200, orders: 42 },
          { day: "الاثنين", sales: 2400, orders: 31 },
          { day: "الثلاثاء", sales: 3600, orders: 48 },
          { day: "الأربعاء", sales: 4200, orders: 58 },
          { day: "الخميس", sales: 3800, orders: 52 },
          { day: "الجمعة", sales: 4600, orders: 64 },
        ],
        deliveryMetrics: {
          avgDeliveryTime: 32, // minutes
          completionRate: 98.5, // percentage
          onTimeRate: 94.2, // percentage
        },
      });
      setError(null);
    } catch (err: any) {
      console.error("Analytics error:", err);
      setError(err.message || "فشل تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", border: "3px solid " + C.border,
          borderTopColor: C.primary, margin: "0 auto 12px",
          animation: "spin 1s linear infinite",
        }} />
        جاري تحميل الإحصائيات...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        background: "#FEE2E2", color: C.danger, padding: 16, borderRadius: 12,
        fontSize: 14,
      }}>
        ⚠️ {error || "فشل تحميل البيانات"}
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>
              التحليلات و الإحصائيات
            </h1>
            <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
              نظرة عمقية على أداء متجرك
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["week", "month", "year"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "8px 16px", borderRadius: 20,
                  border: period === p ? "none" : `1px solid ${C.border}`,
                  background: period === p ? C.primary : C.surface,
                  color: period === p ? "white" : C.textMuted,
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                  boxShadow: period === p ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
                }}
              >
                {p === "week" ? "أسبوع" : p === "month" ? "شهر" : "سنة"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        <div style={{
          background: C.surface, borderRadius: 18, padding: 20,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>متوسط وقت التسليم</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.primary, marginBottom: 4 }}>
            {data.deliveryMetrics.avgDeliveryTime} دقيقة
          </div>
          <div style={{ fontSize: 12, color: C.success }}>↓ تحسن 2.3%</div>
        </div>

        <div style={{
          background: C.surface, borderRadius: 18, padding: 20,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>معدل الإنجاز</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.success, marginBottom: 4 }}>
            {data.deliveryMetrics.completionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 12, color: C.success }}>✓ ممتاز</div>
        </div>

        <div style={{
          background: C.surface, borderRadius: 18, padding: 20,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>معدل التسليم في الميعاد</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.primary, marginBottom: 4 }}>
            {data.deliveryMetrics.onTimeRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 12, color: C.success }}>↑ تحسن 1.8%</div>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 28 }}>
        {/* Hourly Orders Chart */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 900, color: C.text }}>
            الطلبات بالساعة
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hourlyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="hour" stroke={C.textMuted} fontSize={12} />
              <YAxis stroke={C.textMuted} fontSize={12} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}` }} />
              <Bar dataKey="orders" fill={C.primary} radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend Chart */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 900, color: C.text }}>
            الاتجاه الأسبوعي
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" stroke={C.textMuted} fontSize={12} />
              <YAxis stroke={C.textMuted} fontSize={12} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}` }} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke={C.primary} strokeWidth={2} name="المبيعات" />
              <Line type="monotone" dataKey="orders" stroke={C.success} strokeWidth={2} name="الطلبات" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {/* Top Items */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 900, color: C.text }}>
            الأصناف الأكثر شهرة
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.topItems.map((item, i) => {
              const maxCount = Math.max(...data.topItems.map(x => x.count));
              const percentage = (item.count / maxCount) * 100;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.name}</span>
                    <span style={{ fontSize: 13, color: C.textMuted }}>{item.count} طلب</span>
                  </div>
                  <div style={{
                    width: "100%", height: 8, borderRadius: 4, background: C.border, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${percentage}%`, height: "100%", background: C.primary,
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 900, color: C.text }}>
            طرق الدفع
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} (${value}%)`}
                outerRadius={80}
                fill={C.primary}
                dataKey="value"
              >
                <Cell fill={C.primary} />
                <Cell fill={C.success} />
                <Cell fill={C.warning} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
