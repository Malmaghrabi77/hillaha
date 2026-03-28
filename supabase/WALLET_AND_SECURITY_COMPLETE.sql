-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  HILLAHA — WALLET + INVITATIONS + SECURITY COMPLETE SETUP       ║
-- ║  Migrations: 12 + 16 + 17 + 18 + 19 + 20                      ║
-- ║  Super Admin: malmaghrabi77@gmail.com                            ║
-- ║                                                                  ║
-- ║  HOW TO USE: Copy ALL into Supabase SQL Editor → Run             ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ══════════════════════════════════════════════════════════════
-- STEP 0: SUPER ADMIN SETUP
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'partner', 'driver', 'admin', 'super_admin', 'accountant'));

UPDATE public.profiles SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'malmaghrabi77@gmail.com');

-- ══════════════════════════════════════════════════════════════
-- MIGRATION 12: PARTNER INVITATIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_type TEXT DEFAULT 'super_admin' CHECK (invited_type IN ('super_admin', 'regional_manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(), accepted_at TIMESTAMPTZ, rejection_reason TEXT
);
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON public.partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_status ON public.partner_invitations(status);
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_view_partner_invitations" ON public.partner_invitations;
CREATE POLICY "admins_view_partner_invitations" ON public.partner_invitations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
DROP POLICY IF EXISTS "super_admin_manage_invitations" ON public.partner_invitations;
CREATE POLICY "super_admin_manage_invitations" ON public.partner_invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "regional_manager_invite_partners" ON public.partner_invitations;
CREATE POLICY "regional_manager_invite_partners" ON public.partner_invitations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) AND invited_type IN ('regional_manager', 'super_admin'));

-- ══════════════════════════════════════════════════════════════
-- MIGRATION 16: WALLET SYSTEM
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL, type TEXT NOT NULL CHECK (type IN ('topup', 'payment', 'refund')),
  description TEXT, reference_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer sees own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "customer sees own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer ON public.wallet_transactions(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0), created_by UUID REFERENCES auth.users(id),
  redeemed_by UUID REFERENCES auth.users(id), redeemed_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT FALSE, expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallet_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer sees own redeemed codes" ON public.wallet_codes;
CREATE POLICY "customer sees own redeemed codes" ON public.wallet_codes FOR SELECT USING (auth.uid() = redeemed_by);

CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_customer_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN (SELECT COALESCE(SUM(amount), 0) FROM public.wallet_transactions WHERE customer_id = p_customer_id); END; $$;

-- ══════════════════════════════════════════════════════════════
-- MIGRATION 17: WALLET CODES EXTENSIONS + DRIVER WALLET
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.wallet_codes
  ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'customer' CHECK (target_type IN ('customer', 'driver')),
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_wallet_codes_target_type ON public.wallet_codes(target_type);
CREATE INDEX IF NOT EXISTS idx_wallet_codes_approval ON public.wallet_codes(approval_status);
CREATE INDEX IF NOT EXISTS idx_wallet_codes_batch ON public.wallet_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_wallet_codes_creator ON public.wallet_codes(created_by);

CREATE TABLE IF NOT EXISTS public.driver_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL, type TEXT NOT NULL CHECK (type IN ('topup', 'payout', 'bonus', 'deduction')),
  description TEXT, reference_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.driver_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver sees own wallet" ON public.driver_wallet_transactions;
CREATE POLICY "driver sees own wallet" ON public.driver_wallet_transactions FOR SELECT USING (auth.uid() = driver_id);
DROP POLICY IF EXISTS "admin manages driver wallet" ON public.driver_wallet_transactions;
CREATE POLICY "admin manages driver wallet" ON public.driver_wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));

