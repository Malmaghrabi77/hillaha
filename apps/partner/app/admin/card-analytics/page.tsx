"use client";

import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { getSupabase } from "@hillaha/core";

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

type Stats = {
  totalGenerated: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalRedeemed: number;
  totalUnused: number;
  totalValueGenerated: number;
  totalValueRedeemed: number;
  customerCodes: number;
  driverCodes: number;
  byDenomination: { amount: number; count: number; redeemed: number }[];
};

export default function CardAnalyticsPage() {
  const auth = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCodes, setRecentCodes] = useState<any[]>([]);

  useEffect(() => {
    if (auth.loading) return;
    if (auth.user && (auth.isSuperAdmin || auth.isAccountant)) fetchStats();
  }, [auth.user, auth.loading]);

  const fetchStats = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    // Fetch all codes for analytics
    const { data: allCodes, error } = await (supabase as any)
      .from("wallet_codes")
      .select("id, code, amount, target_type, is_used, approval_status, created_at, redeemed_at")
      .order("created_at", { ascending: false });

    if (error || !allCodes) {
      setLoading(false);
      return;
    }

    const totalGenerated = allCodes.length;
    const totalApproved = allCodes.filter((c: any) => c.approval_status === "approved").length;
    const totalPending = allCodes.filter((c: any) => c.approval_status === "pending").length;
    const totalRejected = allCodes.filter((c: any) => c.approval_status === "rejected").length;
    const totalRedeemed = allCodes.filter((c: any) => c.is_used).length;
    const totalUnused = allCodes.filter((c: any) => !c.is_used && c.approval_status === "approved").length;
    const totalValueGenerated = allCodes.reduce((s: number, c: any) => s + (c.amount || 0), 0);
    const totalValueRedeemed = allCodes
      .filter((c: any) => c.is_used)
      .reduce((s: number, c: any) => s + (c.amount || 0), 0);
    const customerCodes = allCodes.filter((c: any) => c.target_type === "customer").length;
    const driverCodes = allCodes.filter((c: any) => c.target_type === "driver").length;

    // Group by denomination
    const denomMap: Record<number, { count: number; redeemed: number }> = {};
    allCodes.forEach((c: any) => {
      if (!denomMap[c.amount]) denomMap[c.amount] = { count: 0, redeemed: 0 };
      denomMap[c.amount].count++;
      if (c.is_used) denomMap[c.amount].redeemed++;
    });
    const byDenomination = Object.entries(denomMap)
      .map(([amount, d]) => ({ amount: Number(amount), ...d }))
      .sort((a, b) => b.amount - a.amount);

    setStats({
      totalGenerated,
      totalApproved,
      totalPending,
      totalRejected,
      totalRedeemed,
      totalUnused,
      totalValueGenerated,
      totalValueRedeemed,
      customerCodes,
      driverCodes,
      byDenomination,
    });

    setRecentCodes(allCodes.slice(0, 20));
    setLoading(false);
  };

  if (auth.loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>;
  }

  if (!auth.isSuperAdmin && !auth.isAccountant) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.danger }}>
        هذه الصفحة متاحة للسوبر أدمن والمحاسبين فقط
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 8 }}>📊 تقارير البطاقات والمحفظة</h1>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 32 }}>نظرة شاملة على أكواد المحفظة والعمليات المالية</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "إجمالي الأكواد", value: stats.totalGenerated, icon: "🎫", bg: C.primarySoft, color: C.primary },
              { label: "قيمة الأكواد", value: `${stats.totalValueGenerated.toLocaleString()} جنيه`, icon: "💰", bg: C.warningSoft, color: C.warning },
              { label: "تم استخدامها", value: stats.totalRedeemed, icon: "✅", bg: C.successSoft, color: C.success },
              { label: "قيمة المستخدمة", value: `${stats.totalValueRedeemed.toLocaleString()} جنيه`, icon: "📈", bg: C.successSoft, color: C.success },
              { label: "بانتظار الاعتماد", value: stats.totalPending, icon: "⏳", bg: C.warningSoft, color: C.warning },
              { label: "متاحة (غير مُستخدمة)", value: stats.totalUnused, icon: "🏷️", bg: C.primarySoft, color: C.primary },
              { label: "أكواد عملاء", value: stats.customerCodes, icon: "👤", bg: "#DBEAFE", color: "#3B82F6" },
              { label: "أكواد سائقين", value: stats.driverCodes, icon: "🚗", bg: "#FCE7F3", color: "#EC4899" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textMuted }}>{card.label}</span>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: card.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {card.icon}
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Denomination Breakdown */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 20 }}>تفصيل حسب الفئة</h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {stats.byDenomination.map((d) => {
                const pct = d.count > 0 ? Math.round((d.redeemed / d.count) * 100) : 0;
                return (
                  <div
                    key={d.amount}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: 20,
                      borderRadius: 14,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 900, color: C.primary, marginBottom: 8 }}>{d.amount} جنيه</div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
                      الإجمالي: <strong style={{ color: C.text }}>{d.count}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>
                      تم الاستخدام: <strong style={{ color: C.success }}>{d.redeemed}</strong>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 4,
                          background: `linear-gradient(90deg, ${C.primary}, #EC4899)`,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: "left" }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Codes */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>آخر الأكواد</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الكود</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الفئة</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>النوع</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الحالة</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentCodes.map((c: any) => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700 }}>{c.code}</td>
                    <td style={{ padding: "10px 16px" }}>{c.amount} جنيه</td>
                    <td style={{ padding: "10px 16px" }}>{c.target_type === "customer" ? "عميل" : "سائق"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: c.is_used ? C.successSoft : c.approval_status === "pending" ? C.warningSoft : C.primarySoft,
                          color: c.is_used ? C.success : c.approval_status === "pending" ? C.warning : C.primary,
                        }}
                      >
                        {c.is_used ? "مُستخدم" : c.approval_status === "pending" ? "بانتظار الاعتماد" : "متاح"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: C.textMuted }}>
                      {new Date(c.created_at).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>لا توجد بيانات</div>
      )}
    </div>
  );
}
