"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primaryLight: "#C4B5FD",
  primaryDark: "#6D28D9",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  surface: "#FFFFFF",
  surfaceLight: "#FAFAFF",
  border: "#E7E3FF",
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  action_url: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const notificationsPerPage = 20;

  useEffect(() => {
    loadNotifications();
    // Set up real-time subscription
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("يجب تسجيل الدخول أولاً");
        return;
      }

      let query = (supabase.from("notifications") as any)
        .select("*")
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.eq("is_read", false);
      } else if (filter === "archived") {
        query = query.eq("is_archived", true);
      } else {
        query = query.eq("is_archived", false);
      }

      const { data: notificationsData, error: notificationsError } = await query;

      if (notificationsError) throw notificationsError;
      setNotifications((notificationsData as any[]) || []);
      setError(null);
    } catch (err: any) {
      console.error("Error loading notifications:", err);
      setError(err.message || "فشل تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const supabase = getSupabase();
      const { error: updateError } = await (supabase!
        .from("notifications") as any)
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (updateError) throw updateError;
      loadNotifications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      const supabase = getSupabase();
      const { error: updateError } = await (supabase!
        .from("notifications") as any)
        .update({ is_archived: true })
        .eq("id", notificationId);

      if (updateError) throw updateError;
      loadNotifications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const supabase = getSupabase();
      const { error: deleteError } = await (supabase!
        .from("notifications") as any)
        .delete()
        .eq("id", notificationId);

      if (deleteError) throw deleteError;
      loadNotifications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * notificationsPerPage,
    currentPage * notificationsPerPage
  );

  const totalPages = Math.ceil(notifications.length / notificationsPerPage);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order":
        return "📦";
      case "payment":
        return "💳";
      case "inventory":
        return "📊";
      case "staff":
        return "👥";
      case "system":
        return "⚙️";
      case "message":
        return "💬";
      case "alert":
        return "⚠️";
      default:
        return "📢";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return { bg: C.successLight, color: C.success };
      case "normal":
        return { bg: C.primaryLight, color: C.primary };
      case "high":
        return { bg: C.warningLight, color: C.warning };
      case "urgent":
        return { bg: C.dangerLight, color: C.danger };
      default:
        return { bg: C.border, color: C.textMuted };
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "low":
        return "منخفض";
      case "normal":
        return "عادي";
      case "high":
        return "مرتفع";
      case "urgent":
        return "عاجل";
      default:
        return priority;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `3px solid ${C.border}`,
          borderTopColor: C.primary,
          margin: "0 auto 12px",
          animation: "spin 1s linear infinite",
        }} />
        جاري تحميل الإشعارات...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 4 }}>
          🔔 الإشعارات
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          إدارة جميع إشعاراتك والتنبيهات المهمة
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 24,
        borderBottom: `2px solid ${C.border}`,
        paddingBottom: 16,
      }}>
        {[
          { value: "all" as const, label: "الكل", count: notifications.length },
          { value: "unread" as const, label: "غير مقروء", count: unreadCount },
          { value: "archived" as const, label: "مؤرشف", count: notifications.length },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              setFilter(tab.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: filter === tab.value ? C.primary : "transparent",
              color: filter === tab.value ? "white" : C.textMuted,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginRight: 6, fontWeight: 900 }}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {paginatedNotifications.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {paginatedNotifications.map(notification => {
            const priorityColor = getPriorityColor(notification.priority);
            return (
              <div
                key={notification.id}
                style={{
                  background: notification.is_read ? C.surface : C.primaryLight,
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${notification.is_read ? C.border : C.primary}`,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateX(-4px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: 24, minWidth: 32 }}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.text,
                    }}>
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: C.primary,
                      }} />
                    )}
                  </div>
                  <p style={{
                    margin: "0 0 8px 0",
                    fontSize: 13,
                    color: C.textMuted,
                    lineHeight: 1.5,
                  }}>
                    {notification.message}
                  </p>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{
                      fontSize: 11,
                      color: C.textMuted,
                    }}>
                      {new Date(notification.created_at).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: priorityColor.bg,
                      color: priorityColor.color,
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {getPriorityLabel(notification.priority)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: C.success,
                        color: "white",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(notification.id)}
                    title="Archive"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: C.border,
                      color: C.textMuted,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📁
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    title="Delete"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: C.dangerLight,
                      color: C.danger,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          padding: 60,
          color: C.textMuted,
          background: C.surface,
          borderRadius: 12,
          border: `2px dashed ${C.border}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
          <p style={{ margin: 0, fontSize: 14 }}>
            لا توجد إشعارات
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: page === currentPage ? "none" : `1px solid ${C.border}`,
                background: page === currentPage ? C.primary : C.surface,
                color: page === currentPage ? "white" : C.text,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
