"use client";
import React, { useState } from "react";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
  green: "#059669", greenSoft: "#D1FAE5",
};

const PERIODS = ["هذا الأسبوع", "هذا الشهر", "آخر 3 أشهر"];

const MONTHLY_DATA = [
  { month: "سبتمبر", sales: 8200,  commission: 1230, net: 6970,  orders: 98 },
  { month: "أكتوبر", sales: 10500, commission: 1575, net: 8925,  orders: 124 },
  { month: "نوفمبر", sales: 9800,  commission: 1470, net: 8330,  orders: 117 },
  { month: "ديسمبر", sales: 14200, commission: 2130, net: 12070, orders: 168 },
  { month: "يناير",  sales: 11600, commission: 1740, net: 9860,  orders: 139 },
  { month: "فبراير", sales: 13400, commission: 2010, net: 11390, orders: 158 },
];

const TRANSACTIONS = [
  { id: "TRX-088", date: "21 فبراير", type: "تسوية أسبوعية", amount: 3200, status: "completed" },
  { id: "TRX-087", date: "14 فبراير", type: "تسوية أسبوعية", amount: 2980, status: "completed" },
  { id: "TRX-086", date: "7 فبراير",  type: "تسوية أسبوعية", amount: 3150, status: "completed" },
  { id: "TRX-085", date: "31 يناير",  type: "تسوية شهرية",   amount: 9860, status: "completed" },
  { id: "TRX-084", date: "28 يناير",  type: "تسوية أسبوعية", amount: 2450, status: "completed" },
  { id: "TRX-NEXT", date: "28 فبراير", type: "التسوية القادمة", amount: 2190, status: "pending" },
];

const maxSales = Math.max(...MONTHLY_DATA.map(d => d.sales));

export default function FinancePage() {
  const [period, setPeriod] = useState("هذا الشهر");

  const current = MONTHLY_DATA[MONTHLY_DATA.length - 1];

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>المالية والعمولات</h1>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>تتبع إيراداتك وتسوياتك مع حلّها</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 14px", borderRadius: 20, border: period === p ? "none" : `1px solid ${C.border}`,
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: period === p ? C.primary : C.surface,
                color: period === p ? "white" : C.textMuted,
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* TOP STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "إجمالي المبيعات",   value: `${current.sales.toLocaleString()} ج`, icon: "💰", color: C.green,   bg: C.greenSoft  },
          { label: "عمولة حلّها (10%-8%)", value: `${current.commission.toLocaleString()} ج`, icon: "📊", color: C.danger,  bg: "#FEF2F2"    },
          { label: "صافي أرباحك",       value: `${current.net.toLocaleString()} ج`, icon: "✅", color: C.primary, bg: C.primarySoft },
          { label: "عدد الطلبات",        value: `${current.orders}`, icon: "📦", color: C.warning, bg: "#FEF3C7"   },
        ].map((s, i) => (
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
            }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* TWO COLUMN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginBottom: 16 }}>
        {/* CHART */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.text }}>المبيعات الشهرية</h2>
            <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
              <span style={{ color: C.primary }}>■ المبيعات</span>
              <span style={{ color: C.green }}>■ الصافي</span>
            </div>
          </div>

          {/* BAR CHART */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180 }}>
            {MONTHLY_DATA.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", display: "flex", gap: 3, alignItems: "flex-end", height: 160 }}>
                  {/* Sales bar */}
                  <div style={{
                    flex: 1, borderRadius: "6px 6px 0 0",
                    background: i === MONTHLY_DATA.length - 1 ? C.primary : C.primarySoft,
                    height: `${(d.sales / maxSales) * 100}%`,
                    minHeight: 8,
                  }} />
                  {/* Net bar */}
                  <div style={{
                    flex: 1, borderRadius: "6px 6px 0 0",
                    background: i === MONTHLY_DATA.length - 1 ? C.green : C.greenSoft,
                    height: `${(d.net / maxSales) * 100}%`,
                    minHeight: 6,
                  }} />
                </div>
                <span style={{ fontSize: 10, color: C.textMuted, textAlign: "center" }}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* COMMISSION BREAKDOWN */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${C.border}`,
        }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 900, color: C.text }}>تفصيل العمولة</h2>

          <div style={{
            background: C.primarySoft, borderRadius: 14, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, marginBottom: 4 }}>نسبة عمولة حلّها</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.primary }}>10% - 8%</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>10% للـ 1000 طلب الأول، 8% للإضافية | شامل: الخدمة واللوجستية والتسويق والدعم</div>
          </div>

          {[
            { label: "مبيعات {period}",    value: `${current.sales.toLocaleString()} ج`,       color: C.text },
            { label: "عمولة حلّها",         value: `- ${current.commission.toLocaleString()} ج`, color: C.danger },
            { label: "مصاريف توصيل",       value: "- 0 ج (مجاناً)",                             color: C.textMuted },
            { label: "صافي مستحقاتك",      value: `${current.net.toLocaleString()} ج`,           color: C.green },
          ].map((row, i, arr) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0",
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
              borderTop: i === arr.length - 1 ? `2px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 13, color: C.textMuted }}>{row.label.replace("{period}", period)}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div style={{
        background: C.surface, borderRadius: 20, padding: 24,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.text }}>سجل التسويات</h2>
          <button style={{
            padding: "7px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", cursor: "pointer", fontSize: 12,
            color: C.primary, fontWeight: 700,
          }}>
            ⬇ تحميل PDF
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {["رقم التسوية", "التاريخ", "النوع", "المبلغ", "الحالة"].map(h => (
                <th key={h} style={{
                  padding: "8px 12px", textAlign: "right",
                  fontSize: 11, fontWeight: 700, color: C.textMuted,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map(t => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: C.primary }}>{t.id}</td>
                <td style={{ padding: "12px", fontSize: 13, color: C.textMuted }}>{t.date}</td>
                <td style={{ padding: "12px", fontSize: 13, color: C.text }}>{t.type}</td>
                <td style={{ padding: "12px", fontSize: 14, fontWeight: 900, color: C.green }}>{t.amount.toLocaleString()} ج</td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    color: t.status === "completed" ? C.green : C.warning,
                    background: t.status === "completed" ? C.greenSoft : "#FEF3C7",
                  }}>
                    {t.status === "completed" ? "تم الإيداع" : "قادمة"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* NEXT SETTLEMENT NOTICE */}
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 12,
          background: C.primarySoft, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.primary }}>
              التسوية القادمة في 28 فبراير — المبلغ المتوقع: 2,190 ج
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              يتم الإيداع كل أسبوع تلقائياً في حسابك البنكي المسجل
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
