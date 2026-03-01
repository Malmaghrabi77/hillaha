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

  useEffect(() => {
    if (!auth.user || !auth.isSuperAdmin) {
      setError("فقط السوبر أدمن يمكنه الموافقة على دعوات الشركاء");
      return;
    }
    loadPendingInvitations();
  }, [auth.user, auth.isSuperAdmin]);

  const loadPendingInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const { data, error: err } = await (supabase
        .from("partner_invitations") as any)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (err) throw err;
      setInvitations(data || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleApprove = async (invitationId: string, email: string, name: string) => {
    if (!window.confirm(`تأكيد قبول الشريك: ${name}؟`)) return;

    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      // 1. Update invitation status
      const { error: updateErr } = await (supabase
        .from("partner_invitations") as any)
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (updateErr) throw updateErr;

      // 2. Send approval notification (في المستقبل)
      setSuccess(`✅ تم قبول الشريك: ${name}`);
      await loadPendingInvitations();
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
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (err) throw err;

      setSuccess(`✅ تم رفض الشريك: ${name}`);
      setRejectReason("");
      setSelectedInvite(null);
      await loadPendingInvitations();
    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: C.danger }}>
        ⚠️ فقط السوبر أدمن يمكنه الموافقة على دعوات الشركاء
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: C.textMuted }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: "0 0 8px 0" }}>
          ✅ موافقة دعوات الشركاء
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          مراجعة والموافقة على دعوات الشركاء الجدد (صلاحية السوبر أدمن فقط)
        </p>
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
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: C.successSoft,
            color: C.success,
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
            fontWeight: 700,
          }}
        >
          {success}
        </div>
      )}

      {/* Pending Invitations */}
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ color: C.textMuted, fontSize: 16, fontWeight: 700, margin: 0 }}>
            لا توجد دعوات قيد الانتظار
          </p>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0 0" }}>
            جميع الدعوات قد تم معالجتها
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 20, marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: "0 0 8px 0" }}>
                    {inv.name}
                  </h3>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 4px 0" }}>
                    📧 {inv.email}
                  </p>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 8px 0" }}>
                    📱 {inv.phone}
                  </p>
                  <p style={{ fontSize: 12, color: C.warning, margin: 0 }}>
                    دعوة من: {inv.invited_type === "super_admin" ? "السوبر أدمن" : "مدير إقليمي"}
                  </p>
                </div>

                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 8px 0" }}>التاريخ</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                    {new Date(inv.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
              </div>

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

              {/* Action Buttons */}
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
                      ✕ تأكيد الرفض
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInvite(null);
                        setRejectReason("");
                      }}
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
                      ← إلغاء
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleApprove(inv.id, inv.email, inv.name)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
