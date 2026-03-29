import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { C, getSB } from "../lib/constants";

/* ── types ─────────────────────────────────────────────────────────── */

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
}

/* ── withdrawal methods ────────────────────────────────────────────── */

const METHODS = [
  { value: "instapay", label: "إنستاباي", icon: "🏦", detail: "تحويل بنكي" },
  { value: "vodafone_cash", label: "فودافون كاش", icon: "📱", detail: "محفظة إلكترونية" },
  { value: "etisalat_cash", label: "اتصالات كاش", icon: "📱", detail: "محفظة إلكترونية" },
  { value: "orange_cash", label: "أورنج كاش", icon: "📱", detail: "محفظة إلكترونية" },
  { value: "we_pay", label: "WE Pay", icon: "📱", detail: "محفظة إلكترونية" },
  { value: "cib_smart_wallet", label: "CIB Smart Wallet", icon: "💳", detail: "محفظة بنكية" },
];

const QUICK_AMOUNTS = [50, 100, 200, 500];

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "قيد المراجعة", bg: C.warningSoft, fg: "#92400E" },
  approved: { label: "تمت الموافقة", bg: "#DBEAFE", fg: "#1E40AF" },
  completed: { label: "تم التحويل", bg: C.successSoft, fg: "#065F46" },
  rejected: { label: "مرفوض", bg: C.dangerSoft, fg: "#991B1B" },
};

function methodLabel(value: string): string {
  return METHODS.find((m) => m.value === value)?.label ?? value;
}

/* ── component ─────────────────────────────────────────────────────── */

