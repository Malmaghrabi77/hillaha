import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert } from "react-native";
import { useDarkMode } from "../src/hooks/useDarkMode";
import { useSupabase } from "../src/hooks/useSupabase";
import { analyticsTracker } from "../src/utils/analyticsTracker";
import { A11yPresets } from "../src/hooks/useAccessibility";
import { ANALYTICS_EVENTS } from "../src/constants/analyticsEvents";
import { SafeAreaScrollView } from "../src/components";

const C = {
  primary: "#8B5CF6",   primarySoft: "#EDE9FE",
  pink: "#EC4899",       pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",         surface: "#FFFFFF",
  border: "#E7E3FF",     text: "#1F1B2E",
  textMuted: "#6B6480",  success: "#34D399",
  warning: "#F59E0B",    danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

interface Transaction {
  amount: number;
  type: string;
  description: string;
  date: string;
  credit: boolean;
}

export default function Wallet() {
  const [balance, setBalance]       = useState(0);
  const [history, setHistory]       = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [code, setCode]             = useState("");
  const [redeeming, setRedeeming]   = useState(false);
  const supabase = useSupabase();

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) { setLoading(false); return; }

      // Fetch balance
      const { data: bal } = await supabase.rpc("get_wallet_balance", { p_customer_id: userId });
      if (bal !== null && bal !== undefined) setBalance(Number(bal));

      // Fetch history
      const { data: rows } = await supabase
        .from("wallet_transactions")
        .select("amount, type, description, created_at")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (rows) {
        setHistory(rows.map((r: any) => {
          const d = new Date(r.created_at);
          return {
            amount: r.amount,
            type: r.type,
            description: r.description ?? "معاملة",
            date: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
            credit: r.amount > 0,
          };
        }));
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    analyticsTracker.trackScreenView(ANALYTICS_EVENTS.SCREEN.WALLET);
    fetchData();
  }, [fetchData]);

  // ── Redeem code ─────────────────────────────────────────────
  async function handleRedeem() {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!supabase) return Alert.alert("خطأ", "تأكد من اتصالك بالإنترنت");

    setRedeeming(true);
    analyticsTracker.trackEvent(ANALYTICS_EVENTS.WALLET.CODE_SUBMITTED);

    try {
      const { data: result, error: rpcError } = await supabase.rpc("redeem_wallet_code", { p_code: trimmed });

      if (rpcError) throw rpcError;

      if (result?.success) {
        analyticsTracker.trackEvent(ANALYTICS_EVENTS.WALLET.CODE_REDEEMED, { amount: result.amount });
        Alert.alert("تم الشحن بنجاح!", `تمت إضافة ${result.amount} جنيه لمحفظتك`);
        setCode("");
        setLoading(true);
        fetchData();
      } else {
        analyticsTracker.trackEvent(ANALYTICS_EVENTS.WALLET.CODE_FAILED);
        Alert.alert("خطأ", result?.error ?? "كود غير صحيح");
      }
    } catch (e: any) {
      analyticsTracker.trackEvent(ANALYTICS_EVENTS.WALLET.CODE_FAILED);
      Alert.alert("خطأ", e?.message ?? "حدث خطأ — حاول مرة أخرى");
    } finally {
      setRedeeming(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <SafeAreaScrollView variant="page">
      {/* ── HERO BALANCE CARD ──────────────────────────────── */}
      <View style={{
        margin: 16, borderRadius: 28, overflow: "hidden",
        shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
      }}>
        <View style={{ padding: 26, backgroundColor: "#4C1D95" }}>
          {/* Deco circles */}
          <View style={{
            position: "absolute", top: -50, left: -50,
            width: 180, height: 180, borderRadius: 90,
            backgroundColor: "rgba(255,255,255,0.05)",
          }} />
          <View style={{
            position: "absolute", bottom: -30, right: -30,
            width: 140, height: 140, borderRadius: 70,
            backgroundColor: "#EC4899", opacity: 0.25,
          }} />

          {/* Logo */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <Image
              source={require("../assets/hillaha-logo.png")}
              style={{ width: 44, height: 44, resizeMode: "contain", tintColor: "white" }}
            />
            <View style={{
              paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
            }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>
                👛 المحفظة
              </Text>
            </View>
          </View>

          {/* Balance */}
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "700" }}>
            رصيدك الحالي
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 }}>
            <Text style={{ color: "white", fontSize: 56, fontWeight: "900", lineHeight: 62 }}>
              {balance.toFixed(2)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
              جنيه
            </Text>
          </View>

          {/* Info badges */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <View style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
            }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700" }}>
                💳 يمكنك الدفع من المحفظة عند الطلب
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── REDEEM CODE SECTION ────────────────────────────── */}
      <View style={{
        marginHorizontal: 16, marginBottom: 20, borderRadius: 20, padding: 18,
        backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.primary,
        shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 22 }}>🎫</Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>شحن المحفظة بكود</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="أدخل كود الشحن"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            style={{
              flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
              paddingHorizontal: 14, paddingVertical: 12,
              backgroundColor: C.bg, fontSize: 15, fontWeight: "700",
              color: C.text, textAlign: "center", letterSpacing: 2,
            }}
          />
          <Pressable
            onPress={handleRedeem}
            disabled={redeeming || !code.trim()}
            {...A11yPresets.pressable}
            style={{
              paddingHorizontal: 22, borderRadius: 14,
              backgroundColor: redeeming || !code.trim() ? C.primarySoft : C.primary,
              justifyContent: "center", alignItems: "center",
              shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            {redeeming
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>شحن</Text>
            }
          </Pressable>
        </View>

        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 10, textAlign: "center" }}>
          أدخل الكود الذي حصلت عليه لشحن محفظتك
        </Text>
      </View>

      {/* ── TRANSACTION HISTORY ─────────────────────────────── */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, marginBottom: 12 }}>
          سجل المعاملات
        </Text>

        {history.length === 0 ? (
          <View style={{
            padding: 40, borderRadius: 20, alignItems: "center",
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👛</Text>
            <Text style={{ fontWeight: "900", color: C.text, fontSize: 16, marginBottom: 6 }}>
              لا توجد معاملات بعد
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              قم بشحن محفظتك بكود لبدء استخدامها
            </Text>
          </View>
        ) : (
          history.map((h, i) => (
            <View key={i} style={{
              flexDirection: "row", alignItems: "center",
              padding: 14, borderRadius: 16, marginBottom: 8,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12, marginLeft: 12,
                backgroundColor: h.credit ? "#D1FAE5" : "#FEE2E2",
                justifyContent: "center", alignItems: "center",
              }}>
                <Text style={{ fontSize: 18 }}>
                  {h.type === "topup" ? "💰" : h.type === "refund" ? "↩️" : "🛒"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{h.description}</Text>
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>{h.date}</Text>
              </View>
              <Text style={{
                fontWeight: "900", fontSize: 16,
                color: h.credit ? "#059669" : "#EF4444",
              }}>
                {h.credit ? "+" : ""}{h.amount.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </SafeAreaScrollView>
  );
}
