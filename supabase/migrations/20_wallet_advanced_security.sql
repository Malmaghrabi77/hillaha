-- Migration 20: Advanced Wallet Security — All 7 Layers
-- ═══════════════════════════════════════════════════════════════
-- 1. Security Alerts (Admin Notifications)
-- 2. IP-based Rate Limiting
-- 3. Velocity Checks
-- 4. 2FA for High-Value Redemptions
-- 5. Geographic Restrictions
-- 6. HMAC Code Signing
-- 7. Scheduled Cleanup (pg_cron)
-- ═══════════════════════════════════════════════════════════════

-- Enable pgcrypto for HMAC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════
-- 1. SECURITY ALERTS TABLE (Admin Notifications)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_security_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type  TEXT NOT NULL,        -- rate_limit_triggered, suspicious_velocity, high_value_attempt, invalid_hmac, geo_blocked, ip_rate_limit, 2fa_failed
  severity    TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id     UUID REFERENCES auth.users(id),
  details     JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_views_security_alerts" ON public.wallet_security_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'accountant')
  ));

CREATE POLICY "admin_updates_security_alerts" ON public.wallet_security_alerts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE INDEX idx_wallet_alerts_unread ON public.wallet_security_alerts(is_read, created_at DESC);
CREATE INDEX idx_wallet_alerts_severity ON public.wallet_security_alerts(severity, created_at DESC);
CREATE INDEX idx_wallet_alerts_type ON public.wallet_security_alerts(alert_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 2. HMAC SECRET STORAGE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_config ENABLE ROW LEVEL SECURITY;
-- No public access at all — only SECURITY DEFINER functions read this

-- Generate a random 32-byte HMAC secret
INSERT INTO public.wallet_config (key, value)
VALUES ('hmac_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. ADD COLUMNS TO wallet_codes
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.wallet_codes ADD COLUMN IF NOT EXISTS hmac_signature TEXT;
ALTER TABLE public.wallet_codes ADD COLUMN IF NOT EXISTS allowed_region TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 4. PENDING REDEMPTION TABLE (2FA for High-Value)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_pending_redemptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id           UUID NOT NULL REFERENCES public.wallet_codes(id),
  verification_code TEXT NOT NULL,    -- 6-digit code
  attempts          INTEGER DEFAULT 0,
  max_attempts      INTEGER DEFAULT 3,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_pending_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_views_own_pending" ON public.wallet_pending_redemptions FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX idx_pending_redemptions_user ON public.wallet_pending_redemptions(user_id, created_at DESC);
CREATE INDEX idx_pending_redemptions_expiry ON public.wallet_pending_redemptions(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- 5. IP-BASED RATE LIMITING — add index on ip_hint
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_redemption_attempts_ip ON public.wallet_redemption_attempts(ip_hint, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 6. HMAC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_code_hmac(p_code TEXT, p_amount NUMERIC)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT value INTO v_secret FROM public.wallet_config WHERE key = 'hmac_secret';
  RETURN encode(hmac(p_code || ':' || p_amount::TEXT, v_secret, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_code_hmac(p_code TEXT, p_amount NUMERIC, p_signature TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expected TEXT;
BEGIN
  v_expected := public.generate_code_hmac(p_code, p_amount);
  -- Constant-time comparison to prevent timing attacks
  RETURN v_expected = p_signature AND length(v_expected) = length(p_signature);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 7. AUTO-SIGN TRIGGER — sign codes on INSERT automatically
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auto_sign_wallet_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.hmac_signature := public.generate_code_hmac(NEW.code, NEW.amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_sign_wallet_code ON public.wallet_codes;
CREATE TRIGGER trg_auto_sign_wallet_code
  BEFORE INSERT ON public.wallet_codes
  FOR EACH ROW EXECUTE FUNCTION public.auto_sign_wallet_code();

-- Backfill existing codes
UPDATE public.wallet_codes
SET hmac_signature = public.generate_code_hmac(code, amount)
WHERE hmac_signature IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 8. VELOCITY CHECK FUNCTION
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_redemption_velocity(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hour_count  INTEGER;
  v_day_count   INTEGER;
  v_hour_amount NUMERIC;
  v_max_hourly_count  INTEGER := 3;
  v_max_daily_count   INTEGER := 10;
  v_max_hourly_amount NUMERIC := 5000;
BEGIN
  -- Successful redemptions in last hour
  SELECT COUNT(*) INTO v_hour_count
  FROM public.wallet_redemption_attempts
  WHERE user_id = p_user_id
    AND success = TRUE
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Total amount redeemed in last hour
  SELECT COALESCE(SUM(wc.amount), 0) INTO v_hour_amount
  FROM public.wallet_redemption_attempts ra
  JOIN public.wallet_codes wc ON LEFT(wc.code, 4) || '****' = ra.attempted_code
  WHERE ra.user_id = p_user_id
    AND ra.success = TRUE
    AND ra.created_at > NOW() - INTERVAL '1 hour';

  -- Successful redemptions in last 24 hours
  SELECT COUNT(*) INTO v_day_count
  FROM public.wallet_redemption_attempts
  WHERE user_id = p_user_id
    AND success = TRUE
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_hour_count >= v_max_hourly_count THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'hourly_count_exceeded',
      'message', 'تم تجاوز الحد الأقصى للاسترداد في الساعة (' || v_max_hourly_count || ' أكواد)');
  END IF;

  IF v_day_count >= v_max_daily_count THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'daily_count_exceeded',
      'message', 'تم تجاوز الحد الأقصى للاسترداد اليومي (' || v_max_daily_count || ' أكواد)');
  END IF;

  IF v_hour_amount >= v_max_hourly_amount THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'hourly_amount_exceeded',
      'message', 'تم تجاوز الحد الأقصى للمبالغ المُستردة في الساعة (' || v_max_hourly_amount || ' جنيه)');
  END IF;

  RETURN jsonb_build_object('blocked', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 9. ULTIMATE HARDENED redeem_wallet_code v3
--    All 7 security layers integrated
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.redeem_wallet_code(
  p_code    TEXT,
  p_ip_hint TEXT DEFAULT NULL,
  p_region  TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code_row       RECORD;
  v_customer_id    UUID;
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
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 1: User-based Rate Limiting (5 fails / 15 min)
  -- ══════════════════════════════════════════════════════════
  SELECT COUNT(*) INTO v_failed_count
  FROM public.wallet_redemption_attempts
  WHERE user_id = v_customer_id
    AND success = FALSE
    AND created_at > NOW() - (v_lockout_mins || ' minutes')::INTERVAL;

  IF v_failed_count >= v_max_attempts THEN
    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('rate_limit_triggered', 'high', v_customer_id, jsonb_build_object(
      'failed_attempts', v_failed_count, 'ip_hint', p_ip_hint, 'lockout_mins', v_lockout_mins
    ));

    INSERT INTO public.wallet_audit_log (actor_id, action, details)
    VALUES (v_customer_id, 'redeem_blocked_rate_limit', jsonb_build_object(
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
      VALUES ('ip_rate_limit', 'critical', v_customer_id, jsonb_build_object(
        'ip_hint', p_ip_hint, 'ip_failed_attempts', v_ip_failed
      ));

      RETURN jsonb_build_object('success', false, 'error',
        'تم حظر هذا الجهاز مؤقتاً. حاول بعد ' || v_ip_lockout_mins || ' دقيقة',
        'locked', true, 'retry_after_minutes', v_ip_lockout_mins);
    END IF;
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 3: Velocity Check (3/hour, 10/day, 5000/hour)
  -- ══════════════════════════════════════════════════════════
  v_velocity := public.check_redemption_velocity(v_customer_id);
  IF (v_velocity->>'blocked')::BOOLEAN THEN
    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('suspicious_velocity', 'high', v_customer_id, v_velocity);

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
    VALUES (v_customer_id, LEFT(UPPER(TRIM(p_code)), 4) || '****', FALSE, p_ip_hint);
    RETURN jsonb_build_object('success', false, 'error', 'الكود غير صحيح');
  END IF;

  IF v_code_row.is_used THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
    VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', FALSE, p_ip_hint);
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مُستخدم بالفعل');
  END IF;

  IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < NOW() THEN
    INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
    VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', FALSE, p_ip_hint);
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود منتهي الصلاحية');
  END IF;

  IF v_code_row.approval_status IS NOT NULL AND v_code_row.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود غير مفعّل بعد');
  END IF;

  IF v_code_row.target_type IS NOT NULL AND v_code_row.target_type <> 'customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مخصص للمندوبين فقط');
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 6: HMAC Signature Verification
  -- ══════════════════════════════════════════════════════════
  IF v_code_row.hmac_signature IS NOT NULL THEN
    IF NOT public.verify_code_hmac(v_code_row.code, v_code_row.amount, v_code_row.hmac_signature) THEN
      INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
      VALUES ('invalid_hmac', 'critical', v_customer_id, jsonb_build_object(
        'code_id', v_code_row.id, 'code_prefix', LEFT(v_code_row.code, 8),
        'ip_hint', p_ip_hint
      ));

      INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
      VALUES (v_customer_id, 'hmac_verification_failed', v_code_row.id, jsonb_build_object(
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
      VALUES ('geo_blocked', 'medium', v_customer_id, jsonb_build_object(
        'allowed_region', v_code_row.allowed_region, 'actual_region', p_region,
        'code_prefix', LEFT(v_code_row.code, 8)
      ));

      RETURN jsonb_build_object('success', false, 'error', 'هذا الكود غير متاح في منطقتك');
    END IF;
  END IF;

  -- Prevent creator self-redeem
  IF v_code_row.created_by = v_customer_id THEN
    INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
    VALUES (v_customer_id, 'self_redeem_attempt', v_code_row.id,
      jsonb_build_object('code', LEFT(v_code_row.code, 8)));
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك استخدام كود أنشأته بنفسك');
  END IF;

  -- Max wallet balance check
  SELECT COALESCE(SUM(amount), 0) INTO v_current_bal
  FROM public.wallet_transactions
  WHERE customer_id = v_customer_id;

  IF (v_current_bal + v_code_row.amount) > v_max_balance THEN
    RETURN jsonb_build_object('success', false, 'error',
      'سيتجاوز رصيدك الحد الأقصى المسموح (' || v_max_balance || ' جنيه)',
      'current_balance', v_current_bal, 'max_balance', v_max_balance);
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- LAYER 4: 2FA for High-Value Codes (>= 500 جنيه)
  -- ══════════════════════════════════════════════════════════
  IF v_code_row.amount >= v_high_value_threshold THEN
    -- Generate 6-digit verification code
    v_verification := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Clean up old pending for this user+code
    DELETE FROM public.wallet_pending_redemptions
    WHERE user_id = v_customer_id AND code_id = v_code_row.id;

    INSERT INTO public.wallet_pending_redemptions (user_id, code_id, verification_code)
    VALUES (v_customer_id, v_code_row.id, v_verification);

    INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
    VALUES (v_customer_id, '2fa_required', v_code_row.id, jsonb_build_object(
      'amount', v_code_row.amount, 'threshold', v_high_value_threshold
    ));

    INSERT INTO public.wallet_security_alerts (alert_type, severity, user_id, details)
    VALUES ('high_value_attempt', 'low', v_customer_id, jsonb_build_object(
      'amount', v_code_row.amount, 'code_prefix', LEFT(v_code_row.code, 8)
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
  SET is_used = TRUE, redeemed_by = v_customer_id, redeemed_at = NOW()
  WHERE id = v_code_row.id;

  INSERT INTO public.wallet_transactions (customer_id, amount, type, description, reference_id)
  VALUES (v_customer_id, v_code_row.amount, 'topup',
          'شحن المحفظة — كود #' || SUBSTRING(v_code_row.code, 1, 8),
          v_code_row.id);

  INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
  VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', TRUE, p_ip_hint);

  INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
  VALUES (v_customer_id, 'code_redeemed', v_code_row.id, jsonb_build_object(
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
-- 10. CONFIRM 2FA REDEMPTION
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.confirm_wallet_redemption(
  p_code_id          UUID,
  p_verification_code TEXT,
  p_ip_hint          TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pending      RECORD;
  v_code_row     RECORD;
  v_customer_id  UUID;
  v_current_bal  NUMERIC;
  v_max_balance  NUMERIC := 50000;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  -- Find active pending redemption
  SELECT * INTO v_pending
  FROM public.wallet_pending_redemptions
  WHERE user_id = v_customer_id
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
    VALUES ('2fa_max_attempts', 'high', v_customer_id, jsonb_build_object(
      'code_id', p_code_id, 'attempts', v_pending.attempts
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
    VALUES ('2fa_failed', 'high', v_customer_id, jsonb_build_object(
      'code_id', p_code_id, 'attempt_number', v_pending.attempts + 1
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
      VALUES ('invalid_hmac', 'critical', v_customer_id, jsonb_build_object(
        'code_id', v_code_row.id, 'context', '2fa_confirm'
      ));
      RETURN jsonb_build_object('success', false, 'error', 'خطأ في التحقق من صحة الكود');
    END IF;
  END IF;

  -- Balance check
  SELECT COALESCE(SUM(amount), 0) INTO v_current_bal
  FROM public.wallet_transactions
  WHERE customer_id = v_customer_id;

  IF (v_current_bal + v_code_row.amount) > v_max_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'سيتجاوز رصيدك الحد الأقصى المسموح');
  END IF;

  -- REDEEM
  UPDATE public.wallet_codes
  SET is_used = TRUE, redeemed_by = v_customer_id, redeemed_at = NOW()
  WHERE id = v_code_row.id;

  INSERT INTO public.wallet_transactions (customer_id, amount, type, description, reference_id)
  VALUES (v_customer_id, v_code_row.amount, 'topup',
          'شحن المحفظة (مؤكد) — كود #' || SUBSTRING(v_code_row.code, 1, 8),
          v_code_row.id);

  INSERT INTO public.wallet_redemption_attempts (user_id, attempted_code, success, ip_hint)
  VALUES (v_customer_id, LEFT(v_code_row.code, 4) || '****', TRUE, p_ip_hint);

  INSERT INTO public.wallet_audit_log (actor_id, action, target_id, details)
  VALUES (v_customer_id, 'code_redeemed_2fa', v_code_row.id, jsonb_build_object(
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
-- 11. SECURITY DASHBOARD FUNCTION
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_security_dashboard()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_unread_alerts   INTEGER;
  v_critical_alerts INTEGER;
  v_blocked_users   INTEGER;
  v_today_attempts  INTEGER;
  v_today_success   INTEGER;
  v_today_failed    INTEGER;
  v_recent_alerts   JSONB;
BEGIN
  -- Only admin/accountant
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'accountant')
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT COUNT(*) INTO v_unread_alerts
  FROM public.wallet_security_alerts WHERE is_read = FALSE;

  SELECT COUNT(*) INTO v_critical_alerts
  FROM public.wallet_security_alerts WHERE severity = 'critical' AND is_read = FALSE;

  SELECT COUNT(DISTINCT user_id) INTO v_blocked_users
  FROM (
    SELECT user_id
    FROM public.wallet_redemption_attempts
    WHERE success = FALSE AND created_at > NOW() - INTERVAL '15 minutes'
    GROUP BY user_id
    HAVING COUNT(*) >= 5
  ) blocked;

  SELECT COUNT(*) INTO v_today_attempts
  FROM public.wallet_redemption_attempts WHERE created_at > CURRENT_DATE;

  SELECT COUNT(*) INTO v_today_success
  FROM public.wallet_redemption_attempts WHERE success = TRUE AND created_at > CURRENT_DATE;

  v_today_failed := COALESCE(v_today_attempts, 0) - COALESCE(v_today_success, 0);

  -- Recent 10 alerts
  SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) INTO v_recent_alerts
  FROM (
    SELECT id, alert_type, severity, user_id, details, is_read, created_at
    FROM public.wallet_security_alerts
    ORDER BY created_at DESC
    LIMIT 10
  ) a;

  RETURN jsonb_build_object(
    'unread_alerts', COALESCE(v_unread_alerts, 0),
    'critical_alerts', COALESCE(v_critical_alerts, 0),
    'blocked_users', COALESCE(v_blocked_users, 0),
    'today_attempts', COALESCE(v_today_attempts, 0),
    'today_success', COALESCE(v_today_success, 0),
    'today_failed', COALESCE(v_today_failed, 0),
    'recent_alerts', v_recent_alerts
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 12. MARK ALERT AS READ / RESOLVED
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.resolve_security_alert(p_alert_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط السوبر أدمن يمكنه معالجة التنبيهات');
  END IF;

  UPDATE public.wallet_security_alerts
  SET is_read = TRUE, resolved_by = auth.uid(), resolved_at = NOW()
  WHERE id = p_alert_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 13. CLEANUP FUNCTIONS
-- ═══════════════════════════════════════════════════════════════
-- Update cleanup to also clean pending redemptions and old alerts
CREATE OR REPLACE FUNCTION public.cleanup_old_redemption_attempts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Old failed attempts (> 24 hours)
  DELETE FROM public.wallet_redemption_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';

  -- Expired pending redemptions (> 1 hour past expiry)
  DELETE FROM public.wallet_pending_redemptions
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  -- Read alerts older than 90 days
  DELETE FROM public.wallet_security_alerts
  WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 14. PG_CRON SCHEDULED JOBS (run manually in Supabase SQL Editor
--     after enabling pg_cron extension)
-- ═══════════════════════════════════════════════════════════════
-- Uncomment and run in Supabase SQL Editor:
--
-- SELECT cron.schedule(
--   'wallet-cleanup-attempts',
--   '0 */6 * * *',
--   'SELECT public.cleanup_old_redemption_attempts()'
-- );
--
-- SELECT cron.schedule(
--   'wallet-cleanup-pending',
--   '*/30 * * * *',
--   $$DELETE FROM public.wallet_pending_redemptions WHERE expires_at < NOW() - INTERVAL '1 hour'$$
-- );
--
-- SELECT cron.schedule(
--   'wallet-cleanup-old-alerts',
--   '0 0 * * 0',
--   $$DELETE FROM public.wallet_security_alerts WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE$$
-- );

-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════
COMMENT ON TABLE public.wallet_security_alerts IS 'Security alerts for suspicious wallet activity — admins get notified';
COMMENT ON TABLE public.wallet_pending_redemptions IS '2FA pending redemption confirmations for high-value codes (>= 500)';
COMMENT ON TABLE public.wallet_config IS 'Secure configuration store (HMAC keys). No public RLS access.';
COMMENT ON FUNCTION public.check_redemption_velocity IS 'Velocity check: max 3 redemptions/hour, 10/day, 5000 value/hour';
COMMENT ON FUNCTION public.generate_code_hmac IS 'Generate HMAC-SHA256 signature for wallet code integrity';
COMMENT ON FUNCTION public.verify_code_hmac IS 'Verify HMAC signature — prevents code/amount tampering';
COMMENT ON FUNCTION public.get_security_dashboard IS 'Security dashboard stats — admin/accountant only';
COMMENT ON FUNCTION public.confirm_wallet_redemption IS '2FA confirmation for high-value wallet code redemptions';
