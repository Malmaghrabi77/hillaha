-- ============================================================
-- HILLAHA MINIMAL MIGRATION
-- أقل ملف متطلبات - يضيف فقط الضروري
-- التاريخ: 2026-02-28
-- ============================================================

-- ============================================================
-- STEP 1: Create profiles table if not exists
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'customer',
  display_name    TEXT,
  avatar_url      TEXT,
  email           TEXT,
  phone           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add admin_type column safely
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN admin_type TEXT DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_type ON public.profiles(admin_type);

-- ============================================================
-- STEP 2: Add missing columns to partners table
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'name_ar'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN name_ar TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'description_ar'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN description_ar TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN cover_image TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN delivery_time TEXT DEFAULT '30-45 دقيقة';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN tags TEXT[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN approval_status TEXT DEFAULT 'approved';
  END IF;
END $$;

-- ============================================================
-- STEP 3: Create admin_invitations table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT,
  admin_type      TEXT NOT NULL CHECK (admin_type IN ('regional_manager', 'regular_admin')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations(status);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: Create partner_invitations table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT NOT NULL UNIQUE,
  name                        TEXT NOT NULL,
  phone                       TEXT NOT NULL,
  status                      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by_role             TEXT DEFAULT 'super_admin' CHECK (invited_by_role IN ('super_admin', 'regional_manager', 'regular_admin')),
  regional_manager_approval   TEXT DEFAULT NULL CHECK (regional_manager_approval IS NULL OR regional_manager_approval IN ('pending', 'approved', 'rejected')),
  super_admin_approval        TEXT DEFAULT NULL CHECK (super_admin_approval IS NULL OR super_admin_approval IN ('pending', 'approved', 'rejected')),
  approved_by_regional_manager UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_super_admin     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_notes              TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at                 TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON public.partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_status ON public.partner_invitations(status);

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Create store_admins table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  phone           TEXT,
  store_id        UUID,
  store_name      TEXT,
  assigned_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  activated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_admins_partner ON public.store_admins(partner_id);
CREATE INDEX IF NOT EXISTS idx_store_admins_email ON public.store_admins(email);

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: Create inventory tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  name_ar           TEXT,
  sku               TEXT UNIQUE,
  quantity          INTEGER NOT NULL DEFAULT 0,
  unit              TEXT DEFAULT 'piece',
  min_quantity      INTEGER DEFAULT 10,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity          INTEGER NOT NULL,
  reason            TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_partner ON public.inventory_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_partner ON public.inventory_transactions(partner_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 7: Create staff table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
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
-- STEP 8: Create notifications table if not exists
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- STEP 9: Add RLS Policies for profiles
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- STEP 10: Add RLS Policies for store_admins
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_admins' AND policyname = 'partner_manage_store_admins') THEN
    CREATE POLICY "partner_manage_store_admins" ON public.store_admins FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.partners
          WHERE id = store_admins.partner_id
          AND created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- STEP 11: Add RLS Policies for inventory and staff
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_partner_access') THEN
    CREATE POLICY "inventory_partner_access" ON public.inventory_items FOR ALL
      USING (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'staff_partner_access') THEN
    CREATE POLICY "staff_partner_access" ON public.staff FOR ALL
      USING (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- STEP 12: Set Super Admin
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
-- FINAL MESSAGE
-- ============================================================

SELECT 'MINIMAL MIGRATION COMPLETE ✅' as status;
