"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@hillaha/core";
import { useAdminAuth } from "../hooks/useAdminAuth";

/* ─── Design tokens ─── */
const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  bg: "#FAFAFF",
  success: "#34D399",
  successSoft: "#D1FAE5",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
};

/* ─── Label maps ─── */
const VEHICLE_LABELS: Record<string, string> = {
  car: "سيارة",
  scooter: "سكوتر/فيسبا",
  bicycle: "دراجة هوائية",
};
const VEHICLE_COLORS: Record<string, { bg: string; color: string }> = {
  car: { bg: "#DBEAFE", color: "#2563EB" },
  scooter: { bg: "#FEF3C7", color: "#D97706" },
  bicycle: { bg: "#D1FAE5", color: "#059669" },
};
const VEHICLE_ICONS: Record<string, string> = {
  car: "🚗",
  scooter: "🛵",
  bicycle: "🚲",
};
const IDENTITY_LABELS: Record<string, string> = {
  national_id: "بطاقة رقم قومي",
  passport: "جواز سفر",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: C.warningSoft, color: C.warning },
  approved: { bg: C.successSoft, color: C.success },
  rejected: { bg: C.dangerSoft, color: C.danger },
};

/* ─── Types ─── */
interface DriverApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  identity_type: string;
  identity_number: string;
  identity_photo_url: string;
  license_number: string | null;
  license_expiry_date: string | null;
  license_photo_url: string | null;
  vehicle_photo_url: string | null;
  selfie_url: string | null;
  status: string;
  rejection_reason: string | null;
  ocr_result: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Page                                                                 */
