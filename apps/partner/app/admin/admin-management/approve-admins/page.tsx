"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import type { AdminInvitation } from "@hillaha/core";

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

export default function ApproveAdminsPage() {
  const auth = useAdminAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<AdminInvitation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!auth.isAdmin) return;

    if (!auth.isSuperAdmin) {
      router.push("/admin");
      return;
    }

    loadInvitations();
    setLoading(false);
  }, [auth.isSuperAdmin, auth.isAdmin, router]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: err } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("admin_type", "regular_admin")
        .eq("super_admin_approval", "pending")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error loading invitations:", error);
    }
  };

  const handleApprove = (invitation: AdminInvitation) => {
    setSelectedInvitation(invitation);
    setActionType("approve");
    setNotes("");
    setShowModal(true);
  };

  const handleReject = (invitation: AdminInvitation) => {
    setSelectedInvitation(invitation);
    setActionType("reject");
    setNotes("");
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedInvitation) return;

    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error: err } = await supabase
        .from("admin_invitations")
        .update({
          super_admin_approval: actionType === "approve" ? "approved" : "rejected",
          approved_by_super_admin: auth.user?.id,
          super_admin_notes: notes,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedInvitation.id);

      if (err) throw err;

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: auth.user?.id,
        action: `${actionType}_admin_invitation`,
        entity_type: "partner",
        entity_id: selectedInvitation.id,
        new_data: {
          status: actionType === "approve" ? "approved" : "rejected",
          notes,
        },
      });

      setShowModal(false);
      await loadInvitations();
    } catch (error) {
      console.error("Error processing action:", error);
      alert("حدث خطأ");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return null;

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          موافقة طلبات المديرين
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          المراجعة والموافقة على طلبات المديرين الجدد من قبل مديري الفرائد
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            backgroundColor: C.warningSoft,
            borderRadius: 12,
            border: `1px solid ${C.warning}`,
            padding: 16,
          }}
        >
          <p style={{ color: C.warning, fontSize: 12, margin: 0, marginBottom: 8, fontWeight: 700 }}>
            الطلبات المعلقة
          </p>
          <h3 style={{ color: C.warning, fontSize: 20, fontWeight: 900, margin: 0 }}>
            {invitations.length}
          </h3>
        </div>
      </div>

      {/* Table */}
      {invitations.length === 0 ? (
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: 40,
            textAlign: "center",
            color: C.textMuted,
          }}
        >
          لا توجد طلبات معلقة
        </div>
      ) : (
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          {invitations.map((inv, idx) => (
            <div
              key={inv.id}
              style={{
                padding: 16,
                borderBottom: idx < invitations.length - 1 ? `1px solid ${C.border}` : "none",
                display: "grid",
                gridTemplateColumns: "1fr 150px 120px",
                gap: 16,
                alignItems: "center",
                backgroundColor: idx % 2 === 0 ? "transparent" : C.primarySoft + "20",
              }}
            >
              {/* Info */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>
                  {inv.name}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>
                  📧 {inv.email}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  📱 {inv.phone} • دعاه: مدير فريد
                </div>
              </div>

              {/* Date */}
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>التاريخ</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {new Date(inv.created_at).toLocaleDateString("ar-EG")}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleApprove(inv)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: C.successSoft,
                    color: C.success,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ✓ قبول
                </button>
                <button
                  onClick={() => handleReject(inv)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: C.dangerSoft,
                    color: C.danger,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ✗ رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedInvitation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 24,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 14px 35px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, marginBottom: 16 }}>
              {actionType === "approve" ? "موافقة على المدير" : "رفض طلب المدير"}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 8 }}>
                الاسم
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                {selectedInvitation.name}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 8 }}>
                البريد الإلكتروني
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                {selectedInvitation.email}
              </p>
            </div>

            {actionType === "reject" && (
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.text,
                    marginBottom: 8,
                  }}
                >
                  سبب الرفض
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أدخل سبب الرفض..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 13,
                    fontFamily: "inherit",
                    direction: "rtl",
                    minHeight: 80,
                  }}
                />
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  background: "transparent",
                  color: C.text,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={processing || (actionType === "reject" && !notes)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: actionType === "approve" ? C.success : C.danger,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: processing ? "not-allowed" : "pointer",
                  opacity: processing || (actionType === "reject" && !notes) ? 0.6 : 1,
                }}
              >
                {processing ? "جاري المعالجة..." : actionType === "approve" ? "✓ موافقة" : "✗ رفض"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
