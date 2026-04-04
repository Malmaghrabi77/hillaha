-- Migration 47: Server-side order validation, role enforcement, and promo codes
-- Fixes critical architectural issues: client-side price calculation, role assignment, promo codes

-- ══════════════════════════════════════════════════════════════════════
-- 1. PROMO CODES TABLE
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount   numeric,          -- cap for percentage discounts
  min_order_value numeric DEFAULT 0,
  max_uses       int,              -- null = unlimited
  used_count     int DEFAULT 0,
  per_user_limit int DEFAULT 1,
  is_active      boolean DEFAULT true,
  starts_at      timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- Seed the existing HILLAHA1 campaign code
INSERT INTO public.promo_codes (code, discount_type, discount_value, max_discount, is_active)
VALUES ('HILLAHA1', 'fixed', 15, 15, true)
ON CONFLICT (code) DO NOTHING;

-- Track per-user promo usage
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES public.promo_codes(id),
  customer_id   uuid REFERENCES auth.users(id),
  order_id      uuid,
  used_at       timestamptz DEFAULT now(),
  UNIQUE(promo_code_id, customer_id, order_id)
);

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Everyone can read active promo codes
CREATE POLICY "promo_codes_read" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Only admins can manage promo codes
CREATE POLICY "promo_codes_admin" ON public.promo_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Users can see their own usage
CREATE POLICY "promo_usage_own" ON public.promo_code_usage
  FOR SELECT USING (customer_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════
-- 2. VALIDATE PROMO CODE (server-side RPC)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code text,
  p_subtotal numeric DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_promo   public.promo_codes;
  v_user_id uuid := auth.uid();
  v_usage   int;
  v_discount numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'يجب تسجيل الدخول');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes
  WHERE upper(code) = upper(p_code) AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'كود غير صالح');
  END IF;

  -- Check expiry
  IF v_promo.starts_at IS NOT NULL AND now() < v_promo.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'error', 'الكود لم يبدأ بعد');
  END IF;
  IF v_promo.expires_at IS NOT NULL AND now() > v_promo.expires_at THEN
    RETURN jsonb_build_object('valid', false, 'error', 'الكود منتهي الصلاحية');
  END IF;

  -- Check global uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'الكود نفد');
  END IF;

  -- Check per-user limit
  SELECT count(*) INTO v_usage FROM public.promo_code_usage
  WHERE promo_code_id = v_promo.id AND customer_id = v_user_id;

  IF v_promo.per_user_limit IS NOT NULL AND v_usage >= v_promo.per_user_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'لقد استخدمت هذا الكود من قبل');
  END IF;

  -- Check min order value
  IF p_subtotal < v_promo.min_order_value THEN
    RETURN jsonb_build_object('valid', false, 'error',
      'الحد الأدنى للطلب ' || v_promo.min_order_value || ' ج.م');
  END IF;

  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_subtotal * v_promo.discount_value / 100;
    IF v_promo.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_promo.max_discount);
    END IF;
  ELSE
    v_discount := v_promo.discount_value;
  END IF;

  -- Never discount more than subtotal
  v_discount := LEAST(v_discount, p_subtotal);

  RETURN jsonb_build_object(
    'valid', true,
    'discount', round(v_discount, 2),
    'promo_id', v_promo.id
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. SERVER-SIDE ORDER CREATION
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_validated_order(
  p_partner_id       uuid,
  p_items            jsonb,        -- [{"menu_item_id": uuid, "qty": int}, ...]
  p_delivery_address text,
  p_delivery_lat     double precision,
  p_delivery_lng     double precision,
  p_location_source  text DEFAULT NULL,
  p_customer_phone   text DEFAULT NULL,
  p_customer_note    text DEFAULT NULL,
  p_payment_method   text DEFAULT 'cash',
  p_payment_proof_url text DEFAULT NULL,
  p_promo_code       text DEFAULT NULL,
  p_delivery_type    text DEFAULT 'platform'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_subtotal    numeric := 0;
  v_item        jsonb;
  v_menu_item   record;
  v_items_out   jsonb := '[]'::jsonb;
  v_delivery_fee numeric := 0;
  v_discount     numeric := 0;
  v_promo_id     uuid;
  v_total        numeric;
  v_distance     double precision;
  v_partner      record;
  v_rule         record;
  v_order_id     uuid;
  v_status       text := 'pending';
  v_delivery_distance numeric;
  v_rule_id      uuid;
BEGIN
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول');
  END IF;

  -- Get partner info
  SELECT id, lat, lng, city, delivery_fee
  INTO v_partner
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المتجر غير موجود');
  END IF;

  -- ── Validate items and calculate subtotal from DB prices ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name_ar, price, is_available, partner_id
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'صنف غير موجود: ' || (v_item->>'menu_item_id'));
    END IF;

    IF v_menu_item.partner_id != p_partner_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'الصنف لا ينتمي لهذا المتجر');
    END IF;

    IF NOT v_menu_item.is_available THEN
      RETURN jsonb_build_object('success', false, 'error', v_menu_item.name_ar || ' غير متاح حالياً');
    END IF;

    v_subtotal := v_subtotal + (v_menu_item.price * (v_item->>'qty')::int);
    v_items_out := v_items_out || jsonb_build_object(
      'name', v_menu_item.name_ar,
      'qty', (v_item->>'qty')::int,
      'price', v_menu_item.price
    );
  END LOOP;

  IF v_subtotal = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'السلة فارغة');
  END IF;

  -- ── Calculate delivery fee from server rules ──
  IF p_delivery_type = 'platform' AND v_partner.lat IS NOT NULL AND p_delivery_lat IS NOT NULL THEN
    -- Haversine distance in km
    v_distance := 6371 * 2 * asin(sqrt(
      sin(radians(p_delivery_lat - v_partner.lat) / 2) ^ 2 +
      cos(radians(v_partner.lat)) * cos(radians(p_delivery_lat)) *
      sin(radians(p_delivery_lng - v_partner.lng) / 2) ^ 2
    ));
    v_delivery_distance := round(v_distance::numeric, 1);

    -- Find applicable pricing rule
    SELECT * INTO v_rule FROM public.delivery_pricing_rules
    WHERE city = COALESCE(v_partner.city, 'Qena') AND NOT is_default AND is_active
    LIMIT 1;

    IF NOT FOUND THEN
      SELECT * INTO v_rule FROM public.delivery_pricing_rules
      WHERE is_default AND is_active
      LIMIT 1;
    END IF;

    IF FOUND THEN
      v_rule_id := v_rule.id;
      -- Check max distance
      IF v_rule.max_distance_km IS NOT NULL AND v_distance > v_rule.max_distance_km THEN
        RETURN jsonb_build_object('success', false, 'error', 'العنوان بعيد جداً عن المتجر');
      END IF;

      v_delivery_fee := v_rule.base_price;
      IF v_distance > v_rule.base_distance_km THEN
        v_delivery_fee := v_delivery_fee + (v_distance - v_rule.base_distance_km) * v_rule.per_km_price;
      END IF;
      v_delivery_fee := GREATEST(v_rule.min_fee, LEAST(v_rule.max_fee, v_delivery_fee));
      v_delivery_fee := round(v_delivery_fee, 2);
    ELSE
      -- Fallback to partner static fee
      v_delivery_fee := COALESCE(v_partner.delivery_fee, 0);
    END IF;
  ELSIF p_delivery_type = 'self' THEN
    v_delivery_fee := 0;
  ELSE
    v_delivery_fee := COALESCE(v_partner.delivery_fee, 0);
  END IF;

  -- ── Validate promo code server-side ──
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    DECLARE
      v_promo_result jsonb;
    BEGIN
      v_promo_result := public.validate_promo_code(p_promo_code, v_subtotal);
      IF (v_promo_result->>'valid')::boolean THEN
        v_discount := (v_promo_result->>'discount')::numeric;
        v_promo_id := (v_promo_result->>'promo_id')::uuid;
      END IF;
      -- Silently ignore invalid promo (don't block order)
    END;
  END IF;

  -- ── Calculate total ──
  v_total := GREATEST(0, v_subtotal + v_delivery_fee - v_discount);

  -- High-value payment approval
  IF v_total > 1000 AND p_payment_method NOT IN ('wallet', 'card') THEN
    v_status := 'awaiting_payment_approval';
  END IF;

  -- ── Insert order ──
  INSERT INTO public.orders (
    customer_id, partner_id, items, subtotal, delivery_fee,
    delivery_distance_km, delivery_pricing_rule_id,
    discount, total, delivery_address, delivery_lat, delivery_lng,
    location_source, customer_phone, customer_note,
    payment_method, payment_proof_url, status, delivery_type
  ) VALUES (
    v_customer_id, p_partner_id, v_items_out, v_subtotal, v_delivery_fee,
    v_delivery_distance, v_rule_id,
    v_discount, v_total, p_delivery_address, p_delivery_lat, p_delivery_lng,
    p_location_source, p_customer_phone, p_customer_note,
    p_payment_method, p_payment_proof_url, v_status, p_delivery_type
  )
  RETURNING id INTO v_order_id;

  -- Record promo usage
  IF v_promo_id IS NOT NULL THEN
    INSERT INTO public.promo_code_usage (promo_code_id, customer_id, order_id)
    VALUES (v_promo_id, v_customer_id, v_order_id);

    UPDATE public.promo_codes SET used_count = used_count + 1
    WHERE id = v_promo_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount', v_discount,
    'total', v_total,
    'status', v_status
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 4. ENFORCE ROLE ON SIGNUP — prevent client-side role escalation
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_role_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_allowed_roles text[] := ARRAY['customer', 'driver'];
BEGIN
  -- On INSERT: only allow customer or driver roles from client
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('customer', 'driver') THEN
      NEW.role := 'customer';
    END IF;
  END IF;

  -- On UPDATE: prevent role escalation (only super_admin can change roles)
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow if current user is super_admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      NEW.role := OLD.role;  -- revert role change
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS enforce_role_trigger ON public.profiles;
CREATE TRIGGER enforce_role_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_role_on_profile();

-- ══════════════════════════════════════════════════════════════════════
-- 5. GRANTS
-- ══════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_validated_order(uuid, jsonb, text, double precision, double precision, text, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_validated_order IS 'Server-side order creation with DB price validation, delivery fee calculation, and promo code validation';
COMMENT ON FUNCTION public.validate_promo_code IS 'Validate promo code server-side with per-user limits and expiry checks';
COMMENT ON FUNCTION public.enforce_role_on_profile IS 'Prevent client-side role escalation — only super_admin can assign privileged roles';
