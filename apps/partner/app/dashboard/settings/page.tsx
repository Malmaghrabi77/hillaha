"use client";
import React, { useState, useEffect, useRef } from "react";
import { getSupabase } from "@hillaha/core";

// عناوين البريد الإلكتروني لمنصة حلّها
const EMAILS = {
  admin: "admin1@hillaha.com",           // مدير التطبيق المفوَّض من السوبرادمن
  masterAdmin: "masteradmin@hillaha.com", // السوبرادمن — طلبات الشركاء الرسمية
} as const;

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#059669",
  danger: "#EF4444",
};

interface PartnerProfile {
  id:        string;
  name:      string;
  logo_url?: string;
  address?:  string;
  city?:     string;
}

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]     = useState<PartnerProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");

  // Load current partner profile
  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      if (!sb) { setLoading(false); return; }

      const { data: { session } } = await sb.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await sb
        .from("partners")
        .select("id, name, logo_url, address, city")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  // Handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار ملف صورة (JPEG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }
    setError("");
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  // Upload logo to Supabase Storage
  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("يرجى اختيار صورة أولاً");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const sb = getSupabase();
      if (!sb) throw new Error("خطأ في الاتصال");

      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("غير مسجل الدخول");

      const userId   = session.user.id;
      const ext      = file.name.split(".").pop() ?? "jpg";
      const filePath = `${userId}/logo.${ext}`;

      // Upload to partner-logos bucket
      const { error: uploadErr } = await sb.storage
        .from("partner-logos")
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: { publicUrl } } = sb.storage
        .from("partner-logos")
        .getPublicUrl(filePath);

      // Persist to partners table
      await sb
        .from("partners")
        .update({ logo_url: publicUrl })
        .eq("user_id", userId);

      setProfile(prev => prev ? { ...prev, logo_url: publicUrl } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError("فشل رفع الصورة، يرجى المحاولة مرة أخرى");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${C.primarySoft}`, borderTopColor: C.primary, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const logoSrc = previewUrl ?? profile?.logo_url ?? null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>⚙️ إعدادات المتجر</h1>
        <p style={{ color: C.textMuted, fontSize: 13, marginTop: 6 }}>إدارة بيانات متجرك وشعاره</p>
      </div>

      {/* STORE LOGO CARD */}
      <div style={{
        background: C.surface, borderRadius: 20, padding: 28,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 20px rgba(139,92,246,0.08)",
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: C.text, marginTop: 0, marginBottom: 20 }}>
          صورة / شعار المتجر
        </h2>

        {/* Current logo preview */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
          <div style={{
            width: 110, height: 110, borderRadius: 20, overflow: "hidden",
            border: `3px solid ${logoSrc ? C.primary : C.border}`,
            background: C.primarySoft,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: logoSrc ? `0 4px 16px rgba(139,92,246,0.25)` : "none",
          }}>
            {logoSrc ? (
              <img src={logoSrc} alt="شعار المتجر" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 48 }}>🏪</span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{profile?.name ?? "اسم المتجر"}</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
              {logoSrc ? "صورة محددة — اضغط رفع لتحديثها" : "لا توجد صورة بعد"}
            </div>
            {profile?.address && (
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>📍 {profile.address}</div>
            )}
          </div>
        </div>

        {/* File input */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${C.primary}`,
            borderRadius: 16, padding: "24px 20px",
            background: C.primarySoft,
            textAlign: "center", cursor: "pointer",
            transition: "opacity 0.15s",
            marginBottom: 16,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
          <div style={{ fontWeight: 700, color: C.primary, fontSize: 14 }}>اختر صورة المتجر</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
            JPEG, PNG, WebP — حد أقصى 5 ميجابايت
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, marginBottom: 16,
            background: "#FEF2F2", border: `1px solid #FECACA`,
            color: C.danger, fontWeight: 700, fontSize: 13, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Success */}
        {saved && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, marginBottom: 16,
            background: "#F0FDF4", border: `1px solid #86EFAC`,
            color: C.success, fontWeight: 700, fontSize: 13, textAlign: "center",
          }}>
            ✓ تم رفع الصورة وحفظها بنجاح
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !previewUrl}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 14,
            background: uploading || !previewUrl ? C.primarySoft : C.primary,
            border: "none", cursor: uploading || !previewUrl ? "not-allowed" : "pointer",
            color: uploading || !previewUrl ? C.textMuted : "white",
            fontWeight: 900, fontSize: 15,
            boxShadow: !previewUrl || uploading ? "none" : "0 6px 16px rgba(139,92,246,0.35)",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {uploading ? (
            <>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} />
              جاري الرفع...
            </>
          ) : (
            "رفع وحفظ الصورة ✓"
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* STORE INFO CARD (read-only) */}
      <div style={{
        background: C.surface, borderRadius: 20, padding: 24,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 20px rgba(139,92,246,0.06)",
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: C.text, marginTop: 0, marginBottom: 16 }}>
          بيانات المتجر
        </h2>
        {[
          { label: "اسم المتجر",     value: profile?.name,    icon: "🏪" },
          { label: "العنوان",        value: profile?.address, icon: "📍" },
          { label: "المدينة",        value: profile?.city,    icon: "🌆" },
        ].map((row, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 12,
            background: C.bg, border: `1px solid ${C.border}`,
            marginBottom: i < 2 ? 10 : 0,
          }}>
            <span style={{ fontSize: 20 }}>{row.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 700, marginTop: 2 }}>
                {row.value ?? "—"}
              </div>
            </div>
          </div>
        ))}
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 14, marginBottom: 0 }}>
          لتعديل بيانات المتجر تواصل مع فريق حلّها:&nbsp;
          <a href={`mailto:${EMAILS.admin}?subject=طلب تعديل بيانات متجر`}
             style={{ color: C.primary, fontWeight: 700 }}>
            {EMAILS.admin}
          </a>
          &nbsp;|&nbsp;
          <a href={`mailto:${EMAILS.masterAdmin}?subject=طلب رسمي — تعديل بيانات شريك`}
             style={{ color: C.primary, fontWeight: 700 }}>
            {EMAILS.masterAdmin}
          </a>
        </p>
      </div>
    </div>
  );
}
