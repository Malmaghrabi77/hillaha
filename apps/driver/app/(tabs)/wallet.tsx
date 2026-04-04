import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { C, getSB } from "../../lib/constants";

interface Transaction {
  id: string;
  amount: number;
  type: "topup" | "payout" | "bonus" | "deduction";
  description: string | null;
  created_at: string;
}

const TYPE_META: Record<
  Transaction["type"],
  { emoji: string; bg: string; positive: boolean }
> = {
  topup: { emoji: "\u{1F4B0}", bg: C.successSoft, positive: true },
  payout: { emoji: "\u{1F4B8}", bg: C.warningSoft, positive: false },
  bonus: { emoji: "\u{1F381}", bg: C.primarySoft, positive: true },
  deduction: { emoji: "\u{1F4C9}", bg: C.dangerSoft, positive: false },
};

export default function WalletTab() {
  const router = useRouter();
  const codeInputRef = useRef<ScrollView>(null);

  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [pending2FA, setPending2FA] = useState<{
    code_id: string;
    amount: number;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const supabase = getSB();
      if (!supabase) { setLoading(false); return; }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: bal } = await (supabase as any).rpc(
        "get_driver_wallet_balance",
        { p_driver_id: user.id }
      );
      setBalance(bal ?? 0);

      const { data: txns } = await (supabase as any)
        .from("driver_wallet_transactions")
        .select("*")
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setHistory(txns ?? []);
    } catch (e) {
      console.warn("driver_wallet_fetchData:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (lockoutUntil && new Date() < lockoutUntil) {
      const mins = Math.ceil(
        (lockoutUntil.getTime() - Date.now()) / 60000
      );
      Alert.alert(
        "\u{26D4} محظور مؤقتاً",
        `حاول مرة أخرى بعد ${mins} دقيقة`
      );
      return;
    }

    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("\u{26A0}", "أدخل كود الشحن");
      return;
    }

    setRedeeming(true);
    try {
      const supabase = getSB();
      if (!supabase) { Alert.alert("خطأ", "تأكد من اتصالك بالإنترنت"); return; }
      const { data: result, error } = await (supabase as any).rpc(
        "redeem_driver_wallet_code",
        {
          p_code: trimmed.toUpperCase(),
          p_ip_hint: null,
          p_region: null,
        }
      );

      if (error) {
        Alert.alert("\u{274C} خطأ", error.message || "حدث خطأ");
        setRedeeming(false);
        return;
      }

      if (result.locked) {
        setLockoutUntil(
          new Date(Date.now() + result.retry_after_minutes * 60000)
        );
        Alert.alert(
          "\u{26D4} محظور مؤقتاً",
          `حاول مرة أخرى بعد ${result.retry_after_minutes} دقيقة`
        );
      } else if (result.requires_2fa) {
        setPending2FA({ code_id: result.code_id, amount: result.amount });
        setShow2FA(true);
      } else if (result.success) {
        Alert.alert(
          "\u{2705} تم!",
          `تم شحن ${result.amount} جنيه`
        );
        setCode("");
        fetchData();
      } else {
        Alert.alert("\u{274C} خطأ", result.error || "حدث خطأ غير متوقع");
      }
    } catch (e) {
      console.warn("driver_wallet_redeem:", e);
      Alert.alert("\u{274C} خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setRedeeming(false);
    }
  }

  async function handleConfirm2FA() {
    if (!pending2FA) return;
    setConfirming(true);
    try {
      const supabase = getSB();
      if (!supabase) { Alert.alert("خطأ", "تأكد من اتصالك بالإنترنت"); return; }
      const { data: result, error } = await (supabase as any).rpc(
        "confirm_driver_wallet_redemption",
        {
          p_code_id: pending2FA.code_id,
          p_verification_code: verificationCode,
          p_ip_hint: null,
        }
      );

      if (error) {
        Alert.alert("\u{274C} خطأ", error.message || "حدث خطأ");
        return;
      }

      if (result.success) {
        setShow2FA(false);
        setPending2FA(null);
        setVerificationCode("");
        setCode("");
        Alert.alert(
          "\u{2705} تم!",
          `تم شحن ${result.amount ?? pending2FA.amount} جنيه`
        );
        fetchData();
      } else {
        Alert.alert("\u{274C} خطأ", result.error || "كود التأكيد غير صحيح");
      }
    } catch (e) {
      console.warn("driver_wallet_confirm2FA:", e);
      Alert.alert("\u{274C} خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setConfirming(false);
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "\u0645" : "\u0635";
    const h12 = hours % 12 || 12;
    const timeStr = `${h12}:${mins} ${ampm}`;

    if (isToday) return `اليوم ${timeStr}`;
    if (isYesterday) return `أمس ${timeStr}`;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${timeStr}`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      <ScrollView
        ref={codeInputRef}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ==================== HERO BALANCE CARD ==================== */}
        <View
          style={{
            backgroundColor: "#4C1D95",
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            padding: 28,
            paddingTop: 56,
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "rgba(139,92,246,0.25)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -20,
              left: -20,
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: "rgba(109,40,217,0.3)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 40,
              left: 60,
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: "rgba(167,139,250,0.15)",
            }}
          />

          <Text
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 8,
            }}
          >
            رصيد المحفظة
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: "900",
                color: "#FFFFFF",
              }}
            >
              {balance.toFixed(2)}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              جنيه
            </Text>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => router.push("/withdraw" as any)}
              style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#4C1D95",
                }}
              >
                طلب سحب
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                codeInputRef.current?.scrollTo({ y: 340, animated: true })
              }
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#FFFFFF",
                }}
              >
                شحن
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ==================== CODE REDEMPTION ==================== */}
        <View
          style={{
            backgroundColor: C.surface,
            marginHorizontal: 16,
            marginTop: 20,
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "900",
              color: C.text,
              marginBottom: 14,
            }}
          >
            شحن المحفظة بالكود
          </Text>

          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="HL-D-000-XXXX"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            style={{
              backgroundColor: C.bg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontWeight: "700",
              color: C.text,
              textAlign: "center",
              letterSpacing: 1,
            }}
          />

          {lockoutUntil && new Date() < lockoutUntil && (
            <Text
              style={{
                fontSize: 12,
                color: C.danger,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              محظور مؤقتاً - حاول بعد{" "}
              {Math.ceil(
                (lockoutUntil.getTime() - Date.now()) / 60000
              )}{" "}
              دقيقة
            </Text>
          )}

          <Pressable
            onPress={handleRedeem}
            disabled={redeeming}
            style={{
              backgroundColor: C.primary,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 14,
              opacity: redeeming ? 0.6 : 1,
            }}
          >
            {redeeming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF" }}
              >
                شحن الكود
              </Text>
            )}
          </Pressable>
        </View>

        {/* ==================== TRANSACTION HISTORY ==================== */}
        <View
          style={{
            backgroundColor: C.surface,
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "900",
              color: C.text,
              marginBottom: 14,
            }}
          >
            سجل المعاملات
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : history.length === 0 ? (
            <Text
              style={{
                textAlign: "center",
                color: C.textMuted,
                fontSize: 13,
                paddingVertical: 24,
              }}
            >
              لا توجد معاملات بعد
            </Text>
          ) : (
            history.map((txn, i) => {
              const meta = TYPE_META[txn.type] ?? TYPE_META.topup;
              const isPositive = meta.positive;

              return (
                <View
                  key={txn.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: i < history.length - 1 ? 1 : 0,
                    borderBottomColor: C.border,
                    gap: 12,
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: meta.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                  </View>

                  {/* Description + date */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: C.text,
                      }}
                      numberOfLines={1}
                    >
                      {txn.description || txn.type}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        marginTop: 3,
                      }}
                    >
                      {formatDate(txn.created_at)}
                    </Text>
                  </View>

                  {/* Amount */}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "900",
                      color: isPositive ? C.success : C.danger,
                    }}
                  >
                    {isPositive ? "+" : "-"}
                    {Math.abs(txn.amount).toFixed(2)} جنيه
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ==================== 2FA MODAL ==================== */}
      <Modal
        visible={show2FA}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShow2FA(false);
          setPending2FA(null);
          setVerificationCode("");
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 22,
              padding: 28,
              width: "100%",
              maxWidth: 360,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: C.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              تأكيد الشحن
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: C.textMuted,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              كود بمبلغ {pending2FA?.amount ?? 0} جنيه يتطلب تأكيد
            </Text>

            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="أدخل كود التأكيد المكون من 6 أرقام"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              maxLength={6}
              style={{
                backgroundColor: C.bg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 22,
                fontWeight: "800",
                color: C.text,
                textAlign: "center",
                letterSpacing: 8,
              }}
            />

            <Pressable
              onPress={handleConfirm2FA}
              disabled={confirming || verificationCode.length < 6}
              style={{
                backgroundColor: C.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 18,
                opacity:
                  confirming || verificationCode.length < 6 ? 0.5 : 1,
              }}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: "#FFFFFF",
                  }}
                >
                  تأكيد
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setShow2FA(false);
                setPending2FA(null);
                setVerificationCode("");
              }}
              style={{
                paddingVertical: 12,
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: C.textMuted,
                }}
              >
                إلغاء
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
