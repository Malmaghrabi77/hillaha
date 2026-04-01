-- Migration 31: Distance-based delivery pricing rules
-- Allows Super Admin and Regional Manager to configure delivery fees based on distance

-- =============================================
-- 1. delivery_pricing_rules table
-- =============================================
CREATE TABLE IF NOT EXISTS public.delivery_pricing_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar          TEXT NOT NULL,
  city              TEXT NOT NULL DEFAULT 'Qena',
  base_distance_km  NUMERIC(6,2) NOT NULL DEFAULT 2.0,
  base_price        NUMERIC(10,2) NOT NULL DEFAULT 25.0,
  per_km_price      NUMERIC(10,2) NOT NULL DEFAULT 5.0,
  min_fee           NUMERIC(10,2) NOT NULL DEFAULT 10.0,
  max_fee           NUMERIC(10,2) NOT NULL DEFAULT 100.0,
  max_distance_km   NUMERIC(6,2) DEFAULT 50.0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpr_active ON delivery_pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dpr_city ON delivery_pricing_rules(city);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dpr_one_default ON delivery_pricing_rules(is_default) WHERE is_default = true AND is_active = true;

ALTER TABLE delivery_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can read (customer app needs this)
CREATE POLICY "anyone_reads_delivery_pricing" ON delivery_pricing_rules
  FOR SELECT USING (true);

-- Super admin can manage
CREATE POLICY "super_admin_manages_delivery_pricing" ON delivery_pricing_rules
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- =============================================
-- 2. delivery_pricing_change_requests table
-- =============================================
CREATE TABLE IF NOT EXISTS public.delivery_pricing_change_requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_rule_id            UUID REFERENCES delivery_pricing_rules(id) ON DELETE CASCADE,
  change_type                 TEXT NOT NULL DEFAULT 'update' CHECK (change_type IN ('create', 'update')),
  -- Current values (for display in approval UI)
  current_label_ar            TEXT,
  current_city                TEXT,
  current_base_distance_km    NUMERIC(6,2),
  current_base_price          NUMERIC(10,2),
  current_per_km_price        NUMERIC(10,2),
  current_min_fee             NUMERIC(10,2),
  current_max_fee             NUMERIC(10,2),
  current_max_distance_km     NUMERIC(6,2),
  -- Proposed values
  proposed_label_ar           TEXT,
  proposed_city               TEXT,
  proposed_base_distance_km   NUMERIC(6,2),
  proposed_base_price         NUMERIC(10,2),
  proposed_per_km_price       NUMERIC(10,2),
  proposed_min_fee            NUMERIC(10,2),
  proposed_max_fee            NUMERIC(10,2),
  proposed_max_distance_km    NUMERIC(6,2),
  reason                      TEXT,
  requested_by                UUID NOT NULL REFERENCES auth.users(id),
  requested_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_status             TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by                 UUID REFERENCES auth.users(id),
  approved_at                 TIMESTAMPTZ,
  rejection_reason            TEXT,
  applied_at                  TIMESTAMPTZ
);

ALTER TABLE delivery_pricing_change_requests ENABLE ROW LEVEL SECURITY;

-- Admin roles can read
CREATE POLICY "admin_reads_dp_requests" ON delivery_pricing_change_requests
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

-- Admin roles can insert
CREATE POLICY "admin_inserts_dp_requests" ON delivery_pricing_change_requests
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Super admin can update (approve/reject)
CREATE POLICY "super_admin_updates_dp_requests" ON delivery_pricing_change_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- =============================================
-- 3. RPC: apply_delivery_pricing_change
-- =============================================
CREATE OR REPLACE FUNCTION public.apply_delivery_pricing_change(
  p_request_id UUID,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_rule RECORD;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM delivery_pricing_change_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.approval_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not approved');
  END IF;

  IF v_request.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already applied');
  END IF;

  IF v_request.change_type = 'create' THEN
    -- Create new rule
    INSERT INTO delivery_pricing_rules (
      label_ar, city, base_distance_km, base_price, per_km_price,
      min_fee, max_fee, max_distance_km, is_active, created_by
    ) VALUES (
      COALESCE(v_request.proposed_label_ar, 'قاعدة تسعير جديدة'),
      COALESCE(v_request.proposed_city, 'Qena'),
      COALESCE(v_request.proposed_base_distance_km, 2.0),
      COALESCE(v_request.proposed_base_price, 25.0),
      COALESCE(v_request.proposed_per_km_price, 5.0),
      COALESCE(v_request.proposed_min_fee, 10.0),
      COALESCE(v_request.proposed_max_fee, 100.0),
      COALESCE(v_request.proposed_max_distance_km, 50.0),
      true,
      v_request.requested_by
    );
  ELSE
    -- Update existing rule
    SELECT * INTO v_rule FROM delivery_pricing_rules WHERE id = v_request.delivery_rule_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Rule not found');
    END IF;

    UPDATE delivery_pricing_rules SET
      label_ar         = COALESCE(v_request.proposed_label_ar, label_ar),
      city             = COALESCE(v_request.proposed_city, city),
      base_distance_km = COALESCE(v_request.proposed_base_distance_km, base_distance_km),
      base_price       = COALESCE(v_request.proposed_base_price, base_price),
      per_km_price     = COALESCE(v_request.proposed_per_km_price, per_km_price),
      min_fee          = COALESCE(v_request.proposed_min_fee, min_fee),
      max_fee          = COALESCE(v_request.proposed_max_fee, max_fee),
      max_distance_km  = COALESCE(v_request.proposed_max_distance_km, max_distance_km),
      updated_at       = now()
    WHERE id = v_request.delivery_rule_id;
  END IF;

  -- Mark as applied
  UPDATE delivery_pricing_change_requests
  SET applied_at = now()
  WHERE id = p_request_id;

  -- Log the change
  INSERT INTO price_change_logs (service_price_id, action, admin_id, details)
  VALUES (
    NULL,
    CASE WHEN v_request.change_type = 'create' THEN 'delivery_rule_created' ELSE 'delivery_rule_updated' END,
    p_admin_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'change_type', v_request.change_type,
      'delivery_rule_id', v_request.delivery_rule_id
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================
-- 4. Add columns to orders table
-- =============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(8,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_pricing_rule_id UUID REFERENCES delivery_pricing_rules(id);

-- =============================================
-- 5. Seed default pricing rule for Qena
-- =============================================
INSERT INTO delivery_pricing_rules (label_ar, city, base_distance_km, base_price, per_km_price, min_fee, max_fee, max_distance_km, is_active, is_default)
VALUES ('تسعير التوصيل الافتراضي — قنا', 'Qena', 2.0, 25.0, 5.0, 10.0, 100.0, 50.0, true, true)
ON CONFLICT DO NOTHING;
