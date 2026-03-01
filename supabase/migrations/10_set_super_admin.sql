-- ============================================================
-- Super Admin Setup - IMPORTANT: Run after migration 09
-- ============================================================
-- This script sets malmaghrabi77@gmail.com as Super Admin
-- Run this ONLY after the user has signed up in the system

-- ============================================================
-- STEP 1: Set the user as Super Admin
-- ============================================================

UPDATE profiles
SET
  role = 'super_admin',
  full_name = 'Admin System'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'malmaghrabi77@gmail.com'
);

-- ============================================================
-- STEP 2: Verify the Setup
-- ============================================================

-- Run these queries to verify:
SELECT
  email,
  'Email' as field
FROM auth.users
WHERE email = 'malmaghrabi77@gmail.com'

UNION ALL

SELECT
  'Role: ' || role as email,
  'Profile' as field
FROM profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'malmaghrabi77@gmail.com'
);

-- Expected output:
-- malmaghrabi77@gmail.com | Email
-- Role: super_admin       | Profile

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

-- إذا لم تجد البيانات، تأكد من:
-- 1. تسجيل الدخول باستخدام malmaghrabi77@gmail.com مرة واحدة
-- 2. تطبيق migration 09_admin_system_complete.sql أولاً
-- 3. ثم تشغيل هذا الملف

-- للتحقق من جميع الحسابات:
-- SELECT email, role FROM profiles p
-- JOIN auth.users u ON p.id = u.id;

-- للتحقق من أن السوبر أدمن معيّن:
-- SELECT COUNT(*) as super_admin_count FROM profiles
-- WHERE role = 'super_admin';
