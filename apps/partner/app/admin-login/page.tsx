"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  danger: "#EF4444",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("خطأ في تكوين قاعدة البيانات. يرجى التحقق من متغيرات البيئة");

      // Sign in with Supabase
      const { error: authError, data } = await sb.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (authError) throw authError;

      // Check if user is admin or super_admin
      const userId = data.user?.id;
      if (!userId) throw new Error("لا يوجد معرف مستخدم");

      const { data: profileData, error: profileError } = await (
        sb.from("profiles") as any
      )
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error("فشل التحقق من صلاحيات الادمن");
      }

      const role = (profileData as { role: string } | null)?.role;

      // Check if user has admin role
      if (role !== "super_admin" && role !== "admin") {
        setError("هذا الحساب لا يمتلك صلاحيات الادمن");
        await sb.auth.signOut();
        return;
      }

      // Success - redirect to admin dashboard
      router.push("/admin");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Invalid login credentials")) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        setError(msg || "حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${C.primarySoft} 0%, ${C.pinkSoft} 100%)`,
        padding: 20,
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 24,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(139,92,246,0.15)",
        }}
      >
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.primary}, ${C.pink})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 32,
            }}
          >
            👑
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: C.text }}>
            لوحة الإدارة
          </h2>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>
            تسجيل دخول الادمن فقط
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 16,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: C.danger,
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* EMAIL */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: C.textMuted,
                marginBottom: 6,
              }}
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hillaha.com"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                fontSize: 14,
                color: C.text,
                outline: "none",
                background: C.bg,
                direction: "ltr",
                textAlign: "right",
              }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: C.textMuted,
                marginBottom: 6,
              }}
            >
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                fontSize: 14,
                color: C.text,
                outline: "none",
                background: C.bg,
              }}
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: loading ? C.primarySoft : C.primary,
              color: "white",
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: loading ? "none" : `0 6px 20px rgba(139,92,246,0.35)`,
            }}
          >
            {loading ? "جاري الدخول..." : "دخول لوحة الإدارة"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: C.textMuted }}>
          <a
            href="/"
            style={{
              color: C.primary,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← رجوع للصفحة الرئيسية
          </a>
        </p>
      </div>
    </div>
  );
}
