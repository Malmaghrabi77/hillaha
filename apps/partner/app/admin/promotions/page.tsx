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

interface Promotion {
  id: string;
  title_ar: string;
  promotion_type: string;
  discount_percentage?: number;
  discount_value?: number;
  code?: string;
  is_active: boolean;
  usage_count: number;
  usage_limit?: number;
  start_date: string;
  end_date: string;
}

export default function PromotionsPage() {
  const auth = useAdminAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title_ar: "",
    promotion_type: "percentage",
    discount_percentage: 0,
    discount_value: 0,
    code: "",
    usage_limit: 1000,
    min_order_amount: 0,
  });

  useEffect(() => {
    if (!auth.user || (!auth.isSuperAdmin && auth.role !== 'admin')) return;
    loadPromotions();
  }, [auth.user]);

  const loadPromotions = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await (supabase.from("promotions") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Error loading promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const { error } = await (supabase.from("promotions") as any).insert({
        ...formData,
        title_ar: formData.title_ar,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_by: auth.user.id,
        is_active: true,
      });

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        title_ar: "",
        promotion_type: "percentage",
        discount_percentage: 0,
        discount_value: 0,
        code: "",
        usage_limit: 1000,
        min_order_amount: 0,
      });
      loadPromotions();
    } catch (error) {
      console.error("Error creating promotion:", error);
    }
  };

  const togglePromotionActive = async (id: string, isActive: boolean) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await (supabase.from("promotions") as any)
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      loadPromotions();
    } catch (error) {
      console.error("Error toggling promotion:", error);
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

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
            🎁 إدارة العروض
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
            إنشاء وإدارة عروض ترويجية على المنصة
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "none",
            background: C.primary,
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.primaryDark;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.primary;
          }}
        >
          ➕ عرض جديد
        </button>
      </div>

      {/* Promotions List */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 16,
      }}>
        {promotions.map((promo) => (
          <div
            key={promo.id}
            style={{
              padding: 20,
              borderRadius: 16,
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 8px 24px rgba(139,92,246,0.15)";
              el.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              el.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: 0 }}>
                {promo.title_ar}
              </h3>
              <button
                onClick={() => togglePromotionActive(promo.id, promo.is_active)}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  border: "none",
                  background: promo.is_active ? C.success : C.border,
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
                    right: promo.is_active ? 24 : 2,
                    transition: "right 0.3s ease",
                  }}
                />
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              {promo.promotion_type === 'percentage' && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: C.successLight,
                  color: C.success,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {promo.discount_percentage}%
                </div>
              )}
              {promo.code && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: C.warningLight,
                  color: C.warning,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}>
                  {promo.code}
                </div>
              )}
              {promo.is_active && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: C.successLight,
                  color: C.success,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  ✓ نشط
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
              <div>الاستخدام: <strong>{promo.usage_count}/{promo.usage_limit}</strong></div>
              <div>المدة: {new Date(promo.start_date).toLocaleDateString('ar-EG')} - {new Date(promo.end_date).toLocaleDateString('ar-EG')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Promotion Modal */}
      {isModalOpen && (
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
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>
                🎁 عرض جديد
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

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="اسم العرض"
                value={formData.title_ar}
                onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />

              <select
                value={formData.promotion_type}
                onChange={(e) => setFormData({ ...formData, promotion_type: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value="percentage">نسبة مئوية</option>
                <option value="fixed_amount">مبلغ ثابت</option>
                <option value="free_delivery">توصيل مجاني</option>
              </select>

              {formData.promotion_type === 'percentage' && (
                <input
                  type="number"
                  placeholder="النسبة المئوية"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              )}

              <input
                type="text"
                placeholder="كود العرض (اختياري)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />

              <input
                type="number"
                placeholder="الحد الأدنى للطلب"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />

              <input
                type="number"
                placeholder="حد الاستخدام"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
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
                onClick={handleCreatePromotion}
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
                ➕ إنشاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
