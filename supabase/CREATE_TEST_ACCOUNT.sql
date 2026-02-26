-- ============================================================
-- Create Test Account for Partner Login
-- أنشئ حساب اختبار لتسجيل الدخول
-- ============================================================

-- Insert test partner user in auth.users (via direct SQL)
-- Note: In production, use the Supabase Auth UI/API
-- This is only for testing/setup purposes

-- First, ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed and recreate
DROP POLICY IF EXISTS "users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;

CREATE POLICY "users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Insert test profile (only if user exists)
-- The user must be created first via Supabase Dashboard > Authentication > Add User
-- OR use this after creating the user:

INSERT INTO public.profiles (id, full_name, phone, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Test Partner'),
  COALESCE(raw_user_meta_data->>'phone', ''),
  'partner'
FROM auth.users
WHERE email = 'test@hillaha.com'
ON CONFLICT (id) DO UPDATE SET role = 'partner';

-- Verify
SELECT email, raw_user_meta_data->>'full_name' as full_name FROM auth.users WHERE email = 'test@hillaha.com';
