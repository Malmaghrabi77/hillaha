-- Migration 26: Pricing Management + Egyptian Payment Wallets
-- إدارة الأسعار + المحافظ المصرية

-- ============================================================
-- 1. Service Prices Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  service_key     TEXT NOT NULL,
  label_ar        TEXT NOT NULL,
  description_ar  TEXT,
  icon            TEXT DEFAULT '',
  price           NUMERIC(10, 2) NOT NULL,
  price_unit      TEXT NOT NULL DEFAULT 'per_visit',
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, service_key)
);

CREATE INDEX IF NOT EXISTS idx_service_prices_category ON service_prices(category);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON service_prices(is_active) WHERE is_active = true;

-- ============================================================
-- 2. Price Change Requests (Approval Workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_change_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_price_id  UUID REFERENCES service_prices(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  service_key       TEXT NOT NULL,
  old_price         NUMERIC(10, 2),
  new_price         NUMERIC(10, 2) NOT NULL,
  reason            TEXT,
  requested_by      UUID NOT NULL REFERENCES auth.users(id),
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_status   TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  applied_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pcr_status ON price_change_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_pcr_service ON price_change_requests(service_price_id);

-- ============================================================
-- 3. Price Change Logs (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_change_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_price_id UUID REFERENCES service_prices(id),
  action           TEXT NOT NULL,
  admin_id         UUID NOT NULL REFERENCES auth.users(id),
  old_price        NUMERIC(10, 2),
  new_price        NUMERIC(10, 2),
  details          JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. RLS Policies
-- ============================================================
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_change_logs ENABLE ROW LEVEL SECURITY;

-- service_prices: anyone reads, super_admin manages
CREATE POLICY "anyone reads service prices"
  ON public.service_prices FOR SELECT USING (true);

CREATE POLICY "super_admin manages service prices"
  ON public.service_prices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- price_change_requests: admin roles can read/insert, super_admin can update
CREATE POLICY "admins read price requests"
  ON public.price_change_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

CREATE POLICY "admins insert price requests"
  ON public.price_change_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

CREATE POLICY "super_admin updates price requests"
  ON public.price_change_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- price_change_logs: admin roles can read/insert
CREATE POLICY "admins read price logs"
  ON public.price_change_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

CREATE POLICY "admins insert price logs"
  ON public.price_change_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

-- ============================================================
-- 5. Apply Price Change Function
-- ============================================================
CREATE OR REPLACE FUNCTION apply_price_change(p_request_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM price_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_request.approval_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب لم يُعتمد بعد');
  END IF;

  IF v_request.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم التطبيق مسبقاً');
  END IF;

  -- Update the price
  UPDATE service_prices
    SET price = v_request.new_price, updated_at = now()
    WHERE id = v_request.service_price_id;

  -- Mark as applied
  UPDATE price_change_requests
    SET applied_at = now()
    WHERE id = p_request_id;

  -- Log
  INSERT INTO price_change_logs (service_price_id, action, admin_id, old_price, new_price, details)
    VALUES (v_request.service_price_id, 'price_applied', p_admin_id,
            v_request.old_price, v_request.new_price,
            jsonb_build_object('request_id', p_request_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 6. Seed Service Prices
-- ============================================================
INSERT INTO public.service_prices (category, service_key, label_ar, description_ar, icon, price, price_unit, sort_order) VALUES
  -- P2P Delivery
  ('delivery_p2p', 'small',  'صغير',   'يحمله بيد واحدة — مستندات، ملابس',         '📦', 25,  'per_trip', 1),
  ('delivery_p2p', 'medium', 'متوسط',  'كرتونة صغيرة — أجهزة صغيرة، هدايا',        '📫', 40,  'per_trip', 2),
  ('delivery_p2p', 'large',  'كبير',   'كرتونة كبيرة — أجهزة كبيرة، أثاث خفيف',    '🗃️', 60,  'per_trip', 3),
  -- Cleaning
  ('cleaning', 'basic',   'تنظيف أساسي',     'غرفة + حمام',            '🧹', 120, 'per_visit', 1),
  ('cleaning', 'full',    'تنظيف شامل',      'الشقة كاملة',            '✨', 250, 'per_visit', 2),
  ('cleaning', 'deep',    'تنظيف عميق',      'شامل الأثاث والزجاج',    '🫧', 400, 'per_visit', 3),
  ('cleaning', 'curtain', 'غسيل ستائر',      'لكل الغرف',              '🪟', 180, 'per_visit', 4),
  ('cleaning', 'carpet',  'تنظيف موكيت',     'لكل قطعة',               '🏠', 80,  'per_visit', 5),
  ('cleaning', 'move',    'تنظيف بعد إسكان', 'إزالة أتربة البناء',      '🔑', 500, 'per_visit', 6),
  -- Electrical
  ('electrical', 'ac_service',   'صيانة مكيف',       'فحص وتنظيف وإصلاح',     '❄️', 150, 'per_visit', 1),
  ('electrical', 'ac_install',   'تركيب مكيف',       'تركيب احترافي مضمون',    '🔧', 250, 'per_visit', 2),
  ('electrical', 'ac_gas',       'شحن فريون',        'شحن كامل للمكيف',        '💨', 200, 'per_visit', 3),
  ('electrical', 'elec_fix',     'إصلاح كهرباء',    'أقسام ووصلات كهربائية',  '⚡', 100, 'per_visit', 4),
  ('electrical', 'elec_install', 'تركيب إضاءة',     'ليدات وإضاءة منزلية',    '💡', 80,  'per_visit', 5),
  ('electrical', 'safety',       'فحص أمان كهربائي', 'تقرير شامل للمنزل',      '🛡️', 120, 'per_visit', 6)
ON CONFLICT (category, service_key) DO NOTHING;

-- ============================================================
-- 7. Add Missing Egyptian Wallets to payment_methods
-- ============================================================
INSERT INTO public.payment_methods (name, name_ar, code, icon, description, description_ar, category, commission_rate, is_enabled, requires_config) VALUES
  ('WE Pay',       'محفظة WE',          'we_pay',    '📱', 'WE Pay mobile wallet',      'محفظة وي باي',            'wallet', 0.020, false, false),
  ('Meeza',        'ميزة',              'meeza',     '💳', 'Meeza digital card',         'بطاقة ميزة الرقمية',       'card',   0.020, false, true),
  ('Aman',         'أمان',              'aman',      '🏪', 'Aman payment network',       'شبكة دفع أمان',           'other',  0.020, false, false),
  ('BEE',          'BEE',               'bee',       '🐝', 'BEE mobile wallet',          'محفظة BEE',               'wallet', 0.020, false, false),
  ('Khazna',       'خزنة',              'khazna',    '💰', 'Khazna digital wallet',      'محفظة خزنة الرقمية',       'wallet', 0.020, false, false),
  ('Cash',         'كاش عند الاستلام',  'cash',      '💵', 'Cash on delivery',           'الدفع نقداً عند الاستلام', 'other',  0.000, true,  false),
  ('Wallet',       'محفظة حلّها',       'wallet',    '👛', 'Hillaha app wallet',         'ادفع من رصيد محفظتك',     'wallet', 0.000, true,  false),
  ('InstaPay',     'InstaPay',          'instapay',  '📲', 'InstaPay transfer',          'تحويل لحظي عبر InstaPay', 'bank',   0.000, true,  false),
  ('Etisalat Cash','اتصالات كاش',       'etisalat_cash','📡','Etisalat Cash wallet',     'محفظة اتصالات كاش',       'wallet', 0.020, true,  false)
ON CONFLICT (code) DO NOTHING;
