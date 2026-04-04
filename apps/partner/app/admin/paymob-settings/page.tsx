"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF", surface: "#FFFFFF", surfaceLight: "#FAFAFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#16A34A", successSoft: "#DCFCE7",
  warning: "#F59E0B", warningSoft: "#FEF3C7",
  danger: "#EF4444", dangerSoft: "#FEF2F2",
  info: "#0EA5E9", infoSoft: "#E0F2FE",
};

interface PaymobConfig {
  paymob_secret_key: string;
  paymob_public_key: string;
  paymob_integration_id: string;
  paymob_hmac_secret: string;
  paymob_iframe_id: string;
  paymob_test_mode: string;
}

const PAYMOB_FIELDS: { key: keyof PaymobConfig; label: string; placeholder: string; type: string; desc: string }[] = [
  { key: "paymob_secret_key", label: "المفتاح السري (Secret Key)", placeholder: "sk_live_...", type: "password", desc: "يُستخدم لإنشاء Payment Intentions من السيرفر" },
  { key: "paymob_public_key", label: "المفتاح العام (Public Key)", placeholder: "pk_live_...", type: "text", desc: "يُستخدم في صفحة الدفع (Checkout) للعميل" },
  { key: "paymob_integration_id", label: "معرف التكامل (Integration ID)", placeholder: "123456", type: "text", desc: "معرف بوابة البطاقات (Credit/Debit Card)" },
  { key: "paymob_hmac_secret", label: "مفتاح HMAC", placeholder: "hmac_...", type: "password", desc: "للتحقق من صحة إشعارات الدفع (Callback Verification)" },
  { key: "paymob_iframe_id", label: "معرف الـ iFrame (اختياري)", placeholder: "123456", type: "text", desc: "إن كنت تستخدم iFrame بدلاً من Unified Checkout" },
  { key: "paymob_test_mode", label: "وضع الاختبار", placeholder: "", type: "toggle", desc: "عند التفعيل، يتم استخدام بيئة بايموب التجريبية" },
];

