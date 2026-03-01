-- ============================================================
-- CRITICAL FIXES: Database Schema Corrections
-- ============================================================
-- تصحيح المشاكل الحرجة في Supabase
-- التاريخ: 2026-02-28
-- ============================================================

-- ============================================================
-- PART 1: Add admin_type column to profiles table
-- ============================================================
-- إضافة عمود admin_type لتحديد نوع المدير

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_type TEXT DEFAULT NULL
CHECK (admin_type IS NULL OR admin_type IN ('regional_manager', 'regular_admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_admin_type ON public.profiles(admin_type);

-- ============================================================
-- PART 2: Fix admin_invitations table constraints
-- ============================================================
-- تصحيح قيد admin_type ليقبل كل من regional_manager و regular_admin

ALTER TABLE public.admin_invitations
DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;

ALTER TABLE public.admin_invitations
ADD CONSTRAINT admin_invitations_admin_type_check
CHECK (admin_type IN ('regional_manager', 'regular_admin'));

-- ============================================================
-- PART 3: Fix store_admins RLS Policy
-- ============================================================
-- إصلاح سياسة الأمان للمتاجر الفرعية

DROP POLICY IF EXISTS "partner_manage_store_admins" ON public.store_admins;

CREATE POLICY "partner_manage_store_admins" ON public.store_admins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = store_admins.partner_id  -- FIXED: was partner_invitations.partner_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 4: Add missing RLS policies for store_admins
-- ============================================================

DROP POLICY IF EXISTS "store_admin_insert" ON public.store_admins;
CREATE POLICY "store_admin_insert" ON public.store_admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_admin_update" ON public.store_admins;
CREATE POLICY "store_admin_update" ON public.store_admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_admin_delete" ON public.store_admins;
CREATE POLICY "store_admin_delete" ON public.store_admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = partner_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 5: Add missing RLS policies for inventory_items
-- ============================================================

DROP POLICY IF EXISTS "inventory_items_insert" ON public.inventory_items;
CREATE POLICY "inventory_items_insert" ON public.inventory_items
  FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_items_update" ON public.inventory_items;
CREATE POLICY "inventory_items_update" ON public.inventory_items
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_items_delete" ON public.inventory_items;
CREATE POLICY "inventory_items_delete" ON public.inventory_items
  FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 6: Add missing RLS policies for inventory_transactions
-- ============================================================

DROP POLICY IF EXISTS "inventory_transactions_insert" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions
  FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_transactions_update" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_update" ON public.inventory_transactions
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_transactions_delete" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_delete" ON public.inventory_transactions
  FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 7: Add missing RLS policies for staff
-- ============================================================

DROP POLICY IF EXISTS "staff_insert" ON public.staff;
CREATE POLICY "staff_insert" ON public.staff
  FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_update" ON public.staff;
CREATE POLICY "staff_update" ON public.staff
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_delete" ON public.staff;
CREATE POLICY "staff_delete" ON public.staff
  FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 8: Mark migration as complete
-- ============================================================
-- Migration complete - all critical issues should now be resolved

SELECT 'DATABASE FIXES COMPLETE' as status;

-- ============================================================
-- VERIFICATION QUERIES (run these to verify)
-- ============================================================
-- تشغيل هذه الاستعلامات للتحقق من النجاح

/*
-- Check if admin_type column exists in profiles
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'admin_type';

-- Check store_admins RLS policies
SELECT * FROM pg_policies WHERE tablename = 'store_admins';

-- Check inventory_items RLS policies
SELECT * FROM pg_policies WHERE tablename = 'inventory_items';

-- Check staff RLS policies
SELECT * FROM pg_policies WHERE tablename = 'staff';

-- Test that constraints are correct
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'admin_invitations' AND constraint_name LIKE '%admin_type%';
*/

-- ============================================================
-- END OF FIXES
-- ============================================================
