"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

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

type PriceChangeRequest = {
  id: string;
  service_price_id: string;
  requested_by: string;
  old_price: number;
  new_price: number;
  reason: string;
  approval_status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  requested_at: string;
  service_prices?: {
    label_ar: string;
    icon: string;
    category: string;
  };
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  admin_type: string | null;
};

type FilterTab = "pending" | "approved" | "rejected";
type SectionTab = "service_prices" | "delivery_pricing";

type DpChangeRequest = {
  id: string;
  delivery_rule_id: string | null;
  change_type: "create" | "update";
  current_label_ar: string | null;
  current_base_price: number | null;
  current_per_km_price: number | null;
  current_base_distance_km: number | null;
  current_min_fee: number | null;
  current_max_fee: number | null;
  current_max_distance_km: number | null;
  proposed_label_ar: string | null;
  proposed_base_price: number | null;
  proposed_per_km_price: number | null;
  proposed_base_distance_km: number | null;
  proposed_min_fee: number | null;
  proposed_max_fee: number | null;
  proposed_max_distance_km: number | null;
  proposed_city: string | null;
  reason: string;
  requested_by: string;
  requested_at: string;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
};

export default function ApprovePricingPage() {
  const auth = useAdminAuth();
  const [requests, setRequests] = useState<PriceChangeRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [section, setSection] = useState<SectionTab>("service_prices");
  const [dpRequests, setDpRequests] = useState<DpChangeRequest[]>([]);
  const [dpRejectModalId, setDpRejectModalId] = useState<string | null>(null);
  const [dpRejectionReason, setDpRejectionReason] = useState("");

  useEffect(() => {
    if (auth.loading) return;
    if (auth.user && auth.isSuperAdmin) loadRequests();
  }, [auth.user, auth.isSuperAdmin, auth.loading]);

  useEffect(() => {
    if (auth.user && auth.isSuperAdmin) loadRequests();
  }, [filter]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const [{ data, error }, dpRes] = await Promise.all([
        (supabase as any)
          .from("price_change_requests")
          .select("*, service_prices:service_price_id(label_ar, icon, category)")
          .order("requested_at", { ascending: false }),
        (supabase as any)
          .from("delivery_pricing_change_requests")
          .select("*")
          .order("requested_at", { ascending: false }),
      ]);

      if (error) throw error;

      const allRequests = (data || []) as PriceChangeRequest[];
      setRequests(allRequests);
      setDpRequests((dpRes.data || []) as DpChangeRequest[]);

      // Load requester profiles
      const uniqueRequesterIds = [
        ...new Set([
          ...allRequests.map((r) => r.requested_by),
          ...(dpRes.data || []).map((r: any) => r.requested_by),
        ].filter(Boolean)),
      ];

      if (uniqueRequesterIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, email, role, admin_type")
          .in("id", uniqueRequesterIds);

        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          (profilesData as Profile[]).forEach((p) => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error loading price change requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => r.approval_status === filter);

  const counts = {
    pending: requests.filter((r) => r.approval_status === "pending").length,
    approved: requests.filter((r) => r.approval_status === "approved").length,
    rejected: requests.filter((r) => r.approval_status === "rejected").length,
  };

  const dpFilteredRequests = dpRequests.filter((r) => r.approval_status === filter);
  const dpCounts = {
    pending: dpRequests.filter((r) => r.approval_status === "pending").length,
    approved: dpRequests.filter((r) => r.approval_status === "approved").length,
    rejected: dpRequests.filter((r) => r.approval_status === "rejected").length,
  };

  const handleDpApprove = async (id: string) => {
    setActing(id);
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;
      const { error: upErr } = await (supabase as any)
        .from("delivery_pricing_change_requests")
        .update({ approval_status: "approved", approved_by: auth.user.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (upErr) throw upErr;
      const { data: rpcResult, error: rpcErr } = await (supabase as any).rpc("apply_delivery_pricing_change", { p_request_id: id, p_admin_id: auth.user.id });
      if (rpcErr) throw rpcErr;
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error);
      showToast("تم اعتماد تعديل تسعير التوصيل بنجاح", "success");
      await loadRequests();
    } catch (error: any) {
      showToast("خطأ: " + (error?.message || ""), "error");
    } finally { setActing(null); }
  };

  const handleDpReject = async (id: string) => {
    if (!dpRejectionReason.trim()) return;
    setActing(id);
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;
      const { error } = await (supabase as any)
        .from("delivery_pricing_change_requests")
        .update({ approval_status: "rejected", approved_by: auth.user.id, approved_at: new Date().toISOString(), rejection_reason: dpRejectionReason.trim() })
        .eq("id", id);
      if (error) throw error;
      showToast("تم رفض الطلب", "success");
      setDpRejectModalId(null); setDpRejectionReason("");
      await loadRequests();
    } catch (error: any) {
      showToast("خطأ: " + (error?.message || ""), "error");
    } finally { setActing(null); }
  };

  const getRoleName = (profile: Profile | undefined): string => {
    if (!profile) return "غير معروف";
    if (profile.role === "super_admin") return "سوبر أدمن";
    if (profile.role === "admin" && profile.admin_type === "regional_manager") return "مدير إقليمي";
    if (profile.role === "admin" && profile.admin_type === "regular_admin") return "أدمن عادي";
    if (profile.role === "accountant") return "محاسب";
    return profile.role;
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const { error: updateError } = await (supabase as any)
        .from("price_change_requests")
        .update({
          approval_status: "approved",
          approved_by: auth.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      const { error: rpcError } = await (supabase as any).rpc("apply_price_change", {
        p_request_id: id,
        p_admin_id: auth.user.id,
      });

      if (rpcError) throw rpcError;

      showToast("تم اعتماد تعديل السعر بنجاح", "success");
      await loadRequests();
    } catch (error: any) {
      console.error("Error approving price change:", error);
      showToast("خطأ في اعتماد التعديل: " + (error?.message || ""), "error");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) return;
    setActing(id);
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const { error: updateError } = await (supabase as any)
        .from("price_change_requests")
        .update({
          approval_status: "rejected",
          approved_by: auth.user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Log to price_change_logs
      await (supabase as any).from("price_change_logs").insert({
        request_id: id,
        admin_id: auth.user.id,
        action: "rejected",
        rejection_reason: rejectionReason.trim(),
      });

      showToast("تم رفض تعديل السعر", "success");
      setRejectModalId(null);
      setRejectionReason("");
      await loadRequests();
    } catch (error: any) {
      console.error("Error rejecting price change:", error);
      showToast("خطأ في رفض التعديل: " + (error?.message || ""), "error");
    } finally {
      setActing(null);
    }
  };

  // --- Loading state ---
  if (auth.loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
        جارٍ التحميل...
      </div>
    );
  }

  // --- Access control ---
  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: C.danger, fontWeight: 700, fontSize: 16 }}>
          ⛔ هذه الصفحة متاحة فقط للسوبر أدمن
        </p>
      </div>
    );
  }

  // --- Data loading ---
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
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
          <p style={{ color: C.textMuted }}>جاري تحميل طلبات تعديل الأسعار...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: 24, background: C.bg, minHeight: "100vh" }}>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 28px",
            borderRadius: 12,
            background: toast.type === "success" ? C.success : C.danger,
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 14,
            zIndex: 2000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
          ✅ اعتماد تعديلات الأسعار
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          مراجعة واعتماد أو رفض طلبات تعديل أسعار الخدمات
        </p>
      </div>

      {/* Section toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { value: "service_prices" as SectionTab, label: "أسعار الخدمات", count: counts.pending },
          { value: "delivery_pricing" as SectionTab, label: "تسعير التوصيل", count: dpCounts.pending },
        ].map((s) => (
          <button key={s.value} onClick={() => setSection(s.value)} style={{
            padding: "10px 20px", borderRadius: 10,
            border: `2px solid ${section === s.value ? C.primary : C.border}`,
            background: section === s.value ? C.primarySoft : C.surface,
            color: section === s.value ? C.primary : C.textMuted,
            fontWeight: 800, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {s.label}
            {s.count > 0 && (
              <span style={{ background: C.warningSoft, color: C.warning, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 8 }}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(
          [
            { value: "pending" as FilterTab, label: "معلّق" },
            { value: "approved" as FilterTab, label: "معتمد" },
            { value: "rejected" as FilterTab, label: "مرفوض" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: `1px solid ${filter === tab.value ? C.primary : C.border}`,
              background: filter === tab.value ? C.primarySoft : C.surface,
              color: filter === tab.value ? C.primary : C.textMuted,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label} ({section === "delivery_pricing" ? dpCounts[tab.value] : counts[tab.value]})
          </button>
        ))}
      </div>

      {/* ======= SERVICE PRICES SECTION ======= */}
      {section === "service_prices" && (
      <>
      {/* Empty state */}
      {filteredRequests.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {filter === "pending" ? "⏳" : filter === "approved" ? "✨" : "📋"}
          </div>
          <p style={{ color: C.textMuted, fontSize: 15, margin: 0 }}>
            {filter === "pending" && "لا توجد طلبات معلّقة"}
            {filter === "approved" && "لا توجد طلبات معتمدة"}
            {filter === "rejected" && "لا توجد طلبات مرفوضة"}
          </p>
        </div>
      ) : (
        /* Request cards */
        filteredRequests.map((req) => {
          const profile = profiles[req.requested_by];
          const sp = req.service_prices;
          const isPending = req.approval_status === "pending";

          return (
            <div
              key={req.id}
              style={{
                padding: 20,
                borderRadius: 16,
                background: C.surface,
                border: `2px solid ${
                  isPending ? C.warningSoft : req.approval_status === "approved" ? C.successSoft : C.dangerSoft
                }`,
                marginBottom: 16,
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = "0 8px 24px rgba(139,92,246,0.12)";
                el.style.borderColor = isPending
                  ? C.warning
                  : req.approval_status === "approved"
                  ? C.success
                  : C.danger;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = "none";
                el.style.borderColor = isPending
                  ? C.warningSoft
                  : req.approval_status === "approved"
                  ? C.successSoft
                  : C.dangerSoft;
              }}
            >
              {/* Top row: service info + status badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {sp?.icon && (
                    <span style={{ fontSize: 28 }}>{sp.icon}</span>
                  )}
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: C.text,
                        margin: "0 0 4px 0",
                      }}
                    >
                      {sp?.label_ar || "خدمة غير معروفة"}
                    </h3>
                    {sp?.category && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 6,
                          background: C.primarySoft,
                          color: C.primary,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {sp.category}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: isPending
                      ? C.warningSoft
                      : req.approval_status === "approved"
                      ? C.successSoft
                      : C.dangerSoft,
                    color: isPending
                      ? C.warning
                      : req.approval_status === "approved"
                      ? C.success
                      : C.danger,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {isPending && "⏳ معلّق"}
                  {req.approval_status === "approved" && "✓ معتمد"}
                  {req.approval_status === "rejected" && "✕ مرفوض"}
                </div>
              </div>

              {/* Price change: old -> new */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: C.bg,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.danger,
                    textDecoration: "line-through",
                  }}
                >
                  {req.old_price} ج.م
                </span>
                <span style={{ fontSize: 20, color: C.textMuted }}>←</span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: C.success,
                  }}
                >
                  {req.new_price} ج.م
                </span>
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 700, color: C.text }}>مقدّم الطلب: </span>
                  {profile?.full_name || profile?.email || "غير معروف"}{" "}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: C.primarySoft,
                      color: C.primary,
                      fontSize: 11,
                      fontWeight: 700,
                      marginRight: 4,
                    }}
                  >
                    {getRoleName(profile)}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 700, color: C.text }}>السبب: </span>
                  {req.reason || "لم يتم تحديد سبب"}
                </div>

                <div style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 700, color: C.text }}>تاريخ الطلب: </span>
                  {formatDate(req.requested_at)}
                </div>

                {req.rejection_reason && (
                  <div style={{ fontSize: 13, color: C.danger }}>
                    <span style={{ fontWeight: 700 }}>سبب الرفض: </span>
                    {req.rejection_reason}
                  </div>
                )}
              </div>

              {/* Action buttons (only for pending) */}
              {isPending && (
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={acting === req.id}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 10,
                      border: "none",
                      background: C.success,
                      color: "white",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: acting === req.id ? "not-allowed" : "pointer",
                      opacity: acting === req.id ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (acting !== req.id) (e.currentTarget as HTMLElement).style.opacity = "0.85";
                    }}
                    onMouseLeave={(e) => {
                      if (acting !== req.id) (e.currentTarget as HTMLElement).style.opacity = "1";
                    }}
                  >
                    {acting === req.id ? "جارٍ..." : "✓ اعتماد"}
                  </button>
                  <button
                    onClick={() => {
                      setRejectModalId(req.id);
                      setRejectionReason("");
                    }}
                    disabled={acting === req.id}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 10,
                      border: "none",
                      background: C.danger,
                      color: "white",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: acting === req.id ? "not-allowed" : "pointer",
                      opacity: acting === req.id ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (acting !== req.id) (e.currentTarget as HTMLElement).style.opacity = "0.85";
                    }}
                    onMouseLeave={(e) => {
                      if (acting !== req.id) (e.currentTarget as HTMLElement).style.opacity = "1";
                    }}
                  >
                    ✕ رفض
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
      </>
      )}

      {/* ======= DELIVERY PRICING SECTION ======= */}
      {section === "delivery_pricing" && (
      <>
      {dpFilteredRequests.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{filter === "pending" ? "⏳" : "✨"}</div>
          <p style={{ color: C.textMuted, fontSize: 15, margin: 0 }}>
            {filter === "pending" ? "لا توجد طلبات تعديل تسعير التوصيل معلّقة" : `لا توجد طلبات ${filter === "approved" ? "معتمدة" : "مرفوضة"}`}
          </p>
        </div>
      ) : (
        dpFilteredRequests.map((req) => {
          const profile = profiles[req.requested_by];
          const isPending = req.approval_status === "pending";
          return (
            <div key={req.id} style={{
              padding: 20, borderRadius: 16, background: C.surface,
              border: `2px solid ${isPending ? C.warningSoft : req.approval_status === "approved" ? C.successSoft : C.dangerSoft}`,
              marginBottom: 16,
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: "0 0 4px 0" }}>
                    {req.change_type === "create" ? "إنشاء قاعدة جديدة" : "تعديل قاعدة التسعير"}
                  </h3>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: C.primarySoft, color: C.primary, fontWeight: 700 }}>
                    {req.proposed_label_ar || req.current_label_ar || "تسعير التوصيل"}
                  </span>
                </div>
                <div style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: isPending ? C.warningSoft : req.approval_status === "approved" ? C.successSoft : C.dangerSoft,
                  color: isPending ? C.warning : req.approval_status === "approved" ? C.success : C.danger,
                }}>
                  {isPending ? "⏳ معلّق" : req.approval_status === "approved" ? "✓ معتمد" : "✕ مرفوض"}
                </div>
              </div>

              {/* Proposed values */}
              <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                {[
                  { label: "المسافة الأساسية", old: req.current_base_distance_km, new_: req.proposed_base_distance_km, unit: "كم" },
                  { label: "السعر الأساسي", old: req.current_base_price, new_: req.proposed_base_price, unit: "جنيه" },
                  { label: "لكل كم إضافي", old: req.current_per_km_price, new_: req.proposed_per_km_price, unit: "جنيه" },
                  { label: "الحد الأدنى", old: req.current_min_fee, new_: req.proposed_min_fee, unit: "جنيه" },
                  { label: "الحد الأقصى", old: req.current_max_fee, new_: req.proposed_max_fee, unit: "جنيه" },
                  { label: "أقصى مسافة", old: req.current_max_distance_km, new_: req.proposed_max_distance_km, unit: "كم" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < 5 ? 6 : 0 }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{row.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {row.old != null && req.change_type === "update" && (
                        <span style={{ fontSize: 12, color: C.danger, textDecoration: "line-through" }}>{row.old} {row.unit}</span>
                      )}
                      {row.new_ != null && (
                        <span style={{ fontSize: 13, color: C.success, fontWeight: 800 }}>{row.new_} {row.unit}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 700, color: C.text }}>مقدّم الطلب: </span>
                  {profile?.full_name || profile?.email || "غير معروف"}
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: C.primarySoft, color: C.primary, fontSize: 11, fontWeight: 700, marginRight: 4 }}>
                    {getRoleName(profile)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 700, color: C.text }}>السبب: </span>{req.reason || "لم يتم تحديد سبب"}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 700, color: C.text }}>التاريخ: </span>{formatDate(req.requested_at)}
                </div>
                {req.rejection_reason && (
                  <div style={{ fontSize: 13, color: C.danger }}>
                    <span style={{ fontWeight: 700 }}>سبب الرفض: </span>{req.rejection_reason}
                  </div>
                )}
              </div>

              {/* Actions */}
              {isPending && (
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => handleDpApprove(req.id)} disabled={acting === req.id}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: C.success, color: "white", fontWeight: 700, fontSize: 14, cursor: acting === req.id ? "not-allowed" : "pointer", opacity: acting === req.id ? 0.6 : 1 }}>
                    {acting === req.id ? "جارٍ..." : "✓ اعتماد"}
                  </button>
                  <button onClick={() => { setDpRejectModalId(req.id); setDpRejectionReason(""); }} disabled={acting === req.id}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: C.danger, color: "white", fontWeight: 700, fontSize: 14, cursor: acting === req.id ? "not-allowed" : "pointer", opacity: acting === req.id ? 0.6 : 1 }}>
                    ✕ رفض
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
      </>
      )}

      {/* Rejection Modal */}
      {rejectModalId && (
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
            if (e.target === e.currentTarget) {
              setRejectModalId(null);
              setRejectionReason("");
            }
          }}
        >
          <div
            dir="rtl"
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 24,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: C.text,
                margin: "0 0 16px 0",
              }}
            >
              ✕ سبب رفض تعديل السعر
            </h2>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="أدخل سبب الرفض (مطلوب)..."
              style={{
                width: "100%",
                minHeight: 100,
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: 13,
                outline: "none",
                marginBottom: 16,
                fontFamily: "inherit",
                direction: "rtl",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = C.primary;
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = C.border;
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  setRejectModalId(null);
                  setRejectionReason("");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
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
                onClick={() => handleReject(rejectModalId)}
                disabled={!rejectionReason.trim() || acting === rejectModalId}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: !rejectionReason.trim() ? C.textMuted : C.danger,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: !rejectionReason.trim() ? "not-allowed" : "pointer",
                  opacity: !rejectionReason.trim() ? 0.5 : 1,
                }}
              >
                {acting === rejectModalId ? "جارٍ..." : "✕ تأكيد الرفض"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Pricing Rejection Modal */}
      {dpRejectModalId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setDpRejectModalId(null); setDpRejectionReason(""); } }}>
          <div dir="rtl" style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 500, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: "0 0 16px 0" }}>✕ سبب رفض تعديل التسعير</h2>
            <textarea value={dpRejectionReason} onChange={(e) => setDpRejectionReason(e.target.value)} placeholder="أدخل سبب الرفض (مطلوب)..."
              style={{ width: "100%", minHeight: 100, padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", marginBottom: 16, fontFamily: "inherit", direction: "rtl", resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setDpRejectModalId(null); setDpRejectionReason(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                إلغاء
              </button>
              <button onClick={() => handleDpReject(dpRejectModalId)} disabled={!dpRejectionReason.trim() || acting === dpRejectModalId}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: !dpRejectionReason.trim() ? C.textMuted : C.danger, color: "white", fontWeight: 700, fontSize: 14, cursor: !dpRejectionReason.trim() ? "not-allowed" : "pointer", opacity: !dpRejectionReason.trim() ? 0.5 : 1 }}>
                {acting === dpRejectModalId ? "جارٍ..." : "✕ تأكيد الرفض"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
