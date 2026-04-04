"use client";

import React, { useEffect, useState, useRef } from "react";
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
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
};

interface Profile {
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface Ticket {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: Profile | null;
  message_count: number;
  last_reply_at: string | null;
}

interface Message {
  id: string;
  ticket_id: string;
  message: string;
  sender_type: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
}

interface TicketStats {
  total: number;
  open: number;
  closedResolved: number;
  today: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return C.success;
    case "closed":
      return C.danger;
    case "resolved":
      return C.primary;
    default:
      return C.textMuted;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "open":
      return "\u0645\u0641\u062A\u0648\u062D\u0629";
    case "closed":
      return "\u0645\u063A\u0644\u0642\u0629";
    case "resolved":
      return "\u062A\u0645 \u0627\u0644\u062D\u0644";
    default:
      return status;
  }
}

function getSourceLabel(role: string | null | undefined) {
  if (role === "driver") return "\u0643\u0627\u0628\u062A\u0646 \uD83D\uDE97";
  if (role === "partner" || role === "store_admin") return "\u0634\u0631\u064A\u0643 \uD83C\uDFEA";
  return "\u0639\u0645\u064A\u0644 \uD83D\uDC64";
}

function getSourceType(ticket: Ticket): string {
  const role = ticket.profiles?.role;
  if (role === "driver") return "driver";
  if (role === "partner" || role === "store_admin") return "partner";
  return "customer";
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
    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
    <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 4px 0" }}>{label}</p>
    <p style={{ fontSize: 20, fontWeight: 900, color, margin: 0 }}>{value}</p>
  </div>
);

