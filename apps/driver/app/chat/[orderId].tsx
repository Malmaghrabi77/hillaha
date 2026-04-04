import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, getSB } from "../../lib/constants";

interface Message {
  id: string;
  message: string;
  sender_type: "customer" | "driver";
  created_at: string;
  sender_name?: string;
}

export default function CustomerChat() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("العميل");
  const [customerPhone, setCustomerPhone] = useState("");
  const scrollRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!orderId) return;
    const supabase = getSB();
    if (!supabase) { setLoading(false); return; }

    async function load() {
      try {
        const { data: orderData } = await (supabase as any)
          .from("orders")
          .select("customer_phone, profiles!orders_customer_id_fkey(full_name, phone)")
          .eq("id", orderId)
          .single();

        if (orderData) {
          const customer = (orderData as any).profiles;
          setCustomerName(customer?.full_name || "العميل");
          setCustomerPhone(orderData.customer_phone || customer?.phone || "");
        }

        const { data: msgData } = await (supabase as any)
          .from("messages")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (msgData) setMessages(msgData as Message[]);
      } catch (error) {
        console.warn("load_driver_chat:", error);
      } finally {
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`chat-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          setMessages(prev => {
            if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  async function sendMessage() {
    if (!newMessage.trim() || !orderId) return;
    const supabase = getSB();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("messages").insert({
        order_id: orderId,
        message: newMessage.trim(),
        sender_type: "driver",
        sender_id: user?.id,
      });
      setNewMessage("");
    } catch (error) {
      console.warn("send_driver_message:", error);
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
      {/* HEADER */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingTop: Platform.OS === "android" ? 18 : 54,
        paddingHorizontal: 16, paddingBottom: 14,
        backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: C.primarySoft,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, color: C.primary }}>→</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>{customerName}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>العميل</Text>
        </View>
        {customerPhone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${customerPhone}`)}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: "#D1FAE5",
              justifyContent: "center", alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>📞</Text>
          </Pressable>
        ) : null}
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => {
          const isDriver = item.sender_type === "driver";
          return (
            <View style={{
              alignSelf: isDriver ? "flex-end" : "flex-start",
              maxWidth: "80%",
            }}>
              <View style={{
                backgroundColor: isDriver ? C.primary : C.surface,
                borderRadius: 16, padding: 12,
                borderWidth: isDriver ? 0 : 1,
                borderColor: isDriver ? "transparent" : C.border,
              }}>
                <Text style={{
                  color: isDriver ? "white" : C.text,
                  fontSize: 14, fontWeight: "500",
                }}>
                  {item.message}
                </Text>
              </View>
              <Text style={{
                fontSize: 11, color: C.textMuted, marginTop: 4,
                alignSelf: isDriver ? "flex-end" : "flex-start",
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
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>ابدأ محادثة مع العميل</Text>
          </View>
        }
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      />

      {/* INPUT BAR */}
      <View style={{
        backgroundColor: C.surface,
        borderTopWidth: 1, borderColor: C.border,
        paddingHorizontal: 12, paddingVertical: 8,
        paddingBottom: Math.max(insets.bottom, 12),
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
