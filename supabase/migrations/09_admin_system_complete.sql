-- ============================================================
-- Complete Admin System Setup - All in One Migration
-- ============================================================
-- This migration creates all necessary tables, columns, and policies
-- for the admin system without affecting previous functionality
-- Created: 2026-02-27

-- ============================================================
-- PART 1: CREATE NEW TABLES
-- ============================================================

-- Create admin_assignments table
CREATE TABLE IF NOT EXISTS admin_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, partner_id)
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_assignments_admin_id ON admin_assignments(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_partner_id ON admin_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_status ON admin_assignments(status);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity_type ON admin_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- ============================================================
-- PART 3: UPDATE EXISTING TABLES - Add Missing Columns
-- ============================================================

-- Add columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;

-- Create indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update partners table columns
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_partners_is_open ON partners(is_open);

-- Update orders table columns
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
ALTER TABLE IF EXISTS orders
DROP CONSTRAINT IF EXISTS fk_orders_partner_id;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_partner_id
FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_partner_id ON orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: CREATE RLS POLICIES
-- ============================================================

-- Admin assignments policies
DROP POLICY IF EXISTS "admins_view_own_assignments" ON admin_assignments;
CREATE POLICY "admins_view_own_assignments"
  ON admin_assignments FOR SELECT
  USING (admin_id = auth.uid());

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

-- Admin logs policies
DROP POLICY IF EXISTS "admins_view_own_logs" ON admin_logs;
CREATE POLICY "admins_view_own_logs"
  ON admin_logs FOR SELECT
  USING (admin_id = auth.uid());

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

-- ============================================================
-- PART 6: SEED DATA - Set Super Admin
-- ============================================================

-- نقل التعليق: إذا كان لديك بالفعل حساب malmaghrabi77@gmail.com في auth.users
-- قم بـ uncomment السطور التالية وأدخل البيانات الصحيحة:

-- UPDATE profiles
-- SET role = 'super_admin', is_active = true
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'malmaghrabi77@gmail.com'
-- );

-- ============================================================
-- PART 7: VERIFICATION QUERIES
-- ============================================================

-- تشغيل هذه الاستعلامات للتحقق من تطبيق الـ migration بنجاح:

-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('admin_assignments', 'admin_logs');

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- AND column_name IN ('phone', 'rating', 'completed_orders', 'total_earnings');

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'admin_assignments'
-- ORDER BY column_name;

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'admin_logs'
-- ORDER BY column_name;

-- تحقق من الـ indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('admin_assignments', 'admin_logs', 'profiles', 'partners', 'orders');

-- تحقق من السوبر أدمن:
-- SELECT email, role FROM profiles p
-- JOIN auth.users u ON p.id = u.id
-- WHERE email = 'malmaghrabi77@gmail.com';
