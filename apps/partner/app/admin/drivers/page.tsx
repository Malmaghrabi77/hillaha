"use client";

import React, { useEffect, useState } from "react";
import { getSupabase, generateOrderReport } from "@hillaha/core";
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

interface Driver {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  rating: number;
  completed_orders: number;
  total_earnings: number;
  created_at: string;
}

interface DriverStats {
  totalDrivers: number;
  activeDrivers: number;
  totalEarnings: number;
  averageRating: number;
}

export default function DriversPage() {
  const auth = useAdminAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    totalDrivers: 0,
    activeDrivers: 0,
    totalEarnings: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const itemsPerPage = 50;

  useEffect(() => {
    if (!auth.user) return;
    loadDrivers();
  }, [auth.user]);

  useEffect(() => {
    let filtered = [...drivers];

    // Apply status filter
    if (statusFilter !== "all") {
      const isActiveFilter = statusFilter === "active";
      filtered = filtered.filter(driver => driver.is_active === isActiveFilter);
    }

    // Apply rating filter
    if (ratingFilter !== "all") {
      const minRating = parseFloat(ratingFilter);
      filtered = filtered.filter(driver => (driver.rating || 0) >= minRating);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phone.includes(searchTerm)
      );
    }

    setFilteredDrivers(filtered);
    setCurrentPage(1);
  }, [drivers, searchTerm, statusFilter, ratingFilter]);

  const loadDrivers = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("role", "driver")
        .order("created_at", { ascending: false });

      const driversData = (data || []) as Driver[];
      setDrivers(driversData);

      // Calculate stats
      const activeCount = driversData.filter(d => d.is_active).length;
      const totalEarnings = driversData.reduce((sum, d) => sum + (d.total_earnings || 0), 0);
      const avgRating = driversData.length > 0
        ? driversData.reduce((sum, d) => sum + (d.rating || 0), 0) / driversData.length
        : 0;

      setStats({
        totalDrivers: driversData.length,
        activeDrivers: activeCount,
        totalEarnings,
        averageRating: avgRating,
      });
    } catch (error) {
      console.error("Error loading drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendDriver = async (driverId: string, currentStatus: boolean) => {
    const action = currentStatus ? "تعطيل" : "تفعيل";
    if (!confirm(`هل تريد بالفعل ${action} هذا المندوب؟`)) return;

    setSuspending(driverId);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال");

      const { error } = await (supabase.from("profiles") as any)
        .update({ is_active: !currentStatus })
        .eq("id", driverId);

      if (error) throw error;

      await loadDrivers();
      setSelectedDriver(null);
    } catch (error: any) {
      console.error("Error suspending driver:", error);
      alert(error.message || `حدث خطأ في ${action} المندوب`);
    } finally {
      setSuspending(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const reportData = filteredDrivers.map(driver => ({
        id: driver.id,
        customerName: driver.full_name,
        total: driver.total_earnings || 0,
        status: driver.is_active ? "نشط" : "غير نشط",
        createdAt: driver.created_at,
        items: [],
      }));

      generateOrderReport(reportData, { name: "إدارة المندوبين" }, "الفترة الحالية");
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      alert("حدث خطأ في تصدير التقرير");
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string | number;
    icon: string;
  }) => (
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
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>
        {value}
      </p>
    </div>
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDrivers = filteredDrivers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);

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
          <p style={{ color: C.textMuted }}>جاري تحميل البيانات...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: C.text,
              margin: 0,
              marginBottom: 4,
            }}
          >
            🚗 إدارة المندوبين
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
            عرض وإدارة جميع المندوبين والسائقين
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting || filteredDrivers.length === 0}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: C.primary,
            color: "white",
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: exporting || filteredDrivers.length === 0 ? "not-allowed" : "pointer",
            opacity: exporting || filteredDrivers.length === 0 ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {exporting ? "جاري التصدير..." : "📥 تصدير PDF"}
        </button>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard label="إجمالي المندوبين" value={stats.totalDrivers} icon="🚗" />
        <StatCard label="مندوبين نشطين" value={stats.activeDrivers} icon="✅" />
        <StatCard label="إجمالي الأرباح" value={`${stats.totalEarnings.toFixed(0)} ج.م`} icon="💰" />
        <StatCard label="متوسط التقييم" value={`${stats.averageRating.toFixed(1)} ⭐`} icon="⭐" />
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
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <input
          type="text"
          placeholder="ابحث عن الاسم أو البريد أو الهاتف..."
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
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="all">جميع التقييمات</option>
          <option value="4">⭐⭐⭐⭐ و أعلى</option>
          <option value="3">⭐⭐⭐ و أعلى</option>
          <option value="2">⭐⭐ و أعلى</option>
        </select>
      </div>

      {/* Drivers Table */}
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
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  الاسم
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  البريد الإلكتروني
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  الهاتف
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  الطلبات المكتملة
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  التقييم
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  الحالة
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "right",
                    color: C.textMuted,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDrivers.map((driver) => (
                <tr key={driver.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: 16, color: C.text, fontSize: 13, fontWeight: 600 }}>
                    {driver.full_name}
                  </td>
                  <td style={{ padding: 16, color: C.text, fontSize: 13 }}>
                    {driver.email}
                  </td>
                  <td style={{ padding: 16, color: C.text, fontSize: 13 }}>
                    {driver.phone}
                  </td>
                  <td style={{ padding: 16, color: C.text, fontSize: 13, fontWeight: 600 }}>
                    {driver.completed_orders || 0}
                  </td>
                  <td style={{ padding: 16 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 6,
                        background: C.warning + "15",
                        color: C.warning,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {driver.rating ? driver.rating.toFixed(1) : "0.0"} ⭐
                    </span>
                  </td>
                  <td style={{ padding: 16 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 6,
                        background: driver.is_active ? "#D1FAE5" : "#FEE2E2",
                        color: driver.is_active ? "#10B981" : "#EF4444",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {driver.is_active ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td style={{ padding: 16 }}>
                    <button
                      onClick={() => setSelectedDriver(driver)}
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

      {/* Driver Details Modal */}
      {selectedDriver && (
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
          onClick={() => setSelectedDriver(null)}
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
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: C.text,
                margin: "0 0 20px 0",
              }}
            >
              تفاصيل المندوب
            </h2>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                الاسم
              </p>
              <p style={{ fontSize: 14, color: C.text, fontWeight: 600, margin: 0 }}>
                {selectedDriver.full_name}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                البريد الإلكتروني
              </p>
              <p style={{ fontSize: 14, color: C.text, margin: 0 }}>
                {selectedDriver.email}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                الهاتف
              </p>
              <p style={{ fontSize: 14, color: C.text, margin: 0 }}>
                {selectedDriver.phone}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                الطلبات المكتملة
              </p>
              <p style={{ fontSize: 14, color: C.text, fontWeight: 600, margin: 0 }}>
                {selectedDriver.completed_orders || 0} طلب
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                التقييم
              </p>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: C.warning + "15",
                  color: C.warning,
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {selectedDriver.rating ? selectedDriver.rating.toFixed(1) : "0.0"} ⭐
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                إجمالي الأرباح
              </p>
              <p style={{ fontSize: 18, color: C.success, fontWeight: 900, margin: 0 }}>
                {selectedDriver.total_earnings ? selectedDriver.total_earnings.toFixed(0) : "0"} ج.م
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 4px 0" }}>
                الحالة
              </p>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: selectedDriver.is_active ? "#D1FAE5" : "#FEE2E2",
                  color: selectedDriver.is_active ? "#10B981" : "#EF4444",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {selectedDriver.is_active ? "نشط" : "غير نشط"}
              </span>
            </div>

            <button
              onClick={() => handleSuspendDriver(selectedDriver.id, selectedDriver.is_active)}
              disabled={suspending === selectedDriver.id}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                background: selectedDriver.is_active ? C.warning : C.success,
                color: "white",
                border: "none",
                fontWeight: 700,
                fontSize: 14,
                cursor: suspending === selectedDriver.id ? "not-allowed" : "pointer",
                opacity: suspending === selectedDriver.id ? 0.6 : 1,
                marginBottom: 12,
              }}
            >
              {suspending === selectedDriver.id
                ? "جاري المعالجة..."
                : selectedDriver.is_active
                ? "تعطيل المندوب"
                : "تفعيل المندوب"}
            </button>

            <button
              onClick={() => setSelectedDriver(null)}
              style={{
                width: "100%",
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
          </div>
        </div>
      )}
    </div>
  );
}
