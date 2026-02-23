"use client";
import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF",      surface: "#FFFFFF",
  border: "#E7E3FF",  text: "#1F1B2E",
  textMuted: "#6B6480", success: "#16A34A", successSoft: "#DCFCE7",
  warning: "#F59E0B",   warningSoft: "#FEF3C7",
  danger: "#EF4444",    dangerSoft: "#FEF2F2",
  info: "#0EA5E9",      infoSoft: "#E0F2FE",
};

type Setting = { key: string; label: string; value: string };
type ProofOrder = {
  id: string;
  created_at: string;
  total: number;
  payment_method: string;
  payment_proof_url: string | null;
  customer_id: string;
  delivery_address: string;
};

export default function SuperAdminPage() {
  const [isSuperAdmin, setIsSuperAdmin]     = useState<boolean | null>(null);
  const [settings, setSettings]             = useState<Setting[]>([]);
  const [savingKey, setSavingKey]           = useState<string | null>(null);
  const [saveMsg, setSaveMsg]               = useState<{ key: string; ok: boolean; text: string } | null>(null);
  const [proofOrders, setProofOrders]       = useState<ProofOrder[]>([]);
  const [selectedProof, setSelectedProof]   = useState<string | null>(null);
  const [loadingProofs, setLoadingProofs]   = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setIsSuperAdmin(false); return; }

    sb.auth.getSession().then(async ({ data }: any) => {
      if (!data.session) { setIsSuperAdmin(false); return; }
      const uid = data.session.user.id;

      // Check super_admin role
      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      const role = (profile as { role: string } | null)?.role;
      const isAdmin = role === "super_admin";
      setIsSuperAdmin(isAdmin);

      if (!isAdmin) return;

      // Load platform settings
      const { data: rows } = await sb
        .from("platform_settings")
        .select("key, label, value")
        .in("key", ["instapay_account", "etisalat_phone", "vodafone_phone"]);
      if (rows) setSettings(rows);

      // Load recent e-wallet orders with proof
      setLoadingProofs(true);
      const { data: orders } = await sb
        .from("orders")
        .select("id, created_at, total, payment_method, payment_proof_url, customer_id, delivery_address")
        .eq("payment_method", "wallet_transfer")
        .order("created_at", { ascending: false })
        .limit(50);
      if (orders) setProofOrders(orders);
      setLoadingProofs(false);
    });
  }, []);

  async function saveSetting(key: string, value: string) {
    const sb = getSupabase();
    if (!sb) return;
    setSavingKey(key);
    setSaveMsg(null);
    const { error } = await (sb as any)
      .from("platform_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    setSavingKey(null);
    if (error) {
      setSaveMsg({ key, ok: false, text: "فشل الحفظ: " + error.message });
    } else {
      setSaveMsg({ key, ok: true, text: "تم الحفظ بنجاح" });
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  function updateValue(key: string, value: string) {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  }

  // ── Loading / Unauthorized ────────────────────────────────────────────────
  if (isSuperAdmin === null) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: `4px solid ${C.primarySoft}`, borderTopColor: C.primary,
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: C.text }}>غير مصرح بالدخول</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>هذه الصفحة لحساب السوبر أدمن فقط</div>
      </div>
    );
  }

  // ── Main Admin Panel ──────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>👑</span>
          <h1 style={{ fontWeight: 900, fontSize: 22, color: C.text, margin: 0 }}>
            لوحة السوبر أدمن
          </h1>
        </div>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          إدارة حسابات استلام المدفوعات ومراجعة إثباتات التحويل
        </p>
      </div>

      {/* ── SECTION 1: حسابات الاستلام ─────────────────────────────────── */}
      <section style={{
        background: C.surface, borderRadius: 20,
        border: `1px solid ${C.border}`, padding: 24, marginBottom: 28,
      }}>
        <h2 style={{ fontWeight: 900, fontSize: 16, color: C.text, marginBottom: 6, marginTop: 0 }}>
          💳 حسابات استلام المدفوعات
        </h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20, marginTop: 0 }}>
          يظهر هذا الحساب للعملاء تلقائياً عند اختيار طريقة الدفع. التغيير فوري.
        </p>

        {settings.length === 0 ? (
          <div style={{ color: C.textMuted, textAlign: "center", padding: 20 }}>جاري التحميل...</div>
        ) : (
          settings.map(s => (
            <div key={s.key} style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 6 }}>
                {s.label}
                {s.key === "vodafone_phone" && (
                  <span style={{
                    marginRight: 8, fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: C.warningSoft, color: C.warning, fontWeight: 700,
                  }}>قيد التفعيل</span>
                )}
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={s.value}
                  onChange={e => updateValue(s.key, e.target.value)}
                  placeholder={
                    s.key === "instapay_account" ? "@اسم_الحساب" :
                    s.key === "etisalat_phone"   ? "01XXXXXXXXX" :
                    "01XXXXXXXXX"
                  }
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 12, fontSize: 15,
                    border: `1.5px solid ${C.border}`, outline: "none",
                    background: C.bg, color: C.text, textAlign: "right",
                    direction: "ltr",
                  }}
                />
                <button
                  onClick={() => saveSetting(s.key, s.value)}
                  disabled={savingKey === s.key}
                  style={{
                    padding: "10px 22px", borderRadius: 12, fontWeight: 900,
                    fontSize: 14, border: "none", cursor: "pointer",
                    background: savingKey === s.key ? C.primarySoft : C.primary,
                    color: savingKey === s.key ? C.textMuted : "white",
                    minWidth: 80, transition: "all 0.15s",
                  }}
                >
                  {savingKey === s.key ? "..." : "حفظ"}
                </button>
              </div>
              {saveMsg?.key === s.key && (
                <div style={{
                  marginTop: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: saveMsg.ok ? C.successSoft : C.dangerSoft,
                  color: saveMsg.ok ? C.success : C.danger,
                }}>
                  {saveMsg.ok ? "✓ " : "✗ "}{saveMsg.text}
                </div>
              )}
            </div>
          ))
        )}

        <div style={{
          marginTop: 8, padding: "10px 14px", borderRadius: 12,
          background: C.infoSoft, borderLeft: `3px solid ${C.info}`,
          fontSize: 12, color: "#075985",
        }}>
          💡 لتفعيل Vodafone Cash: أضف رقم المحفظة ثم اضغط حفظ، ثم فعّل الخيار في إعدادات الدفع.
        </div>
      </section>

      {/* ── SECTION 2: إثباتات التحويل ──────────────────────────────────── */}
      <section style={{
        background: C.surface, borderRadius: 20,
        border: `1px solid ${C.border}`, padding: 24,
      }}>
        <h2 style={{ fontWeight: 900, fontSize: 16, color: C.text, marginBottom: 6, marginTop: 0 }}>
          🧾 مراجعة إثباتات الدفع
        </h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20, marginTop: 0 }}>
          جميع طلبات المحافظ الإلكترونية مع صور التحويل المرفوعة من العملاء.
          يمكنك التحقق من كل تحويل بمقارنة الصورة مع المبلغ.
        </p>

        {loadingProofs ? (
          <div style={{ textAlign: "center", color: C.textMuted, padding: 24 }}>جاري التحميل...</div>
        ) : proofOrders.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 32,
            background: C.bg, borderRadius: 12,
            color: C.textMuted, fontSize: 14,
          }}>
            لا توجد طلبات بالمحافظ الإلكترونية بعد
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {proofOrders.map(order => (
              <div key={order.id} style={{
                padding: 16, borderRadius: 16,
                border: `1.5px solid ${order.payment_proof_url ? "#86EFAC" : C.warning}`,
                background: order.payment_proof_url ? C.successSoft : C.warningSoft,
                display: "flex", alignItems: "flex-start", gap: 14,
              }}>
                {/* Status icon */}
                <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>
                  {order.payment_proof_url ? "✅" : "⚠️"}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 900, fontSize: 14, color: C.text }}>
                      طلب رقم: {order.id.substring(0, 8)}...
                    </span>
                    <span style={{
                      fontWeight: 900, fontSize: 15, color: C.primary,
                      background: C.primarySoft, padding: "2px 10px", borderRadius: 20,
                    }}>
                      {order.total.toFixed(2)} ج
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>
                    📅 {new Date(order.created_at).toLocaleString("ar-EG")}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>
                    📍 {order.delivery_address}
                  </div>
                  {!order.payment_proof_url && (
                    <div style={{ fontSize: 12, color: C.warning, fontWeight: 700, marginTop: 4 }}>
                      لم يرفع العميل إثبات التحويل بعد
                    </div>
                  )}
                </div>

                {/* Proof thumbnail */}
                {order.payment_proof_url && (
                  <div
                    onClick={() => setSelectedProof(
                      selectedProof === order.payment_proof_url ? null : order.payment_proof_url
                    )}
                    style={{ cursor: "pointer", flexShrink: 0 }}
                  >
                    <img
                      src={order.payment_proof_url}
                      alt="إثبات الدفع"
                      style={{
                        width: 60, height: 60, borderRadius: 10,
                        objectFit: "cover",
                        border: `2px solid ${selectedProof === order.payment_proof_url ? C.primary : "#86EFAC"}`,
                      }}
                    />
                    <div style={{ fontSize: 10, textAlign: "center", color: C.success, marginTop: 2, fontWeight: 700 }}>
                      عرض
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Light-box: proof image fullscreen */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "zoom-out",
          }}
        >
          <img
            src={selectedProof}
            alt="إثبات"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </div>
  );
}
