"use client";

import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { useRouter } from "next/navigation";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  success: "#34D399",
  successSoft: "#D1FAE5",
  danger: "#EF4444",
};

interface NavigationCard {
  href: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export default function AdminManagementPage() {
  const auth = useAdminAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.isAdmin) return;

    if (!auth.isSuperAdmin) {
      router.push("/admin");
      return;
    }

    setLoading(false);
  }, [auth.isSuperAdmin, auth.isAdmin, router]);

  if (loading) return null;

  const navCards: NavigationCard[] = [
    {
      href: "/admin/admin-management/invite-frid",
      title: "دعوة مديري الفرائد",
      description: "استدعِ مديري الفرائد الجدد (3-33 مدير)",
      icon: "📨",
      color: "#8B5CF6",
    },
    {
      href: "/admin/admin-management/approve-admins",
      title: "موافقة طلبات المديرين",
      description: "راجع وافق على طلبات المديرين الجدد",
      icon: "✅",
      color: "#34D399",
    },
    {
      href: "/admin/admin-management/logs",
      title: "سجل التدقيق",
      description: "عرض جميع الإجراءات والتعديلات",
      icon: "📋",
      color: "#F59E0B",
    },
  ];

  return (
    <div dir="rtl">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8 }}>
          👑 إدارة النظام
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          إدارة مديري الفرائد والمديرين والسجلات
        </p>
      </div>

      {/* Navigation Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {navCards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              border: `2px solid ${C.border}`,
              padding: 24,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = card.color;
              el.style.boxShadow = `0 8px 24px ${card.color}20`;
              el.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = C.border;
              el.style.boxShadow = "none";
              el.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 12,
              }}
            >
              {card.icon}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: card.color,
                margin: 0,
                marginBottom: 8,
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: C.textMuted,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {card.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
