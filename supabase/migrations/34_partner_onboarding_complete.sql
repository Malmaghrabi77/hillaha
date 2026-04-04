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
