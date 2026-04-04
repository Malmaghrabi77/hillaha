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

type FilterTab = "pending" | "approved" | "rejected";

type BannerRequest = {
  id: string;
  banner_id: string | null;
  change_type: string;
  proposed_title: string | null;
  proposed_sub: string | null;
  proposed_cta: string | null;
  proposed_bg: string | null;
  proposed_accent: string | null;
  proposed_image: string | null;
  proposed_link_type: string | null;
  proposed_link_value: string | null;
  proposed_position: number | null;
  proposed_is_active: boolean | null;
  reason: string | null;
  requested_by: string;
  requested_at: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  applied_at: string | null;
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "pending", label: "معلق" },
  { key: "approved", label: "موافق عليه" },
  { key: "rejected", label: "مرفوض" },
];

const CHANGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: "إنشاء", color: C.success, bg: C.successSoft },
  update: { label: "تعديل", color: C.warning, bg: C.warningSoft },
  delete: { label: "حذف", color: C.danger, bg: C.dangerSoft },
};

export default function ApproveBannersPage() {
  const auth = useAdminAuth();
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [requests, setRequests] = useState<BannerRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; email: string }>>({});
  const [loading, setLoading] = useState(true);

  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (auth.loading) return;
    loadRequests();
  }, [auth.loading, filter]);

  const loadRequests = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);

    const { data } = await (supabase as any)
      .from("banner_change_requests")
      .select("*")
      .eq("approval_status", filter)
      .order("requested_at", { ascending: false });

    const reqs = (data || []) as BannerRequest[];
    setRequests(reqs);

    // Fetch requester profiles
    const uniqueIds = Array.from(new Set(reqs.map((r) => r.requested_by).filter(Boolean)));
    if (uniqueIds.length > 0) {
      const { data: profilesData } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueIds);

      const map: Record<string, { full_name: string; email: string }> = {};
      (profilesData || []).forEach((p: any) => {
        map[p.id] = { full_name: p.full_name || "", email: p.email || "" };
      });
      setProfiles(map);
    }

    setLoading(false);
  };

  const handleApprove = async (reqId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update status to approved
    await (supabase as any)
      .from("banner_change_requests")
      .update({
        approval_status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", reqId);

    // Apply change via RPC
    await (supabase as any).rpc("apply_banner_change", {
      p_request_id: reqId,
      p_admin_id: user.id,
    });

    await loadRequests();
  };

  const handleReject = async () => {
    if (!rejectModalId || !rejectionReason.trim()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from("banner_change_requests")
      .update({
        approval_status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", rejectModalId);

    setRejectModalId(null);
    setRejectionReason("");
    await loadRequests();
  };

  if (auth.loading || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", color: C.textMuted }}>جاري التحميل...</div>
      </div>
    );
  }

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: C.danger }}>غير مصرح لك بالوصول</h2>
        <p style={{ color: C.textMuted }}>هذه الصفحة متاحة فقط للسوبر أدمن.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", direction: "rtl" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>✅ اعتماد طلبات البانرات</h1>
        <p style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>
          مراجعة واعتماد طلبات إضافة وتعديل البانرات من المديرين الإقليميين
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "8px 20px", borderRadius: 12, border: "none",
              background: filter === tab.key ? C.primary : C.bg,
              color: filter === tab.key ? "white" : C.textMuted,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            {tab.label}
            {tab.key === "pending" && requests.length > 0 && filter === "pending" && (
              <span style={{
                marginRight: 6, background: "rgba(255,255,255,0.3)",
                padding: "2px 8px", borderRadius: 8, fontSize: 11,
              }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: C.surface,
          borderRadius: 16, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ color: C.textMuted, fontWeight: 700 }}>
            لا توجد طلبات {FILTER_TABS.find((t) => t.key === filter)?.label}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {requests.map((req) => {
            const change = CHANGE_LABELS[req.change_type] || CHANGE_LABELS.update;
            const requester = profiles[req.requested_by];
            const bgColor = req.proposed_bg || "#7C3AED";
            const accentColor = req.proposed_accent || "#6D28D9";

            return (
              <div
                key={req.id}
                style={{
                  background: C.surface, borderRadius: 16,
                  border: `1px solid ${C.border}`, overflow: "hidden",
                }}
              >
                {/* Banner Preview (for create/update) */}
                {req.change_type !== "delete" && (
                  <div style={{
                    height: 100,
                    background: `linear-gradient(135deg, ${bgColor}, ${accentColor})`,
                    padding: 16, display: "flex", flexDirection: "column", justifyContent: "center",
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "white" }}>
                      {req.proposed_title || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                      {req.proposed_sub || ""}
                    </div>
                    {req.proposed_cta && (
                      <div style={{
                        marginTop: 6, display: "inline-block", background: "white",
                        padding: "3px 10px", borderRadius: 14, fontSize: 10, fontWeight: 700,
                        color: bgColor, alignSelf: "flex-start",
                      }}>
                        {req.proposed_cta}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: 16 }}>
                  {/* Change Type + Requester */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        background: change.bg, color: change.color,
                        padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      }}>
                        {change.label}
                      </span>
                      {req.proposed_is_active === false && (
                        <span style={{
                          background: C.dangerSoft, color: C.danger,
                          padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        }}>
                          غير نشط
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {new Date(req.requested_at).toLocaleDateString("ar-EG", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Requester Info */}
                  {requester && (
                    <div style={{
                      background: C.bg, padding: 10, borderRadius: 10, marginBottom: 12,
                      fontSize: 13, color: C.text,
                    }}>
                      <strong>الطالب:</strong> {requester.full_name || requester.email}
                    </div>
                  )}

                  {/* Reason */}
                  {req.reason && (
                    <div style={{
                      background: C.primarySoft, padding: 10, borderRadius: 10, marginBottom: 12,
                      fontSize: 13, color: C.primary,
                    }}>
                      <strong>السبب:</strong> {req.reason}
                    </div>
                  )}

                  {/* Proposed Details */}
                  {req.change_type !== "delete" && (
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12,
                      fontSize: 12, color: C.text,
                    }}>
                      {req.proposed_link_type && (
                        <div style={{ background: C.bg, borderRadius: 8, padding: 8 }}>
                          <strong>نوع الرابط:</strong> {req.proposed_link_type === "partner" ? "شريك" : req.proposed_link_type === "url" ? "رابط خارجي" : "بدون"}
                        </div>
                      )}
                      {req.proposed_position != null && (
                        <div style={{ background: C.bg, borderRadius: 8, padding: 8 }}>
                          <strong>الترتيب:</strong> {req.proposed_position}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rejection reason (for rejected tab) */}
                  {req.rejection_reason && (
                    <div style={{
                      background: C.dangerSoft, padding: 10, borderRadius: 10, marginBottom: 12,
                      fontSize: 13, color: C.danger,
                    }}>
                      <strong>سبب الرفض:</strong> {req.rejection_reason}
                    </div>
                  )}

                  {/* Action Buttons (pending only) */}
                  {filter === "pending" && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => handleApprove(req.id)}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                          background: C.success, color: "white", fontWeight: 700,
                          fontSize: 14, cursor: "pointer",
                        }}
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => { setRejectModalId(req.id); setRejectionReason(""); }}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                          background: C.dangerSoft, color: C.danger, fontWeight: 700,
                          fontSize: 14, cursor: "pointer",
                        }}
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalId && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModalId(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div style={{
            background: C.surface, borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 420,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              سبب الرفض
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اذكر سبب رفض هذا الطلب..."
              rows={4}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontSize: 14, direction: "rtl",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setRejectModalId(null)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 12,
                  border: `1.5px solid ${C.border}`, background: "transparent",
                  fontWeight: 700, fontSize: 14, color: C.textMuted, cursor: "pointer",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                  background: rejectionReason.trim() ? C.danger : C.textMuted,
                  fontWeight: 700, fontSize: 14, color: "white",
                  cursor: rejectionReason.trim() ? "pointer" : "not-allowed",
                }}
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
