-- Migration 17: Wallet Codes System + Accountant Role
-- Adds: accountant role, wallet code approval workflow, driver wallet, target types

-- ═══════════════════════════════════════════════════════════════
-- 1. Add 'accountant' to profiles.role
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'partner', 'driver', 'admin', 'super_admin', 'accountant'));

-- ═══════════════════════════════════════════════════════════════
-- 2. Extend wallet_codes with target_type, approval workflow
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.wallet_codes
  ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'customer'
    CHECK (target_type IN ('customer', 'driver')),
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_wallet_codes_target_type ON public.wallet_codes(target_type);
CREATE INDEX IF NOT EXISTS idx_wallet_codes_approval ON public.wallet_codes(approval_status);
CREATE INDEX IF NOT EXISTS idx_wallet_codes_batch ON public.wallet_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_wallet_codes_creator ON public.wallet_codes(created_by);

-- ═══════════════════════════════════════════════════════════════
-- 3. Update RLS for wallet_codes to include accountant
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin manages wallet codes" ON public.wallet_codes;
CREATE POLICY "admin manages wallet codes"
  ON public.wallet_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. Driver wallet transactions table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.driver_wallet_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('topup', 'payout', 'bonus', 'deduction')),
  description  TEXT,
  reference_id UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.driver_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver sees own wallet"
  ON public.driver_wallet_transactions FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "admin manages driver wallet"
  ON public.driver_wallet_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')
    )
  );

CREATE INDEX IF NOT EXISTS idx_driver_wallet_tx ON public.driver_wallet_transactions(driver_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 5. get_driver_wallet_balance function
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_driver_wallet_balance(p_driver_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.driver_wallet_transactions WHERE driver_id = p_driver_id;
  RETURN v_balance;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. Update redeem_wallet_code: check approval + target_type
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.redeem_wallet_code(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code_row   RECORD;
  v_customer_id UUID;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  SELECT * INTO v_code_row
  FROM public.wallet_codes
  WHERE code = UPPER(TRIM(p_code))
  FOR UPDATE;

  IF v_code_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكود غير صحيح');
  END IF;

  IF v_code_row.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مُستخدم بالفعل');
  END IF;

  IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود منتهي الصلاحية');
  END IF;

  IF v_code_row.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود غير مفعّل بعد');
  END IF;

  IF v_code_row.target_type <> 'customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مخصص للمندوبين فقط');
  END IF;

  UPDATE public.wallet_codes
  SET is_used = TRUE, redeemed_by = v_customer_id, redeemed_at = NOW()
  WHERE id = v_code_row.id;

  INSERT INTO public.wallet_transactions (customer_id, amount, type, description, reference_id)
  VALUES (v_customer_id, v_code_row.amount, 'topup',
          'شحن المحفظة — كود #' || SUBSTRING(v_code_row.code, 1, 8),
          v_code_row.id);

  RETURN jsonb_build_object(
    'success', true,
    'amount',  v_code_row.amount,
    'message', 'تم شحن المحفظة بنجاح'
  );
END;
$$;

COMMENT ON FUNCTION public.get_driver_wallet_balance(UUID) IS 'إرجاع رصيد محفظة السائق';