export default function PaymobSettingsPage() {
  const auth = useAdminAuth();

  const [paymobConfig, setPaymobConfig] = useState<PaymobConfig>({
    paymob_secret_key: "", paymob_public_key: "", paymob_integration_id: "",
    paymob_hmac_secret: "", paymob_iframe_id: "", paymob_test_mode: "false",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth.user || !auth.isSuperAdmin) return;

    (async () => {
      const sb = getSupabase();
      if (!sb) return;

      const { data: settings } = await (sb as any)
        .from("platform_settings")
        .select("key, value")
        .in("key", [
          "paymob_secret_key", "paymob_public_key", "paymob_integration_id",
          "paymob_hmac_secret", "paymob_iframe_id", "paymob_test_mode",
        ]);
      if (settings) {
        const cfg: any = {};
        for (const s of settings) cfg[s.key] = s.value || "";
        setPaymobConfig(prev => ({ ...prev, ...cfg }));
      }
      setLoading(false);
    })();
  }, [auth.user, auth.isSuperAdmin]);

  async function savePaymobConfig() {
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    setMsg(null);

    try {
      for (const field of PAYMOB_FIELDS) {
        const value = paymobConfig[field.key];
        const { data: existing } = await (sb as any)
          .from("platform_settings")
          .select("key")
          .eq("key", field.key)
          .maybeSingle();

        if (existing) {
          const { error } = await (sb as any)
            .from("platform_settings")
            .update({ value })
            .eq("key", field.key);
          if (error) throw error;
        } else {
          const { error } = await (sb as any)
            .from("platform_settings")
            .insert({ key: field.key, value, label: field.label });
          if (error) throw error;
        }
      }
      setMsg({ ok: true, text: "تم حفظ إعدادات بايموب بنجاح" });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ ok: false, text: "فشل الحفظ: " + (err?.message || err) });
    } finally {
      setSaving(false);
    }
  }

  if (auth.loading || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${C.primarySoft}`, borderTopColor: C.primary, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: C.text }}>غير مصرح بالدخول</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>هذه الصفحة لحساب السوبر أدمن فقط</div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 900, fontSize: 22, color: C.text, margin: "0 0 6px 0" }}>
          🏦 إعدادات بوابة بايموب
        </h1>
        <p style={{ color: C.textMuted, fontSize: 13, margin: "0 0 4px 0" }}>
          اضبط بيانات حساب بايموب لاستقبال مدفوعات البطاقات البنكية (Credit Card / Debit Card).
        </p>
        <p style={{ color: C.warning, fontSize: 12, margin: 0, fontWeight: 700 }}>
          ⚠️ تنبيه: هذه البيانات تُحفظ في قاعدة البيانات. لتفعيلها في Edge Functions يجب أيضاً تحديث الـ Secrets في لوحة Supabase.
        </p>
      </div>

      <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {PAYMOB_FIELDS.map(field => {
            const isToggle = field.type === "toggle";
            const isSecret = field.type === "password";
            const isRevealed = showSecrets[field.key];

            return (
              <div key={field.key} style={{
                padding: 16, borderRadius: 14,
                background: C.surfaceLight,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isToggle ? 0 : 8 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 900, color: C.text, display: "block" }}>
                      {field.label}
                    </label>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{field.desc}</span>
                  </div>
                  {isToggle && (
                    <button
                      onClick={() => setPaymobConfig(prev => ({
                        ...prev,
                        paymob_test_mode: prev.paymob_test_mode === "true" ? "false" : "true",
                      }))}
                      style={{
                        width: 50, height: 28, borderRadius: 14, border: "none",
                        background: paymobConfig.paymob_test_mode === "true" ? C.warning : C.success,
                        cursor: "pointer", position: "relative", transition: "all 0.3s",
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 12, background: "white",
                        position: "absolute", top: 2,
                        right: paymobConfig.paymob_test_mode === "true" ? 24 : 2,
                        transition: "right 0.2s",
                      }} />
                    </button>
                  )}
                </div>
                {isToggle && (
                  <div style={{
                    marginTop: 8, fontSize: 12, fontWeight: 700,
                    color: paymobConfig.paymob_test_mode === "true" ? C.warning : C.success,
                  }}>
                    {paymobConfig.paymob_test_mode === "true" ? "⚠️ وضع الاختبار مفعّل — لن تتم محاسبة بطاقات حقيقية" : "✅ وضع الإنتاج — المدفوعات حقيقية"}
                  </div>
                )}
                {!isToggle && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type={isSecret && !isRevealed ? "password" : "text"}
                      value={paymobConfig[field.key]}
                      onChange={e => setPaymobConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      dir="ltr"
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: 10,
                        border: `1.5px solid ${C.border}`, fontSize: 13,
                        color: C.text, background: C.surface,
                        fontFamily: "monospace",
                      }}
                    />
                    {isSecret && (
                      <button
                        onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        style={{
                          padding: "8px 14px", borderRadius: 10,
                          border: `1px solid ${C.border}`, background: C.surface,
                          color: C.textMuted, fontSize: 13, cursor: "pointer",
                        }}
                      >
                        {isRevealed ? "🙈" : "👁"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={savePaymobConfig}
            disabled={saving}
            style={{
              padding: "12px 36px", borderRadius: 14,
              fontWeight: 900, fontSize: 14, border: "none",
              background: saving ? C.primarySoft : C.primary,
              color: saving ? C.textMuted : "white",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ إعدادات بايموب"}
          </button>
          {msg && (
            <span style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: msg.ok ? C.successSoft : C.dangerSoft,
              color: msg.ok ? C.success : C.danger,
            }}>
              {msg.ok ? "✓ " : "✗ "}{msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Instructions box */}
      <div style={{
        marginTop: 24, padding: 20, borderRadius: 14,
        background: `${C.info}10`, border: `1px solid ${C.info}40`,
      }}>
        <h3 style={{ fontWeight: 900, fontSize: 14, color: C.info, margin: "0 0 10px 0" }}>
          📋 خطوات تفعيل بايموب
        </h3>
        <ol style={{ margin: 0, paddingRight: 20, fontSize: 13, color: C.text, lineHeight: 2.2 }}>
          <li>سجّل في <span dir="ltr" style={{ fontWeight: 700 }}>accept.paymob.com</span> واحصل على حساب تاجر</li>
          <li>من لوحة بايموب: انسخ <strong>Secret Key</strong> و <strong>Public Key</strong></li>
          <li>أنشئ Integration جديد (نوع: Online Card) وانسخ الـ <strong>Integration ID</strong></li>
          <li>من إعدادات الأمان: انسخ <strong>HMAC Secret</strong></li>
          <li>الصق جميع القيم في الحقول أعلاه واضغط حفظ</li>
          <li>أيضاً أضف نفس القيم كـ Secrets في <strong>Supabase Dashboard → Edge Functions → Secrets</strong></li>
          <li>اضبط Callback URL في بايموب إلى: <code dir="ltr" style={{ background: C.surfaceLight, padding: "2px 8px", borderRadius: 6 }}>{"https://<PROJECT>.supabase.co/functions/v1/paymob-callback"}</code></li>
        </ol>
      </div>
    </div>
  );
}
