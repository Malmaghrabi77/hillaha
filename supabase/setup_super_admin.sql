-- ============================================================
-- إعداد حساب السوبر ادمن
-- شغّل هذا الملف بعد إنشاء حساب في Supabase Auth
-- ============================================================

-- ⚠️ تعليمات مهمة:
-- 1. قم بإنشاء حساب في Supabase: malmaghrabi77@gmail.com / [كلمة المرور]
-- 2. انسخ ID المستخدم من Supabase Dashboard: https://supabase.com/dashboard/project/[PROJECT_ID]/auth/users
-- 3. استبدل 'YOUR_USER_ID_HERE' بـ ID الفعلي

-- استبدل 'YOUR_USER_ID_HERE' بـ UUID الفعلي للمستخدم malmaghrabi77@gmail.com
-- يمكنك الحصول عليه من Supabase Dashboard → Authentication → Users

-- إدراج أو تحديث بيانات السوبر أدمن
INSERT INTO public.profiles (id, full_name, phone, role, country_code, created_at)
VALUES (
  'YOUR_USER_ID_HERE',
  'Moustafa Maghrabi',
  '+20100000000',
  'super_admin',
  'EG',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- تأكد من إدراج جميع الصلاحيات الافتراضية للسوبر أدمن
INSERT INTO public.admin_permissions (admin_id, permission_code, permission_name, permission_name_ar, description, is_granted)
VALUES
  ('YOUR_USER_ID_HERE', 'view_dashboard', 'View Dashboard', 'عرض لوحة القيادة', 'Can view admin dashboard', true),
  ('YOUR_USER_ID_HERE', 'manage_payments', 'Manage Payment Methods', 'إدارة طرق الدفع', 'Can enable/disable payment methods', true),
  ('YOUR_USER_ID_HERE', 'manage_promotions', 'Manage Promotions', 'إدارة العروض', 'Can create and manage promotions', true),
  ('YOUR_USER_ID_HERE', 'approve_offers', 'Approve Partner Offers', 'اعتماد عروض الشركاء', 'Can approve/reject partner offers', true),
  ('YOUR_USER_ID_HERE', 'manage_partners', 'Manage Partners', 'إدارة الشركاء', 'Can manage partner accounts', true),
  ('YOUR_USER_ID_HERE', 'manage_users', 'Manage Users', 'إدارة المستخدمين', 'Can manage customer accounts', true),
  ('YOUR_USER_ID_HERE', 'view_analytics', 'View Analytics', 'عرض التحليلات', 'Can view analytics and reports', true),
  ('YOUR_USER_ID_HERE', 'manage_admins', 'Manage Admins', 'إدارة الادمنة', 'Can invite and manage admin accounts', true)
ON CONFLICT (admin_id, permission_code) DO UPDATE SET is_granted = true;
