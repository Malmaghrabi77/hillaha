import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDarkMode } from "../../../src/hooks/useDarkMode";
import { useSupabase } from "../../../src/hooks/useSupabase";
import { analyticsTracker } from "../../../src/utils/analyticsTracker";
import { A11yPresets } from "../../../src/hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../../../src/constants/analyticsEvents";
import { AppHeader, SafeAreaDisplay } from '../../../src/components';

interface Message {
  id: string;
  message: string;
  sender_type: "customer" | "driver";
  created_at: string;
  sender_name?: string;
}

export default function DriverChat() {
  const { isDarkMode, colors } = useDarkMode();
  const supabase = useSupabase();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState("المندوب");
  const [driverPhone, setDriverPhone] = useState("");
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.CHAT_DRIVER);
  }, [orderId]);

  // Fetch messages and driver info
  useEffect(() => {
    if (!orderId) return;
    async function load() {
      if (!supabase) { setLoading(false); return; }

      try {
        // Get order and driver info
        const { data: orderData } = await supabase
          .from("orders")
          .select(`
            driver_id, driver_name, driver_phone,
            profiles!orders_driver_id_fkey(full_name, phone)
          `)
          .eq("id", orderId)
          .single();

        if (orderData) {
          const driver = (orderData as any).profiles;
          setDriverName(driver?.full_name || orderData.driver_name || "المندوب");
          setDriverPhone(driver?.phone || orderData.driver_phone || "");
        }

        // Get messages
        const { data: msgData } = await supabase
          .from("messages")
          .select("*")
          .eq("order_id", orderId)
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
    if (supabase) {
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
            setMessages(prev => [...prev, payload.new as Message]);
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [orderId]);

  async function sendMessage() {
    if (!newMessage.trim() || !orderId) return;

    if (!supabase) return;

    try {
      analyticsTracker.trackEvent(ANALYTICS_EVENTS.CHAT.MESSAGE_SENT, {
        chat_type: 'driver',
        order_id: orderId,
        message_length: newMessage.length,
      });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("messages").insert({
        order_id: orderId,
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
        title={driverName}
        subtitle="المندوب"
        icon="💬"
        trackingScreen="chat_driver"
        rightContent={
          driverPhone && (
            <Pressable
              onPress={() => {
                analyticsTracker.trackEvent(ANALYTICS_EVENTS.CHAT.CALL_INITIATED, {
                  driver_phone: driverPhone,
                });
                try {
                  require("react-native").Linking.openURL(`tel:${driverPhone}`);
                } catch (e) {}
              }}
              {...A11yPresets.button()}
              accessibilityLabel={`اتصل بـ ${driverName}`}
              style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: "#D1FAE5",
                justifyContent: "center", alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18 }}>📞</Text>
            </Pressable>
          )
        }
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
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>لا توجد رسائل حتى الآن</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>ابدأ محادثة مع المندوب</Text>
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
          placeholder="اكتب رسالة..."
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
