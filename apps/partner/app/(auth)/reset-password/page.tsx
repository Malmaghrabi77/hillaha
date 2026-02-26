"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // التحقق من وجود token في الـ URL
    const hash = window.location.hash;
    if (!hash.includes("access_token")) {
      setError("رابط إعادة التعيين غير صحيح أو انتهت صلاحيته");
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      // Supabase يستخرج الـ token من الـ URL تلقائياً
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (err) {
        setError(err.message || "حدث خطأ أثناء تحديث كلمة المرور");
      } else {
        setSuccess(true);
        setNewPassword("");
        setConfirmPassword("");

        // إعادة التوجيه بعد 2 ثانية
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إعادة تعيين كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        padding: "20px",
      }}
      dir="rtl"
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 40,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: C.text,
              margin: 0,
              marginBottom: 8,
            }}
          >
            إعادة تعيين كلمة المرور
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            أدخل كلمة المرور الجديدة الخاصة بك
          </p>
        </div>

        {success ? (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: C.successSoft,
              border: `1px solid ${C.success}`,
              marginBottom: 24,
            }}
          >
            <p style={{ color: C.success, fontWeight: 700, margin: 0 }}>
              ✓ تم تحديث كلمة المرور بنجاح!
            </p>
            <p style={{ color: C.success, fontSize: 12, margin: "8px 0 0", opacity: 0.8 }}>
              سيتم إعادة التوجيه إلى صفحة الدخول...
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            {error && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: C.dangerSoft,
                  border: `1px solid ${C.danger}`,
                  marginBottom: 20,
                }}
              >
                <p style={{ color: C.danger, fontSize: 13, fontWeight: 700, margin: 0 }}>
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* New Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 13,
                  fontFamily: "inherit",
                  direction: "ltr",
                  boxSizing: "border-box",
                }}
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 13,
                  fontFamily: "inherit",
                  direction: "ltr",
                  boxSizing: "border-box",
                }}
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: C.primary,
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || !newPassword || !confirmPassword ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </button>

            {/* Back to Login */}
            <p style={{ textAlign: "center", fontSize: 13, color: C.textMuted, marginTop: 16 }}>
              <a
                href="/login"
                style={{
                  color: C.primary,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                العودة إلى صفحة الدخول
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.bg,
          }}
        >
          <div style={{ textAlign: "center", color: C.textMuted }}>جاري التحميل...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
