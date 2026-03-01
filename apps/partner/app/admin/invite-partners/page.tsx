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
  bg: "#FAFAFF",
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
  invited_by_name: string;
  invited_type: string;
  created_at: string;
}

export default function SuperAdminInvitePartnersPage() {
  const auth = useAdminAuth();
  const [invitations, setInvitations] = useState<PartnerInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  useEffect(() => {
    if (!auth.user || !auth.isSuperAdmin) {
      setError("فقط السوبر أدمن يمكنه دعوة الشركاء");
      return;
    }
    loadInvitations();
  }, [auth.user, auth.isSuperAdmin]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const { data, error: err } = await (supabase
        .from("partner_invitations") as any)
        .select(`*`)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setInvitations(data || []);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading invitations:", err);
      setError(err.message);
      setLoading(false);
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }

    const existingInvitation = invitations.find((inv) => inv.email === formData.email);
    if (existingInvitation && existingInvitation.status === "pending") {
      setError("تم دعوة هذا البريد بالفعل");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const { error: err } = await (supabase.from("partner_invitations") as any).insert({
        email: formData.email.toLowerCase(),
        name: formData.name,
        phone: formData.phone,
        status: "pending",
        invited_by: auth.user?.id,
        invited_type: "super_admin",
      });

      if (err) throw new Error(err.message || "خطأ عند إدراج الدعوة");

      setSuccess(`✅ تم إرسال الدعوة لـ ${formData.name}`);
      setFormData({ name: "", email: "", phone: "" });
      await loadInvitations();
    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvitations = invitations.filter(
    (inv) => filter === "all" || inv.status === filter
  );

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: C.danger }}>
        ⚠️ فقط السوبر أدمن يمكنه دعوة الشركاء
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: "0 0 8px 0" }}>
          📨 دعوة الشركاء الجدد
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          دعوة شركاء جدد للانضمام إلى المنصة (صلاحية السوبر أدمن)
        </p>
      </div>

      {/* Form */}
      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: "0 0 20px 0" }}>
          📋 نموذج الدعوة
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>
                اسم المتجر/الشريك
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: مطعم البهار"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="partner@example.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 14,
                  direction: "ltr",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>
              رقم الجوال
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                fontSize: 14,
                direction: "ltr",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{ backgroundColor: C.dangerSoft, color: C.danger, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ backgroundColor: C.successSoft, color: C.success, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: C.primary,
              color: "white",
              fontWeight: 900,
              fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "جاري الإرسال..." : "📨 إرسال الدعوة"}
          </button>
        </form>
      </div>

      {/* Invitations List */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: "0 0 16px 0" }}>
          📬 قائمة الدعوات ({invitations.length})
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["all", "pending", "accepted", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: filter === tab ? C.primary : C.primarySoft,
                color: filter === tab ? "white" : C.primary,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {tab === "all" ? "الكل" : tab === "pending" ? "قيد الانتظار" : tab === "accepted" ? "مقبول" : "مرفوض"}
            </button>
          ))}
        </div>

        {filteredInvitations.length === 0 ? (
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.textMuted }}>
            لا توجد دعوات
          </div>
        ) : (
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {filteredInvitations.map((inv, idx) => (
              <div
                key={inv.id}
                style={{
                  padding: 16,
                  borderBottom: idx < filteredInvitations.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr 150px 150px",
                  gap: 16,
                  alignItems: "center",
                  backgroundColor: idx % 2 === 0 ? "transparent" : C.primarySoft + "20",
                }}
              >
                <div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 12,
                      backgroundColor:
                        inv.status === "accepted" ? C.successSoft : inv.status === "pending" ? C.warningSoft : C.dangerSoft,
                      color: inv.status === "accepted" ? C.success : inv.status === "pending" ? C.warning : C.danger,
                    }}
                  >
                    {inv.status === "accepted" ? "مقبول ✓" : inv.status === "pending" ? "قيد الانتظار" : "مرفوض ✗"}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                    {inv.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {inv.email}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {new Date(inv.created_at).toLocaleDateString("ar-EG")}
                </div>

                <div style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>
                  {inv.invited_type === "super_admin" ? "السوبر أدمن" : "مدير إقليمي"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
