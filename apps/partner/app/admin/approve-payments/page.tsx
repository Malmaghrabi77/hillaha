"use client";
import React, { useState, useEffect } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAdminPermissions } from "../hooks/useAdminPermissions";

const supabase = getSupabase()!;

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
};

type Tab = "pending" | "approved" | "rejected";

interface PendingOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  partner_name: string;
  total: number;
  payment_method: string;
  payment_proof_url: string | null;
  payment_approval_status: string;
  payment_rejection_reason: string | null;
  payment_approved_at: string | null;
  created_at: string;
}

export default function ApprovePaymentsPage() {
  const auth = useAdminAuth();
  const permissions = useAdminPermissions(auth.role);
  const [tab, setTab] = useState<Tab>("pending");
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => { if (!auth.loading && permissions.approvePayments) loadOrders(); }, [tab, auth.loading, permissions.approvePayments]);

  if (auth.loading) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جاري التحميل...</div>;
  if (!permissions.approvePayments) return <div style={{ padding: 40, textAlign: "center", color: C.danger, fontWeight: 700 }}>ليس لديك صلاحية الوصول لهذه الصفحة</div>;

  async function loadOrders() {
    setLoading(true);
    const q = (supabase as any)
      .from("orders")
      .select("id, total, payment_method, payment_proof_url, payment_approval_status, payment_rejection_reason, payment_approved_at, created_at, customer_phone, profiles!orders_customer_id_fkey(full_name), partners(name)")
      .eq("payment_approval_status", tab)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data } = await q;
    if (data) {
      setOrders(data.map((r: any) => ({
        id: r.id,
        customer_name: r.profiles?.full_name ?? "عميل",
        customer_phone: r.customer_phone ?? "",
        partner_name: r.partners?.name ?? "متجر",
        total: Number(r.total),
        payment_method: r.payment_method,
        payment_proof_url: r.payment_proof_url,
        payment_approval_status: r.payment_approval_status,
        payment_rejection_reason: r.payment_rejection_reason,
        payment_approved_at: r.payment_approved_at,
        created_at: r.created_at,
      })));
    }
    setLoading(false);
  }

  async function approve(orderId: string) {
    setProcessing(orderId);
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc("approve_order_payment", {
      p_order_id: orderId,
      p_admin_id: user.user?.id,
    });
    if (error || !data?.success) {
      alert(data?.error || error?.message || "حدث خطأ");
    } else {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
    setProcessing(null);
  }

  async function reject(orderId: string) {
    if (!rejectReason.trim()) { alert("يرجى كتابة سبب الرفض"); return; }
    setProcessing(orderId);
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc("reject_order_payment", {
      p_order_id: orderId,
      p_admin_id: user.user?.id,
      p_reason: rejectReason.trim(),
    });
    if (error || !data?.success) {
      alert(data?.error || error?.message || "حدث خطأ");
    } else {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setRejectId(null);
      setRejectReason("");
    }
    setProcessing(null);
  }

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: "pending",  label: "بانتظار الاعتماد", color: C.warning },
    { key: "approved", label: "معتمد",            color: "#059669" },
    { key: "rejected", label: "مرفوض",            color: C.danger },
  ];

  function fmtMethod(m: string) {
    const map: Record<string, string> = {
      wallet_transfer: "تحويل محفظة", cash: "كاش", card: "بطاقة", wallet: "المحفظة",
      instapay: "إنستاباي", vodafone: "فودافون كاش", etisalat: "اتصالات كاش",
      we_pay: "وي باي", orange_money: "اورانج موني", meeza: "ميزة",
      fawry: "فوري", aman: "أمان", bee: "بي", khazna: "خزنة",
    };
    return map[m] || m;
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: C.text }}>
        اعتماد مدفوعات الطلبات الكبيرة
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: C.textMuted }}>
        الطلبات أكثر من 1,000 جنيه المدفوعة بالتحويل تحتاج اعتماد إيصال الدفع
      </p>

      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px", borderRadius: 20, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: tab === t.key ? t.color : C.surface,
              color: tab === t.key ? "white" : C.textMuted,
              border: tab === t.key ? "none" : `1px solid ${C.border}`,
            }}
          >
            {t.label}
            {tab === t.key && ` (${orders.length})`}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center", color: C.textMuted }}>جاري التحميل...</p>}

      {!loading && orders.length === 0 && (
        <div style={{
          background: C.surface, borderRadius: 16, padding: 40,
          border: `1px solid ${C.border}`, textAlign: "center", color: C.textMuted,
        }}>
          لا توجد طلبات في هذه الفئة
        </div>
      )}

      {/* ORDERS LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {orders.map(o => (
          <div key={o.id} style={{
            background: C.surface, borderRadius: 16, padding: 20,
            border: `1px solid ${C.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 900, color: C.primary, fontSize: 14 }}>
                  {o.id.substring(0, 8).toUpperCase()}
                </span>
                <span style={{ margin: "0 8px", color: C.border }}>|</span>
                <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{o.customer_name}</span>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  {o.customer_phone} — {o.partner_name}
                </div>
              </div>
              <span style={{
                fontSize: 18, fontWeight: 900, color: C.primary,
              }}>
                {o.total} ج
              </span>
            </div>

            {/* Info row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{
                padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: C.primarySoft, color: C.primary,
              }}>
                {fmtMethod(o.payment_method)}
              </span>
              <span style={{
                padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "#F3F4F6", color: "#374151",
              }}>
                {new Date(o.created_at).toLocaleString("ar-EG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Proof image */}
            {o.payment_proof_url && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>إيصال الدفع:</div>
                <img
                  src={o.payment_proof_url}
                  alt="إيصال"
                  onClick={() => setPreviewImg(o.payment_proof_url)}
                  style={{
                    width: "100%", maxHeight: 200, objectFit: "contain",
                    borderRadius: 12, border: `1px solid ${C.border}`,
                    cursor: "pointer", background: "#F9FAFB",
                  }}
                />
              </div>
            )}

            {!o.payment_proof_url && (
              <div style={{
                padding: 12, borderRadius: 12, background: "#FEF2F2",
                border: "1px solid #FECACA", marginBottom: 14,
                fontSize: 13, color: C.danger, fontWeight: 700,
              }}>
                لم يتم رفع إيصال الدفع
              </div>
            )}

            {/* Rejection reason */}
            {o.payment_approval_status === "rejected" && o.payment_rejection_reason && (
              <div style={{
                padding: 12, borderRadius: 12, background: "#FEF2F2",
                border: "1px solid #FECACA", marginBottom: 14,
                fontSize: 13, color: "#991B1B",
              }}>
                <strong>سبب الرفض:</strong> {o.payment_rejection_reason}
              </div>
            )}

            {/* Actions for pending */}
            {tab === "pending" && (
              <>
                {rejectId === o.id ? (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="سبب رفض الإيصال..."
                      dir="rtl"
                      style={{
                        width: "100%", padding: 12, borderRadius: 12, fontSize: 14,
                        border: `1.5px solid ${C.border}`, marginBottom: 8, resize: "vertical",
                        minHeight: 70,
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        disabled={processing === o.id}
                        onClick={() => reject(o.id)}
                        style={{
                          flex: 1, padding: 10, borderRadius: 10, border: "none",
                          background: C.danger, color: "white", fontWeight: 700,
                          cursor: processing === o.id ? "wait" : "pointer", fontSize: 13,
                        }}
                      >
                        تأكيد الرفض
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setRejectReason(""); }}
                        style={{
                          padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                          background: "transparent", color: C.textMuted, fontWeight: 700,
                          cursor: "pointer", fontSize: 13,
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      disabled={processing === o.id}
                      onClick={() => approve(o.id)}
                      style={{
                        flex: 2, padding: 12, borderRadius: 12, border: "none",
                        background: "#059669", color: "white", fontWeight: 900,
                        cursor: processing === o.id ? "wait" : "pointer", fontSize: 14,
                      }}
                    >
                      اعتماد الإيصال ✓
                    </button>
                    <button
                      disabled={processing === o.id}
                      onClick={() => setRejectId(o.id)}
                      style={{
                        flex: 1, padding: 12, borderRadius: 12,
                        border: `1.5px solid #FECACA`, background: "#FEF2F2",
                        color: C.danger, fontWeight: 900,
                        cursor: processing === o.id ? "wait" : "pointer", fontSize: 14,
                      }}
                    >
                      رفض
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "pointer",
          }}
        >
          <img
            src={previewImg}
            alt="إيصال الدفع"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: 16, objectFit: "contain",
            }}
          />
        </div>
      )}
    </div>
  );
}
