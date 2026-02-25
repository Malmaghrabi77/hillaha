-- ============================================
-- Supabase RLS Policy Fix - Driver Orders Access
-- ============================================
--
-- PROBLEM: Current policy allows drivers to see ALL "ready" orders
-- SOLUTION: Restrict drivers to only their assigned orders + new unassigned ready orders
--
-- Location: Supabase Dashboard → SQL Editor → Run this script
-- Database: Your Hillaha Supabase project
-- ============================================

-- Step 1: Drop old insecure policy
DROP POLICY IF EXISTS "driver sees ready orders" ON public.orders;

-- Step 2: Create new secure policy
-- Drivers can see:
--   1. Orders assigned to them (auth.uid() = driver_id), OR
--   2. Ready orders with no driver assigned (status = 'ready' AND driver_id IS NULL)
CREATE POLICY "driver_can_see_assigned_and_available_orders" ON public.orders
  FOR SELECT
  USING (
    auth.uid() = driver_id
    OR
    (status = 'ready' AND driver_id IS NULL)
  );

-- Step 3: Verify the policy was created
-- You should see the new policy in the "Policies" tab for the orders table

-- ============================================
-- WHAT THIS FIXES:
-- ============================================
-- ✅ Drivers can only see orders assigned to them
-- ✅ Drivers can only see unassigned ready orders (not pending/accepted/etc)
-- ✅ Drivers CANNOT see other drivers' orders
-- ✅ Improved data isolation and security
--
-- BEFORE (INSECURE):
--   Driver sees: ALL orders with status='ready' (even from competitors)
--
-- AFTER (SECURE):
--   Driver sees:
--     - Only their own assigned orders
--     - Only unassigned ready orders (available to accept)
-- ============================================
