"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
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

interface PartnerOffer {
  id: string;
  title_ar: string;
  partner_id: string;
  offer_type: string;
  discount_percentage?: number;
  discount_value?: number;
  approval_status: string;
  start_date: string;
  end_date: string;
  partners?: { name: string; name_ar: string };
}

export default function ApproveOffersPage() {
  const auth = useAdminAuth();
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<PartnerOffer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!auth.user || (!auth.isSuperAdmin && auth.role !== 'admin')) return;
    loadOffers();
  }, [auth.user]);

  const loadOffers = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await (supabase.from("partner_offers") as any)
        .select("*, partners(name, name_ar)")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (offerId: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const { error } = await (supabase.from("partner_offers") as any)
        .update({
          approval_status: "approved",
          is_approved: true,
          approved_by: auth.user.id,
          approved_at: new Date(),
        })
        .eq("id", offerId);

      if (error) throw error;

      await (supabase.from("offer_approval_logs") as any).insert({
        offer_id: offerId,
        admin_id: auth.user.id,
        admin_role: auth.isSuperAdmin ? "super_admin" : "regional_manager",
        action: "approved",
      });

      loadOffers();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error approving offer:", error);
    }
  };

  const handleReject = async (offerId: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const { error } = await (supabase.from("partner_offers") as any)
        .update({
          approval_status: "rejected",
          is_approved: false,
          approved_by: auth.user.id,
          approved_at: new Date(),
          rejection_reason: rejectionReason,
        })
        .eq("id", offerId);

      if (error) throw error;

      await (supabase.from("offer_approval_logs") as any).insert({
        offer_id: offerId,
        admin_id: auth.user.id,
        admin_role: auth.isSuperAdmin ? "super_admin" : "regional_manager",
        action: "rejected",
        notes: rejectionReason,
      });

      loadOffers();
      setIsModalOpen(false);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting offer:", error);
    }
  };

  if (!auth.isSuperAdmin && auth.role !== 'admin') {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ color: C.danger, fontWeight: 700 }}>
          ⛔ هذه الصفحة متاحة فقط للسوبر أدمن والمدير الإقليمي
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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
          ✅ اعتماد عروض الشركاء
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          {offers.length} عروض في الانتظار
        </p>
      </div>

      {offers.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: "center",
          borderRadius: 16,
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            لا توجد عروض معلقة للاعتماد
          </p>
        </div>
      ) : (
        offers.map((offer) => (
          <div
            key={offer.id}
            style={{
              padding: 20,
              borderRadius: 16,
              background: C.surface,
              border: `2px solid ${C.warningLight}`,
              marginBottom: 16,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 8px 24px rgba(139,92,246,0.15)";
              el.style.borderColor = C.warning;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "none";
              el.style.borderColor = C.warningLight;
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: "0 0 4px 0" }}>
                  🏪 {offer.partners?.name_ar}
                </h3>
                <p style={{ fontSize: 14, color: C.primary, fontWeight: 700, margin: 0 }}>
                  {offer.title_ar}
                </p>
              </div>
              <div style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: C.warningLight,
                color: C.warning,
                fontSize: 12,
                fontWeight: 700,
              }}>
                ⏳ بانتظار الموافقة
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              {offer.offer_type === 'percentage' && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: C.successLight,
                  color: C.success,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {offer.discount_percentage}%
                </div>
              )}
              {offer.offer_type === 'fixed_amount' && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: C.successLight,
                  color: C.success,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {offer.discount_value} ج.م
                </div>
              )}
              <div style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: C.surfaceLight,
                color: C.text,
                fontSize: 12,
                fontWeight: 600,
              }}>
                {new Date(offer.start_date).toLocaleDateString('ar-EG')} - {new Date(offer.end_date).toLocaleDateString('ar-EG')}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => handleApprove(offer.id)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: C.success,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                ✓ اعتماد
              </button>
              <button
                onClick={() => {
                  setSelectedOffer(offer);
                  setIsModalOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: C.danger,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                ✕ رفض
              </button>
            </div>
          </div>
        ))
      )}

      {/* Rejection Modal */}
      {isModalOpen && selectedOffer && (
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
            <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: "0 0 16px 0" }}>
              ✕ سبب الرفض
            </h2>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="أدخل سبب الرفض..."
              style={{
                width: "100%",
                minHeight: 100,
                padding: "12px",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: 13,
                outline: "none",
                marginBottom: 16,
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setRejectionReason("");
                  setSelectedOffer(null);
                }}
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
                onClick={() => handleReject(selectedOffer.id)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: C.danger,
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕ رفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
