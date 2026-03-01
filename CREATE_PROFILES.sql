-- ============================================================
-- CREATE PROFILES TABLE + FILL DATA + TRIGGER
-- إنشاء جدول profiles + ملء البيانات + trigger تلقائي
-- ============================================================

-- ============================================================
-- STEP 1: CREATE profiles TABLE (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'customer',
  admin_type      TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Fill existing users from auth.users
-- ============================================================

INSERT INTO public.profiles (id, role, created_at)
SELECT
  id,
  'customer' as role,
  NOW()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Create trigger function for new sign-ups
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, created_at)
  VALUES (
    NEW.id,
    'customer',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 4: Create trigger on auth.users
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_signup();

-- ============================================================
-- STEP 5: Set Super Admin profile
-- ============================================================

DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  SELECT id INTO super_admin_id FROM auth.users
  WHERE email = 'malmaghrabi77@gmail.com' LIMIT 1;

  IF super_admin_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE id = super_admin_id;
  END IF;
END $$;

-- ============================================================
-- FINAL VERIFICATION
-- ============================================================

SELECT '✅ PROFILES TABLE CREATED + TRIGGER ACTIVATED' as status;
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as total_users FROM auth.users;
