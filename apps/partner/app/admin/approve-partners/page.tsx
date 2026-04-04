"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  success: "#34D399",
  successSoft: "#D1FAE5",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
};

interface PartnerInvitation {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  invited_type: string;
  created_at: string;
  invitation_token?: string;
}

export default function ApprovePartnersPage() {
  const auth = useAdminAuth();
  const [invitations, setInvitations] = useState<PartnerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedInvite, setSelectedInvite] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "accepted" | "rejected" | "all">("pending");

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user || !auth.isSuperAdmin) {
      setError("فقط السوبر أدمن يمكنه الموافقة على دعوات الشركاء");
      return;
    }
    setError(null);
    loadInvitations();
  }, [auth.user, auth.isSuperAdmin, auth.loading, filter]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      let query = (supabase.from("partner_invitations") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setInvitations(data || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleApprove = async (invitation: PartnerInvitation) => {
    if (!window.confirm(`تأكيد قبول الشريك: ${invitation.name}؟`)) return;

    setProcessing(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      // 1. Update invitation status to accepted
      const { error: updateErr } = await (supabase
        .from("partner_invitations") as any)
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          approved_by_super_admin: auth.user?.id,
          super_admin_approval: "approved",
        })
        .eq("id", invitation.id);

      if (updateErr) throw updateErr;

      // 2. Generate invitation token
      try {
        await (supabase as any).rpc("generate_invitation_token", {
          p_invitation_id: invitation.id,
        });
      } catch (tokenErr) {
        console.warn("Token generation failed (function may not exist yet):", tokenErr);
      }

      setSuccess(
        `✅ تم قبول الشريك: ${invitation.name}\n` +
        `📧 يمكن للشريك الآن التسجيل باستخدام البريد: ${invitation.email}`
      );
      await loadInvitations();
    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (invitationId: string, name: string) => {
    if (!rejectReason.trim()) {
      setError("يرجى إدخال سبب الرفض");
      return;
    }

    if (!window.confirm(`تأكيد رفض الشريك: ${name}؟`)) return;

    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const { error: err } = await (supabase
        .from("partner_invitations") as any)
        .update({
          status: "rejected",
          rejection_reason: rejectReason,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (err) throw err;

      setSuccess(`✅ تم رفض الشريك: ${name}`);
      setRejectReason("");
      setSelectedInvite(null);
      await loadInvitations();
    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: C.warningSoft, color: C.warning, label: "قيد المراجعة" },
      accepted: { bg: C.successSoft, color: "#065F46", label: "مقبول — بانتظار التسجيل" },
      rejected: { bg: C.dangerSoft, color: C.danger, label: "مرفوض" },
      registered: { bg: C.primarySoft, color: C.primary, label: "مسجل ✓" },
    };
    const s = map[status] || { bg: "#F3F4F6", color: "#6B7280", label: status };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: s.bg,
          color: s.color,
        }}
      >
        {s.label}
      </span>
    );
  };

  if (auth.loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جاري التحميل...</div>;
  }

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: C.danger }}>
        ⚠️ فقط السوبر أدمن يمكنه الموافقة على دعوات الشركاء
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center", color: C.textMuted }}>جاري التحميل...</div>;
  }

  return (
    <div dir="rtl" style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: "0 0 8px 0" }}>
          إدارة دعوات الشركاء
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          مراجعة والموافقة على دعوات الشركاء الجدد
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([
          { key: "pending", label: "قيد المراجعة" },
          { key: "accepted", label: "مقبول" },
          { key: "registered", label: "مسجل" },
          { key: "rejected", label: "مرفوض" },
          { key: "all", label: "الكل" },
        ] as { key: typeof filter; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key as any); setLoading(true); }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: filter === tab.key ? C.primary : C.primarySoft,
              color: filter === tab.key ? "white" : C.primary,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            backgroundColor: C.dangerSoft,
            color: C.danger,
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
            fontWeight: 700,
            whiteSpace: "pre-line",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: C.successSoft,
            color: "#065F46",
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
            fontWeight: 700,
            whiteSpace: "pre-line",
          }}
        >
          {success}
        </div>
      )}

      {/* Invitations List */}
      {invitations.length === 0 ? (
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            border: `2px dashed ${C.border}`,
            padding: 60,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {filter === "pending" ? "✅" : "📋"}
          </div>
          <p style={{ color: C.textMuted, fontSize: 16, fontWeight: 700, margin: 0 }}>
            {filter === "pending" ? "لا توجد دعوات قيد الانتظار" : "لا توجد دعوات"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                border: `2px solid ${C.border}`,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>
                      {inv.name}
                    </h3>
                    {getStatusBadge(inv.status)}
                  </div>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 4px 0" }}>
                    📧 {inv.email}
                  </p>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 4px 0" }}>
                    📱 {inv.phone}
                  </p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                    📅 {new Date(inv.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Actions for pending invitations only */}
              {inv.status === "pending" && (
                <>
                  {/* Rejection Reason Input */}
                  {selectedInvite === inv.id && (
                    <div
                      style={{
                        backgroundColor: C.warningSoft,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                        سبب الرفض
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="اكتب سبب رفض هذه الدعوة..."
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 6,
                          border: `1px solid ${C.border}`,
                          fontSize: 13,
                          fontFamily: "inherit",
                          outline: "none",
                          minHeight: 80,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12 }}>
                    {selectedInvite === inv.id ? (
                      <>
                        <button
                          onClick={() => handleReject(inv.id, inv.name)}
                          disabled={processing || !rejectReason.trim()}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: C.danger,
                            color: "white",
                            border: "none",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: processing ? "not-allowed" : "pointer",
                            opacity: processing || !rejectReason.trim() ? 0.6 : 1,
                          }}
                        >
                          تأكيد الرفض
                        </button>
                        <button
                          onClick={() => { setSelectedInvite(null); setRejectReason(""); }}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: C.border,
                            color: C.text,
                            border: "none",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          إلغاء
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(inv)}
                          disabled={processing}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: C.success,
                            color: "white",
                            border: "none",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: processing ? "not-allowed" : "pointer",
                            opacity: processing ? 0.6 : 1,
                          }}
                        >
                          ✅ قبول
                        </button>
                        <button
                          onClick={() => setSelectedInvite(inv.id)}
                          disabled={processing}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: C.dangerSoft,
                            color: C.danger,
                            border: `1px solid ${C.danger}`,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: processing ? "not-allowed" : "pointer",
                          }}
                        >
                          ✕ رفض
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Info for accepted invitations */}
              {inv.status === "accepted" && (
                <div
                  style={{
                    backgroundColor: C.successSoft,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 13,
                    color: "#065F46",
                  }}
                >
                  الشريك يمكنه الآن التسجيل باستخدام البريد: <strong>{inv.email}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
