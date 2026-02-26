import React from "react";

const C = {
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  primarySoft: "#EDE9FE",
  primary: "#8B5CF6",
};

interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyMessage = "لا توجد بيانات",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: 40,
          textAlign: "center",
          color: C.textMuted,
        }}
      >
        جاري التحميل...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: 40,
          textAlign: "center",
          color: C.textMuted,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      {/* Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns.map(col => col.width || "1fr").join(" "),
          backgroundColor: C.primarySoft,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          fontWeight: 700,
          color: C.primary,
          fontSize: 13,
          textAlign: "right",
          direction: "rtl",
        }}
      >
        {columns.map((col) => (
          <div key={String(col.key)} style={{ display: "flex", alignItems: "center" }}>
            {col.label}
            {col.sortable && <span style={{ marginRight: 4 }}>⬍</span>}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div>
        {data.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onRowClick?.(item)}
            style={{
              display: "grid",
              gridTemplateColumns: columns.map(col => col.width || "1fr").join(" "),
              padding: "12px 16px",
              borderBottom: idx < data.length - 1 ? `1px solid ${C.border}` : "none",
              alignItems: "center",
              cursor: onRowClick ? "pointer" : "default",
              transition: "background-color 0.2s",
              backgroundColor: idx % 2 === 0 ? "transparent" : C.primarySoft + "20",
              textAlign: "right",
              direction: "rtl",
            }}
            onMouseEnter={(e) => {
              if (onRowClick) {
                (e.currentTarget as HTMLElement).style.backgroundColor = C.primarySoft + "40";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                idx % 2 === 0 ? "transparent" : C.primarySoft + "20";
            }}
          >
            {columns.map((col) => (
              <div key={String(col.key)} style={{ fontSize: 13, color: C.text }}>
                {col.render
                  ? col.render(item[col.key], item)
                  : String(item[col.key] || "-")}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
