-- ============================================================
-- إعداد السوبر أدمن: malmaghrabi77@gmail.com
-- ============================================================

-- إدراج بيانات السوبر أدمن في جدول profiles
INSERT INTO public.profiles (id, full_name, phone, role, country_code, created_at)
VALUES (
  '2330a572-6706-48b7-8a31-34454ed112cd',
  'Moustafa Maghrabi',
  '+20100000000',
  'super_admin',
  'EG',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- إدراج جميع الصلاحيات الكاملة للسوبر أدمن
INSERT INTO public.admin_permissions (admin_id, permission_code, permission_name, permission_name_ar, description, is_granted)
VALUES
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'view_dashboard', 'View Dashboard', 'عرض لوحة القيادة', 'Can view admin dashboard', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_payments', 'Manage Payment Methods', 'إدارة طرق الدفع', 'Can enable/disable payment methods', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_promotions', 'Manage Promotions', 'إدارة العروض', 'Can create and manage promotions', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'approve_offers', 'Approve Partner Offers', 'اعتماد عروض الشركاء', 'Can approve/reject partner offers', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_partners', 'Manage Partners', 'إدارة الشركاء', 'Can manage partner accounts', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_users', 'Manage Users', 'إدارة المستخدمين', 'Can manage customer accounts', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'view_analytics', 'View Analytics', 'عرض التحليلات', 'Can view analytics and reports', true),
  ('2330a572-6706-48b7-8a31-34454ed112cd', 'manage_admins', 'Manage Admins', 'إدارة الادمنة', 'Can invite and manage admin accounts', true)
ON CONFLICT (admin_id, permission_code) DO UPDATE SET is_granted = true;
