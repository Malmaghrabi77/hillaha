-- ============================================================
-- Migration: Remove "regular_admin" and enforce "regional_manager"
-- ============================================================
-- This migration fixes the admin type inconsistency
-- Changed: regular_admin → regional_manager (ONLY)
-- Created: 2026-02-28
-- ============================================================

-- Step 1: Update any existing "regular_admin" records to "regional_manager"
-- (in case any data already exists)
UPDATE public.admin_invitations
SET admin_type = 'regional_manager'
WHERE admin_type = 'regular_admin';

-- Step 2: Update CHECK constraint on admin_invitations table
-- Drop old constraint
ALTER TABLE public.admin_invitations
DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;

-- Add new constraint (only regional_manager allowed)
ALTER TABLE public.admin_invitations
ADD CONSTRAINT admin_invitations_admin_type_check
CHECK (admin_type IN ('regional_manager'));

-- Step 3: Drop old RLS policies and create new ones
DROP POLICY IF EXISTS "frid_admin_see_own_invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "regional_manager_see_own_invitations" ON public.admin_invitations;

-- Create correct policy for regional managers
CREATE POLICY "regional_manager_see_own_invitations" ON public.admin_invitations
  FOR SELECT USING (
    invited_by = auth.uid() AND admin_type = 'regional_manager'
  );

-- Step 4: Verify migration
-- Run these queries to verify:
-- SELECT COUNT(*) FROM admin_invitations WHERE admin_type != 'regional_manager';
-- This should return 0 if migration successful

-- ============================================================
-- END OF MIGRATION
-- ============================================================