CREATE OR REPLACE FUNCTION public.get_driver_wallet_balance(p_driver_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN (SELECT COALESCE(SUM(amount), 0) FROM public.driver_wallet_transactions WHERE driver_id = p_driver_id); END; $$;

-- ══════════════════════════════════════════════════════════════
-- MIGRATION 18: COMMISSION RATES (15% base → 12% after 1000)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='commission_rate') THEN
    ALTER TABLE public.partners ALTER COLUMN commission_rate SET DEFAULT 0.15;
    UPDATE public.partners SET commission_rate = 0.15 WHERE commission_rate = 0.10;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='commission_rate') THEN
    ALTER TABLE public.orders ALTER COLUMN commission_rate SET DEFAULT 0.15;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- MIGRATION 19: SECURITY HARDENING
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_redemption_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_code TEXT NOT NULL, success BOOLEAN DEFAULT FALSE, ip_hint TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallet_redemption_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_redemption_attempts_user ON public.wallet_redemption_attempts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, target_type TEXT, target_id UUID, details JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin views wallet audit log" ON public.wallet_audit_log;
CREATE POLICY "admin views wallet audit log" ON public.wallet_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'accountant')));
CREATE INDEX IF NOT EXISTS idx_wallet_audit_action ON public.wallet_audit_log(action, created_at DESC);

