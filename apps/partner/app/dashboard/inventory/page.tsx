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

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  unit_type: string;
  cost_per_unit: number;
  category: string;
  is_active: boolean;
}

interface StockAlert {
  id: string;
  item_name: string;
  current_stock: number;
  minimum_stock: number;
  alert_type: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    unit_type: "piece",
    current_stock: 0,
    minimum_stock: 10,
    cost_per_unit: 0,
    category: "",
  });

  const itemsPerPage = 20;

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
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

      // Load inventory items
      const { data: itemsData, error: itemsError } = await (supabase
        .from("inventory_items") as any)
        .select("*")
        .eq("partner_id", partnerId)
        .order("name");

      if (itemsError) throw itemsError;
      setItems((itemsData as any[]) || []);

      // Load alerts
      const { data: alertsData, error: alertsError } = await (supabase
        .from("inventory_alerts") as any)
        .select("ia.*, ii.name as item_name, ii.current_stock, ii.minimum_stock")
        .eq("inventory_alerts.partner_id", partnerId)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (!alertsError) {
        setAlerts(((alertsData as any) || []).map((a: any) => ({
          id: a.id,
          item_name: a.item_name,
          current_stock: a.current_stock,
          minimum_stock: a.minimum_stock,
          alert_type: a.alert_type,
        })));
      }

      setError(null);
    } catch (err: any) {
      console.error("Error loading inventory:", err);
      setError(err.message || "فشل تحميل المخزون");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.sku || newItem.cost_per_unit <= 0) {
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
        .from("inventory_items") as any)
        .insert({
          partner_id: (profile as any).partner_id,
          ...newItem,
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setNewItem({
        name: "",
        sku: "",
        unit_type: "piece",
        current_stock: 0,
        minimum_stock: 10,
        cost_per_unit: 0,
        category: "",
      });
      loadInventory();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const lowStockItems = items.filter(
    item => item.current_stock <= item.minimum_stock
  ).length;

  const totalValue = items.reduce(
    (sum, item) => sum + (item.current_stock * item.cost_per_unit),
    0
  );

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
        جاري تحميل المخزون...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
            📦 إدارة المخزون
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
            تتبع وإدارة مستويات المخزون والأصناف
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
          ➕ إضافة صنف جديد
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
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>إجمالي الأصناف</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.primary }}>
            {items.length}
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
            {items.filter(i => i.is_active).length} نشط
          </div>
        </div>

        <div style={{
          background: C.surface,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>الأصناف ناقصة المخزون</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.warning }}>
            {lowStockItems}
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
            بحاجة إلى إعادة تموين
          </div>
        </div>

        <div style={{
          background: C.surface,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>قيمة المخزون الإجمالية</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.success }}>
            {Math.round(totalValue).toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
            التكلفة الإجمالية
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div style={{
          background: C.warningLight,
          border: `2px solid ${C.warning}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}>
          <h3 style={{ color: C.warning, margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>
            ⚠️ تنبيهات المخزون ({alerts.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} style={{ color: C.text, fontSize: 13 }}>
                • {alert.item_name}: متبقي {alert.current_stock} من {alert.minimum_stock} المطلوب
              </div>
            ))}
            {alerts.length > 3 && (
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
                ... و {alerts.length - 3} تنبيهات أخرى
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div style={{
        background: C.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        border: `1px solid ${C.border}`,
      }}>
        <input
          type="text"
          placeholder="ابحث عن الأصناف أو SKU..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* Inventory Table */}
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
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>اسم الصنف</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>SKU</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الفئة</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>المخزون الحالي</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الحد الأدنى</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>السعر</th>
                <th style={{ padding: 14, textAlign: "right", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const isLowStock = item.current_stock <= item.minimum_stock;
                  return (
                    <tr key={item.id} style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: index % 2 === 0 ? "transparent" : C.surfaceLight,
                    }}>
                      <td style={{ padding: 12, color: C.text, fontSize: 13, fontWeight: 500 }}>
                        {item.name}
                      </td>
                      <td style={{ padding: 12, color: C.textMuted, fontSize: 12 }}>
                        {item.sku}
                      </td>
                      <td style={{ padding: 12, color: C.textMuted, fontSize: 12 }}>
                        {item.category || "-"}
                      </td>
                      <td style={{ padding: 12, color: C.text, fontSize: 13, fontWeight: 600 }}>
                        {item.current_stock} {item.unit_type}
                      </td>
                      <td style={{ padding: 12, color: C.textMuted, fontSize: 13 }}>
                        {item.minimum_stock} {item.unit_type}
                      </td>
                      <td style={{ padding: 12, color: C.success, fontSize: 13, fontWeight: 600 }}>
                        {item.cost_per_unit.toFixed(2)} ج.م
                      </td>
                      <td style={{ padding: 12, fontSize: 12 }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: isLowStock ? C.dangerLight : C.successLight,
                          color: isLowStock ? C.danger : C.success,
                          fontWeight: 600,
                        }}>
                          {isLowStock ? "⚠️ ناقص" : "✓ متوفر"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
                    لا توجد أصناف
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

      {/* Add Item Modal */}
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: "0 0 24px 0" }}>
              إضافة صنف جديد
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                placeholder="اسم الصنف"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
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
                placeholder="SKU"
                value={newItem.sku}
                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <select
                value={newItem.unit_type}
                onChange={(e) => setNewItem({ ...newItem, unit_type: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="piece">قطعة</option>
                <option value="kg">كيلوجرام</option>
                <option value="liter">لتر</option>
                <option value="box">علبة</option>
                <option value="pack">حزمة</option>
                <option value="gram">جرام</option>
              </select>

              <input
                type="number"
                placeholder="المخزون الحالي"
                value={newItem.current_stock}
                onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <input
                type="number"
                placeholder="الحد الأدنى للمخزون"
                value={newItem.minimum_stock}
                onChange={(e) => setNewItem({ ...newItem, minimum_stock: Number(e.target.value) })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

              <input
                type="number"
                placeholder="سعر الوحدة"
                value={newItem.cost_per_unit}
                onChange={(e) => setNewItem({ ...newItem, cost_per_unit: Number(e.target.value) })}
                step="0.01"
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
                placeholder="الفئة (اختياري)"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />

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
                  onClick={handleAddItem}
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
