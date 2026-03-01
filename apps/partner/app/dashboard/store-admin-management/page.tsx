"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import type { StoreAdmin } from "@hillaha/core";

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

export default function AssignStoreAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [storeAdmins, setStoreAdmins] = useState<StoreAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", storeName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const getUser = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          // Get partner ID
          const { data: profile } = await (supabase
            .from("profiles") as any)
            .select("partner_id")
            .eq("id", user.id)
            .single();

          if (profile && profile.partner_id) {
            setPartnerId(profile.partner_id);
            await loadStoreAdmins(profile.partner_id);
          }
        }
      } catch (err) {
        console.error("Error getting user:", err);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const loadStoreAdmins = async (pId: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: err } = await (supabase
        .from("store_admins") as any)
        .select("*")
        .eq("partner_id", pId)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setStoreAdmins(data || []);
    } catch (err: any) {
      console.error("Error loading store admins:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError("البيانات المطلوبة: الاسم والبريد والهاتف");
      return;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }

    if (!partnerId || !userId) {
      setError("فقط الشركاء يمكنهم تعيين مديري المتاجر");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const adminData = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        phone: formData.phone,
        store_name: formData.storeName || null,
        partner_id: partnerId,
        assigned_by: userId,
        status: "pending",
      };

      const { error: err } = await (supabase.from("store_admins") as any)
        .insert(adminData);

      if (err) {
        if (err.message.includes("unique")) {
          throw new Error("هذا البريد الإلكتروني مستخدم بالفعل");
        }
        throw err;
      }

      setSuccess("تم إضافة مدير المتجر بنجاح!");
      setFormData({ name: "", email: "", phone: "", storeName: "" });
      await loadStoreAdmins(partnerId);
    } catch (err: any) {
      console.error("Error assigning store admin:", err);
      setError(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm("هل تريد حقاً حذف هذا المدير؟")) return;

    setDeleting((prev) => ({ ...prev, [adminId]: true }));

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const { error: err } = await (supabase.from("store_admins") as any)
        .delete()
        .eq("id", adminId);

      if (err) throw err;

      if (partnerId) {
        await loadStoreAdmins(partnerId);
      }
    } catch (err: any) {
      console.error("Error deleting:", err);
      alert(err.message || "حدث خطأ");
    } finally {
      setDeleting((prev) => ({ ...prev, [adminId]: false }));
    }
  };

  const filteredAdmins = storeAdmins.filter((admin) => {
    if (filter === "all") return true;
    return admin.status === filter;
  });

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!partnerId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: C.danger }}>
        <h2>غير مسموح</h2>
        <p>فقط الشركاء يمكنهم تعيين مديري المتاجر</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: C.text, marginBottom: "0.5rem" }}>إدارة مديري المتاجر</h1>
        <p style={{ color: C.textMuted }}>أضف وأدر مديري المتاجر والفروع</p>
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
        <h2 style={{ color: C.text, marginBottom: "1rem", fontSize: "1.1rem" }}>إضافة مدير متجر</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="الاسم الكامل"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <input
              type="tel"
              placeholder="رقم الهاتف"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "0.75rem",
                fontFamily: "inherit",
              }}
            />
            <input
              type="text"
              placeholder="اسم المتجر/الفرع (اختياري)"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "0.75rem",
                fontFamily: "inherit",
              }}
            />
          </div>

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
            {submitting ? "جاري الإضافة..." : "➕ إضافة مدير متجر"}
          </button>
        </form>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: C.border, margin: "2rem 0" }} />

      {/* Store Admins List */}
      <div>
        <h2 style={{ color: C.text, marginBottom: "1rem" }}>مديري المتاجر</h2>

        {/* Filter */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {(["all", "pending", "active", "inactive"] as const).map((f) => (
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
                fontSize: "0.875rem",
              }}
            >
              {f === "all" && "الكل"}
              {f === "pending" && "⏳ قيد الانتظار"}
              {f === "active" && "✅ نشط"}
              {f === "inactive" && "❌ غير نشط"}
            </button>
          ))}
        </div>

        {filteredAdmins.length === 0 ? (
          <div
            style={{
              background: C.bg,
              padding: "2rem",
              borderRadius: "8px",
              textAlign: "center",
              color: C.textMuted,
            }}
          >
            لا يوجد مديري متاجر
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: "8px",
                  padding: "1rem",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <h4 style={{ color: C.text, margin: "0 0 0.25rem 0" }}>{admin.name}</h4>
                  <p style={{ color: C.textMuted, margin: "0.25rem 0", fontSize: "0.875rem" }}>
                    📧 {admin.email}
                  </p>
                  <p style={{ color: C.textMuted, margin: "0.25rem 0", fontSize: "0.875rem" }}>
                    📱 {admin.phone}
                  </p>
                  {admin.store_name && (
                    <p style={{ color: C.textMuted, margin: "0.25rem 0", fontSize: "0.875rem" }}>
                      🏪 {admin.store_name}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span
                    style={{
                      background:
                        admin.status === "active"
                          ? C.successSoft
                          : admin.status === "inactive"
                            ? C.dangerSoft
                            : C.warningSoft,
                      color:
                        admin.status === "active"
                          ? "#065F46"
                          : admin.status === "inactive"
                            ? C.danger
                            : "#92400E",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {admin.status === "active" && "✅ نشط"}
                    {admin.status === "inactive" && "❌ غير نشط"}
                    {admin.status === "pending" && "⏳ بانتظار"}
                  </span>

                  <button
                    onClick={() => handleDelete(admin.id)}
                    disabled={deleting[admin.id]}
                    style={{
                      background: C.danger,
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.3rem 0.6rem",
                      cursor: deleting[admin.id] ? "not-allowed" : "pointer",
                      opacity: deleting[admin.id] ? 0.6 : 1,
                      fontSize: "0.75rem",
                      fontFamily: "inherit",
                    }}
                  >
                    {deleting[admin.id] ? "..." : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
