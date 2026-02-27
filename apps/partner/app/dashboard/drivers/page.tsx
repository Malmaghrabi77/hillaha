"use client";

import React, { useState, useEffect } from "react";
import { getSupabase } from "@hillaha/core";
import { Button, Card, Badge, Modal, Input, Spinner } from "../../components/ui";
import { theme } from "../../styles/theme";

interface Driver {
  id: string;
  driver_id: string;
  status: 'active' | 'inactive' | 'on_leave' | 'suspended';
  total_deliveries: number;
  successful_deliveries: number;
  average_rating: number;
  rating_count: number;
  total_earnings: number;
  commission_rate: number;
  assigned_at: string;
  driver_name?: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState({
    dayOfWeek: "Saturday",
    startTime: "09:00",
    endTime: "18:00",
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { data, error: err } = await (supabase
        .from("driver_assignments") as any)
        .select("*, profiles(full_name)")
        .order("assigned_at", { ascending: false });

      if (err) throw err;

      const transformed = (data || []).map((driver: any) => ({
        ...driver,
        driver_name: driver.profiles?.full_name || "مندوب مجهول",
      }));

      setDrivers(transformed);
      setError(null);
    } catch (err: any) {
      setError(err.message || "فشل تحميل المندوبين");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedDriverId) return;

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { error: err } = await (supabase
        .from("driver_schedule") as any)
        .insert([
          {
            driver_id: selectedDriverId,
            day_of_week: schedule.dayOfWeek,
            start_time: schedule.startTime,
            end_time: schedule.endTime,
            is_active: true,
          },
        ]);

      if (err) throw err;

      setShowScheduleModal(false);
      setSelectedDriverId(null);
      setSchedule({
        dayOfWeek: "Saturday",
        startTime: "09:00",
        endTime: "18:00",
      });

      await loadDrivers();
    } catch (err: any) {
      setError(err.message || "فشل إضافة الجدول الزمني");
      console.error(err);
    }
  };

  const handleRemoveDriver = async (driverId: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا المندوب؟")) return;

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("خطأ في الاتصال");
        return;
      }

      const { error: err } = await (supabase
        .from("driver_assignments") as any)
        .delete()
        .eq("id", driverId);

      if (err) throw err;
      await loadDrivers();
    } catch (err: any) {
      setError(err.message || "فشل إزالة المندوب");
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_leave':
        return 'warning';
      case 'suspended':
        return 'danger';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '✓ نشط',
      inactive: '✕ غير نشط',
      on_leave: 'إجازة',
      suspended: 'موقوف',
    };
    return labels[status] || status;
  };

  const successRate = (driver: Driver) => {
    if (driver.total_deliveries === 0) return 0;
    return ((driver.successful_deliveries / driver.total_deliveries) * 100).toFixed(0);
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
            👨 إدارة المندوبين
          </h1>
          <p style={{ color: theme.colors.textMuted, margin: 0 }}>
            أدر فريق التوصيل الخاص بك وتتبع أدائهم
          </p>
        </div>
        <Button variant="primary" size="lg">
          + إضافة مندوب
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
        </div>
      ) : drivers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: theme.spacing[8] }}>
            <p style={{ color: theme.colors.textMuted, marginBottom: theme.spacing[4] }}>
              لم تضف أي مندوب بعد
            </p>
            <Button variant="primary">
              + أضف أول مندوب
            </Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {drivers.map((driver) => (
            <Card key={driver.id}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: theme.spacing[4],
                  alignItems: 'center',
                }}
              >
                {/* Driver Info */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing[2],
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {driver.driver_name}
                  </div>
                  <Badge variant={getStatusColor(driver.status) as any}>
                    {getStatusLabel(driver.status)}
                  </Badge>
                </div>

                {/* Stats Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: theme.spacing[3],
                  }}
                >
                  {/* Deliveries */}
                  <div>
                    <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                      الطلبات المنجزة
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>
                      {driver.successful_deliveries}/{driver.total_deliveries}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: theme.colors.success,
                        fontWeight: 600,
                      }}
                    >
                      نسبة: {successRate(driver)}%
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                      التقييم
                    </div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {driver.average_rating.toFixed(1)}
                      <span style={{ fontSize: '16px', color: theme.colors.warning }}>
                        ★
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                      من {driver.rating_count} تقييم
                    </div>
                  </div>

                  {/* Earnings */}
                  <div>
                    <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                      الأرباح
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>
                      {driver.total_earnings.toFixed(2)} ر.س
                    </div>
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                      العمولة: {(driver.commission_rate * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                      المدة
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>
                      {Math.floor(
                        (new Date().getTime() - new Date(driver.assigned_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      يوم
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing[2],
                  }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedDriverId(driver.driver_id);
                      setShowScheduleModal(true);
                    }}
                  >
                    📅 جدول زمني
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveDriver(driver.id)}
                  >
                    إزالة
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="إضافة جدول زمني"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowScheduleModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleAddSchedule}>
              حفظ الجدول
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing[2], fontWeight: 700 }}>
              يوم الأسبوع
            </label>
            <select
              value={schedule.dayOfWeek}
              onChange={(e) => setSchedule({ ...schedule, dayOfWeek: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing[2],
                borderRadius: theme.borderRadius.md,
                border: `1.5px solid ${theme.colors.border}`,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              <option value="Saturday">السبت</option>
              <option value="Sunday">الأحد</option>
              <option value="Monday">الاثنين</option>
              <option value="Tuesday">الثلاثاء</option>
              <option value="Wednesday">الأربعاء</option>
              <option value="Thursday">الخميس</option>
              <option value="Friday">الجمعة</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[3] }}>
            <Input
              label="وقت البدء"
              type="time"
              value={schedule.startTime}
              onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
            />

            <Input
              label="وقت الانتهاء"
              type="time"
              value={schedule.endTime}
              onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
