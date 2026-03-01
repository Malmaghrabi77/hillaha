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

type SetupStatus = "idle" | "creating_auth" | "creating_partner" | "success" | "error";

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus>("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreatedAccount(null);

    if (!email || !password || !storeName) {
      setError("يرجى ملء جميع الحقول");
      return;
    }

    try {
      const sb = getSupabase();
      if (!sb) throw new Error("لا يوجد اتصال");

      // Step 1: Create auth user
      setStatus("creating_auth");
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: storeName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء المستخدم");

      const userId = authData.user.id;

      // Step 2: Create partner
      setStatus("creating_partner");
      const pData = {
        user_id: userId,
        name: storeName,
        phone: "0100000000",
        is_open: true,
      };

      const { data: partnerData, error: partnerError } = await (sb
        .from("partners") as any)
        .insert(pData)
        .select()
        .single();

      if (partnerError) throw partnerError;

      // Step 3: Update profile
      const { error: profileError } = await (sb
        .from("profiles") as any)
        .update({
          role: "partner",
          full_name: storeName,
          phone: "0100000000",
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      setStatus("success");
      setCreatedAccount({ email: email.toLowerCase(), password });
      setEmail("");
      setPassword("");
      setStoreName("");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "حدث خطأ غير متوقع");
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
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: C.text,
            margin: "0 0 8px 0",
            textAlign: "center",
          }}
        >
          ⚙️ إعداد النظام
        </h1>
        <p
          style={{
            textAlign: "center",
            color: C.textMuted,
            margin: "0 0 28px 0",
          }}
        >
          إنشاء حساب شريك تجريبي
        </p>

        {createdAccount ? (
          <div
            style={{
              background: "#D1FAE5",
              border: `2px solid ${C.success}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              color: C.success,
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>
              ✅ تم إنشاء الحساب بنجاح!
            </h3>
            <p style={{ margin: "0 0 12px 0", fontSize: 13 }}>
              الآن استخدم هذه البيانات للدخول:
            </p>
            <div
              style={{
                background: "white",
                padding: 12,
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 13,
                color: C.text,
                marginBottom: 12,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>البريد الإلكتروني:</strong>
                <br />
                {createdAccount.email}
              </div>
              <div>
                <strong>كلمة المرور:</strong>
                <br />
                {createdAccount.password}
              </div>
            </div>
            <a
              href="/login"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                background: C.success,
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              الذهاب إلى التسجيل
            </a>
          </div>
        ) : (
          <form onSubmit={handleSetup}>
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
                placeholder="partner@example.com"
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
                placeholder="••••••••"
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
              <p style={{ fontSize: 11, color: C.textMuted, margin: "4px 0 0 0" }}>
                ✓ 8 أحرف على الأقل
              </p>
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
                placeholder="متجري التجريبي"
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
              disabled={status !== "idle"}
              style={{
                width: "100%",
                padding: "12px",
                background: C.primary,
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: status !== "idle" ? "not-allowed" : "pointer",
                opacity: status !== "idle" ? 0.6 : 1,
              }}
            >
              {status === "idle" && "✨ إنشاء الحساب"}
              {status === "creating_auth" && "جاري إنشاء المستخدم..."}
              {status === "creating_partner" && "جاري إنشاء البيانات..."}
              {status === "success" && "تم بنجاح! ✅"}
              {status === "error" && "حدث خطأ ❌"}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: `1px solid ${C.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            إذا كان لديك حساب بالفعل
            <br />
            <a
              href="/login"
              style={{
                color: C.primary,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              اضغط هنا للدخول
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
