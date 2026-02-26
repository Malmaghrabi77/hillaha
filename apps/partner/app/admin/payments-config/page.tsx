"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
  primaryLight: "#C4B5FD",
  primaryDark: "#6D28D9",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  surfaceLight: "#FAFAFF",
  border: "#E7E3FF",
};

interface PaymentMethod {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  icon: string;
  description: string;
  description_ar: string;
  category: string;
  is_enabled: boolean;
  commission_rate: number;
  requires_config: boolean;
}

export default function PaymentMethodsPage() {
  const auth = useAdminAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    merchant_id: "",
    api_key: "",
    secret_key: "",
    webhook_url: "",
    test_mode: true,
  });

  useEffect(() => {
    if (!auth.user || (!auth.isSuperAdmin && auth.role !== 'admin')) return;
    loadPaymentMethods();
  }, [auth.user, auth.isSuperAdmin, auth.role]);

  const loadPaymentMethods = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await (supabase.from("payment_methods") as any)
        .select("*")
        .order("category");

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error("Error loading payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentMethod = async (methodId: string, currentState: boolean) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await (supabase.from("payment_methods") as any)
        .update({ is_enabled: !currentState })
        .eq("id", methodId);

      if (error) throw error;

      setMethods(methods.map(m => m.id === methodId ? { ...m, is_enabled: !currentState } : m));

      // Log the action
      await (supabase.from("payment_method_logs") as any).insert({
        payment_method_id: methodId,
        admin_id: auth.user?.id,
        action: !currentState ? "enabled" : "disabled",
        status: "success",
      });
    } catch (error) {
      console.error("Error toggling payment method:", error);
    }
  };

  const handleConfigSave = async () => {
    if (!selectedMethod) return;

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: existing, error: fetchError } = await (supabase
        .from("payment_method_configs") as any)
        .select("id")
        .eq("payment_method_id", selectedMethod.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (existing) {
        const { error } = await (supabase
          .from("payment_method_configs") as any)
          .update(configForm)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("payment_method_configs") as any)
          .insert({
            payment_method_id: selectedMethod.id,
            ...configForm,
          });

        if (error) throw error;
      }

      await (supabase.from("payment_method_logs") as any).insert({
        payment_method_id: selectedMethod.id,
        admin_id: auth.user?.id,
        action: "configured",
        status: "success",
        notes: `Configured ${selectedMethod.name_ar}`,
      });

      setIsModalOpen(false);
      setSelectedMethod(null);
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };

  if (!auth.isSuperAdmin && auth.role !== 'admin') {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ color: C.danger, fontWeight: 700 }}>
          ⛔ هذه الصفحة متاحة فقط للسوبر أدمن والفريد أدمن
        </p>
      </div>
    );
  }

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
          <p style={{ color: C.textMuted }}>جاري تحميل البيانات...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Group methods by category
  const groupedMethods = methods.reduce((acc: Record<string, PaymentMethod[]>, method) => {
    if (!acc[method.category]) acc[method.category] = [];
    acc[method.category].push(method);
    return acc;
  }, {});

  const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
    card: { label: "البطاقات البنكية", icon: "💳", color: C.primary },
    wallet: { label: "المحافظ الإلكترونية", icon: "📱", color: C.success },
    bank: { label: "التحويلات البنكية", icon: "🏦", color: C.warning },
    other: { label: "طرق أخرى", icon: "💰", color: "#EC4899" },
  };

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
          💳 إدارة طرق الدفع
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          تفعيل وتعطيل طرق الدفع وإدارة إعداداتها
        </p>
      </div>

      {/* Payment Methods by Category */}
      {Object.entries(groupedMethods).map(([category, categoryMethods]) => {
        const categoryInfo = categoryLabels[category] || { label: category, icon: "💳", color: C.primary };

        return (
          <div key={category} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 16,
              fontWeight: 800,
              color: C.text,
              margin: "0 0 16px 0",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              {categoryInfo.icon} {categoryInfo.label}
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}>
              {categoryMethods.map((method) => (
                <div
                  key={method.id}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    background: C.surface,
                    border: `1px solid ${method.is_enabled ? categoryInfo.color : C.border}`,
                    boxShadow: method.is_enabled ? `0 4px 12px ${categoryInfo.color}30` : "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {/* Method Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{method.icon}</div>
                      <h3 style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: "0 0 4px 0" }}>
                        {method.name_ar}
                      </h3>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                        {method.description_ar}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => togglePaymentMethod(method.id, method.is_enabled)}
                      style={{
                        width: 50,
                        height: 28,
                        borderRadius: 14,
                        border: "none",
                        background: method.is_enabled ? C.success : C.border,
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          background: "white",
                          position: "absolute",
                          top: 2,
                          right: method.is_enabled ? 24 : 2,
                          transition: "right 0.3s ease",
                        }}
                      />
                    </button>
                  </div>

                  {/* Commission Rate */}
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: C.surfaceLight,
                    marginBottom: 12,
                    fontSize: 12,
                    color: C.textMuted,
                  }}>
                    عمولة: <strong style={{ color: C.text }}>{(method.commission_rate * 100).toFixed(1)}%</strong>
                  </div>

                  {/* Configure Button */}
                  {method.requires_config && (
                    <button
                      onClick={() => {
                        setSelectedMethod(method);
                        setIsModalOpen(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 10,
                        border: `1px solid ${C.primary}`,
                        background: method.is_enabled ? C.primary : "transparent",
                        color: method.is_enabled ? "white" : C.primary,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = C.primaryDark;
                        (e.currentTarget as HTMLElement).style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = method.is_enabled ? C.primary : "transparent";
                        (e.currentTarget as HTMLElement).style.color = method.is_enabled ? "white" : C.primary;
                      }}
                    >
                      ⚙️ إعدادات
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Config Modal */}
      {isModalOpen && selectedMethod && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: C.surface,
            borderRadius: 16,
            padding: 24,
            maxWidth: 500,
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>
                {selectedMethod.icon} إعدادات {selectedMethod.name_ar}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: C.surfaceLight,
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {["merchant_id", "api_key", "secret_key", "webhook_url"].map((field) => (
                <div key={field}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
                    {field === "merchant_id" && "معرف التاجر"}
                    {field === "api_key" && "مفتاح الـ API"}
                    {field === "secret_key" && "مفتاح سري"}
                    {field === "webhook_url" && "رابط الـ Webhook"}
                  </label>
                  <input
                    type={field === "secret_key" ? "password" : "text"}
                    value={(configForm as any)[field]}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      [field]: e.target.value
                    })}
                    placeholder={`أدخل ${field}`}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
              ))}

              {/* Test Mode Toggle */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                borderRadius: 8,
                background: C.surfaceLight,
              }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  وضع الاختبار
                </label>
                <button
                  onClick={() => setConfigForm({ ...configForm, test_mode: !configForm.test_mode })}
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 14,
                    border: "none",
                    background: configForm.test_mode ? C.success : C.border,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: "white",
                    position: "absolute",
                    top: 2,
                    right: configForm.test_mode ? 24 : 2,
                    transition: "right 0.3s ease",
                  }} />
                </button>
              </div>
            </div>

            {/* Modal Buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: "transparent",
                  color: C.text,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfigSave}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: C.primary,
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                💾 احفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