export default function WithdrawScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [accountDetails, setAccountDetails] = useState<{
    phone?: string;
    iban?: string;
    holder?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [savedInfo, setSavedInfo] = useState<any>(null);

  /* ── data fetching ─────────────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSB();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // balance
      const { data: balData } = await (supabase as any).rpc(
        "get_driver_wallet_balance",
      );
      if (balData !== null && balData !== undefined) setBalance(Number(balData));

      // saved payment info
      const { data: info } = await (supabase as any)
        .from("driver_payment_info")
        .select("*")
        .eq("driver_id", user.id)
        .single();
      if (info) setSavedInfo(info);

      // recent withdrawal requests
      const { data: wds } = await (supabase as any)
        .from("driver_withdrawal_requests")
        .select("id, amount, method, status, created_at, rejection_reason")
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (wds) setWithdrawals(wds);
    } catch (_) {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* pre-fill account details when method or savedInfo changes */
  useEffect(() => {
    if (!savedInfo || !method) return;
    if (savedInfo.method === method) {
      if (method === "instapay") {
        setAccountDetails({
          iban: savedInfo.iban ?? "",
          holder: savedInfo.holder ?? "",
        });
      } else {
        setAccountDetails({ phone: savedInfo.phone ?? "" });
      }
    }
  }, [method, savedInfo]);

  /* ── submit ────────────────────────────────────────────────────── */

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      Alert.alert("خطأ", "الحد الأدنى للسحب 50 جنيه");
      return;
    }
    if (numAmount > balance) {
      Alert.alert("خطأ", "المبلغ أكبر من الرصيد المتاح");
      return;
    }

    let details: any;
    if (method === "instapay") {
      details = { iban: accountDetails.iban, holder: accountDetails.holder };
    } else {
      details = { phone: accountDetails.phone };
    }

    try {
      setSubmitting(true);
      const supabase = getSB();
      const { error } = await (supabase as any).rpc(
        "request_driver_withdrawal",
        {
          p_amount: numAmount,
          p_method: method,
          p_account_details: details,
        },
      );

      if (error) {
        Alert.alert("خطأ", error.message || "حدث خطأ أثناء تقديم الطلب");
        return;
      }

      Alert.alert("تم", "تم تقديم طلب السحب بنجاح وسيتم مراجعته قريباً");
      setStep(1);
      setMethod("");
      setAmount("");
      setAccountDetails({});
      loadData();
    } catch (_) {
      Alert.alert("خطأ", "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── helpers ────────────────────────────────────────────────────── */

  const isMobileWallet = method !== "instapay";

  const canGoStep2 = method !== "";
  const canGoStep3 =
    amount !== "" &&
    parseFloat(amount) >= 50 &&
    (method === "instapay"
      ? !!(accountDetails.iban && accountDetails.holder)
      : !!accountDetails.phone);

  /* ── render ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingTop: 50,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: C.primarySoft,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, color: C.primary }}>→</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "900",
            color: C.text,
            textAlign: "center",
          }}
        >
          طلب سحب
        </Text>
        {/* balance chip */}
        <View
          style={{
            backgroundColor: C.successSoft,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#065F46" }}>
            {balance.toFixed(2)} جنيه
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
        {/* ── STEP 1 — choose method ────────────────────────────── */}
        {step === 1 && (
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>
              اختر طريقة السحب
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {METHODS.map((m) => {
                const selected = method === m.value;
                return (
                  <Pressable
                    key={m.value}
                    onPress={() => setMethod(m.value)}
                    style={{
                      width: "48%",
                      backgroundColor: C.surface,
                      borderRadius: 16,
                      padding: 16,
                      alignItems: "center",
                      gap: 6,
                      borderWidth: 2,
                      borderColor: selected ? C.primary : C.border,
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{m.icon}</Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: C.text,
                        textAlign: "center",
                      }}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        textAlign: "center",
                      }}
                    >
                      {m.detail}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* next button */}
            <Pressable
              disabled={!canGoStep2}
              onPress={() => setStep(2)}
              style={{
                backgroundColor: canGoStep2 ? C.primary : C.border,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFF" }}>
                التالي
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── STEP 2 — amount & details ─────────────────────────── */}
        {step === 2 && (
          <View style={{ gap: 14 }}>
            {/* balance display */}
            <View
              style={{
                backgroundColor: C.primarySoft,
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.primary }}>
                الرصيد المتاح: {balance.toFixed(2)} جنيه
              </Text>
            </View>

            {/* amount input */}
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
              مبلغ السحب
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="أدخل المبلغ"
              placeholderTextColor={C.textMuted}
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                fontSize: 16,
                fontWeight: "700",
                color: C.text,
                textAlign: "right",
              }}
            />

            {/* quick amount buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {QUICK_AMOUNTS.map((qa) => (
                <Pressable
                  key={qa}
                  onPress={() => setAmount(String(qa))}
                  style={{
                    flex: 1,
                    backgroundColor: amount === String(qa) ? C.primary : C.surface,
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: amount === String(qa) ? "#FFF" : C.text,
                    }}
                  >
                    {qa}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setAmount(String(balance))}
                style={{
                  flex: 1,
                  backgroundColor: amount === String(balance) ? C.primary : C.surface,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: amount === String(balance) ? "#FFF" : C.text,
                  }}
                >
                  الكل
                </Text>
              </Pressable>
            </View>

            {/* account details */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: C.text,
                marginTop: 4,
              }}
            >
              بيانات الحساب
            </Text>

            {method === "instapay" ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={accountDetails.iban ?? ""}
                  onChangeText={(t) =>
                    setAccountDetails((p) => ({ ...p, iban: t }))
                  }
                  placeholder="EG0000000000000000000000000"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 14,
                    fontSize: 14,
                    color: C.text,
                    textAlign: "right",
                  }}
                />
                <TextInput
                  value={accountDetails.holder ?? ""}
                  onChangeText={(t) =>
                    setAccountDetails((p) => ({ ...p, holder: t }))
                  }
                  placeholder="اسم صاحب الحساب"
                  placeholderTextColor={C.textMuted}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 14,
                    fontSize: 14,
                    color: C.text,
                    textAlign: "right",
                  }}
                />
              </View>
            ) : (
              <TextInput
                value={accountDetails.phone ?? ""}
                onChangeText={(t) =>
                  setAccountDetails((p) => ({ ...p, phone: t }))
                }
                keyboardType="phone-pad"
                placeholder="01XXXXXXXXX"
                placeholderTextColor={C.textMuted}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 14,
                  fontSize: 14,
                  color: C.text,
                  textAlign: "right",
                }}
              />
            )}

            {/* next button */}
            <Pressable
              disabled={!canGoStep3}
              onPress={() => setStep(3)}
              style={{
                backgroundColor: canGoStep3 ? C.primary : C.border,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFF" }}>
                التالي
              </Text>
            </Pressable>

            {/* back link */}
            <Pressable onPress={() => setStep(1)} style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: "600" }}>
                رجوع
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── STEP 3 — confirm ──────────────────────────────────── */}
        {step === 3 && (
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>
              تأكيد طلب السحب
            </Text>

            {/* summary card */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.border,
                padding: 18,
                gap: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  {methodLabel(method)}
                </Text>
                <Text style={{ fontSize: 13, color: C.textMuted }}>طريقة السحب</Text>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: C.border,
                }}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  {amount} جنيه
                </Text>
                <Text style={{ fontSize: 13, color: C.textMuted }}>المبلغ</Text>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: C.border,
                }}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: C.text,
                    flex: 1,
                  }}
                >
                  {method === "instapay"
                    ? accountDetails.iban
                    : accountDetails.phone}
                </Text>
                <Text style={{ fontSize: 13, color: C.textMuted }}>
                  تفاصيل الحساب
                </Text>
              </View>
            </View>

            {/* warning */}
            <View
              style={{
                backgroundColor: C.warningSoft,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#92400E",
                  lineHeight: 22,
                  textAlign: "right",
                }}
              >
                سيتم خصم المبلغ من محفظتك فوراً وسيتم تحويله خلال 24-48 ساعة عمل
              </Text>
            </View>

            {/* confirm button */}
            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={{
                backgroundColor: C.success,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFF" }}>
                  تأكيد السحب
                </Text>
              )}
            </Pressable>

            {/* back link */}
            <Pressable onPress={() => setStep(2)} style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: "600" }}>
                رجوع
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── WITHDRAWAL HISTORY ────────────────────────────────── */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>
            طلبات سحب سابقة
          </Text>

          {withdrawals.length === 0 ? (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                padding: 24,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: C.textMuted }}>
                لا توجد طلبات سحب سابقة
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.border,
                overflow: "hidden",
              }}
            >
              {withdrawals.map((w, i) => {
                const st = STATUS_MAP[w.status] ?? STATUS_MAP.pending;
                return (
                  <View
                    key={w.id}
                    style={{
                      padding: 14,
                      gap: 8,
                      borderBottomWidth: i < withdrawals.length - 1 ? 1 : 0,
                      borderBottomColor: C.border,
                    }}
                  >
                    {/* top row */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: st.bg,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: st.fg,
                          }}
                        >
                          {st.label}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                          {w.amount} جنيه
                        </Text>
                        <Text style={{ fontSize: 13, color: C.textMuted }}>
                          {methodLabel(w.method)}
                        </Text>
                      </View>
                    </View>

                    {/* rejection reason */}
                    {w.status === "rejected" && w.rejection_reason && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.danger,
                          textAlign: "right",
                          lineHeight: 20,
                        }}
                      >
                        السبب: {w.rejection_reason}
                      </Text>
                    )}

                    {/* date */}
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        textAlign: "right",
                      }}
                    >
                      {new Date(w.created_at).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
