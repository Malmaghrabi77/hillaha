-- =====================================================================================
-- Migration 38: Security Hardening
-- Fixes: auth.uid() checks in RPCs, wallet advisory lock, push_tokens partner type,
--        apply_banner_change wrong column, accept_order partner ownership,
--        partner store UPDATE restriction, RLS driver policy
-- =====================================================================================

-- ─── 1. Fix approve_order_payment — add auth + role check ─────────────────────
CREATE OR REPLACE FUNCTION public.approve_order_payment(
  p_order_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_caller_role TEXT;
BEGIN
  -- Verify caller identity
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — هوية المستخدم لا تتطابق');
  END IF;

  -- Verify caller is admin or accountant
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin', 'accountant') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — صلاحيات غير كافية');
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND payment_approval_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في انتظار اعتماد الدفع');
  END IF;

  UPDATE public.orders SET
    payment_approval_status = 'approved',
    payment_approved_by     = p_admin_id,
    payment_approved_at     = now(),
    status                  = 'pending'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 2. Fix reject_order_payment — add auth + role check ──────────────────────
CREATE OR REPLACE FUNCTION public.reject_order_payment(
  p_order_id UUID,
  p_admin_id UUID,
  p_reason   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_caller_role TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — هوية المستخدم لا تتطابق');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin', 'accountant') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — صلاحيات غير كافية');
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND payment_approval_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في انتظار اعتماد الدفع');
  END IF;

  UPDATE public.orders SET
    payment_approval_status  = 'rejected',
    payment_approved_by      = p_admin_id,
    payment_approved_at      = now(),
    payment_rejection_reason = p_reason,
    status                   = 'cancelled'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 3. Fix apply_price_change — add auth + role check ────────────────────────
