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

type DeliveryRule = {
  id: string;
  label_ar: string;
  city: string;
  base_distance_km: number;
  base_price: number;
  per_km_price: number;
  min_fee: number;
  max_fee: number;
  max_distance_km: number;
  is_active: boolean;
  is_default: boolean;
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
  { key: "delivery_pricing", label: "تسعير التوصيل" },
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

  // Delivery pricing rules state
  const [deliveryRules, setDeliveryRules] = useState<DeliveryRule[]>([]);
  const [dpPendingCount, setDpPendingCount] = useState(0);
  const [editingRule, setEditingRule] = useState<DeliveryRule | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    label_ar: "", city: "Qena", base_distance_km: "2", base_price: "25",
    per_km_price: "5", min_fee: "10", max_fee: "100", max_distance_km: "50",
  });
  const [ruleReason, setRuleReason] = useState("");

  // Create new service state
  const [showCreateService, setShowCreateService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    label_ar: "", description_ar: "", icon: "", price: "", service_key: "",
  });

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

      const [servicesRes, pendingRes, dpRulesRes, dpPendingRes] = await Promise.all([
        (supabase as any)
          .from("service_prices")
          .select("*")
          .order("sort_order"),
        (supabase as any)
          .from("price_change_requests")
          .select("service_price_id")
          .eq("approval_status", "pending"),
        (supabase as any)
          .from("delivery_pricing_rules")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("delivery_pricing_change_requests")
          .select("id")
          .eq("approval_status", "pending"),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      setServices((servicesRes.data as ServicePrice[]) || []);

      // Delivery pricing rules
      if (!dpRulesRes.error) setDeliveryRules((dpRulesRes.data as DeliveryRule[]) || []);
      setDpPendingCount(!dpPendingRes.error && dpPendingRes.data ? dpPendingRes.data.length : 0);

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

  // ---- Create new service handlers ----
  const openCreateService = () => {
    setShowCreateService(true);
    setServiceForm({ label_ar: "", description_ar: "", icon: "", price: "", service_key: "" });
    setErrorMsg(null);
  };

  const closeCreateService = () => {
    setShowCreateService(false);
    setErrorMsg(null);
  };

  const handleCreateService = async () => {
    if (!auth.user || !auth.isSuperAdmin) return;
    const f = serviceForm;
    if (!f.label_ar.trim()) { setErrorMsg("يرجى إدخال اسم الخدمة"); return; }
    if (!f.service_key.trim()) { setErrorMsg("يرجى إدخال مفتاح الخدمة (بالإنجليزية)"); return; }
    const price = parseFloat(f.price);
    if (isNaN(price) || price <= 0) { setErrorMsg("يرجى إدخال سعر صحيح أكبر من صفر"); return; }

    setSaving(true); setErrorMsg(null);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const maxSort = filteredServices.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
      const { error } = await (supabase as any).from("service_prices").insert({
        category: activeTab,
        service_key: f.service_key.trim().toLowerCase().replace(/\s+/g, "_"),
        label_ar: f.label_ar.trim(),
        description_ar: f.description_ar.trim(),
        icon: f.icon.trim() || "📦",
        price,
        price_unit: activeTab === "delivery_p2p" ? "per_trip" : "per_visit",
        sort_order: maxSort + 1,
      });
      if (error) throw error;

      setSuccessMsg("تم إضافة الخدمة بنجاح");
      closeCreateService();
      await loadData();
    } catch (err: any) {
      if (err?.message?.includes("duplicate key") || err?.message?.includes("unique")) {
        setErrorMsg("هذا المفتاح موجود بالفعل في هذا التصنيف");
      } else {
        setErrorMsg("حدث خطأ: " + (err?.message || "غير معروف"));
      }
    } finally {
      setSaving(false);
    }
  };

  // ---- Delivery pricing rule handlers ----
  const openRuleEdit = (rule: DeliveryRule) => {
    setEditingRule(rule);
    setShowCreateRule(false);
    setRuleForm({
      label_ar: rule.label_ar, city: rule.city,
      base_distance_km: String(rule.base_distance_km), base_price: String(rule.base_price),
      per_km_price: String(rule.per_km_price), min_fee: String(rule.min_fee),
      max_fee: String(rule.max_fee), max_distance_km: String(rule.max_distance_km),
    });
    setRuleReason("");
    setErrorMsg(null);
  };

  const openRuleCreate = () => {
    setEditingRule(null);
    setShowCreateRule(true);
    setRuleForm({
      label_ar: "", city: "Qena", base_distance_km: "2", base_price: "25",
      per_km_price: "5", min_fee: "10", max_fee: "100", max_distance_km: "50",
    });
    setRuleReason("");
    setErrorMsg(null);
  };

  const closeRuleModal = () => {
    setEditingRule(null);
    setShowCreateRule(false);
    setErrorMsg(null);
  };

  const handleRuleSave = async () => {
    if (!auth.user) return;
    const f = ruleForm;
    if (!f.label_ar.trim()) { setErrorMsg("يرجى إدخال اسم القاعدة"); return; }
    const vals = {
      base_distance_km: parseFloat(f.base_distance_km), base_price: parseFloat(f.base_price),
      per_km_price: parseFloat(f.per_km_price), min_fee: parseFloat(f.min_fee),
      max_fee: parseFloat(f.max_fee), max_distance_km: parseFloat(f.max_distance_km),
    };
    if (Object.values(vals).some(v => isNaN(v) || v < 0)) { setErrorMsg("يرجى إدخال قيم رقمية صحيحة"); return; }
    if (!auth.isSuperAdmin && !ruleReason.trim()) { setErrorMsg("يرجى كتابة سبب التعديل"); return; }

    setSaving(true); setErrorMsg(null);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      if (auth.isSuperAdmin) {
        if (showCreateRule) {
          const { error } = await (supabase as any).from("delivery_pricing_rules").insert({
            label_ar: f.label_ar.trim(), city: f.city.trim(),
            ...vals, is_active: true, created_by: auth.user.id,
          });
          if (error) throw error;
        } else if (editingRule) {
          const { error } = await (supabase as any).from("delivery_pricing_rules")
            .update({ label_ar: f.label_ar.trim(), city: f.city.trim(), ...vals, updated_at: new Date().toISOString() })
            .eq("id", editingRule.id);
          if (error) throw error;
        }
        setSuccessMsg(showCreateRule ? "تم إنشاء القاعدة بنجاح" : "تم تحديث القاعدة بنجاح");
      } else {
        // Regional manager: submit change request
        const reqData: Record<string, any> = {
          change_type: showCreateRule ? "create" : "update",
          delivery_rule_id: editingRule?.id ?? null,
          proposed_label_ar: f.label_ar.trim(), proposed_city: f.city.trim(),
          proposed_base_distance_km: vals.base_distance_km, proposed_base_price: vals.base_price,
          proposed_per_km_price: vals.per_km_price, proposed_min_fee: vals.min_fee,
          proposed_max_fee: vals.max_fee, proposed_max_distance_km: vals.max_distance_km,
          reason: ruleReason.trim(), requested_by: auth.user.id,
        };
        if (editingRule) {
          reqData.current_label_ar = editingRule.label_ar;
          reqData.current_city = editingRule.city;
          reqData.current_base_distance_km = editingRule.base_distance_km;
          reqData.current_base_price = editingRule.base_price;
          reqData.current_per_km_price = editingRule.per_km_price;
          reqData.current_min_fee = editingRule.min_fee;
          reqData.current_max_fee = editingRule.max_fee;
          reqData.current_max_distance_km = editingRule.max_distance_km;
        }
        const { error } = await (supabase as any).from("delivery_pricing_change_requests").insert(reqData);
        if (error) throw error;
        setSuccessMsg("تم إرسال طلب التعديل — بانتظار اعتماد السوبر أدمن");
      }
      closeRuleModal();
      await loadData();
    } catch (err: any) {
      setErrorMsg("حدث خطأ: " + (err?.message || "غير معروف"));
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleActive = async (rule: DeliveryRule) => {
    if (!auth.isSuperAdmin) return;
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      await (supabase as any).from("delivery_pricing_rules")
        .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
        .eq("id", rule.id);
      await loadData();
    } catch (err) { console.error(err); }
  };

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
          const tabPendingCount = tab.key === "delivery_pricing"
            ? dpPendingCount
            : services
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

      {/* ======= DELIVERY PRICING TAB ======= */}
      {activeTab === "delivery_pricing" ? (
        <div>
          {/* Add rule button */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={openRuleCreate}
              style={{
                padding: "10px 24px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.primary}, #EC4899)`,
                color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}
            >
              + إضافة قاعدة تسعير
            </button>
          </div>

          {deliveryRules.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center", color: C.textMuted, fontSize: 14 }}>
              لا توجد قواعد تسعير — أنشئ قاعدة جديدة
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {deliveryRules.map((rule) => (
                <div key={rule.id} style={{
                  background: C.surface, border: `2px solid ${rule.is_active ? C.primary : C.border}`,
                  borderRadius: 16, padding: 20, opacity: rule.is_active ? 1 : 0.6,
                  boxShadow: rule.is_default ? `0 4px 12px ${C.primary}20` : "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {/* Rule header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
                        {rule.label_ar}
                      </h3>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 8, background: C.primarySoft, color: C.primary }}>
                          {rule.city}
                        </span>
                        {rule.is_default && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 8, background: C.successSoft, color: C.success }}>
                            افتراضي
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 8, background: rule.is_active ? C.successSoft : C.dangerSoft, color: rule.is_active ? C.success : C.danger }}>
                          {rule.is_active ? "نشط" : "معطّل"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing details */}
                  <div style={{ background: C.bg, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    {[
                      { label: "المسافة الأساسية", value: `${rule.base_distance_km} كم` },
                      { label: "السعر الأساسي", value: `${rule.base_price} جنيه` },
                      { label: "لكل كم إضافي", value: `+${rule.per_km_price} جنيه` },
                      { label: "الحد الأدنى", value: `${rule.min_fee} جنيه` },
                      { label: "الحد الأقصى", value: `${rule.max_fee} جنيه` },
                      { label: "أقصى مسافة", value: `${rule.max_distance_km} كم` },
                    ].map((row, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 5 ? 6 : 0 }}>
                        <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 800 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => openRuleEdit(rule)}
                      style={{
                        flex: 1, padding: "10px", borderRadius: 10,
                        border: `1px solid ${C.primary}`, background: "transparent",
                        color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      تعديل
                    </button>
                    {auth.isSuperAdmin && (
                      <button
                        onClick={() => toggleRuleActive(rule)}
                        style={{
                          padding: "10px 16px", borderRadius: 10, border: "none",
                          background: rule.is_active ? C.dangerSoft : C.successSoft,
                          color: rule.is_active ? C.danger : C.success,
                          fontWeight: 700, fontSize: 13, cursor: "pointer",
                        }}
                      >
                        {rule.is_active ? "تعطيل" : "تفعيل"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      /* ======= SERVICE PRICES TABS ======= */
      <>
      {/* Add service button (super admin only) */}
      {auth.isSuperAdmin && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={openCreateService}
            style={{
              padding: "10px 24px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.primary}, #EC4899)`,
              color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer",
            }}
          >
            + إضافة خدمة جديدة
          </button>
        </div>
      )}
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
      </>
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

      {/* ============ Delivery Pricing Rule Modal ============ */}
      {(editingRule || showCreateRule) && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeRuleModal(); }}
        >
          <div dir="rtl" style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 520, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>
                {showCreateRule ? "إنشاء قاعدة تسعير جديدة" : "تعديل قاعدة التسعير"}
              </h2>
              <button onClick={closeRuleModal} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.bg, fontSize: 18, cursor: "pointer", color: C.textMuted }}>x</button>
            </div>

            {/* Form fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              {/* Label - full width */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>اسم القاعدة</label>
                <input value={ruleForm.label_ar} onChange={(e) => setRuleForm({ ...ruleForm, label_ar: e.target.value })}
                  placeholder="مثال: تسعير توصيل قنا" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* City */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>المدينة</label>
                <input value={ruleForm.city} onChange={(e) => setRuleForm({ ...ruleForm, city: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* Base distance */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>المسافة الأساسية (كم)</label>
                <input type="number" min={0} step="0.5" value={ruleForm.base_distance_km} onChange={(e) => setRuleForm({ ...ruleForm, base_distance_km: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              {/* Base price */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>السعر الأساسي (جنيه)</label>
                <input type="number" min={0} step="0.5" value={ruleForm.base_price} onChange={(e) => setRuleForm({ ...ruleForm, base_price: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              {/* Per km price */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>سعر كل كم إضافي (جنيه)</label>
                <input type="number" min={0} step="0.5" value={ruleForm.per_km_price} onChange={(e) => setRuleForm({ ...ruleForm, per_km_price: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              {/* Min fee */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>الحد الأدنى (جنيه)</label>
                <input type="number" min={0} step="1" value={ruleForm.min_fee} onChange={(e) => setRuleForm({ ...ruleForm, min_fee: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              {/* Max fee */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>الحد الأقصى (جنيه)</label>
                <input type="number" min={0} step="1" value={ruleForm.max_fee} onChange={(e) => setRuleForm({ ...ruleForm, max_fee: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              {/* Max distance */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>أقصى مسافة توصيل (كم)</label>
                <input type="number" min={0} step="1" value={ruleForm.max_distance_km} onChange={(e) => setRuleForm({ ...ruleForm, max_distance_km: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
            </div>

            {/* Example calculation */}
            <div style={{ background: C.primarySoft, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 12, color: C.text }}>
              <strong>مثال:</strong> التوصيل لمسافة 5 كم ={" "}
              <strong style={{ color: C.primary }}>
                {(() => {
                  const bd = parseFloat(ruleForm.base_distance_km) || 0;
                  const bp = parseFloat(ruleForm.base_price) || 0;
                  const pk = parseFloat(ruleForm.per_km_price) || 0;
                  const mn = parseFloat(ruleForm.min_fee) || 0;
                  const mx = parseFloat(ruleForm.max_fee) || 999;
                  let fee = bp + Math.max(0, 5 - bd) * pk;
                  fee = Math.max(mn, Math.min(mx, fee));
                  return `${fee.toFixed(1)} جنيه`;
                })()}
              </strong>
            </div>

            {/* Reason (for non-super-admin) */}
            {!auth.isSuperAdmin && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
                  سبب التعديل <span style={{ color: C.danger }}>(مطلوب)</span>
                </label>
                <textarea value={ruleReason} onChange={(e) => setRuleReason(e.target.value)} rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  placeholder="اكتب سبب التعديل..." />
              </div>
            )}

            {errorMsg && (
              <div style={{ background: C.dangerSoft, border: `1px solid ${C.danger}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 700, color: C.danger }}>
                {errorMsg}
              </div>
            )}

            {!auth.isSuperAdmin && (
              <div style={{ background: C.warningSoft, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, fontWeight: 700, color: "#92400E" }}>
                سيتم إرسال الطلب للسوبر أدمن للاعتماد
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={closeRuleModal} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                إلغاء
              </button>
              <button onClick={handleRuleSave} disabled={saving} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: saving ? C.textMuted : `linear-gradient(135deg, ${C.primary}, #EC4899)`,
                color: "white", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "جارٍ الحفظ..." : auth.isSuperAdmin ? (showCreateRule ? "إنشاء" : "حفظ") : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Create Service Modal ============ */}
      {showCreateService && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeCreateService(); }}
        >
          <div dir="rtl" style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>
                إضافة خدمة جديدة — {TABS.find(t => t.key === activeTab)?.label}
              </h2>
              <button onClick={closeCreateService} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.bg, fontSize: 18, cursor: "pointer", color: C.textMuted }}>x</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              {/* Service name */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>اسم الخدمة (عربي)</label>
                <input value={serviceForm.label_ar} onChange={(e) => setServiceForm({ ...serviceForm, label_ar: e.target.value })}
                  placeholder="مثال: توصيل خاص" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* Service key */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>مفتاح الخدمة (إنجليزي فريد)</label>
                <input value={serviceForm.service_key} onChange={(e) => setServiceForm({ ...serviceForm, service_key: e.target.value })}
                  placeholder="مثال: express_delivery" dir="ltr" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", textAlign: "left" }} />
              </div>
              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>الوصف</label>
                <input value={serviceForm.description_ar} onChange={(e) => setServiceForm({ ...serviceForm, description_ar: e.target.value })}
                  placeholder="وصف مختصر للخدمة" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Icon */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>الأيقونة (إيموجي)</label>
                  <input value={serviceForm.icon} onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
                    placeholder="📦" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 18, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
                </div>
                {/* Price */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>السعر (جنيه)</label>
                  <input type="number" min={0} step="0.5" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    placeholder="0" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 16, fontWeight: 800, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: C.dangerSoft, border: `1px solid ${C.danger}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 700, color: C.danger }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={closeCreateService} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                إلغاء
              </button>
              <button onClick={handleCreateService} disabled={saving} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: saving ? C.textMuted : `linear-gradient(135deg, ${C.primary}, #EC4899)`,
                color: "white", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "جارٍ الإضافة..." : "إضافة الخدمة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
