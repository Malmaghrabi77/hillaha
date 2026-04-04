import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDarkMode } from "../../../src/hooks/useDarkMode";
import { useSupabase } from "../../../src/hooks/useSupabase";
import { analyticsTracker } from "../../../src/utils/analyticsTracker";
import { SafeAreaDisplay } from "../../../src/components";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480",
} as const;

interface Message {
  id: string;
  message: string;
  sender_type: "customer" | "partner";
  created_at: string;
  sender_name?: string;
}

export default function PartnerChat() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState("المتجر");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<FlatList>(null);
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();

  // Fetch messages and partner info
  useEffect(() => {
    analyticsTracker.trackScreenView("partner_chat_screen");
    if (!partnerId) return;
    async function load() {
      if (!supabase) { setLoading(false); return; }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;
        if (currentUserId) setUserId(currentUserId);

        // Get partner info
        const { data: partnerData } = await supabase
          .from("partners")
          .select("id, name, phone")
          .eq("id", partnerId)
          .single();

        if (partnerData) {
          setPartnerName(partnerData.name || "المتجر");
          setPartnerPhone(partnerData.phone || "");
        }

        // Get messages — scoped to this customer
        const query = supabase
          .from("messages")
          .select("*")
          .eq("partner_id", partnerId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (currentUserId) {
          query.eq("customer_id", currentUserId);
        }

        const { data: msgData } = await query;

        if (msgData) {
          setMessages(msgData as Message[]);
        }
      } catch (e) {
        console.warn("load_partner_chat:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [partnerId, supabase]);

  // Separate useEffect for realtime — depends on userId so it's never stale in the callback
  useEffect(() => {
    if (!supabase || !partnerId || !userId) return;
    const channel = supabase
      .channel(`chat-partner-${partnerId}-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `partner_id=eq.${partnerId}`,
          },
          (payload: any) => {
            // Only show messages for this customer
            if (payload.new.customer_id && payload.new.customer_id !== userId) return;
            setMessages(prev => {
              if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
              return [...prev, payload.new as Message];
            });
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [partnerId, supabase, userId]);

  async function sendMessage() {
    if (!newMessage.trim() || !partnerId) return;

    if (!supabase) return;

    analyticsTracker.trackEvent("send_partner_message", { partnerId });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();
      await supabase.from("messages").insert({
        partner_id: partnerId,
        customer_id: user?.id,
        message: newMessage.trim(),
        sender_type: "customer",
        sender_id: user?.id,
        sender_name: profile?.full_name || "عميل",
      });
      setNewMessage("");
    } catch (e) {
      console.warn("send_partner_message:", e);
    }
  }

  return (
    <SafeAreaDisplay variant="page">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
      <View style={{
        backgroundColor: C.surface,
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        borderBottomWidth: 1, borderColor: C.border,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("chat_back");
            router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
          }}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: C.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>🏪 {partnerName}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>المتجر</Text>
        </View>
        {partnerPhone && (
          <Pressable
            onPress={() => {
              analyticsTracker.trackEvent("call_partner", { partnerId });
              try {
                require("react-native").Linking.openURL(`tel:${partnerPhone}`);
              } catch (e) {
                console.warn("call_partner:", e);
              }
            }}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: "#D1FAE5",
              justifyContent: "center", alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>📞</Text>
          </Pressable>
        )}
      </View>

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
                backgroundColor: isCustomer ? C.primary : C.surface,
                borderRadius: 16, padding: 12,
                borderWidth: isCustomer ? 0 : 1,
                borderColor: isCustomer ? "transparent" : C.border,
              }}>
                <Text style={{
                  color: isCustomer ? "white" : C.text,
                  fontSize: 14, fontWeight: "500",
                }}>
                  {item.message}
                </Text>
              </View>
              <Text style={{
                fontSize: 11, color: C.textMuted, marginTop: 4,
                alignSelf: isCustomer ? "flex-end" : "flex-start",
              }}>
                {new Date(item.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>لا توجد رسائل حتى الآن</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>ابدأ محادثة مع المتجر</Text>
          </View>
        }
        onEndReachedThreshold={0.5}
        scrollsToTop
      />

      {/* Input */}
      <View style={{
        backgroundColor: C.surface,
        borderTopWidth: 1, borderColor: C.border,
        paddingHorizontal: 12, paddingVertical: 8,
        paddingBottom: Platform.OS === "ios" ? 20 : 8,
        flexDirection: "row", alignItems: "center", gap: 8,
      }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="اكتب رسالة..."
          placeholderTextColor={C.textMuted}
          style={{
            flex: 1, backgroundColor: C.primarySoft,
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
            fontSize: 14, color: C.text, textAlign: "right",
          }}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: newMessage.trim() ? C.primary : C.primarySoft,
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
