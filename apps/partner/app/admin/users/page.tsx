"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
};

export default function UsersPage() {
  const auth = useAdminAuth();
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user) return;
    loadStats();
  }, [auth.user]);

  const loadStats = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      setUsersCount(count || 0);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl">
      <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
        إدارة المستخدمين
      </h1>
      <p style={{ color: C.textMuted, fontSize: 14, margin: 0, marginBottom: 24 }}>
        إدارة حسابات العملاء والمندوبين على المنصة
      </p>

      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 24,
          textAlign: "center",
        }}
      >
        {loading ? (
          <p style={{ color: C.textMuted }}>جاري التحميل...</p>
        ) : (
          <>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              👥 إجمالي المستخدمين: {usersCount}
            </p>
            <p style={{ color: C.textMuted, fontSize: 13 }}>
              هذه الصفحة قيد التطوير وستتضمن إدارة شاملة للمستخدمين قريباً
            </p>
          </>
        )}
      </div>
    </div>
  );
}
