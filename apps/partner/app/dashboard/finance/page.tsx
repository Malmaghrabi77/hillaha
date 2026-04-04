"use client";
import React, { useState, useEffect } from "react";
import { getSupabase, generateFinanceReport } from "@hillaha/core";

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

interface WeeklySettlement {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  sales: number;
  netPayout: number;
  orders: number;
  status: "completed" | "pending";
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatDateAr(d: Date): string {
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]}`;
}

function getWeeksInRange(startDate: Date, endDate: Date): { start: Date; end: Date }[] {
  const weeks: { start: Date; end: Date }[] = [];
  const current = new Date(startDate);
  // Align to Saturday (start of week in Arabic calendar)
  const day = current.getDay();
  const diff = day === 6 ? 0 : -(day + 1);
  current.setDate(current.getDate() + diff);

  while (current < endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    weeks.push({ start: new Date(weekStart), end: new Date(weekEnd) });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

export default function FinancePage() {
  const [weeklyData, setWeeklyData] = useState<WeeklySettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  const [partnerEmail, setPartnerEmail] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

      const { data: { user } } = await supabase.auth.getUser();
      let pId: string | null = null;
      let isSA = false;
      if (user) {
        setPartnerEmail(user.email || "");
        const { data: userProfile } = await (supabase as any).from("profiles").select("role, partner_id").eq("id", user.id).maybeSingle();
        isSA = userProfile?.role === "super_admin";
        setIsSuperAdmin(isSA);
        pId = userProfile?.partner_id || null;

        if (!isSA && !pId) {
          setError("لا يوجد متجر مرتبط بحسابك");
          setLoading(false);
          return;
        }

        const { data: partner } = await (supabase.from("partners") as any)
          .select("business_name")
          .eq("user_id", user.id)
          .single();
        if (partner) {
          setPartnerName(partner.business_name || "متجري");
        }
      }

      // Fetch last 8 weeks of weekly settlements
      const now = new Date();
      const eightWeeksAgo = new Date(now);
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const weeks = getWeeksInRange(eightWeeksAgo, now);

      const settlements: WeeklySettlement[] = [];

      for (const week of weeks) {
        let ordersQuery = (supabase.from("orders") as any)
          .select("total, app_commission")
          .gte("created_at", week.start.toISOString())
          .lte("created_at", week.end.toISOString())
          .eq("status", "delivered");
        if (!isSA && pId) ordersQuery = ordersQuery.eq("partner_id", pId);

        const { data: orders } = await ordersQuery;

        const ordersData = orders || [];
        const sales = ordersData.reduce((s: number, o: any) => s + (o.total || 0), 0);
        const appCommission = ordersData.reduce((s: number, o: any) => s + (o.app_commission || 0), 0);
        const netPayout = sales - appCommission;
        const isPast = week.end < now;

        settlements.push({
          weekLabel: `${formatDateAr(week.start)} — ${formatDateAr(week.end)}`,
          weekStart: week.start.toISOString(),
          weekEnd: week.end.toISOString(),
          sales: Math.round(sales),
          netPayout: Math.round(netPayout),
          orders: ordersData.length,
          status: isPast ? "completed" : "pending",
        });
      }

      setWeeklyData(settlements.reverse());
      setError(null);
    } catch (err: any) {
      console.error("Finance page error:", err);
      setError(err.message || "فشل في تحميل البيانات المالية");
    } finally {
      setLoading(false);
    }
  };

  const totalPayout = weeklyData.reduce((s, w) => s + w.netPayout, 0);
  const totalSales = weeklyData.reduce((s, w) => s + w.sales, 0);
  const totalOrders = weeklyData.reduce((s, w) => s + w.orders, 0);
  const currentWeek = weeklyData[0];
  const completedWeeks = weeklyData.filter((w) => w.status === "completed");

  const handleExportPDF = () => {
    const reportData = weeklyData.map((w) => ({
      month: w.weekLabel,
      total_sales: w.sales,
      commission: w.sales - w.netPayout,
      net_profit: w.netPayout,
      order_count: w.orders,
    }));
    generateFinanceReport(reportData, {
      name: partnerName || "متجري",
      email: partnerEmail,
    });
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "400px", color: C.textMuted,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: `3px solid ${C.border}`, borderTopColor: C.primary,
          marginBottom: 12, animation: "spin 1s linear infinite",
        }} />
        <div style={{ fontSize: 14 }}>جاري تحميل البيانات المالية...</div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          background: "#FEE2E2", color: C.danger, padding: 16,
          borderRadius: 12, marginBottom: 20, fontSize: 14,
          border: `1px solid ${C.danger}20`,
        }}>
          {error}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>
              المالية والتسويات
            </h1>
            <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
              تسويات أسبوعية — المبالغ المستحقة والمحوّلة لحسابك
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            style={{
              padding: "10px 16px", borderRadius: 12, border: "none",
              background: C.primary, color: "white", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)", whiteSpace: "nowrap",
            }}
          >
            تحميل التقرير PDF
          </button>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14, marginBottom: 24,
      }}>
        {[
          {
            label: "إجمالي المستحق (8 أسابيع)",
            value: `${totalPayout.toLocaleString("ar-EG")} ج.م`,
            icon: "💰", color: C.success, bg: "#D1FAE5",
          },
          ...(isSuperAdmin ? [{
            label: "إجمالي المبيعات",
            value: `${totalSales.toLocaleString("ar-EG")} ج.م`,
            icon: "📦", color: C.primary, bg: C.primarySoft,
          }] : []),
          {
            label: "إجمالي الطلبات",
            value: `${totalOrders}`,
            icon: "🧾", color: C.warning, bg: "#FEF3C7",
          },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.surface, borderRadius: 18, padding: 20,
            border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: s.bg,
              fontSize: 22, display: "flex", alignItems: "center",
              justifyContent: "center", marginBottom: 12,
            }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CURRENT WEEK HIGHLIGHT */}
      {currentWeek && currentWeek.status === "pending" && (
        <div style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.pink})`,
          borderRadius: 20, padding: 24, marginBottom: 24, color: "white",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginBottom: 8 }}>
            التسوية الحالية — {currentWeek.weekLabel}
          </div>
          <div style={{ display: "flex", gap: 40, alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900 }}>
                {currentWeek.netPayout.toLocaleString("ar-EG")} ج.م
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>المبلغ المستحق لك هذا الأسبوع</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {currentWeek.orders}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>طلب مكتمل</div>
            </div>
            {isSuperAdmin && (
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {currentWeek.sales.toLocaleString("ar-EG")} ج.م
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>مبيعات</div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* WEEKLY SETTLEMENTS TABLE */}
      <div style={{
        background: C.surface, borderRadius: 20, padding: 24,
        border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.text }}>
              سجل التسويات الأسبوعية
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>
              يتم الإيداع تلقائياً في حسابك البنكي نهاية كل أسبوع
            </p>
          </div>
        </div>

        {weeklyData.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["الفترة", "الطلبات", ...(isSuperAdmin ? ["المبيعات"] : []), "المبلغ المستحق", "الحالة"].map((h) => (
                    <th key={h} style={{
                      padding: "12px", textAlign: "right",
                      fontSize: 11, fontWeight: 700, color: C.textMuted,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((w, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 700, color: C.primary }}>
                      {w.weekLabel}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: 13, color: C.text, fontWeight: 700 }}>
                      {w.orders}
                    </td>
                    {isSuperAdmin && (
                    <td style={{ padding: "14px 12px", fontSize: 13, color: C.textMuted }}>
                      {w.sales.toLocaleString("ar-EG")} ج.م
                    </td>
                    )}
                    <td style={{ padding: "14px 12px", fontSize: 14, fontWeight: 900, color: C.success }}>
                      {w.netPayout.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{
                        display: "inline-block", padding: "4px 10px",
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                        color: w.status === "completed" ? C.success : C.warning,
                        background: w.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                      }}>
                        {w.status === "completed" ? "تم الإيداع" : "قيد التسوية"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMuted, fontSize: 14 }}>
            لا توجد تسويات حتى الآن
          </div>
        )}

        {/* NOTICE */}
        <div style={{
          marginTop: 20, padding: 16, borderRadius: 12,
          background: C.primarySoft, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 20, marginTop: 2 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.primary, marginBottom: 4 }}>
              الفترة المحاسبية: أسبوعية
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
              يتم احتساب المبالغ المستحقة لك نهاية كل أسبوع (السبت — الجمعة) وإيداعها تلقائياً في حسابك البنكي المسجل خلال 1-2 يوم عمل.
            </div>
          </div>
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
