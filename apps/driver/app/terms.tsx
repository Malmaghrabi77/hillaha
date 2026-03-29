import React from "react";
import {
  View, Text, ScrollView, Pressable,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { C } from "../lib/constants";

interface Section {
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    title: "مقدمة",
    body: "باستخدامك لتطبيق حلّها كمندوب توصيل، فإنك توافق على الالتزام بالشروط والأحكام التالية. يُرجى قراءتها بعناية.",
  },
  {
    title: "التزامات المندوب",
    body: "يلتزم المندوب بتوصيل الطلبات في الوقت المحدد وبحالة جيدة. يجب الحفاظ على المظهر اللائق والتعامل المحترم مع العملاء والشركاء. يُحظر فتح أو العبث بمحتويات الطلبات.",
  },
  {
    title: "المركبات والوثائق",
    body: "يجب أن تكون رخصة المركبة سارية المفعول. يتحمل المندوب مسؤولية صيانة مركبته وتأمينها. يجب تحديث الوثائق فور تجديدها.",
  },
  {
    title: "العمولات والمدفوعات",
    body: "يحصل المندوب على أجر التوصيل المحدد لكل طلب. يتم احتساب المسافة والوقت في تحديد أجر التوصيل. يمكن سحب الأرباح عبر المحافظ الإلكترونية المتاحة.",
  },
  {
    title: "الحساب والخصوصية",
    body: "يلتزم المندوب بعدم مشاركة حسابه مع أي شخص آخر. يتم جمع بيانات الموقع أثناء التوصيل فقط لغرض تتبع الطلب. نحتفظ بالحق في تعليق أو إلغاء الحساب في حالة مخالفة الشروط.",
  },
  {
    title: "إنهاء الخدمة",
    body: "يمكن للمندوب إيقاف حسابه في أي وقت. تحتفظ حلّها بالحق في إنهاء التعاقد في حالة المخالفات الجسيمة. الأرباح المستحقة يتم تحويلها خلال 30 يوم عمل من إنهاء الخدمة.",
  },
];

export default function TermsScreen() {
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
          الشروط والأحكام
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {SECTIONS.map((section, i) => (
          <View
            key={i}
            style={{
              backgroundColor: C.surface, borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: C.border,
            }}
          >
            <Text style={{
              fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 8,
            }}>
              {section.title}
            </Text>
            <Text style={{
              fontSize: 14, lineHeight: 24, color: C.textMuted,
            }}>
              {section.body}
            </Text>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
