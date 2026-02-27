"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

interface MonthlyStats {
  month: string;
  monthKey: string;
  sales: number;
  commission: number;
  net: number;
  orders: number;
}

interface SettlementRecord {
  id: string;
  date: string;
  type: string;
  amount: number;
  status: "completed" | "pending";
}

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function getLast6Months(): { month: string; monthKey: string; date: Date }[] {
  const months: { month: string; monthKey: string; date: Date }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: MONTHS_AR[date.getMonth()],
      monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`,
      date,
    });
  }

  return months;
}

function generateMockSettlements(): SettlementRecord[] {
  const settlements: SettlementRecord[] = [
    {
      id: "TRX-088",
      date: "21 فبراير",
      type: "تسوية أسبوعية",
      amount: 3200,
      status: "completed",
    },
    {
      id: "TRX-087",
      date: "14 فبراير",
      type: "تسوية أسبوعية",
      amount: 2980,
      status: "completed",
    },
    {
      id: "TRX-086",
      date: "7 فبراير",
      type: "تسوية أسبوعية",
      amount: 3150,
      status: "completed",
    },
    {
      id: "TRX-085",
      date: "31 يناير",
      type: "تسوية شهرية",
      amount: 9860,
      status: "completed",
    },
    {
      id: "TRX-084",
      date: "28 يناير",
      type: "تسوية أسبوعية",
      amount: 2450,
      status: "completed",
    },
    {
      id: "TRX-NEXT",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(
        "ar-EG"
      ),
      type: "التسوية القادمة",
      amount: 2190,
      status: "pending",
    },
  ];
  return settlements;
}

export default function FinancePage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال بقاعدة البيانات");
        setLoading(false);
        return;
      }

      const months = getLast6Months();
      const stats: MonthlyStats[] = [];

      for (const { month, monthKey, date } of months) {
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59
        );

        const { data: orders, error: ordersError } = await (supabase
          .from("orders") as any)
          .select("total, commission")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .eq("status", "delivered");

        if (ordersError) {
          console.error("Error fetching orders:", ordersError);
          continue;
        }

        const ordersData = orders || [];
        const sales = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
        const commission = ordersData.reduce(
          (sum, order) => sum + (order.commission || 0),
          0
        );
        const net = sales - commission;

        stats.push({
          month,
          monthKey,
          sales: Math.round(sales),
          commission: Math.round(commission),
          net: Math.round(net),
          orders: ordersData.length,
        });
      }

      setMonthlyStats(stats);
      setSettlements(generateMockSettlements());
      setError(null);
    } catch (err: any) {
      console.error("Finance page error:", err);
      setError(
        err.message || "فشل في تحميل البيانات المالية. يرجى المحاولة لاحقاً"
      );
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = monthlyStats[monthlyStats.length - 1];
  const totalSales = monthlyStats.reduce((sum, m) => sum + m.sales, 0);
  const totalCommission = monthlyStats.reduce((sum, m) => sum + m.commission, 0);
  const totalNet = monthlyStats.reduce((sum, m) => sum + m.net, 0);
  const totalOrders = monthlyStats.reduce((sum, m) => sum + m.orders, 0);

  const chartData = monthlyStats.map((stat) => ({
    name: stat.month,
    "المبيعات": stat.sales,
    "الصافي": stat.net,
  }));

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          color: C.textMuted,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `3px solid ${C.border}`,
            borderTopColor: C.primary,
            marginBottom: 12,
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ fontSize: 14 }}>جاري تحميل البيانات المالية...</div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: C.danger,
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            border: `1px solid ${C.danger}20`,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>
          المالية والعمولات
        </h1>
        <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
          تتبع إيراداتك وعمولات المنصة وصافي أرباحك خلال آخر 6 أشهر
        </p>
      </div>

      {/* TOP STATS CARDS */}
      {currentMonth && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "إجمالي المبيعات (6 أشهر)",
              value: `${totalSales.toLocaleString("ar-EG")} ج.س`,
              icon: "💰",
              color: C.success,
              bg: "#D1FAE5",
            },
            {
              label: "إجمالي العمولات",
              value: `${totalCommission.toLocaleString("ar-EG")} ج.س`,
              icon: "📊",
              color: C.danger,
              bg: "#FEE2E2",
            },
            {
              label: "صافي الأرباح",
              value: `${totalNet.toLocaleString("ar-EG")} ج.س`,
              icon: "✅",
              color: C.primary,
              bg: C.primarySoft,
            },
            {
              label: "إجمالي الطلبات",
              value: `${totalOrders}`,
              icon: "📦",
              color: C.warning,
              bg: "#FEF3C7",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                borderRadius: 18,
                padding: 20,
                border: `1px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: s.bg,
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                {s.icon}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHART AND BREAKDOWN */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* RECHARTS BAR CHART */}
        <div
          style={{
            background: C.surface,
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${C.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.text }}>
              المبيعات الشهرية (آخر 6 أشهر)
            </h2>
          </div>

          {monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={C.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke={C.textMuted}
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  stroke={C.textMuted}
                  style={{ fontSize: 12 }}
                  label={{ value: "ج.س", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                  formatter={(value: any) =>
                    `${Number(value).toLocaleString("ar-EG")} ج.س`
                  }
                  labelFormatter={(label) => `${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      المبيعات: "المبيعات",
                      الصافي: "الصافي",
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar
                  dataKey="المبيعات"
                  fill={C.primary}
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                />
                <Bar
                  dataKey="الصافي"
                  fill={C.success}
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: C.textMuted,
                fontSize: 14,
              }}
            >
              لا توجد بيانات للعرض
            </div>
          )}
        </div>

        {/* COMMISSION BREAKDOWN */}
        <div
          style={{
            background: C.surface,
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${C.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 900, color: C.text }}>
            تفصيل العمولات
          </h2>

          <div
            style={{
              background: C.primarySoft,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: C.primary,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              نسبة عمولة المنصة
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: C.primary,
              }}
            >
              8% - 10%
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>
              مرن حسب عدد الطلبات. شامل: الخدمة واللوجستية والدعم
            </div>
          </div>

          {currentMonth && (
            <div>
              {[
                {
                  label: "مبيعات هذا الشهر",
                  value: `${currentMonth.sales.toLocaleString("ar-EG")} ج.س`,
                  color: C.text,
                },
                {
                  label: "عمولة المنصة",
                  value: `- ${currentMonth.commission.toLocaleString("ar-EG")} ج.س`,
                  color: C.danger,
                },
                {
                  label: "صافي الأرباح",
                  value: `${currentMonth.net.toLocaleString("ar-EG")} ج.س`,
                  color: C.success,
                },
              ].map((row, i, arr) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom:
                      i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                    borderTop:
                      i === arr.length - 1 ? `2px solid ${C.border}` : "none",
                  }}
                >
                  <span style={{ fontSize: 13, color: C.textMuted }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SETTLEMENTS TABLE */}
      <div
        style={{
          background: C.surface,
          borderRadius: 20,
          padding: 24,
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.text }}>
              سجل التسويات
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: C.textMuted,
              }}
            >
              التحويلات الأسبوعية والشهرية لحسابك البنكي
            </p>
          </div>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: "transparent",
              cursor: "pointer",
              fontSize: 12,
              color: C.primary,
              fontWeight: 700,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.primarySoft;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ⬇ تحميل PDF
          </button>
        </div>

        {settlements.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {[
                    "رقم التحويل",
                    "التاريخ",
                    "نوع التسوية",
                    "المبلغ",
                    "الحالة",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.textMuted,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td
                      style={{
                        padding: "14px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.primary,
                      }}
                    >
                      {s.id}
                    </td>
                    <td
                      style={{
                        padding: "14px 12px",
                        fontSize: 13,
                        color: C.textMuted,
                      }}
                    >
                      {s.date}
                    </td>
                    <td
                      style={{
                        padding: "14px 12px",
                        fontSize: 13,
                        color: C.text,
                      }}
                    >
                      {s.type}
                    </td>
                    <td
                      style={{
                        padding: "14px 12px",
                        fontSize: 13,
                        fontWeight: 900,
                        color: C.success,
                      }}
                    >
                      {s.amount.toLocaleString("ar-EG")} ج.س
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            s.status === "completed"
                              ? C.success
                              : C.warning,
                          background:
                            s.status === "completed"
                              ? "#D1FAE5"
                              : "#FEF3C7",
                        }}
                      >
                        {s.status === "completed"
                          ? "✓ تم الإيداع"
                          : "⏳ قادمة"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: C.textMuted,
              fontSize: 14,
            }}
          >
            لا توجد تسويات حتى الآن
          </div>
        )}

        {/* NEXT SETTLEMENT NOTICE */}
        {settlements.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: C.primarySoft,
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20, marginTop: 2 }}>📅</span>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: C.primary,
                  marginBottom: 4,
                }}
              >
                التسوية القادمة في {settlements[0].date}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                  lineHeight: 1.5,
                }}
              >
                المبلغ المتوقع: <strong>{settlements[0].amount.toLocaleString("ar-EG")} ج.س</strong> •
                يتم الإيداع تلقائياً في حسابك البنكي المسجل
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
