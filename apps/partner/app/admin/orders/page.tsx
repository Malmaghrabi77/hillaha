"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

const C = {
  primary: "#8B5CF6",
  primaryLight: "#C4B5FD",
  primaryDark: "#6D28D9",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  surfaceLight: "#FAFAFF",
  border: "#E7E3FF",
};

interface Order {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  partner_id: string;
  partner?: { name: string };
  payment_method?: string;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  completionRate: number;
}

interface Partner {
  id: string;
  name: string;
}

export default function OrdersPage() {
  const auth = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const itemsPerPage = 50;

  useEffect(() => {
    if (!auth.user) return;
    loadOrders();
    loadPartners();
  }, [auth.user]);

  useEffect(() => {
    let filtered = [...orders];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply partner filter
    if (partnerFilter !== "all") {
      filtered = filtered.filter(order => order.partner_id === partnerFilter);
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(order => new Date(order.created_at) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.created_at) <= toDate);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, searchTerm, statusFilter, partnerFilter, dateFrom, dateTo]);

  const loadOrders = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data } = await (supabase.from("orders") as any)
        .select("*")
        .order("created_at", { ascending: false });

      const ordersData = (data || []) as Order[];

      // Load partner info in bulk
      const partnerIds = Array.from(new Set(ordersData.map(o => o.partner_id)));
      const { data: partnersData } = await (supabase.from("partners") as any)
        .select("id, name")
        .in("id", partnerIds);

      const partnersMap = (partnersData || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      const ordersWithPartners = ordersData.map(order => ({
        ...order,
        partner: partnersMap[order.partner_id] || { name: "غير معروف" }
      }));

      setOrders(ordersWithPartners);

      // Calculate stats
      const completed = ordersWithPartners.filter(o => o.status === "delivered").length;
      const revenue = ordersWithPartners.reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        totalOrders: ordersWithPartners.length,
        totalRevenue: revenue,
        completedOrders: completed,
        completionRate: ordersWithPartners.length > 0 ? (completed / ordersWithPartners.length) * 100 : 0,
      });
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data } = await (supabase.from("partners") as any)
        .select("id, name")
        .order("name");

      setPartners(data || []);
    } catch (error) {
      console.error("Error loading partners:", error);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("هل تريد بالفعل إلغاء هذا الطلب؟")) return;

    setCancelling(orderId);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const updateData = { status: "cancelled" };
      const { error } = await (supabase.from("orders") as any)
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      await loadOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      alert(error.message || "حدث خطأ في إلغاء الطلب");
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return C.success;
      case "pending": return C.warning;
      case "cancelled": return C.danger;
      default: return C.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered": return "مكتملة";
      case "pending": return "قيد الانتظار";
      case "cancelled": return "ملغاة";
      default: return status;
    }
  };

  const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <div
      style={{
        padding: 20,
        borderRadius: 12,
        background: C.surface,
        border: `1px solid ${C.border}`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{value}</p>
    </div>
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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
          📦 إدارة الطلبات
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>عرض وإدارة جميع الطلبات</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="إجمالي الطلبات" value={stats.totalOrders} icon="📊" />
        <StatCard label="الطلبات المكتملة" value={stats.completedOrders} icon="✅" />
        <StatCard label="معدل الإتمام" value={`${stats.completionRate.toFixed(1)}%`} icon="📈" />
        <StatCard label="إجمالي الإيرادات" value={`${stats.totalRevenue.toFixed(0)} ج.م`} icon="💰" />
      </div>

      {/* Filters */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <input
          type="text"
          placeholder="ابحث عن الطلب أو العميل..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="confirmed">مؤكدة</option>
          <option value="preparing">قيد الإعداد</option>
          <option value="delivering">قيد التوصيل</option>
          <option value="delivered">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <select
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="all">جميع الشركاء</option>
          {partners.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Orders Table */}
      <div
        style={{
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceLight, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>رقم الطلب</th>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>العميل</th>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الشريك</th>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>المبلغ</th>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الحالة</th>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>التاريخ</th>
                <th style={{ padding: 16, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: 16, color: C.text, fontSize: 13, fontWeight: 600 }}>{order.id.substring(0, 8)}</td>
                  <td style={{ padding: 16, color: C.text, fontSize: 13 }}>{order.customer_name}</td>
                  <td style={{ padding: 16, color: C.text, fontSize: 13 }}>{order.partner?.name || "غير معروف"}</td>
                  <td style={{ padding: 16, color: C.success, fontSize: 13, fontWeight: 600 }}>{order.total.toFixed(0)} ج.م</td>
                  <td style={{ padding: 16 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 6,
                        background: getStatusColor(order.status) + "15",
                        color: getStatusColor(order.status),
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>
                    {new Date(order.created_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td style={{ padding: 16 }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: `1px solid ${C.primary}`,
                        background: "transparent",
                        color: C.primary,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      عرض
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: page === currentPage ? C.primary : C.surface,
                color: page === currentPage ? "white" : C.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: "0 0 20px 0" }}>تفاصيل الطلب</h2>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>رقم الطلب</p>
              <p style={{ fontSize: 14, color: C.text, fontWeight: 600, margin: 0 }}>{selectedOrder.id}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>اسم العميل</p>
              <p style={{ fontSize: 14, color: C.text, margin: 0 }}>{selectedOrder.customer_name}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>الشريك</p>
              <p style={{ fontSize: 14, color: C.text, margin: 0 }}>{selectedOrder.partner?.name || "غير معروف"}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>المبلغ الإجمالي</p>
              <p style={{ fontSize: 18, color: C.success, fontWeight: 900, margin: 0 }}>{selectedOrder.total.toFixed(0)} ج.م</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>الحالة</p>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: getStatusColor(selectedOrder.status) + "15",
                  color: getStatusColor(selectedOrder.status),
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {getStatusLabel(selectedOrder.status)}
              </span>
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>التاريخ والوقت</p>
              <p style={{ fontSize: 14, color: C.text, margin: 0 }}>
                {new Date(selectedOrder.created_at).toLocaleDateString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>طريقة الدفع</p>
              <p style={{ fontSize: 14, color: C.text, margin: 0 }}>
                {selectedOrder.payment_method ?
                  (selectedOrder.payment_method === "cash" ? "نقد" :
                   selectedOrder.payment_method === "card" ? "بطاقة ائتمان" :
                   selectedOrder.payment_method === "wallet_transfer" ? "محفظة" : selectedOrder.payment_method)
                  : "غير محدد"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: C.primary,
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                إغلاق
              </button>
              {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  disabled={cancelling === selectedOrder.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: C.danger,
                    color: "white",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: cancelling === selectedOrder.id ? "not-allowed" : "pointer",
                    opacity: cancelling === selectedOrder.id ? 0.6 : 1,
                  }}
                >
                  {cancelling === selectedOrder.id ? "جاري الإلغاء..." : "إلغاء الطلب"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
