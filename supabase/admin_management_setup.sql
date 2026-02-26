-- ============================================================
-- ADMIN PERMISSIONS & RESTRICTIONS MANAGEMENT
-- نظام إدارة صلاحيات وتجميد الادمنة
-- ============================================================

-- جدول صلاحيات الادمن المتقدمة
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  permission_name_ar TEXT NOT NULL,
  description TEXT,
  is_granted BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id, permission_code)
);

-- جدول تجميد الوظائف
CREATE TABLE IF NOT EXISTS public.admin_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restricted_function TEXT NOT NULL,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  restricted_by UUID NOT NULL REFERENCES auth.users(id),
  restricted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(admin_id, restricted_function)
);

-- جدول تجميد حسابات الشركاء
CREATE TABLE IF NOT EXISTS public.partner_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  is_frozen BOOLEAN DEFAULT false,
  freeze_reason TEXT,
  frozen_by UUID REFERENCES auth.users(id),
  frozen_at TIMESTAMPTZ,
  can_view_dashboard BOOLEAN DEFAULT false,
  can_create_orders BOOLEAN DEFAULT false,
  can_receive_payments BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  UNIQUE(partner_id)
);

-- جدول سجل تغييرات الصلاحيات
CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_admin_id UUID NOT NULL REFERENCES auth.users(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type TEXT CHECK (change_type IN ('permission_granted', 'permission_revoked', 'restriction_added', 'restriction_removed')),
  change_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل Row Level Security
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  -- Admin Permissions: Super admin only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_permissions' AND policyname='super_admin manage permissions') THEN
    CREATE POLICY "super_admin manage permissions" ON public.admin_permissions
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;

  -- Admin Restrictions: Super admin only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_restrictions' AND policyname='super_admin manage restrictions') THEN
    CREATE POLICY "super_admin manage restrictions" ON public.admin_restrictions
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;

  -- Partner Restrictions: Admin can manage
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_restrictions' AND policyname='admin manage partner restrictions') THEN
    CREATE POLICY "admin manage partner restrictions" ON public.partner_restrictions
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
  END IF;

  -- Audit Logs: Super admin only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permission_audit_logs' AND policyname='super_admin read audit logs') THEN
    CREATE POLICY "super_admin read audit logs" ON public.permission_audit_logs FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
END $$;

-- الصلاحيات الافتراضية كل ادمن جديد يحصل عليها
INSERT INTO public.admin_permissions (admin_id, permission_code, permission_name, permission_name_ar, description, is_granted)
SELECT
  au.id, 'view_dashboard', 'View Dashboard', 'عرض لوحة القيادة', 'Can view admin dashboard', true
FROM auth.users au
WHERE au.id IN (
  SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
)
AND NOT EXISTS (
  SELECT 1 FROM public.admin_permissions WHERE admin_id = au.id AND permission_code = 'view_dashboard'
);

-- إدراج قائمة الصلاحيات المتاحة
INSERT INTO public.admin_permissions (admin_id, permission_code, permission_name, permission_name_ar, description, is_granted)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'manage_payments', 'Manage Payment Methods', 'إدارة طرق الدفع', 'Can enable/disable payment methods', false),
  ('00000000-0000-0000-0000-000000000000', 'manage_promotions', 'Manage Promotions', 'إدارة العروض', 'Can create and manage promotions', false),
  ('00000000-0000-0000-0000-000000000000', 'approve_offers', 'Approve Partner Offers', 'اعتماد عروض الشركاء', 'Can approve/reject partner offers', false),
  ('00000000-0000-0000-0000-000000000000', 'manage_partners', 'Manage Partners', 'إدارة الشركاء', 'Can manage partner accounts', false),
  ('00000000-0000-0000-0000-000000000000', 'manage_users', 'Manage Users', 'إدارة المستخدمين', 'Can manage customer accounts', false),
  ('00000000-0000-0000-0000-000000000000', 'view_analytics', 'View Analytics', 'عرض التحليلات', 'Can view analytics and reports', false),
  ('00000000-0000-0000-0000-000000000000', 'manage_admins', 'Manage Admins', 'إدارة الادمنة', 'Can invite and manage admin accounts', false)
ON CONFLICT DO NOTHING;
