"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";
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

export default function InviteRegularAdminPage() {
  const auth = useAdminAuth();
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!auth.user) return;
    loadInvitations();
  }, [auth.user]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: err } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("admin_type", "regular_admin")
        .eq("invited_by", auth.user?.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error loading invitations:", error);
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

    if (!/^[0-9\-\+]{10,}$/.test(formData.phone)) {
      setError("رقم الجوال غير صحيح");
      return;
    }

    const existingInvitation = invitations.find(inv => inv.email === formData.email);
    if (existingInvitation) {
      setError("هذا البريد الإلكتروني مستخدم بالفعل");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: err } = await (supabase.from("admin_invitations") as any)
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          admin_type: "regular_admin",
          invited_by: auth.user?.id,
          status: "pending",
          super_admin_approval: "pending", // ينتظر موافقة السوبر أدمن
        })
        .select();

      if (err) throw err;

      // Log action
      await (supabase.from("admin_logs") as any).insert({
        admin_id: auth.user?.id,
        action: "invite_regular_admin",
        entity_type: "partner",
        entity_id: data?.[0]?.id,
        new_data: { name: formData.name, email: formData.email },
      });

      setSuccess(`✅ تم إرسال الدعوة لـ ${formData.name}. ستنتظر موافقة مالك المنصة`);
      setFormData({ name: "", email: "", phone: "" });
      await loadInvitations();
    } catch (error) {
      console.error("Error creating invitation:", error);
      setError("حدث خطأ أثناء إرسال الدعوة");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvitations = invitations.filter(
    inv => filter === "all" || (filter === "approved" ? inv.super_admin_approval === "approved" : filter === "rejected" ? inv.super_admin_approval === "rejected" : inv.super_admin_approval === "pending")
  );

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          دعوة مديرين عاديين
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          استدعِ مديرين جدد (ينتظر موافقة مالك المنصة)
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
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, marginBottom: 20 }}>
          📋 استمارة الدعوة
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>
                الاسم الكامل
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: محمد إبراهيم"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 14,
                  fontFamily: "inherit",
                  direction: "rtl",
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
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 14,
                  fontFamily: "inherit",
                  direction: "ltr",
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
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                fontSize: 14,
                fontFamily: "inherit",
                direction: "ltr",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: C.dangerSoft,
                color: C.danger,
                padding: 12,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div
              style={{
                backgroundColor: C.successSoft,
                color: C.success,
                padding: 12,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              ✓ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
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

      {/* List */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, marginBottom: 16 }}>
          📬 قائمة الدعوات ({invitations.length})
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["all", "pending", "approved", "rejected"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
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
              {tab === "all"
                ? "الكل"
                : tab === "pending"
                ? "قيد الانتظار"
                : tab === "approved"
                ? "موافق"
                : "مرفوض"}
            </button>
          ))}
        </div>

        {filteredInvitations.length === 0 ? (
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
            لا توجد دعوات
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
            {filteredInvitations.map((inv, idx) => (
              <div
                key={inv.id}
                style={{
                  padding: 16,
                  borderBottom: idx < filteredInvitations.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "grid",
                  gridTemplateColumns: "150px 1fr 150px 150px",
                  gap: 16,
                  alignItems: "center",
                  backgroundColor: idx % 2 === 0 ? "transparent" : C.primarySoft + "20",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>موافقة المالك</div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 12,
                      backgroundColor:
                        inv.super_admin_approval === "approved"
                          ? C.successSoft
                          : inv.super_admin_approval === "pending"
                          ? C.warningSoft
                          : C.dangerSoft,
                      color:
                        inv.super_admin_approval === "approved"
                          ? C.success
                          : inv.super_admin_approval === "pending"
                          ? C.warning
                          : C.danger,
                    }}
                  >
                    {inv.super_admin_approval === "approved"
                      ? "موافق ✓"
                      : inv.super_admin_approval === "pending"
                      ? "قيد الانتظار"
                      : "مرفوض ✗"}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>
                    {inv.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    📧 {inv.email}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    📱 {inv.phone}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>التاريخ</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    {new Date(inv.created_at).toLocaleDateString("ar-EG")}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>الحالة</div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
