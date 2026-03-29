"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE", text: "#1F1B2E", textMuted: "#6B6480",
  surface: "#FFFFFF", border: "#E7E3FF", bg: "#FAFAFF",
  success: "#34D399", successSoft: "#D1FAE5", danger: "#EF4444", dangerSoft: "#FEE2E2",
  warning: "#F59E0B", warningSoft: "#FEF3C7",
};

interface Invitation {
  id: string; name: string; email: string; phone: string;
  admin_type: string; status: string; super_admin_approval: string; created_at: string;
}

export default function InviteCustomerServicePage() {
  const auth = useAdminAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    loadInvitations();
  }, [auth.user, auth.loading]);

  const loadInvitations = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await (supabase.from("admin_invitations") as any)
        .select("*")
        .eq("admin_type", "customer_service")
        .order("created_at", { ascending: false });
      setInvitations(data || []);
    } catch (e) { console.error("Error:", e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError("جميع الحقول مطلوبة"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("البريد الإلكتروني غير صحيح"); return;
    }
    if (invitations.find(inv => inv.email === formData.email)) {
      setError("هذا البريد الإلكتروني مستخدم بالفعل"); return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error: err } = await (supabase.from("admin_invitations") as any).insert({
        name: formData.name, email: formData.email, phone: formData.phone,
        admin_type: "customer_service",
        invited_by: auth.user?.id,
        status: "pending",
        super_admin_approval: auth.isSuperAdmin ? "approved" : "pending",
      });
      if (err) throw err;

      await (supabase.from("admin_logs") as any).insert({
        admin_id: auth.user?.id, action: "invite_customer_service",
        entity_type: "user", entity_id: formData.email,
        new_data: { name: formData.name, email: formData.email, role: "customer_service" },
      });

      setSuccess(`تم إرسال الدعوة لـ ${formData.name}${auth.isSuperAdmin ? " (معتمدة تلقائياً)" : ". تنتظر موافقة السوبر أدمن"}`);
      setFormData({ name: "", email: "", phone: "" });
      await loadInvitations();
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء إرسال الدعوة");
    } finally { setSubmitting(false); }
  };

  const filteredInvitations = invitations.filter(inv =>
    filter === "all" || inv.super_admin_approval === filter
  );

  if (auth.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", border: `4px solid ${C.border}`, borderTopColor: C.primary, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: C.textMuted }}>جاري تحميل البيانات...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          🎧 دعوة مسؤول خدمة العملاء
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          دعوة مسؤول جديد لخدمة العملاء — يمكنه الرد على تذاكر الدعم ومراقبة المحادثات
        </p>
      </div>

      {/* Form */}
      <div style={{ backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, marginBottom: 20 }}>📋 استمارة الدعوة</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>الاسم الكامل</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: أحمد محمد"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", direction: "rtl" }} />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>البريد الإلكتروني</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="cs@hillaha.com"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", direction: "ltr" }} />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>رقم الجوال</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", direction: "ltr" }} />
            </div>
          </div>

          {error && <div style={{ backgroundColor: C.dangerSoft, color: C.danger, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{error}</div>}
          {success && <div style={{ backgroundColor: C.successSoft, color: C.success, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{success}</div>}

          <button type="submit" disabled={submitting}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: C.primary, color: "white", fontWeight: 900, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "جاري الإرسال..." : "📨 إرسال الدعوة"}
          </button>
        </form>
      </div>

      {/* Invitations List */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0, marginBottom: 16 }}>📬 الدعوات ({invitations.length})</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["all", "pending", "approved", "rejected"] as const).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: filter === tab ? C.primary : C.primarySoft, color: filter === tab ? "white" : C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {tab === "all" ? "الكل" : tab === "pending" ? "قيد الانتظار" : tab === "approved" ? "معتمد" : "مرفوض"}
            </button>
          ))}
        </div>

        {filteredInvitations.length === 0 ? (
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.textMuted }}>لا توجد دعوات</div>
        ) : (
          <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {filteredInvitations.map((inv, idx) => (
              <div key={inv.id} style={{ padding: 16, borderBottom: idx < filteredInvitations.length - 1 ? `1px solid ${C.border}` : "none", display: "grid", gridTemplateColumns: "1fr 150px 150px", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{inv.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>📧 {inv.email} | 📱 {inv.phone}</div>
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{new Date(inv.created_at).toLocaleDateString("ar-EG")}</div>
                <span style={{
                  padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12, textAlign: "center",
                  backgroundColor: inv.super_admin_approval === "approved" ? C.successSoft : inv.super_admin_approval === "pending" ? C.warningSoft : C.dangerSoft,
                  color: inv.super_admin_approval === "approved" ? C.success : inv.super_admin_approval === "pending" ? C.warning : C.danger,
                }}>
                  {inv.super_admin_approval === "approved" ? "معتمد" : inv.super_admin_approval === "pending" ? "قيد الانتظار" : "مرفوض"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
