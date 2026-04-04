"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#10B981",
  primarySoft: "#D1FAE5",
  bg: "#F0FDF4",
  surface: "#FFFFFF",
  surfaceLight: "#F0FDF4",
  border: "#D1FAE5",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  info: "#3B82F6",
  infoSoft: "#DBEAFE",
};

interface OrderChat {
  order_id: string;
  last_message: string;
  last_sender_type: string;
  last_created_at: string;
  message_count: number;
  customer_name: string | null;
  driver_name: string | null;
}

interface ChatMessage {
  id: string;
  order_id: string;
  message: string;
  sender_type: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
}

interface ChatStats {
  activeChatsToday: number;
  totalMessagesToday: number;
}

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) => (
  <div
    style={{
      padding: 20,
      borderRadius: 12,
      background: C.surface,
      border: `1px solid ${C.border}`,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{value}</p>
  </div>
);

export default function CSChatsPage() {
  const [loading, setLoading] = useState(true);
  const [orderChats, setOrderChats] = useState<OrderChat[]>([]);
  const [stats, setStats] = useState<ChatStats>({
    activeChatsToday: 0,
    totalMessagesToday: 0,
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "customer_service") return;

      await loadChats();
    } catch (error) {
      console.error("CS chats auth error:", error);
    }
  }

  async function loadChats() {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Get recent messages grouped by order_id
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from("messages")
        .select("id, order_id, message, sender_type, sender_id, sender_name, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (messagesError) {
        console.error("Error loading messages:", messagesError);
        return;
      }

      const allMessages = (messagesData || []) as ChatMessage[];

      // Group by order_id
      const orderMap: Record<
        string,
        {
          messages: ChatMessage[];
          lastMessage: ChatMessage;
        }
      > = {};

      for (const msg of allMessages) {
        if (!msg.order_id) continue;
        if (!orderMap[msg.order_id]) {
          orderMap[msg.order_id] = { messages: [], lastMessage: msg };
        }
        orderMap[msg.order_id].messages.push(msg);
      }

      // Get order details for customer/driver names
      const orderIds = Object.keys(orderMap);
      let orderDetails: Record<string, { customer_name: string | null; driver_name: string | null }> = {};

      if (orderIds.length > 0) {
        const { data: ordersData } = await (supabase as any)
          .from("orders")
          .select("id, customer_name, driver_name")
          .in("id", orderIds);

        if (ordersData) {
          for (const o of ordersData as any[]) {
            orderDetails[o.id] = {
              customer_name: o.customer_name || null,
              driver_name: o.driver_name || null,
            };
          }
        }
      }

      // Build order chats list
      const chatsList: OrderChat[] = orderIds.map((orderId) => {
        const group = orderMap[orderId];
        const details = orderDetails[orderId] || { customer_name: null, driver_name: null };
        return {
          order_id: orderId,
          last_message: group.lastMessage.message,
          last_sender_type: group.lastMessage.sender_type,
          last_created_at: group.lastMessage.created_at,
          message_count: group.messages.length,
          customer_name: details.customer_name,
          driver_name: details.driver_name,
        };
      });

      // Sort by last message time
      chatsList.sort(
        (a, b) =>
          new Date(b.last_created_at).getTime() - new Date(a.last_created_at).getTime()
      );

      setOrderChats(chatsList);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMessages = allMessages.filter(
        (m) => new Date(m.created_at) >= today
      );
      const todayOrderIds = new Set(todayMessages.map((m) => m.order_id));

      setStats({
        activeChatsToday: todayOrderIds.size,
        totalMessagesToday: todayMessages.length,
      });
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }

  async function openChatDetail(orderId: string) {
    setSelectedOrderId(orderId);
    setLoadingMessages(true);

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await (supabase as any)
        .from("messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading chat messages:", error);
        return;
      }

      setChatMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error("Error opening chat detail:", error);
    } finally {
      setLoadingMessages(false);
    }
  }

  function closeChatDetail() {
    setSelectedOrderId(null);
    setChatMessages([]);
  }

  function getSenderLabel(senderType: string) {
    switch (senderType) {
      case "customer":
        return "\u0627\u0644\u0639\u0645\u064A\u0644";
      case "driver":
        return "\u0627\u0644\u0643\u0627\u0628\u062A\u0646";
      default:
        return senderType;
    }
  }

  function getSenderColor(senderType: string) {
    switch (senderType) {
      case "customer":
        return C.info;
      case "driver":
        return C.warning;
      default:
        return C.textMuted;
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: `4px solid ${C.border}`,
              borderTopColor: C.primary,
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: C.textMuted }}>{"\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A..."}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{ padding: "24px", background: C.surfaceLight, minHeight: "100%" }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: C.text,
            margin: 0,
            marginBottom: 4,
          }}
        >
          {"\uD83D\uDCAC \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A"}
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          {"\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0628\u064A\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0643\u0628\u0627\u062A\u0646 (\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637)"}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          label={"\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0646\u0634\u0637\u0629 \u0627\u0644\u064A\u0648\u0645"}
          value={stats.activeChatsToday}
          icon={"\uD83D\uDCAC"}
          color={C.success}
        />
        <StatCard
          label={"\u0625\u062C\u0645\u0627\u0644\u064A \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u064A\u0648\u0645"}
          value={stats.totalMessagesToday}
          icon={"\uD83D\uDCE8"}
          color={C.info}
        />
      </div>

      {/* Order Chats List */}
      <div
        style={{
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>
            {"\uD83D\uDCC3 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0623\u062E\u064A\u0631\u0629"}
          </h2>
        </div>

        {orderChats.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: C.textMuted,
              fontSize: 14,
            }}
          >
            {"\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u062D\u062A\u0649 \u0627\u0644\u0622\u0646"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: C.surfaceLight,
                    borderBottom: `2px solid ${C.border}`,
                  }}
                >
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628"}
                  </th>
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0627\u0644\u0639\u0645\u064A\u0644"}
                  </th>
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0627\u0644\u0643\u0627\u0628\u062A\u0646"}
                  </th>
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0622\u062E\u0631 \u0631\u0633\u0627\u0644\u0629"}
                  </th>
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0639\u062F\u062F \u0627\u0644\u0631\u0633\u0627\u0626\u0644"}
                  </th>
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0622\u062E\u0631 \u0646\u0634\u0627\u0637"}
                  </th>
                  <th
                    style={{
                      padding: 16,
                      textAlign: "right",
                      color: C.textMuted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {"\u0625\u062C\u0631\u0627\u0621"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderChats.map((chat) => (
                  <tr
                    key={chat.order_id}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <td
                      style={{
                        padding: 16,
                        color: C.text,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {chat.order_id.slice(0, 8)}...
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: C.text,
                        fontSize: 13,
                      }}
                    >
                      {chat.customer_name || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: C.text,
                        fontSize: 13,
                      }}
                    >
                      {chat.driver_name || "\u063A\u064A\u0631 \u0645\u0639\u064A\u0646"}
                    </td>
                    <td style={{ padding: 16, maxWidth: 200 }}>
                      <p
                        style={{
                          margin: 0,
                          color: C.text,
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: getSenderColor(chat.last_sender_type),
                            marginLeft: 4,
                          }}
                        >
                          ({getSenderLabel(chat.last_sender_type)})
                        </span>
                        {chat.last_message}
                      </p>
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: C.text,
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      {chat.message_count}
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: C.textMuted,
                        fontSize: 12,
                      }}
                    >
                      {new Date(chat.last_created_at).toLocaleDateString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: 16 }}>
                      <button
                        onClick={() => openChatDetail(chat.order_id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: `1px solid ${C.primary}`,
                          background: "transparent",
                          color: C.primary,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {"\u0639\u0631\u0636"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chat Detail Modal (Read-Only) */}
      {selectedOrderId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeChatDetail}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 32,
              maxWidth: 600,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: C.text,
                    margin: "0 0 8px 0",
                  }}
                >
                  {"\uD83D\uDCAC \u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0637\u0644\u0628"}
                </h2>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    {"\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628: "}{selectedOrderId.slice(0, 12)}...
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: C.warningSoft,
                      color: C.warning,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {"\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637"}
                  </span>
                </div>
              </div>
              <button
                onClick={closeChatDetail}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  color: C.textMuted,
                  cursor: "pointer",
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                {"\u2715"}
              </button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                maxHeight: 500,
                overflowY: "auto",
                marginBottom: 16,
                padding: 12,
                background: C.surfaceLight,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
              }}
            >
              {loadingMessages ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: `3px solid ${C.border}`,
                      borderTopColor: C.primary,
                      animation: "spin 1s linear infinite",
                      margin: "0 auto 12px",
                    }}
                  />
                  <p style={{ color: C.textMuted, fontSize: 13 }}>
                    {"\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644..."}
                  </p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : chatMessages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: C.textMuted,
                    fontSize: 13,
                  }}
                >
                  {"\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629"}
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCustomer = msg.sender_type === "customer";
                  const senderColor = getSenderColor(msg.sender_type);
                  const senderBg = isCustomer ? C.infoSoft : C.warningSoft;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: isCustomer ? "row" : "row-reverse",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "75%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: senderBg,
                          border: `1px solid ${senderColor}20`,
                          borderTopLeftRadius: isCustomer ? 4 : 12,
                          borderTopRightRadius: isCustomer ? 12 : 4,
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: 10,
                            fontWeight: 700,
                            color: senderColor,
                          }}
                        >
                          {getSenderLabel(msg.sender_type)}
                          {msg.sender_name ? ` - ${msg.sender_name}` : ""}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            lineHeight: 1.6,
                            wordBreak: "break-word",
                            color: C.text,
                          }}
                        >
                          {msg.message}
                        </p>
                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 10,
                            color: C.textMuted,
                          }}
                        >
                          {new Date(msg.created_at).toLocaleDateString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Read-only notice + close */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: C.warningSoft,
                  color: C.warning,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {"\u26A0\uFE0F \u0648\u0636\u0639 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u2014 \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0631\u062F \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629"}
              </div>
              <button
                onClick={closeChatDetail}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: C.primary,
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {"\u0631\u062C\u0648\u0639"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
