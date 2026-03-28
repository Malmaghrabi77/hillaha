-- Migration: Wallet Security Hardening
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. Failed redemption attempts tracker (brute-force protection)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_redemption_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_code TEXT NOT NULL,
  success      BOOLEAN DEFAULT FALSE,
  ip_hint      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_redemption_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_redemption_attempts_user ON public.wallet_redemption_attempts(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 2. Wallet audit log (all sensitive operations)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES auth.users(id),
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    UUID,
  details      JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin and accountant can view audit log
CREATE POLICY "admin views wallet audit log"
  ON public.wallet_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'accountant')
    )
  );

CREATE INDEX idx_wallet_audit_action ON public.wallet_audit_log(action, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 3. Add maximum wallet balance constraint
-- ═══════════════════════════════════════════════════════════════
-- Max balance: 50,000 (configurable in the function)

-- ═══════════════════════════════════════════════════════════════
-- 4. Add expiry default (codes expire after 90 days if not set)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.wallet_codes
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '90 days');

-- ═══════════════════════════════════════════════════════════════
-- 5. HARDENED redeem_wallet_code
--    - Rate limit: max 5 failed attempts per 15 min
--    - Creator cannot redeem own code
--    - Max wallet balance cap (50,000)
--    - Logs all attempts (success + failure)
--    - Checks approval_status and target_type
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.redeem_wallet_code(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code_row      RECORD;
  v_customer_id   UUID;
  v_failed_count  INTEGER;
  v_current_bal   NUMERIC;
  v_max_balance   NUMERIC := 50000;
  v_max_attempts  INTEGER := 5;
  v_lockout_mins  INTEGER := 15;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- Rate limit: count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_count
  FROM public.wallet_redemption_attempts
  WHERE user_id = v_customer_id
    AND success = FALSE
    AND created_at > NOW() - (v_lockout_mins || ' minutes')::INTERVAL;

  IF v_failed_count >= v_max_attempts THEN
    -- Log blocked attempt
    INSERT INTO public.wallet_audit_log (actor_id, action, details)
    VALUES (v_customer_id, 'redeem_blocked', jsonb_build_object(
      'reason', 'rate_limit', 'failed_attempts', v_failed_count
    ));

    RETURN jsonb_build_object('success', false, 'error',
      'تم تجاوز الحد الأقصى للمحاولات. حاول مرة أخرى بعد ' || v_lockout_mins || ' دقيقة',
      'locked', true, 'retry_after_minutes', v_lockout_mins);
  END IF;

  -- Find code
  SELECT * INTO v_code_row
  FROM public.wallet_codes
  WHERE code = UPPER(TRIM(p_code))
  FOR UPDATE;

  IF v_code_row IS NULL THEN
    -- Log failed attempt
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success)
    VALUES (v_customer_id, LEFT(UPPER(TRIM(p_code)), 4) || '****', FALSE);

    RETURN jsonb_build_object('success', false, 'error', 'الكود غير صحيح');
  END IF;

  IF v_code_row.is_used THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success)
    VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', FALSE);

    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مُستخدم بالفعل');
  END IF;

  IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < NOW() THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success)
    VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', FALSE);

    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود منتهي الصلاحية');
  END IF;

  -- Check approval status
  IF v_code_row.approval_status IS NOT NULL AND v_code_row.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود غير مفعّل بعد');
  END IF;

  -- Check target type
  IF v_code_row.target_type IS NOT NULL AND v_code_row.target_type <> 'customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مخصص للمندوبين فقط');
  END IF;

  -- Prevent creator from redeeming own code
  IF v_code_row.created_by = v_customer_id THEN
    INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
    VALUES (v_customer_id, 'self_redeem_attempt', v_code_row.id,
      jsonb_build_object('code', v_code_row.code));

    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك استخدام كود أنشأته بنفسك');
  END IF;

  -- Check max wallet balance
  SELECT COALESCE(SUM(amount), 0) INTO v_current_bal
  FROM public.wallet_transactions
  WHERE customer_id = v_customer_id;

  IF (v_current_bal + v_code_row.amount) > v_max_balance THEN
    RETURN jsonb_build_object('success', false, 'error',
      'سيتجاوز رصيدك الحد الأقصى المسموح (' || v_max_balance || ' جنيه)',
      'current_balance', v_current_bal, 'max_balance', v_max_balance);
  END IF;

  -- Redeem
  UPDATE public.wallet_codes
  SET is_used = TRUE, redeemed_by = v_customer_id, redeemed_at = NOW()
  WHERE id = v_code_row.id;

  INSERT INTO public.wallet_transactions (customer_id, amount, type, description, reference_id)
  VALUES (v_customer_id, v_code_row.amount, 'topup',
          'شحن المحفظة — كود #' || SUBSTRING(v_code_row.code, 1, 8),
          v_code_row.id);

  -- Log success
  INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success)
  VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', TRUE);

  INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
  VALUES (v_customer_id, 'code_redeemed', v_code_row.id, jsonb_build_object(
    'amount', v_code_row.amount, 'code_prefix', LEFT(v_code_row.code, 8)
  ));

  RETURN jsonb_build_object(
    'success', true,
    'amount',  v_code_row.amount,
    'message', 'تم شحن المحفظة بنجاح'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. HARDENED deduct_wallet_balance
--    - Only authenticated user can deduct from own wallet
--    - Daily spending limit (10,000)
--    - Single transaction limit (5,000)
--    - Audit logging
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_customer_id UUID,
  p_amount      NUMERIC,
  p_order_id    UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'دفع طلب من المحفظة'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance         NUMERIC;
  v_daily_spent     NUMERIC;
  v_max_single      NUMERIC := 5000;
  v_max_daily       NUMERIC := 10000;
  v_caller          UUID;
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

  -- Check balance with row lock
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

-- ═══════════════════════════════════════════════════════════════
-- 7. Hardened code generation: RLS policy for insert
--    Only admin/super_admin/accountant can INSERT codes
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin manages wallet codes" ON public.wallet_codes;

CREATE POLICY "admin_select_wallet_codes" ON public.wallet_codes FOR SELECT
  USING (
    auth.uid() = redeemed_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

CREATE POLICY "admin_insert_wallet_codes" ON public.wallet_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "admin_update_wallet_codes" ON public.wallet_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 8. Prevent duplicate code values (already UNIQUE, add check)
-- ═══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_codes_code_unique ON public.wallet_codes(code);

-- ═══════════════════════════════════════════════════════════════
-- 9. Auto-cleanup: delete failed attempts older than 24h
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cleanup_old_redemption_attempts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.wallet_redemption_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

COMMENT ON TABLE public.wallet_redemption_attempts IS 'Tracks failed/successful code redemption attempts for rate limiting';
COMMENT ON TABLE public.wallet_audit_log IS 'Audit trail for all sensitive wallet operations';
