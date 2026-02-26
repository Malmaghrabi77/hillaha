import React from "react";

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
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: "primary" | "success" | "warning" | "danger";
  trend?: { value: number; direction: "up" | "down" };
}

export function StatsCard({
  label,
  value,
  icon,
  color = "primary",
  trend,
}: StatsCardProps) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: C.primarySoft, text: C.primary },
    success: { bg: C.successSoft, text: C.success },
    warning: { bg: C.warningSoft, text: C.warning },
    danger: { bg: C.dangerSoft, text: C.danger },
  };

  const colorScheme = colorMap[color];

  return (
    <div
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: colorScheme.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: C.textMuted, fontSize: 13, margin: 0, marginBottom: 4 }}>
          {label}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ color: C.text, fontSize: 24, fontWeight: 900, margin: 0 }}>
            {value}
          </h3>
          {trend && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: trend.direction === "up" ? C.successSoft : C.dangerSoft,
                color: trend.direction === "up" ? C.success : C.danger,
              }}
            >
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
