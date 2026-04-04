-- ============================================================
--  حلّها — Migration: Driver Live Location
--  شغّل في Supabase SQL Editor
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_lat     numeric(10, 7),
  ADD COLUMN IF NOT EXISTS driver_lng     numeric(10, 7),
  ADD COLUMN IF NOT EXISTS driver_heading numeric(5,  2);

-- فهرس للبحث السريع عن الطلبات النشطة
CREATE INDEX IF NOT EXISTS idx_orders_status_driver
  ON public.orders (status, driver_id)
  WHERE status IN ('picked_up', 'accepted', 'preparing', 'ready');

-- نشر Realtime على الأعمدة الجديدة
-- (ابضًا فعّل Replication على جدول orders من لوحة Supabase)
