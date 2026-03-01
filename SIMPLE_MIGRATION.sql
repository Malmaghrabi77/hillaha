-- ============================================================
-- HILLAHA SIMPLIFIED MIGRATION
-- ملف مبسط يضيف فقط الأعمدة والجداول الناقصة
-- يتعامل مع الواقع الحالي لقاعدة البيانات
-- التاريخ: 2026-02-28
-- ============================================================

-- ============================================================
-- PART 1: ENSURE BASIC TYPES EXIST
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_type') THEN
    CREATE TYPE partner_type AS ENUM ('restaurant', 'store', 'pharmacy', 'clinic');
  END IF;
END $$;

-- ============================================================
-- PART 2: ENSURE PROFILES TABLE EXISTS WITH ADMIN COLUMNS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('super_admin', 'admin', 'customer', 'driver', 'partner')),
  display_name    TEXT,
  avatar_url      TEXT,
  email           TEXT,
  phone           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add admin_type column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN admin_type TEXT DEFAULT NULL
    CHECK (admin_type IS NULL OR admin_type IN ('regional_manager', 'regular_admin'));
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_type ON public.profiles(admin_type);

-- ============================================================
-- PART 3: ADD MISSING COLUMNS TO PARTNERS
-- ============================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT '30-45 دقيقة',
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(6,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS min_order NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(4,3) DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- ============================================================
-- PART 4: ADD MISSING COLUMNS TO MENU_ITEMS
-- ============================================================

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;

-- ============================================================
-- PART 5: CREATE ADMIN INVITATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT,
  admin_type      TEXT NOT NULL CHECK (admin_type IN ('regional_manager', 'regular_admin')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  can_be_invited_by TEXT DEFAULT 'super_admin,regional_manager' CHECK (can_be_invited_by IN ('super_admin', 'regional_manager', 'super_admin,regional_manager')),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations(status);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 6: CREATE PARTNER INVITATIONS TABLE
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
CREATE INDEX IF NOT EXISTS idx_partner_invitations_invited_by ON public.partner_invitations(invited_by);

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 7: CREATE STORE ADMINS TABLE
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
CREATE INDEX IF NOT EXISTS idx_store_admins_status ON public.store_admins(status);

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 8: CREATE INVENTORY TABLES
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
  max_quantity      INTEGER,
  unit_cost         NUMERIC(10,2),
  supplier_id       UUID,
  last_restocked    TIMESTAMPTZ,
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
  reference_id      UUID,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_partner ON public.inventory_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_partner ON public.inventory_transactions(partner_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 9: CREATE STAFF TABLE
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
-- PART 10: CREATE NOTIFICATIONS TABLE
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
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 11: RLS POLICIES FOR ADMIN TABLES
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications') THEN
    CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- PART 12: RLS POLICIES FOR STORE ADMINS
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_admins' AND policyname = 'store_admin_insert') THEN
    CREATE POLICY "store_admin_insert" ON public.store_admins FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.partners
          WHERE id = partner_id
          AND created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_admins' AND policyname = 'store_admin_update') THEN
    CREATE POLICY "store_admin_update" ON public.store_admins FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.partners
          WHERE id = partner_id
          AND created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_admins' AND policyname = 'store_admin_delete') THEN
    CREATE POLICY "store_admin_delete" ON public.store_admins FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.partners
          WHERE id = partner_id
          AND created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- PART 13: RLS POLICIES FOR INVENTORY
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_items_insert') THEN
    CREATE POLICY "inventory_items_insert" ON public.inventory_items FOR INSERT
      WITH CHECK (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_items_update') THEN
    CREATE POLICY "inventory_items_update" ON public.inventory_items FOR UPDATE
      USING (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_items_delete') THEN
    CREATE POLICY "inventory_items_delete" ON public.inventory_items FOR DELETE
      USING (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- PART 14: RLS POLICIES FOR STAFF
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'staff_insert') THEN
    CREATE POLICY "staff_insert" ON public.staff FOR INSERT
      WITH CHECK (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'staff_update') THEN
    CREATE POLICY "staff_update" ON public.staff FOR UPDATE
      USING (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'staff_delete') THEN
    CREATE POLICY "staff_delete" ON public.staff FOR DELETE
      USING (
        partner_id IN (
          SELECT id FROM public.partners
          WHERE created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- PART 15: SET SUPER ADMIN
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

SELECT 'SIMPLIFIED MIGRATION COMPLETE - DATABASE IS READY' as status;
