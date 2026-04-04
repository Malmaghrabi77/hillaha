import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { getSupabase } from "@/lib/supabase";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: partner } = await (supabase as any)
        .from("partners")
        .select("id, rating")
        .eq("user_id", user.user.id)
        .single();

      if (!partner) return;

      setAvgRating(partner.rating || 0);

      const { data } = await (supabase as any)
        .from("reviews")
        .select("id, rating, comment, created_at, customer:customers(name)")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setReviews(
          data.map((r: any) => ({
            id: r.id,
            customer_name: r.customer?.name || "عميل",
            rating: r.rating || 0,
            comment: r.comment || "",
            created_at: r.created_at,
          }))
        );
      }
    } catch (e) {
      console.error("Error loading reviews:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} يوم`;
    return `${Math.floor(days / 30)} شهر`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReviews(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>التقييمات</Text>
        <View style={styles.avgRatingBox}>
          <Text style={styles.avgValue}>{avgRating.toFixed(1)}</Text>
          <Text style={styles.avgText}>/5.0</Text>
        </View>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>⭐</Text>
          <Text style={styles.emptyText}>لا توجد تقييمات حتى الآن</Text>
          <Text style={styles.emptySubtext}>ستظهر تقييمات العملاء هنا</Text>
        </View>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.reviewerName}>{review.customer_name}</Text>
                <Text style={styles.reviewTime}>منذ {formatDate(review.created_at)}</Text>
              </View>
              <Text style={styles.stars}>{"⭐".repeat(review.rating)}</Text>
            </View>
            {review.comment ? (
              <Text style={styles.reviewText}>{review.comment}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: { fontSize: FONT_SIZES["2xl"], fontWeight: "700", color: COLORS.text },
  avgRatingBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avgValue: { fontSize: FONT_SIZES["2xl"], fontWeight: "700", color: COLORS.primary },
  avgText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  emptyState: { alignItems: "center", paddingVertical: SPACING.xl * 2 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: "600", color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.sm },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  reviewerName: { fontSize: FONT_SIZES.base, fontWeight: "600", color: COLORS.text },
  reviewTime: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  stars: { fontSize: FONT_SIZES.sm },
  reviewText: { fontSize: FONT_SIZES.sm, color: COLORS.text, lineHeight: 20 },
});
