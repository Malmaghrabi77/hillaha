import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, Image, StatusBar } from "react-native";
import { router } from "expo-router";
import { HALHA_THEME } from "@halha/ui";

const C = HALHA_THEME.colors;

const TERMS_SECTIONS = [
  {
    title: "1. قبول الشروط",
    body: "بتسجيلك في منصة حلّها، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام التطبيق.",
  },
  {
    title: "2. مسؤوليات المستخدم",
    body: "• تقديم بيانات صحيحة ودقيقة عند التسجيل.\n• الحفاظ على سرية بيانات حسابك وكلمة المرور.\n• عدم استخدام المنصة لأغراض مخالفة للقانون.\n• الالتزام بقوانين جمهورية مصر العربية والمملكة العربية السعودية.",
  },
  {
    title: "3. الخدمات والطلبات",
    body: "• تُعدّ الطلبات المؤكدة ملزمة ولا يمكن إلغاؤها بعد قبول الشريك لها.\n• تحتسب رسوم التوصيل وفق المنطقة الجغرافية وسياسات الشريك.\n• تلتزم حلّها بمراقبة جودة الشركاء باستمرار وإيقاف أي شريك لا يستوفي معايير الجودة المطلوبة.",
  },
  {
    title: "4. ضمان رضا العميل",
    body: "تلتزم منصة حلّها بما يلي:\n• إذا وصل طلبك ناقصاً أو تالفاً أو مختلفاً عما طلبته — نُعيد طلبك أو نُعيد إليك المبلغ كاملاً خلال 24 ساعة.\n• في حال تأخر التوصيل عن الوقت المحدد بأكثر من 30 دقيقة — تحصل على خصم تلقائي على طلبك القادم.\n• خدمة دعم العملاء متاحة على مدار الساعة للنظر في أي شكوى أو مشكلة.",
  },
  {
    title: "5. البيانات والخصوصية",
    body: "• يُعدّ موقعك الجغرافي بيانات ضرورية لتشغيل خدمة التوصيل.\n• لا تُباع بياناتك الشخصية لأطراف ثالثة.\n• البيانات الطبية (روشتات - مواعيد) تُعامَل بسرية تامة وفق سياسة الخصوصية الطبية.",
  },
  {
    title: "6. العمولات والمدفوعات",
    body: "• تخضع المدفوعات لسياسات المنصة المعلنة.\n• طرق الدفع المقبولة: كاش، InstaPay، Vodafone Cash، والبطاقات البنكية (مرحلة قادمة).",
  },
  {
    title: "7. تعديل الشروط",
    body: "تحتفظ منصة حلّها بحق تعديل هذه الشروط في أي وقت، مع إخطار المستخدمين بالتغييرات الجوهرية عبر التطبيق. الإصدار الحالي: 1.0.0 — فبراير 2026.",
  },
];

export default function ConsentScreen() {
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* HEADER */}
      <View style={{
        backgroundColor: C.surface, paddingTop: 52, paddingBottom: 20,
        paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border,
        alignItems: "center",
      }}>
        <Image
          source={require("../../assets/halha-logo.png")}
          style={{ width: 60, height: 60, resizeMode: "contain", marginBottom: 10 }}
        />
        <Text style={{ fontSize: 20, fontWeight: "900", color: C.text }}>الشروط والأحكام</Text>
        <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: "center" }}>
          يُرجى قراءة الاتفاقية كاملةً قبل المتابعة
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {TERMS_SECTIONS.map((section, i) => (
          <View key={i} style={{
            marginBottom: 16, padding: 16, borderRadius: 16,
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: C.primary, marginBottom: 8 }}>
              {section.title}
            </Text>
            <Text style={{ fontSize: 13, color: C.text, lineHeight: 22, textAlign: "right" }}>
              {section.body}
            </Text>
          </View>
        ))}

        {/* CHECKBOX */}
        <Pressable
          onPress={() => setAccepted(v => !v)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            padding: 16, borderRadius: 16, marginTop: 8,
            backgroundColor: accepted ? C.primarySoft : C.surface,
            borderWidth: 2,
            borderColor: accepted ? C.primary : C.border,
          }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 8,
            borderWidth: 2,
            borderColor: accepted ? C.primary : C.border,
            backgroundColor: accepted ? C.primary : "transparent",
            justifyContent: "center", alignItems: "center",
          }}>
            {accepted && <Text style={{ color: "white", fontSize: 14, fontWeight: "900" }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontWeight: "700", color: C.text, fontSize: 14, lineHeight: 22 }}>
            أقر بأنني قرأت الشروط والأحكام وأوافق على الالتزام بها
          </Text>
        </Pressable>

        <View style={{ height: 24 }} />

        {/* CONTINUE BUTTON */}
        <Pressable
          disabled={!accepted}
          onPress={() => router.replace("/(tabs)/home")}
          style={{
            paddingVertical: 16, borderRadius: 16,
            backgroundColor: accepted ? C.primary : C.border,
            shadowColor: accepted ? C.primary : "transparent",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: accepted ? 6 : 0,
          }}
        >
          <Text style={{
            color: accepted ? "white" : C.textMuted,
            fontWeight: "900", textAlign: "center", fontSize: 16,
          }}>
            متابعة إلى التطبيق
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: C.textMuted, fontSize: 13 }}>رجوع للصفحة السابقة</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}
