"use client";

import React, { useState, useEffect } from "react";
import { getSupabase } from "@hillaha/core";
import { Button, Card, Badge, Modal, Input, Spinner } from "../../components/ui";
import { theme } from "../../styles/theme";

interface Promotion {
  id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  start_date: string;
  end_date: string;
  coupon_code?: string;
  status: 'active' | 'paused' | 'expired' | 'draft';
  used_count: number;
  max_uses: number;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "percentage" as const,
    discount_value: 10,
    min_order_value: 0,
    start_date: "",
    end_date: "",
    coupon_code: "",
    max_uses: 100,
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { data, error: err } = await (supabase
        .from("promotions") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setPromotions(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "فشل تحميل العروض");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePromotion = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      if (editingId) {
        // Update existing
        const { error: err } = await (supabase
          .from("promotions") as any)
          .update(formData)
          .eq("id", editingId);

        if (err) throw err;
      } else {
        // Insert new
        const { error: err } = await (supabase
          .from("promotions") as any)
          .insert([formData]);

        if (err) throw err;
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        discount_type: "percentage",
        discount_value: 10,
        min_order_value: 0,
        start_date: "",
        end_date: "",
        coupon_code: "",
        max_uses: 100,
      });

      await loadPromotions();
    } catch (err: any) {
      setError(err.message || "فشل حفظ العرض");
      console.error(err);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العرض؟")) return;

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { error: err } = await (supabase
        .from("promotions") as any)
        .delete()
        .eq("id", id);

      if (err) throw err;
      await loadPromotions();
    } catch (err: any) {
      setError(err.message || "فشل حذف العرض");
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'expired':
        return 'danger';
      case 'draft':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '✓ نشط',
      paused: 'مؤقف',
      expired: '✕ منتهي الصلاحية',
      draft: 'مسودة',
    };
    return labels[status] || status;
  };

  return (
    <div style={{ padding: theme.spacing[6] }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[6],
        }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: theme.spacing[2], fontSize: '28px' }}>
            🎁 إدارة العروض والخصومات
          </h1>
          <p style={{ color: theme.colors.textMuted, margin: 0 }}>
            أنشئ وأدر عروض خاصة لعملائك
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: "",
              description: "",
              discount_type: "percentage",
              discount_value: 10,
              min_order_value: 0,
              start_date: "",
              end_date: "",
              coupon_code: "",
              max_uses: 100,
            });
            setShowModal(true);
          }}
        >
          + عرض جديد
        </Button>
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
          <p style={{ color: theme.colors.textMuted, marginTop: theme.spacing[4] }}>
            جاري التحميل...
          </p>
        </div>
      ) : promotions.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: theme.spacing[8] }}>
            <p style={{ color: theme.colors.textMuted, marginBottom: theme.spacing[4] }}>
              لا توجد عروض حتى الآن
            </p>
            <Button
              variant="primary"
              onClick={() => setShowModal(true)}
            >
              + أنشئ أول عرض
            </Button>
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: theme.spacing[4],
          }}
        >
          {promotions.map((promo) => (
            <Card key={promo.id} hoverable>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: theme.spacing[4],
                }}
              >
                <div>
                  <h3 style={{ margin: 0, marginBottom: theme.spacing[1] }}>
                    {promo.name}
                  </h3>
                  {promo.coupon_code && (
                    <code
                      style={{
                        backgroundColor: theme.colors.background,
                        color: theme.colors.primary,
                        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                        borderRadius: theme.borderRadius.sm,
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {promo.coupon_code}
                    </code>
                  )}
                </div>
                <Badge variant={getStatusColor(promo.status) as any}>
                  {getStatusLabel(promo.status)}
                </Badge>
              </div>

              {/* Description */}
              {promo.description && (
                <p
                  style={{
                    color: theme.colors.textMuted,
                    marginBottom: theme.spacing[4],
                    fontSize: '13px',
                  }}
                >
                  {promo.description}
                </p>
              )}

              {/* Discount Info */}
              <div
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.md,
                  marginBottom: theme.spacing[4],
                }}
              >
                <p style={{ margin: 0, color: theme.colors.primary, fontWeight: 700 }}>
                  خصم {promo.discount_value}
                  {promo.discount_type === 'percentage' ? '%' : ' ريال'}
                </p>
                {promo.min_order_value > 0 && (
                  <p style={{ margin: `${theme.spacing[1]} 0 0 0`, fontSize: '12px' }}>
                    الحد الأدنى: {promo.min_order_value} ريال
                  </p>
                )}
              </div>

              {/* Usage */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing[4],
                  fontSize: '13px',
                  color: theme.colors.textMuted,
                }}
              >
                <span>الاستخدام: {promo.used_count} / {promo.max_uses || '∞'}</span>
                <span>
                  {new Date(promo.start_date).toLocaleDateString('ar-EG')}
                </span>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: theme.spacing[2],
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setEditingId(promo.id);
                    setFormData({
                      name: promo.name,
                      description: promo.description || "",
                      discount_type: promo.discount_type,
                      discount_value: promo.discount_value,
                      min_order_value: promo.min_order_value,
                      start_date: promo.start_date,
                      end_date: promo.end_date,
                      coupon_code: promo.coupon_code || "",
                      max_uses: promo.max_uses,
                    });
                    setShowModal(true);
                  }}
                >
                  تعديل
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => handleDeletePromotion(promo.id)}
                >
                  حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "تعديل العرض" : "عرض جديد"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleSavePromotion}>
              {editingId ? "تحديث" : "إنشاء"}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <Input
            label="اسم العرض"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: تخفيض الذكرى السنوية"
          />

          <Input
            label="الوصف (اختياري)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="وصف قصير للعرض"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[3] }}>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 700 }}>
                نوع الخصم
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: theme.spacing[2],
                  borderRadius: theme.borderRadius.md,
                  border: `1.5px solid ${theme.colors.border}`,
                  fontFamily: theme.typography.fontFamily.sans,
                }}
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ر.س)</option>
              </select>
            </div>

            <Input
              label="قيمة الخصم"
              type="number"
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
              placeholder="10"
            />
          </div>

          <Input
            label="الحد الأدنى للطلب (اختياري)"
            type="number"
            value={formData.min_order_value}
            onChange={(e) => setFormData({ ...formData, min_order_value: Number(e.target.value) })}
            placeholder="0"
          />

          <Input
            label="رمز الكوبون (اختياري)"
            value={formData.coupon_code}
            onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
            placeholder="مثال: SAVE20"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[3] }}>
            <Input
              label="تاريخ البدء"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />

            <Input
              label="تاريخ الانتهاء"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <Input
            label="الحد الأقصى للاستخدام (اختياري)"
            type="number"
            value={formData.max_uses}
            onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
            placeholder="100"
          />
        </div>
      </Modal>
    </div>
  );
}