CREATE OR REPLACE FUNCTION public.apply_price_change(p_request_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_caller_role TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — صلاحيات غير كافية');
  END IF;

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

  UPDATE service_prices
    SET price = v_request.new_price, updated_at = now()
    WHERE id = v_request.service_price_id;

  UPDATE price_change_requests
    SET applied_at = now()
    WHERE id = p_request_id;

  INSERT INTO price_change_logs (service_price_id, action, admin_id, old_price, new_price, details)
    VALUES (v_request.service_price_id, 'price_applied', p_admin_id,
            v_request.old_price, v_request.new_price,
            jsonb_build_object('request_id', p_request_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 4. Fix apply_delivery_pricing_change — add auth + role check ─────────────
CREATE OR REPLACE FUNCTION public.apply_delivery_pricing_change(
  p_request_id UUID,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_rule RECORD;
  v_caller_role TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — صلاحيات غير كافية');
  END IF;

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

  UPDATE delivery_pricing_change_requests
  SET applied_at = now()
  WHERE id = p_request_id;

  INSERT INTO price_change_logs (service_price_id, action, admin_id, details)
  VALUES (
    NULL,
    CASE WHEN v_request.change_type = 'create' THEN 'delivery_rule_created' ELSE 'delivery_rule_updated' END,
    p_admin_id,
    jsonb_build_object('request_id', p_request_id, 'change_type', v_request.change_type, 'delivery_rule_id', v_request.delivery_rule_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 5. Fix apply_banner_change — auth check + fix changed_by → admin_id ──────
CREATE OR REPLACE FUNCTION public.apply_banner_change(
  p_request_id UUID,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_banner RECORD;
  v_new_id UUID;
  v_caller_role TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — صلاحيات غير كافية');
  END IF;

  SELECT * INTO v_req FROM banner_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_req.approval_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not approved');
  END IF;

  IF v_req.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already applied');
  END IF;

  IF v_req.change_type = 'create' THEN
    INSERT INTO banners (title, sub, cta, bg, accent, image, link_type, link_value, position, is_active, created_by)
    VALUES (
      COALESCE(v_req.proposed_title, 'بانر جديد'),
      COALESCE(v_req.proposed_sub, ''),
      COALESCE(v_req.proposed_cta, 'اطلب الآن'),
      COALESCE(v_req.proposed_bg, '#7C3AED'),
      COALESCE(v_req.proposed_accent, '#6D28D9'),
      v_req.proposed_image,
      COALESCE(v_req.proposed_link_type, 'none'),
      v_req.proposed_link_value,
      COALESCE(v_req.proposed_position, 0),
      COALESCE(v_req.proposed_is_active, true),
      v_req.requested_by
    )
    RETURNING id INTO v_new_id;

    UPDATE banner_change_requests SET banner_id = v_new_id WHERE id = p_request_id;

  ELSIF v_req.change_type = 'update' THEN
    SELECT * INTO v_banner FROM banners WHERE id = v_req.banner_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Banner not found');
    END IF;

    UPDATE banners SET
      title      = COALESCE(v_req.proposed_title, v_banner.title),
      sub        = COALESCE(v_req.proposed_sub, v_banner.sub),
      cta        = COALESCE(v_req.proposed_cta, v_banner.cta),
      bg         = COALESCE(v_req.proposed_bg, v_banner.bg),
      accent     = COALESCE(v_req.proposed_accent, v_banner.accent),
      image      = COALESCE(v_req.proposed_image, v_banner.image),
      link_type  = COALESCE(v_req.proposed_link_type, v_banner.link_type),
      link_value = COALESCE(v_req.proposed_link_value, v_banner.link_value),
      position   = COALESCE(v_req.proposed_position, v_banner.position),
      is_active  = COALESCE(v_req.proposed_is_active, v_banner.is_active),
      updated_at = now()
    WHERE id = v_req.banner_id;

  ELSIF v_req.change_type = 'delete' THEN
    UPDATE banners SET is_active = false, updated_at = now() WHERE id = v_req.banner_id;
  END IF;

  UPDATE banner_change_requests SET applied_at = now() WHERE id = p_request_id;

  -- Fixed: use admin_id instead of changed_by
  INSERT INTO price_change_logs (action, admin_id, details)
  VALUES (
    'banner_' || v_req.change_type,
    p_admin_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'banner_id', COALESCE(v_new_id, v_req.banner_id),
      'change_type', v_req.change_type
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 6. Fix accept_order_with_delivery_type — add partner ownership check ─────
CREATE OR REPLACE FUNCTION public.accept_order_with_delivery_type(
  p_order_id UUID,
  p_delivery_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_partner RECORD;
  v_rate NUMERIC;
  v_commission NUMERIC;
  v_caller_partner_id UUID;
BEGIN
  -- Validate delivery type
  IF p_delivery_type NOT IN ('platform', 'self') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع توصيل غير صالح');
  END IF;

  -- Verify caller owns this order's partner
  SELECT id INTO v_caller_partner_id FROM public.partners WHERE user_id = auth.uid();
  IF v_caller_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — لا يوجد متجر مرتبط بحسابك');
  END IF;

  -- Fetch order (must be pending AND belong to caller's partner)
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND status = 'pending' AND partner_id = v_caller_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في حالة انتظار');
  END IF;

  -- Fetch partner for commission rates
  SELECT * INTO v_partner FROM public.partners WHERE id = v_order.partner_id;

  IF p_delivery_type = 'self' THEN
    v_rate := COALESCE(v_partner.self_delivery_commission_rate, 0.10);
    v_commission := v_order.subtotal * v_rate;
  ELSE
    v_rate := COALESCE(v_partner.commission_rate, 0.15);
    v_commission := (v_order.subtotal + v_order.delivery_fee) * v_rate;
  END IF;

  UPDATE public.orders SET
    status          = 'accepted',
    delivery_type   = p_delivery_type,
    commission_rate = v_rate,
    app_commission  = ROUND(v_commission, 2),
    accepted_at     = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'delivery_type', p_delivery_type,
    'commission_rate', v_rate,
    'app_commission', ROUND(v_commission, 2)
  );
END;
$$;

-- ─── 7. Fix deduct_wallet_balance — add advisory lock to prevent double-spend ──
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_customer_id UUID,
  p_amount      NUMERIC,
  p_order_id    UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'دفع طلب من المحفظة'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance         NUMERIC;
  v_daily_spent     NUMERIC;
  v_max_single      NUMERIC := 5000;
  v_max_daily       NUMERIC := 10000;
  v_caller          UUID;
  v_lock_key        BIGINT;
BEGIN
  v_caller := auth.uid();

  -- Only the owner can deduct from their wallet
  IF v_caller IS NULL OR v_caller <> p_customer_id THEN
    INSERT INTO public.wallet_audit_log (actor_id, action, details)
    VALUES (v_caller, 'unauthorized_deduct_attempt', jsonb_build_object(
      'target_customer', p_customer_id, 'amount', p_amount
    ));
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح لك بهذه العملية');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ غير صالح');
  END IF;

  -- Single transaction limit
  IF p_amount > v_max_single THEN
    RETURN jsonb_build_object('success', false, 'error',
      'الحد الأقصى للعملية الواحدة ' || v_max_single || ' جنيه');
  END IF;

  -- Advisory lock on customer UUID to prevent concurrent deductions
  v_lock_key := ('x' || left(replace(p_customer_id::text, '-', ''), 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Daily spending limit
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_daily_spent
  FROM public.wallet_transactions
  WHERE customer_id = p_customer_id
    AND type = 'payment'
    AND created_at > CURRENT_DATE;

  IF (v_daily_spent + p_amount) > v_max_daily THEN
    RETURN jsonb_build_object('success', false, 'error',
      'تم تجاوز حد الإنفاق اليومي (' || v_max_daily || ' جنيه)',
      'daily_spent', v_daily_spent, 'daily_limit', v_max_daily);
  END IF;

  -- Check balance (now safe under advisory lock)
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.wallet_transactions
  WHERE customer_id = p_customer_id;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ',
                               'balance', v_balance, 'required', p_amount);
  END IF;

  INSERT INTO public.wallet_transactions (customer_id, amount, type, description, reference_id)
  VALUES (p_customer_id, -p_amount, 'payment', p_description, p_order_id);

  -- Audit log
  INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
  VALUES (v_caller, 'wallet_payment', p_order_id, jsonb_build_object(
    'amount', p_amount, 'remaining', v_balance - p_amount
  ));

  RETURN jsonb_build_object(
    'success',   true,
    'remaining', v_balance - p_amount
  );
END;
$$;

-- ─── 8. Fix push_tokens — allow 'partner' app_type ────────────────────────────
-- Create table if it doesn't exist yet (migration 25 may not have been applied)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,
  device_model TEXT,
  app_type TEXT NOT NULL DEFAULT 'customer' CHECK (app_type IN ('customer', 'driver', 'partner')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_app ON public.push_tokens (user_id, app_type);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens (is_active, app_type) WHERE is_active = true;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Users can manage own push tokens') THEN
    CREATE POLICY "Users can manage own push tokens" ON public.push_tokens FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Now fix the constraint to include 'partner'
ALTER TABLE public.push_tokens DROP CONSTRAINT IF EXISTS push_tokens_app_type_check;
ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_app_type_check
  CHECK (app_type IN ('customer', 'driver', 'partner'));

-- get_push_tokens function (for Edge Functions)
CREATE OR REPLACE FUNCTION get_push_tokens(p_user_ids UUID[], p_app_type TEXT DEFAULT NULL)
RETURNS TABLE(user_id UUID, token TEXT, app_type TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT pt.user_id, pt.token, pt.app_type
  FROM public.push_tokens pt
  WHERE pt.user_id = ANY(p_user_ids)
    AND pt.is_active = true
    AND (p_app_type IS NULL OR pt.app_type = p_app_type);
END;
$$;

-- ─── 9. Fix generate_invitation_token — add admin role check ──────────────────
CREATE OR REPLACE FUNCTION public.generate_invitation_token(
  p_invitation_id UUID,
  p_admin_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_caller_role TEXT;
BEGIN
  -- Verify caller identity and role
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح — صلاحيات غير كافية';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE partner_invitations
  SET invitation_token = v_token,
      token_expires_at = now() + interval '7 days'
  WHERE id = p_invitation_id;

  RETURN v_token;
END;
$$;

-- ─── 10. Fix complete_partner_onboarding — verify caller identity ─────────────
-- Only recreate if function exists (it was created in migration 34)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_partner_onboarding') THEN
    EXECUTE 'DROP FUNCTION public.complete_partner_onboarding(UUID)';
    EXECUTE $fn$
    CREATE FUNCTION public.complete_partner_onboarding(p_user_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_invitation RECORD;
      v_partner_id UUID;
      v_existing UUID;
    BEGIN
      -- Verify caller identity
      IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
      END IF;

      -- Check if partner record already exists
      SELECT id INTO v_existing FROM public.partners WHERE user_id = p_user_id;
      IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'partner_id', v_existing, 'message', 'already_exists');
      END IF;

      -- Find accepted invitation for this user's email
      SELECT pi.* INTO v_invitation
      FROM public.partner_invitations pi
      JOIN auth.users u ON lower(u.email) = lower(pi.email)
      WHERE u.id = p_user_id AND pi.status = 'accepted'
      ORDER BY pi.created_at DESC
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا توجد دعوة مقبولة لهذا الحساب');
      END IF;

      -- Create partner record
      INSERT INTO public.partners (user_id, business_name, phone, is_approved)
      VALUES (p_user_id, COALESCE(v_invitation.name, ''), COALESCE(v_invitation.phone, ''), true)
      RETURNING id INTO v_partner_id;

      -- Update profile
      UPDATE public.profiles
      SET role = 'partner', partner_id = v_partner_id
      WHERE id = p_user_id;

      -- Mark invitation as registered
      UPDATE public.partner_invitations
      SET status = 'registered'
      WHERE id = v_invitation.id;

      RETURN jsonb_build_object('success', true, 'partner_id', v_partner_id);
    END;
    $body$;
    $fn$;
  END IF;
END $$;

-- ─── 11. Fix get_wallet_balance — restrict to own wallet ──────────────────────
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_customer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_role TEXT;
BEGIN
  -- Allow: owner, super_admin, admin, accountant
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() IS DISTINCT FROM p_customer_id
     AND v_role NOT IN ('super_admin', 'admin', 'accountant') THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.wallet_transactions
  WHERE customer_id = p_customer_id;

  RETURN v_balance;
END;
$$;

-- ─── 12. Fix get_driver_wallet_balance — restrict to own wallet ───────────────
CREATE OR REPLACE FUNCTION public.get_driver_wallet_balance(p_driver_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() IS DISTINCT FROM p_driver_id
     AND v_role NOT IN ('super_admin', 'admin', 'accountant') THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.driver_wallet_transactions
  WHERE driver_id = p_driver_id;

  RETURN v_balance;
END;
$$;

-- ─── 13. Fix driver RLS — restrict order access more tightly ──────────────────
-- Drop overly permissive policies
DROP POLICY IF EXISTS "driver sees ready orders" ON public.orders;
DROP POLICY IF EXISTS "driver updates own orders" ON public.orders;

-- Recreate with proper restrictions
CREATE POLICY "driver sees available orders"
  ON public.orders FOR SELECT
  USING (
    status IN ('ready', 'accepted', 'preparing')
    AND delivery_type = 'platform'
    AND driver_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'driver'
      AND driver_application_status = 'approved'
    )
  );

CREATE POLICY "driver sees own claimed orders"
  ON public.orders FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "driver updates own claimed orders"
  ON public.orders FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- ─── 14. Restrict partner store self-update — block sensitive columns ─────────
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "partner can update own store" ON public.partners;

-- Recreate with column restrictions via trigger
CREATE OR REPLACE FUNCTION public.prevent_partner_sensitive_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Prevent partners from modifying sensitive fields
  IF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
     OR NEW.self_delivery_commission_rate IS DISTINCT FROM OLD.self_delivery_commission_rate
     OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.review_count IS DISTINCT FROM OLD.review_count THEN
    -- Check if caller is admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    ) THEN
      RAISE EXCEPTION 'لا يمكنك تعديل هذه الحقول';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_partner_sensitive_update ON public.partners;
CREATE TRIGGER trg_prevent_partner_sensitive_update
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_sensitive_update();

-- Recreate the partner update policy
CREATE POLICY "partner can update own store"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
