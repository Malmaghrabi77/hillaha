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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabase } from "@/lib/supabase";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "@/lib/theme";

interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_name: string;
  created_at: string;
}

export default function OrderChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{ id: string; name: string; userId: string } | null>(null);
  const [customerName, setCustomerName] = useState("العميل");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadPartnerAndMessages();
  }, []);

  useEffect(() => {
    if (!partnerInfo) return;
    const supabase = getSupabase();
    if (!supabase || !orderId) return;

    const channel = supabase
      .channel(`chat-order-${orderId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
        (payload: any) => {
          if (payload.new && (payload.new.order_id === orderId || payload.new.partner_id === partnerInfo?.id)) {
            const msg: Message = {
              id: payload.new.id,
              message: payload.new.message,
              sender_type: payload.new.sender_type,
              sender_name: payload.new.sender_name,
              created_at: payload.new.created_at,
            };
            setMessages((prev) => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerInfo, orderId]);

  const loadPartnerAndMessages = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase || !orderId) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: partner } = await (supabase as any)
        .from("partners")
        .select("id, name")
        .eq("user_id", user.user.id)
        .single();

      if (partner) {
        setPartnerInfo({ ...partner, userId: user.user.id });

        // Get order customer name — verify ownership
        const { data: order } = await (supabase as any)
          .from("orders")
          .select("customer_name")
          .eq("id", orderId)
          .eq("partner_id", partner.id)
          .single();
        if (order?.customer_name) setCustomerName(order.customer_name);

        // Load messages — check both by order_id and partner_id for this order
        const { data: msgs } = await (supabase as any)
          .from("messages")
          .select("id, message, sender_type, sender_name, created_at")
          .or(`order_id.eq.${orderId},and(partner_id.eq.${partner.id},order_id.is.null)`)
          .order("created_at", { ascending: true });

        if (msgs) setMessages(msgs);
      }
    } catch (e) {
      console.error("Error loading chat:", e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !partnerInfo || sending) return;
    setSending(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      await (supabase as any).from("messages").insert({
        order_id: orderId,
        partner_id: partnerInfo.id,
        message: newMessage.trim(),
        sender_type: "partner",
        sender_id: partnerInfo.userId,
        sender_name: partnerInfo.name,
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isSelf = item.sender_type === "partner";
    return (
      <View style={[styles.bubbleRow, isSelf ? styles.bubbleRowSelf : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
          {!isSelf && <Text style={styles.senderName}>{item.sender_name}</Text>}
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
          <Text style={styles.headerTitle}>{customerName}</Text>
          <Text style={styles.headerSub}>طلب #{(orderId || "").slice(0, 8)}</Text>
        </View>
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
            <Text style={styles.emptyChatText}>ابدأ المحادثة مع العميل</Text>
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
          maxLength={500}
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
  emptyChatText: { fontSize: FONT_SIZES.base, color: COLORS.textMuted },
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
