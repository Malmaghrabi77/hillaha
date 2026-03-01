-- ============================================================
-- HILLAHA FINAL CORRECT MIGRATION
-- كود صحيح بناءً على الحالة الفعلية للقاعدة
-- التاريخ: 2026-02-28
-- ============================================================

-- ============================================================
-- STEP 1: ADD admin_type COLUMN TO profiles (THE CRITICAL FIX)
-- ============================================================

DO $$ BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'admin_type'
  ) THEN
    -- Add the column
    ALTER TABLE public.profiles
    ADD COLUMN admin_type TEXT DEFAULT NULL;
  END IF;
END $$;

-- Create index for admin_type
CREATE INDEX IF NOT EXISTS idx_profiles_admin_type ON public.profiles(admin_type);

-- ============================================================
-- STEP 2: CREATE admin_invitations TABLE (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT,
  admin_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  invited_by      UUID,
  super_admin_approval TEXT DEFAULT 'pending',
  approved_by_super_admin UUID,
  super_admin_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  accepted_user_id UUID,
  can_be_invited_by TEXT DEFAULT 'super_admin,regional_manager'
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations(status);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: CREATE partner_invitations TABLE (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT NOT NULL UNIQUE,
  name                        TEXT NOT NULL,
  phone                       TEXT NOT NULL,
  status                      TEXT DEFAULT 'pending',
  invited_by                  UUID,
  invited_type                TEXT DEFAULT 'super_admin',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at                 TIMESTAMPTZ,
  rejection_reason            TEXT,
  regional_manager_approval   TEXT DEFAULT NULL,
  approved_by_regional_manager UUID,
  approved_by_super_admin     UUID,
  super_admin_approval        TEXT DEFAULT NULL,
  invited_by_role             TEXT DEFAULT 'super_admin',
  approval_notes              TEXT,
  approved_at                 TIMESTAMPTZ,
  regional_manager_approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON public.partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_status ON public.partner_invitations(status);

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: ADD MISSING COLUMNS TO partners TABLE
-- ============================================================

DO $$ BEGIN
  -- Add each column if it doesn't exist
  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'name_ar';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN name_ar TEXT;
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'description_ar';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN description_ar TEXT;
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'cover_image';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN cover_image TEXT;
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'is_featured';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'review_count';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'delivery_time';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN delivery_time TEXT DEFAULT '30-45 دقيقة';
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'tags';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN tags TEXT[];
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'created_by';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN created_by UUID;
  END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_name = 'partners' AND column_name = 'approval_status';
  IF NOT FOUND THEN
    ALTER TABLE public.partners ADD COLUMN approval_status TEXT DEFAULT 'approved';
  END IF;
END $$;

-- ============================================================
-- STEP 5: CREATE store_admins TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL,
  email           TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  phone           TEXT,
  store_id        UUID,
  store_name      TEXT,
  assigned_by     UUID,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  activated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_admins_partner ON public.store_admins(partner_id);
CREATE INDEX IF NOT EXISTS idx_store_admins_email ON public.store_admins(email);

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: CREATE inventory_items TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL,
  name              TEXT NOT NULL,
  name_ar           TEXT,
  sku               TEXT UNIQUE,
  quantity          INTEGER NOT NULL DEFAULT 0,
  unit              TEXT DEFAULT 'piece',
  min_quantity      INTEGER DEFAULT 10,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_partner ON public.inventory_items(partner_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 7: CREATE inventory_transactions TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL,
  item_id           UUID NOT NULL,
  type              TEXT NOT NULL,
  quantity          INTEGER NOT NULL,
  reason            TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_partner ON public.inventory_transactions(partner_id);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 8: CREATE staff TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL,
  email             TEXT NOT NULL,
  name              TEXT NOT NULL,
  name_ar           TEXT,
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'staff',
  position          TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  hired_date        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_partner ON public.staff(partner_id);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 9: CREATE notifications TABLE (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  title         TEXT NOT NULL,
  title_ar      TEXT,
  message       TEXT,
  message_ar    TEXT,
  type          TEXT NOT NULL DEFAULT 'info',
  is_read       BOOLEAN DEFAULT FALSE,
  action_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 10: SET SUPER ADMIN
-- ============================================================

DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  SELECT id INTO super_admin_id FROM auth.users
  WHERE email = 'malmaghrabi77@gmail.com' LIMIT 1;

  IF super_admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, role, email, created_at)
    VALUES (super_admin_id, 'super_admin', 'malmaghrabi77@gmail.com', NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- ============================================================
-- FINAL VERIFICATION
-- ============================================================

SELECT '✅ MIGRATION COMPLETE - admin_type column added to profiles' as status;
