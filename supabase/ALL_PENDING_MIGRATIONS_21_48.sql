-- ============================================
-- Migration: 21_driver_registration_upgrade.sql
-- ============================================
-- Migration #21: Driver Registration Upgrade
-- Professional multi-step registration with document verification

-- ============================================================
-- 1. Create driver_applications table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal info
  full_name           text NOT NULL,
  phone               text NOT NULL,
  email               text NOT NULL,

  -- Vehicle info
  vehicle_type        text NOT NULL CHECK (vehicle_type IN ('car', 'scooter', 'bicycle')),
  vehicle_plate       text,

  -- Identity document
  identity_type       text NOT NULL CHECK (identity_type IN ('national_id', 'passport')),
  identity_number     text NOT NULL,
  identity_photo_url  text NOT NULL,

  -- Vehicle license (NULL for bicycle)
  license_number      text,
  license_expiry_date date,
  license_photo_url   text,

  -- Vehicle & selfie photos
  vehicle_photo_url   text,
  selfie_url          text NOT NULL,

  -- OCR result from license scan
  ocr_result          text,

  -- Application status
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'documents_expired')),
  reviewed_by         uuid REFERENCES auth.users(id),
  reviewed_at         timestamptz,
  rejection_reason    text,

  -- Metadata
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Add driver columns to profiles
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS driver_application_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_delivery_distance_km numeric(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- ============================================================
-- 3. Create driver-documents storage bucket (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. RLS Policies for driver_applications
-- ============================================================

-- Driver reads own application
DROP POLICY IF EXISTS "driver_reads_own_application" ON public.driver_applications;
CREATE POLICY "driver_reads_own_application"
  ON public.driver_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Driver creates own application
DROP POLICY IF EXISTS "driver_creates_own_application" ON public.driver_applications;
CREATE POLICY "driver_creates_own_application"
  ON public.driver_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Driver updates own pending application
DROP POLICY IF EXISTS "driver_updates_own_pending_application" ON public.driver_applications;
CREATE POLICY "driver_updates_own_pending_application"
  ON public.driver_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admin reads all applications
DROP POLICY IF EXISTS "admin_reads_all_applications" ON public.driver_applications;
CREATE POLICY "admin_reads_all_applications"
  ON public.driver_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admin updates any application
DROP POLICY IF EXISTS "admin_updates_applications" ON public.driver_applications;
CREATE POLICY "admin_updates_applications"
  ON public.driver_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 5. Storage RLS for driver-documents bucket
-- ============================================================

-- Owner can read own documents
DROP POLICY IF EXISTS "driver_docs_owner_read" ON storage.objects;
CREATE POLICY "driver_docs_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'driver-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can upload own documents
DROP POLICY IF EXISTS "driver_docs_owner_insert" ON storage.objects;
CREATE POLICY "driver_docs_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all documents
DROP POLICY IF EXISTS "driver_docs_admin_read" ON storage.objects;
CREATE POLICY "driver_docs_admin_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'driver-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_driver_applications_status
  ON public.driver_applications(status);
CREATE INDEX IF NOT EXISTS idx_driver_applications_user
  ON public.driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_approved
  ON public.profiles(role, is_approved) WHERE role = 'driver';


-- ============================================
-- Migration: 22_driver_wallet_and_withdrawals.sql
-- ============================================
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
DROP POLICY IF EXISTS "driver_reads_own_payment_info" ON public.driver_payment_info;
CREATE POLICY "driver_reads_own_payment_info"
  ON public.driver_payment_info FOR SELECT
  USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "driver_inserts_own_payment_info" ON public.driver_payment_info;
CREATE POLICY "driver_inserts_own_payment_info"
  ON public.driver_payment_info FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "driver_updates_own_payment_info" ON public.driver_payment_info;
CREATE POLICY "driver_updates_own_payment_info"
  ON public.driver_payment_info FOR UPDATE
  USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "driver_deletes_own_payment_info" ON public.driver_payment_info;
CREATE POLICY "driver_deletes_own_payment_info"
  ON public.driver_payment_info FOR DELETE
  USING (auth.uid() = driver_id);

-- Admin reads all payment info
DROP POLICY IF EXISTS "admin_reads_all_payment_info" ON public.driver_payment_info;
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
DROP POLICY IF EXISTS "driver_reads_own_withdrawals" ON public.driver_withdrawal_requests;
CREATE POLICY "driver_reads_own_withdrawals"
  ON public.driver_withdrawal_requests FOR SELECT
  USING (auth.uid() = driver_id);

-- Driver inserts own withdrawal requests
DROP POLICY IF EXISTS "driver_inserts_own_withdrawals" ON public.driver_withdrawal_requests;
CREATE POLICY "driver_inserts_own_withdrawals"
  ON public.driver_withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Admin reads all withdrawal requests
DROP POLICY IF EXISTS "admin_reads_all_withdrawals" ON public.driver_withdrawal_requests;
CREATE POLICY "admin_reads_all_withdrawals"
  ON public.driver_withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

-- Admin updates all withdrawal requests (approve/reject/complete)
DROP POLICY IF EXISTS "admin_updates_all_withdrawals" ON public.driver_withdrawal_requests;
CREATE POLICY "admin_updates_all_withdrawals"
  ON public.driver_withdrawal_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_withdrawals_driver_date
  ON public.driver_withdrawal_requests(driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_withdrawals_status
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


-- ============================================
-- Migration: 23_driver_chat_support.sql
-- ============================================
-- Migration 23: Driver Chat & Support
-- ═══════════════════════════════════════════════════════════════
-- 1. Create messages table (if not exists) — order chat
-- 2. Create support_tickets table (if not exists)
-- 3. Create support_messages table (if not exists)
-- 4. RLS policies for drivers on all chat tables
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. MESSAGES TABLE (order chat: customer ↔ driver)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id   UUID,
  message      TEXT NOT NULL,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('customer', 'driver', 'partner')),
  sender_id    UUID REFERENCES auth.users(id),
  sender_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_partner_id ON public.messages(partner_id, created_at);

-- Customer reads messages for their orders
DO $$ BEGIN
  DROP POLICY IF EXISTS "customer_reads_order_messages" ON public.messages;
CREATE POLICY "customer_reads_order_messages"
  ON public.messages FOR SELECT
    USING (
      order_id IN (
        SELECT id FROM public.orders WHERE customer_id = auth.uid()
      )
      OR partner_id IN (
        SELECT id FROM public.partners WHERE id = partner_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customer sends messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "customer_sends_messages" ON public.messages;
CREATE POLICY "customer_sends_messages"
  ON public.messages FOR INSERT
    WITH CHECK (
      sender_type = 'customer' AND sender_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Driver reads messages for their orders
DO $$ BEGIN
  DROP POLICY IF EXISTS "driver_reads_order_messages" ON public.messages;
CREATE POLICY "driver_reads_order_messages"
  ON public.messages FOR SELECT
    USING (
      order_id IN (
        SELECT id FROM public.orders WHERE driver_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Driver sends messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "driver_sends_order_messages" ON public.messages;
CREATE POLICY "driver_sends_order_messages"
  ON public.messages FOR INSERT
    WITH CHECK (
      sender_type = 'driver'
      AND sender_id = auth.uid()
      AND order_id IN (
        SELECT id FROM public.orders WHERE driver_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partner reads messages for their store
DO $$ BEGIN
  DROP POLICY IF EXISTS "partner_reads_messages" ON public.messages;
CREATE POLICY "partner_reads_messages"
  ON public.messages FOR SELECT
    USING (
      partner_id IN (
        SELECT id FROM public.partners WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partner sends messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "partner_sends_messages" ON public.messages;
CREATE POLICY "partner_sends_messages"
  ON public.messages FOR INSERT
    WITH CHECK (
      sender_type = 'partner' AND sender_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin reads all messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_reads_all_messages" ON public.messages;
CREATE POLICY "admin_reads_all_messages"
  ON public.messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 2. SUPPORT TICKETS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, status);

-- User reads own tickets (covers both customers and drivers)
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_reads_own_tickets" ON public.support_tickets;
CREATE POLICY "user_reads_own_tickets"
  ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User creates tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_creates_tickets" ON public.support_tickets;
CREATE POLICY "user_creates_tickets"
  ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin reads all tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_reads_all_tickets" ON public.support_tickets;
CREATE POLICY "admin_reads_all_tickets"
  ON public.support_tickets FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin updates tickets (close/resolve)
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_updates_tickets" ON public.support_tickets;
CREATE POLICY "admin_updates_tickets"
  ON public.support_tickets FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 3. SUPPORT MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('customer', 'driver', 'partner', 'support')),
  sender_id    UUID REFERENCES auth.users(id),
  sender_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

-- User reads messages of own tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_reads_ticket_messages" ON public.support_messages;
CREATE POLICY "user_reads_ticket_messages"
  ON public.support_messages FOR SELECT
    USING (
      ticket_id IN (
        SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User sends messages on own tickets
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_sends_ticket_messages" ON public.support_messages;
CREATE POLICY "user_sends_ticket_messages"
  ON public.support_messages FOR INSERT
    WITH CHECK (
      sender_id = auth.uid()
      AND ticket_id IN (
        SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin/support reads all messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_reads_all_support_messages" ON public.support_messages;
CREATE POLICY "admin_reads_all_support_messages"
  ON public.support_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin/support sends messages on any ticket
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_sends_support_messages" ON public.support_messages;
CREATE POLICY "admin_sends_support_messages"
  ON public.support_messages FOR INSERT
    WITH CHECK (
      sender_type = 'support'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- ENABLE REALTIME FOR CHAT TABLES
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════
COMMENT ON TABLE public.messages IS 'Order chat messages between customer, driver, and partner';
COMMENT ON TABLE public.support_tickets IS 'Support tickets for customers and drivers';
COMMENT ON TABLE public.support_messages IS 'Messages within support tickets';


-- ============================================
-- Migration: 24_customer_service_role.sql
-- ============================================
-- Migration 24: Customer Service Role + Invitation Updates
-- ═══════════════════════════════════════════════════════════════

-- 1. Add 'customer_service' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer_service';

-- 2. Drop old CHECK constraint on profiles if exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Update admin_invitations admin_type constraint
DO $$ BEGIN
  ALTER TABLE public.admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'admin_invitations' AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%admin_type%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.admin_invitations DROP CONSTRAINT ' || r.constraint_name;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;
ALTER TABLE public.admin_invitations ADD CONSTRAINT admin_invitations_admin_type_check
  CHECK (admin_type IN ('regional_manager', 'regular_admin', 'accountant', 'customer_service'));

-- 4. RLS policies using role::text cast to avoid enum commit issue
DO $$ BEGIN
  DROP POLICY IF EXISTS "cs_reads_all_tickets" ON public.support_tickets;
CREATE POLICY "cs_reads_all_tickets"
  ON public.support_tickets FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cs_updates_tickets" ON public.support_tickets;
CREATE POLICY "cs_updates_tickets"
  ON public.support_tickets FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cs_reads_all_support_messages" ON public.support_messages;
CREATE POLICY "cs_reads_all_support_messages"
  ON public.support_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cs_sends_support_messages" ON public.support_messages;
CREATE POLICY "cs_sends_support_messages"
  ON public.support_messages FOR INSERT
    WITH CHECK (sender_type = 'support' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cs_reads_all_messages" ON public.messages;
CREATE POLICY "cs_reads_all_messages"
  ON public.messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Done


-- ============================================
-- Migration: 25_push_tokens.sql
-- ============================================
-- Migration 25: Push Tokens table
-- Stores Expo Push Tokens for customers and drivers

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,
  device_model TEXT,
  app_type TEXT NOT NULL DEFAULT 'customer' CHECK (app_type IN ('customer', 'driver')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one token per user per app
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_app
  ON push_tokens (user_id, app_type);

-- Index for looking up tokens by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_active
  ON push_tokens (is_active, app_type) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
DROP POLICY IF EXISTS "Users can manage own push tokens" ON push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get push tokens for a list of user IDs (used by Edge Functions)
CREATE OR REPLACE FUNCTION get_push_tokens(p_user_ids UUID[], p_app_type TEXT DEFAULT NULL)
RETURNS TABLE(user_id UUID, token TEXT, app_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pt.user_id, pt.token, pt.app_type
  FROM push_tokens pt
  WHERE pt.user_id = ANY(p_user_ids)
    AND pt.is_active = true
    AND (p_app_type IS NULL OR pt.app_type = p_app_type);
END;
$$;


-- ============================================
-- Migration: 26_pricing_and_wallets.sql
-- ============================================
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
DROP POLICY IF EXISTS "anyone reads service prices" ON public.service_prices;
CREATE POLICY "anyone reads service prices"
  ON public.service_prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "super_admin manages service prices" ON public.service_prices;
CREATE POLICY "super_admin manages service prices"
  ON public.service_prices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- price_change_requests: admin roles can read/insert, super_admin can update
DROP POLICY IF EXISTS "admins read price requests" ON public.price_change_requests;
CREATE POLICY "admins read price requests"
  ON public.price_change_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

DROP POLICY IF EXISTS "admins insert price requests" ON public.price_change_requests;
CREATE POLICY "admins insert price requests"
  ON public.price_change_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

DROP POLICY IF EXISTS "super_admin updates price requests" ON public.price_change_requests;
CREATE POLICY "super_admin updates price requests"
  ON public.price_change_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- price_change_logs: admin roles can read/insert
DROP POLICY IF EXISTS "admins read price logs" ON public.price_change_logs;
CREATE POLICY "admins read price logs"
  ON public.price_change_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

DROP POLICY IF EXISTS "admins insert price logs" ON public.price_change_logs;
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


-- ============================================
-- Migration: 27_payment_accounts.sql
-- ============================================
-- Migration 27: Add receiving account fields to payment_methods
-- يضيف حقول حساب الاستلام لكل طريقة دفع

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS receiving_account TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS receiving_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS receiving_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instructions_ar TEXT DEFAULT '';

-- Seed existing account data from platform_settings into payment_methods
UPDATE public.payment_methods
  SET receiving_account = (SELECT value FROM platform_settings WHERE key = 'instapay_account'),
      instructions_ar = 'افتح تطبيق InstaPay وحوّل المبلغ إلى الحساب التالي'
  WHERE code = 'instapay';

UPDATE public.payment_methods
  SET receiving_phone = (SELECT value FROM platform_settings WHERE key = 'etisalat_phone'),
      instructions_ar = 'حوّل المبلغ عبر خدمة E& (اتصالات) إلى الرقم التالي'
  WHERE code = 'etisalat_cash';

UPDATE public.payment_methods
  SET receiving_phone = (SELECT value FROM platform_settings WHERE key = 'vodafone_phone'),
      instructions_ar = 'حوّل المبلغ عبر فودافون كاش إلى الرقم التالي'
  WHERE code = 'vodafone_cash';

-- Set default instructions for other wallets
UPDATE public.payment_methods SET instructions_ar = 'حوّل المبلغ عبر محفظة أورانج إلى الرقم التالي' WHERE code = 'orange_money' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'حوّل المبلغ عبر محفظة WE إلى الرقم التالي' WHERE code = 'we_pay' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع عبر فوري باستخدام الرقم المرجعي التالي' WHERE code = 'fawry' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع بالبطاقة البنكية عبر بوابة الدفع الآمنة' WHERE code = 'credit_card' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع بالبطاقة عبر بوابة الدفع الآمنة' WHERE code = 'debit_card' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع عبر بطاقة ميزة الرقمية' WHERE code = 'meeza' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع نقداً للمندوب عند الاستلام' WHERE code = 'cash' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'سيتم خصم المبلغ من رصيد محفظتك' WHERE code = 'wallet' AND instructions_ar = '';

-- Allow admin role to read all payment methods (not just enabled)
DROP POLICY IF EXISTS "public can read enabled payment methods" ON public.payment_methods;
CREATE POLICY "public can read enabled payment methods"
  ON public.payment_methods
  FOR SELECT USING (
    is_enabled = true
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );


-- ============================================
-- Migration: 28_delivery_type_choice.sql
-- ============================================
-- Migration 28: Partner delivery type choice + commission adjustment
-- Partners can now choose "platform" (app driver) or "self" (own employee) delivery when accepting orders

-- 1. Add delivery_type column to orders
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'platform';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_type_check
    CHECK (delivery_type IN ('platform', 'self'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ensure app_commission and commission_rate columns exist on orders
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS app_commission NUMERIC(10,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.15;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Add self_delivery_commission_rate to partners (10% default — lower than platform 15%)
DO $$ BEGIN
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS self_delivery_commission_rate NUMERIC(4,3) DEFAULT 0.10;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Indexes for driver queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON public.orders(delivery_type);

CREATE INDEX IF NOT EXISTS idx_orders_driver_available
  ON public.orders(status, driver_id, delivery_type)
  WHERE status = 'ready' AND driver_id IS NULL AND delivery_type = 'platform';

-- 5. SECURITY DEFINER function: accept order with delivery type choice
CREATE OR REPLACE FUNCTION public.accept_order_with_delivery_type(
  p_order_id UUID,
  p_delivery_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_partner RECORD;
  v_rate NUMERIC;
  v_commission NUMERIC;
BEGIN
  -- Validate delivery type
  IF p_delivery_type NOT IN ('platform', 'self') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع توصيل غير صالح');
  END IF;

  -- Fetch order (must be pending)
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في حالة انتظار');
  END IF;

  -- Fetch partner for commission rates
  SELECT * INTO v_partner FROM public.partners WHERE id = v_order.partner_id;

  IF p_delivery_type = 'self' THEN
    -- Self delivery: reduced commission on subtotal only, partner keeps delivery fee
    v_rate := COALESCE(v_partner.self_delivery_commission_rate, 0.10);
    v_commission := v_order.subtotal * v_rate;
  ELSE
    -- Platform delivery: full commission on subtotal + delivery_fee
    v_rate := COALESCE(v_partner.commission_rate, 0.15);
    v_commission := (v_order.subtotal + v_order.delivery_fee) * v_rate;
  END IF;

  -- Update the order
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


-- ============================================
-- Migration: 29_payment_approval.sql
-- ============================================
-- Migration 29: High-value order payment approval workflow
-- Orders > 1000 EGP with wallet transfer must be approved by accountant/regional manager

-- 1. Add payment_approval_status to orders
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_approval_status TEXT DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_approval_check
    CHECK (payment_approval_status IS NULL OR payment_approval_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add approval metadata columns
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_approved_by UUID DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_approved_at TIMESTAMPTZ DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Index for pending payment approvals
CREATE INDEX IF NOT EXISTS idx_orders_payment_approval
  ON public.orders(payment_approval_status)
  WHERE payment_approval_status = 'pending';

-- 4. Function to approve high-value payment
CREATE OR REPLACE FUNCTION public.approve_order_payment(
  p_order_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND payment_approval_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في انتظار اعتماد الدفع');
  END IF;

  UPDATE public.orders SET
    payment_approval_status = 'approved',
    payment_approved_by     = p_admin_id,
    payment_approved_at     = now(),
    status                  = 'pending'  -- now visible to partner
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Function to reject high-value payment
CREATE OR REPLACE FUNCTION public.reject_order_payment(
  p_order_id UUID,
  p_admin_id UUID,
  p_reason   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND payment_approval_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في انتظار اعتماد الدفع');
  END IF;

  UPDATE public.orders SET
    payment_approval_status = 'rejected',
    payment_approved_by     = p_admin_id,
    payment_approved_at     = now(),
    payment_rejection_reason = p_reason,
    status                   = 'cancelled'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ============================================
-- Migration: 30_missing_rls_policies.sql
-- ============================================
-- Migration 30: Add missing RLS policies for unprotected tables
-- These tables were being written to by client-side code without RLS protection

-- ============================================================
-- 1. messages table
-- ============================================================
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select_own') THEN
    CREATE POLICY messages_select_own ON messages FOR SELECT
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_insert_own') THEN
    CREATE POLICY messages_insert_own ON messages FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

-- ============================================================
-- 2. support_messages table
-- ============================================================
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'support_messages_select_own') THEN
    CREATE POLICY support_messages_select_own ON support_messages FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'support_messages_insert_own') THEN
    CREATE POLICY support_messages_insert_own ON support_messages FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. reviews table
-- ============================================================
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_select_all') THEN
    CREATE POLICY reviews_select_all ON reviews FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_insert_own') THEN
    CREATE POLICY reviews_insert_own ON reviews FOR INSERT
      WITH CHECK (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_update_own') THEN
    CREATE POLICY reviews_update_own ON reviews FOR UPDATE
      USING (auth.uid() = customer_id);
  END IF;
END $$;

-- ============================================================
-- 4. addresses table
-- ============================================================
ALTER TABLE IF EXISTS addresses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'addresses_select_own') THEN
    CREATE POLICY addresses_select_own ON addresses FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'addresses_insert_own') THEN
    CREATE POLICY addresses_insert_own ON addresses FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'addresses_update_own') THEN
    CREATE POLICY addresses_update_own ON addresses FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'addresses_delete_own') THEN
    CREATE POLICY addresses_delete_own ON addresses FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 5. service_bookings table
-- ============================================================
ALTER TABLE IF EXISTS service_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_bookings' AND policyname = 'service_bookings_select_own') THEN
    CREATE POLICY service_bookings_select_own ON service_bookings FOR SELECT
      USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_bookings' AND policyname = 'service_bookings_insert_own') THEN
    CREATE POLICY service_bookings_insert_own ON service_bookings FOR INSERT
      WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;

-- ============================================================
-- 6. doctor_bookings table
-- ============================================================
ALTER TABLE IF EXISTS doctor_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_bookings' AND policyname = 'doctor_bookings_select_own') THEN
    CREATE POLICY doctor_bookings_select_own ON doctor_bookings FOR SELECT
      USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doctor_bookings' AND policyname = 'doctor_bookings_insert_own') THEN
    CREATE POLICY doctor_bookings_insert_own ON doctor_bookings FOR INSERT
      WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;

-- ============================================================
-- 7. prescription_requests table
-- ============================================================
ALTER TABLE IF EXISTS prescription_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescription_requests' AND policyname = 'prescription_requests_select_own') THEN
    CREATE POLICY prescription_requests_select_own ON prescription_requests FOR SELECT
      USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescription_requests' AND policyname = 'prescription_requests_insert_own') THEN
    CREATE POLICY prescription_requests_insert_own ON prescription_requests FOR INSERT
      WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;

-- ============================================================
-- 8. delivery_requests table
-- ============================================================
ALTER TABLE IF EXISTS delivery_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_requests' AND policyname = 'delivery_requests_select_own') THEN
    CREATE POLICY delivery_requests_select_own ON delivery_requests FOR SELECT
      USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_requests' AND policyname = 'delivery_requests_insert_own') THEN
    CREATE POLICY delivery_requests_insert_own ON delivery_requests FOR INSERT
      WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;

-- ============================================================
-- 9. user_coupons table
-- ============================================================
ALTER TABLE IF EXISTS user_coupons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_coupons' AND policyname = 'user_coupons_select_own') THEN
    CREATE POLICY user_coupons_select_own ON user_coupons FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_coupons' AND policyname = 'user_coupons_insert_own') THEN
    CREATE POLICY user_coupons_insert_own ON user_coupons FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 10. referral_codes table
-- ============================================================
ALTER TABLE IF EXISTS referral_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_codes' AND policyname = 'referral_codes_select_own') THEN
    CREATE POLICY referral_codes_select_own ON referral_codes FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_codes' AND policyname = 'referral_codes_insert_own') THEN
    CREATE POLICY referral_codes_insert_own ON referral_codes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 11. analytics_events table (insert only, no read from client)
-- ============================================================
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'analytics_events_insert_auth') THEN
    CREATE POLICY analytics_events_insert_auth ON analytics_events FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- 12. driver_registrations table
-- ============================================================
ALTER TABLE IF EXISTS driver_registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_registrations' AND policyname = 'driver_registrations_select_own') THEN
    CREATE POLICY driver_registrations_select_own ON driver_registrations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_registrations' AND policyname = 'driver_registrations_insert_own') THEN
    CREATE POLICY driver_registrations_insert_own ON driver_registrations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_registrations' AND policyname = 'driver_registrations_update_own') THEN
    CREATE POLICY driver_registrations_update_own ON driver_registrations FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- Admin override: super_admin and admin can access all rows
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'messages', 'support_messages', 'reviews', 'addresses',
    'service_bookings', 'doctor_bookings', 'prescription_requests',
    'delivery_requests', 'user_coupons', 'referral_codes',
    'analytics_events', 'driver_registrations'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format(
        'CREATE POLICY IF NOT EXISTS %I ON %I FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'', ''super_admin''))
        )',
        tbl || '_admin_full_access',
        tbl
      );
    END IF;
  END LOOP;
END $$;


-- ============================================
-- Migration: 31_delivery_pricing_rules.sql
-- ============================================
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
DROP POLICY IF EXISTS "anyone_reads_delivery_pricing" ON delivery_pricing_rules;
CREATE POLICY "anyone_reads_delivery_pricing"
  ON delivery_pricing_rules
  FOR SELECT USING (true);

-- Super admin can manage
DROP POLICY IF EXISTS "super_admin_manages_delivery_pricing" ON delivery_pricing_rules;
CREATE POLICY "super_admin_manages_delivery_pricing"
  ON delivery_pricing_rules
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
DROP POLICY IF EXISTS "admin_reads_dp_requests" ON delivery_pricing_change_requests;
CREATE POLICY "admin_reads_dp_requests"
  ON delivery_pricing_change_requests
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

-- Admin roles can insert
DROP POLICY IF EXISTS "admin_inserts_dp_requests" ON delivery_pricing_change_requests;
CREATE POLICY "admin_inserts_dp_requests"
  ON delivery_pricing_change_requests
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Super admin can update (approve/reject)
DROP POLICY IF EXISTS "super_admin_updates_dp_requests" ON delivery_pricing_change_requests;
CREATE POLICY "super_admin_updates_dp_requests"
  ON delivery_pricing_change_requests
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


-- ============================================
-- Migration: 32_banners.sql
-- ============================================
-- Migration 32: Banner management with approval workflow
-- Allows Super Admin to manage banners directly,
-- Regional Manager submits change requests for approval.

-- ─── banners table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  sub         TEXT NOT NULL DEFAULT '',
  cta         TEXT NOT NULL DEFAULT 'اطلب الآن',
  bg          TEXT NOT NULL DEFAULT '#7C3AED',
  accent      TEXT NOT NULL DEFAULT '#6D28D9',
  image       TEXT,
  link_type   TEXT NOT NULL DEFAULT 'none' CHECK (link_type IN ('partner','url','none')),
  link_value  TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── banner_change_requests table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banner_change_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id           UUID REFERENCES banners(id) ON DELETE CASCADE,
  change_type         TEXT NOT NULL DEFAULT 'create' CHECK (change_type IN ('create','update','delete')),
  proposed_title      TEXT,
  proposed_sub        TEXT,
  proposed_cta        TEXT,
  proposed_bg         TEXT,
  proposed_accent     TEXT,
  proposed_image      TEXT,
  proposed_link_type  TEXT,
  proposed_link_value TEXT,
  proposed_position   INTEGER,
  proposed_is_active  BOOLEAN,
  reason              TEXT,
  requested_by        UUID NOT NULL REFERENCES auth.users(id),
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_status     TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by         UUID REFERENCES auth.users(id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  applied_at          TIMESTAMPTZ
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_change_requests ENABLE ROW LEVEL SECURITY;

-- banners: anyone can read (customer app needs this)
DROP POLICY IF EXISTS "banners_select" ON banners;
CREATE POLICY "banners_select"
  ON banners FOR SELECT USING (true);

-- banners: only super_admin can manage
DROP POLICY IF EXISTS "banners_manage" ON banners;
CREATE POLICY "banners_manage"
  ON banners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- banner_change_requests: admins can read
DROP POLICY IF EXISTS "bcr_select" ON banner_change_requests;
CREATE POLICY "bcr_select"
  ON banner_change_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','accountant'))
);

-- banner_change_requests: super_admin + admin can insert
DROP POLICY IF EXISTS "bcr_insert" ON banner_change_requests;
CREATE POLICY "bcr_insert"
  ON banner_change_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
);

-- banner_change_requests: only super_admin can update (approve/reject)
DROP POLICY IF EXISTS "bcr_update" ON banner_change_requests;
CREATE POLICY "bcr_update"
  ON banner_change_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ─── RPC: apply_banner_change ───────────────────────────────────────────────

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
BEGIN
  -- Fetch the request
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

  -- Handle CREATE
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

    -- Update request with the new banner id
    UPDATE banner_change_requests SET banner_id = v_new_id WHERE id = p_request_id;

  -- Handle UPDATE
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

  -- Handle DELETE (soft delete)
  ELSIF v_req.change_type = 'delete' THEN
    UPDATE banners SET is_active = false, updated_at = now() WHERE id = v_req.banner_id;
  END IF;

  -- Mark as applied
  UPDATE banner_change_requests SET applied_at = now() WHERE id = p_request_id;

  -- Log
  INSERT INTO price_change_logs (action, changed_by, details)
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

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_banners_active_position ON banners (position) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bcr_status ON banner_change_requests (approval_status);


-- ============================================
-- Migration: 33_order_notification_triggers.sql
-- ============================================
-- Migration 33: Order notification triggers
-- Automatically sends push notifications when orders are created or status changes.
-- Uses Supabase Database Webhooks as the primary mechanism.
-- Also provides pg_net function as alternative if the extension is enabled.

-- ─── Trigger function using pg_net (if available) ──────────────────────────

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Determine what changed
  IF TG_OP = 'INSERT' THEN
    v_status := 'new_order';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_status := NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  -- Try pg_net async HTTP call
  BEGIN
    SELECT current_setting('app.settings.supabase_url', true) INTO v_url;
    SELECT current_setting('app.settings.service_role_key', true) INTO v_key;

    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/order-status-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'order_id', NEW.id::text,
          'new_status', v_status
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or settings not configured — silently skip
    -- Use Supabase Database Webhooks as fallback (configured via dashboard)
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- ─── Trigger on orders table ────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_order_status_notify ON public.orders;
CREATE TRIGGER trg_order_status_notify
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- ─── Instructions for Supabase Dashboard Webhook (alternative) ─────────────
-- If pg_net is not enabled, create a Database Webhook from the Supabase Dashboard:
--   1. Go to Database → Webhooks
--   2. Create webhook:
--      - Name: order-status-notify
--      - Table: orders
--      - Events: INSERT, UPDATE
--      - Type: Supabase Edge Function
--      - Function: order-status-notify
--      - Headers: Authorization: Bearer {SERVICE_ROLE_KEY}


-- ============================================
-- Migration: 34_partner_onboarding_complete.sql
-- ============================================
-- =====================================================================================
-- Migration 34: Complete Partner Onboarding System
-- =====================================================================================
-- Flow:
--   1. Admin invites partner (partner_invitations row created)
--   2. Admin approves invitation (status → 'accepted', invitation_token generated)
--   3. Partner registers via mobile app (checks invitation_token)
--   4. handle_new_user trigger auto-creates partners row + links profile
--   5. Partner logs in → sees dashboard with real data
-- =====================================================================================

-- ─── 1. Add invitation_token to partner_invitations ────────────────────────────

ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_partner_invitations_token
  ON public.partner_invitations(invitation_token) WHERE invitation_token IS NOT NULL;

-- ─── 2. Add phone/description/delivery_time_min columns if missing ─────────────

DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS phone TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS description TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS delivery_time_min INTEGER DEFAULT 30; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── 3. Function: generate_invitation_token ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_invitation_token(p_invitation_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate a random 32-char hex token
  v_token := encode(gen_random_bytes(16), 'hex');

  UPDATE public.partner_invitations
  SET invitation_token = v_token,
      token_expires_at = NOW() + INTERVAL '30 days'
  WHERE id = p_invitation_id
    AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or not in accepted status';
  END IF;

  RETURN v_token;
END;
$$;

-- ─── 4. Function: validate_invitation_token ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token TEXT)
RETURNS TABLE(
  invitation_id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id AS invitation_id,
    pi.email,
    pi.name,
    pi.phone,
    (pi.status = 'accepted' AND (pi.token_expires_at IS NULL OR pi.token_expires_at > NOW())) AS is_valid
  FROM public.partner_invitations pi
  WHERE pi.invitation_token = p_token;
END;
$$;

-- ─── 5. Function: verify_invitation_email ──────────────────────────────────────
-- Used by mobile app to check if an email has an accepted invitation

CREATE OR REPLACE FUNCTION public.verify_invitation_email(p_email TEXT)
RETURNS TABLE(
  invitation_id UUID,
  name TEXT,
  phone TEXT,
  status TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id AS invitation_id,
    pi.name,
    pi.phone,
    pi.status,
    (pi.status = 'accepted') AS is_valid
  FROM public.partner_invitations pi
  WHERE LOWER(pi.email) = LOWER(p_email);
END;
$$;

-- ─── 6. Updated handle_new_user trigger ────────────────────────────────────────
-- Now handles partner role: creates partners row if invitation exists

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_invitation RECORD;
  v_partner_id UUID;
BEGIN
  -- Determine role
  IF NEW.email = 'malmaghrabi77@gmail.com' THEN
    v_role := 'super_admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- If partner role, check invitation and create partners row
  IF v_role = 'partner' THEN
    SELECT INTO v_invitation
      id, name, phone
    FROM public.partner_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
      AND status = 'accepted'
    LIMIT 1;

    IF v_invitation.id IS NOT NULL THEN
      -- Create partner record
      INSERT INTO public.partners (
        user_id,
        name,
        name_ar,
        phone,
        description,
        description_ar,
        category,
        type,
        city,
        is_open,
        is_approved,
        approval_status,
        commission_rate
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', v_invitation.name),
        COALESCE(NEW.raw_user_meta_data->>'business_name', v_invitation.name),
        COALESCE(NEW.raw_user_meta_data->>'phone', v_invitation.phone),
        '',
        '',
        'مطاعم',
        'restaurant',
        'قنا',
        false,  -- Starts closed until partner sets up their store
        true,
        'approved',
        0.15    -- 15% base commission rate
      )
      RETURNING id INTO v_partner_id;

      -- Link profile to partner
      UPDATE public.profiles
      SET partner_id = v_partner_id
      WHERE id = NEW.id;

      -- Mark invitation as used
      UPDATE public.partner_invitations
      SET status = 'registered',
          accepted_at = COALESCE(accepted_at, NOW())
      WHERE id = v_invitation.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (safe: DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 7. Update partner_invitations status constraint ───────────────────────────
-- Add 'registered' status for completed onboarding

DO $$
BEGIN
  ALTER TABLE public.partner_invitations
    DROP CONSTRAINT IF EXISTS partner_invitations_status_check;
  ALTER TABLE public.partner_invitations
    ADD CONSTRAINT partner_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'registered'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ─── 8. RLS: Allow anon/authenticated to verify invitation email ───────────────

-- Grant execute on verification functions
GRANT EXECUTE ON FUNCTION public.verify_invitation_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_invitation_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invitation_token(UUID) TO authenticated;

-- ─── 9. Function: complete_partner_onboarding ──────────────────────────────────
-- Fallback: manually creates partner for existing users who signed up
-- but don't have a partners row (for existing accounts)

CREATE OR REPLACE FUNCTION public.complete_partner_onboarding(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_invitation RECORD;
  v_partner_id UUID;
  v_existing_partner_id UUID;
BEGIN
  -- Check if partner already exists
  SELECT id INTO v_existing_partner_id
  FROM public.partners
  WHERE user_id = p_user_id;

  IF v_existing_partner_id IS NOT NULL THEN
    RETURN v_existing_partner_id;
  END IF;

  -- Get user info
  SELECT id, email, raw_user_meta_data INTO v_user
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check for accepted invitation
  SELECT INTO v_invitation id, name, phone
  FROM public.partner_invitations
  WHERE LOWER(email) = LOWER(v_user.email)
    AND status = 'accepted'
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'No accepted invitation found for this email';
  END IF;

  -- Create partner
  INSERT INTO public.partners (
    user_id, name, name_ar, phone, category, type, city,
    is_open, is_approved, approval_status, commission_rate
  ) VALUES (
    p_user_id,
    COALESCE(v_user.raw_user_meta_data->>'business_name', v_invitation.name),
    COALESCE(v_user.raw_user_meta_data->>'business_name', v_invitation.name),
    COALESCE(v_user.raw_user_meta_data->>'phone', v_invitation.phone),
    'مطاعم', 'restaurant', 'قنا',
    false, true, 'approved', 0.15
  )
  RETURNING id INTO v_partner_id;

  -- Link profile
  UPDATE public.profiles SET partner_id = v_partner_id WHERE id = p_user_id;

  -- Mark invitation
  UPDATE public.partner_invitations
  SET status = 'registered'
  WHERE id = v_invitation.id;

  RETURN v_partner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_partner_onboarding(UUID) TO authenticated;


-- ============================================
-- Migration: 35_fix_rls_and_schema.sql
-- ============================================
-- =====================================================================================
-- Migration 35: Fix RLS policies + add missing columns
-- =====================================================================================
-- Fixes:
--   1. Drop broken RLS policies from migration 30 (reference nonexistent columns)
--   2. Add preparing_at column to orders table
--   3. Fix customer_reads_order_messages RLS tautology
-- =====================================================================================

-- ─── 1. Drop broken RLS policies ──────────────────────────────────────────────

-- messages_select_own references receiver_id which doesn't exist
DROP POLICY IF EXISTS messages_select_own ON public.messages;

-- support_messages_select_own references user_id which doesn't exist
DROP POLICY IF EXISTS support_messages_select_own ON public.support_messages;

-- ─── 2. Fix customer_reads_order_messages tautology ────────────────────────────
-- The old policy had: partner_id IN (SELECT id FROM partners WHERE id = partner_id)
-- which is a tautology (always true for non-null partner_id)

DROP POLICY IF EXISTS customer_reads_order_messages ON public.messages;

CREATE POLICY customer_reads_order_messages ON public.messages
  FOR SELECT USING (
    -- Customer can read messages for orders they own
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = messages.order_id
      AND o.customer_id = auth.uid()
    )
    OR
    -- Or messages they sent
    sender_id = auth.uid()
  );

-- ─── 3. Add preparing_at column to orders ─────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── 4. Ensure delivery_type column exists ─────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'platform';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================
-- Migration: 36_claim_order_for_driver.sql
-- ============================================
-- =====================================================================================
-- Migration 36: Atomic driver order claiming RPC
-- =====================================================================================
-- Prevents race condition where two drivers claim the same order simultaneously.
-- Uses SECURITY DEFINER + row-level locking (FOR UPDATE) for atomicity.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.claim_order_for_driver(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Lock the row and check it's available
  SELECT id, driver_id, status, delivery_type
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  -- Only ready orders with platform delivery can be claimed
  IF v_order.status NOT IN ('ready', 'accepted', 'preparing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الطلب لا تسمح بالاستلام');
  END IF;

  IF v_order.delivery_type = 'self' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب توصيل ذاتي من المتجر');
  END IF;

  IF v_order.driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم قبول هذا الطلب بواسطة سائق آخر');
  END IF;

  -- Claim the order
  UPDATE public.orders
  SET driver_id    = p_driver_id,
      status       = 'picked_up',
      picked_up_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated users (drivers)
GRANT EXECUTE ON FUNCTION public.claim_order_for_driver(UUID, UUID) TO authenticated;


-- ============================================
-- Migration: 37_platform_fixes.sql
-- ============================================
-- =====================================================================================
-- Migration 37: Platform fixes — RPC security, indexes, schema fixes
-- =====================================================================================
-- Note: payment_methods table already exists from migration 26 with columns:
-- (code, name, name_ar, icon, description, description_ar, category, commission_rate, is_enabled, requires_config)
-- Migration 27 added: receiving_phone, receiving_account, receiving_name, instructions_ar

-- 1. Ensure additional payment methods exist
INSERT INTO public.payment_methods (name, name_ar, code, icon, description, description_ar, category, commission_rate, is_enabled, requires_config) VALUES
  ('Vodafone Cash', 'فودافون كاش', 'vodafone_cash', '📱', 'Vodafone Cash wallet', 'محفظة فودافون كاش', 'wallet', 0.020, false, false),
  ('Orange Cash',   'اورانج كاش',  'orange_money',  '📱', 'Orange Cash wallet',   'محفظة اورانج كاش',  'wallet', 0.020, false, false),
  ('Fawry',         'فوري',        'fawry',         '🏪', 'Fawry payment',        'دفع فوري',          'other',  0.020, false, false),
  ('Credit Card',   'بطاقة بنكية', 'credit_card',   '💳', 'PayMob card payment',  'دفع بالبطاقة عبر PayMob', 'card', 0.025, true, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Add caller identity verification to claim_order_for_driver
CREATE OR REPLACE FUNCTION public.claim_order_for_driver(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Verify the caller is the driver they claim to be
  IF auth.uid() IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Lock the row and check it's available
  SELECT id, driver_id, status, delivery_type
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_order.status NOT IN ('ready', 'accepted', 'preparing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الطلب لا تسمح بالاستلام');
  END IF;

  IF v_order.delivery_type = 'self' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب توصيل ذاتي من المتجر');
  END IF;

  IF v_order.driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم قبول هذا الطلب بواسطة سائق آخر');
  END IF;

  UPDATE public.orders
  SET driver_id    = p_driver_id,
      status       = 'picked_up',
      picked_up_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Fix dashboard pending count: add index for common partner queries
CREATE INDEX IF NOT EXISTS idx_orders_partner_status ON public.orders (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages (order_id);
CREATE INDEX IF NOT EXISTS idx_messages_partner_id ON public.messages (partner_id);

-- 4. Add updated_at column to payment_methods if missing, and auto-update trigger
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_methods_updated_at();


-- ============================================
-- Migration: 38_security_hardening.sql
-- ============================================
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
    DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens FOR ALL
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
    CREATE OR REPLACE FUNCTION public.complete_partner_onboarding(p_user_id UUID)
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
DROP POLICY IF EXISTS "driver sees available orders" ON public.orders;
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

DROP POLICY IF EXISTS "driver sees own claimed orders" ON public.orders;
CREATE POLICY "driver sees own claimed orders"
  ON public.orders FOR SELECT
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "driver updates own claimed orders" ON public.orders;
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
DROP POLICY IF EXISTS "partner can update own store" ON public.partners;
CREATE POLICY "partner can update own store"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================
-- Migration: 39_deep_audit_security_fixes.sql
-- ============================================
-- =====================================================================================
-- Migration 39: Deep Audit Security Fixes
-- =====================================================================================
-- Fixes identified in security audit:
--   1. redeem_loyalty_points — missing auth.uid() ownership check
--   2. handle_new_user — no whitelist on self-registration roles (privilege escalation)
--   3. claim_order_for_driver — missing auth.uid() + role verification
--   4. messages RLS — overly permissive SELECT, missing sender_id check on INSERT
--   5. request_driver_withdrawal — race condition (no advisory lock)
--   6. notifications RLS — missing UPDATE/DELETE recipient ownership
--   7. delivery_requests UPDATE policy — allows any user to update pending rows
--   8. partner password minimum — no DB-level constraint exists (documented)
-- =====================================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 1. FIX redeem_loyalty_points — add auth.uid() ownership check
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_customer_id uuid,
  p_points      int,
  p_description text DEFAULT 'استبدال نقاط'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance int;
  v_discount numeric;
BEGIN
  -- SECURITY FIX: Verify caller owns this customer account
  IF auth.uid() IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check minimum redemption threshold
  IF p_points < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للاستبدال هو 20 نقطة');
  END IF;

  -- Calculate current balance
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.loyalty_points
  WHERE customer_id = p_customer_id;

  IF v_balance < p_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد النقاط غير كافٍ');
  END IF;

  -- Deduct points (negative entry)
  INSERT INTO public.loyalty_points(customer_id, points, description)
  VALUES (p_customer_id, -p_points, p_description);

  -- Calculate discount: 1 point = 1 EGP
  v_discount := p_points;

  RETURN jsonb_build_object(
    'success',   true,
    'discount',  v_discount,
    'remaining', v_balance - p_points
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_loyalty_points(uuid, int, text)
  IS 'استبدال نقاط — الحد الأدنى 20 نقطة = 20 جنيه خصم (مع فحص هوية المتصل)';


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 2. FIX handle_new_user — whitelist allowed self-registration roles
--    Only 'customer', 'driver', 'partner' are valid self-registration roles.
--    Any other role in metadata (e.g. 'super_admin', 'admin', 'accountant')
--    defaults to 'customer' to prevent privilege escalation via signup metadata.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_requested_role TEXT;
  v_invitation RECORD;
  v_partner_id UUID;
BEGIN
  -- SECURITY FIX: Whitelist allowed self-registration roles
  -- Super admin is only assigned for the hardcoded master email
  IF NEW.email = 'malmaghrabi77@gmail.com' THEN
    v_role := 'super_admin';
  ELSE
    v_requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    -- Only allow safe roles via self-registration; everything else → customer
    IF v_requested_role IN ('customer', 'driver', 'partner') THEN
      v_role := v_requested_role;
    ELSE
      v_role := 'customer';
    END IF;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- If partner role, check invitation and create partners row
  IF v_role = 'partner' THEN
    SELECT INTO v_invitation
      id, name, phone
    FROM public.partner_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
      AND status = 'accepted'
    LIMIT 1;

    IF v_invitation.id IS NOT NULL THEN
      -- Create partner record
      INSERT INTO public.partners (
        user_id,
        name,
        name_ar,
        phone,
        description,
        description_ar,
        category,
        type,
        city,
        is_open,
        is_approved,
        approval_status,
        commission_rate
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', v_invitation.name),
        COALESCE(NEW.raw_user_meta_data->>'business_name', v_invitation.name),
        COALESCE(NEW.raw_user_meta_data->>'phone', v_invitation.phone),
        '',
        '',
        'مطاعم',
        'restaurant',
        'قنا',
        false,  -- Starts closed until partner sets up their store
        true,
        'approved',
        0.15    -- 15% base commission rate
      )
      RETURNING id INTO v_partner_id;

      -- Link profile to partner
      UPDATE public.profiles
      SET partner_id = v_partner_id
      WHERE id = NEW.id;

      -- Mark invitation as used
      UPDATE public.partner_invitations
      SET status = 'registered',
          accepted_at = COALESCE(accepted_at, NOW())
      WHERE id = v_invitation.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (safe: DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 3. FIX claim_order_for_driver — add auth.uid() check + role verification
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.claim_order_for_driver(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_driver_profile RECORD;
BEGIN
  -- SECURITY FIX: Verify caller identity
  IF auth.uid() IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — هوية المستخدم لا تتطابق');
  END IF;

  -- SECURITY FIX: Verify caller is an approved driver
  SELECT role, driver_application_status
  INTO v_driver_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_driver_profile.role IS DISTINCT FROM 'driver' THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — يجب أن تكون سائقاً');
  END IF;

  IF v_driver_profile.driver_application_status IS DISTINCT FROM 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح — حساب السائق غير مفعّل');
  END IF;

  -- Lock the row and check it's available
  SELECT id, driver_id, status, delivery_type
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  -- Only ready orders with platform delivery can be claimed
  IF v_order.status NOT IN ('ready', 'accepted', 'preparing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الطلب لا تسمح بالاستلام');
  END IF;

  IF v_order.delivery_type = 'self' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب توصيل ذاتي من المتجر');
  END IF;

  IF v_order.driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم قبول هذا الطلب بواسطة سائق آخر');
  END IF;

  -- Claim the order
  UPDATE public.orders
  SET driver_id    = p_driver_id,
      status       = 'picked_up',
      picked_up_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated users (drivers)
GRANT EXECUTE ON FUNCTION public.claim_order_for_driver(UUID, UUID) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 4. FIX messages RLS policies — tighten ownership checks
--    The messages table (migration 23) has: order_id, partner_id, sender_id, sender_type
--    A user should only see messages where they are a participant:
--      - sender (sender_id = auth.uid())
--      - customer on the order (orders.customer_id = auth.uid())
--      - driver on the order (orders.driver_id = auth.uid())
--      - partner's user (partners.user_id = auth.uid() for the partner_id)
--    INSERT: sender_id must equal auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Drop all existing message SELECT/INSERT policies to recreate cleanly
DROP POLICY IF EXISTS "customer_reads_order_messages" ON public.messages;
DROP POLICY IF EXISTS "driver_reads_order_messages" ON public.messages;
DROP POLICY IF EXISTS "partner_reads_messages" ON public.messages;
DROP POLICY IF EXISTS "admin_reads_all_messages" ON public.messages;
DROP POLICY IF EXISTS "customer_sends_messages" ON public.messages;
DROP POLICY IF EXISTS "driver_sends_order_messages" ON public.messages;
DROP POLICY IF EXISTS "partner_sends_messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_admin_full_access" ON public.messages;

-- SELECT: User is a participant (sender, customer on order, driver on order, or partner's user)
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    -- You sent the message
    sender_id = auth.uid()
    -- You are the customer on this order
    OR order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
    -- You are the driver on this order
    OR order_id IN (
      SELECT id FROM public.orders WHERE driver_id = auth.uid()
    )
    -- You are the partner's owner for partner-chat messages
    OR partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
    -- Admin/super_admin can see all
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- INSERT: sender_id must be auth.uid() (no impersonation)
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 5. FIX request_driver_withdrawal — add advisory lock to prevent race condition
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.request_driver_withdrawal(
  p_amount          NUMERIC,
  p_method          TEXT,
  p_account_details JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_driver_id UUID;
  v_balance   NUMERIC;
  v_lock_key  BIGINT;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  IF p_amount < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب 50 جنيه');
  END IF;

  -- SECURITY FIX: Advisory lock on driver UUID to prevent concurrent withdrawal race
  v_lock_key := ('x' || left(replace(v_driver_id::text, '-', ''), 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Get current balance (now safe under advisory lock)
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


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 6. FIX notifications RLS — add UPDATE/DELETE recipient ownership
--    Existing policy only covers SELECT (users_view_own_notifications).
--    Missing: UPDATE (mark as read), DELETE (dismiss).
--    Only the recipient should be able to modify or delete their own notifications.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- INSERT: allow system/triggers (SECURITY DEFINER functions) and admin
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT
  WITH CHECK (
    -- Admins can create notifications for anyone
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
    -- Or the recipient is creating a self-notification (edge case)
    OR recipient_id = auth.uid()
  );

-- UPDATE: Only the recipient can update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- DELETE: Only the recipient can delete/dismiss their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (recipient_id = auth.uid());

-- Admin override for notifications management
DROP POLICY IF EXISTS "notifications_admin_full" ON public.notifications;
CREATE POLICY "notifications_admin_full"
  ON public.notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 7. FIX delivery_requests UPDATE policy — add ownership check
--    Current policy: auth.uid() = driver_id OR status = 'pending'
--    This allows ANY authenticated user to UPDATE any pending delivery request.
--    Fix: Only the sender (owner) or the assigned driver can update.
-- ═══════════════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "driver updates assigned requests" ON public.delivery_requests;

DROP POLICY IF EXISTS "delivery_requests_update_participant" ON public.delivery_requests;
CREATE POLICY "delivery_requests_update_participant"
  ON public.delivery_requests FOR UPDATE
  USING (
    -- The sender (customer/owner) can update their own requests
    auth.uid() = sender_id
    -- The assigned driver can update requests assigned to them
    OR auth.uid() = driver_id
  )
  WITH CHECK (
    auth.uid() = sender_id
    OR auth.uid() = driver_id
  );


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 8. Partner password minimum — NOTE
--    The platform uses Supabase Auth (auth.users) for all authentication.
--    The legacy partners.password_hash (migration 001) and admins.password_hash
--    columns are NOT actively used for auth. There is no CHECK constraint on
--    password length at the database level to modify.
--    Password minimum length should be enforced at the Supabase Auth config level:
--      Dashboard → Authentication → Policies → Minimum password length = 8
--    No SQL change is required here.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- If the legacy admins table has a password_hash field and is still used,
-- add a trigger to enforce minimum 8 chars on any new hashes written directly.
-- This is a defensive measure only — all real auth goes through Supabase Auth.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'password_hash'
  ) THEN
    -- Add a check constraint for minimum hash length (bcrypt hashes are 60 chars,
    -- so this also catches any accidental plaintext storage)
    ALTER TABLE public.admins
      DROP CONSTRAINT IF EXISTS admins_password_hash_min_length;
    ALTER TABLE public.admins
      ADD CONSTRAINT admins_password_hash_min_length
      CHECK (char_length(password_hash) >= 8);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- VERIFICATION COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.redeem_loyalty_points(uuid, int, text)
  IS 'Loyalty point redemption — min 20 pts, with auth.uid() ownership check (migration 39)';
COMMENT ON FUNCTION public.handle_new_user()
  IS 'Trigger: create profile on signup — role whitelist: customer/driver/partner only (migration 39)';
COMMENT ON FUNCTION public.claim_order_for_driver(UUID, UUID)
  IS 'Atomic driver order claim — with auth.uid() + approved driver role check (migration 39)';
COMMENT ON FUNCTION public.request_driver_withdrawal(NUMERIC, TEXT, JSONB)
  IS 'Driver withdrawal — with advisory lock to prevent concurrent race (migration 39)';

-- Add delivery coordinates columns to orders (used by customer app for tracking)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

COMMIT;


-- ============================================
-- Migration: 40_paymob_payment.sql
-- ============================================
-- Migration 23: PayMob Payment Support
-- Adds payment_status tracking to orders

-- Add payment_status column to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paymob_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN paymob_order_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paymob_transaction_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN paymob_transaction_id TEXT;
  END IF;
END $$;

-- Index for PayMob order lookups
CREATE INDEX IF NOT EXISTS idx_orders_paymob_order_id ON orders (paymob_order_id) WHERE paymob_order_id IS NOT NULL;


-- ============================================
-- Migration: 41_rate_limiting.sql
-- ============================================
-- Migration 24: Rate Limiting
-- Adds rate limiting infrastructure for order creation and other operations

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits (user_id, action, created_at DESC);

-- Auto-cleanup: delete entries older than 2 hours
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - INTERVAL '2 hours';
END;
$$;

-- Check rate limit: returns true if within limit, false if exceeded
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INT;
BEGIN
  -- Cleanup old entries first
  PERFORM cleanup_rate_limits();

  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::INTERVAL;

  IF attempt_count >= p_max_attempts THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;

  -- Record this attempt
  INSERT INTO rate_limits (user_id, action) VALUES (p_user_id, p_action);

  RETURN TRUE; -- Within limit
END;
$$;

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the system can read/write rate_limits (via SECURITY DEFINER functions)
-- No direct user access needed


-- ============================================
-- Migration: 42_add_driver_location.sql
-- ============================================
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


-- ============================================
-- Migration: 43_create_admin_tables.sql
-- ============================================
-- Create admin_assignments table for regional manager partner assignments
CREATE TABLE IF NOT EXISTS admin_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: each admin can only be assigned to a partner once
  UNIQUE(admin_id, partner_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_assignments_admin_id ON admin_assignments(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_partner_id ON admin_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_status ON admin_assignments(status);

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity_type ON admin_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view their own assignments
DROP POLICY IF EXISTS "admins_view_own_assignments" ON admin_assignments;
CREATE POLICY "admins_view_own_assignments"
  ON admin_assignments FOR SELECT
  USING (admin_id = auth.uid());

-- RLS Policy: Super admins can view all assignments
DROP POLICY IF EXISTS "super_admin_view_all_assignments" ON admin_assignments;
CREATE POLICY "super_admin_view_all_assignments"
  ON admin_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Super admins can manage assignments
DROP POLICY IF EXISTS "super_admin_manage_assignments" ON admin_assignments;
CREATE POLICY "super_admin_manage_assignments"
  ON admin_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Admins can view their own logs
DROP POLICY IF EXISTS "admins_view_own_logs" ON admin_logs;
CREATE POLICY "admins_view_own_logs"
  ON admin_logs FOR SELECT
  USING (admin_id = auth.uid());

-- RLS Policy: Super admins can view all logs
DROP POLICY IF EXISTS "super_admin_view_all_logs" ON admin_logs;
CREATE POLICY "super_admin_view_all_logs"
  ON admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Super admins can create logs
DROP POLICY IF EXISTS "super_admin_create_logs" ON admin_logs;
CREATE POLICY "super_admin_create_logs"
  ON admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );


-- ============================================
-- Migration: 44_storage_buckets.sql
-- ============================================
-- ============================================================
-- Storage buckets for profile photos and partner logos
-- ============================================================

-- 1. Driver / Customer avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Partner logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-logos',
  'partner-logos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ── RLS for avatars ────────────────────────────────────────

-- Anyone can read public avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "avatars_authenticated_insert" ON storage.objects;
CREATE POLICY "avatars_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace their own avatar
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── RLS for partner-logos ──────────────────────────────────

-- Anyone can read partner logos (they are public)
DROP POLICY IF EXISTS "partner_logos_public_read" ON storage.objects;
CREATE POLICY "partner_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-logos');

-- Authenticated partners can upload to their own folder
DROP POLICY IF EXISTS "partner_logos_authenticated_insert" ON storage.objects;
CREATE POLICY "partner_logos_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Partners can update/replace their own logo
DROP POLICY IF EXISTS "partner_logos_owner_update" ON storage.objects;
CREATE POLICY "partner_logos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partner-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Add avatar_url to profiles if not exists ──────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ── Add logo_url to partners table if not exists ──────────
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS logo_url text;


-- ============================================
-- Migration: 45_update_existing_tables.sql
-- ============================================
-- Ensure profiles table has required columns for drivers and managers
-- Add columns if they don't exist (safe to run multiple times)

-- Add phone column if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add rating column if not exists (for drivers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

-- Add completed_orders column if not exists (for drivers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;

-- Add total_earnings column if not exists (for drivers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;

-- Create index on role for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ===== PARTNERS TABLE UPDATES =====

-- Ensure partners table has required columns
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- Create indexes for partners
CREATE INDEX IF NOT EXISTS idx_partners_is_open ON partners(is_open);

-- ===== ORDERS TABLE UPDATES =====

-- Ensure orders table has required columns
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS partner_id UUID;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled'));

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE orders
  ADD CONSTRAINT fk_orders_partner_id
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_partner_id ON orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ===== VERIFICATION QUERIES =====
-- Run these to verify all columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name='profiles';
-- SELECT column_name FROM information_schema.columns WHERE table_name='partners';
-- SELECT column_name FROM information_schema.columns WHERE table_name='orders';


-- ============================================
-- Migration: 46_update_loyalty_rules.sql
-- ============================================
-- Migration: update loyalty rules
-- 1 point per 250 EGP spent
-- Minimum redemption: 20 points = 20 EGP discount

CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF new.status = 'delivered' AND old.status != 'delivered' THEN
    -- 1 نقطة لكل 250 جنيه مشتريات
    INSERT INTO public.loyalty_points(customer_id, order_id, points, description)
    VALUES (
      new.customer_id,
      new.id,
      GREATEST(0, floor(new.total / 250)::int),
      'نقاط طلب #' || substring(new.id::text, 1, 8)
    );
  END IF;
  RETURN new;
END;
$$;

-- Redemption function: validate minimum 20 points before redeeming
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_customer_id uuid,
  p_points      int,
  p_description text DEFAULT 'استبدال نقاط'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance int;
  v_discount numeric;
BEGIN
  -- SECURITY: Verify caller owns this customer account
  IF auth.uid() IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check minimum redemption threshold
  IF p_points < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للاستبدال هو 20 نقطة');
  END IF;

  -- Calculate current balance
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.loyalty_points
  WHERE customer_id = p_customer_id;

  IF v_balance < p_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد النقاط غير كافٍ');
  END IF;

  -- Deduct points (negative entry)
  INSERT INTO public.loyalty_points(customer_id, points, description)
  VALUES (p_customer_id, -p_points, p_description);

  -- Calculate discount: 1 point = 1 EGP
  v_discount := p_points;

  RETURN jsonb_build_object(
    'success',   true,
    'discount',  v_discount,
    'remaining', v_balance - p_points
  );
END;
$$;

COMMENT ON FUNCTION public.award_loyalty_points() IS '1 نقطة لكل 250 جنيه مشتريات';
COMMENT ON FUNCTION public.redeem_loyalty_points(uuid, int, text) IS 'استبدال نقاط — الحد الأدنى 20 نقطة = 20 جنيه خصم';


-- ============================================
-- Migration: 47_server_side_order_validation.sql
-- ============================================
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
DROP POLICY IF EXISTS "promo_codes_read" ON public.promo_codes;
CREATE POLICY "promo_codes_read"
  ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Only admins can manage promo codes
DROP POLICY IF EXISTS "promo_codes_admin" ON public.promo_codes;
CREATE POLICY "promo_codes_admin"
  ON public.promo_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Users can see their own usage
DROP POLICY IF EXISTS "promo_usage_own" ON public.promo_code_usage;
CREATE POLICY "promo_usage_own"
  ON public.promo_code_usage
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


-- ============================================
-- Migration: 48_seed_service_prices.sql
-- ============================================
-- Migration 48: Ensure service_prices are seeded in production
-- Seeds all predefined services for P2P delivery, cleaning, and electrical

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


