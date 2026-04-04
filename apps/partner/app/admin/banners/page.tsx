"use client";

import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#34D399",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

type BannerItem = {
  id: string;
  title: string;
  sub: string;
  cta: string;
  bg: string;
  accent: string;
  image: string | null;
  link_type: string;
  link_value: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const LINK_TYPES = [
  { value: "none", label: "بدون رابط" },
  { value: "partner", label: "صفحة شريك" },
  { value: "url", label: "رابط خارجي" },
];

const DEFAULT_FORM = {
  title: "",
  sub: "",
  cta: "اطلب الآن",
  bg: "#7C3AED",
  accent: "#6D28D9",
  image: "",
  link_type: "none",
  link_value: "",
  position: "0",
  is_active: true,
};

export default function BannersPage() {
  const auth = useAdminAuth();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Modal state
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (auth.loading) return;
    loadData();
  }, [auth.loading]);

  const loadData = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);

    const { data } = await (supabase as any)
      .from("banners")
      .select("*")
      .order("position", { ascending: true });

    setBanners(data || []);

    // Pending requests count
    const { count } = await (supabase as any)
      .from("banner_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending");

    setPendingCount(count || 0);
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة فقط");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("حجم الصورة يجب أن لا يتجاوز 5 ميغابايت");
      return;
    }
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    // Revoke previous preview URL to avoid memory leak
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(objectUrl);
    setErrorMsg(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("لا يوجد اتصال");
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error("فشل رفع الصورة: " + error.message);
    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const openCreate = () => {
    setForm({ ...DEFAULT_FORM });
    setReason("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingBanner(null);
    setImageFile(null);
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setShowCreate(true);
  };

  const openEdit = (b: BannerItem) => {
    setForm({
      title: b.title,
      sub: b.sub,
      cta: b.cta,
      bg: b.bg,
      accent: b.accent,
      image: b.image || "",
      link_type: b.link_type,
      link_value: b.link_value || "",
      position: String(b.position),
      is_active: b.is_active,
    });
    setReason("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setImageFile(null);
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(b.image || null);
    setEditingBanner(b);
    setShowCreate(false);
  };

  const closeModal = () => {
    setEditingBanner(null);
    setShowCreate(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setImageFile(null);
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  const handleSave = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!form.title.trim()) {
      setErrorMsg("العنوان مطلوب");
      return;
    }

    // Mandatory image: must have existing image OR new file
    if (!imageFile && !form.image) {
      setErrorMsg("الصورة مطلوبة — يرجى رفع صورة");
      return;
    }

    if (!auth.isSuperAdmin && !reason.trim()) {
      setErrorMsg("السبب مطلوب لإرسال الطلب");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      // Upload new image if selected
      let imageUrl = form.image.trim() || null;
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
        setUploading(false);
      }

      if (auth.isSuperAdmin) {
        // Direct save
        const payload = {
          title: form.title.trim(),
          sub: form.sub.trim(),
          cta: form.cta.trim(),
          bg: form.bg.trim(),
          accent: form.accent.trim(),
          image: imageUrl,
          link_type: form.link_type,
          link_value: form.link_value.trim() || null,
          position: parseInt(form.position) || 0,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        };

        if (editingBanner) {
          const { error } = await (supabase as any)
            .from("banners")
            .update(payload)
            .eq("id", editingBanner.id);
          if (error) throw error;
          setSuccessMsg("تم تحديث البانر بنجاح");
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await (supabase as any)
            .from("banners")
            .insert({ ...payload, created_by: user?.id });
          if (error) throw error;
          setSuccessMsg("تم إنشاء البانر بنجاح");
        }
      } else {
        // Submit change request
        const { data: { user } } = await supabase.auth.getUser();
        const reqPayload: any = {
          change_type: editingBanner ? "update" : "create",
          banner_id: editingBanner?.id || null,
          proposed_title: form.title.trim(),
          proposed_sub: form.sub.trim(),
          proposed_cta: form.cta.trim(),
          proposed_bg: form.bg.trim(),
          proposed_accent: form.accent.trim(),
          proposed_image: imageUrl,
          proposed_link_type: form.link_type,
          proposed_link_value: form.link_value.trim() || null,
          proposed_position: parseInt(form.position) || 0,
          proposed_is_active: form.is_active,
          reason: reason.trim(),
          requested_by: user?.id,
        };

        const { error } = await (supabase as any)
          .from("banner_change_requests")
          .insert(reqPayload);
        if (error) throw error;
        setSuccessMsg("تم إرسال الطلب للاعتماد");
      }

      await loadData();
      setTimeout(() => closeModal(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (bannerId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!confirm("هل أنت متأكد من حذف هذا البانر؟")) return;

    if (auth.isSuperAdmin) {
      await (supabase as any)
        .from("banners")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", bannerId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any)
        .from("banner_change_requests")
        .insert({
          change_type: "delete",
          banner_id: bannerId,
          reason: "طلب حذف بانر",
          requested_by: user?.id,
        });
    }

    await loadData();
  };

  const toggleActive = async (b: BannerItem) => {
    if (!auth.isSuperAdmin) return;
    const supabase = getSupabase();
    if (!supabase) return;

    await (supabase as any)
      .from("banners")
      .update({ is_active: !b.is_active, updated_at: new Date().toISOString() })
      .eq("id", b.id);

    await loadData();
  };

  if (auth.loading || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", color: C.textMuted }}>جاري التحميل...</div>
      </div>
    );
  }

  if (!auth.isSuperAdmin && !auth.isRegionalManager) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: C.danger }}>غير مصرح لك بالوصول</h2>
        <p style={{ color: C.textMuted }}>هذه الصفحة متاحة فقط للسوبر أدمن والمدير الإقليمي.</p>
      </div>
    );
  }

  const isModalOpen = showCreate || editingBanner !== null;

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", direction: "rtl" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>📢 إدارة البانرات</h1>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>
            إضافة وتعديل الإعلانات في البانر العلوي لتطبيق العملاء
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {pendingCount > 0 && auth.isSuperAdmin && (
            <a
              href="/admin/approve-banners"
              style={{
                background: C.warningSoft, color: C.warning, padding: "8px 16px",
                borderRadius: 12, fontWeight: 700, fontSize: 13, textDecoration: "none",
              }}
            >
              {pendingCount} طلب معلق
            </a>
          )}
          <button
            onClick={openCreate}
            style={{
              background: C.primary, color: "white", border: "none", padding: "10px 20px",
              borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            + إضافة بانر
          </button>
        </div>
      </div>

      {/* Non-super admin warning */}
      {!auth.isSuperAdmin && (
        <div style={{
          background: C.warningSoft, padding: 14, borderRadius: 12, marginBottom: 20,
          border: `1px solid ${C.warning}`, fontSize: 13, color: C.text,
        }}>
          ⚠️ التعديلات التي تقوم بها ستُرسل كطلبات للسوبر أدمن للاعتماد.
        </div>
      )}

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: C.surface,
          borderRadius: 16, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📢</div>
          <p style={{ color: C.textMuted, fontWeight: 700 }}>لا توجد بانرات حالياً</p>
          <p style={{ color: C.textMuted, fontSize: 13 }}>اضغط "إضافة بانر" لإنشاء أول إعلان</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {banners.map((b) => (
            <div
              key={b.id}
              style={{
                background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
                overflow: "hidden", opacity: b.is_active ? 1 : 0.6,
              }}
            >
              {/* Banner Preview */}
              <div style={{
                height: 120, background: `linear-gradient(135deg, ${b.bg}, ${b.accent})`,
                padding: 16, position: "relative", display: "flex", flexDirection: "column",
                justifyContent: "center",
              }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>{b.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{b.sub}</div>
                <div style={{
                  marginTop: 8, display: "inline-block", background: "white",
                  padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 700,
                  color: b.bg, alignSelf: "flex-start",
                }}>
                  {b.cta}
                </div>
                {b.image && (
                  <img
                    src={b.image}
                    alt=""
                    style={{
                      position: "absolute", left: 12, bottom: 12,
                      width: 60, height: 60, borderRadius: 12, objectFit: "cover",
                    }}
                  />
                )}
              </div>

              {/* Banner Info */}
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{
                    background: b.is_active ? C.successSoft : C.dangerSoft,
                    color: b.is_active ? C.success : C.danger,
                    padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  }}>
                    {b.is_active ? "نشط" : "غير نشط"}
                  </span>
                  <span style={{
                    background: C.primarySoft, color: C.primary,
                    padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  }}>
                    الترتيب: {b.position}
                  </span>
                  <span style={{
                    background: C.bg, color: C.textMuted,
                    padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  }}>
                    {LINK_TYPES.find(l => l.value === b.link_type)?.label || b.link_type}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openEdit(b)}
                    style={{
                      flex: 1, background: C.primarySoft, color: C.primary, border: "none",
                      padding: "8px 0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    تعديل
                  </button>
                  {auth.isSuperAdmin && (
                    <button
                      onClick={() => toggleActive(b)}
                      style={{
                        background: b.is_active ? C.warningSoft : C.successSoft,
                        color: b.is_active ? C.warning : C.success,
                        border: "none", padding: "8px 14px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      {b.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(b.id)}
                    style={{
                      background: C.dangerSoft, color: C.danger, border: "none",
                      padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
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

      {/* ─── Create/Edit Modal ────────────────────────────────── */}
      {isModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center", alignItems: "flex-start",
            paddingTop: 40, zIndex: 1000, overflowY: "auto",
          }}
        >
          <div style={{
            background: C.surface, borderRadius: 20, padding: 28, width: "100%",
            maxWidth: 560, marginBottom: 40,
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 20 }}>
              {editingBanner ? "تعديل البانر" : "إضافة بانر جديد"}
            </h2>

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                  العنوان *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: خصم 20% على الشاورما"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 14, direction: "rtl",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Sub */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                  العنوان الفرعي
                </label>
                <input
                  value={form.sub}
                  onChange={(e) => setForm({ ...form, sub: e.target.value })}
                  placeholder="مثال: لمدة أسبوع فقط!"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 14, direction: "rtl",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* CTA */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                  نص الزر
                </label>
                <input
                  value={form.cta}
                  onChange={(e) => setForm({ ...form, cta: e.target.value })}
                  placeholder="اطلب الآن"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 14, direction: "rtl",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Colors Row */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                    اللون الأساسي
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={form.bg}
                      onChange={(e) => setForm({ ...form, bg: e.target.value })}
                      style={{ width: 40, height: 36, border: "none", cursor: "pointer" }}
                    />
                    <input
                      value={form.bg}
                      onChange={(e) => setForm({ ...form, bg: e.target.value })}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 10,
                        border: `1.5px solid ${C.border}`, fontSize: 13, direction: "ltr",
                      }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                    اللون المكمل
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={form.accent}
                      onChange={(e) => setForm({ ...form, accent: e.target.value })}
                      style={{ width: 40, height: 36, border: "none", cursor: "pointer" }}
                    />
                    <input
                      value={form.accent}
                      onChange={(e) => setForm({ ...form, accent: e.target.value })}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 10,
                        border: `1.5px solid ${C.border}`, fontSize: 13, direction: "ltr",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                  صورة البانر *
                </label>
                {imagePreview && (
                  <div style={{ marginBottom: 10, position: "relative", display: "inline-block" }}>
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      style={{
                        width: 120, height: 80, objectFit: "cover", borderRadius: 12,
                        border: `2px solid ${C.border}`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imagePreview && imagePreview.startsWith("blob:")) {
                          URL.revokeObjectURL(imagePreview);
                        }
                        setImageFile(null);
                        setImagePreview(null);
                        setForm({ ...form, image: "" });
                      }}
                      style={{
                        position: "absolute", top: -8, right: -8,
                        width: 24, height: 24, borderRadius: 12,
                        background: C.danger, color: "white", border: "none",
                        fontSize: 14, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                <label
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    border: `2px dashed ${(!imagePreview && !form.image) ? C.danger : C.border}`,
                    background: C.bg, fontSize: 14, fontWeight: 700, color: C.primary,
                    cursor: "pointer", boxSizing: "border-box",
                  }}
                >
                  📷 {imagePreview ? "تغيير الصورة" : "رفع صورة"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                </label>
                <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  PNG, JPG, WebP — أقصى حجم 5 ميغابايت
                </p>
              </div>

              {/* Link Type + Value */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                    نوع الرابط
                  </label>
                  <select
                    value={form.link_type}
                    onChange={(e) => setForm({ ...form, link_type: e.target.value, link_value: "" })}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, fontSize: 14, direction: "rtl",
                      background: C.surface,
                    }}
                  >
                    {LINK_TYPES.map((lt) => (
                      <option key={lt.value} value={lt.value}>{lt.label}</option>
                    ))}
                  </select>
                </div>
                {form.link_type !== "none" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                      {form.link_type === "partner" ? "معرف الشريك (UUID)" : "الرابط"}
                    </label>
                    <input
                      value={form.link_value}
                      onChange={(e) => setForm({ ...form, link_value: e.target.value })}
                      placeholder={form.link_type === "partner" ? "UUID الشريك" : "https://..."}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 12,
                        border: `1.5px solid ${C.border}`, fontSize: 14, direction: "ltr",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Position + Active */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                    الترتيب
                  </label>
                  <input
                    type="number"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, fontSize: 14, direction: "ltr",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer",
                    padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    نشط
                  </label>
                </div>
              </div>

              {/* Reason (non-super admin) */}
              {!auth.isSuperAdmin && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>
                    السبب *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="اذكر سبب التعديل أو الإضافة..."
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, fontSize: 14, direction: "rtl",
                      resize: "vertical", boxSizing: "border-box",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Live Preview */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "block", marginBottom: 8 }}>
                معاينة حية
              </label>
              <div style={{
                height: 110, borderRadius: 16,
                background: `linear-gradient(135deg, ${form.bg}, ${form.accent})`,
                padding: 16, position: "relative", display: "flex", flexDirection: "column",
                justifyContent: "center", overflow: "hidden",
              }}>
                {/* Decorative circles */}
                <div style={{
                  position: "absolute", left: -20, top: -20,
                  width: 80, height: 80, borderRadius: 40,
                  background: `${form.accent}88`,
                }} />
                <div style={{
                  position: "absolute", left: 40, bottom: -30,
                  width: 60, height: 60, borderRadius: 30,
                  background: `${form.accent}55`,
                }} />
                <div style={{ fontSize: 15, fontWeight: 900, color: "white" }}>
                  {form.title || "العنوان"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                  {form.sub || "العنوان الفرعي"}
                </div>
                <div style={{
                  marginTop: 6, display: "inline-block", background: "white",
                  padding: "3px 10px", borderRadius: 14, fontSize: 10, fontWeight: 700,
                  color: form.bg, alignSelf: "flex-start",
                }}>
                  {form.cta || "اطلب الآن"}
                </div>
                {(imagePreview || form.image) && (
                  <img
                    src={imagePreview || form.image}
                    alt=""
                    style={{
                      position: "absolute", left: 12, bottom: 10,
                      width: 50, height: 50, borderRadius: 10, objectFit: "cover",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Messages */}
            {errorMsg && (
              <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: C.dangerSoft, color: C.danger, fontSize: 13, fontWeight: 700 }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: C.successSoft, color: C.success, fontSize: 13, fontWeight: 700 }}>
                {successMsg}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  border: `1.5px solid ${C.border}`, background: "transparent",
                  fontWeight: 700, fontSize: 14, color: C.textMuted, cursor: "pointer",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
                  background: saving ? C.textMuted : C.primary,
                  fontWeight: 700, fontSize: 14, color: "white", cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? (uploading ? "جاري رفع الصورة..." : "جاري الحفظ...") : auth.isSuperAdmin ? "حفظ" : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
