"use client";
import React, { useEffect, useState, useRef } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#34D399",
  danger: "#EF4444",
};

const PHONE = "+201153624184";

const FAQ_ITEMS = [
  { q: "كيف أضيف أصنافاً جديدة للقائمة؟", a: "من صفحة 'القائمة' في لوحة التحكم، اضغط على 'إضافة صنف جديد' واملأ البيانات المطلوبة." },
  { q: "متى يتم تحويل أرباحي؟", a: "يتم التسوية أسبوعياً (السبت–الجمعة). تُحوَّل المبالغ مباشرة بعد انتهاء فترة التسوية." },
  { q: "كيف أعدّل ساعات العمل؟", a: "تواصل معنا عبر المحادثة أو أرسل بريداً على admin@hillaha.com لتعديل ساعات العمل." },
  { q: "كيف أتعامل مع طلب ملغي؟", a: "الطلبات الملغاة تُخصم تلقائياً من التسوية. إذا لاحظت خطأ تواصل مع الدعم." },
  { q: "كيف أحدّث بيانات المتجر؟", a: "من صفحة 'الإعدادات' يمكنك تغيير الشعار. لتعديل الاسم أو العنوان تواصل مع admin@hillaha.com." },
];

interface Message {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  user_id: string;
  status: string;
}

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Initialize: get or create ticket, load messages, subscribe
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = getSupabase();
      if (!supabase) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const userId = user.id;

      // Try to get an existing open ticket
      const { data: existingTickets, error: fetchErr } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchErr) {
        console.error("Error fetching tickets:", fetchErr);
        setLoading(false);
        return;
      }

      let activeTicket: Ticket;

      if (existingTickets && existingTickets.length > 0) {
        activeTicket = existingTickets[0];
      } else {
        // Create a new ticket
        const { data: newTicket, error: createErr } = await (supabase as any)
          .from("support_tickets")
          .insert({
            user_id: userId,
            status: "open",
            source: "partner",
          })
          .select()
          .single();

        if (createErr || !newTicket) {
          console.error("Error creating ticket:", createErr);
          setLoading(false);
          return;
        }
        activeTicket = newTicket;
      }

      if (cancelled) return;
      setTicket(activeTicket);

      // Load existing messages
      const { data: existingMessages } = await (supabase as any)
        .from("support_messages")
        .select("*")
        .eq("ticket_id", activeTicket.id)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        setMessages(existingMessages || []);
        setLoading(false);
      }

      // Subscribe to new messages
      const channel = supabase
        .channel(`support-${activeTicket.id}`)
        .on(
          "postgres_changes" as any,
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `ticket_id=eq.${activeTicket.id}`,
          },
          (payload: any) => {
            if (!cancelled) {
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === payload.new.id)) return prev;
                return [...prev, payload.new as Message];
              });
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    init();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        const supabase = getSupabase();
        if (supabase) {
          supabase.removeChannel(channelRef.current);
        }
        channelRef.current = null;
      }
    };
  }, []);

  async function sendMessage() {
    if (!newMessage.trim() || !ticket || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_type: "partner",
          sender_id: user.id,
          sender_name: user.user_metadata?.name || user.email || "شريك",
          message: text,
        });

      if (error) {
        console.error("Error sending message:", error);
        // Restore the message so the user can retry
        setNewMessage(text);
      }
    } catch (err) {
      console.error("Send error:", err);
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  }

  // ---------- Loading state ----------
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", border: `4px solid ${C.border}`, borderTopColor: C.primary, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: C.textMuted }}>جاري التحميل...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div dir="rtl" style={{ padding: 24, background: C.bg, minHeight: "100vh", fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>
            🎧 الدعم الفني
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>
            تحدث مع فريق دعم هيلاها
          </p>
        </div>
        <a
          href={`tel:${PHONE}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            background: C.success,
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          📞 اتصل بنا
        </a>
      </div>

      {/* Main layout: Chat (70%) + FAQ (30%) */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Chat area */}
        <div style={{ flex: 7, background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 500, maxHeight: "75vh", overflow: "hidden" }}>
          {/* Chat header */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.success }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>محادثة الدعم</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>— متصل</span>
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
                <p style={{ fontSize: 14 }}>مرحباً بك في الدعم الفني</p>
                <p style={{ fontSize: 12 }}>اكتب رسالتك وسنرد عليك في أقرب وقت</p>
              </div>
            ) : (
              messages.map((msg) =>
                msg.sender_type === "partner" ? (
                  <div key={msg.id} style={{ alignSelf: "flex-end", maxWidth: "75%" }}>
                    <div style={{ background: C.primary, borderRadius: 16, padding: 12, color: "white" }}>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{msg.message}</p>
                    </div>
                    <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: "left" }}>
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ) : (
                  <div key={msg.id} style={{ alignSelf: "flex-start", maxWidth: "75%" }}>
                    <div style={{ background: C.surface, borderRadius: 16, padding: 12, border: `1px solid ${C.border}` }}>
                      {msg.sender_name && (
                        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: C.primary }}>
                          {msg.sender_name}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{msg.message}</p>
                    </div>
                    <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="اكتب رسالة للدعم..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                fontSize: 14,
                fontFamily: "inherit",
                direction: "rtl",
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              style={{
                padding: "10px 20px",
                borderRadius: 20,
                border: "none",
                background: newMessage.trim() ? C.primary : C.border,
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: newMessage.trim() ? "pointer" : "default",
                opacity: sending ? 0.7 : 1,
              }}
            >
              📤 إرسال
            </button>
          </div>
        </div>

        {/* FAQ sidebar */}
        <div style={{ flex: 3, background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 16px" }}>
            ❓ الأسئلة الشائعة
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} style={{ borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: openFaq === idx ? C.primarySoft : C.surface,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "right",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{item.q}</span>
                  <span style={{ fontSize: 16, color: C.primary, transform: openFaq === idx ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    ▼
                  </span>
                </button>
                {openFaq === idx && (
                  <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
                    <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: C.primarySoft, textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: C.primary }}>
              تحتاج مساعدة إضافية؟
            </p>
            <a
              href={`tel:${PHONE}`}
              style={{ fontSize: 13, color: C.primary, textDecoration: "underline" }}
            >
              📞 {PHONE}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
