"use client";

import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#34D399",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

type ServicePrice = {
  id: string;
  category: string;
  icon: string;
  label_ar: string;
  description_ar: string;
  price: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Tab = {
  key: string;
  label: string;
};

const TABS: Tab[] = [
  { key: "delivery_p2p", label: "توصيل P2P" },
  { key: "cleaning", label: "تنظيف" },
  { key: "electrical", label: "كهرباء" },
];

export default function PricingPage() {
  const auth = useAdminAuth();
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("delivery_p2p");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAllowed =
    auth.isSuperAdmin || auth.isRegionalManager || auth.isAccountant;

  useEffect(() => {
    if (auth.user && isAllowed) {
      loadData();
    }
  }, [auth.user, auth.isSuperAdmin, auth.isRegionalManager, auth.isAccountant]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const [servicesRes, pendingRes] = await Promise.all([
        (supabase as any)
          .from("service_prices")
          .select("*")
          .order("sort_order"),
        (supabase as any)
          .from("price_change_requests")
          .select("service_price_id")
          .eq("approval_status", "pending"),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      setServices((servicesRes.data as ServicePrice[]) || []);

      const ids = new Set<string>();
      if (!pendingRes.error && pendingRes.data) {
        for (const r of pendingRes.data as { service_price_id: string }[]) {
          ids.add(r.service_price_id);
        }
      }
      setPendingIds(ids);
    } catch (err) {
      console.error("Error loading pricing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (service: ServicePrice) => {
    setEditingId(service.id);
    setEditPrice(String(service.price));
    setEditReason("");
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditPrice("");
    setEditReason("");
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!editingId || !auth.user) return;

    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      setErrorMsg("يرجى إدخال سعر صحيح أكبر من صفر");
      return;
    }

    if (!auth.isSuperAdmin && !editReason.trim()) {
      setErrorMsg("يرجى كتابة سبب تعديل السعر");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const oldService = services.find((s) => s.id === editingId);
      const oldPrice = oldService?.price ?? 0;

      if (auth.isSuperAdmin) {
        // Super admin: update directly
        const { error: updateErr } = await (supabase as any)
          .from("service_prices")
          .update({ price: newPrice, updated_at: new Date().toISOString() })
          .eq("id", editingId);

        if (updateErr) throw updateErr;

        // Log the change
        await (supabase as any).from("price_change_logs").insert({
          service_price_id: editingId,
          old_price: oldPrice,
          new_price: newPrice,
          changed_by: auth.user.id,
          reason: editReason.trim() || "تعديل مباشر من السوبر أدمن",
        });

        setSuccessMsg("تم تحديث السعر بنجاح");
        closeEdit();
        await loadData();
      } else {
        // Regional manager or accountant: submit request
        const { error: reqErr } = await (supabase as any)
          .from("price_change_requests")
          .insert({
            service_price_id: editingId,
            old_price: oldPrice,
            new_price: newPrice,
            requested_by: auth.user.id,
            reason: editReason.trim(),
            approval_status: "pending",
          });

        if (reqErr) throw reqErr;

        setSuccessMsg(
          "تم إرسال طلب تعديل السعر — بانتظار اعتماد السوبر أدمن"
        );
        closeEdit();
        await loadData();
      }
    } catch (err: any) {
      console.error("Error saving price:", err);
      setErrorMsg("حدث خطأ أثناء الحفظ: " + (err?.message || "خطأ غير معروف"));
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = services.filter((s) => s.category === activeTab);

  // ---------- Auth loading ----------
  if (auth.loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
        جارٍ التحميل...
      </div>
    );
  }

  // ---------- Not allowed ----------
  if (!isAllowed) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: C.danger, fontWeight: 700 }}>
          هذه الصفحة متاحة فقط للسوبر أدمن والمدير الإقليمي والمحاسب
        </p>
      </div>
    );
  }

  // ---------- Data loading spinner ----------
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: `4px solid ${C.border}`,
              borderTopColor: C.primary,
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: C.textMuted }}>جاري تحميل الأسعار...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ---------- Main render ----------
  return (
    <div dir="rtl" style={{ padding: 24, background: C.bg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: C.text,
            margin: 0,
            marginBottom: 4,
          }}
        >
          {"💰"} إدارة الأسعار
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          {auth.isSuperAdmin
            ? "يمكنك تعديل الأسعار مباشرة"
            : "يمكنك طلب تعديل الأسعار — تحتاج اعتماد السوبر أدمن"}
        </p>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div
          style={{
            background: C.successSoft,
            border: `1px solid ${C.success}`,
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 700,
            color: "#065F46",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#065F46",
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const tabPendingCount = services
            .filter((s) => s.category === tab.key && pendingIds.has(s.id))
            .length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                border: `2px solid ${isActive ? C.primary : C.border}`,
                background: isActive ? C.primarySoft : C.surface,
                color: isActive ? C.primary : C.textMuted,
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              {tab.label}
              {tabPendingCount > 0 && (
                <span
                  style={{
                    background: C.warningSoft,
                    color: C.warning,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 8,
                  }}
                >
                  {tabPendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Service cards grid */}
      {filteredServices.length === 0 ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            color: C.textMuted,
            fontSize: 14,
          }}
        >
          لا توجد خدمات في هذا التصنيف
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {filteredServices.map((service) => {
            const hasPending = pendingIds.has(service.id);

            return (
              <div
                key={service.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${hasPending ? C.warning : C.border}`,
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: hasPending
                    ? `0 4px 12px ${C.warning}25`
                    : "0 1px 3px rgba(0,0,0,0.06)",
                  transition: "all 0.2s",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: C.primarySoft,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                      }}
                    >
                      {service.icon}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: C.text,
                          margin: 0,
                          marginBottom: 2,
                        }}
                      >
                        {service.label_ar}
                      </h3>
                      <p
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          margin: 0,
                        }}
                      >
                        {service.description_ar}
                      </p>
                    </div>
                  </div>

                  {hasPending && (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        background: C.warningSoft,
                        color: C.warning,
                        whiteSpace: "nowrap",
                      }}
                    >
                      بانتظار الاعتماد
                    </span>
                  )}
                </div>

                {/* Price */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: C.bg,
                    marginBottom: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: C.textMuted }}
                  >
                    السعر الحالي
                  </span>
                  <span
                    style={{ fontSize: 20, fontWeight: 900, color: C.primary }}
                  >
                    {service.price.toLocaleString("ar-EG")} جنيه
                  </span>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => openEdit(service)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: `1px solid ${C.primary}`,
                    background: "transparent",
                    color: C.primary,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = C.primary;
                    (e.currentTarget as HTMLElement).style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color = C.primary;
                  }}
                >
                  تعديل السعر
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ Edit Modal ============ */}
      {editingId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            dir="rtl"
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 24,
              maxWidth: 460,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: C.text,
                  margin: 0,
                }}
              >
                تعديل السعر
              </h2>
              <button
                onClick={closeEdit}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: C.bg,
                  fontSize: 18,
                  cursor: "pointer",
                  color: C.textMuted,
                }}
              >
                x
              </button>
            </div>

            {/* Current info */}
            {(() => {
              const svc = services.find((s) => s.id === editingId);
              if (!svc) return null;
              return (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: C.primarySoft,
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{svc.icon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: C.text,
                      }}
                    >
                      {svc.label_ar}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        marginTop: 2,
                      }}
                    >
                      السعر الحالي:{" "}
                      <strong style={{ color: C.primary }}>
                        {svc.price.toLocaleString("ar-EG")} جنيه
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* New price input */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textMuted,
                  marginBottom: 6,
                }}
              >
                السعر الجديد (جنيه)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 18,
                  fontWeight: 800,
                  textAlign: "center",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="0.00"
              />
            </div>

            {/* Reason textarea */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textMuted,
                  marginBottom: 6,
                }}
              >
                سبب التعديل{" "}
                {!auth.isSuperAdmin && (
                  <span style={{ color: C.danger }}>(مطلوب)</span>
                )}
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                placeholder="اكتب سبب تعديل السعر..."
              />
            </div>

            {/* Error in modal */}
            {errorMsg && (
              <div
                style={{
                  background: C.dangerSoft,
                  border: `1px solid ${C.danger}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.danger,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Info banner for non-super-admin */}
            {!auth.isSuperAdmin && (
              <div
                style={{
                  background: C.warningSoft,
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#92400E",
                }}
              >
                سيتم إرسال طلب تعديل السعر للسوبر أدمن للاعتماد
              </div>
            )}

            {/* Modal buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={closeEdit}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: "transparent",
                  color: C.text,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: saving
                    ? C.textMuted
                    : `linear-gradient(135deg, ${C.primary}, #EC4899)`,
                  color: "white",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving
                  ? "جارٍ الحفظ..."
                  : auth.isSuperAdmin
                  ? "حفظ السعر"
                  : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
