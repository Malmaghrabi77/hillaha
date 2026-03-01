"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";

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

interface Staff {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  employment_type: string;
  salary_type: string;
  base_salary: number;
  hire_date: string;
  status: string;
  is_manager: boolean;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    email: "",
    phone: "",
    position: "",
    employment_type: "full_time",
    salary_type: "monthly",
    base_salary: 0,
    hire_date: new Date().toISOString().split("T")[0],
    is_manager: false,
  });

  const staffPerPage = 20;

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("يجب تسجيل الدخول أولاً");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("partner_id")
        .eq("id", session.user.id)
        .single();

      const partnerId = (profile as any)?.partner_id;
      if (!partnerId) {
        setError("لم يتم العثور على معرّف الشريك");
        return;
      }

      const { data: staffData, error: staffError } = await (supabase
        .from("staff") as any)
        .select("*")
        .eq("partner_id", partnerId)
        .order("hire_date", { ascending: false });

      if (staffError) throw staffError;
      setStaff((staffData as any[]) || []);
      setError(null);
    } catch (err: any) {
      console.error("Error loading staff:", err);
      setError(err.message || "فشل تحميل الموظفين");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.full_name || !newStaff.position || !newStaff.hire_date) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const { data: profile } = await supabase!
        .from("profiles")
        .select("partner_id")
        .eq("id", session!.user!.id)
        .single();

      const { error: insertError } = await (supabase!
        .from("staff") as any)
        .insert({
          partner_id: (profile as any).partner_id,
          status: "active",
          ...newStaff,
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setNewStaff({
        full_name: "",
        email: "",
        phone: "",
        position: "",
        employment_type: "full_time",
        salary_type: "monthly",
        base_salary: 0,
        hire_date: new Date().toISOString().split("T")[0],
        is_manager: false,
      });
      loadStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * staffPerPage,
    currentPage * staffPerPage
  );

  const totalPages = Math.ceil(filteredStaff.length / staffPerPage);

  const activeCount = staff.filter(s => s.status === "active").length;
  const managerCount = staff.filter(s => s.is_manager).length;
  const totalSalary = staff
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + (s.base_salary || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: C.successLight, color: C.success, label: "نشط" };
      case "inactive":
        return { bg: C.border, color: C.textMuted, label: "غير نشط" };
      case "on_leave":
        return { bg: C.warningLight, color: C.warning, label: "في إجازة" };
      case "terminated":
        return { bg: C.dangerLight, color: C.danger, label: "منهى" };
      default:
        return { bg: C.border, color: C.textMuted, label: status };
    }
  };

  const getEmploymentType = (type: string) => {
    switch (type) {
      case "full_time":
        return "دوام كامل";
      case "part_time":
        return "دوام جزئي";
      case "contract":
        return "عقد";
      case "temporary":
        return "مؤقت";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `3px solid ${C.border}`,
          borderTopColor: C.primary,
          margin: "0 auto 12px",
          animation: "spin 1s linear infinite",
        }} />
        جاري تحميل الموظفين...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
            👥 إدارة الموظفين
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
            إدارة فريق العمل والموارد البشرية
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            background: C.primary,
            color: "white",
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ➕ إضافة موظف
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{
          background: C.surface,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>إجمالي الموظفين</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.primary }}>
            {staff.length}
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
            {activeCount} نشط
          </div>
        </div>

        <div style={{
          background: C.surface,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>المديرين</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.success }}>
            {managerCount}
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
            قياديين / مسؤولين
          </div>
        </div>

        <div style={{
          background: C.surface,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>إجمالي الرواتب الشهرية</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.danger }}>
            {Math.round(totalSalary).toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
            الموظفين النشطين
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{
        background: C.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        border: `1px solid ${C.border}`,
        display: "flex",
        gap: 12,
      }}>
        <input
          type="text"
          placeholder="ابحث عن الموظفين..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 14,
            outline: "none",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 14,
            outline: "none",
            minWidth: 150,
          }}
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="on_leave">في إجازة</option>
          <option value="terminated">منهى</option>
        </select>
      </div>

      {/* Staff Table */}
      <div style={{
        background: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceLight, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الاسم</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الوظيفة</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>البريد الإلكتروني</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>نوع العقد</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الراتب</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>تاريخ التعيين</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaff.length > 0 ? (
                paginatedStaff.map((s, index) => {
                  const statusStyle = getStatusColor(s.status);
                  return (
                    <tr key={s.id} style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: index % 2 === 0 ? "transparent" : C.surfaceLight,
                    }}>
                      <td style={{ padding: 12, color: C.text, fontSize: 13, fontWeight: 500 }}>
                        {s.full_name}
                        {s.is_manager && (
                          <span style={{
                            display: "inline-block",
                            marginRight: 6,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: C.primaryLight,
                            color: C.primary,
                            fontSize: 10,
                            fontWeight: 600,
                          }}>
                            مدير
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 12, color: C.textMuted, fontSize: 13 }}>
                        {s.position}
                      </td>
                      <td style={{ padding: 12, color: C.textMuted, fontSize: 12 }}>
                        {s.email || "-"}
                      </td>
                      <td style={{ padding: 12, color: C.text, fontSize: 12 }}>
                        {getEmploymentType(s.employment_type)}
                      </td>
                      <td style={{ padding: 12, color: C.success, fontSize: 13, fontWeight: 600 }}>
                        {s.base_salary ? `${s.base_salary.toLocaleString()} ج.م` : "-"}
                      </td>
                      <td style={{ padding: 12, color: C.textMuted, fontSize: 12 }}>
                        {new Date(s.hire_date).toLocaleDateString("ar-EG")}
                      </td>
                      <td style={{ padding: 12, fontSize: 12 }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 600,
                        }}>
                          {statusStyle.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
                    لا توجد موظفين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: page === currentPage ? "none" : `1px solid ${C.border}`,
                background: page === currentPage ? C.primary : C.surface,
                color: page === currentPage ? "white" : C.text,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowAddModal(false)}>
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 32,
              width: "90%",
              maxWidth: 500,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: "0 0 24px 0" }}>
              إضافة موظف جديد
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                placeholder="الاسم الكامل"
                value={newStaff.full_name}
                onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <input
                type="tel"
                placeholder="رقم الهاتف"
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <input
                type="text"
                placeholder="الوظيفة (مثال: طباخ, كاشير, ديليفري)"
                value={newStaff.position}
                onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <select
                value={newStaff.employment_type}
                onChange={(e) => setNewStaff({ ...newStaff, employment_type: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="full_time">دوام كامل</option>
                <option value="part_time">دوام جزئي</option>
                <option value="contract">عقد</option>
                <option value="temporary">مؤقت</option>
              </select>

              <select
                value={newStaff.salary_type}
                onChange={(e) => setNewStaff({ ...newStaff, salary_type: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="hourly">بالساعة</option>
                <option value="daily">يومي</option>
                <option value="monthly">شهري</option>
              </select>

              <input
                type="number"
                placeholder="الراتب الأساسي"
                value={newStaff.base_salary}
                onChange={(e) => setNewStaff({ ...newStaff, base_salary: Number(e.target.value) })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <input
                type="date"
                value={newStaff.hire_date}
                onChange={(e) => setNewStaff({ ...newStaff, hire_date: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newStaff.is_manager}
                  onChange={(e) => setNewStaff({ ...newStaff, is_manager: e.target.checked })}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, color: C.text }}>هذا الموظف مدير</span>
              </label>

              {error && (
                <div style={{
                  padding: 12,
                  borderRadius: 8,
                  background: C.dangerLight,
                  color: C.danger,
                  fontSize: 13,
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleAddStaff}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    background: C.primary,
                    color: "white",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ✓ إضافة
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    background: C.border,
                    color: C.text,
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ✕ إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
