import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

const soundSource = require("../../assets/sounds/new-order.wav");

interface OrderItem {
  id: string;
  customer_phone?: string;
  delivery_address?: string;
  items?: any[];
  total: number;
  status: string;
  created_at: string;
  customer_name?: string;
}

type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled" | "awaiting_payment_approval";

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [lastOrderIds, setLastOrderIds] = useState<Set<string>>(new Set());
  const player = useAudioPlayer(soundSource);
  const router = useRouter();

  const statuses: { label: string; value: string }[] = [
    { label: "جميع", value: "all" },
    { label: "معلق", value: "pending" },
    { label: "بانتظار دفع", value: "awaiting_payment_approval" },
    { label: "مقبول", value: "accepted" },
    { label: "يحضّر", value: "preparing" },
    { label: "جاهز", value: "ready" },
    { label: "تم الاستلام", value: "picked_up" },
    { label: "مسلم", value: "delivered" },
    { label: "ملغى", value: "cancelled" },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async (filterOverride?: string) => {
    const activeFilter = filterOverride !== undefined ? filterOverride : selectedFilter;
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: partnerData } = await (supabase as any)
        .from("partners")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (partnerData?.id) {
        setPartnerId(partnerData.id);

        let query = (supabase as any)
          .from("orders")
          .select("id, status, total, created_at, customer_name, customer_phone, delivery_address, delivery_type, items, notes, payment_method, payment_status")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false });

        if (activeFilter !== "all") {
          query = query.eq("status", activeFilter);
        }

        query = query.limit(100);

        const { data: ordersData } = await query;

        if (ordersData) {
          const formattedOrders = ordersData.map((order: any) => ({
            id: order.id || "",
            customer_phone: order.customer_phone || "-",
            delivery_address: order.delivery_address || "-",
            items: order.items || [],
            total: order.total || 0,
            status: order.status || "pending",
            created_at: order.created_at || "",
            customer_name: order.customer_name || "عميل",
          }));

          const currentOrderIds = new Set<string>(formattedOrders.map((o: OrderItem) => o.id));

          setLastOrderIds(currentOrderIds);
          setOrders(formattedOrders);
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Realtime subscription — only activates once partnerId is loaded
  useEffect(() => {
    if (!partnerId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`partner-orders-${partnerId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "orders", filter: `partner_id=eq.${partnerId}` },
        (payload: any) => {
          // Play sound for new pending orders
          if (payload.eventType === "INSERT" && payload.new?.status === "pending") {
            try { player.seekTo(0); player.play(); } catch {}
          }
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, selectedFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // For accepting orders, use the RPC to handle delivery type + commission
      if (newStatus === "accepted") {
        Alert.alert(
          "نوع التوصيل",
          "اختر طريقة توصيل هذا الطلب",
          [
            {
              text: "توصيل عبر حلّها",
              onPress: async () => {
                try {
                  const { error } = await (supabase as any).rpc("accept_order_with_delivery_type", {
                    p_order_id: orderId,
                    p_delivery_type: "platform",
                  });
                  if (error) {
                    Alert.alert("خطأ", error.message || "فشل في قبول الطلب");
                    loadOrders();
                    return;
                  }
                  Alert.alert("تم", "تم قبول الطلب — التوصيل عبر حلّها");
                  loadOrders();
                } catch {
                  Alert.alert("خطأ", "فشل قبول الطلب");
                }
              },
            },
            {
              text: "توصيل ذاتي",
              onPress: async () => {
                try {
                  const { error } = await (supabase as any).rpc("accept_order_with_delivery_type", {
                    p_order_id: orderId,
                    p_delivery_type: "self",
                  });
                  if (error) {
                    Alert.alert("خطأ", error.message || "فشل في قبول الطلب");
                    loadOrders();
                    return;
                  }
                  Alert.alert("تم", "تم قبول الطلب — توصيل ذاتي");
                  loadOrders();
                } catch {
                  Alert.alert("خطأ", "فشل قبول الطلب");
                }
              },
            },
            { text: "إلغاء", style: "cancel" },
          ]
        );
        return;
      }

      // For other statuses, include timestamps
      const timestampField: Record<string, string> = {
        preparing: "preparing_at",
        ready: "ready_at",
        picked_up: "picked_up_at",
        delivered: "delivered_at",
        cancelled: "cancelled_at",
      };

      const updateData: Record<string, any> = { status: newStatus };
      if (timestampField[newStatus]) {
        updateData[timestampField[newStatus]] = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .eq("partner_id", partnerId);

      if (error) {
        Alert.alert("خطأ", "فشل تحديث حالة الطلب");
        return;
      }

      Alert.alert("تم", "تم تحديث حالة الطلب");
      loadOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث الطلب");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return COLORS.warning;
      case "awaiting_payment_approval":
        return "#F59E0B";
      case "accepted":
        return COLORS.primary;
      case "preparing":
        return COLORS.primary;
      case "ready":
        return COLORS.success;
      case "picked_up":
        return "#059669";
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
      case "awaiting_payment_approval":
        return "بانتظار الدفع";
      case "accepted":
        return "مقبول";
      case "preparing":
        return "قيد التحضير";
      case "ready":
        return "جاهز";
      case "picked_up":
        return "تم الاستلام بواسطة المندوب";
      case "delivered":
        return "تم التسليم";
      case "cancelled":
        return "ملغى";
      default:
        return status;
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<string, string | null> = {
      pending: "accepted",
      awaiting_payment_approval: null, // Admin must approve payment first
      accepted: "preparing",
      preparing: "ready",
      ready: "picked_up",
      picked_up: "delivered",
      delivered: null,
      cancelled: null,
    };
    return statusFlow[currentStatus] as OrderStatus | null;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterTabs}
      >
        {statuses.map((status) => (
          <TouchableOpacity
            key={status.value}
            style={[
              styles.filterTab,
              selectedFilter === status.value && styles.filterTabActive,
            ]}
            onPress={() => {
              setSelectedFilter(status.value);
              loadOrders(status.value);
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === status.value && styles.filterTabTextActive,
              ]}
            >
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={orders}
        renderItem={({ item: order }) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
                <Text style={styles.orderTime}>{formatTime(order.created_at)}</Text>
              </View>
              <View
                style={[
                  styles.statusBadgeLarge,
                  { backgroundColor: getStatusColor(order.status) },
                ]}
              >
                <Text style={styles.statusTextLarge}>
                  {getStatusLabel(order.status)}
                </Text>
              </View>
            </View>

            <View style={styles.orderSection}>
              <Text style={styles.sectionLabel}>👤 العميل</Text>
              <Text style={styles.customerName}>{order.customer_name}</Text>
              <Text style={styles.customerPhone}>{order.customer_phone}</Text>
            </View>

            <View style={styles.orderSection}>
              <Text style={styles.sectionLabel}>📍 العنوان</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {order.delivery_address}
              </Text>
            </View>

            {order.items && order.items.length > 0 && (
              <View style={styles.orderSection}>
                <Text style={styles.sectionLabel}>🛒 الأصناف</Text>
                {order.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name || "صنف"}</Text>
                    <Text style={styles.itemQty}>×{item.qty || item.quantity || 1}</Text>
                    <Text style={styles.itemPrice}>
                      {(item.price || 0).toFixed(0)} ج.م
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الإجمالي:</Text>
              <Text style={styles.totalAmount}>{order.total.toFixed(0)} ج.م</Text>
            </View>

            <View style={styles.orderActions}>
              {getNextStatus(order.status as OrderStatus) && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => {
                    const next = getNextStatus(order.status as OrderStatus);
                    if (next) {
                      Alert.alert(
                        "تأكيد",
                        `هل تريد تغيير الحالة إلى ${getStatusLabel(next)}؟`,
                        [
                          { text: "إلغاء", style: "cancel" },
                          {
                            text: "تأكيد",
                            onPress: () => updateOrderStatus(order.id, next),
                          },
                        ]
                      );
                    }
                  }}
                >
                  <Text style={styles.actionBtnText}>
                    {getStatusLabel(getNextStatus(order.status as OrderStatus) || order.status)}
                  </Text>
                </TouchableOpacity>
              )}

              {!["delivered", "picked_up", "cancelled"].includes(order.status) && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => {
                    Alert.alert("تأكيد", "هل تريد إلغاء هذا الطلب؟", [
                      { text: "لا", style: "cancel" },
                      {
                        text: "نعم، إلغاء",
                        style: "destructive",
                        onPress: () => updateOrderStatus(order.id, "cancelled"),
                      },
                    ]);
                  }}
                >
                  <Text style={styles.actionBtnTextDanger}>إلغاء</Text>
                </TouchableOpacity>
              )}

              {/* Chat with customer */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary }]}
                onPress={() => router.push(`/chat/${order.id}` as any)}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>💬 محادثة</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>لا توجد طلبات</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadOrders} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterTabs: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: COLORS.surface,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  orderId: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
  },
  orderTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  statusBadgeLarge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  statusTextLarge: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  orderSection: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  customerName: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    fontWeight: "600",
  },
  customerPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  addressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  itemName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  itemQty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  itemPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  totalLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  orderActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionBtnDanger: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  actionBtnTextDanger: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
  },
});
