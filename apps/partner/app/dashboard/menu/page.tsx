"use client";
import React, { useState, useEffect } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
};

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  available: boolean;
}

// Remove local INITIAL_MENU - will fetch from Supabase

const CATEGORIES = ["الكل", "برجر", "بيتزا", "باستا", "مشروبات", "حلويات"];

type ModalMode = "add" | "edit" | null;

const EMPTY_ITEM: Omit<MenuItem, "id"> = {
  name: "", description: "", price: 0, category: "برجر", emoji: "🍔", available: true,
};

export default function MenuPage() {
  const [menu, setMenu]         = useState<MenuItem[]>([]);
  const [filter, setFilter]     = useState("الكل");
  const [modal, setModal]       = useState<ModalMode>(null);
  const [editing, setEditing]   = useState<MenuItem | null>(null);
  const [form, setForm]         = useState<Omit<MenuItem, "id">>(EMPTY_ITEM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await (supabase
        .from("menu_items") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setMenu(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Menu load error:", err);
      setError(err.message || "فشل تحميل القائمة");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "الكل" ? menu : menu.filter(m => m.category === filter);

  function openAdd() {
    setForm(EMPTY_ITEM);
    setEditing(null);
    setModal("add");
  }

  function openEdit(item: MenuItem) {
    setForm({ name: item.name, description: item.description, price: item.price, category: item.category, emoji: item.emoji, available: item.available });
    setEditing(item);
    setModal("edit");
  }

  function saveItem() {
    if (!form.name.trim() || !form.price) return;

    setSaving(true);
    const saveToSupabase = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setError("خطأ في الاتصال");
          return;
        }

        if (modal === "add") {
          const { error: insertError } = await (supabase
            .from("menu_items") as any)
            .insert([form]);
          if (insertError) throw insertError;
        } else if (editing) {
          const { error: updateError } = await (supabase
            .from("menu_items") as any)
            .update(form)
            .eq("id", editing.id);
          if (updateError) throw updateError;
        }

        setModal(null);
        setError(null);
        await loadMenuItems();
      } catch (err: any) {
        console.error("Save error:", err);
        setError(err.message || "فشل الحفظ");
      } finally {
        setSaving(false);
      }
    };

    saveToSupabase();
  }

  function toggleAvailable(id: string) {
    const item = menu.find(m => m.id === id);
    if (!item) return;

    const updateSupabase = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setError("خطأ في الاتصال");
          return;
        }

        const { error: updateError } = await (supabase
          .from("menu_items") as any)
          .update({ available: !item.available })
          .eq("id", id);

        if (updateError) throw updateError;
        await loadMenuItems();
      } catch (err: any) {
        console.error("Toggle error:", err);
        setError(err.message || "فشل التحديث");
      }
    };

    updateSupabase();
  }

  function confirmDelete(id: string) { setDeleteId(id); }

  function doDelete() {
    setSaving(true);
    const deleteFromSupabase = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setError("خطأ في الاتصال");
          return;
        }

        const { error: deleteError } = await (supabase
          .from("menu_items") as any)
          .delete()
          .eq("id", deleteId);

        if (deleteError) throw deleteError;
        setDeleteId(null);
        setError(null);
        await loadMenuItems();
      } catch (err: any) {
        console.error("Delete error:", err);
        setError(err.message || "فشل الحذف");
      } finally {
        setSaving(false);
      }
    };

    deleteFromSupabase();
  }

  const availableCount   = menu.filter(m => m.available).length;
  const unavailableCount = menu.length - availableCount;

  const EMOJIS = ["🍔", "🍗", "🍕", "🍝", "🍜", "🌮", "🌯", "🥗", "🍣", "🥤", "🍋", "🧃", "🍰", "🧁", "🍩"];

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>قائمة الطعام</h1>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
            {availableCount} صنف متاح · {unavailableCount} غير متاح
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={loading || saving}
          style={{
            padding: "10px 20px", borderRadius: 12, border: "none", cursor: loading || saving ? "not-allowed" : "pointer",
            background: C.primary, color: "white", fontWeight: 900, fontSize: 14,
            boxShadow: "0 4px 14px rgba(139,92,246,0.35)", opacity: loading || saving ? 0.7 : 1,
          }}
        >
          + إضافة صنف
        </button>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div style={{
          background: "#FEE2E2", color: C.danger, padding: 16, borderRadius: 12, marginBottom: 20,
          fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", border: "3px solid " + C.border,
            borderTopColor: C.primary, margin: "0 auto 12px",
            animation: "spin 1s linear infinite",
          }} />
          جاري تحميل القائمة...
        </div>
      ) : (
        <>
          {/* CATEGORY TABS */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: "7px 16px", borderRadius: 20, border: filter === cat ? "none" : `1px solid ${C.border}`,
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: filter === cat ? C.primary : C.surface,
                  color: filter === cat ? "white" : C.textMuted,
                  boxShadow: filter === cat ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* MENU GRID */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
              لا توجد أصناف في هذه الفئة
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.map(item => (
          <div
            key={item.id}
            style={{
              background: C.surface, borderRadius: 16, padding: 18,
              border: `1px solid ${C.border}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              opacity: item.available ? 1 : 0.55,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: C.primarySoft, fontSize: 24,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{item.emoji}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: C.text }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{item.category}</div>
                </div>
              </div>

              {/* Available Toggle */}
              <button
                onClick={() => toggleAvailable(item.id)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                  background: item.available ? "#34D399" : "#D1D5DB",
                  position: "relative", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, width: 16, height: 16, borderRadius: 8,
                  background: "white", transition: "right 0.2s, left 0.2s",
                  right: item.available ? 3 : "auto",
                  left: item.available ? "auto" : 3,
                }} />
              </button>
            </div>

            <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
              {item.description}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.primary }}>{item.price} ج</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => openEdit(item)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "transparent", cursor: "pointer", fontSize: 12,
                    color: C.primary, fontWeight: 700,
                  }}
                >
                  تعديل
                </button>
                <button
                  onClick={() => confirmDelete(item.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, border: `1px solid #FECACA`,
                    background: "#FEF2F2", cursor: "pointer", fontSize: 12,
                    color: C.danger, fontWeight: 700,
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
            </div>
          )}
        </>
      )}

      {/* ADD/EDIT MODAL */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: C.surface, borderRadius: 24, padding: 32,
            width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.text }}>
                {modal === "add" ? "إضافة صنف جديد" : "تعديل الصنف"}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textMuted }}>✕</button>
            </div>

            {/* EMOJI PICKER */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>أيقونة الصنف</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    style={{
                      width: 40, height: 40, borderRadius: 10, border: `2px solid ${form.emoji === e ? C.primary : C.border}`,
                      background: form.emoji === e ? C.primarySoft : C.bg,
                      cursor: "pointer", fontSize: 20,
                    }}
                  >{e}</button>
                ))}
              </div>
            </div>

            {/* NAME */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>اسم الصنف</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="مثال: برجر كلاسيك"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 12,
                  border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                  outline: "none", background: C.bg,
                }}
              />
            </div>

            {/* DESCRIPTION */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>الوصف</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="وصف مختصر للصنف..."
                rows={2}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 12,
                  border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                  outline: "none", background: C.bg, resize: "none",
                  fontFamily: "Cairo, sans-serif",
                }}
              />
            </div>

            {/* PRICE + CATEGORY */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>السعر (ج)</label>
                <input
                  type="number"
                  value={form.price || ""}
                  onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  placeholder="0"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                    outline: "none", background: C.bg,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>الفئة</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                    outline: "none", background: C.bg, fontFamily: "Cairo, sans-serif",
                  }}
                >
                  {["برجر", "بيتزا", "باستا", "مشروبات", "حلويات", "أخرى"].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* AVAILABILITY */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: 14, borderRadius: 12, background: C.bg,
              border: `1px solid ${C.border}`, marginBottom: 20,
              cursor: "pointer",
            }}
              onClick={() => setForm(f => ({ ...f, available: !f.available }))}
            >
              <div style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.available ? "#34D399" : "#D1D5DB",
                position: "relative", flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute", top: 4, width: 16, height: 16, borderRadius: 8,
                  background: "white",
                  right: form.available ? 4 : "auto",
                  left: form.available ? "auto" : 4,
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {form.available ? "الصنف متاح للطلب ✓" : "الصنف غير متاح حالياً"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={saveItem}
                disabled={!form.name.trim() || !form.price || saving}
                style={{
                  flex: 1, padding: 13, borderRadius: 12, border: "none",
                  background: form.name.trim() && form.price ? C.primary : C.border,
                  color: "white", fontWeight: 900, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "جاري الحفظ..." : (modal === "add" ? "إضافة الصنف" : "حفظ التغييرات")}
              </button>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: "13px 20px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                  background: "transparent", color: C.textMuted, fontWeight: 700, cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: C.surface, borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 360, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 900, color: C.text }}>
              حذف الصنف؟
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textMuted }}>
              سيتم حذف هذا الصنف نهائياً ولا يمكن التراجع
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={doDelete}
                disabled={saving}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "none",
                  background: C.danger, color: "white", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >{saving ? "جاري الحذف..." : "حذف"}</button>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  border: `1.5px solid ${C.border}`, background: "transparent",
                  color: C.textMuted, fontWeight: 700, cursor: "pointer",
                }}
              >إلغاء</button>
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