DROP POLICY IF EXISTS "admin manages wallet codes" ON public.wallet_codes;
DROP POLICY IF EXISTS "admin_select_wallet_codes" ON public.wallet_codes;
DROP POLICY IF EXISTS "admin_insert_wallet_codes" ON public.wallet_codes;
DROP POLICY IF EXISTS "admin_update_wallet_codes" ON public.wallet_codes;
CREATE POLICY "admin_select_wallet_codes" ON public.wallet_codes FOR SELECT
  USING (auth.uid() = redeemed_by OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')));
CREATE POLICY "admin_insert_wallet_codes" ON public.wallet_codes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'accountant')) AND created_by = auth.uid());
CREATE POLICY "admin_update_wallet_codes" ON public.wallet_codes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- ══════════════════════════════════════════════════════════════
-- MIGRATION 20: ADVANCED SECURITY (7 LAYERS)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.wallet_security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id), details JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE, resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallet_security_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_views_security_alerts" ON public.wallet_security_alerts;
CREATE POLICY "admin_views_security_alerts" ON public.wallet_security_alerts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'accountant')));
DROP POLICY IF EXISTS "admin_updates_security_alerts" ON public.wallet_security_alerts;
CREATE POLICY "admin_updates_security_alerts" ON public.wallet_security_alerts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE INDEX IF NOT EXISTS idx_wallet_alerts_unread ON public.wallet_security_alerts(is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE public.wallet_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.wallet_config (key, value) VALUES ('hmac_secret', encode(gen_random_bytes(32), 'hex')) ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.wallet_codes ADD COLUMN IF NOT EXISTS hmac_signature TEXT;
ALTER TABLE public.wallet_codes ADD COLUMN IF NOT EXISTS allowed_region TEXT;

CREATE TABLE IF NOT EXISTS public.wallet_pending_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.wallet_codes(id), verification_code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallet_pending_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_views_own_pending" ON public.wallet_pending_redemptions;
CREATE POLICY "user_views_own_pending" ON public.wallet_pending_redemptions FOR SELECT USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_pending_redemptions_user ON public.wallet_pending_redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemption_attempts_ip ON public.wallet_redemption_attempts(ip_hint, created_at DESC);

-- HMAC Functions
CREATE OR REPLACE FUNCTION public.generate_code_hmac(p_code TEXT, p_amount NUMERIC)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_secret TEXT;
BEGIN SELECT value INTO v_secret FROM public.wallet_config WHERE key = 'hmac_secret';
  RETURN encode(hmac(p_code || ':' || p_amount::TEXT, v_secret, 'sha256'), 'hex'); END; $$;

CREATE OR REPLACE FUNCTION public.verify_code_hmac(p_code TEXT, p_amount NUMERIC, p_signature TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_expected TEXT;
BEGIN v_expected := public.generate_code_hmac(p_code, p_amount);
  RETURN v_expected = p_signature AND length(v_expected) = length(p_signature); END; $$;

-- Auto-sign trigger
CREATE OR REPLACE FUNCTION public.auto_sign_wallet_code() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN NEW.hmac_signature := public.generate_code_hmac(NEW.code, NEW.amount); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_auto_sign_wallet_code ON public.wallet_codes;
CREATE TRIGGER trg_auto_sign_wallet_code BEFORE INSERT ON public.wallet_codes FOR EACH ROW EXECUTE FUNCTION public.auto_sign_wallet_code();
UPDATE public.wallet_codes SET hmac_signature = public.generate_code_hmac(code, amount) WHERE hmac_signature IS NULL;

-- Velocity Check
CREATE OR REPLACE FUNCTION public.check_redemption_velocity(p_user_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hc INTEGER; v_dc INTEGER; v_ha NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_hc FROM public.wallet_redemption_attempts WHERE user_id=p_user_id AND success=TRUE AND created_at>NOW()-INTERVAL '1 hour';
  SELECT COUNT(*) INTO v_dc FROM public.wallet_redemption_attempts WHERE user_id=p_user_id AND success=TRUE AND created_at>NOW()-INTERVAL '24 hours';
  SELECT COALESCE(SUM(wc.amount),0) INTO v_ha FROM public.wallet_redemption_attempts ra JOIN public.wallet_codes wc ON LEFT(wc.code,4)||'****'=ra.attempted_code WHERE ra.user_id=p_user_id AND ra.success=TRUE AND ra.created_at>NOW()-INTERVAL '1 hour';
  IF v_hc>=3 THEN RETURN jsonb_build_object('blocked',true,'message','تم تجاوز حد الاسترداد بالساعة (3)'); END IF;
  IF v_dc>=10 THEN RETURN jsonb_build_object('blocked',true,'message','تم تجاوز حد الاسترداد اليومي (10)'); END IF;
  IF v_ha>=5000 THEN RETURN jsonb_build_object('blocked',true,'message','تم تجاوز حد المبالغ بالساعة (5000)'); END IF;
  RETURN jsonb_build_object('blocked',false);
END; $$;

-- ULTIMATE redeem_wallet_code (7 Layers)
CREATE OR REPLACE FUNCTION public.redeem_wallet_code(p_code TEXT, p_ip_hint TEXT DEFAULT NULL, p_region TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row RECORD; v_uid UUID; v_fc INTEGER; v_ifc INTEGER; v_bal NUMERIC; v_vel JSONB; v_vc TEXT;
BEGIN
  v_uid:=auth.uid(); IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','يجب تسجيل الدخول أولاً'); END IF;
  SELECT COUNT(*) INTO v_fc FROM public.wallet_redemption_attempts WHERE user_id=v_uid AND success=FALSE AND created_at>NOW()-INTERVAL '15 minutes';
  IF v_fc>=5 THEN INSERT INTO public.wallet_security_alerts(alert_type,severity,user_id,details) VALUES('rate_limit_triggered','high',v_uid,jsonb_build_object('failed',v_fc,'ip',p_ip_hint)); RETURN jsonb_build_object('success',false,'error','تم تجاوز المحاولات. حاول بعد 15 دقيقة','locked',true,'retry_after_minutes',15); END IF;
  IF p_ip_hint IS NOT NULL THEN SELECT COUNT(*) INTO v_ifc FROM public.wallet_redemption_attempts WHERE ip_hint=p_ip_hint AND success=FALSE AND created_at>NOW()-INTERVAL '30 minutes'; IF v_ifc>=10 THEN INSERT INTO public.wallet_security_alerts(alert_type,severity,user_id,details) VALUES('ip_rate_limit','critical',v_uid,jsonb_build_object('ip',p_ip_hint)); RETURN jsonb_build_object('success',false,'error','تم حظر الجهاز مؤقتاً','locked',true,'retry_after_minutes',30); END IF; END IF;
  v_vel:=public.check_redemption_velocity(v_uid); IF (v_vel->>'blocked')::BOOLEAN THEN INSERT INTO public.wallet_security_alerts(alert_type,severity,user_id,details) VALUES('suspicious_velocity','high',v_uid,v_vel); RETURN jsonb_build_object('success',false,'error',v_vel->>'message'); END IF;
  SELECT * INTO v_row FROM public.wallet_codes WHERE code=UPPER(TRIM(p_code)) FOR UPDATE;
  IF v_row IS NULL THEN INSERT INTO public.wallet_redemption_attempts(user_id,attempted_code,success,ip_hint) VALUES(v_uid,LEFT(UPPER(TRIM(p_code)),4)||'****',FALSE,p_ip_hint); RETURN jsonb_build_object('success',false,'error','الكود غير صحيح'); END IF;
  IF v_row.is_used THEN INSERT INTO public.wallet_redemption_attempts(user_id,attempted_code,success,ip_hint) VALUES(v_uid,LEFT(v_row.code,4)||'****',FALSE,p_ip_hint); RETURN jsonb_build_object('success',false,'error','هذا الكود مُستخدم بالفعل'); END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at<NOW() THEN INSERT INTO public.wallet_redemption_attempts(user_id,attempted_code,success,ip_hint) VALUES(v_uid,LEFT(v_row.code,4)||'****',FALSE,p_ip_hint); RETURN jsonb_build_object('success',false,'error','هذا الكود منتهي الصلاحية'); END IF;
  IF v_row.approval_status IS NOT NULL AND v_row.approval_status<>'approved' THEN RETURN jsonb_build_object('success',false,'error','هذا الكود غير مفعّل بعد'); END IF;
  IF v_row.target_type IS NOT NULL AND v_row.target_type<>'customer' THEN RETURN jsonb_build_object('success',false,'error','هذا الكود مخصص للمندوبين فقط'); END IF;
  IF v_row.hmac_signature IS NOT NULL THEN IF NOT public.verify_code_hmac(v_row.code,v_row.amount,v_row.hmac_signature) THEN INSERT INTO public.wallet_security_alerts(alert_type,severity,user_id,details) VALUES('invalid_hmac','critical',v_uid,jsonb_build_object('code_id',v_row.id)); RETURN jsonb_build_object('success',false,'error','خطأ في التحقق من الكود'); END IF; END IF;
  IF v_row.allowed_region IS NOT NULL AND p_region IS NOT NULL THEN IF LOWER(v_row.allowed_region)<>LOWER(p_region) THEN INSERT INTO public.wallet_security_alerts(alert_type,severity,user_id,details) VALUES('geo_blocked','medium',v_uid,jsonb_build_object('allowed',v_row.allowed_region,'actual',p_region)); RETURN jsonb_build_object('success',false,'error','هذا الكود غير متاح في منطقتك'); END IF; END IF;
  IF v_row.created_by=v_uid THEN RETURN jsonb_build_object('success',false,'error','لا يمكنك استخدام كود أنشأته بنفسك'); END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_bal FROM public.wallet_transactions WHERE customer_id=v_uid;
  IF (v_bal+v_row.amount)>50000 THEN RETURN jsonb_build_object('success',false,'error','سيتجاوز رصيدك الحد الأقصى (50000)'); END IF;
  IF v_row.amount>=500 THEN v_vc:=LPAD(FLOOR(RANDOM()*1000000)::TEXT,6,'0'); DELETE FROM public.wallet_pending_redemptions WHERE user_id=v_uid AND code_id=v_row.id; INSERT INTO public.wallet_pending_redemptions(user_id,code_id,verification_code) VALUES(v_uid,v_row.id,v_vc); INSERT INTO public.wallet_audit_log(actor_id,action,target_id,details) VALUES(v_uid,'2fa_required',v_row.id,jsonb_build_object('amount',v_row.amount)); RETURN jsonb_build_object('success',false,'requires_2fa',true,'code_id',v_row.id,'amount',v_row.amount,'verification_hint',LEFT(v_vc,2)||'****','message','يتطلب تأكيد إضافي'); END IF;
  UPDATE public.wallet_codes SET is_used=TRUE,redeemed_by=v_uid,redeemed_at=NOW() WHERE id=v_row.id;
  INSERT INTO public.wallet_transactions(customer_id,amount,type,description,reference_id) VALUES(v_uid,v_row.amount,'topup','شحن المحفظة — كود #'||SUBSTRING(v_row.code,1,8),v_row.id);
  INSERT INTO public.wallet_redemption_attempts(user_id,attempted_code,success,ip_hint) VALUES(v_uid,LEFT(v_row.code,4)||'****',TRUE,p_ip_hint);
  INSERT INTO public.wallet_audit_log(actor_id,action,target_id,details) VALUES(v_uid,'code_redeemed',v_row.id,jsonb_build_object('amount',v_row.amount));
  RETURN jsonb_build_object('success',true,'amount',v_row.amount,'message','تم شحن المحفظة بنجاح');
END; $$;

-- Confirm 2FA Redemption
CREATE OR REPLACE FUNCTION public.confirm_wallet_redemption(p_code_id UUID, p_verification_code TEXT, p_ip_hint TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_p RECORD; v_c RECORD; v_uid UUID; v_bal NUMERIC;
BEGIN
  v_uid:=auth.uid(); IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','يجب تسجيل الدخول'); END IF;
  SELECT * INTO v_p FROM public.wallet_pending_redemptions WHERE user_id=v_uid AND code_id=p_code_id AND verified=FALSE AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_p IS NULL THEN RETURN jsonb_build_object('success',false,'error','لا يوجد طلب تأكيد نشط'); END IF;
  IF v_p.attempts>=v_p.max_attempts THEN UPDATE public.wallet_pending_redemptions SET expires_at=NOW() WHERE id=v_p.id; RETURN jsonb_build_object('success',false,'error','تم تجاوز محاولات التأكيد'); END IF;
  IF v_p.verification_code<>p_verification_code THEN UPDATE public.wallet_pending_redemptions SET attempts=attempts+1 WHERE id=v_p.id; INSERT INTO public.wallet_security_alerts(alert_type,severity,user_id,details) VALUES('2fa_failed','high',v_uid,jsonb_build_object('code_id',p_code_id)); RETURN jsonb_build_object('success',false,'error','رمز التحقق غير صحيح. المتبقي: '||(v_p.max_attempts-v_p.attempts-1)); END IF;
  UPDATE public.wallet_pending_redemptions SET verified=TRUE WHERE id=v_p.id;
  SELECT * INTO v_c FROM public.wallet_codes WHERE id=p_code_id FOR UPDATE;
  IF v_c IS NULL OR v_c.is_used THEN RETURN jsonb_build_object('success',false,'error','الكود غير متاح'); END IF;
  IF v_c.hmac_signature IS NOT NULL THEN IF NOT public.verify_code_hmac(v_c.code,v_c.amount,v_c.hmac_signature) THEN RETURN jsonb_build_object('success',false,'error','خطأ في التحقق'); END IF; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_bal FROM public.wallet_transactions WHERE customer_id=v_uid;
  IF (v_bal+v_c.amount)>50000 THEN RETURN jsonb_build_object('success',false,'error','سيتجاوز الحد الأقصى'); END IF;
  UPDATE public.wallet_codes SET is_used=TRUE,redeemed_by=v_uid,redeemed_at=NOW() WHERE id=v_c.id;
  INSERT INTO public.wallet_transactions(customer_id,amount,type,description,reference_id) VALUES(v_uid,v_c.amount,'topup','شحن مؤكد — كود #'||SUBSTRING(v_c.code,1,8),v_c.id);
  INSERT INTO public.wallet_redemption_attempts(user_id,attempted_code,success,ip_hint) VALUES(v_uid,LEFT(v_c.code,4)||'****',TRUE,p_ip_hint);
  INSERT INTO public.wallet_audit_log(actor_id,action,target_id,details) VALUES(v_uid,'code_redeemed_2fa',v_c.id,jsonb_build_object('amount',v_c.amount,'2fa',true));
  RETURN jsonb_build_object('success',true,'amount',v_c.amount,'message','تم شحن المحفظة بنجاح بعد التأكيد');
END; $$;

-- Deduct Wallet (hardened)
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(p_customer_id UUID, p_amount NUMERIC, p_order_id UUID DEFAULT NULL, p_description TEXT DEFAULT 'دفع طلب من المحفظة')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_bal NUMERIC; v_ds NUMERIC; v_caller UUID;
BEGIN
  v_caller:=auth.uid(); IF v_caller IS NULL OR v_caller<>p_customer_id THEN RETURN jsonb_build_object('success',false,'error','غير مصرّح'); END IF;
  IF p_amount<=0 THEN RETURN jsonb_build_object('success',false,'error','مبلغ غير صالح'); END IF;
  IF p_amount>5000 THEN RETURN jsonb_build_object('success',false,'error','الحد الأقصى 5000 جنيه'); END IF;
  SELECT COALESCE(SUM(ABS(amount)),0) INTO v_ds FROM public.wallet_transactions WHERE customer_id=p_customer_id AND type='payment' AND created_at>CURRENT_DATE;
  IF (v_ds+p_amount)>10000 THEN RETURN jsonb_build_object('success',false,'error','تم تجاوز حد الإنفاق اليومي'); END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_bal FROM public.wallet_transactions WHERE customer_id=p_customer_id;
  IF v_bal<p_amount THEN RETURN jsonb_build_object('success',false,'error','رصيد غير كافٍ','balance',v_bal); END IF;
  INSERT INTO public.wallet_transactions(customer_id,amount,type,description,reference_id) VALUES(p_customer_id,-p_amount,'payment',p_description,p_order_id);
  INSERT INTO public.wallet_audit_log(actor_id,action,target_id,details) VALUES(v_caller,'wallet_payment',p_order_id,jsonb_build_object('amount',p_amount,'remaining',v_bal-p_amount));
  RETURN jsonb_build_object('success',true,'remaining',v_bal-p_amount);
END; $$;

-- Security Dashboard
CREATE OR REPLACE FUNCTION public.get_security_dashboard() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_u INTEGER; v_c INTEGER; v_b INTEGER; v_t INTEGER; v_s INTEGER; v_r JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('super_admin','accountant')) THEN RETURN jsonb_build_object('error','unauthorized'); END IF;
  SELECT COUNT(*) INTO v_u FROM public.wallet_security_alerts WHERE is_read=FALSE;
  SELECT COUNT(*) INTO v_c FROM public.wallet_security_alerts WHERE severity='critical' AND is_read=FALSE;
  SELECT COUNT(DISTINCT user_id) INTO v_b FROM (SELECT user_id FROM public.wallet_redemption_attempts WHERE success=FALSE AND created_at>NOW()-INTERVAL '15 minutes' GROUP BY user_id HAVING COUNT(*)>=5) x;
  SELECT COUNT(*) INTO v_t FROM public.wallet_redemption_attempts WHERE created_at>CURRENT_DATE;
  SELECT COUNT(*) INTO v_s FROM public.wallet_redemption_attempts WHERE success=TRUE AND created_at>CURRENT_DATE;
  SELECT COALESCE(jsonb_agg(a),'[]'::jsonb) INTO v_r FROM (SELECT id,alert_type,severity,user_id,details,is_read,created_at FROM public.wallet_security_alerts ORDER BY created_at DESC LIMIT 10) a;
  RETURN jsonb_build_object('unread_alerts',v_u,'critical_alerts',v_c,'blocked_users',COALESCE(v_b,0),'today_attempts',v_t,'today_success',v_s,'today_failed',v_t-v_s,'recent_alerts',v_r);
END; $$;

-- Resolve Alert
CREATE OR REPLACE FUNCTION public.resolve_security_alert(p_alert_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='super_admin') THEN RETURN jsonb_build_object('success',false,'error','غير مصرّح'); END IF;
  UPDATE public.wallet_security_alerts SET is_read=TRUE,resolved_by=auth.uid(),resolved_at=NOW() WHERE id=p_alert_id;
  RETURN jsonb_build_object('success',true);
END; $$;

-- Cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_redemption_attempts() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.wallet_redemption_attempts WHERE created_at<NOW()-INTERVAL '24 hours';
  DELETE FROM public.wallet_pending_redemptions WHERE expires_at<NOW()-INTERVAL '1 hour';
  DELETE FROM public.wallet_security_alerts WHERE created_at<NOW()-INTERVAL '90 days' AND is_read=TRUE;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- FINAL VERIFICATION
-- ══════════════════════════════════════════════════════════════
SELECT '✅ SETUP COMPLETE' AS status;
SELECT id, role, admin_type FROM public.profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'malmaghrabi77@gmail.com');
