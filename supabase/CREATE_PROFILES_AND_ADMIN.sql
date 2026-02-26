-- ============================================================
-- HILLAHA — Create Profiles Table & Set Super Admin
-- تشغّل هذا الملف في Supabase SQL Editor لتفعيل نظام الإدارة
-- Run this in Supabase SQL Editor to activate the admin system
-- ============================================================

-- Step 1: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  phone      text,
  role       text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'partner', 'admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users can read own profile') THEN
    CREATE POLICY "users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users can update own profile') THEN
    CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='super_admin can update all profiles') THEN
    CREATE POLICY "super_admin can update all profiles" ON public.profiles FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
END $$;

-- Step 4: Create or replace handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Step 5: Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- STEP 6: INSERT PROFILE FOR EXISTING USERS (if not exists)
-- ============================================================

-- Get all users that don't have a profile yet and create one
INSERT INTO public.profiles (id, full_name, phone, role)
SELECT
  au.id,
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'phone',
  'customer'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 7: SET YOUR ACCOUNT AS SUPER_ADMIN
-- ============================================================
-- IMPORTANT: Replace 'malmaghrabi77@gmail.com' with your actual email if different

UPDATE public.profiles
SET role = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'malmaghrabi77@gmail.com'
);

-- Verify the update
SELECT
  au.email,
  p.role,
  p.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'malmaghrabi77@gmail.com';

-- Show all profiles for verification
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT role, COUNT(*) as count FROM public.profiles GROUP BY role ORDER BY count DESC;
