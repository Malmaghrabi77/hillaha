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

interface Order {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  partner_id: string;
}

export default function OrdersPage() {
  const auth = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user) return;
    loadOrders();
  }, [auth.user]);

  const loadOrders = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let query = supabase
        .from("orders")
        .select("id, customer_name, total, status, created_at, partner_id")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data } = await query;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl">
      <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
        إدارة الطلبات
      </h1>
      <p style={{ color: C.textMuted, fontSize: 14, margin: 0, marginBottom: 24 }}>
        عرض جميع طلبات المنصة والتحكم فيها
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
              📦 إجمالي الطلبات: {orders.length}
            </p>
            <p style={{ color: C.textMuted, fontSize: 13 }}>
              هذه الصفحة قيد التطوير وستتضمن إدارة شاملة للطلبات قريباً
            </p>
          </>
        )}
      </div>
    </div>
  );
}
