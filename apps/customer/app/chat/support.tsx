import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { useSupabase } from "../../src/hooks/useSupabase";
import { analyticsTracker } from "../../src/utils/analyticsTracker";
import { A11yPresets } from "../../src/hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../../src/constants/analyticsEvents";
import { AppHeader, SafeAreaDisplay } from '../../src/components';

interface Message {
  id: string;
  message: string;
  sender_type: "customer" | "support";
  created_at: string;
  sender_name?: string;
}

export default function SupportChat() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [supportTicketId, setSupportTicketId] = useState<string | null>(null);
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.CHAT_SUPPORT);
  }, []);

  // Fetch or create support ticket and messages
  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Get or create support ticket
        let ticketId: string;

        const { data: existingTicket } = await supabase
          .from("support_tickets")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingTicket) {
          ticketId = existingTicket.id;
        } else {
          const { data: newTicket } = await supabase
            .from("support_tickets")
            .insert({
              user_id: user.id,
              status: "open",
            })
            .select("id")
            .single();
          ticketId = newTicket?.id || "";
        }

        setSupportTicketId(ticketId);

        // Get messages
        if (ticketId) {
          const { data: msgData } = await supabase
            .from("support_messages")
            .select("*")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });

          if (msgData) {
            setMessages(msgData as Message[]);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!supportTicketId) return;

    if (supabase) {
      const channel = supabase
        .channel(`support-${supportTicketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `ticket_id=eq.${supportTicketId}`,
          },
          (payload: any) => {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [supportTicketId]);

  async function sendMessage() {
    if (!newMessage.trim() || !supportTicketId) return;

    if (!supabase) return;

    try {
      analyticsTracker.trackEvent(ANALYTICS_EVENTS.CHAT.MESSAGE_SENT, {
        ticket_id: supportTicketId,
        message_length: newMessage.length,
      });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("support_messages").insert({
        ticket_id: supportTicketId,
        message: newMessage.trim(),
        sender_type: "customer",
        sender_id: user?.id,
      });
      setNewMessage("");
    } catch {
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaDisplay variant="page">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <AppHeader
          title="فريق الدعم"
          subtitle="الدعم الفني"
          icon="🎧"
          trackingScreen="chat_support"
        />

        {/* Messages */}
      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const isCustomer = item.sender_type === "customer";
          return (
            <View style={{
              alignSelf: isCustomer ? "flex-end" : "flex-start",
              maxWidth: "80%",
            }}>
              <View style={{
                backgroundColor: isCustomer ? colors.primary : colors.surface,
                borderRadius: 16, padding: 12,
                borderWidth: isCustomer ? 0 : 1,
                borderColor: isCustomer ? "transparent" : colors.border,
              }}>
                {!isCustomer && item.sender_name && (
                  <Text style={{
                    fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 4,
                  }}>
                    {item.sender_name}
                  </Text>
                )}
                <Text style={{
                  color: isCustomer ? "white" : colors.text,
                  fontSize: 14, fontWeight: "500",
                }}>
                  {item.message}
                </Text>
              </View>
              <Text style={{
                fontSize: 11, color: colors.textMuted, marginTop: 4,
                alignSelf: isCustomer ? "flex-end" : "flex-start",
              }}>
                {new Date(item.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎧</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>لا توجد رسائل حتى الآن</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>تحدث مع فريق الدعم الفني</Text>
          </View>
        }
        onEndReachedThreshold={0.5}
        scrollsToTop
      />

      {/* Input */}
      <View style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, paddingVertical: 8,
        paddingBottom: Platform.OS === "ios" ? 20 : 8,
        flexDirection: "row", alignItems: "center", gap: 8,
      }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="اكتب رسالة للدعم..."
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1, backgroundColor: colors.primarySoft,
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
            fontSize: 14, color: colors.text, textAlign: "right",
          }}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={sendMessage}
          disabled={!newMessage.trim()}
          {...A11yPresets.button()}
          accessibilityLabel="إرسال الرسالة"
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: newMessage.trim() ? colors.primary : colors.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>📤</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaDisplay>
  );
}
