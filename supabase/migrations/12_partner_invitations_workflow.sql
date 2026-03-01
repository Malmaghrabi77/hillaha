-- ============================================================
-- Partner Invitations & Admin Workflow Complete Setup
-- ============================================================
-- This migration adds partner invitation system and fixes workflow
-- Created: 2026-02-27

-- ============================================================
-- PART 1: CREATE PARTNER INVITATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_type TEXT DEFAULT 'super_admin' CHECK (invited_type IN ('super_admin', 'regional_manager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- ============================================================
-- PART 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- Add columns to partners if they don't exist
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add columns to profiles if needed
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- ============================================================
-- PART 3: CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_status ON partner_invitations(status);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_invited_by ON partner_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_created_at ON partner_invitations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partners_approval_status ON partners(approval_status);
CREATE INDEX IF NOT EXISTS idx_partners_created_by ON partners(created_by);

-- ============================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE partner_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: CREATE RLS POLICIES
-- ============================================================

-- Super Admin and Regional Manager can view partner invitations
DROP POLICY IF EXISTS "admins_view_partner_invitations" ON partner_invitations;
CREATE POLICY "admins_view_partner_invitations"
  ON partner_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Super Admin can manage all invitations
DROP POLICY IF EXISTS "super_admin_manage_invitations" ON partner_invitations;
CREATE POLICY "super_admin_manage_invitations"
  ON partner_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Regional Manager can only invite partners
DROP POLICY IF EXISTS "regional_manager_invite_partners" ON partner_invitations;
CREATE POLICY "regional_manager_invite_partners"
  ON partner_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    AND invited_type IN ('regional_manager', 'super_admin')
  );

-- ============================================================
-- PART 6: TEST DATA (تعليق من أجل الاستخدام اليدوي)
-- ============================================================

-- سيتم إضافة البيانات الاختبارية في خطوة منفصلة
-- INSERT INTO partner_invitations (email, name, phone, invited_by, invited_type, status)
-- VALUES (...);
