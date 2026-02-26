"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import type { AdminCommission } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable } from "../components/DataTable";

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
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
};

interface CommissionWithPartner extends AdminCommission {
  partner_name?: string;
  partner_email?: string;
}

export default function PaymentsPage() {
  const auth = useAdminAuth();
  const [commissions, setCommissions] = useState<CommissionWithPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "settled">("all");
  const [selectedCommission, setSelectedCommission] = useState<CommissionWithPartner | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!auth.user) return;
    loadCommissions();
  }, [auth.user, filter]);

  const loadCommissions = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let query = supabase
        .from("admin_commissions")
        .select(
          `
          *,
          partner:partners(id, name, email)
        `
        )
        .order("month", { ascending: false });

      // Filter by settlement status
      if (filter === "pending") {
        query = query.is("settled_date", null);
      } else if (filter === "settled") {
        query = query.not("settled_date", "is", null);
      }

      // If not super admin, only show assigned partners
      if (!auth.isSuperAdmin) {
        const { data: assignments } = await (supabase
          .from("admin_assignments") as any)
          .select("partner_id")
          .eq("admin_id", auth.user.id);

        const partnerIds = ((assignments as any[]) || []).map(a => a.partner_id) || [];
        if (partnerIds.length > 0) {
          query = query.in("partner_id", partnerIds);
        } else {
          setCommissions([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedData = ((data as any[]) || []).map((commission: any) => ({
        ...commission,
        partner_name: commission.partner?.name,
        partner_email: commission.partner?.email,
      }));

      setCommissions(mappedData);
    } catch (error) {
      console.error("Error loading commissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleClick = (commission: CommissionWithPartner) => {
    setSelectedCommission(commission);
    setShowSettleModal(true);
  };

  const handleSettlement = async () => {
    if (!selectedCommission) return;

    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await (supabase
        .from("admin_commissions") as any)
        .update({
          settled_date: new Date().toISOString(),
          settled_by: auth.user?.id,
          settled_amount: selectedCommission.earned_amount,
        })
        .eq("id", selectedCommission.id);

      if (error) throw error;

      // Log the action
      await (supabase.from("admin_logs") as any).insert({
        admin_id: auth.user?.id,
        action: "settle_payment",
        entity_type: "payment",
        entity_id: selectedCommission.id,
        new_data: {
          status: "settled",
          amount: selectedCommission.earned_amount,
        },
      });

      setShowSettleModal(false);
      await loadCommissions();
    } catch (error) {
      console.error("Error settling commission:", error);
      alert("حدث خطأ أثناء تسوية المدفوعات");
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = commissions.filter(c => !c.settled_date).length;
  const settledCount = commissions.filter(c => c.settled_date).length;
  const totalAmount = commissions.reduce((sum, c) => sum + (c.earned_amount || 0), 0);

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          إدارة المدفوعات والعمولات
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          تتبع وتسوية عمولات الشركاء الشهرية
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
            backgroundColor: C.surface,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: 16,
          }}
        >
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0, marginBottom: 8 }}>
            المدفوعات المعلقة
          </p>
          <h3 style={{ color: C.text, fontSize: 20, fontWeight: 900, margin: 0 }}>
            {pendingCount}
          </h3>
        </div>

        <div
          style={{
            backgroundColor: C.successSoft,
            borderRadius: 12,
            border: `1px solid ${C.success}`,
            padding: 16,
          }}
        >
          <p style={{ color: C.success, fontSize: 12, margin: 0, marginBottom: 8, fontWeight: 700 }}>
            المدفوعات المسددة
          </p>
          <h3 style={{ color: C.success, fontSize: 20, fontWeight: 900, margin: 0 }}>
            {settledCount}
          </h3>
        </div>

        <div
          style={{
            backgroundColor: C.primarySoft,
            borderRadius: 12,
            border: `1px solid ${C.primary}`,
            padding: 16,
          }}
        >
          <p style={{ color: C.primary, fontSize: 12, margin: 0, marginBottom: 8, fontWeight: 700 }}>
            إجمالي العمولات
          </p>
          <h3 style={{ color: C.primary, fontSize: 20, fontWeight: 900, margin: 0 }}>
            {totalAmount.toFixed(0)} ج.م
          </h3>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { label: "الكل", value: "all" as const },
          { label: "معلقة", value: "pending" as const },
          { label: "مسددة", value: "settled" as const },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: filter === tab.value ? C.primary : C.primarySoft,
              color: filter === tab.value ? "white" : C.primary,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Commissions Table */}
      <DataTable<CommissionWithPartner>
        columns={[
          {
            key: "partner_name",
            label: "اسم الشريك",
            width: "180px",
          },
          {
            key: "month",
            label: "الشهر",
            width: "100px",
          },
          {
            key: "earned_amount",
            label: "المبلغ المكتسب",
            width: "120px",
            render: (amount) => `${amount.toFixed(0)} ج.م`,
          },
          {
            key: "settled_amount",
            label: "المبلغ المسدد",
            width: "120px",
            render: (amount) => `${amount?.toFixed(0) || "0"} ج.م`,
          },
          {
            key: "settled_date",
            label: "حالة التسوية",
            width: "120px",
            render: (date) =>
              date ? (
                <StatusBadge status="delivered" customLabel="مسدد" />
              ) : (
                <StatusBadge status="pending" customLabel="معلق" />
              ),
          },
        ]}
        data={commissions}
        loading={loading}
        onRowClick={(commission) => {
          if (!commission.settled_date) {
            handleSettleClick(commission);
          }
        }}
        emptyMessage="لا توجد بيانات"
      />

      {/* Settlement Modal */}
      {showSettleModal && selectedCommission && (
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
          onClick={() => setShowSettleModal(false)}
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
            <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, marginBottom: 20 }}>
              تسوية العمولة
            </h2>

            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  اسم الشريك
                </label>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                  {selectedCommission.partner_name}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  الفترة الزمنية
                </label>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                  {selectedCommission.month}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  المبلغ المكتسب
                </label>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.primary, margin: 0 }}>
                  {selectedCommission.earned_amount.toFixed(0)} ج.م
                </p>
              </div>

              <div
                style={{
                  backgroundColor: C.warningSoft,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                  color: C.warning,
                  lineHeight: 1.5,
                }}
              >
                ⚠️ تأكد من تحويل المبلغ للشريك قبل تسوية هذه العمولة
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowSettleModal(false)}
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
                onClick={handleSettlement}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: C.success,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: processing ? "not-allowed" : "pointer",
                  opacity: processing ? 0.6 : 1,
                }}
              >
                {processing ? "جاري التسوية..." : "تسوية العمولة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
