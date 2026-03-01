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

export default function RegularAdminInvitePartnersPage() {
  const auth = useAdminAuth();
  const [invitations, setInvitations] = useState<PartnerInvitation[]>([]);

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!auth.user || !auth.isRegularAdmin) return;
    loadInvitations();
  }, [auth.user, auth.isRegularAdmin]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: err } = await supabase
        .from("partner_invitations")
        .select("*")
        .eq("invited_by", auth.user?.id)
        .eq("invited_by_role", "regular_admin")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setInvitations(data || []);
    } catch (err: any) {
      console.error("Error loading invitations:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError("جميع الحقول مطلوبة");
      return;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const invitationData = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        phone: formData.phone,
        invited_by: auth.user?.id,
        invited_by_role: "regular_admin",
        status: "pending",
        regional_manager_approval: null,
        super_admin_approval: "pending",
      };

      const { error: err } = await (supabase.from("partner_invitations") as any)
        .insert(invitationData);

      if (err) {
        if (err.message.includes("unique")) {
          throw new Error("هذا البريد الإلكتروني مستخدم بالفعل");
        }
        throw err;
      }

      setSuccess("تم إرسال الدعوة بنجاح! (بانتظار موافقة السوبر ادمن أو مدير إقليمي)");
      setFormData({ name: "", email: "", phone: "" });
      await loadInvitations();
    } catch (err: any) {
      console.error("Error sending invitation:", err);
      setError(err.message || "حدث خطأ أثناء إرسال الدعوة");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "pending") return inv.status === "pending";
    if (filter === "approved") return inv.status === "accepted";
    if (filter === "rejected") return inv.status === "rejected";
    return true;
  });

  if (!auth.isRegularAdmin) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: C.danger }}>
        <h2>غير مسموح</h2>
        <p>فقط مدير عادي يمكنه دعوة الشركاء من هنا</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: C.text, marginBottom: "0.5rem" }}>دعوة شريك جديد</h1>
        <p style={{ color: C.textMuted }}>ادعُ شركاء جدد (بانتظار موافقة السوبر ادمن أو مدير إقليمي)</p>
      </div>

      {/* Form */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="اسم / اسم المشروع"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "0.75rem",
                fontFamily: "inherit",
              }}
            />
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "0.75rem",
                fontFamily: "inherit",
              }}
            />
          </div>

          <input
            type="tel"
            placeholder="رقم الهاتف"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            style={{
              width: "100%",
              border: `1px solid ${C.border}`,
              borderRadius: "8px",
              padding: "0.75rem",
              marginBottom: "1rem",
              fontFamily: "inherit",
            }}
          />

          {error && (
            <div
              style={{
                background: C.dangerSoft,
                color: C.danger,
                padding: "0.75rem",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: C.successSoft,
                color: "#065F46",
                padding: "0.75rem",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: C.primary,
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
              fontFamily: "inherit",
              fontSize: "1rem",
            }}
          >
            {submitting ? "جاري الإرسال..." : "📨 إرسال الدعوة"}
          </button>
        </form>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: C.border, margin: "2rem 0" }} />

      {/* Invitations List */}
      <div>
        <h2 style={{ color: C.text, marginBottom: "1rem" }}>الدعوات المرسلة</h2>

        {/* Filter */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
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
            لا توجد دعوات
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
                  padding: "1rem",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4 style={{ color: C.text, margin: "0 0 0.25rem 0" }}>{inv.name}</h4>
                  <p style={{ color: C.textMuted, margin: "0.25rem 0" }}>{inv.email}</p>
                  <p style={{ color: C.textMuted, margin: "0.25rem 0", fontSize: "0.875rem" }}>
                    📱 {inv.phone}
                  </p>
                </div>
                <div style={{ textAlign: "center", minWidth: "150px" }}>
                  <span
                    style={{
                      background:
                        inv.status === "accepted"
                          ? C.successSoft
                          : inv.status === "rejected"
                            ? C.dangerSoft
                            : C.warningSoft,
                      color:
                        inv.status === "accepted"
                          ? "#065F46"
                          : inv.status === "rejected"
                            ? C.danger
                            : "#92400E",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                    }}
                  >
                    {inv.status === "accepted" && "✅ مقبول"}
                    {inv.status === "pending" && "⏳ قيد الانتظار"}
                    {inv.status === "rejected" && "❌ مرفوض"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
