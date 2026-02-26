import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { getSupabase } from "@hillaha/core";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface FinanceStats {
  totalSales: number;
  commission: number;
  netProfit: number;
  orders: number;
  commissionRate: string; // e.g., "10%" or "8%" or "10%/8%"
}

export default function FinanceScreen() {
 const [stats, setStats] = useState<FinanceStats>({
    totalSales: 0,
    commission: 0,
    netProfit: 0,
    orders: 0,
    commissionRate: "10%",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const calculateCommission = (
    ordersPastWeek: number,
    totalSalesWeek: number,
    ordersFromMonthStart: number
  ): { amount: number; rate: string } => {
    // نموذج العمولة الجديد:
    // 10% للـ 1000 طلب الأول من الشهر
    // 8% لباقي الطلبات حتى نهاية الشهر

    if (ordersFromMonthStart <= 1000) {
      // جميع الطلبات في الـ 1000 الأول - تطبيق 10%
      return {
        amount: totalSalesWeek * 0.1,
        rate: "10%",
      };
    } else {
      // حساب كم عدد الطلبات من هذا الأسبوع في الـ 1000 الأولى
      const ordersInThreshold = 1000 - (ordersFromMonthStart - ordersPastWeek);
      let commission = 0;
      let rate = "8%";

      if (ordersInThreshold > 0) {
        // جزء من الطلبات بـ 10% وجزء بـ 8%
        const tenPercentSales = (ordersInThreshold / ordersPastWeek) * totalSalesWeek;
        commission += tenPercentSales * 0.1;

        // الجزء المتبقي بـ 8%
        const eightPercentSales = totalSalesWeek - tenPercentSales;
        commission += eightPercentSales * 0.08;

        rate = "10%/8%"; // mixed rate
      } else {
        // جميع الطلبات بـ 8%
        commission = totalSalesWeek * 0.08;
      }

      return {
        amount: commission,
        rate,
      };
    }
  };

  const loadFinanceData = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: partnerData } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (partnerData?.id) {
        // جلب طلبات هذا الأسبوع
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);

        const { data: ordersWeek } = await supabase
          .from("orders")
          .select("*")
          .eq("partner_id", partnerData.id)
          .eq("status", "delivered")
          .gte("created_at", thisWeek.toISOString());

        // جلب طلبات الشهر الحالي من اليوم الأول
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { data: ordersMonth } = await supabase
          .from("orders")
          .select("*")
          .eq("partner_id", partnerData.id)
          .eq("status", "delivered")
          .gte("created_at", monthStart.toISOString());

        let totalSalesWeek = 0;
        if (ordersWeek) {
          ordersWeek.forEach((order: any) => {
            totalSalesWeek += order.total || 0;
          });
        }

        const ordersCountWeek = ordersWeek?.length || 0;
        const ordersCountMonth = ordersMonth?.length || 0;

        const commissionResult = calculateCommission(
          ordersCountWeek,
          totalSalesWeek,
          ordersCountMonth
        );

        const netProfit = totalSalesWeek - commissionResult.amount;

        setStats({
          totalSales: totalSalesWeek,
          commission: commissionResult.amount,
          netProfit,
          orders: ordersCountWeek,
          commissionRate: commissionResult.rate,
        });
      }
    } catch (error) {
      console.error("Error loading finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>المالية - هذا الأسبوع</Text>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>إجمالي المبيعات</Text>
        <Text style={styles.statValue}>{stats.totalSales.toFixed(0)}</Text>
        <Text style={styles.statUnit}>ج.م</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>العمولة ({stats.commissionRate})</Text>
        <Text style={styles.statValue} style={{color: COLORS.danger}}>
          -{stats.commission.toFixed(0)}
        </Text>
        <Text style={styles.statUnit}>ج.م</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>صافي الربح</Text>
        <Text style={styles.statValue} style={{color: COLORS.success}}>
          {stats.netProfit.toFixed(0)}
        </Text>
        <Text style={styles.statUnit}>ج.م</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>عدد الطلبات</Text>
        <Text style={styles.statValue}>{stats.orders}</Text>
        <Text style={styles.statUnit}>طلب</Text>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          💡 التسويات تتم كل يوم سبت. يمكنك مراجعة تفاصيل الحساب في قسم المزيد.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "700",
    color: COLORS.primary,
  },
  statUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  note: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  noteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    lineHeight: 20,
  },
});
