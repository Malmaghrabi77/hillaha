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

const DEMO_ACCOUNTS = [
  {
    email: "restaurant1@demo.test",
    password: "Demo@12345678",
    name: "مطعم البهار",
    type: "مطعم",
  },
  {
    email: "cafe1@demo.test",
    password: "Demo@12345678",
    name: "كافيه السندس",
    type: "كافيه",
  },
  {
    email: "bakery1@demo.test",
    password: "Demo@12345678",
    name: "مخبزة الحلويات",
    type: "مخبزة",
  },
];

export default function DemoLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDemoLogin(email: string, password: string) {
    setError("");
    setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("لا يوجد اتصال");

      const { error: err } = await sb.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (err) {
        // If demo account doesn't exist, create it
        if (err.message.includes("Invalid login credentials")) {
          console.log("Creating demo account...");
          const account = DEMO_ACCOUNTS.find((a) => a.email === email);
          if (account) {
            const { data: signUpData, error: signUpError } =
              await sb.auth.signUp({
                email: email.toLowerCase(),
                password,
                options: {
                  data: {
                    full_name: account.name,
                  },
                },
              });

            if (signUpError) throw signUpError;

            // Create partner profile
            const partnerData = {
              user_id: signUpData.user?.id,
              name: account.name,
              phone: "0100000000",
              is_open: true,
            };

            const { error: partnerError } = await (sb
              .from("partners") as any)
              .insert(partnerData);

            if (partnerError) throw partnerError;

            // Update profile
            const { data: fetchedPartnerData } = await (sb
              .from("partners") as any)
              .select("id")
              .eq("user_id", signUpData.user?.id)
              .single();

            if (fetchedPartnerData) {
              await (sb
                .from("profiles") as any)
                .update({
                  partner_id: fetchedPartnerData.id,
                  role: "partner",
                  full_name: account.name,
                  phone: "0100000000",
                })
                .eq("id", signUpData.user?.id);
            }

            // Now login
            const { error: loginErr } =
              await sb.auth.signInWithPassword({
                email: email.toLowerCase(),
                password,
              });

            if (loginErr) throw loginErr;
            router.push("/dashboard");
          }
        } else {
          throw err;
        }
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      console.error("Demo login error:", e);
      setError(e?.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
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
          maxWidth: 500,
          boxShadow: "0 20px 60px rgba(139,92,246,0.15)",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
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
            🎯 حسابات تجريبية
          </h2>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>
            اختبر المنصة مباشرة بحساب تجريبي
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

        {/* DEMO ACCOUNTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DEMO_ACCOUNTS.map((account, index) => (
            <button
              key={index}
              onClick={() =>
                handleDemoLogin(account.email, account.password)
              }
              disabled={loading}
              style={{
                padding: "16px",
                borderRadius: 12,
                border: `2px solid ${C.border}`,
                background: C.surface,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    C.primary;
                  (e.currentTarget as HTMLButtonElement).style.background =
                    C.primarySoft;
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  C.border;
                (e.currentTarget as HTMLButtonElement).style.background =
                  C.surface;
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: C.text,
                    marginBottom: 4,
                  }}
                >
                  {account.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    marginBottom: 8,
                  }}
                >
                  {account.type}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.success,
                    fontFamily: "monospace",
                    direction: "ltr",
                    textAlign: "left",
                  }}
                >
                  {account.email}
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${C.border}`,
                  fontSize: 12,
                  color: C.primary,
                  fontWeight: 700,
                }}
              >
                ➜ دخول الآن
              </div>
            </button>
          ))}
        </div>

        {/* DIVIDER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.textMuted, fontSize: 12 }}>أو</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* LINKS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 13,
          }}
        >
          <a
            href="/login"
            style={{
              padding: "12px",
              borderRadius: 8,
              background: C.border,
              color: C.text,
              textDecoration: "none",
              textAlign: "center",
              fontWeight: 600,
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                C.primarySoft;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                C.border;
            }}
          >
            تسجيل الدخول العادي
          </a>
          <a
            href="/signup"
            style={{
              padding: "12px",
              borderRadius: 8,
              background: C.primary,
              color: "white",
              textDecoration: "none",
              textAlign: "center",
              fontWeight: 600,
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                C.primarySoft;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                C.primary;
            }}
          >
            إنشاء حساب جديد
          </a>
        </div>

        {/* INFO */}
        <div
          style={{
            marginTop: 24,
            padding: 12,
            borderRadius: 8,
            background: C.primarySoft,
            border: `1px solid ${C.primary}`,
            fontSize: 12,
            color: C.text,
            lineHeight: 1.6,
          }}
        >
          <strong>ℹ️ معلومات حسابات التجربة:</strong>
          <br />
          كلمة المرور لجميع الحسابات: <code>Demo@12345678</code>
          <br />
          <br />
          بعد تسجيل الدخول يمكنك:
          <br />
          ✓ عرض المخزون والموظفين
          <br />
          ✓ اختبار الإشعارات
          <br />
          ✓ عرض الإحصائيات الحقيقية
        </div>
      </div>
    </div>
  );
}
