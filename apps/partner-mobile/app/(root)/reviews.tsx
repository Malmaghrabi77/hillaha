import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "@/lib/theme";

export default function ReviewsScreen() {
  const [reviews] = useState([
    {
      id: "1",
      name: "فريد محمود",
      rating: 5,
      text: "خدمة ممتازة وسريعة جداً",
      time: "أمس",
    },
    {
      id: "2",
      name: "فاطمة علي",
      rating: 4,
      text: "طعم جيد لكن التأخير شوية",
      time: "3 أيام",
    },
    {
      id: "3",
      name: "محمود حسن",
      rating: 3,
      text: "جودة عادية",
      time: "أسبوع",
    },
  ]);

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>التقييمات</Text>
        <View style={styles.avgRating}>
          <Text style={styles.avgValue}>{avgRating}</Text>
          <Text style={styles.avgText}>/5.0</Text>
        </View>
      </View>

      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View>
              <Text style={styles.reviewerName}>{review.name}</Text>
              <Text style={styles.reviewTime}>{review.time}</Text>
            </View>
            <Text style={styles.stars}>{"⭐".repeat(review.rating)}</Text>
          </View>
          <Text style={styles.reviewText}>{review.text}</Text>
        </View>
      ))}

      <View style={styles.emptyNote}>
        <Text style={styles.emptyText}>👏 شكراً على ثقة العملاء فيك!</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
    color: COLORS.text,
  },
  avgRating: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avgValue: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
    color: COLORS.primary,
  },
  avgText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
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
  reviewerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  reviewTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  stars: {
    fontSize: FONT_SIZES.base,
  },
  reviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  emptyNote: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
