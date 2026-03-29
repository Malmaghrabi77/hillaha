import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable,
  StatusBar, Linking,
} from "react-native";
import { router } from "expo-router";
import { C } from "../lib/constants";

interface FaqItem {
  question: string;
  answer: string;
}

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
    answer: "بعد تفعيل حسابك، اضغط على زر 'متصل' في الشاشة الرئيسية وستظهر لك الطلبات المتاحة في منطقتك.",
  },
  {
    question: "ماذا أفعل إذا رفض العميل الاستلام؟",
    answer: "تواصل مع الدعم الفني عبر واتساب أو اتصل بنا. لا تترك الطلب بدون تسليم.",
  },
  {
    question: "كيف أحدّث بيانات حسابي؟",
    answer: "يمكنك تعديل بياناتك من صفحة 'حسابي' في التطبيق.",
  },
];

const CONTACT_METHODS = [
  {
    emoji: "💬",
    label: "واتساب",
    url: "https://wa.me/201000000000",
  },
  {
    emoji: "📧",
    label: "البريد الإلكتروني",
    url: "mailto:support@hillaha.com",
  },
  {
    emoji: "📞",
    label: "اتصل بنا",
    url: "tel:+201000000000",
  },
];

export default function SupportScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16,
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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: C.text, textAlign: "center" }}>
          الدعم الفني
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* CONTACT METHODS */}
        <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 4 }}>
          تواصل معنا
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {CONTACT_METHODS.map((method, i) => (
            <Pressable
              key={i}
              onPress={() => Linking.openURL(method.url)}
              style={{
                flex: 1, backgroundColor: C.surface, borderRadius: 16,
                padding: 16, alignItems: "center", gap: 8,
                borderWidth: 1, borderColor: C.border,
              }}
            >
              <Text style={{ fontSize: 28 }}>{method.emoji}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.text, textAlign: "center" }}>
                {method.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* FAQ SECTION */}
        <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginTop: 8, marginBottom: 4 }}>
          الأسئلة الشائعة
        </Text>
        <View style={{
          backgroundColor: C.surface, borderRadius: 18,
          borderWidth: 1, borderColor: C.border, overflow: "hidden",
        }}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <Pressable
                key={i}
                onPress={() => setOpenFaq(isOpen ? null : i)}
                style={{
                  padding: 16,
                  borderBottomWidth: i < FAQ_ITEMS.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: C.primarySoft,
                    justifyContent: "center", alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 14, color: C.primary, fontWeight: "900" }}>
                      {isOpen ? "−" : "+"}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.text }}>
                    {item.question}
                  </Text>
                </View>
                {isOpen && (
                  <Text style={{
                    fontSize: 13, color: C.textMuted, lineHeight: 22,
                    marginTop: 10, paddingRight: 38,
                  }}>
                    {item.answer}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
