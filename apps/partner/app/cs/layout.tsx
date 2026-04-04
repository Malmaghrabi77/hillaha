"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#10B981",
  primarySoft: "#D1FAE5",
  bg: "#F0FDF4",
  surface: "#FFFFFF",
  border: "#D1FAE5",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

const navItems = [
  { href: "/cs", label: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0642\u064A\u0627\u062F\u0629", icon: "\uD83D\uDCCA" },
  { href: "/cs/tickets", label: "\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u062F\u0639\u0645", icon: "\uD83C\uDFA7" },
  { href: "/cs/chats", label: "\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A", icon: "\uD83D\uDCAC" },
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
}

export default function CSLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        router.push("/admin-login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/admin-login");
        return;
      }

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "customer_service") {
        router.push("/admin-login");
        return;
      }

      setUser({
        id: profile.id,
        email: profile.email || user.email || "",
        full_name: profile.full_name,
        role: profile.role,
      });
    } catch (error) {
      console.error("CS auth check error:", error);
      router.push("/admin-login");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    router.push("/admin-login");
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: `4px solid ${C.primarySoft}`,
            borderTopColor: C.primary,
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          backgroundColor: C.surface,
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Logo / Role Label */}
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>{"\uD83C\uDFA7"}</span>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.text }}>
              {"\u062E\u062F\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621"}
            </h1>
          </div>
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
            {user.full_name || user.email}
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  marginBottom: 8,
                  borderRadius: 12,
                  border: "none",
                  background: isActive ? C.primarySoft : "transparent",
                  color: isActive ? C.primary : C.text,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s",
                  textAlign: "right",
                  direction: "rtl",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      C.primarySoft + "40";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "16px 12px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: C.primarySoft,
              color: C.primary,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "right",
              direction: "rtl",
            }}
          >
            {"\u21A9\uFE0F \u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0631\u0626\u064A\u0633\u064A\u0629"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: C.dangerSoft,
              color: C.danger,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "right",
              direction: "rtl",
            }}
          >
            {"\uD83D\uDEAA \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          marginRight: sidebarOpen ? 240 : 0,
          transition: "margin-right 0.3s ease",
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            backgroundColor: C.surface,
            borderBottom: `1px solid ${C.border}`,
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: "8px 12px",
              border: "none",
              background: C.primarySoft,
              color: C.primary,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            {"\u2630"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>
              {"\u0645\u0631\u062D\u0628\u0627\u064B: "}{user.email}
            </span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: C.primarySoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {"\uD83C\uDFA7"}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, padding: "24px", overflow: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
