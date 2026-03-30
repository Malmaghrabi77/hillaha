import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Linking, StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, getSB } from "../lib/constants";

const PHONE_NUMBER = "+201153624184";

interface FaqItem { question: string; answer: string; }

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "كيف أسحب أرباحي؟",
    answer: "يمكنك سحب أرباحك من صفحة المحفظة عبر إنستاباي أو فودافون كاش أو أي محفظة إلكترونية في مصر. الحد الأدنى للسحب 50 جنيه.",
  },
  {
    question: "متى يتم تحويل المبالغ؟",
    answer: "يتم مراجعة طلبات السحب خلال 24-48 ساعة عمل. بعد الموافقة يتم التحويل فوراً.",
  },
  {
    question: "كيف أقبل الطلبات؟",
    answer: "بعد تفعيل حسابك، ستظهر لك الطلبات المتاحة في منطقتك في تبويب 'الطلبات'.",
  },
  {
    question: "ماذا أفعل إذا رفض العميل الاستلام؟",
    answer: "تواصل معنا عبر المحادثة أو اتصل بنا. لا تترك الطلب بدون تسليم.",
  },
  {
    question: "كيف أحدّث بيانات حسابي؟",
    answer: "يمكنك تعديل بياناتك من صفحة 'حسابي' في التطبيق.",
  },
];

interface Message {
  id: string;
  message: string;
  sender_type: "driver" | "support";
  created_at: string;
  sender_name?: string;
}

export default function SupportScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scrollRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Load or create support ticket + messages
  useEffect(() => {
    async function load() {
      const supabase = getSB();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Get or create open support ticket
        let tid: string;
        const { data: existing } = await (supabase as any)
          .from("support_tickets")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existing) {
          tid = existing.id;
        } else {
          const { data: newTicket } = await (supabase as any)
            .from("support_tickets")
            .insert({ user_id: user.id, status: "open" })
            .select("id")
            .single();
          tid = newTicket?.id || "";
        }

        setTicketId(tid);

        if (tid) {
          const { data: msgData } = await (supabase as any)
            .from("support_messages")
            .select("*")
            .eq("ticket_id", tid)
            .order("created_at", { ascending: true });
          if (msgData) setMessages(msgData as Message[]);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!ticketId) return;
    const supabase = getSB();

    const channel = supabase
      .channel(`support-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new as Message]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  async function sendMessage() {
    if (!newMessage.trim() || !ticketId) return;
    const supabase = getSB();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("support_messages").insert({
        ticket_id: ticketId,
        message: newMessage.trim(),
        sender_type: "driver",
        sender_id: user?.id,
      });
      setNewMessage("");
    } catch (error) {
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
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>الدعم الفني</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>فريق هيلاها</Text>
        </View>
        <Pressable
          onPress={() => Linking.openURL(`tel:${PHONE_NUMBER}`)}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: "#D1FAE5",
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>📞</Text>
        </Pressable>
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
                {!isDriver && item.sender_name && (
                  <Text style={{
                    fontSize: 12, fontWeight: "700", color: C.primary, marginBottom: 4,
                  }}>
                    {item.sender_name}
                  </Text>
                )}
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
        ListHeaderComponent={
          messages.length === 0 ? (
            <View style={{ alignItems: "center", marginVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎧</Text>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>مرحباً بك في الدعم الفني</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
                اكتب رسالتك وسنرد عليك في أقرب وقت
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            {/* Phone contact card */}
            <Pressable
              onPress={() => Linking.openURL(`tel:${PHONE_NUMBER}`)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: C.surface, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: C.border, marginBottom: 12,
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: "#D1FAE5",
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 18 }}>📞</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>اتصل بنا</Text>
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{PHONE_NUMBER}</Text>
              </View>
            </Pressable>

            {/* FAQ toggle */}
            <Pressable
              onPress={() => setShowFaq(!showFaq)}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                backgroundColor: C.surface, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: C.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>
                الأسئلة الشائعة
              </Text>
              <Text style={{ fontSize: 16, color: C.primary }}>{showFaq ? "▲" : "▼"}</Text>
            </Pressable>

            {showFaq && (
              <View style={{
                backgroundColor: C.surface, borderRadius: 14, marginTop: 8,
                borderWidth: 1, borderColor: C.border, overflow: "hidden",
              }}>
                {FAQ_ITEMS.map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => setOpenFaq(isOpen ? null : i)}
                      style={{
                        padding: 14,
                        borderBottomWidth: i < FAQ_ITEMS.length - 1 ? 1 : 0,
                        borderBottomColor: C.border,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{
                          width: 26, height: 26, borderRadius: 7,
                          backgroundColor: C.primarySoft,
                          justifyContent: "center", alignItems: "center",
                        }}>
                          <Text style={{ fontSize: 13, color: C.primary, fontWeight: "900" }}>
                            {isOpen ? "−" : "+"}
                          </Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: C.text }}>
                          {item.question}
                        </Text>
                      </View>
                      {isOpen && (
                        <Text style={{
                          fontSize: 12, color: C.textMuted, lineHeight: 20,
                          marginTop: 8, paddingRight: 36,
                        }}>
                          {item.answer}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ height: 16 }} />
          </View>
        }
        onContentSizeChange={() => {
          if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: false });
        }}
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
          placeholder="اكتب رسالة للدعم..."
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
