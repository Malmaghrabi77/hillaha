"use client";

import React, { useState } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  success: "#10B981",
  danger: "#EF4444",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
};

export default function QuickSetupPage() {
  const [step, setStep] = useState<"email" | "verify" | "success">("email");
  const [email, setEmail] = useState("testpartner@local.test");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("TestPartner@2026");
  const [storeName, setStoreName] = useState("متجري التجريبي");

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const sb = getSupabase();
      if (!sb) throw new Error("لا يوجد اتصال بـ Supabase");

      // Step 1: Create auth user
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: { full_name: storeName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء المستخدم");

      const userId = authData.user.id;
      console.log("Auth user created:", userId);

      // Step 2: Insert into profiles (must do this!)
      const profileData = {
        id: userId,
        role: "partner",
        full_name: storeName,
        phone: "0100000000",
      };

      const { error: profileError } = await (sb.from("profiles") as any)
        .insert(profileData);

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      // Step 3: Create partner record
      const partnerData = {
        user_id: userId,
        name: storeName,
        phone: "0100000000",
        is_open: true,
      };

      const { error: partnerError } = await (sb.from("partners") as any)
        .insert(partnerData);

      if (partnerError) {
        console.error("Partner error:", partnerError);
        throw partnerError;
      }

      setStep("success");
      setLoading(false);
    } catch (err: any) {
      console.error("Full error:", err);
      setError(err?.message || "حدث خطأ");
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#FAFAFF",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: "40px",
          maxWidth: 500,
          width: "100%",
          border: `2px solid ${C.border}`,
        }}
      >
        {step === "email" && (
          <>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: C.text,
                margin: "0 0 8px 0",
                textAlign: "center",
              }}
            >
              🎯 إنشاء حساب سريع
            </h1>
            <p
              style={{
                textAlign: "center",
                color: C.textMuted,
                margin: "0 0 28px 0",
              }}
            >
              انشئ حساب شريك بخطوة واحدة
            </p>

            {error && (
              <div
                style={{
                  background: "#FEE2E2",
                  color: C.danger,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCreateAccount}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text,
                    marginBottom: 6,
                  }}
                >
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 13,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text,
                    marginBottom: 6,
                  }}
                >
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 13,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text,
                    marginBottom: 6,
                  }}
                >
                  اسم المتجر
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 13,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: C.primary,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "جاري الإنشاء..." : "✨ إنشاء الحساب"}
              </button>
            </form>
          </>
        )}

        {step === "success" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 60,
                  marginBottom: 16,
                }}
              >
                ✅
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: C.success,
                  margin: "0 0 8px 0",
                }}
              >
                تم إنشاء الحساب بنجاح!
              </h2>
              <p
                style={{
                  color: C.textMuted,
                  margin: "0 0 24px 0",
                }}
              >
                استخدم هذه البيانات للدخول:
              </p>

              <div
                style={{
                  background: "#F3F4F6",
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 24,
                  textAlign: "right",
                  fontSize: 13,
                  fontFamily: "monospace",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: C.text }}>البريد:</strong>
                  <br />
                  <span style={{ color: C.textMuted }}>{email}</span>
                </div>
                <div>
                  <strong style={{ color: C.text }}>كلمة المرور:</strong>
                  <br />
                  <span style={{ color: C.textMuted }}>{password}</span>
                </div>
              </div>

              <a
                href="/login"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  background: C.primary,
                  color: "white",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                دخول الآن →
              </a>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: `1px solid ${C.border}`,
            textAlign: "center",
            fontSize: 12,
            color: C.textMuted,
          }}
        >
          <a href="/login" style={{ color: C.primary, fontWeight: 700 }}>
            إذا كان لديك حساب، اضغط هنا
          </a>
        </div>
      </div>
    </div>
  );
}
