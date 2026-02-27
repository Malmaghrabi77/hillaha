"use client";

import React, { useState, useEffect } from "react";
import { getSupabase } from "@hillaha/core";
import { Button, Card, Badge, Modal, Input, Spinner } from "../../components/ui";
import { theme } from "../../styles/theme";

interface Review {
  id: string;
  customer_id: string;
  rating: number;
  title?: string;
  comment: string;
  response?: string;
  responded_at?: string;
  created_at: string;
  customer_name?: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplyModal, setShowReplyModal] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { data, error: err } = await (supabase
        .from("reviews") as any)
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false });

      if (err) throw err;

      // Transform data
      const transformed = (data || []).map((review: any) => ({
        ...review,
        customer_name: review.profiles?.full_name || "عميل مجهول",
      }));

      setReviews(transformed);
      setError(null);
    } catch (err: any) {
      setError(err.message || "فشل تحميل التقييمات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyToReview = async () => {
    if (!replyingToId || !replyText.trim()) {
      setError("الرجاء إدخال الرد");
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { error: err } = await (supabase
        .from("reviews") as any)
        .update({
          response: replyText,
          responded_at: new Date().toISOString(),
        })
        .eq("id", replyingToId);

      if (err) throw err;

      setShowReplyModal(false);
      setReplyingToId(null);
      setReplyText("");
      await loadReviews();
    } catch (err: any) {
      setError(err.message || "فشل إرسال الرد");
      console.error(err);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} style={{ color: i < rating ? theme.colors.warning : theme.colors.border }}>
        ★
      </span>
    ));
  };

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

  return (
    <div style={{ padding: theme.spacing[6] }}>
      {/* Header */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <div style={{ marginBottom: theme.spacing[4] }}>
          <h1 style={{ margin: 0, marginBottom: theme.spacing[2], fontSize: '28px' }}>
            ⭐ تقييمات العملاء
          </h1>
          <p style={{ color: theme.colors.textMuted, margin: 0 }}>
            اعرض التقييمات وتفاعل مع آراء العملاء
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[6],
          }}
        >
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: theme.colors.primary }}>
                {averageRating}
              </div>
              <div style={{ fontSize: '14px', color: theme.colors.textMuted }}>
                متوسط التقييم
              </div>
              <div style={{ fontSize: '20px' }}>
                {renderStars(Math.round(Number(averageRating)))}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: theme.colors.success }}>
                {reviews.length}
              </div>
              <div style={{ fontSize: '14px', color: theme.colors.textMuted }}>
                إجمالي التقييمات
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: theme.colors.info }}>
                {reviews.filter((r) => r.response).length}
              </div>
              <div style={{ fontSize: '14px', color: theme.colors.textMuted }}>
                ردود من خدمتنا
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
          <Badge
            variant={filterRating === null ? 'default' : 'ghost' as any}
            size="lg"
            style={{ cursor: 'pointer' }}
          >
            الكل ({reviews.length})
          </Badge>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = reviews.filter((r) => r.rating === rating).length;
            return (
              <Badge
                key={rating}
                variant={filterRating === rating ? 'default' : 'ghost' as any}
                size="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => setFilterRating(filterRating === rating ? null : rating)}
              >
                {rating}★ ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: theme.colors.dangerLight,
            color: theme.colors.dangerDark,
            padding: theme.spacing[4],
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing[4],
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: theme.spacing[8] }}>
          <Spinner size="lg" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: theme.spacing[8] }}>
            <p style={{ color: theme.colors.textMuted }}>
              لا توجد تقييمات بعد
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {filteredReviews.map((review) => (
            <Card key={review.id}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: theme.spacing[3],
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: theme.spacing[1] }}>
                    {review.customer_name}
                  </div>
                  <div style={{ fontSize: '16px' }}>
                    {renderStars(review.rating)}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                  {new Date(review.created_at).toLocaleDateString('ar-EG')}
                </div>
              </div>

              {/* Title */}
              {review.title && (
                <h4
                  style={{
                    margin: `0 0 ${theme.spacing[2]} 0`,
                    fontSize: '15px',
                    fontWeight: 700,
                  }}
                >
                  {review.title}
                </h4>
              )}

              {/* Comment */}
              <p
                style={{
                  margin: `0 0 ${theme.spacing[3]} 0`,
                  color: theme.colors.text,
                  lineHeight: 1.6,
                }}
              >
                {review.comment}
              </p>

              {/* Response */}
              {review.response && (
                <div
                  style={{
                    backgroundColor: theme.colors.primarySoft,
                    padding: theme.spacing[3],
                    borderRadius: theme.borderRadius.md,
                    marginBottom: theme.spacing[3],
                    borderRight: `4px solid ${theme.colors.primary}`,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: theme.spacing[1] }}>
                    📢 ردنا:
                  </div>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    {review.response}
                  </p>
                  <div
                    style={{
                      fontSize: '11px',
                      color: theme.colors.textMuted,
                      marginTop: theme.spacing[2],
                    }}
                  >
                    في {new Date(review.responded_at || '').toLocaleDateString('ar-EG')}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!review.response && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReplyingToId(review.id);
                    setShowReplyModal(true);
                  }}
                >
                  الرد على التقييم
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      <Modal
        isOpen={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        title="الرد على التقييم"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowReplyModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleReplyToReview}>
              إرسال الرد
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <p style={{ color: theme.colors.textMuted }}>
            اكتب رداً احترافياً وودياً على تقييم العميل
          </p>
          <Input
            label="الرد"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="شكراً لك على التقييم. نقدر آراءك..."
            style={{ minHeight: '120px' } as any}
          />
        </div>
      </Modal>
    </div>
  );
}
