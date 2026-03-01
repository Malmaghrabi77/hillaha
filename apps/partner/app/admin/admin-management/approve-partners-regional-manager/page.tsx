"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import type { PartnerInvitation } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  bg: "#FAFAFF",
  success: "#34D399",
  successSoft: "#D1FAE5",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
};

export default function RegionalManagerApprovePartnersPage() {
  const auth = useAdminAuth();
  const [invitations, setInvitations] = useState<PartnerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [rejecting, setRejecting] = useState<Record<string, boolean>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!auth.user || !auth.isRegionalManager) {
      setLoading(false);
      return;
    }
    loadInvitations();
  }, [auth.user, auth.isRegionalManager]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: err } = await supabase
        .from("partner_invitations")
        .select("*")
        .eq("invited_by_role", "regular_admin")
        .is("regional_manager_approval", null)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setInvitations(data || []);
    } catch (err: any) {
      console.error("Error loading invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (invId: string) => {
    setApproving((prev) => ({ ...prev, [invId]: true }));

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const updateData = {
        regional_manager_approval: "approved",
        approved_by_regional_manager: auth.user?.id || "",
        regional_manager_approved_at: new Date().toISOString(),
      };

      const { error: err } = await (supabase.from("partner_invitations") as any)
        .update(updateData)
        .eq("id", invId);

      if (err) throw err;

      await loadInvitations();
    } catch (err: any) {
      console.error("Error approving:", err);
      alert(err.message || "حدث خطأ");
    } finally {
      setApproving((prev) => ({ ...prev, [invId]: false }));
    }
  };

  const handleReject = async (invId: string) => {
    const reason = rejectReason[invId] || "";

    if (!reason.trim()) {
      alert("الرجاء إدخال سبب الرفض");
      return;
    }

    setRejecting((prev) => ({ ...prev, [invId]: true }));

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const updateData = {
        regional_manager_approval: "rejected",
        approval_notes: reason,
        approved_by_regional_manager: auth.user?.id || "",
        regional_manager_approved_at: new Date().toISOString(),
      };

      const { error: err } = await (supabase.from("partner_invitations") as any)
        .update(updateData)
        .eq("id", invId);

      if (err) throw err;

      setShowRejectModal((prev) => ({ ...prev, [invId]: false }));
      setRejectReason((prev) => ({ ...prev, [invId]: "" }));
      await loadInvitations();
    } catch (err: any) {
      console.error("Error rejecting:", err);
      alert(err.message || "حدث خطأ");
    } finally {
      setRejecting((prev) => ({ ...prev, [invId]: false }));
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "pending") return inv.status === "pending";
    if (filter === "approved") return inv.status === "accepted";
    if (filter === "rejected") return inv.status === "rejected";
    return true;
  });

  if (!auth.isRegionalManager) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: C.danger }}>
        <h2>غير مسموح</h2>
        <p>فقط مدير إقليمي يمكنه الموافقة على دعوات الشركاء</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: C.text, marginBottom: "0.5rem" }}>موافقات المديرين العاديين</h1>
        <p style={{ color: C.textMuted }}>وافق أو رفض دعوات الشركاء من المديرين العاديين</p>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? C.primary : "transparent",
              color: filter === f ? "white" : C.text,
              border: `1px solid ${C.border}`,
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {f === "all" && "الكل"}
            {f === "pending" && "⏳ قيد الانتظار"}
            {f === "approved" && "✅ موافق"}
            {f === "rejected" && "❌ مرفوض"}
          </button>
        ))}
      </div>

      {/* Invitations List */}
      {filteredInvitations.length === 0 ? (
        <div
          style={{
            background: C.bg,
            padding: "2rem",
            borderRadius: "8px",
            textAlign: "center",
            color: C.textMuted,
          }}
        >
          {filter === "all" ? "لا توجد دعوات قيد الانتظار" : "لا توجد دعوات في هذه الفئة"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredInvitations.map((inv) => (
            <div
              key={inv.id}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "1.5rem",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "1rem",
                alignItems: "start",
              }}
            >
              {/* Partner Info */}
              <div>
                <h3 style={{ color: C.text, margin: "0 0 0.5rem 0" }}>{inv.name}</h3>
                <p style={{ color: C.textMuted, margin: "0.25rem 0" }}>📧 {inv.email}</p>
                <p style={{ color: C.textMuted, margin: "0.25rem 0" }}>📱 {inv.phone}</p>
                {inv.approval_notes && (
                  <p style={{ color: C.textMuted, margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
                    ملاحظات: {inv.approval_notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  onClick={() => handleApprove(inv.id)}
                  disabled={approving[inv.id]}
                  style={{
                    background: C.success,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    cursor: approving[inv.id] ? "not-allowed" : "pointer",
                    opacity: approving[inv.id] ? 0.6 : 1,
                    fontFamily: "inherit",
                    fontSize: "0.875rem",
                  }}
                >
                  {approving[inv.id] ? "جاري..." : "✅ وافق"}
                </button>

                <button
                  onClick={() => setShowRejectModal((prev) => ({ ...prev, [inv.id]: true }))}
                  style={{
                    background: C.danger,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "0.875rem",
                  }}
                >
                  ❌ رفض
                </button>
              </div>

              {/* Reject Modal */}
              {showRejectModal[inv.id] && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      background: C.surface,
                      borderRadius: "12px",
                      padding: "2rem",
                      maxWidth: "400px",
                      width: "90%",
                    }}
                  >
                    <h3 style={{ color: C.text, marginBottom: "1rem" }}>سبب الرفض</h3>
                    <textarea
                      value={rejectReason[inv.id] || ""}
                      onChange={(e) =>
                        setRejectReason((prev) => ({ ...prev, [inv.id]: e.target.value }))
                      }
                      placeholder="أدخل السبب..."
                      style={{
                        width: "100%",
                        border: `1px solid ${C.border}`,
                        borderRadius: "8px",
                        padding: "0.75rem",
                        marginBottom: "1rem",
                        fontFamily: "inherit",
                        minHeight: "100px",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleReject(inv.id)}
                        disabled={rejecting[inv.id]}
                        style={{
                          background: C.danger,
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.75rem 1.5rem",
                          cursor: rejecting[inv.id] ? "not-allowed" : "pointer",
                          opacity: rejecting[inv.id] ? 0.6 : 1,
                          flex: 1,
                          fontFamily: "inherit",
                        }}
                      >
                        {rejecting[inv.id] ? "جاري..." : "رفض"}
                      </button>
                      <button
                        onClick={() => setShowRejectModal((prev) => ({ ...prev, [inv.id]: false }))}
                        style={{
                          background: C.bg,
                          color: C.text,
                          border: `1px solid ${C.border}`,
                          borderRadius: "6px",
                          padding: "0.75rem 1.5rem",
                          cursor: "pointer",
                          flex: 1,
                          fontFamily: "inherit",
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
