"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@hillaha/core";

// عناوين البريد الإلكتروني لمنصة حلّها
const EMAILS = {
  webmaster: "webmaster@hillaha.com", // طلبات تسجيل الشركاء الجدد
  admin: "admin1@hillaha.com",        // مدير التطبيق المفوَّض
} as const;

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  danger: "#EF4444",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("يرجى إدخال البيانات كاملة"); return; }
    setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("لا يوجد اتصال");
      const { error: err } = await sb.auth.signInWithPassword({ email: email.toLowerCase(), password });
      if (err) throw err;
      router.push("/dashboard");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Invalid login credentials")) setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      else setError("حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${C.primarySoft} 0%, ${C.pinkSoft} 100%)`,
      padding: 20,
    }}>
      <div style={{
        background: C.surface, borderRadius: 24, padding: "40px 36px",
        width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(139,92,246,0.15)",
      }}>
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.png" alt="حلّها" style={{ width: 64, height: 64, objectFit: "contain" }} />
          <h2 style={{ margin: "12px 0 4px", fontSize: 22, fontWeight: 900, color: C.text }}>
            لوحة الشريك
          </h2>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>سجّل دخولك لإدارة متجرك</p>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 16,
            background: "#FEF2F2", border: "1px solid #FECACA",
            color: C.danger, fontSize: 13, fontWeight: 700, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* EMAIL */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
              البريد الإلكتروني
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                outline: "none", background: C.bg, direction: "ltr", textAlign: "right",
              }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
              كلمة المرور
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                outline: "none", background: C.bg,
              }}
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: loading ? C.primarySoft : C.primary,
              color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer",
              boxShadow: loading ? "none" : `0 6px 20px rgba(139,92,246,0.35)`,
            }}
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: C.textMuted }}>
          ليس لديك حساب؟{" "}
          <a href="/signup"
             style={{ color: C.primary, fontWeight: 700, textDecoration: "none" }}>
            سجّل الآن
          </a>
        </p>
        <p style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: C.textMuted }}>
          أو جرب{" "}
          <a href="/demo"
             style={{ color: C.primary, fontWeight: 700, textDecoration: "none" }}>
            حساب تجريبي
          </a>
          {" "}أو تواصل معنا:{" "}
          <a href={`mailto:${EMAILS.webmaster}?subject=طلب تسجيل شريك جديد`}
             style={{ color: C.textMuted, fontWeight: 600 }}>
            {EMAILS.webmaster}
          </a>
        </p>
      </div>
    </div>
  );
}
