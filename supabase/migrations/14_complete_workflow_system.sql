-- ============================================================
-- Migration: Complete Admin & Partner Workflow System
-- خطة الـ Workflow الكاملة: Regular Admin + Partner Invitations + Store Admins
-- Created: 2026-02-28
-- ============================================================

-- ============================================================
-- PART 1: UPDATE admin_invitations TABLE
-- ============================================================
-- Add support for Regular Admin (في الماضي كان فقط regional_manager)

ALTER TABLE public.admin_invitations
DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;

ALTER TABLE public.admin_invitations
ADD CONSTRAINT admin_invitations_admin_type_check
CHECK (admin_type IN ('regional_manager', 'regular_admin'));

-- Add column to track who can invite this admin type
ALTER TABLE public.admin_invitations
ADD COLUMN IF NOT EXISTS can_be_invited_by TEXT DEFAULT 'super_admin,regional_manager'
CHECK (can_be_invited_by IN ('super_admin', 'regional_manager', 'super_admin,regional_manager'));

-- ============================================================
-- PART 2: UPDATE partner_invitations TABLE
-- ============================================================
-- Add multi-level approval system for partners

-- Add columns for multi-level approvals
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

-- Add invited_by_role to track who invited (super_admin, regional_manager, regular_admin)
ALTER TABLE public.partner_invitations
ADD COLUMN IF NOT EXISTS invited_by_role TEXT DEFAULT 'super_admin'
CHECK (invited_by_role IN ('super_admin', 'regional_manager', 'regular_admin'));

-- Add approval reason/notes
ALTER TABLE public.partner_invitations
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add timestamps for approvals
ALTER TABLE public.partner_invitations
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS regional_manager_approved_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- PART 3: CREATE store_admins TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Store admin info
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Store/Branch info
  store_id UUID,
  store_name TEXT,

  -- Assigned by (partner)
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),

  -- User info after registration
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  UNIQUE(email),
  UNIQUE(user_id)
);

-- ============================================================
-- PART 4: CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_store_admins_partner_id ON public.store_admins(partner_id);
CREATE INDEX IF NOT EXISTS idx_store_admins_email ON public.store_admins(email);
CREATE INDEX IF NOT EXISTS idx_store_admins_status ON public.store_admins(status);
CREATE INDEX IF NOT EXISTS idx_store_admins_assigned_by ON public.store_admins(assigned_by);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_invited_by_role ON public.partner_invitations(invited_by_role);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_regional_manager_approval ON public.partner_invitations(regional_manager_approval);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_super_admin_approval ON public.partner_invitations(super_admin_approval);

-- ============================================================
-- PART 5: ENABLE RLS FOR store_admins
-- ============================================================

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- Partner can manage their own store admins
DROP POLICY IF EXISTS "partner_manage_store_admins" ON public.store_admins;
CREATE POLICY "partner_manage_store_admins" ON public.store_admins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_invitations.partner_id
      AND user_id = auth.uid()
    )
  );

-- Super admin and regional managers can view store admins
DROP POLICY IF EXISTS "admins_view_store_admins" ON public.store_admins;
CREATE POLICY "admins_view_store_admins" ON public.store_admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================
-- PART 6: UPDATE RLS POLICIES FOR admin_invitations
-- ============================================================

-- Super Admin can invite Regional Manager
DROP POLICY IF EXISTS "super_admin_invite_regional_manager" ON public.admin_invitations;
CREATE POLICY "super_admin_invite_regional_manager" ON public.admin_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    AND admin_type IN ('regional_manager', 'regular_admin')
  );

-- Regional Manager can invite Regular Admin
DROP POLICY IF EXISTS "regional_manager_invite_regular_admin" ON public.admin_invitations;
CREATE POLICY "regional_manager_invite_regular_admin" ON public.admin_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND admin_type = 'regional_manager'
    )
    AND admin_type = 'regular_admin'
  );

-- ============================================================
-- PART 7: UPDATE RLS POLICIES FOR partner_invitations
-- ============================================================

-- Super Admin can invite partners directly (immediate approval)
DROP POLICY IF EXISTS "super_admin_invite_partners" ON public.partner_invitations;
CREATE POLICY "super_admin_invite_partners" ON public.partner_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    AND invited_by_role = 'super_admin'
  );

-- Regional Manager can invite partners (needs their own approval)
DROP POLICY IF EXISTS "regional_manager_invite_partners" ON public.partner_invitations;
CREATE POLICY "regional_manager_invite_partners" ON public.partner_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND admin_type = 'regional_manager'
    )
    AND invited_by_role = 'regional_manager'
  );

-- Regular Admin can invite partners (needs super admin or regional manager approval)
DROP POLICY IF EXISTS "regular_admin_invite_partners" ON public.partner_invitations;
CREATE POLICY "regular_admin_invite_partners" ON public.partner_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND admin_type = 'regular_admin'
    )
    AND invited_by_role = 'regular_admin'
  );

-- Regional Manager can approve/reject partner invitations they sent
DROP POLICY IF EXISTS "regional_manager_approve_partners" ON public.partner_invitations;
CREATE POLICY "regional_manager_approve_partners" ON public.partner_invitations
  FOR UPDATE
  USING (
    invited_by = auth.uid() AND invited_by_role = 'regional_manager'
  )
  WITH CHECK (
    invited_by = auth.uid() AND invited_by_role = 'regional_manager'
  );

-- Super Admin can approve/reject all invitations
DROP POLICY IF EXISTS "super_admin_approve_partners" ON public.partner_invitations;
CREATE POLICY "super_admin_approve_partners" ON public.partner_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================
-- PART 8: VERIFICATION & CLEANUP
-- ============================================================

-- Ensure all new columns have defaults
UPDATE public.partner_invitations
SET invited_by_role = 'super_admin'
WHERE invited_by_role IS NULL;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
