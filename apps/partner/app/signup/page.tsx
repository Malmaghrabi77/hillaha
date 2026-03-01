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

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password" | "profile">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate email
    if (step === "email") {
      if (!email) {
        setError("يرجى إدخال البريد الإلكتروني");
        return;
      }
      if (!email.includes("@")) {
        setError("البريد الإلكتروني غير صحيح");
        return;
      }
      setStep("password");
      return;
    }

    // Validate password
    if (step === "password") {
      if (!password || !password2) {
        setError("يرجى إدخال كلمة المرور");
        return;
      }
      if (password.length < 8) {
        setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        return;
      }
      if (password !== password2) {
        setError("كلمات المرور غير متطابقة");
        return;
      }
      setStep("profile");
      return;
    }

    // Create account
    if (step === "profile") {
      if (!storeName || !phone) {
        setError("يرجى إدخال جميع البيانات");
        return;
      }

      setLoading(true);
      try {
        const sb = getSupabase();
        if (!sb) throw new Error("لا يوجد اتصال");

        // Create auth user
        const { data: authData, error: authError } = await sb.auth.signUp({
          email: email.toLowerCase(),
          password,
          options: {
            data: {
              full_name: storeName,
              phone,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("فشل إنشاء الحساب");

        // Create partner profile
        const pData = {
          user_id: authData.user.id,
          name: storeName,
          phone,
          is_open: true,
        };

        const { error: partnerError } = await (sb
          .from("partners") as any)
          .insert(pData);

        if (partnerError) throw partnerError;

        // Update profile with partner_id and role
        const { data: partnerData } = await (sb
          .from("partners") as any)
          .select("id")
          .eq("user_id", authData.user.id)
          .single();

        if (partnerData) {
          await (sb
            .from("profiles") as any)
            .update({
              partner_id: partnerData.id,
              role: "partner",
              full_name: storeName,
              phone,
            })
            .eq("id", authData.user.id);
        }

        // Redirect to login
        router.push("/login?registered=true");
      } catch (e: any) {
        console.error("Signup error:", e);
        const msg = e?.message ?? "";
        if (msg.includes("already registered")) {
          setError("هذا البريد الإلكتروني مسجل بالفعل");
        } else if (msg.includes("password")) {
          setError("كلمة المرور ضعيفة جداً");
        } else {
          setError(msg || "فشل التسجيل، يرجى المحاولة مرة أخرى");
        }
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div
      dir="rtl"
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
          <img
            src="/logo.png"
            alt="حلّها"
            style={{ width: 64, height: 64, objectFit: "contain" }}
          />
          <h2
            style={{
              margin: "12px 0 4px",
              fontSize: 22,
              fontWeight: 900,
              color: C.text,
            }}
          >
            تسجيل متجر جديد
          </h2>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>
            انضم إلى منصة حلّها
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 24,
          }}
        >
          {(["email", "password", "profile"] as const).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background:
                  ["email", "password", "profile"].indexOf(s) <=
                  ["email", "password", "profile"].indexOf(step)
                    ? C.primary
                    : C.border,
                transition: "all 0.3s",
              }}
            />
          ))}
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

        <form onSubmit={handleSignup}>
          {/* STEP 1: EMAIL */}
          {step === "email" && (
            <div style={{ animation: "fadeIn 0.3s" }}>
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
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  marginBottom: 20,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* STEP 2: PASSWORD */}
          {step === "password" && (
            <div style={{ animation: "fadeIn 0.3s" }}>
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
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  marginBottom: 12,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />

              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textMuted,
                  marginBottom: 6,
                }}
              >
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  marginBottom: 20,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />

              <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                ✓ 8 أحرف على الأقل
              </p>
            </div>
          )}

          {/* STEP 3: PROFILE */}
          {step === "profile" && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textMuted,
                  marginBottom: 6,
                }}
              >
                اسم المتجر
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="متجري"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  marginBottom: 12,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />

              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textMuted,
                  marginBottom: 6,
                }}
              >
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0100000000"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  marginBottom: 20,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              background: C.primary,
              color: "white",
              border: "none",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {loading
              ? "جاري المعالجة..."
              : step === "profile"
                ? "إنشاء الحساب"
                : "التالي"}
          </button>

          {/* BACK BUTTON */}
          {step !== "email" && (
            <button
              type="button"
              onClick={() => {
                if (step === "password") setStep("email");
                if (step === "profile") setStep("password");
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: C.border,
                color: C.text,
                border: "none",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              رجوع
            </button>
          )}
        </form>

        {/* DIVIDER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0 20px",
          }}
        >
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.textMuted, fontSize: 12 }}>أو</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* LOGIN LINK */}
        <p style={{ textAlign: "center", fontSize: 13, color: C.textMuted }}>
          لديك حساب بالفعل؟{" "}
          <a
            href="/login"
            style={{
              color: C.primary,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            سجّل دخولك
          </a>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
