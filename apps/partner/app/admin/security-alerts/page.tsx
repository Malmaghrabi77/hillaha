"use client";

import React, { useEffect, useState, useCallback } from "react";
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

const ALERT_LABELS: Record<string, string> = {
  rate_limit_triggered: "تجاوز حد المحاولات",
  ip_rate_limit: "حظر IP",
  suspicious_velocity: "نشاط مشبوه (سرعة)",
  high_value_attempt: "محاولة مبلغ كبير",
  invalid_hmac: "توقيع HMAC غير صالح",
  geo_blocked: "حظر جغرافي",
  "2fa_failed": "فشل التحقق الثنائي",
  "2fa_max_attempts": "استنفاد محاولات 2FA",
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  low: { bg: "#DBEAFE", color: "#3B82F6", label: "منخفض" },
  medium: { bg: C.warningSoft, color: C.warning, label: "متوسط" },
  high: { bg: "#FED7AA", color: "#EA580C", label: "مرتفع" },
  critical: { bg: C.dangerSoft, color: C.danger, label: "حرج" },
};

interface DashboardStats {
  unread_alerts: number;
  critical_alerts: number;
  blocked_users: number;
  today_attempts: number;
  today_success: number;
  today_failed: number;
  recent_alerts: any[];
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  user_id: string | null;
  details: any;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
}

