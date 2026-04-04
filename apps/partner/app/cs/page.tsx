"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#10B981",
  primarySoft: "#D1FAE5",
  bg: "#F0FDF4",
  surface: "#FFFFFF",
  border: "#D1FAE5",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
};

interface TicketRow {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string | null; email: string | null; role: string | null } | null;
}

interface DashboardStats {
  openTickets: number;
  todayTickets: number;
  resolvedToday: number;
  avgResponseTime: string;
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

export default function CSDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    openTickets: 0,
    todayTickets: 0,
    resolvedToday: 0,
    avgResponseTime: "--",
  });
  const [recentTickets, setRecentTickets] = useState<TicketRow[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get agent profile
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setAgentName(profile.full_name || profile.email || "");
      }

      // Load all tickets
      const { data: ticketsData } = await (supabase as any)
        .from("support_tickets")
        .select("*, profiles!support_tickets_user_id_fkey(full_name, email, role)")
        .order("created_at", { ascending: false });

      const tickets = (ticketsData || []) as TicketRow[];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const openTickets = tickets.filter((t) => t.status === "open").length;
      const todayTickets = tickets.filter((t) => new Date(t.created_at) >= today).length;
      const resolvedToday = tickets.filter(
        (t) =>
          (t.status === "resolved" || t.status === "closed") &&
          new Date(t.updated_at) >= today
      ).length;

      setStats({
        openTickets,
        todayTickets,
        resolvedToday,
        avgResponseTime: "\u0623\u0642\u0644 \u0645\u0646 \u0633\u0627\u0639\u0629",
      });

      // Recent 5 open tickets
      const recentOpen = tickets.filter((t) => t.status === "open").slice(0, 5);
      setRecentTickets(recentOpen);
    } catch (error) {
      console.error("Error loading CS dashboard:", error);
    } finally {
      setLoading(false);
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
    <div dir="rtl" style={{ minHeight: "100%" }}>
      {/* Welcome Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: C.text,
            margin: "0 0 8px 0",
          }}
        >
          {"\uD83C\uDFA7 \u0645\u0631\u062D\u0628\u0627\u064B\u060C "}{agentName}
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          {"\u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u062E\u062F\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u2014 \u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0648\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A"}
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          label={"\u062A\u0630\u0627\u0643\u0631 \u0645\u0641\u062A\u0648\u062D\u0629"}
          value={stats.openTickets}
          icon={"\uD83D\uDCEC"}
          color={C.success}
        />
        <StatCard
          label={"\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u064A\u0648\u0645"}
          value={stats.todayTickets}
          icon={"\uD83D\uDCC5"}
          color={C.warning}
        />
        <StatCard
          label={"\u062A\u0645 \u062D\u0644\u0647\u0627 \u0627\u0644\u064A\u0648\u0645"}
          value={stats.resolvedToday}
          icon={"\u2705"}
          color={C.primary}
        />
        <StatCard
          label={"\u0645\u062A\u0648\u0633\u0637 \u0648\u0642\u062A \u0627\u0644\u0631\u062F"}
          value={stats.avgResponseTime}
          icon={"\u23F1\uFE0F"}
          color={C.text}
        />
      </div>

      {/* Recent Open Tickets */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>
            {"\uD83D\uDCEC \u0622\u062E\u0631 \u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629"}
          </h2>
          <button
            onClick={() => router.push("/cs/tickets")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${C.primary}`,
              background: "transparent",
              color: C.primary,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {"\u0639\u0631\u0636 \u0627\u0644\u0643\u0644"}
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: C.textMuted,
              fontSize: 14,
            }}
          >
            {"\uD83C\uDF89 \u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0630\u0627\u0643\u0631 \u0645\u0641\u062A\u0648\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: C.bg,
                    borderBottom: `2px solid ${C.border}`,
                  }}
                >
                  <th
                    style={{
                      padding: 14,
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
                      padding: 14,
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
                      padding: 14,
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
                      padding: 14,
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
                      padding: 14,
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
                {recentTickets.map((ticket, idx) => {
                  const role = ticket.profiles?.role;
                  const sourceLabel =
                    role === "driver"
                      ? "\u0643\u0627\u0628\u062A\u0646 \uD83D\uDE97"
                      : role === "partner" || role === "store_admin"
                      ? "\u0634\u0631\u064A\u0643 \uD83C\uDFEA"
                      : "\u0639\u0645\u064A\u0644 \uD83D\uDC64";
                  return (
                    <tr
                      key={ticket.id}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td
                        style={{
                          padding: 14,
                          color: C.textMuted,
                          fontSize: 13,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td style={{ padding: 14 }}>
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
                      </td>
                      <td style={{ padding: 14 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 6,
                            background:
                              role === "driver"
                                ? C.warningSoft
                                : role === "partner" || role === "store_admin"
                                ? C.successSoft
                                : C.primarySoft,
                            color:
                              role === "driver"
                                ? C.warning
                                : role === "partner" || role === "store_admin"
                                ? C.success
                                : C.primary,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {sourceLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: 14,
                          color: C.textMuted,
                          fontSize: 13,
                        }}
                      >
                        {new Date(ticket.created_at).toLocaleDateString("ar-EG")}
                      </td>
                      <td style={{ padding: 14 }}>
                        <button
                          onClick={() => router.push("/cs/tickets")}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
