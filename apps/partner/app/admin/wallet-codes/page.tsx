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

const DENOMINATIONS = [1000, 500, 100];
const TARGET_TYPES = [
  { value: "customer", label: "عملاء" },
  { value: "driver", label: "سائقين" },
];

type WalletCodeRow = {
  id: string;
  code: string;
  amount: number;
  target_type: string;
  is_used: boolean;
  approval_status: string;
  created_at: string;
  redeemed_by?: string;
};

export default function WalletCodesPage() {
  const auth = useAdminAuth();
  const [amount, setAmount] = useState(100);
  const [targetType, setTargetType] = useState("customer");
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [codes, setCodes] = useState<WalletCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedBatch, setGeneratedBatch] = useState<string[]>([]);
  const [filterTarget, setFilterTarget] = useState<string>("all");

  useEffect(() => {
    if (auth.user) fetchCodes();
  }, [auth.user]);

  const fetchCodes = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase || !auth.user) return;

    const { data, error } = await supabase
      .from("wallet_codes")
      .select("id, code, amount, target_type, is_used, approval_status, created_at, redeemed_by")
      .eq("created_by", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) setCodes(data as WalletCodeRow[]);
    setLoading(false);
  };

  const generateCodes = async () => {
    setGenerating(true);
    setGeneratedBatch([]);
    const supabase = getSupabase();
    if (!supabase || !auth.user) return;

    const batchId = crypto.randomUUID();
    const autoApprove = auth.isSuperAdmin;
    const newCodes: { code: string; amount: number; target_type: string; created_by: string; approval_status: string; batch_id: string }[] = [];

    for (let i = 0; i < quantity; i++) {
      const code = `HL-${targetType === "driver" ? "D" : "C"}-${amount}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      newCodes.push({
        code,
        amount,
        target_type: targetType,
        created_by: auth.user.id,
        approval_status: autoApprove ? "approved" : "pending",
        batch_id: batchId,
      });
    }

    const { error } = await supabase.from("wallet_codes").insert(newCodes);
    if (error) {
      alert("خطأ في توليد الأكواد: " + error.message);
    } else {
      setGeneratedBatch(newCodes.map((c) => c.code));
      fetchCodes();
    }
    setGenerating(false);
  };

  const filteredCodes = filterTarget === "all" ? codes : codes.filter((c) => c.target_type === filterTarget);

  const statusLabel = (s: string) => {
    if (s === "approved") return { text: "مُعتمد", bg: C.successSoft, color: C.success };
    if (s === "pending") return { text: "بانتظار الاعتماد", bg: C.warningSoft, color: C.warning };
    if (s === "rejected") return { text: "مرفوض", bg: C.dangerSoft, color: C.danger };
    return { text: s, bg: C.primarySoft, color: C.primary };
  };

  if (auth.loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>;
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 8 }}>🎫 توليد أكواد المحفظة</h1>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 32 }}>
        {auth.isSuperAdmin
          ? "الأكواد التي تنشئها تُعتمد تلقائياً"
          : "الأكواد التي تنشئها تحتاج اعتماد السوبر أدمن قبل أن تصبح فعّالة"}
      </p>

      {/* Generation Form */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 20 }}>إنشاء أكواد جديدة</h2>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          {/* Target Type */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
              نوع الكود
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {TARGET_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTargetType(t.value)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: `2px solid ${targetType === t.value ? C.primary : C.border}`,
                    background: targetType === t.value ? C.primarySoft : C.surface,
                    color: targetType === t.value ? C.primary : C.text,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Denomination */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
              الفئة (جنيه)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {DENOMINATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setAmount(d)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `2px solid ${amount === d ? C.primary : C.border}`,
                    background: amount === d ? C.primarySoft : C.surface,
                    color: amount === d ? C.primary : C.text,
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ minWidth: 120 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
              العدد
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value))))}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                fontSize: 16,
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
              }}
            />
          </div>
        </div>

        <button
          onClick={generateCodes}
          disabled={generating}
          style={{
            padding: "12px 32px",
            borderRadius: 12,
            background: generating ? C.textMuted : `linear-gradient(135deg, ${C.primary}, #EC4899)`,
            border: "none",
            color: "white",
            fontSize: 15,
            fontWeight: 800,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "جارٍ التوليد..." : `توليد ${quantity} كود`}
        </button>
      </div>

      {/* Generated Batch */}
      {generatedBatch.length > 0 && (
        <div
          style={{
            background: C.successSoft,
            border: `1px solid ${C.success}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 800, color: C.success, marginBottom: 12 }}>
            تم توليد {generatedBatch.length} كود بنجاح {auth.isSuperAdmin ? "(مُعتمدة)" : "(بانتظار الاعتماد)"}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {generatedBatch.map((code) => (
              <span
                key={code}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: C.text,
                  border: `1px solid ${C.border}`,
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ value: "all", label: "الكل" }, ...TARGET_TYPES].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterTarget(t.value)}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: `1px solid ${filterTarget === t.value ? C.primary : C.border}`,
              background: filterTarget === t.value ? C.primarySoft : C.surface,
              color: filterTarget === t.value ? C.primary : C.textMuted,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Codes Table */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.primarySoft }}>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الكود</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الفئة</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>النوع</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الحالة</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>الاعتماد</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.text }}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
                  جارٍ التحميل...
                </td>
              </tr>
            ) : filteredCodes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
                  لا توجد أكواد بعد
                </td>
              </tr>
            ) : (
              filteredCodes.map((c) => {
                const st = statusLabel(c.approval_status);
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700 }}>{c.code}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 700 }}>{c.amount} جنيه</td>
                    <td style={{ padding: "10px 16px" }}>{c.target_type === "customer" ? "عميل" : "سائق"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: c.is_used ? C.dangerSoft : C.successSoft,
                          color: c.is_used ? C.danger : C.success,
                        }}
                      >
                        {c.is_used ? "مُستخدم" : "متاح"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: st.bg,
                          color: st.color,
                        }}
                      >
                        {st.text}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: C.textMuted }}>
                      {new Date(c.created_at).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
