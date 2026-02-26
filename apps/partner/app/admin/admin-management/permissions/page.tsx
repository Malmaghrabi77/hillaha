"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../../hooks/useAdminAuth";

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

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface Permission {
  id: string;
  permission_code: string;
  permission_name_ar: string;
  description: string;
  is_granted: boolean;
}

export default function AdminPermissionsPage() {
  const auth = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

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

        // Get user emails
        const { data: usersData } = await (supabase
          .auth.admin.listUsers() as any)
          .catch(() => ({ data: [] }));

        const adminList = adminUsers.map((admin: any) => ({
          id: admin.id,
          email: usersData?.users?.find((u: any) => u.id === admin.id)?.email || "Unknown",
          role: admin.role,
        }));

        setAdmins(adminList);

        // Load permissions for each admin
        const { data: permData } = await (supabase.from("admin_permissions") as any)
          .select("*")
          .in("admin_id", adminIds);

        const groupedPerms: Record<string, Permission[]> = {};
        adminIds.forEach(id => {
          groupedPerms[id] = permData?.filter((p: any) => p.admin_id === id) || [];
        });
        setPermissions(groupedPerms);

        if (adminList.length > 0) {
          setSelectedAdmin(adminList[0]);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (adminId: string, permissionCode: string, currentState: boolean) => {
    try {
      const supabase = getSupabase();
      if (!supabase || !auth.user) return;

      const {error} = await (supabase.from("admin_permissions") as any)
        .update({ is_granted: !currentState })
        .eq("admin_id", adminId)
        .eq("permission_code", permissionCode);

      if (error) throw error;

      // Log the change
      await (supabase.from("permission_audit_logs") as any).insert({
        target_admin_id: adminId,
        changed_by: auth.user.id,
        change_type: !currentState ? "permission_granted" : "permission_revoked",
        change_details: { permission_code: permissionCode },
      });

      loadData();
    } catch (error) {
      console.error("Error toggling permission:", error);
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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
          🔐 إدارة صلاحيات الادمنة
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          تحكم في صلاحيات الادمنة والمديرين
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {admins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => setSelectedAdmin(admin)}
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: selectedAdmin?.id === admin.id ? "2px solid" : "1px solid",
                  borderColor: selectedAdmin?.id === admin.id ? C.primary : C.border,
                  background: selectedAdmin?.id === admin.id ? C.primary + "15" : C.surfaceLight,
                  color: C.text,
                  fontWeight: selectedAdmin?.id === admin.id ? 700 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ marginBottom: 4 }}>{admin.role === "super_admin" ? "👑" : "👤"} {admin.email.split("@")[0]}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>
                  {admin.role === "super_admin" ? "سوبر أدمن" : "فريد أدمن"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Grid */}
        {selectedAdmin && (
          <div style={{
            padding: 20,
            borderRadius: 16,
            background: C.surface,
            border: `1px solid ${C.border}`,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: "0 0 16px 0" }}>
              ✅ صلاحيات {selectedAdmin.email.split("@")[0]}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
              {(permissions[selectedAdmin.id] || []).map((perm) => (
                <div
                  key={perm.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: perm.is_granted ? C.successLight : C.surfaceLight,
                    border: `1px solid ${perm.is_granted ? C.success : C.border}`,
                    transition: "all 0.3s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 900, color: C.text, margin: "0 0 4px 0" }}>
                        {perm.permission_name_ar}
                      </h4>
                      <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                        {perm.description}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePermission(selectedAdmin.id, perm.permission_code, perm.is_granted)}
                      style={{
                        width: 45,
                        height: 25,
                        borderRadius: 12,
                        border: "none",
                        background: perm.is_granted ? C.success : C.border,
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 21,
                          height: 21,
                          borderRadius: 10,
                          background: "white",
                          position: "absolute",
                          top: 2,
                          right: perm.is_granted ? 22 : 2,
                          transition: "right 0.3s ease",
                        }}
                      />
                    </button>
                  </div>

                  <div style={{
                    fontSize: 11,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: perm.is_granted ? C.success : C.warning,
                    color: "white",
                    fontWeight: 700,
                    textAlign: "center",
                    marginTop: 8,
                  }}>
                    {perm.is_granted ? "✓ مفعّل" : "✕ معطّل"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