export default function SecurityAlertsPage() {
  const auth = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("unread");
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    // Fetch security dashboard stats
    const { data: dashData, error: dashError } = await (supabase as any).rpc("get_security_dashboard");
    if (dashData && !dashError) {
      setStats(dashData as any);
    }

    // Fetch all alerts
    let query = (supabase as any)
      .from("wallet_security_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "unread") query = query.eq("is_read", false);
    if (filter === "critical") query = query.eq("severity", "critical");

    const { data: alertRows } = await query;
    if (alertRows) setAlerts(alertRows);

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (auth.loading) return;
    if (auth.user && (auth.isSuperAdmin || auth.isAccountant)) fetchData();
  }, [auth.user, auth.loading, fetchData]);

  const handleResolve = async (alertId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    setResolving(alertId);
    const { data } = await (supabase as any).rpc("resolve_security_alert", { p_alert_id: alertId });
    if ((data as any)?.success) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true, resolved_at: new Date().toISOString() } : a)));
      if (stats) setStats({ ...stats, unread_alerts: Math.max(0, stats.unread_alerts - 1) });
    }
    setResolving(null);
  };

  const handleResolveAll = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const unread = alerts.filter((a) => !a.is_read);
    for (const alert of unread) {
      await (supabase as any).rpc("resolve_security_alert", { p_alert_id: alert.id });
    }
    fetchData();
  };

  if (auth.loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>;
  }

  if (!auth.isSuperAdmin && !auth.isAccountant) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.danger }}>
        هذه الصفحة متاحة للسوبر أدمن والمحاسبين فقط
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text }}>🛡️ مركز الأمان</h1>
        {auth.isSuperAdmin && alerts.some((a) => !a.is_read) && (
          <button
            onClick={handleResolveAll}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: C.success,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            معالجة الكل
          </button>
        )}
      </div>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 28 }}>مراقبة التنبيهات الأمنية ومحاولات الاختراق في الوقت الفعلي</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>جارٍ التحميل...</div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { label: "تنبيهات غير مقروءة", value: stats.unread_alerts, icon: "🔔", bg: stats.unread_alerts > 0 ? C.warningSoft : C.successSoft, color: stats.unread_alerts > 0 ? C.warning : C.success },
                { label: "تنبيهات حرجة", value: stats.critical_alerts, icon: "🚨", bg: stats.critical_alerts > 0 ? C.dangerSoft : C.successSoft, color: stats.critical_alerts > 0 ? C.danger : C.success },
                { label: "مستخدمون محظورون", value: stats.blocked_users, icon: "🚫", bg: stats.blocked_users > 0 ? C.dangerSoft : C.successSoft, color: stats.blocked_users > 0 ? C.danger : C.success },
                { label: "محاولات اليوم", value: stats.today_attempts, icon: "📊", bg: C.primarySoft, color: C.primary },
                { label: "ناجحة اليوم", value: stats.today_success, icon: "✅", bg: C.successSoft, color: C.success },
                { label: "فاشلة اليوم", value: stats.today_failed, icon: "❌", bg: stats.today_failed > 0 ? C.warningSoft : C.successSoft, color: stats.today_failed > 0 ? C.warning : C.success },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>{card.label}</span>
                    <span style={{ fontSize: 20, width: 34, height: 34, borderRadius: 8, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {card.icon}
                    </span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {([
              { key: "unread", label: "غير مقروءة" },
              { key: "critical", label: "حرجة" },
              { key: "all", label: "الكل" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: `1.5px solid ${filter === tab.key ? C.primary : C.border}`,
                  background: filter === tab.key ? C.primarySoft : C.surface,
                  color: filter === tab.key ? C.primary : C.textMuted,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alerts List */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            {alerts.length === 0 ? (
              <div style={{ padding: 50, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 6 }}>لا توجد تنبيهات</div>
                <div style={{ color: C.textMuted, fontSize: 13 }}>النظام آمن — لا توجد تنبيهات أمنية حالياً</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: C.text }}>النوع</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: C.text }}>الخطورة</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: C.text }}>التفاصيل</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: C.text }}>التاريخ</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: C.text }}>الحالة</th>
                    {auth.isSuperAdmin && (
                      <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, color: C.text }}>إجراء</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => {
                    const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium;
                    return (
                      <tr key={alert.id} style={{ borderTop: `1px solid ${C.border}`, background: alert.is_read ? "transparent" : "#FFFBEB" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 700 }}>
                          {ALERT_LABELS[alert.alert_type] || alert.alert_type}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: sev.bg, color: sev.color }}>
                            {sev.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textMuted, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {alert.details?.ip_hint && <span>IP: {alert.details.ip_hint} | </span>}
                          {alert.details?.failed_attempts && <span>محاولات: {alert.details.failed_attempts} | </span>}
                          {alert.details?.amount && <span>مبلغ: {alert.details.amount} | </span>}
                          {alert.details?.reason && <span>{alert.details.reason} | </span>}
                          {alert.details?.code_prefix && <span>كود: {alert.details.code_prefix}</span>}
                          {alert.user_id && <div style={{ marginTop: 2, fontSize: 11, fontFamily: "monospace" }}>UID: {alert.user_id.substring(0, 8)}...</div>}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 11, color: C.textMuted }}>
                          {new Date(alert.created_at).toLocaleString("ar-EG")}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: alert.is_read ? C.successSoft : C.warningSoft,
                            color: alert.is_read ? C.success : C.warning,
                          }}>
                            {alert.is_read ? "تمت المعالجة" : "جديد"}
                          </span>
                        </td>
                        {auth.isSuperAdmin && (
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            {!alert.is_read && (
                              <button
                                onClick={() => handleResolve(alert.id)}
                                disabled={resolving === alert.id}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: C.success,
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: 11,
                                  cursor: "pointer",
                                  opacity: resolving === alert.id ? 0.5 : 1,
                                }}
                              >
                                {resolving === alert.id ? "..." : "معالجة"}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Security Layers Status */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16 }}>🔐 طبقات الحماية النشطة</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {[
                { name: "تقييد المحاولات (User)", desc: "5 محاولات فاشلة → قفل 15 دقيقة", active: true },
                { name: "تقييد IP", desc: "10 محاولات فاشلة من نفس IP → قفل 30 دقيقة", active: true },
                { name: "كشف السرعة المشبوهة", desc: "3 عمليات/ساعة، 10/يوم، 5000 جنيه/ساعة", active: true },
                { name: "تأكيد ثنائي (2FA)", desc: "أكواد بمبلغ 500 جنيه أو أكثر تتطلب رمز تأكيد", active: true },
                { name: "تقييد جغرافي", desc: "الأكواد المقيّدة بمنطقة تُرفض خارجها", active: true },
                { name: "توقيع HMAC-SHA256", desc: "كل كود موقّع رقمياً — كشف التلاعب فوري", active: true },
                { name: "تنظيف تلقائي", desc: "حذف المحاولات القديمة والتنبيهات المعالجة", active: true },
              ].map((layer) => (
                <div
                  key={layer.name}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: C.successSoft,
                    color: C.success,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 900,
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    ✓
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 2 }}>{layer.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{layer.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
