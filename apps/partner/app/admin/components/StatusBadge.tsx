import React from "react";

const C = {
  success: "#34D399",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
};

type StatusType = "pending" | "approved" | "rejected" | "active" | "inactive" | "delivered" | "cancelled";

const statusConfig: Record<StatusType, { bg: string; text: string; label: string }> = {
  pending: { bg: C.warningSoft, text: C.warning, label: "قيد الانتظار" },
  approved: { bg: C.successSoft, text: C.success, label: "موافق عليه" },
  rejected: { bg: C.dangerSoft, text: C.danger, label: "مرفوض" },
  active: { bg: C.successSoft, text: C.success, label: "نشط" },
  inactive: { bg: C.warningSoft, text: C.warning, label: "غير نشط" },
  delivered: { bg: C.successSoft, text: C.success, label: "تم التسليم" },
  cancelled: { bg: C.dangerSoft, text: C.danger, label: "ملغى" },
};

interface StatusBadgeProps {
  status: StatusType;
  customLabel?: string;
}

export function StatusBadge({ status, customLabel }: StatusBadgeProps) {
  const config = statusConfig[status];
  const label = customLabel || config.label;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 20,
        backgroundColor: config.bg,
        color: config.text,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
