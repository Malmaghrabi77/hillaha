-- Migration 22: Driver Wallet & Withdrawals
-- ═══════════════════════════════════════════════════════════════
-- 1. Driver payment info table (bank/wallet details)
-- 2. Driver withdrawal requests table
-- 3. redeem_driver_wallet_code() — 7-layer secured redemption
-- 4. confirm_driver_wallet_redemption() — 2FA confirmation
-- 5. request_driver_withdrawal() — withdrawal with balance deduction
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. DRIVER PAYMENT INFO
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.driver_payment_info (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bank_name       TEXT,
  iban            TEXT,
  account_holder  TEXT,
  wallet_phone    TEXT,
  wallet_provider TEXT CHECK (wallet_provider IN ('vodafone_cash','etisalat_cash','orange_cash','we_pay','cib_smart_wallet')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.driver_payment_info ENABLE ROW LEVEL SECURITY;

-- Driver reads/manages own payment info
CREATE POLICY "driver_reads_own_payment_info"
  ON public.driver_payment_info FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "driver_inserts_own_payment_info"
  ON public.driver_payment_info FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "driver_updates_own_payment_info"
  ON public.driver_payment_info FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "driver_deletes_own_payment_info"
  ON public.driver_payment_info FOR DELETE
  USING (auth.uid() = driver_id);

-- Admin reads all payment info
CREATE POLICY "admin_reads_all_payment_info"
  ON public.driver_payment_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- 2. DRIVER WITHDRAWAL REQUESTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.driver_withdrawal_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL CHECK (amount >= 50),
  method            TEXT NOT NULL CHECK (method IN ('instapay','vodafone_cash','etisalat_cash','orange_cash','we_pay','cib_smart_wallet')),
  account_details   JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','completed','rejected')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  processed_at      TIMESTAMPTZ,
  processed_by      UUID REFERENCES auth.users(id),
  rejection_reason  TEXT
);

ALTER TABLE public.driver_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Driver reads own withdrawal requests
CREATE POLICY "driver_reads_own_withdrawals"
  ON public.driver_withdrawal_requests FOR SELECT
  USING (auth.uid() = driver_id);

-- Driver inserts own withdrawal requests
CREATE POLICY "driver_inserts_own_withdrawals"
  ON public.driver_withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Admin reads all withdrawal requests
CREATE POLICY "admin_reads_all_withdrawals"
  ON public.driver_withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

-- Admin updates all withdrawal requests (approve/reject/complete)
CREATE POLICY "admin_updates_all_withdrawals"
  ON public.driver_withdrawal_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

-- Indexes
CREATE INDEX idx_driver_withdrawals_driver_date
  ON public.driver_withdrawal_requests(driver_id, created_at DESC);

CREATE INDEX idx_driver_withdrawals_status
  ON public.driver_withdrawal_requests(status);


-- ═══════════════════════════════════════════════════════════════
-- 3. REDEEM DRIVER WALLET CODE — 7-layer security
--    Mirrors redeem_wallet_code() from migration 20 but for drivers
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.redeem_driver_wallet_code(
  p_code    TEXT,
  p_ip_hint TEXT DEFAULT NULL,
  p_region  TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code_row       RECORD;
  v_driver_id      UUID;
  v_failed_count   INTEGER;
  v_ip_failed      INTEGER;
  v_current_bal    NUMERIC;
  v_max_balance    NUMERIC := 50000;
  v_max_attempts   INTEGER := 5;
  v_ip_max_attempts INTEGER := 10;
  v_lockout_mins   INTEGER := 15;
  v_ip_lockout_mins INTEGER := 30;
  v_velocity       JSONB;
  v_verification   TEXT;
  v_high_value_threshold NUMERIC := 500;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 1: User-based Rate Limiting (5 fails / 15 min)
  -- ══════════════════════════════════════════════════════════
  SELECT COUNT(*) INTO v_failed_count
  FROM public.wallet_redemption_attempts
  WHERE user_id = v_driver_id
    AND success = FALSE
    AND created_at > NOW() - (v_lockout_mins || ' minutes')::INTERVAL;

  IF v_failed_count >= v_max_attempts THEN
    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('rate_limit_triggered', 'high', v_driver_id, jsonb_build_object(
      'failed_attempts', v_failed_count, 'ip_hint', p_ip_hint, 'lockout_mins', v_lockout_mins,
      'context', 'driver_redemption'
    ));

    INSERT INTO public.wallet_audit_log (actor_id, action, details)
    VALUES (v_driver_id, 'driver_redeem_blocked_rate_limit', jsonb_build_object(
      'failed_attempts', v_failed_count, 'ip_hint', p_ip_hint
    ));

    RETURN jsonb_build_object('success', false, 'error',
      'تم تجاوز الحد الأقصى للمحاولات. حاول مرة أخرى بعد ' || v_lockout_mins || ' دقيقة',
      'locked', true, 'retry_after_minutes', v_lockout_mins);
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 2: IP-based Rate Limiting (10 fails / 30 min)
  -- ══════════════════════════════════════════════════════════
  IF p_ip_hint IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_failed
    FROM public.wallet_redemption_attempts
    WHERE ip_hint = p_ip_hint
      AND success = FALSE
      AND created_at > NOW() - (v_ip_lockout_mins || ' minutes')::INTERVAL;

    IF v_ip_failed >= v_ip_max_attempts THEN
      INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
      VALUES ('ip_rate_limit', 'critical', v_driver_id, jsonb_build_object(
        'ip_hint', p_ip_hint, 'ip_failed_attempts', v_ip_failed,
        'context', 'driver_redemption'
      ));

      RETURN jsonb_build_object('success', false, 'error',
        'تم حظر هذا الجهاز مؤقتاً. حاول بعد ' || v_ip_lockout_mins || ' دقيقة',
        'locked', true, 'retry_after_minutes', v_ip_lockout_mins);
    END IF;
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 3: Velocity Check (3/hour, 10/day, 5000/hour)
  -- ══════════════════════════════════════════════════════════
  v_velocity := public.check_redemption_velocity(v_driver_id);
  IF (v_velocity->>'blocked')::BOOLEAN THEN
    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('suspicious_velocity', 'high', v_driver_id, v_velocity || jsonb_build_object('context', 'driver_redemption'));

    RETURN jsonb_build_object('success', false, 'error', v_velocity->>'message');
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- FIND & VALIDATE CODE
  -- ══════════════════════════════════════════════════════════
  SELECT * INTO v_code_row
  FROM public.wallet_codes
  WHERE code = UPPER(TRIM(p_code))
  FOR UPDATE;

  IF v_code_row IS NULL THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
    VALUES (v_driver_id, LEFT(UPPER(TRIM(p_code)), 4) || '****', FALSE, p_ip_hint);
    RETURN jsonb_build_object('success', false, 'error', 'الكود غير صحيح');
  END IF;

  IF v_code_row.is_used THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
    VALUES (v_driver_id, LEFT(v_code_row.code, 4) || '****', FALSE, p_ip_hint);
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مُستخدم بالفعل');
  END IF;

  IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < NOW() THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
    VALUES (v_driver_id, LEFT(v_code_row.code, 4) || '****', FALSE, p_ip_hint);
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود منتهي الصلاحية');
  END IF;

  IF v_code_row.approval_status IS NOT NULL AND v_code_row.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود غير مفعّل بعد');
  END IF;

  -- Check target type: must be 'driver' (not 'customer')
  IF v_code_row.target_type IS NOT NULL AND v_code_row.target_type <> 'driver' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مخصص للعملاء');
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 6: HMAC Signature Verification
  -- ══════════════════════════════════════════════════════════
  IF v_code_row.hmac_signature IS NOT NULL THEN
    IF NOT public.verify_code_hmac(v_code_row.code, v_code_row.amount, v_code_row.hmac_signature) THEN
      INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
      VALUES ('invalid_hmac', 'critical', v_driver_id, jsonb_build_object(
        'code_id', v_code_row.id, 'code_prefix', LEFT(v_code_row.code, 8),
        'ip_hint', p_ip_hint, 'context', 'driver_redemption'
      ));

      INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
      VALUES (v_driver_id, 'driver_hmac_verification_failed', v_code_row.id, jsonb_build_object(
        'code_prefix', LEFT(v_code_row.code, 8)
      ));

      RETURN jsonb_build_object('success', false, 'error', 'خطأ في التحقق من صحة الكود — تم تسجيل المحاولة');
    END IF;
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 5: Geographic Restriction
  -- ══════════════════════════════════════════════════════════
  IF v_code_row.allowed_region IS NOT NULL AND p_region IS NOT NULL THEN
    IF LOWER(v_code_row.allowed_region) <> LOWER(p_region) THEN
      INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
      VALUES ('geo_blocked', 'medium', v_driver_id, jsonb_build_object(
        'allowed_region', v_code_row.allowed_region, 'actual_region', p_region,
        'code_prefix', LEFT(v_code_row.code, 8), 'context', 'driver_redemption'
      ));

      RETURN jsonb_build_object('success', false, 'error', 'هذا الكود غير متاح في منطقتك');
    END IF;
  END IF;

  -- Prevent creator self-redeem
  IF v_code_row.created_by = v_driver_id THEN
    INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
    VALUES (v_driver_id, 'driver_self_redeem_attempt', v_code_row.id,
      jsonb_build_object('code', LEFT(v_code_row.code, 8)));
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك استخدام كود أنشأته بنفسك');
  END IF;

  -- Max wallet balance check
  SELECT COALESCE(SUM(amount), 0) INTO v_current_bal
  FROM public.driver_wallet_transactions
  WHERE driver_id = v_driver_id;

  IF (v_current_bal + v_code_row.amount) > v_max_balance THEN
    RETURN jsonb_build_object('success', false, 'error',
      'سيتجاوز رصيدك الحد الأقصى المسموح (' || v_max_balance || ' جنيه)',
      'current_balance', v_current_bal, 'max_balance', v_max_balance);
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 4: 2FA for High-Value Codes (>= 500)
  -- ══════════════════════════════════════════════════════════
  IF v_code_row.amount >= v_high_value_threshold THEN
    -- Generate 6-digit verification code
    v_verification := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Clean up old pending for this user+code
    DELETE FROM public.wallet_pending_redemptions
    WHERE user_id = v_driver_id AND code_id = v_code_row.id;

    INSERT INTO public.wallet_pending_redemptions (user_id, code_id, verification_code)
    VALUES (v_driver_id, v_code_row.id, v_verification);

    INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
    VALUES (v_driver_id, 'driver_2fa_required', v_code_row.id, jsonb_build_object(
      'amount', v_code_row.amount, 'threshold', v_high_value_threshold
    ));

    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('high_value_attempt', 'low', v_driver_id, jsonb_build_object(
      'amount', v_code_row.amount, 'code_prefix', LEFT(v_code_row.code, 8),
      'context', 'driver_redemption'
    ));

    RETURN jsonb_build_object(
      'success', false,
      'requires_2fa', true,
      'code_id', v_code_row.id,
      'amount', v_code_row.amount,
      'verification_hint', LEFT(v_verification, 2) || '****',
      'message', 'هذا الكود بمبلغ كبير — يتطلب تأكيد إضافي. تم إرسال رمز التحقق'
    );
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- REDEEM (Low-value codes — direct redemption)
  -- ══════════════════════════════════════════════════════════
  UPDATE public.wallet_codes
  SET is_used = TRUE, redeemed_by = v_driver_id, redeemed_at = NOW()
  WHERE id = v_code_row.id;

  INSERT INTO public.driver_wallet_transactions (driver_id, amount, type, description, reference_id)
  VALUES (v_driver_id, v_code_row.amount, 'topup',
          'شحن المحفظة — كود #' || SUBSTRING(v_code_row.code, 1, 8),
          v_code_row.id);

  INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
  VALUES (v_driver_id, LEFT(v_code_row.code, 4) || '****', TRUE, p_ip_hint);

  INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
  VALUES (v_driver_id, 'driver_code_redeemed', v_code_row.id, jsonb_build_object(
    'amount', v_code_row.amount, 'code_prefix', LEFT(v_code_row.code, 8),
    'ip_hint', p_ip_hint, 'region', p_region
  ));

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_code_row.amount,
    'message', 'تم شحن المحفظة بنجاح'
  );
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 4. CONFIRM DRIVER WALLET REDEMPTION (2FA)
--    Mirrors confirm_wallet_redemption() but for driver wallet
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.confirm_driver_wallet_redemption(
  p_code_id          UUID,
  p_verification_code TEXT,
  p_ip_hint          TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pending      RECORD;
  v_code_row     RECORD;
  v_driver_id    UUID;
  v_current_bal  NUMERIC;
  v_max_balance  NUMERIC := 50000;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- Find active pending redemption
  SELECT * INTO v_pending
  FROM public.wallet_pending_redemptions
  WHERE user_id = v_driver_id
    AND code_id = p_code_id
    AND verified = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_pending IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يوجد طلب تأكيد نشط أو انتهت صلاحيته. أعد إدخال الكود');
  END IF;

  -- Check max verification attempts (3)
  IF v_pending.attempts >= v_pending.max_attempts THEN
    -- Expire the pending redemption
    UPDATE public.wallet_pending_redemptions SET verified = FALSE, expires_at = NOW() WHERE id = v_pending.id;

    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('2fa_max_attempts', 'high', v_driver_id, jsonb_build_object(
      'code_id', p_code_id, 'attempts', v_pending.attempts, 'context', 'driver_redemption'
    ));

    RETURN jsonb_build_object('success', false, 'error', 'تم تجاوز عدد محاولات التأكيد. أعد إدخال الكود من البداية');
  END IF;

  -- Verify the code
  IF v_pending.verification_code <> p_verification_code THEN
    -- Increment attempts
    UPDATE public.wallet_pending_redemptions
    SET attempts = attempts + 1
    WHERE id = v_pending.id;

    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('2fa_failed', 'high', v_driver_id, jsonb_build_object(
      'code_id', p_code_id, 'attempt_number', v_pending.attempts + 1, 'context', 'driver_redemption'
    ));

    RETURN jsonb_build_object('success', false, 'error',
      'رمز التحقق غير صحيح. المحاولات المتبقية: ' || (v_pending.max_attempts - v_pending.attempts - 1));
  END IF;

  -- Mark as verified
  UPDATE public.wallet_pending_redemptions SET verified = TRUE WHERE id = v_pending.id;

  -- Get the code with lock
  SELECT * INTO v_code_row
  FROM public.wallet_codes
  WHERE id = p_code_id
  FOR UPDATE;

  IF v_code_row IS NULL OR v_code_row.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكود غير متاح أو تم استخدامه');
  END IF;

  -- HMAC re-verify
  IF v_code_row.hmac_signature IS NOT NULL THEN
    IF NOT public.verify_code_hmac(v_code_row.code, v_code_row.amount, v_code_row.hmac_signature) THEN
      INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
      VALUES ('invalid_hmac', 'critical', v_driver_id, jsonb_build_object(
        'code_id', v_code_row.id, 'context', 'driver_2fa_confirm'
      ));
      RETURN jsonb_build_object('success', false, 'error', 'خطأ في التحقق من صحة الكود');
    END IF;
  END IF;

  -- Balance check
  SELECT COALESCE(SUM(amount), 0) INTO v_current_bal
  FROM public.driver_wallet_transactions
  WHERE driver_id = v_driver_id;

  IF (v_current_bal + v_code_row.amount) > v_max_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'سيتجاوز رصيدك الحد الأقصى المسموح');
  END IF;

  -- REDEEM
  UPDATE public.wallet_codes
  SET is_used = TRUE, redeemed_by = v_driver_id, redeemed_at = NOW()
  WHERE id = v_code_row.id;

  INSERT INTO public.driver_wallet_transactions (driver_id, amount, type, description, reference_id)
  VALUES (v_driver_id, v_code_row.amount, 'topup',
          'شحن المحفظة (مؤكد) — كود #' || SUBSTRING(v_code_row.code, 1, 8),
          v_code_row.id);

  INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
  VALUES (v_driver_id, LEFT(v_code_row.code, 4) || '****', TRUE, p_ip_hint);

  INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
  VALUES (v_driver_id, 'driver_code_redeemed_2fa', v_code_row.id, jsonb_build_object(
    'amount', v_code_row.amount, 'code_prefix', LEFT(v_code_row.code, 8),
    '2fa_verified', true, 'ip_hint', p_ip_hint
  ));

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_code_row.amount,
    'message', 'تم شحن المحفظة بنجاح بعد التأكيد'
  );
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 5. REQUEST DRIVER WITHDRAWAL
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.request_driver_withdrawal(
  p_amount          NUMERIC,
  p_method          TEXT,
  p_account_details JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_driver_id UUID;
  v_balance   NUMERIC;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  IF p_amount < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب 50 جنيه');
  END IF;

  -- Get current balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.driver_wallet_transactions WHERE driver_id = v_driver_id;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيدك غير كافي', 'balance', v_balance);
  END IF;

  -- Deduct from wallet
  INSERT INTO public.driver_wallet_transactions (driver_id, amount, type, description)
  VALUES (v_driver_id, -p_amount, 'payout', 'طلب سحب — ' || p_method);

  -- Create withdrawal request
  INSERT INTO public.driver_withdrawal_requests (driver_id, amount, method, account_details)
  VALUES (v_driver_id, p_amount, p_method, p_account_details);

  RETURN jsonb_build_object('success', true, 'message', 'تم إرسال طلب السحب بنجاح');
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════
COMMENT ON TABLE public.driver_payment_info IS 'Driver bank/wallet payment details for withdrawals';
COMMENT ON TABLE public.driver_withdrawal_requests IS 'Driver withdrawal requests with status tracking';
COMMENT ON FUNCTION public.redeem_driver_wallet_code IS '7-layer secured wallet code redemption for drivers (mirrors redeem_wallet_code)';
COMMENT ON FUNCTION public.confirm_driver_wallet_redemption IS '2FA confirmation for high-value driver wallet code redemptions';
COMMENT ON FUNCTION public.request_driver_withdrawal IS 'Driver withdrawal request — deducts balance and creates request record';
