"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import type { PartnerApproval } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable } from "../components/DataTable";
import { useAdminPermissions } from "../hooks/useAdminPermissions";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  bg: "#FAFAFF",
  success: "#34D399",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  warning: "#F59E0B",
};

interface PartnerWithApproval extends PartnerApproval {
  partner_name?: string;
  partner_email?: string;
  partner_type?: string;
}

export default function PartnerApprovalsPage() {
  const auth = useAdminAuth();
  const [approvals, setApprovals] = useState<PartnerWithApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PartnerWithApproval | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!auth.user) return;
    loadApprovals();
  }, [auth.user]);

  const loadApprovals = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let query = supabase
        .from("partner_approvals")
        .select(
          `
          *,
          partner:partners(id, name, email, partner_type)
        `
        )
        .order("requested_at", { ascending: false });

      // If not super admin, only show assigned approvals
      if (!auth.isSuperAdmin) {
        query = query.eq("assigned_to", auth.user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedData = (data || []).map((approval: any) => ({
        ...approval,
        partner_name: approval.partner?.name,
        partner_email: approval.partner?.email,
        partner_type: approval.partner?.partner_type,
      }));

      setApprovals(mappedData);
    } catch (error) {
      console.error("Error loading approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (approval: PartnerWithApproval) => {
    setSelectedApproval(approval);
    setActionType("approve");
    setRejectionReason("");
    setShowModal(true);
  };

  const handleRejectClick = (approval: PartnerWithApproval) => {
    setSelectedApproval(approval);
    setActionType("reject");
    setRejectionReason("");
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval) return;

    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await (supabase
        .from("partner_approvals") as any)
        .update({
          status: actionType === "approve" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: auth.user?.id,
          rejection_reason: actionType === "reject" ? rejectionReason : null,
        })
        .eq("id", selectedApproval.id);

      if (error) throw error;

      // Log the action
      await (supabase.from("admin_logs") as any).insert({
        admin_id: auth.user?.id,
        action: `${actionType}_partner`,
        entity_type: "partner",
        entity_id: selectedApproval.partner_id,
        new_data: {
          status: actionType === "approve" ? "approved" : "rejected",
          rejection_reason: rejectionReason,
        },
      });

      setShowModal(false);
      await loadApprovals();
    } catch (error) {
      console.error("Error updating approval:", error);
      alert("حدث خطأ أثناء معالجة الطلب");
    } finally {
      setProcessing(false);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === "pending");

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          إدارة طلبات الشركاء
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          المراجعة والموافقة على طلبات الشركاء الجدد
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { label: "قيد الانتظار", count: pendingApprovals.length, status: "pending" },
          { label: "موافق عليه", count: approvals.filter(a => a.status === "approved").length, status: "approved" },
          { label: "مرفوض", count: approvals.filter(a => a.status === "rejected").length, status: "rejected" },
        ].map(tab => (
          <div
            key={tab.status}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              background: C.primarySoft,
              color: C.primary,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {tab.label} ({tab.count})
          </div>
        ))}
      </div>

      {/* Pending Approvals Table */}
      <DataTable<PartnerWithApproval>
        columns={[
          {
            key: "partner_name",
            label: "اسم الشريك",
            width: "200px",
          },
          {
            key: "partner_type",
            label: "نوع المتجر",
            width: "120px",
          },
          {
            key: "partner_email",
            label: "البريد الإلكتروني",
            width: "180px",
          },
          {
            key: "status",
            label: "الموافقات",
            width: "220px",
            render: (status, item: any) => {
              const fridApprovals = item.frid_approvals || [];
              const approvedCount = fridApprovals.filter((a: any) => a.status === "approved").length;
              return (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: approvedCount >= 1 ? "#D1FAE5" : "#FEF3C7",
                    color: approvedCount >= 1 ? C.success : C.warning,
                  }}>
                    {approvedCount}/2 فريد
                  </span>
                  {item.status === "pending" ? (
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: "#FEF3C7",
                      color: C.warning,
                    }}>
                      ⏳ انتظار مالك
                    </span>
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                </div>
              );
            },
          },
        ]}
        data={pendingApprovals}
        loading={loading}
        onRowClick={handleApproveClick}
        emptyMessage="لا توجد طلبات قيد الانتظار"
      />

      {/* Action Modal */}
      {showModal && selectedApproval && (
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
              {actionType === "approve" ? "موافقة على الشريك" : "رفض طلب الشريك"}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 8 }}>
                اسم الشريك
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                {selectedApproval.partner_name}
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
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="أدخل سبب الرفض..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 13,
                    fontFamily: "inherit",
                    direction: "rtl",
                    minHeight: 100,
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
                disabled={processing || (actionType === "reject" && !rejectionReason)}
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
                  opacity: processing || (actionType === "reject" && !rejectionReason) ? 0.6 : 1,
                }}
              >
                {processing ? "جاري المعالجة..." : actionType === "approve" ? "موافقة" : "رفض"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
