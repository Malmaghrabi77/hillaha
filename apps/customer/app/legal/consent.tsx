import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useDarkMode } from "../../src/hooks/useDarkMode";
import { analyticsTracker } from "../../src/utils/analyticsTracker";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

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
  const { isDarkMode, colors } = useDarkMode();

  useEffect(() => {
    analyticsTracker.trackScreenView("consent_screen");
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={{
        backgroundColor: colors.surface, paddingBottom: 20,
        paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
        alignItems: "center",
      }}>
        <Image
          source={require("../../assets/hillaha-logo.png")}
          style={{ width: 60, height: 60, resizeMode: "contain", marginBottom: 10 }}
        />
        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>الشروط والأحكام</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center" }}>
          يُرجى قراءة الاتفاقية كاملةً قبل المتابعة
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {TERMS_SECTIONS.map((section, i) => (
          <View key={i} style={{
            marginBottom: 16, padding: 16, borderRadius: 16,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: colors.primary, marginBottom: 8 }}>
              {section.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 22, textAlign: "right" }}>
              {section.body}
            </Text>
          </View>
        ))}

        {/* CHECKBOX */}
        <Pressable
          onPress={() => {
            setAccepted(v => !v);
            analyticsTracker.trackEvent("toggle_consent");
          }}
          style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            padding: 16, borderRadius: 16, marginTop: 8,
            backgroundColor: accepted ? colors.primarySoft : colors.surface,
            borderWidth: 2,
            borderColor: accepted ? colors.primary : colors.border,
          }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 8,
            borderWidth: 2,
            borderColor: accepted ? colors.primary : colors.border,
            backgroundColor: accepted ? colors.primary : "transparent",
            justifyContent: "center", alignItems: "center",
          }}>
            {accepted && <Text style={{ color: "white", fontSize: 14, fontWeight: "900" }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontWeight: "700", color: colors.text, fontSize: 14, lineHeight: 22 }}>
            أقر بأنني قرأت الشروط والأحكام وأوافق على الالتزام بها
          </Text>
        </Pressable>

        <View style={{ height: 24 }} />

        {/* CONTINUE BUTTON */}
        <Pressable
          disabled={!accepted}
          onPress={() => {
            analyticsTracker.trackEvent("consent_accepted");
            router.replace("/(tabs)/home");
          }}
          style={{
            paddingVertical: 16, borderRadius: 16,
            backgroundColor: accepted ? colors.primary : colors.border,
            shadowColor: accepted ? colors.primary : "transparent",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: accepted ? 6 : 0,
          }}
        >
          <Text style={{
            color: accepted ? "white" : colors.textMuted,
            fontWeight: "900", textAlign: "center", fontSize: 16,
          }}>
            متابعة إلى التطبيق
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            analyticsTracker.trackEvent("consent_back");
            router.canGoBack() ? router.back() : router.replace("/(tabs)/home");
          }}
          style={{ marginTop: 14, alignItems: "center" }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>رجوع للصفحة السابقة</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
