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

type PendingCode = {
  id: string;
  code: string;
  amount: number;
  target_type: string;
  approval_status: string;
  batch_id: string;
  created_at: string;
  created_by: string;
  creator_email?: string;
};

export default function ApproveWalletCodesPage() {
  const auth = useAdminAuth();
  const [codes, setCodes] = useState<PendingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  useEffect(() => {
    if (auth.user && auth.isSuperAdmin) fetchPendingCodes();
  }, [auth.user, auth.isSuperAdmin]);

  const fetchPendingCodes = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    let query = (supabase as any)
      .from("wallet_codes")
      .select("id, code, amount, target_type, approval_status, batch_id, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(500);

    if (filter !== "all") {
      query = query.eq("approval_status", filter);
    }

    const { data, error } = await query;
    if (!error && data) setCodes(data as PendingCode[]);
    setLoading(false);
  };

  useEffect(() => {
    if (auth.user && auth.isSuperAdmin) fetchPendingCodes();
  }, [filter]);

  const handleAction = async (codeId: string, action: "approved" | "rejected") => {
    setActing(codeId);
    const supabase = getSupabase();
    if (!supabase || !auth.user) return;

    const { error } = await (supabase as any)
      .from("wallet_codes")
      .update({
        approval_status: action,
        approved_by: auth.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", codeId);

    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setCodes((prev) => prev.map((c) => (c.id === codeId ? { ...c, approval_status: action } : c)));
    }
    setActing(null);
  };

  const handleBatchAction = async (batchId: string, action: "approved" | "rejected") => {
    setActing(batchId);
    const supabase = getSupabase();
    if (!supabase || !auth.user) return;

    const { error } = await (supabase as any)
      .from("wallet_codes")
      .update({
        approval_status: action,
        approved_by: auth.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("batch_id", batchId)
      .eq("approval_status", "pending");

    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setCodes((prev) =>
        prev.map((c) => (c.batch_id === batchId && c.approval_status === "pending" ? { ...c, approval_status: action } : c))
      );
    }
    setActing(null);
  };

  // Group by batch
  const batches = codes.reduce<Record<string, PendingCode[]>>((acc, c) => {
    const key = c.batch_id || c.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (auth.loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>;
  }

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.danger }}>
        هذه الصفحة متاحة للسوبر أدمن فقط
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 8 }}>✅ اعتماد أكواد المحفظة</h1>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>
        مراجعة واعتماد الأكواد المُنشأة بواسطة المديرين الإقليميين والمحاسبين
      </p>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { value: "pending", label: "بانتظار الاعتماد" },
          { value: "approved", label: "مُعتمدة" },
          { value: "rejected", label: "مرفوضة" },
          { value: "all", label: "الكل" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: `1px solid ${filter === f.value ? C.primary : C.border}`,
              background: filter === f.value ? C.primarySoft : C.surface,
              color: filter === f.value ? C.primary : C.textMuted,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>
      ) : Object.keys(batches).length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            color: C.textMuted,
          }}
        >
          لا توجد أكواد {filter === "pending" ? "بانتظار الاعتماد" : ""}
        </div>
      ) : (
        Object.entries(batches).map(([batchId, batchCodes]) => {
          const first = batchCodes[0];
          const allPending = batchCodes.every((c) => c.approval_status === "pending");
          const totalAmount = batchCodes.reduce((s, c) => s + c.amount, 0);

          return (
            <div
              key={batchId}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}
            >
              {/* Batch header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                    {batchCodes.length} كود — {first.target_type === "customer" ? "عملاء" : "سائقين"} — {first.amount} جنيه
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                    الإجمالي: {totalAmount} جنيه · {new Date(first.created_at).toLocaleDateString("ar-EG")}
                  </div>
                </div>

                {allPending && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleBatchAction(batchId, "approved")}
                      disabled={acting === batchId}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 10,
                        background: C.success,
                        border: "none",
                        color: "white",
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      اعتماد الكل
                    </button>
                    <button
                      onClick={() => handleBatchAction(batchId, "rejected")}
                      disabled={acting === batchId}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 10,
                        background: C.danger,
                        border: "none",
                        color: "white",
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      رفض الكل
                    </button>
                  </div>
                )}
              </div>

              {/* Codes list */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {batchCodes.map((c) => {
                  const isPending = c.approval_status === "pending";
                  const isApproved = c.approval_status === "approved";
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: `1px solid ${isPending ? C.warning : isApproved ? C.success : C.danger}`,
                        background: isPending ? C.warningSoft : isApproved ? C.successSoft : C.dangerSoft,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{c.code}</span>
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleAction(c.id, "approved")}
                            disabled={acting === c.id}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: C.success,
                              border: "none",
                              color: "white",
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleAction(c.id, "rejected")}
                            disabled={acting === c.id}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: C.danger,
                              border: "none",
                              color: "white",
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            ✗
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
