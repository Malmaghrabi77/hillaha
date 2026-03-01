-- ============================================================
-- HILLAHA - MINIMAL FIX ONLY
-- فقط إضافة admin_type column إلى profiles
-- بدون أي جداول أخرى معقدة
-- التاريخ: 2026-02-28
-- ============================================================

-- ============================================================
-- ONLY: ADD admin_type COLUMN TO profiles
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN admin_type TEXT DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_type ON public.profiles(admin_type);

-- ============================================================
-- Final Status
-- ============================================================

SELECT '✅ SUCCESS - admin_type added to profiles table' as status;
