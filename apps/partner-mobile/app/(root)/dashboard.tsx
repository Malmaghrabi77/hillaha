import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { getSupabase } from "@hillaha/core";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface Order {
  id: string;
  customer_name?: string;
  total: number;
  status: string;
  created_at: string;
}

interface Stats {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  rating: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    ordersToday: 0,
    revenueToday: 0,
    pendingOrders: 0,
    rating: 4.5,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return;
      }

      // Get current user
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return;
      }

      // Get partner info
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, rating, review_count")
        .eq("user_id", user.user.id)
        .single();

      if (partnerData) {
        // Get today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: ordersData, count: totalCount } = await supabase
          .from("orders")
          .select("*", { count: "exact" })
          .eq("partner_id", partnerData.id)
          .gte("created_at", today.toISOString())
          .order("created_at", { ascending: false })
          .limit(5);

        // Calculate stats
        let revenueToday = 0;
        let pendingCount = 0;
        const completedOrders: Order[] = [];

        if (ordersData) {
          ordersData.forEach((order: any) => {
            revenueToday += order.total || 0;
            if (order.status === "pending") pendingCount++;
            completedOrders.push({
              id: order.id || "",
              customer_name: order.customer_name || "عميل",
              total: order.total || 0,
              status: order.status || "pending",
              created_at: order.created_at || "",
            });
          });
        }

        setStats({
          ordersToday: totalCount || 0,
          revenueToday,
          pendingOrders: pendingCount,
          rating: partnerData.rating || 4.5,
        });

        setRecentOrders(completedOrders);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return COLORS.warning;
      case "accepted":
        return COLORS.primary;
      case "preparing":
        return COLORS.primary;
      case "ready":
        return COLORS.success;
      case "delivered":
        return COLORS.success;
      case "cancelled":
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "معلق";
      case "accepted":
        return "مقبول";
      case "preparing":
        return "قيد التحضير";
      case "ready":
        return "جاهز";
      case "delivered":
        return "تم التسليم";
      case "cancelled":
        return "ملغى";
      default:
        return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `${diffMins} دقيقة`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ساعة`;
    return `${Math.floor(diffMins / 1440)} يوم`;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>مرحباً 👋</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString("ar-EG")}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCard1]}>
          <Text style={styles.statLabel}>📊 اليوم</Text>
          <Text style={styles.statValue}>{stats.ordersToday}</Text>
          <Text style={styles.statUnit}>طلب</Text>
        </View>

        <View style={[styles.statCard, styles.statCard2]}>
          <Text style={styles.statLabel}>💰 الإيرادات</Text>
          <Text style={styles.statValue}>{stats.revenueToday.toFixed(0)}</Text>
          <Text style={styles.statUnit}>ج.م</Text>
        </View>

        <View style={[styles.statCard, styles.statCard3]}>
          <Text style={styles.statLabel}>⏳ معلق</Text>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statUnit}>طلب</Text>
        </View>

        <View style={[styles.statCard, styles.statCard4]}>
          <Text style={styles.statLabel}>⭐ التقييم</Text>
          <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
          <Text style={styles.statUnit}>/5.0</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(root)/orders")}>
          <Text style={styles.actionButtonEmoji}>📦</Text>
          <Text style={styles.actionButtonText}>جميع الطلبات</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(root)/menu")}>
          <Text style={styles.actionButtonEmoji}>🍽️</Text>
          <Text style={styles.actionButtonText}>القائمة</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(root)/finance")}>
          <Text style={styles.actionButtonEmoji}>💰</Text>
          <Text style={styles.actionButtonText}>المالية</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>طلبات حديثة</Text>
          {recentOrders.length > 0 && (
            <TouchableOpacity onPress={() => router.push("/(root)/orders")}>
              <Text style={styles.viewAllLink}>عرض الجميع →</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>لا توجد طلبات حتى الآن</Text>
          </View>
        ) : (
          <View>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/(root)/orders`)}
              >
                <View style={styles.orderLeft}>
                  <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                  <Text style={styles.orderTime}>{formatTime(order.created_at)}</Text>
                </View>

                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{order.total.toFixed(0)} ج.م</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "bold",
    color: COLORS.text,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    width: "48%",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
  },
  statCard1: { backgroundColor: COLORS.primarySoft },
  statCard2: { backgroundColor: "#D1FAE5" },
  statCard3: { backgroundColor: "#FEF3C7" },
  statCard4: { backgroundColor: "#DBEAFE" },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statUnit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonEmoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  viewAllLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
  },
  orderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderLeft: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  orderTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  orderRight: {
    alignItems: "flex-end",
  },
  orderAmount: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.surface,
    fontWeight: "600",
  },
});
