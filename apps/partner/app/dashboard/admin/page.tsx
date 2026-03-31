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

interface PayMethod {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  icon: string;
  description_ar: string;
  category: string;
  is_enabled: boolean;
  commission_rate: number;
  receiving_account: string;
  receiving_phone: string;
  receiving_name: string;
  instructions_ar: string;
}

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
  const [methods, setMethods]               = useState<PayMethod[]>([]);
  const [savingId, setSavingId]             = useState<string | null>(null);
  const [saveMsg, setSaveMsg]               = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [proofOrders, setProofOrders]       = useState<ProofOrder[]>([]);
  const [selectedProof, setSelectedProof]   = useState<string | null>(null);
  const [loadingProofs, setLoadingProofs]   = useState(true);
  const [editingMethod, setEditingMethod]   = useState<string | null>(null);
  const [tab, setTab]                       = useState<"accounts" | "proofs">("accounts");

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setIsSuperAdmin(false); return; }

    sb.auth.getSession().then(async ({ data }: any) => {
      if (!data.session) { setIsSuperAdmin(false); return; }
      const uid = data.session.user.id;

      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      const role = (profile as { role: string } | null)?.role;
      const isAdmin = role === "super_admin";
      setIsSuperAdmin(isAdmin);

      if (!isAdmin) return;

      // Load ALL payment methods
      const { data: pm } = await (sb as any)
        .from("payment_methods")
        .select("id, name, name_ar, code, icon, description_ar, category, is_enabled, commission_rate, receiving_account, receiving_phone, receiving_name, instructions_ar")
        .order("category")
        .order("name_ar");
      if (pm) setMethods(pm);

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

  function updateMethod(id: string, field: string, value: any) {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  async function saveMethod(m: PayMethod) {
    const sb = getSupabase();
    if (!sb) return;
    setSavingId(m.id);
    setSaveMsg(null);

    const { error } = await (sb as any)
      .from("payment_methods")
      .update({
        name_ar: m.name_ar,
        description_ar: m.description_ar,
        commission_rate: m.commission_rate,
        receiving_account: m.receiving_account,
        receiving_phone: m.receiving_phone,
        receiving_name: m.receiving_name,
        instructions_ar: m.instructions_ar,
        is_enabled: m.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", m.id);

    setSavingId(null);
    if (error) {
      setSaveMsg({ id: m.id, ok: false, text: "فشل الحفظ: " + error.message });
    } else {
      setSaveMsg({ id: m.id, ok: true, text: "تم الحفظ" });
      setEditingMethod(null);
      // Also sync to platform_settings for checkout fallback
      if (m.code === "instapay" && m.receiving_account) {
        await (sb as any).from("platform_settings").update({ value: m.receiving_account }).eq("key", "instapay_account");
      }
      if (m.code === "etisalat_cash" && m.receiving_phone) {
        await (sb as any).from("platform_settings").update({ value: m.receiving_phone }).eq("key", "etisalat_phone");
      }
      if (m.code === "vodafone_cash" && m.receiving_phone) {
        await (sb as any).from("platform_settings").update({ value: m.receiving_phone }).eq("key", "vodafone_phone");
      }
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  async function toggleMethod(m: PayMethod) {
    const sb = getSupabase();
    if (!sb) return;
    const newVal = !m.is_enabled;
    await (sb as any).from("payment_methods").update({ is_enabled: newVal }).eq("id", m.id);
    setMethods(prev => prev.map(x => x.id === m.id ? { ...x, is_enabled: newVal } : x));
  }

  // ── Loading / Unauthorized ──────
  if (isSuperAdmin === null) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${C.primarySoft}`, borderTopColor: C.primary, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: C.text }}>غير مصرح بالدخول</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>هذه الصفحة لحساب السوبر أدمن فقط</div>
      </div>
    );
  }

  // Group methods by category
  const catLabels: Record<string, { label: string; icon: string }> = {
    wallet: { label: "المحافظ الإلكترونية", icon: "📱" },
    card:   { label: "البطاقات البنكية", icon: "💳" },
    bank:   { label: "التحويلات البنكية", icon: "🏦" },
    other:  { label: "طرق أخرى", icon: "💰" },
  };

  const grouped = methods.reduce((acc: Record<string, PayMethod[]>, m) => {
    const cat = m.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div dir="rtl" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>👑</span>
          <h1 style={{ fontWeight: 900, fontSize: 22, color: C.text, margin: 0 }}>لوحة السوبر أدمن</h1>
        </div>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>إدارة الحسابات البنكية والمحافظ الإلكترونية وإثباتات الدفع</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([
          { key: "accounts" as const, label: "💳 الحسابات وطرق الدفع", count: methods.length },
          { key: "proofs" as const, label: "🧾 إثباتات الدفع", count: proofOrders.length },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 20px", borderRadius: 12, fontWeight: 800, fontSize: 13,
            border: `1.5px solid ${tab === t.key ? C.primary : C.border}`,
            background: tab === t.key ? C.primarySoft : C.surface,
            color: tab === t.key ? C.primary : C.textMuted,
            cursor: "pointer",
          }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: Accounts ═══════════ */}
      {tab === "accounts" && (
        <>
          {Object.entries(grouped).map(([cat, catMethods]) => {
            const info = catLabels[cat] || { label: cat, icon: "💳" };
            return (
              <section key={cat} style={{ marginBottom: 28 }}>
                <h2 style={{ fontWeight: 900, fontSize: 15, color: C.text, margin: "0 0 14px 0" }}>
                  {info.icon} {info.label}
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {catMethods.map(m => {
                    const isEditing = editingMethod === m.id;
                    const needsAccount = !["wallet", "cash"].includes(m.code);

                    return (
                      <div key={m.id} style={{
                        padding: 20, borderRadius: 16,
                        background: C.surface, border: `1.5px solid ${m.is_enabled ? C.success : C.border}`,
                      }}>
                        {/* Header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isEditing ? 16 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 24 }}>{m.icon}</span>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 14, color: C.text }}>{m.name_ar}</div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>{m.code} — عمولة {(m.commission_rate * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {needsAccount && (m.receiving_account || m.receiving_phone) && (
                              <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                                background: C.successSoft, color: C.success,
                              }}>
                                {m.receiving_account || m.receiving_phone}
                              </span>
                            )}
                            {needsAccount && !m.receiving_account && !m.receiving_phone && m.category !== "card" && (
                              <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                                background: C.warningSoft, color: C.warning,
                              }}>
                                لم يُحدد حساب
                              </span>
                            )}
                            {/* Toggle */}
                            <button onClick={() => toggleMethod(m)} style={{
                              width: 46, height: 26, borderRadius: 13, border: "none",
                              background: m.is_enabled ? C.success : C.border,
                              cursor: "pointer", position: "relative",
                            }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: 11, background: "white",
                                position: "absolute", top: 2, right: m.is_enabled ? 22 : 2, transition: "right 0.2s",
                              }} />
                            </button>
                            {/* Edit */}
                            <button onClick={() => setEditingMethod(isEditing ? null : m.id)} style={{
                              padding: "6px 14px", borderRadius: 10, fontWeight: 800, fontSize: 12,
                              border: `1px solid ${isEditing ? C.danger : C.primary}`,
                              background: isEditing ? C.dangerSoft : C.primarySoft,
                              color: isEditing ? C.danger : C.primary,
                              cursor: "pointer",
                            }}>
                              {isEditing ? "إلغاء" : "تعديل"}
                            </button>
                          </div>
                        </div>

                        {/* Edit Panel */}
                        {isEditing && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>الاسم بالعربي</label>
                              <input value={m.name_ar} onChange={e => updateMethod(m.id, "name_ar", e.target.value)} style={{
                                width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                                fontSize: 13, color: C.text, background: C.bg, textAlign: "right",
                              }} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>نسبة العمولة %</label>
                              <input type="number" step="0.1" min="0" max="100"
                                value={(m.commission_rate * 100).toFixed(1)}
                                onChange={e => updateMethod(m.id, "commission_rate", parseFloat(e.target.value) / 100 || 0)}
                                style={{
                                  width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                                  fontSize: 13, color: C.text, background: C.bg, textAlign: "right",
                                }}
                              />
                            </div>
                            {needsAccount && m.category !== "card" && (
                              <>
                                <div>
                                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>
                                    {["wallet", "other"].includes(m.category) ? "رقم المحفظة / الهاتف" : "حساب الاستلام"}
                                  </label>
                                  <input
                                    value={["bank", "other"].includes(m.category) && m.code !== "fawry" ? (m.receiving_account || "") : (m.receiving_phone || "")}
                                    onChange={e => updateMethod(m.id, ["bank", "other"].includes(m.category) && m.code !== "fawry" ? "receiving_account" : "receiving_phone", e.target.value)}
                                    placeholder={m.category === "bank" ? "@account" : "01XXXXXXXXX"}
                                    style={{
                                      width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                                      fontSize: 13, color: C.text, background: C.bg, direction: "ltr", textAlign: "right",
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>اسم صاحب الحساب</label>
                                  <input value={m.receiving_name || ""} onChange={e => updateMethod(m.id, "receiving_name", e.target.value)}
                                    placeholder="اسم المستفيد" style={{
                                      width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                                      fontSize: 13, color: C.text, background: C.bg, textAlign: "right",
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>الوصف</label>
                              <input value={m.description_ar || ""} onChange={e => updateMethod(m.id, "description_ar", e.target.value)} style={{
                                width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                                fontSize: 13, color: C.text, background: C.bg, textAlign: "right",
                              }} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>تعليمات الدفع (تظهر للعميل)</label>
                              <textarea value={m.instructions_ar || ""} onChange={e => updateMethod(m.id, "instructions_ar", e.target.value)}
                                rows={2} style={{
                                  width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                                  fontSize: 13, color: C.text, background: C.bg, textAlign: "right", resize: "vertical",
                                }}
                              />
                            </div>
                            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-start", gap: 10 }}>
                              <button onClick={() => saveMethod(m)} disabled={savingId === m.id} style={{
                                padding: "10px 28px", borderRadius: 12, fontWeight: 900, fontSize: 13,
                                border: "none", cursor: "pointer",
                                background: savingId === m.id ? C.primarySoft : C.primary,
                                color: savingId === m.id ? C.textMuted : "white",
                              }}>
                                {savingId === m.id ? "..." : "💾 حفظ التعديلات"}
                              </button>
                              {saveMsg?.id === m.id && (
                                <span style={{
                                  padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                                  background: saveMsg.ok ? C.successSoft : C.dangerSoft,
                                  color: saveMsg.ok ? C.success : C.danger,
                                }}>
                                  {saveMsg.ok ? "✓ " : "✗ "}{saveMsg.text}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {methods.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>جاري التحميل...</div>
          )}
        </>
      )}

      {/* ═══════════ TAB: Proofs ═══════════ */}
      {tab === "proofs" && (
        <section style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: 24 }}>
          <h2 style={{ fontWeight: 900, fontSize: 16, color: C.text, marginBottom: 6, marginTop: 0 }}>
            🧾 مراجعة إثباتات الدفع
          </h2>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20, marginTop: 0 }}>
            جميع طلبات المحافظ الإلكترونية مع صور التحويل المرفوعة من العملاء.
          </p>

          {loadingProofs ? (
            <div style={{ textAlign: "center", color: C.textMuted, padding: 24 }}>جاري التحميل...</div>
          ) : proofOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, background: C.bg, borderRadius: 12, color: C.textMuted, fontSize: 14 }}>
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
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>
                    {order.payment_proof_url ? "✅" : "⚠️"}
                  </div>
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
                  {order.payment_proof_url && (
                    <div onClick={() => setSelectedProof(selectedProof === order.payment_proof_url ? null : order.payment_proof_url)} style={{ cursor: "pointer", flexShrink: 0 }}>
                      <img src={order.payment_proof_url} alt="إثبات الدفع" style={{
                        width: 60, height: 60, borderRadius: 10, objectFit: "cover",
                        border: `2px solid ${selectedProof === order.payment_proof_url ? C.primary : "#86EFAC"}`,
                      }} />
                      <div style={{ fontSize: 10, textAlign: "center", color: C.success, marginTop: 2, fontWeight: 700 }}>عرض</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Light-box */}
      {selectedProof && (
        <div onClick={() => setSelectedProof(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, cursor: "zoom-out",
        }}>
          <img src={selectedProof} alt="إثبات" style={{
            maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }} />
        </div>
      )}
    </div>
  );
}
