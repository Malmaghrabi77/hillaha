-- ============================================================
-- COMPLETE HILLAHA MIGRATION
-- ملف واحد يحتوي على جميع الـ Migrations من 001 إلى 015
-- شغّل هذا الملف بالكامل في Supabase SQL Editor
-- التاريخ: 2026-02-28
-- ============================================================

-- ============================================================
-- MIGRATION 001: INITIAL SETUP
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_type') THEN
    CREATE TYPE partner_type AS ENUM ('restaurant', 'store', 'pharmacy', 'clinic');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'delivering', 'done', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'wallet_transfer', 'card');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_unit') THEN
    CREATE TYPE price_unit AS ENUM ('per_hour', 'per_visit', 'per_wash', 'per_trip');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('admin', 'master');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    CREATE TYPE vehicle_type AS ENUM ('motorcycle', 'bicycle', 'car');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_type') THEN
    CREATE TYPE category_type AS ENUM ('food', 'service');
  END IF;
END $$;

create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  name_ar     text not null,
  icon        text not null default '🍽️',
  image       text,
  type        category_type not null default 'food',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists customers (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text not null default '',
  name_ar          text,
  phone            text,
  email            text,
  address          text,
  city             text not null default 'Qena',
  loyalty_points   int not null default 0,
  total_spent      numeric(10, 2) not null default 0,
  total_orders     int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists partners (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  name_ar           text not null,
  description       text,
  description_ar    text,
  image             text,
  cover_image       text,
  category_id       uuid references categories(id) on delete set null,
  type              partner_type not null default 'restaurant',
  rating            numeric(3, 2) not null default 0,
  review_count      int not null default 0,
  delivery_time     text not null default '30-45 دقيقة',
  delivery_fee      numeric(8, 2) not null default 15,
  min_order         numeric(8, 2) not null default 0,
  is_open           boolean not null default true,
  is_featured       boolean not null default false,
  tags              text[] not null default '{}',
  address           text,
  city              text not null default 'Qena',
  country           text not null default 'EG',
  phone             text,
  email             text,
  password_hash     text,
  commission_rate   numeric(5, 4) not null default 0.10,
  total_orders      int not null default 0,
  total_revenue     numeric(12, 2) not null default 0,
  is_approved       boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists drivers (
  id                 uuid primary key default uuid_generate_v4(),
  name               text not null,
  name_ar            text,
  phone              text unique not null,
  email              text,
  vehicle_type       vehicle_type,
  vehicle_plate      text,
  national_id        text,
  city               text not null default 'Qena',
  commission_rate    numeric(5, 4) not null default 0.10,
  total_deliveries   int not null default 0,
  total_earnings     numeric(12, 2) not null default 0,
  is_online          boolean not null default false,
  is_approved        boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

create table if not exists menu_items (
  id               uuid primary key default uuid_generate_v4(),
  partner_id       uuid not null references partners(id) on delete cascade,
  name             text not null,
  name_ar          text not null,
  description      text,
  description_ar   text,
  price            numeric(10, 2) not null,
  image            text,
  category         text,
  is_available     boolean not null default true,
  is_popular       boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists services (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  name_ar          text not null,
  description      text,
  description_ar   text,
  icon             text not null default '🔧',
  image            text,
  base_price       numeric(10, 2) not null,
  price_unit       price_unit not null default 'per_visit',
  rating           numeric(3, 2) not null default 0,
  is_available     boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists orders (
  id                     uuid primary key default uuid_generate_v4(),
  customer_id            uuid references customers(id) on delete set null,
  partner_id             uuid references partners(id) on delete set null,
  driver_id              uuid references drivers(id) on delete set null,
  status                 order_status not null default 'pending',
  items                  jsonb not null default '[]',
  subtotal               numeric(10, 2) not null default 0,
  delivery_fee           numeric(8, 2) not null default 15,
  discount               numeric(8, 2) not null default 0,
  total                  numeric(10, 2) not null default 0,
  app_commission         numeric(10, 2) not null default 0,
  commission_rate        numeric(5, 4) not null default 0.10,
  loyalty_points_earned  int not null default 0,
  loyalty_points_used    int not null default 0,
  payment_method         payment_method not null default 'cash',
  payment_status         payment_status not null default 'pending',
  payment_proof_url      text,
  delivery_address       text not null default '',
  customer_phone         text,
  customer_note          text,
  customer_name          text,
  created_at             timestamptz not null default now()
);

create table if not exists admins (
  id            uuid primary key default uuid_generate_v4(),
  username      text unique not null,
  password_hash text not null,
  name          text not null,
  name_ar       text,
  email         text,
  role          admin_role not null default 'admin',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_partners_category   on partners(category_id);
create index if not exists idx_partners_featured   on partners(is_featured) where is_featured = true;
create index if not exists idx_partners_open       on partners(is_open) where is_open = true;
create index if not exists idx_menu_items_partner  on menu_items(partner_id);
create index if not exists idx_menu_items_popular  on menu_items(is_popular) where is_popular = true;
create index if not exists idx_orders_customer     on orders(customer_id);
create index if not exists idx_orders_partner      on orders(partner_id);
create index if not exists idx_orders_driver       on orders(driver_id);
create index if not exists idx_orders_status       on orders(status);
create index if not exists idx_orders_created_at   on orders(created_at desc);

create index if not exists idx_partners_search on partners using gin(
  to_tsvector('arabic', coalesce(name_ar, '') || ' ' || coalesce(name, ''))
);

-- Enable Row Level Security
alter table customers         enable row level security;
alter table orders            enable row level security;
alter table categories        enable row level security;
alter table partners          enable row level security;
alter table menu_items        enable row level security;
alter table services          enable row level security;
alter table platform_settings enable row level security;
alter table admins            enable row level security;
alter table drivers           enable row level security;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Public read categories') THEN
    CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'Public read partners') THEN
    CREATE POLICY "Public read partners" ON partners FOR SELECT USING (is_approved = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Public read menu_items') THEN
    CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (is_available = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Public read services') THEN
    CREATE POLICY "Public read services" ON services FOR SELECT USING (is_available = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Public read settings') THEN
    CREATE POLICY "Public read settings" ON platform_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Customer own row') THEN
    CREATE POLICY "Customer own row" ON customers FOR ALL USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customer own orders') THEN
    CREATE POLICY "Customer own orders" ON orders FOR SELECT USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customer insert orders') THEN
    CREATE POLICY "Customer insert orders" ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;

-- ============================================================
-- MIGRATION 002: APP COMPATIBILITY
-- ============================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS category        text,
  ADD COLUMN IF NOT EXISTS name_ar         text,
  ADD COLUMN IF NOT EXISTS description_ar  text,
  ADD COLUMN IF NOT EXISTS cover_image     text,
  ADD COLUMN IF NOT EXISTS review_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_time   text DEFAULT '30-45 دقيقة',
  ADD COLUMN IF NOT EXISTS delivery_fee    numeric(6,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS min_order       numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags            text[],
  ADD COLUMN IF NOT EXISTS commission_rate numeric(4,3) NOT NULL DEFAULT 0.10;

UPDATE public.partners SET name_ar = name WHERE name_ar IS NULL;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar      text,
  ADD COLUMN IF NOT EXISTS image        text,
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_popular   boolean NOT NULL DEFAULT false;

UPDATE public.menu_items SET name_ar = name WHERE name_ar IS NULL;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_settings (key, value) VALUES
  ('instapay_account',   '@malmaghrabi77'),
  ('etisalat_phone',     '01107549225'),
  ('vodafone_phone',     ''),
  ('delivery_fee_base',  '15'),
  ('min_order_default',  '0'),
  ('loyalty_per_egp',    '250'),
  ('loyalty_min_redeem', '20')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- MIGRATION 003: COMPLETE SETUP
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Core RLS policies for profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- MIGRATION 04: ADD NOTIFICATIONS
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications') THEN
    CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- MIGRATION 05: ADD ADMIN ROLES
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_type TEXT CHECK (admin_type IS NULL OR admin_type IN ('regional_manager', 'regular_admin')),
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- ============================================================
-- MIGRATION 06: CREATE ADMIN TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  assigned_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  description     TEXT,
  target_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 07: ADMIN RLS POLICIES
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_assignments' AND policyname = 'super_admin_view') THEN
    CREATE POLICY "super_admin_view" ON public.admin_assignments FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
END $$;

-- ============================================================
-- MIGRATION 08: ADMIN INVITATIONS
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
-- MIGRATION 09: ADMIN SYSTEM COMPLETE
-- ============================================================

-- No additional changes needed, system is complete

-- ============================================================
-- MIGRATION 10: SET SUPER ADMIN
-- ============================================================

DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  -- Get the Super Admin user ID
  SELECT id INTO super_admin_id FROM auth.users
  WHERE email = 'malmaghrabi77@gmail.com' LIMIT 1;

  IF super_admin_id IS NOT NULL THEN
    -- Update profile
    INSERT INTO public.profiles (id, role, email, created_at)
    VALUES (super_admin_id, 'super_admin', 'malmaghrabi77@gmail.com', NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- ============================================================
-- MIGRATION 11: INVENTORY, STAFF, NOTIFICATIONS
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

CREATE INDEX IF NOT EXISTS idx_inventory_partner ON public.inventory_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_partner ON public.inventory_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_staff_partner ON public.staff(partner_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 12: PARTNER INVITATIONS WORKFLOW
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  phone               TEXT NOT NULL,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_type        TEXT DEFAULT 'super_admin' CHECK (invited_type IN ('super_admin', 'regional_manager')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ,
  rejection_reason    TEXT
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON public.partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_status ON public.partner_invitations(status);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_invited_by ON public.partner_invitations(invited_by);

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_id_ref UUID REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 13: FIX REGULAR ADMIN TO REGIONAL MANAGER
-- ============================================================

-- Change admin_type constraint to allow both types properly
ALTER TABLE public.admin_invitations
  DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;

ALTER TABLE public.admin_invitations
  ADD CONSTRAINT admin_invitations_admin_type_check
  CHECK (admin_type IN ('regional_manager', 'regular_admin'));

-- ============================================================
-- MIGRATION 14: COMPLETE WORKFLOW SYSTEM
-- ============================================================

-- Update admin_invitations table
ALTER TABLE public.admin_invitations
  ADD COLUMN IF NOT EXISTS can_be_invited_by TEXT DEFAULT 'super_admin,regional_manager'
  CHECK (can_be_invited_by IN ('super_admin', 'regional_manager', 'super_admin,regional_manager'));

-- Update partner_invitations with multi-level approvals
ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS regional_manager_approval TEXT DEFAULT NULL
  CHECK (regional_manager_approval IS NULL OR regional_manager_approval IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS approved_by_regional_manager UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS approved_by_super_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS super_admin_approval TEXT DEFAULT NULL
  CHECK (super_admin_approval IS NULL OR super_admin_approval IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS invited_by_role TEXT DEFAULT 'super_admin'
  CHECK (invited_by_role IN ('super_admin', 'regional_manager', 'regular_admin'));

ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Create store_admins table
CREATE TABLE IF NOT EXISTS public.store_admins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  name                TEXT NOT NULL,
  name_ar             TEXT,
  phone               TEXT,
  store_id            UUID,
  store_name          TEXT,
  assigned_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  activated_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_admins_partner ON public.store_admins(partner_id);
CREATE INDEX IF NOT EXISTS idx_store_admins_email ON public.store_admins(email);
CREATE INDEX IF NOT EXISTS idx_store_admins_status ON public.store_admins(status);

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy for store_admins
DROP POLICY IF EXISTS "partner_manage_store_admins" ON public.store_admins;
CREATE POLICY "partner_manage_store_admins" ON public.store_admins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = store_admins.partner_id
      AND created_by = auth.uid()
    )
  );

-- ============================================================
-- MIGRATION 15: CRITICAL FIXES FINAL
-- ============================================================

-- PART 1: Add admin_type column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_type TEXT DEFAULT NULL
  CHECK (admin_type IS NULL OR admin_type IN ('regional_manager', 'regular_admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_admin_type ON public.profiles(admin_type);

-- PART 2: Fix admin_invitations table constraints
ALTER TABLE public.admin_invitations
  DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;

ALTER TABLE public.admin_invitations
  ADD CONSTRAINT admin_invitations_admin_type_check
  CHECK (admin_type IN ('regional_manager', 'regular_admin'));

-- PART 3: Fix store_admins RLS Policy
DROP POLICY IF EXISTS "partner_manage_store_admins" ON public.store_admins;

CREATE POLICY "partner_manage_store_admins" ON public.store_admins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = store_admins.partner_id
      AND created_by = auth.uid()
    )
  );

-- PART 4: Add missing RLS policies for store_admins
DROP POLICY IF EXISTS "store_admin_insert" ON public.store_admins;
CREATE POLICY "store_admin_insert" ON public.store_admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_admin_update" ON public.store_admins;
CREATE POLICY "store_admin_update" ON public.store_admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_admin_delete" ON public.store_admins;
CREATE POLICY "store_admin_delete" ON public.store_admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_id
      AND created_by = auth.uid()
    )
  );

-- PART 5: Add missing RLS policies for inventory_items
DROP POLICY IF EXISTS "inventory_items_insert" ON public.inventory_items;
CREATE POLICY "inventory_items_insert" ON public.inventory_items
  FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_items_update" ON public.inventory_items;
CREATE POLICY "inventory_items_update" ON public.inventory_items
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_items_delete" ON public.inventory_items;
CREATE POLICY "inventory_items_delete" ON public.inventory_items
  FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

-- PART 6: Add missing RLS policies for inventory_transactions
DROP POLICY IF EXISTS "inventory_transactions_insert" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions
  FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_transactions_update" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_update" ON public.inventory_transactions
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_transactions_delete" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_delete" ON public.inventory_transactions
  FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

-- PART 7: Add missing RLS policies for staff
DROP POLICY IF EXISTS "staff_insert" ON public.staff;
CREATE POLICY "staff_insert" ON public.staff
  FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_update" ON public.staff;
CREATE POLICY "staff_update" ON public.staff
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_delete" ON public.staff;
CREATE POLICY "staff_delete" ON public.staff
  FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE created_by = auth.uid()
    )
  );

-- ============================================================
-- FINAL MESSAGE
-- ============================================================

SELECT 'ALL MIGRATIONS COMPLETE - DATABASE IS READY' as status;
