"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  danger: "#EF4444",
};

const NAV = [
  { href: "/dashboard",          icon: "📊", label: "الرئيسية" },
  { href: "/dashboard/orders",   icon: "📦", label: "الطلبات" },
  { href: "/dashboard/menu",     icon: "🍽️", label: "القائمة" },
  { href: "/dashboard/finance",  icon: "💰", label: "المالية" },
  { href: "/dashboard/promotions", icon: "🎁", label: "العروض" },
  { href: "/dashboard/reviews",  icon: "⭐", label: "التقييمات" },
  { href: "/dashboard/drivers",  icon: "👨", label: "المندوبون" },
  { href: "/dashboard/settings", icon: "⚙️", label: "الإعدادات" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("الشريك");
  const [logoUrl,  setLogoUrl]  = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }

    sb.auth.getSession().then(async ({ data }) => {
      try {
        if (!data.session) {
          router.replace("/login");
          return;
        }

        const userId = data.session.user.id;
        const meta = data.session.user.user_metadata as any;
        setUserName(meta?.full_name ?? meta?.name ?? data.session.user.email?.split("@")[0] ?? "الشريك");

        // Check super_admin role
        try {
          const { data: profile, error: profileError } = await sb
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
          } else if (profile) {
            const profileRole = (profile as { role: string | null } | null)?.role;
            if (profileRole === "super_admin") {
              setIsSuperAdmin(true);
            }
          }
        } catch (err) {
          console.error("Error checking super admin:", err);
        }

        // Load partner logo from partners table
        try {
          const { data: partner, error: partnerError } = await sb
            .from("partners")
            .select("logo_url")
            .eq("user_id", userId)
            .maybeSingle();

          if (!partnerError && partner) {
            const partnerLogoUrl = (partner as { logo_url: string | null } | null)?.logo_url;
            if (partnerLogoUrl) setLogoUrl(partnerLogoUrl);
          }
        } catch (err) {
          console.error("Error loading partner logo:", err);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error in dashboard layout:", err);
        setLoading(false);
      }
    });
  }, [router]);

  async function handleLogout() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: `4px solid ${C.primarySoft}`,
          borderTopColor: C.primary,
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 240, background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, right: 0, bottom: 0,
        zIndex: 100,
      }}>
        {/* LOGO */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <img src="/logo.png" alt="حلها يحلها" style={{ width: 36, height: 36, objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: C.text }}>
              حلها<br/>يحلها
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>لوحة الشريك</div>
          </div>
        </div>

        {/* STORE INFO */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 12,
            background: C.primarySoft,
          }}>
            {/* Store logo or default emoji */}
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: logoUrl ? "transparent" : C.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, overflow: "hidden", flexShrink: 0,
              border: logoUrl ? `2px solid ${C.primary}` : "none",
            }}>
              {logoUrl
                ? <img src={logoUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>🏪</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{userName}</div>
              <div style={{
                fontSize: 11, marginTop: 2, display: "inline-block",
                padding: "1px 8px", borderRadius: 20,
                background: C.success, color: "white", fontWeight: 700,
              }}>مفتوح</div>
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav style={{ flex: 1, padding: "12px 12px" }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <a
                key={item.href} href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 12, marginBottom: 4,
                  background: active ? C.primary : "transparent",
                  color: active ? "white" : C.text,
                  fontWeight: active ? 900 : 600,
                  fontSize: 14, transition: "all 0.15s",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}

          {/* Super Admin nav item — مرئي لحساب السوبر أدمن فقط */}
          {isSuperAdmin && (
            <a
              href="/admin"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 12, marginTop: 8,
                background: pathname.startsWith("/admin") ? "#6D28D9" : "#EDE9FE",
                color: pathname.startsWith("/admin") ? "white" : "#6D28D9",
                fontWeight: 900, fontSize: 14,
                textDecoration: "none",
                border: "1.5px solid #C4B5FD",
              }}
            >
              <span style={{ fontSize: 18 }}>👑</span>
              لوحة الإدارة
            </a>
          )}
        </nav>

        {/* LOGOUT */}
        <div style={{ padding: "12px 12px", borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              background: "#FEF2F2", border: "1.5px solid #FECACA",
              color: C.danger, fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              cursor: "pointer",
            }}
          >
            🚪 تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginRight: 240, padding: 28, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