/* ────────────────────────────────────────────────────────────────────── */
export default function ApproveDriversPage() {
  const auth = useAdminAuth();

  /* state */
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });

  /* ─── Toast helper ─── */
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ─── Fetch applications ─── */
  const fetchApplications = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("driver_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const all: DriverApplication[] = data || [];
      setApplications(all);

      /* compute stats from the full dataset */
      setStats({
        total: all.length,
        pending: all.filter((a) => a.status === "pending").length,
        approved: all.filter((a) => a.status === "approved").length,
        rejected: all.filter((a) => a.status === "rejected").length,
      });
    } catch (err: any) {
      console.error("Error fetching applications:", err);
      showToast("error", err.message || "حدث خطأ في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) return;
    if (!auth.isSuperAdmin && auth.role !== "admin") return;
    fetchApplications();
  }, [auth.user, auth.loading, auth.isSuperAdmin, auth.role, fetchApplications]);

  /* ─── Filtered + searched list ─── */
  const filteredApps = applications.filter((app) => {
    if (filter !== "all" && app.status !== filter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        app.full_name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phone.includes(q)
      );
    }
    return true;
  });

  /* ─── Signed-URL helper (private bucket) ─── */
  const getSignedUrl = useCallback(
    async (path: string): Promise<string> => {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      if (signedUrls[path]) return signedUrls[path];
      const supabase = getSupabase();
      if (!supabase) return "";
      try {
        const { data } = await supabase.storage
          .from("driver-documents")
          .createSignedUrl(path, 3600);
        const url = data?.signedUrl || "";
        if (url) setSignedUrls((prev) => ({ ...prev, [path]: url }));
        return url;
      } catch {
        return "";
      }
    },
    [signedUrls],
  );

  const resolveUrl = (path: string | null): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return signedUrls[path] || "";
  };

  /* ─── Expand card and pre-fetch signed URLs ─── */
  const handleExpand = async (app: DriverApplication) => {
    if (expandedId === app.id) {
      setExpandedId(null);
      setShowRejectInput(null);
      setRejectionReason("");
      return;
    }
    setExpandedId(app.id);
    setShowRejectInput(null);
    setRejectionReason("");

    /* Pre-load signed URLs for all document paths */
    const paths = [
      app.identity_photo_url,
      app.license_photo_url,
      app.vehicle_photo_url,
      app.selfie_url,
    ].filter(Boolean) as string[];

    await Promise.all(paths.map((p) => getSignedUrl(p)));
  };

  /* ─── Approve ─── */
  const handleApprove = async (app: DriverApplication) => {
    if (!window.confirm(`تأكيد قبول طلب المندوب: ${app.full_name}؟`)) return;
    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال بقاعدة البيانات");

      /* 1 - Update driver_applications */
      const { error: appErr } = await (supabase as any)
        .from("driver_applications")
        .update({
          status: "approved",
          reviewed_by: auth.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);
      if (appErr) throw appErr;

      /* 2 - Update profiles */
      const profileUpdate: Record<string, any> = {
        is_approved: true,
        driver_application_status: "approved",
        vehicle_type: app.vehicle_type,
      };
      if (app.vehicle_type === "bicycle") {
        profileUpdate.max_delivery_distance_km = 2;
      }
      const { error: profErr } = await (supabase as any)
        .from("profiles")
        .update(profileUpdate)
        .eq("id", app.user_id);
      if (profErr) throw profErr;

      showToast("success", `تم قبول طلب ${app.full_name} بنجاح`);
      setExpandedId(null);
      await fetchApplications();
    } catch (err: any) {
      console.error("Approve error:", err);
      showToast("error", err.message || "حدث خطأ أثناء قبول الطلب");
    } finally {
      setProcessing(false);
    }
  };

  /* ─── Reject ─── */
  const handleReject = async (app: DriverApplication) => {
    if (!rejectionReason.trim()) {
      showToast("error", "يرجى إدخال سبب الرفض");
      return;
    }
    if (!window.confirm(`تأكيد رفض طلب المندوب: ${app.full_name}؟`)) return;
    setProcessing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("لا يوجد اتصال بقاعدة البيانات");

      /* 1 - Update driver_applications */
      const { error: appErr } = await (supabase as any)
        .from("driver_applications")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          reviewed_by: auth.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);
      if (appErr) throw appErr;

      /* 2 - Update profiles */
      const { error: profErr } = await (supabase as any)
        .from("profiles")
        .update({ driver_application_status: "rejected" })
        .eq("id", app.user_id);
      if (profErr) throw profErr;

      showToast("success", `تم رفض طلب ${app.full_name}`);
      setExpandedId(null);
      setShowRejectInput(null);
      setRejectionReason("");
      await fetchApplications();
    } catch (err: any) {
      console.error("Reject error:", err);
      showToast("error", err.message || "حدث خطأ أثناء رفض الطلب");
    } finally {
      setProcessing(false);
    }
  };

  /* ─── License expiry check ─── */
  const isLicenseExpired = (date: string | null): boolean => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  /* ────────────────────────────── Render guards ────────────────────── */
  if (auth.loading) {
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
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `4px solid ${C.border}`,
              borderTopColor: C.primary,
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: C.textMuted, fontSize: 14 }}>جاري التحميل...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!auth.isSuperAdmin && auth.role !== "admin") {
    return (
      <div
        dir="rtl"
        style={{
          padding: 60,
          textAlign: "center",
          color: C.danger,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        ليس لديك صلاحية الوصول لهذه الصفحة
      </div>
    );
  }

  /* ────────────────────────────── Main render ──────────────────────── */
  return (
    <div dir="rtl" style={{ padding: 24, background: C.bg, minHeight: "100%" }}>
      {/* ─── Toast notification ─── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "14px 28px",
            borderRadius: 12,
            backgroundColor: toast.type === "success" ? C.successSoft : C.dangerSoft,
            color: toast.type === "success" ? "#065F46" : "#991B1B",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            border: `1px solid ${toast.type === "success" ? C.success : C.danger}`,
            animation: "slideDown 0.3s ease-out",
          }}
        >
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideDown { from { opacity:0; transform: translate(-50%, -20px); } to { opacity:1; transform: translate(-50%, 0); } }`}</style>

      {/* ─── Page header ─── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: "0 0 6px 0" }}>
          اعتماد طلبات المندوبين
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          مراجعة طلبات التسجيل والمستندات واعتماد أو رفض المندوبين الجدد
        </p>
      </div>

      {/* ─── Stats cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="إجمالي الطلبات"
          value={stats.total}
          icon="📋"
          bgColor={C.primarySoft}
          textColor={C.primary}
        />
        <StatCard
          label="قيد المراجعة"
          value={stats.pending}
          icon="⏳"
          bgColor={C.warningSoft}
          textColor={C.warning}
        />
        <StatCard
          label="مقبول"
          value={stats.approved}
          icon="✅"
          bgColor={C.successSoft}
          textColor={C.success}
        />
        <StatCard
          label="مرفوض"
          value={stats.rejected}
          icon="❌"
          bgColor={C.dangerSoft}
          textColor={C.danger}
        />
      </div>

      {/* ─── Search + filter bar ─── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        {/* Search input */}
        <input
          type="text"
          placeholder="بحث بالاسم أو الإيميل أو الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: "1 1 260px",
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
            backgroundColor: C.surface,
            outline: "none",
            direction: "rtl",
          }}
        />

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => {
            const isActive = filter === tab;
            const countMap: Record<string, number> = {
              all: stats.total,
              pending: stats.pending,
              approved: stats.approved,
              rejected: stats.rejected,
            };
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  background: isActive ? C.primary : C.primarySoft,
                  color: isActive ? "white" : C.primary,
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab === "all" ? "الكل" : STATUS_LABELS[tab]}
                <span
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : C.primary + "15",
                    color: isActive ? "white" : C.primary,
                    padding: "2px 8px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  {countMap[tab]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Applications list ─── */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `4px solid ${C.border}`,
                borderTopColor: C.primary,
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <p style={{ color: C.textMuted, fontSize: 13 }}>جاري تحميل الطلبات...</p>
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            border: `2px dashed ${C.border}`,
            padding: 60,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <p style={{ color: C.textMuted, fontSize: 16, fontWeight: 700, margin: 0 }}>
            لا توجد طلبات
            {filter !== "all" ? ` ${STATUS_LABELS[filter]}` : ""}
          </p>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0 0" }}>
            {searchTerm
              ? "حاول تغيير كلمة البحث"
              : "عند وصول طلبات جديدة ستظهر هنا"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredApps.map((app) => {
            const isExpanded = expandedId === app.id;
            const vehicleStyle = VEHICLE_COLORS[app.vehicle_type] || {
              bg: C.primarySoft,
              color: C.primary,
            };
            const statusStyle = STATUS_COLORS[app.status] || {
              bg: C.primarySoft,
              color: C.primary,
            };

            return (
              <div
                key={app.id}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  border: `1px solid ${isExpanded ? C.primary : C.border}`,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                  boxShadow: isExpanded ? `0 4px 20px ${C.primary}20` : "none",
                }}
              >
                {/* ─── Card header (always visible) ─── */}
                <div
                  onClick={() => handleExpand(app)}
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto auto",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  {/* Name + email */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: C.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {app.full_name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {app.email}
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ fontSize: 13, color: C.textMuted, direction: "ltr" }}>
                    {app.phone}
                  </div>

                  {/* Vehicle type badge */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 12px",
                      borderRadius: 8,
                      backgroundColor: vehicleStyle.bg,
                      color: vehicleStyle.color,
                      fontWeight: 700,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {VEHICLE_ICONS[app.vehicle_type] || ""}{" "}
                    {VEHICLE_LABELS[app.vehicle_type] || app.vehicle_type}
                  </span>

                  {/* Date */}
                  <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>
                    {new Date(app.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>

                  {/* Status badge */}
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 8,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      fontWeight: 700,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {STATUS_LABELS[app.status] || app.status}
                  </span>

                  {/* Expand chevron */}
                  <span
                    style={{
                      fontSize: 14,
                      color: C.textMuted,
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      display: "inline-block",
                    }}
                  >
                    ▼
                  </span>
                </div>

                {/* ─── Expanded details ─── */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 20px 20px 20px",
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    {/* ── Selfie ── */}
                    {app.selfie_url && (
                      <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
                        <img
                          src={resolveUrl(app.selfie_url) || app.selfie_url}
                          alt="صورة شخصية"
                          style={{
                            width: 90,
                            height: 90,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `3px solid ${C.primary}`,
                          }}
                        />
                      </div>
                    )}

                    {/* ── Info grid ── */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 12,
                        marginBottom: 20,
                        marginTop: 12,
                      }}
                    >
                      <InfoItem label="الاسم الكامل" value={app.full_name} />
                      <InfoItem label="الهاتف" value={app.phone} />
                      <InfoItem label="البريد الإلكتروني" value={app.email} />
                      <InfoItem
                        label="نوع المركبة"
                        value={`${VEHICLE_ICONS[app.vehicle_type] || ""} ${VEHICLE_LABELS[app.vehicle_type] || app.vehicle_type}`}
                      />
                      {app.vehicle_plate && (
                        <InfoItem label="رقم اللوحة" value={app.vehicle_plate} />
                      )}
                      <InfoItem
                        label="نوع الهوية"
                        value={
                          IDENTITY_LABELS[app.identity_type] || app.identity_type
                        }
                      />
                      <InfoItem label="رقم الهوية" value={app.identity_number} />
                      {app.license_number && (
                        <InfoItem label="رقم الرخصة" value={app.license_number} />
                      )}
                      {app.license_expiry_date && (
                        <InfoItem
                          label="تاريخ انتهاء الرخصة"
                          value={new Date(app.license_expiry_date).toLocaleDateString(
                            "ar-EG",
                          )}
                          color={
                            isLicenseExpired(app.license_expiry_date)
                              ? C.danger
                              : C.success
                          }
                          suffix={
                            isLicenseExpired(app.license_expiry_date)
                              ? " (منتهية)"
                              : " (سارية)"
                          }
                        />
                      )}
                      <InfoItem
                        label="تاريخ التقديم"
                        value={new Date(app.created_at).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      />
                    </div>

                    {/* ── Documents ── */}
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: C.text,
                        margin: "0 0 12px 0",
                      }}
                    >
                      المستندات المرفقة
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <DocImage
                        label="صورة الهوية"
                        url={resolveUrl(app.identity_photo_url)}
                      />
                      {app.license_photo_url && (
                        <DocImage
                          label="صورة الرخصة"
                          url={resolveUrl(app.license_photo_url)}
                        />
                      )}
                      {app.vehicle_photo_url && (
                        <DocImage
                          label="صورة المركبة"
                          url={resolveUrl(app.vehicle_photo_url)}
                        />
                      )}
                      {app.selfie_url && (
                        <DocImage
                          label="الصورة الشخصية"
                          url={resolveUrl(app.selfie_url)}
                        />
                      )}
                    </div>

                    {/* ── OCR Result ── */}
                    {app.ocr_result && (
                      <div
                        style={{
                          backgroundColor: C.primarySoft,
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 20,
                          border: `1px solid ${C.primary}30`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 10,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>🔍</span>
                          <span
                            style={{
                              fontWeight: 900,
                              fontSize: 14,
                              color: C.primary,
                            }}
                          >
                            نتيجة التعرف الآلي (OCR)
                          </span>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: 13,
                            color: C.text,
                            lineHeight: 1.6,
                            fontFamily: "inherit",
                            direction: "rtl",
                          }}
                        >
                          {app.ocr_result}
                        </pre>
                      </div>
                    )}

                    {/* ── Rejection reason (if already rejected) ── */}
                    {app.status === "rejected" && app.rejection_reason && (
                      <div
                        style={{
                          backgroundColor: C.dangerSoft,
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 20,
                          border: `1px solid ${C.danger}30`,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: C.danger,
                            fontSize: 13,
                          }}
                        >
                          سبب الرفض:{" "}
                        </span>
                        <span style={{ color: "#7F1D1D", fontSize: 13 }}>
                          {app.rejection_reason}
                        </span>
                      </div>
                    )}

                    {/* ── Action buttons (only for pending) ── */}
                    {app.status === "pending" && (
                      <div>
                        {showRejectInput === app.id ? (
                          /* Rejection form */
                          <div
                            style={{
                              backgroundColor: C.dangerSoft,
                              borderRadius: 12,
                              padding: 16,
                              border: `1px solid ${C.danger}30`,
                            }}
                          >
                            <label
                              style={{
                                display: "block",
                                fontSize: 13,
                                fontWeight: 700,
                                color: C.danger,
                                marginBottom: 8,
                              }}
                            >
                              سبب الرفض (مطلوب):
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="اكتب سبب الرفض بالتفصيل..."
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: `1px solid ${C.danger}50`,
                                fontSize: 13,
                                fontFamily: "inherit",
                                outline: "none",
                                minHeight: 80,
                                boxSizing: "border-box",
                                resize: "vertical" as any,
                                direction: "rtl",
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                marginTop: 12,
                              }}
                            >
                              <button
                                onClick={() => handleReject(app)}
                                disabled={processing || !rejectionReason.trim()}
                                style={{
                                  flex: 1,
                                  padding: "10px 16px",
                                  borderRadius: 10,
                                  border: "none",
                                  cursor:
                                    processing || !rejectionReason.trim()
                                      ? "not-allowed"
                                      : "pointer",
                                  backgroundColor: C.danger,
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  opacity:
                                    processing || !rejectionReason.trim() ? 0.5 : 1,
                                }}
                              >
                                {processing ? "جاري المعالجة..." : "تأكيد الرفض"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowRejectInput(null);
                                  setRejectionReason("");
                                }}
                                style={{
                                  flex: 1,
                                  padding: "10px 16px",
                                  borderRadius: 10,
                                  border: `1px solid ${C.border}`,
                                  cursor: "pointer",
                                  backgroundColor: C.surface,
                                  color: C.text,
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Approve / Reject buttons */
                          <div style={{ display: "flex", gap: 12 }}>
                            <button
                              onClick={() => handleApprove(app)}
                              disabled={processing}
                              style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: "none",
                                cursor: processing ? "not-allowed" : "pointer",
                                backgroundColor: C.success,
                                color: "white",
                                fontWeight: 900,
                                fontSize: 14,
                                opacity: processing ? 0.6 : 1,
                                transition: "opacity 0.2s",
                              }}
                            >
                              {processing ? "جاري المعالجة..." : "قبول الطلب"}
                            </button>
                            <button
                              onClick={() => setShowRejectInput(app.id)}
                              disabled={processing}
                              style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: `1px solid ${C.danger}`,
                                cursor: processing ? "not-allowed" : "pointer",
                                backgroundColor: C.dangerSoft,
                                color: C.danger,
                                fontWeight: 900,
                                fontSize: 14,
                                opacity: processing ? 0.6 : 1,
                                transition: "opacity 0.2s",
                              }}
                            >
                              رفض الطلب
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                       */
/* ────────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  bgColor,
  textColor,
}: {
  label: string;
  value: number;
  icon: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        background: C.surface,
        border: `1px solid ${C.border}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 10px",
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <p
        style={{
          color: C.textMuted,
          fontSize: 12,
          margin: "0 0 4px 0",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: textColor,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: string;
  color?: string;
  suffix?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: C.bg,
        borderRadius: 10,
        padding: "10px 12px",
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.textMuted,
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || C.text }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 11, fontWeight: 700 }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function DocImage({ label, url }: { label: string; url: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.textMuted,
            padding: "8px 12px",
            backgroundColor: C.bg,
          }}
        >
          {label}
        </div>
        {url ? (
          <div style={{ position: "relative" }}>
            <img
              src={url}
              alt={label}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                display: "block",
                cursor: "pointer",
              }}
              onClick={() => setFullscreen(true)}
            />
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "white",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
              onClick={() => setFullscreen(true)}
            >
              عرض بالحجم الكامل
            </div>
          </div>
        ) : (
          <div
            style={{
              height: 180,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: C.textMuted,
              fontSize: 13,
              backgroundColor: C.bg,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: `3px solid ${C.border}`,
                  borderTopColor: C.primary,
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 8px",
                }}
              />
              جاري تحميل الصورة...
            </div>
          </div>
        )}
      </div>

      {/* ── Full-screen overlay ── */}
      {fullscreen && url && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            cursor: "pointer",
          }}
        >
          <img
            src={url}
            alt={label}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
          <button
            onClick={() => setFullscreen(false)}
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              fontSize: 24,
              cursor: "pointer",
              borderRadius: 8,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
