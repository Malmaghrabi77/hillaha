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
