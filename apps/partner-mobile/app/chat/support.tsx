import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabase } from "@/lib/supabase";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface SupportMessage {
  id: string;
  message: string;
  sender_type: string;
  sender_name: string;
  created_at: string;
}

export default function SupportChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<{ id: string; name: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initSupport();
  }, []);

  useEffect(() => {
    if (!ticketId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`support-${ticketId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload: any) => {
          if (payload.new) {
            const newMsg = {
              id: payload.new.id,
              message: payload.new.message,
              sender_type: payload.new.sender_type,
              sender_name: payload.new.sender_name,
              created_at: payload.new.created_at,
            };
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  const initSupport = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get partner info
      const { data: partner } = await (supabase as any)
        .from("partners")
        .select("id, name")
        .eq("user_id", user.user.id)
        .single();

      if (partner) setPartnerInfo(partner);

      // Find or create open ticket
      const { data: existingTicket } = await (supabase as any)
        .from("support_tickets")
        .select("id")
        .eq("user_id", user.user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let tid: string;
      if (existingTicket?.id) {
        tid = existingTicket.id;
      } else {
        const { data: newTicket } = await (supabase as any)
          .from("support_tickets")
          .insert({ user_id: user.user.id, status: "open" })
          .select("id")
          .single();
        if (!newTicket?.id) return;
        tid = newTicket.id;
      }

      setTicketId(tid);

      // Load messages
      const { data: msgs } = await (supabase as any)
        .from("support_messages")
        .select("id, message, sender_type, sender_name, created_at")
        .eq("ticket_id", tid)
        .order("created_at", { ascending: true });

      if (msgs) setMessages(msgs);
    } catch (e) {
      console.error("Error initializing support:", e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !ticketId || sending) return;
    setSending(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      await (supabase as any).from("support_messages").insert({
        ticket_id: ticketId,
        message: newMessage.trim(),
        sender_type: "partner",
        sender_id: user.user?.id || partnerInfo?.id,
        sender_name: partnerInfo?.name || "شريك",
      });

      setNewMessage("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isSelf = item.sender_type === "partner";
    return (
      <View style={[styles.bubbleRow, isSelf ? styles.bubbleRowSelf : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
          {!isSelf && <Text style={styles.senderName}>{item.sender_name || "الدعم الفني"}</Text>}
          <Text style={[styles.messageText, isSelf && styles.messageTextSelf]}>{item.message}</Text>
          <Text style={[styles.timeText, isSelf && styles.timeTextSelf]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>الدعم الفني</Text>
          <Text style={styles.headerSub}>فريق حلّها للمساعدة</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={{ fontSize: 40, marginBottom: SPACING.md }}>💬</Text>
            <Text style={styles.emptyChatTitle}>مرحباً بك في الدعم الفني</Text>
            <Text style={styles.emptyChatText}>اكتب رسالتك وسيقوم فريقنا بالرد عليك</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <TextInput
          style={styles.chatInput}
          placeholder="اكتب رسالتك..."
          placeholderTextColor={COLORS.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          textAlign="right"
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && { opacity: 0.4 }]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>إرسال</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.deepPurple,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  headerBack: { fontSize: FONT_SIZES["2xl"], color: COLORS.textLight, marginLeft: SPACING.md },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: "800", color: COLORS.textLight },
  headerSub: { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  messagesList: { padding: SPACING.lg, flexGrow: 1 },
  bubbleRow: { marginBottom: SPACING.md },
  bubbleRowSelf: { alignItems: "flex-start" },
  bubbleRowOther: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "80%",
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  bubbleSelf: { backgroundColor: COLORS.chatBubbleSelf, borderBottomLeftRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.chatBubbleOther, borderBottomRightRadius: 4 },
  senderName: { fontSize: FONT_SIZES.xs, fontWeight: "700", color: COLORS.primary, marginBottom: 2 },
  messageText: { fontSize: FONT_SIZES.base, color: COLORS.text, lineHeight: 22 },
  messageTextSelf: { color: COLORS.textLight },
  timeText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 4, textAlign: "left" },
  timeTextSelf: { color: "rgba(255,255,255,0.6)" },
  emptyChat: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  emptyChatTitle: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text },
  emptyChatText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.sm },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: { color: COLORS.textLight, fontWeight: "800", fontSize: FONT_SIZES.sm },
});
