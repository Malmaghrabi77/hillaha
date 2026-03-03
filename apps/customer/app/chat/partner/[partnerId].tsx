import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, FlatList,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480",
} as const;

function getSB() {
  try { return (require("@hillaha/core") as any).getSupabase?.() ?? null; } catch { return null; }
}

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
  const scrollRef = useRef<FlatList>(null);

  // Fetch messages and partner info
  useEffect(() => {
    if (!partnerId) return;
    async function load() {
      const supabase = getSB();
      if (!supabase) { setLoading(false); return; }

      try {
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

        // Get messages
        const { data: msgData } = await supabase
          .from("messages")
          .select("*")
          .eq("partner_id", partnerId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (msgData) {
          setMessages(msgData as Message[]);
        }
      } catch (error) {
        console.log("Error loading chat:", error);
      } finally {
        setLoading(false);
      }
    }

    load();

    // Subscribe to new messages
    const supabase = getSB();
    if (supabase) {
      const channel = supabase
        .channel(`chat-partner-${partnerId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `partner_id=eq.${partnerId}`,
          },
          (payload: any) => {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [partnerId]);

  async function sendMessage() {
    if (!newMessage.trim() || !partnerId) return;

    const supabase = getSB();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("messages").insert({
        partner_id: partnerId,
        message: newMessage.trim(),
        sender_type: "customer",
        sender_id: user?.id,
      });
      setNewMessage("");
    } catch (error) {
      console.log("Error sending message:", error);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        backgroundColor: C.surface,
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 16,
        borderBottomWidth: 1, borderColor: C.border,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Pressable
          onPress={() => router.back()}
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
              try {
                require("react-native").Linking.openURL(`tel:${partnerPhone}`);
              } catch (e) {}
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
  );
}
