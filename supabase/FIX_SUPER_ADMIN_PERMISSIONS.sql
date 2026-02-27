-- ============================================================
-- استعادة صلاحيات السوبر أدمن - URGENT FIX
-- malmaghrabi77@gmail.com (UUID: 2330a572-6706-48b7-8a31-34454ed112cd)
-- ============================================================

-- أولاً: التأكد من أن البروفايل يحتوي على super_admin role
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = '2330a572-6706-48b7-8a31-34454ed112cd';

-- ثانياً: حذف أي صلاحيات قديمة قد تكون خاطئة
DELETE FROM public.admin_permissions
WHERE admin_id = '2330a572-6706-48b7-8a31-34454ed112cd';

-- ثالثاً: إعادة إدراج جميع الصلاحيات بشكل صحيح
INSERT INTO public.admin_permissions (admin_id, permission_code, permission_name, permission_name_ar, description, is_granted, granted_at)
VALUES
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'view_dashboard', 'View Dashboard', 'عرض لوحة القيادة', 'Can view admin dashboard', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_payments', 'Manage Payment Methods', 'إدارة طرق الدفع', 'Can enable/disable payment methods', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_promotions', 'Manage Promotions', 'إدارة العروض', 'Can create and manage promotions', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'approve_offers', 'Approve Partner Offers', 'اعتماد عروض الشركاء', 'Can approve/reject partner offers', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_partners', 'Manage Partners', 'إدارة الشركاء', 'Can manage partner accounts', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_users', 'Manage Users', 'إدارة المستخدمين', 'Can manage customer accounts', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'view_analytics', 'View Analytics', 'عرض التحليلات', 'Can view analytics and reports', true, NOW()),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_admins', 'Manage Admins', 'إدارة الادمنة', 'Can invite and manage admin accounts', true, NOW());

-- رابعاً: التحقق من النتيجة
SELECT
  p.id,
  p.full_name,
  p.role,
  COUNT(ap.permission_code) as permission_count
FROM public.profiles p
LEFT JOIN public.admin_permissions ap ON p.id = ap.admin_id
WHERE p.id = '2330a572-6706-48b7-8a31-34454ed112cd'
GROUP BY p.id, p.full_name, p.role;
