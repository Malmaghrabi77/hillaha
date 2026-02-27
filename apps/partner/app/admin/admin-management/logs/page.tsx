"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import type { AdminLog } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  bg: "#FAFAFF",
};

export default function AuditLogsPage() {
  const auth = useAdminAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!auth.isAdmin) return;

    if (!auth.isSuperAdmin) {
      router.push("/admin");
      return;
    }

    loadLogs();
    setLoading(false);
  }, [auth.isSuperAdmin, auth.isAdmin, router, filter]);

  const loadLogs = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let query = supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filter !== "all") {
        query = query.eq("action", filter);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  if (loading) return null;

  const actions = [
    { value: "all", label: "جميع الإجراءات" },
    { value: "approve_partner", label: "موافقة شريك" },
    { value: "reject_partner", label: "رفض شريك" },
    { value: "settle_payment", label: "تسوية مدفوعات" },
    { value: "invite_regional_manager", label: "دعوة مدير إقليمي" },
    { value: "invite_regular_admin", label: "دعوة مدير عادي" },
    { value: "approve_admin_invitation", label: "موافقة دعوة مدير" },
    { value: "reject_admin_invitation", label: "رفض دعوة مدير" },
  ];

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          📋 سجل التدقيق
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          جميع الإجراءات والعمليات على النظام
        </p>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>
          تصفية حسب الإجراء
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 300,
            padding: "10px 14px",
            borderRadius: 10,
            border: `1.5px solid ${C.border}`,
            fontSize: 14,
            fontFamily: "inherit",
            direction: "rtl",
          }}
        >
          {actions.map((action) => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: 40,
            textAlign: "center",
            color: C.textMuted,
          }}
        >
          لا توجد سجلات
        </div>
      ) : (
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          {logs.map((log, idx) => (
            <div
              key={log.id}
              style={{
                padding: 16,
                borderBottom: idx < logs.length - 1 ? `1px solid ${C.border}` : "none",
                display: "grid",
                gridTemplateColumns: "150px 1fr 150px 200px",
                gap: 16,
                alignItems: "center",
                backgroundColor: idx % 2 === 0 ? "transparent" : C.primarySoft + "20",
              }}
            >
              {/* Action */}
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>الإجراء</div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: C.primarySoft,
                    color: C.primary,
                  }}
                >
                  {log.action.replace(/_/g, " ")}
                </span>
              </div>

              {/* Entity Info */}
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  {log.entity_type === "partner" ? "الشريك" : log.entity_type === "user" ? "المستخدم" : log.entity_type === "order" ? "الطلب" : "الدفعة"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                  {log.entity_id?.substring(0, 8)}...
                </div>
                {log.new_data && (
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {Object.keys(log.new_data).length} تغييرات
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>التاريخ والوقت</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {new Date(log.created_at).toLocaleDateString("ar-EG")}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {new Date(log.created_at).toLocaleTimeString("ar-EG")}
                </div>
              </div>

              {/* Details */}
              <div>
                <button
                  onClick={() => {
                    alert(
                      "البيانات الجديدة:\n" + JSON.stringify(log.new_data, null, 2)
                    );
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${C.border}`,
                    background: "transparent",
                    color: C.primary,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  عرض التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
