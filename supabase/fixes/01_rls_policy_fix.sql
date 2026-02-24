-- ============================================================================
-- RLS Policy Fix for Driver Order Access
-- ============================================================================
-- CRITICAL: This fixes a severe security vulnerability where drivers could
-- see ALL orders with status 'ready', not just their assigned ones.
-- ============================================================================

-- Step 1: Drop the insecure policy
DROP POLICY IF EXISTS "driver sees ready orders" ON public.orders;

-- Step 2: Create the corrected policy
-- Drivers can only see:
-- - Orders assigned to them (auth.uid() = driver_id)
-- - Unassigned ready orders (status = 'ready' AND driver_id IS NULL)
CREATE POLICY "driver_can_see_assigned_orders" ON public.orders FOR SELECT
  USING (
    auth.uid() = driver_id
    OR
    (status = 'ready' AND driver_id IS NULL)
  );

-- Step 3: Enable RLS on orders table (ensure it's enabled)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is enabled
-- Run this query to confirm: SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders';

-- ============================================================================
-- Additional RLS Policy Checks for Other Tables
-- ============================================================================

-- Verify RLS is enabled on all sensitive tables
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification Query (run after applying fixes)
-- ============================================================================
/*
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

Expected output should show rowsecurity = true for all sensitive tables
*/
