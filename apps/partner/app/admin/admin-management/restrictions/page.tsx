"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
  primaryDark: "#6D28D9",
  success: "#10B981",
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

interface AdminAccount {
  id: string;
  email: string;
  role: string;
}

interface Restriction {
  id: string;
  restricted_function: string;
  reason: string;
  is_active: boolean;
  expires_at: string;
}

export default function AdminRestrictionsPage() {
  const auth = useAdminAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRestriction, setNewRestriction] = useState({
    restricted_function: "",
    reason: "",
    expires_at: "",
  });

  const restrictionOptions = [
    { value: "all", label: "تجميد كامل الحساب", icon: "🔒" },
    { value: "manage_payments", label: "منع إدارة الدفع", icon: "💳" },
    { value: "manage_promotions", label: "منع إدارة العروض", icon: "🎁" },
    { value: "approve_offers", label: "منع اعتماد العروض", icon: "✅" },
    { value: "manage_partners", label: "منع إدارة الشركاء", icon: "🏪" },
    { value: "manage_users", label: "منع إدارة المستخدمين", icon: "👥" },
    { value: "view_analytics", label: "منع عرض التحليلات", icon: "📈" },
  ];

  useEffect(() => {
    if (!auth.user || !auth.isSuperAdmin) return;
    loadData();
  }, [auth.user, auth.isSuperAdmin]);

  const loadData = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Load admins
      const { data: adminUsers } = await (supabase
        .from("profiles") as any)
        .select("id, role")
        .in("role", ["admin", "super_admin"]);

      if (adminUsers) {
        const adminIds = adminUsers.map(a => a.id);

        // Get user emails (simplified)
        const adminList = adminUsers.map((admin: any) => ({
          id: admin.id,
          email: admin.id,
          role: admin.role,
        }));

        setAdmins(adminList);

        if (adminList.length > 0) {
          setSelectedAdmin(adminList[0]);
          loadRestrictions(adminList[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRestrictions = async (adminId: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data } = await (supabase.from("admin_restrictions") as any)
        .select("*")
        .eq("admin_id", adminId);

      setRestrictions(data || []);
    } catch (error) {
      console.error("Error loading restrictions:", error);
    }
  };

  const handleAddRestriction = async () => {
    if (!selectedAdmin || !newRestriction.restricted_function) return;

    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const { error } = await (supabase.from("admin_restrictions") as any).insert({
        admin_id: selectedAdmin.id,
        restricted_function: newRestriction.restricted_function,
        reason: newRestriction.reason,
        is_active: true,
        restricted_by: auth.user.id,
        expires_at: newRestriction.expires_at ? new Date(newRestriction.expires_at).toISOString() : null,
      });

      if (error) throw error;

      setIsModalOpen(false);
      setNewRestriction({ restricted_function: "", reason: "", expires_at: "" });
      loadRestrictions(selectedAdmin.id);
    } catch (error) {
      console.error("Error adding restriction:", error);
    }
  };

  const removeRestriction = async (restrictionId: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await (supabase.from("admin_restrictions") as any)
        .update({ is_active: false })
        .eq("id", restrictionId);

      if (error) throw error;

      if (selectedAdmin) {
        loadRestrictions(selectedAdmin.id);
      }
    } catch (error) {
      console.error("Error removing restriction:", error);
    }
  };

  if (!auth.isSuperAdmin) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ color: C.danger, fontWeight: 700 }}>
          ⛔ هذه الصفحة متاحة فقط للسوبر أدمن
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
            🔒 تجميد الحسابات والوظائف
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
            إدارة التجميدات والقيود على الادمنة
          </p>
        </div>
        {selectedAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: C.danger,
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            🔒 إضافة تجميد
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Admins List */}
        <div style={{
          padding: 20,
          borderRadius: 16,
          background: C.surface,
          border: `1px solid ${C.border}`,
          height: "fit-content",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: "0 0 16px 0" }}>
            📋 الادمنة
          </h3>
          {admins.map((admin) => (
            <button
              key={admin.id}
              onClick={() => {
                setSelectedAdmin(admin);
                loadRestrictions(admin.id);
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: selectedAdmin?.id === admin.id ? "2px solid" : "1px solid",
                borderColor: selectedAdmin?.id === admin.id ? C.primary : C.border,
                background: selectedAdmin?.id === admin.id ? C.primary + "15" : C.surfaceLight,
                color: C.text,
                fontWeight: selectedAdmin?.id === admin.id ? 700 : 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "right",
                marginBottom: 8,
                transition: "all 0.2s",
              }}
            >
              {admin.role === "super_admin" ? "👑" : "👤"}
            </button>
          ))}
        </div>

        {/* Restrictions List */}
        {selectedAdmin && (
          <div>
            {restrictions.filter(r => r.is_active).length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: "center",
                borderRadius: 16,
                background: C.surface,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
                <p style={{ color: C.textMuted, fontSize: 14 }}>
                  لا توجد قيود نشطة على هذا الحساب
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {restrictions.filter(r => r.is_active).map((restriction) => {
                  const option = restrictionOptions.find(o => o.value === restriction.restricted_function);
                  return (
                    <div
                      key={restriction.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: C.surface,
                        border: `2px solid ${C.danger}`,
                        boxShadow: "0 2px 8px rgba(239,68,68,0.1)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: "0 0 4px 0" }}>
                            {option?.icon} {option?.label}
                          </h4>
                          {restriction.reason && (
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                              {restriction.reason}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeRestriction(restriction.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: C.dangerLight,
                            color: C.danger,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          ✕ إزالة
                        </button>
                      </div>

                      {restriction.expires_at && (
                        <div style={{ fontSize: 11, color: C.warning, marginTop: 8 }}>
                          ⏱️ ينتهي في: {new Date(restriction.expires_at).toLocaleDateString('ar-EG')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Restriction Modal */}
      {isModalOpen && selectedAdmin && (
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
            maxWidth: 480,
            width: "90%",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: "0 0 20px 0" }}>
              🔒 إضافة تجميد
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>
                  نوع التجميد
                </label>
                <select
                  value={newRestriction.restricted_function}
                  onChange={(e) => setNewRestriction({ ...newRestriction, restricted_function: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option value="">اختر نوع التجميد</option>
                  {restrictionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>
                  السبب
                </label>
                <textarea
                  value={newRestriction.reason}
                  onChange={(e) => setNewRestriction({ ...newRestriction, reason: e.target.value })}
                  placeholder="أدخل سبب التجميد"
                  style={{
                    width: "100%",
                    minHeight: 80,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>
                  تاريخ الانتهاء (اختياري)
                </label>
                <input
                  type="date"
                  value={newRestriction.expires_at}
                  onChange={(e) => setNewRestriction({ ...newRestriction, expires_at: e.target.value })}
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
                onClick={handleAddRestriction}
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
                🔒 تطبيق التجميد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
