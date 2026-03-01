-- ============================================================
-- SEED DATA: Initialize with test data
-- ============================================================
-- This script creates test data for complete workflow testing
-- Created: 2026-02-27

-- ============================================================
-- PART 1: CREATE TEST USERS IN AUTH (Manual in Supabase UI)
-- ============================================================
-- These must be created via Supabase Dashboard → Authentication → Users:
--
-- User 1 (Super Admin):
--   Email: superadmin@test.local
--   Password: SuperAdmin@2026
--
-- User 2 (Partner 1):
--   Email: partner1@test.local
--   Password: Partner@2026
--
-- User 3 (Partner 2):
--   Email: partner2@test.local
--   Password: Partner@2026
--
-- User 4 (Regional Manager):
--   Email: manager1@test.local
--   Password: Manager@2026

-- ============================================================
-- PART 2: INSERT TEST DATA (After creating users above)
-- ============================================================

-- Create profiles for test users
-- NOTE: Replace UUID values with actual IDs from auth.users
-- You can get these from: SELECT id FROM auth.users WHERE email = '...';

-- Insert profile for Super Admin
INSERT INTO profiles (id, role, full_name, phone, email)
VALUES (
  'SUPER_ADMIN_UUID'::uuid,  -- Replace with actual UUID
  'super_admin',
  'مدير النظام',
  '0100000001',
  'superadmin@test.local'
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- Insert profile for Regional Manager
INSERT INTO profiles (id, role, full_name, phone, email)
VALUES (
  'REGIONAL_MANAGER_UUID'::uuid,  -- Replace with actual UUID
  'admin',
  'المدير الإقليمي',
  '0100000002',
  'manager1@test.local'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Create test partners
INSERT INTO partners (user_id, name, phone, is_open, created_by)
VALUES
  ('PARTNER1_UUID'::uuid, 'مطعم البهار', '0100000003', true, 'SUPER_ADMIN_UUID'::uuid),
  ('PARTNER2_UUID'::uuid, 'كافيه السندس', '0100000004', true, 'SUPER_ADMIN_UUID'::uuid)
ON CONFLICT DO NOTHING;

-- Update partner profiles with partner_id
UPDATE profiles
SET partner_id = (
  SELECT id FROM partners WHERE user_id = 'PARTNER1_UUID'::uuid LIMIT 1
)
WHERE id = 'PARTNER1_UUID'::uuid;

UPDATE profiles
SET partner_id = (
  SELECT id FROM partners WHERE user_id = 'PARTNER2_UUID'::uuid LIMIT 1
)
WHERE id = 'PARTNER2_UUID'::uuid;

-- Create admin assignment for Regional Manager
INSERT INTO admin_assignments (admin_id, partner_id, status)
SELECT 'REGIONAL_MANAGER_UUID'::uuid, id, 'active'
FROM partners
WHERE name IN ('مطعم البهار', 'كافيه السندس')
ON CONFLICT DO NOTHING;

-- Create test inventory items
INSERT INTO inventory_items (partner_id, name, sku, unit_type, current_stock, minimum_stock, cost_per_unit, category)
SELECT
  id,
  'أرز أبيض',
  'RICE-001',
  'kg',
  50,
  20,
  15.00,
  'مواد غذائية'
FROM partners
WHERE name = 'مطعم البهار'
ON CONFLICT DO NOTHING;

-- Create test staff members
INSERT INTO staff (partner_id, full_name, email, phone, position, employment_type, salary_type, base_salary, hire_date, status)
SELECT
  id,
  'أحمد محمد',
  'ahmed@store.local',
  '0100000005',
  'طباخ',
  'full_time',
  'monthly',
  3000.00,
  CURRENT_DATE - INTERVAL '180 days',
  'active'
FROM partners
WHERE name = 'مطعم البهار'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 3: Verification Queries
-- ============================================================

-- تتحقق من البيانات:
-- SELECT * FROM profiles WHERE role IN ('super_admin', 'admin', 'partner');
-- SELECT * FROM partners;
-- SELECT COUNT(*) as total_inventory FROM inventory_items;
-- SELECT COUNT(*) as total_staff FROM staff;
-- SELECT * FROM admin_assignments;

-- ============================================================
-- IMPORTANT INSTRUCTIONS
-- ============================================================
/*

1. أولاً: أنشئ المستخدمين في Supabase Dashboard:
   - Authentication → Users → Invite User أو Add User
   - أنشئ 4 مستخدمين بالبيانات المذكورة أعلاه

2. ثانياً: انسخ UUID لكل مستخدم:
   - اذهب إلى Authentication → Users
   - انسخ ID لكل مستخدم

3. ثالثاً: استبدل UUID في الكود أعلاه:
   - SUPER_ADMIN_UUID → UUID الفعلي للـ superadmin@test.local
   - REGIONAL_MANAGER_UUID → UUID الفعلي للـ manager1@test.local
   - PARTNER1_UUID → UUID الفعلي للـ partner1@test.local
   - PARTNER2_UUID → UUID الفعلي للـ partner2@test.local

4. رابعاً: شغّل الكود في SQL Editor

5. خامساً: اختبر Workflow:
   - سجل دخول كـ Super Admin
   - اذهب إلى: /admin/invite-partners
   - أضف شريك جديد
   - موافق عليه في: /admin/approve-partners
   - سجل دخول كشريك واستخدم Dashboard

*/
