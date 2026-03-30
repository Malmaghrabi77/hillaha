import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  StatusBar, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { C, getSB } from "../lib/constants";

const PROVIDERS = [
  { value: "vodafone_cash", label: "فودافون كاش" },
  { value: "etisalat_cash", label: "اتصالات كاش" },
  { value: "orange_cash", label: "أورنج كاش" },
  { value: "we_pay", label: "WE Pay" },
  { value: "cib_smart_wallet", label: "CIB Smart Wallet" },
];

export default function BankDetailsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"bank" | "wallet">("bank");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [walletPhone, setWalletPhone] = useState("");
  const [walletProvider, setWalletProvider] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const supabase = getSB();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await (supabase as any)
        .from("driver_payment_info")
        .select("*")
        .eq("driver_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBankName(data.bank_name || "");
        setIban(data.iban || "");
        setAccountHolder(data.account_holder || "");
        setWalletPhone(data.wallet_phone || "");
        setWalletProvider(data.wallet_provider || "");

        if (data.wallet_phone) {
          setMode("wallet");
        } else if (data.iban) {
          setMode("bank");
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const supabase = getSB();

      const upsertData =
        mode === "bank"
          ? {
              driver_id: userId,
              bank_name: bankName,
              iban,
              account_holder: accountHolder,
              wallet_phone: null,
              wallet_provider: null,
            }
          : {
              driver_id: userId,
              bank_name: null,
              iban: null,
              account_holder: null,
              wallet_phone: walletPhone,
              wallet_provider: walletProvider,
            };

      const { error } = await (supabase as any)
        .from("driver_payment_info")
        .upsert(upsertData, { onConflict: "driver_id" });

      if (error) throw error;

      Alert.alert("", "تم حفظ البيانات بنجاح");
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setSaving(false);
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
          بيانات الحساب البنكي
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* MODE TOGGLE */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setMode("bank")}
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: 8, paddingVertical: 14, borderRadius: 16,
              backgroundColor: mode === "bank" ? C.primary : C.surface,
              borderWidth: mode === "bank" ? 0 : 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: 18 }}>🏦</Text>
            <Text style={{
              fontSize: 14, fontWeight: "700",
              color: mode === "bank" ? "#FFFFFF" : C.textMuted,
            }}>
              حساب بنكي
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("wallet")}
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: 8, paddingVertical: 14, borderRadius: 16,
              backgroundColor: mode === "wallet" ? C.primary : C.surface,
              borderWidth: mode === "wallet" ? 0 : 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: 18 }}>📱</Text>
            <Text style={{
              fontSize: 14, fontWeight: "700",
              color: mode === "wallet" ? "#FFFFFF" : C.textMuted,
            }}>
              محفظة إلكترونية
            </Text>
          </Pressable>
        </View>

        {/* FORM CONTAINER */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 20, padding: 16,
          borderWidth: 1, borderColor: C.border, gap: 14,
        }}>

          {mode === "bank" ? (
            <>
              {/* BANK NAME */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  اسم البنك
                </Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  style={{
                    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14,
                    paddingVertical: 12, fontSize: 14, color: C.text,
                    borderWidth: 1, borderColor: C.border, textAlign: "right",
                  }}
                />
              </View>

              {/* IBAN */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  رقم IBAN
                </Text>
                <TextInput
                  value={iban}
                  onChangeText={setIban}
                  placeholder="EG0000000000000000000000000"
                  placeholderTextColor={C.textMuted}
                  style={{
                    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14,
                    paddingVertical: 12, fontSize: 14, color: C.text,
                    borderWidth: 1, borderColor: C.border, textAlign: "right",
                  }}
                />
              </View>

              {/* ACCOUNT HOLDER */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  اسم صاحب الحساب
                </Text>
                <TextInput
                  value={accountHolder}
                  onChangeText={setAccountHolder}
                  style={{
                    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14,
                    paddingVertical: 12, fontSize: 14, color: C.text,
                    borderWidth: 1, borderColor: C.border, textAlign: "right",
                  }}
                />
              </View>
            </>
          ) : (
            <>
              {/* WALLET PROVIDER */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  مزود الخدمة
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {PROVIDERS.map((p) => {
                    const selected = walletProvider === p.value;
                    return (
                      <Pressable
                        key={p.value}
                        onPress={() => setWalletProvider(p.value)}
                        style={{
                          flexBasis: "47%", flexGrow: 1,
                          flexDirection: "row", alignItems: "center", gap: 8,
                          paddingVertical: 12, paddingHorizontal: 14,
                          borderRadius: 14, backgroundColor: C.bg,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? C.primary : C.border,
                        }}
                      >
                        <View style={{
                          width: 22, height: 22, borderRadius: 11,
                          borderWidth: 2,
                          borderColor: selected ? C.primary : C.border,
                          justifyContent: "center", alignItems: "center",
                          backgroundColor: selected ? C.primary : "transparent",
                        }}>
                          {selected && (
                            <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "900" }}>✓</Text>
                          )}
                        </View>
                        <Text style={{
                          fontSize: 13, fontWeight: "700",
                          color: selected ? C.primary : C.text,
                        }}>
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* WALLET PHONE */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                  رقم الهاتف
                </Text>
                <TextInput
                  value={walletPhone}
                  onChangeText={setWalletPhone}
                  placeholder="01XXXXXXXXX"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14,
                    paddingVertical: 12, fontSize: 14, color: C.text,
                    borderWidth: 1, borderColor: C.border, textAlign: "right",
                  }}
                />
              </View>
            </>
          )}
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: C.primary, borderRadius: 16,
            paddingVertical: 16, alignItems: "center", justifyContent: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFFFFF" }}>
              حفظ البيانات
            </Text>
          )}
        </Pressable>

        {/* INFO NOTE */}
        <Text style={{
          fontSize: 13, color: C.textMuted, textAlign: "center",
          lineHeight: 22, paddingHorizontal: 8,
        }}>
          هذه البيانات تُستخدم لتحويل أرباحك عند طلب السحب
        </Text>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