export default function CSTicketsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    closedResolved: 0,
    today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Detail modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  const itemsPerPage = 50;

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Client-side filtering
  useEffect(() => {
    let filtered = [...tickets];
    if (statusFilter !== "all")
      filtered = filtered.filter((t) => t.status === statusFilter);
    if (sourceFilter !== "all")
      filtered = filtered.filter((t) => getSourceType(t) === sourceFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.profiles?.email || "").toLowerCase().includes(term) ||
          (t.profiles?.full_name || "").toLowerCase().includes(term)
      );
    }
    setFilteredTickets(filtered);
    setCurrentPage(1);
  }, [tickets, searchTerm, statusFilter, sourceFilter]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
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

      setUserId(user.id);
      await loadTickets();
    } catch (error) {
      console.error("CS tickets auth error:", error);
    }
  }

  const loadTickets = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: ticketsData, error: ticketsError } = await (supabase as any)
        .from("support_tickets")
        .select("*, profiles!support_tickets_user_id_fkey(full_name, email, role)")
        .order("created_at", { ascending: false });

      if (ticketsError) {
        console.error("Error loading tickets:", ticketsError);
        return;
      }

      const rawTickets = (ticketsData || []) as any[];

      // Load message counts
      const ticketIds = rawTickets.map((t: any) => t.id);
      let messageCounts: Record<string, { count: number; last_at: string | null }> = {};

      if (ticketIds.length > 0) {
        const { data: msgData } = await (supabase as any)
          .from("support_messages")
          .select("ticket_id, created_at")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: false });

        if (msgData) {
          for (const msg of msgData as any[]) {
            if (!messageCounts[msg.ticket_id]) {
              messageCounts[msg.ticket_id] = {
                count: 0,
                last_at: msg.created_at,
              };
            }
            messageCounts[msg.ticket_id].count++;
          }
        }
      }

      const enrichedTickets: Ticket[] = rawTickets.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
        profiles: t.profiles || null,
        message_count: messageCounts[t.id]?.count || 0,
        last_reply_at: messageCounts[t.id]?.last_at || null,
      }));

      setTickets(enrichedTickets);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const openCount = enrichedTickets.filter((t) => t.status === "open").length;
      const closedResolvedCount = enrichedTickets.filter(
        (t) => t.status === "closed" || t.status === "resolved"
      ).length;
      const todayCount = enrichedTickets.filter(
        (t) => new Date(t.created_at) >= today
      ).length;

      setStats({
        total: enrichedTickets.length,
        open: openCount,
        closedResolved: closedResolvedCount,
        today: todayCount,
      });
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setLoadingMessages(true);

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await (supabase as any)
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages((data || []) as Message[]);

      // Subscribe to real-time new messages
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      subscriptionRef.current = supabase
        .channel(`cs_support_messages_${ticket.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `ticket_id=eq.${ticket.id}`,
          },
          (payload: any) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();
    } catch (error) {
      console.error("Error opening ticket detail:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const closeTicketDetail = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    setSelectedTicket(null);
    setMessages([]);
    setReplyText("");
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !userId) return;

    setSending(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("\u0644\u0627 \u064A\u0648\u062C\u062F \u0627\u062A\u0635\u0627\u0644");

      const { error } = await (supabase as any)
        .from("support_messages")
        .insert({
          ticket_id: selectedTicket.id,
          message: replyText.trim(),
          sender_type: "support",
          sender_id: userId,
          sender_name: "\u062E\u062F\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
        });

      if (error) throw error;

      setReplyText("");

      // Update ticket's updated_at
      await (supabase as any)
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      alert(error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u062F");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    const statusLabel = newStatus === "closed" ? "\u0625\u063A\u0644\u0627\u0642" : "\u062D\u0644";
    if (!confirm(`\u0647\u0644 \u062A\u0631\u064A\u062F \u0628\u0627\u0644\u0641\u0639\u0644 ${statusLabel} \u0647\u0630\u0647 \u0627\u0644\u062A\u0630\u0643\u0631\u0629\u061F`)) return;

    setUpdatingStatus(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("\u0644\u0627 \u064A\u0648\u062C\u062F \u0627\u062A\u0635\u0627\u0644");

      const { error } = await (supabase as any)
        .from("support_tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      // Update local state
      setSelectedTicket({ ...selectedTicket, status: newStatus });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id ? { ...t, status: newStatus } : t
        )
      );

      // Recalculate stats
      const updatedTickets = tickets.map((t) =>
        t.id === selectedTicket.id ? { ...t, status: newStatus } : t
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStats({
        total: updatedTickets.length,
        open: updatedTickets.filter((t) => t.status === "open").length,
        closedResolved: updatedTickets.filter(
          (t) => t.status === "closed" || t.status === "resolved"
        ).length,
        today: updatedTickets.filter((t) => new Date(t.created_at) >= today)
          .length,
      });
    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      alert(error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0630\u0643\u0631\u0629");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

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
          {"\uD83C\uDFA7 \u0625\u062F\u0627\u0631\u0629 \u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u062F\u0639\u0645"}
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          {"\u0639\u0631\u0636 \u0648\u0627\u0644\u0631\u062F \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u062F\u0639\u0645 \u0645\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0643\u0628\u0627\u062A\u0646 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u0621"}
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          label={"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u0630\u0627\u0643\u0631"}
          value={stats.total}
          icon={"\uD83C\uDFAB"}
          color={C.text}
        />
        <StatCard
          label={"\u062A\u0630\u0627\u0643\u0631 \u0645\u0641\u062A\u0648\u062D\u0629"}
          value={stats.open}
          icon={"\uD83D\uDCEC"}
          color={C.success}
        />
        <StatCard
          label={"\u0645\u063A\u0644\u0642\u0629 / \u062A\u0645 \u0627\u0644\u062D\u0644"}
          value={stats.closedResolved}
          icon={"\u2705"}
          color={C.primary}
        />
        <StatCard
          label={"\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u064A\u0648\u0645"}
          value={stats.today}
          icon={"\uD83D\uDCC5"}
          color={C.warning}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <input
          type="text"
          placeholder={"\u0627\u0628\u062D\u062B \u0628\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="all">{"\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0627\u0644\u0627\u062A"}</option>
          <option value="open">{"\u0645\u0641\u062A\u0648\u062D\u0629"}</option>
          <option value="closed">{"\u0645\u063A\u0644\u0642\u0629"}</option>
          <option value="resolved">{"\u062A\u0645 \u0627\u0644\u062D\u0644"}</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="all">{"\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0635\u0627\u062F\u0631"}</option>
          <option value="customer">{"\u0639\u0645\u064A\u0644"}</option>
          <option value="driver">{"\u0643\u0627\u0628\u062A\u0646"}</option>
          <option value="partner">{"\u0634\u0631\u064A\u0643"}</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div
        style={{
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
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
                  #
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
                  {"\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"}
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
                  {"\u0627\u0644\u0646\u0648\u0639"}
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
                  {"\u0627\u0644\u062D\u0627\u0644\u0629"}
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
                  {"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621"}
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
                  {"\u0622\u062E\u0631 \u0631\u062F"}
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
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: C.textMuted,
                      fontSize: 14,
                    }}
                  >
                    {"\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0630\u0627\u0643\u0631 \u062F\u0639\u0645"}
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <td
                      style={{
                        padding: 16,
                        color: C.textMuted,
                        fontSize: 13,
                      }}
                    >
                      {startIndex + index + 1}
                    </td>
                    <td style={{ padding: 16 }}>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: C.text,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {ticket.profiles?.full_name || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0 0",
                            color: C.textMuted,
                            fontSize: 11,
                          }}
                        >
                          {ticket.profiles?.email || "\u2014"}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: 16 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: 6,
                          background:
                            getSourceType(ticket) === "driver"
                              ? C.warningLight
                              : getSourceType(ticket) === "partner"
                              ? C.successLight
                              : C.primarySoft + "40",
                          color:
                            getSourceType(ticket) === "driver"
                              ? C.warning
                              : getSourceType(ticket) === "partner"
                              ? C.success
                              : C.primary,
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getSourceLabel(ticket.profiles?.role)}
                      </span>
                    </td>
                    <td style={{ padding: 16 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: 6,
                          background: getStatusColor(ticket.status) + "15",
                          color: getStatusColor(ticket.status),
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getStatusLabel(ticket.status)}
                      </span>
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
                      {ticket.message_count}
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: C.textMuted,
                        fontSize: 13,
                      }}
                    >
                      {new Date(ticket.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: C.textMuted,
                        fontSize: 13,
                      }}
                    >
                      {ticket.last_reply_at
                        ? new Date(ticket.last_reply_at).toLocaleDateString("ar-EG")
                        : "\u2014"}
                    </td>
                    <td style={{ padding: 16 }}>
                      <button
                        onClick={() => openTicketDetail(ticket)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: page === currentPage ? C.primary : C.surface,
                color: page === currentPage ? "white" : C.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Ticket Detail / Chat Modal */}
      {selectedTicket && (
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
          onClick={closeTicketDetail}
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
                  {"\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629"}
                </h2>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    {selectedTicket.profiles?.full_name || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"} (
                    {selectedTicket.profiles?.email || "\u2014"})
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: getStatusColor(selectedTicket.status) + "15",
                      color: getStatusColor(selectedTicket.status),
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    {new Date(selectedTicket.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={closeTicketDetail}
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
                maxHeight: 400,
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
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: C.textMuted,
                    fontSize: 13,
                  }}
                >
                  {"\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644 \u0628\u0639\u062F"}
                </div>
              ) : (
                messages.map((msg) => {
                  const isSupport = msg.sender_type === "support";
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isSupport ? "flex-start" : "flex-end",
                        flexDirection: isSupport ? "row-reverse" : "row",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "75%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: isSupport ? C.primary : C.surface,
                          color: isSupport ? "white" : C.text,
                          border: isSupport ? "none" : `1px solid ${C.border}`,
                          borderTopLeftRadius: isSupport ? 12 : 4,
                          borderTopRightRadius: isSupport ? 4 : 12,
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: 10,
                            fontWeight: 700,
                            opacity: 0.8,
                            color: isSupport ? "rgba(255,255,255,0.8)" : C.textMuted,
                          }}
                        >
                          {isSupport
                            ? "\u062E\u062F\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621"
                            : msg.sender_name ||
                              selectedTicket.profiles?.full_name ||
                              "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            lineHeight: 1.6,
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.message}
                        </p>
                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 10,
                            opacity: 0.6,
                            color: isSupport ? "rgba(255,255,255,0.6)" : C.textMuted,
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
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            {selectedTicket.status === "open" && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  flexShrink: 0,
                }}
              >
                <input
                  type="text"
                  placeholder={"\u0627\u0643\u062A\u0628 \u0631\u062F\u0643 \u0647\u0646\u0627..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 8,
                    background: C.primary,
                    color: "white",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    opacity: sending || !replyText.trim() ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {sending ? "\u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0631\u0633\u0627\u0644..." : "\u0625\u0631\u0633\u0627\u0644"}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  selectedTicket.status === "open" ? "1fr 1fr 1fr" : "1fr",
                gap: 12,
                flexShrink: 0,
              }}
            >
              {selectedTicket.status === "open" && (
                <>
                  <button
                    onClick={() => handleUpdateTicketStatus("resolved")}
                    disabled={updatingStatus}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: C.success,
                      color: "white",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: updatingStatus ? "not-allowed" : "pointer",
                      opacity: updatingStatus ? 0.6 : 1,
                    }}
                  >
                    {updatingStatus ? "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u062F\u064A\u062B..." : "\u2705 \u062A\u0645 \u0627\u0644\u062D\u0644"}
                  </button>
                  <button
                    onClick={() => handleUpdateTicketStatus("closed")}
                    disabled={updatingStatus}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: C.danger,
                      color: "white",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: updatingStatus ? "not-allowed" : "pointer",
                      opacity: updatingStatus ? 0.6 : 1,
                    }}
                  >
                    {updatingStatus ? "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u062F\u064A\u062B..." : "\uD83D\uDD12 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629"}
                  </button>
                </>
              )}
              <button
                onClick={closeTicketDetail}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: C.primary,
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
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
