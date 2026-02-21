"use client";
import React, { useState } from "react";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
};

const STATS = [
  { label: "طلبات اليوم",    value: "12",      icon: "📦", color: C.primary,  bg: C.primarySoft },
  { label: "إيراد اليوم",    value: "1,240 ج", icon: "💰", color: "#059669",  bg: "#D1FAE5"     },
  { label: "بانتظار القبول", value: "3",       icon: "⏳", color: C.warning,   bg: "#FEF3C7"     },
  { label: "التقييم",        value: "4.8 ⭐",  icon: "⭐", color: C.pink,      bg: C.pinkSoft    },
];

const RECENT_ORDERS = [
  { id: "ORD-001", customer: "مصطفى محمد",   items: "برجر كلاسيك × 2، كوكاكولا", total: 190, status: "pending",    time: "منذ 3 دقائق" },
  { id: "ORD-002", customer: "أحمد علي",      items: "بيتزا لحمة × 1",            total: 120, status: "preparing",  time: "منذ 8 دقائق" },
  { id: "ORD-003", customer: "فاطمة حسن",     items: "تشيكن برجر × 1، عصير ليمون", total: 100, status: "delivered",  time: "منذ 25 دقيقة" },
  { id: "ORD-004", customer: "محمد إبراهيم",  items: "برجر كلاسيك × 1",           total: 85,  status: "cancelled",  time: "منذ ساعة" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "بانتظار القبول", color: C.warning,  bg: "#FEF3C7" },
  preparing: { label: "قيد التجهيز",    color: C.primary,  bg: C.primarySoft },
  delivered: { label: "مُسلَّم",         color: "#059669",  bg: "#D1FAE5" },
  cancelled: { label: "ملغي",           color: C.danger,   bg: "#FEF2F2" },
};

export default function Dashboard() {
  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>
          مرحباً! 👋
        </h1>
        <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
          الأربعاء، 21 فبراير 2026 — نظرة عامة على أداء متجرك اليوم
        </p>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {STATS.map((s, i) => (
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
          }}>
            عرض الكل ←
          </a>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {["رقم الطلب", "العميل", "البنود", "الإجمالي", "الحالة", "الوقت"].map(h => (
                <th key={h} style={{
                  padding: "8px 12px", textAlign: "right",
                  fontSize: 12, fontWeight: 700, color: C.textMuted,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_ORDERS.map(o => {
              const st = STATUS_LABELS[o.status];
              return (
                <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: C.primary }}>{o.id}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: C.text }}>{o.customer}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: C.textMuted, maxWidth: 180 }}>{o.items}</td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: C.text }}>{o.total} ج</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      color: st.color, background: st.bg,
                    }}>{st.label}</span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: C.textMuted }}>{o.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
