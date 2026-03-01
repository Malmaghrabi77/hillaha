-- ============================================================
-- HILLAHA ADMIN DASHBOARD — SETUP COMPLETE
-- خطة تفعيل النظام الإداري الكامل
-- تم التطوير بواسطة Claude Code
-- ============================================================

-- ============================================================
-- خطوة 1: إضافة أدوار جديدة
-- ============================================================
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'partner', 'driver', 'admin', 'super_admin'));

-- ============================================================
-- خطوة 2: إنشاء جداول الإدارة الأساسية
-- ============================================================

-- جدول admin_assignments (تخصيص الشركاء للمديرين)
CREATE TABLE IF NOT EXISTS public.admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(admin_id, partner_id)
);

-- جدول admin_logs (سجل الإجراءات)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول admin_commissions (العمولات)
CREATE TABLE IF NOT EXISTS public.admin_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  month TEXT NOT NULL,
  base_commission NUMERIC(10,2),
  override_commission NUMERIC(10,2),
  earned_amount NUMERIC(10,2),
  settled_amount NUMERIC(10,2) DEFAULT 0,
  settled_date TIMESTAMPTZ,
  settled_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, month)
);

-- جدول partner_approvals (موافقات الشركاء)
CREATE TABLE IF NOT EXISTS public.partner_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  assigned_to UUID,
  UNIQUE(partner_id)
);

-- ============================================================
-- خطوة 3: إنشاء جداول الدعوات والموافقات المتقدمة
-- ============================================================

-- جدول admin_invitations (دعوات الأدمن)
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  admin_type TEXT NOT NULL CHECK (admin_type IN ('regional_manager')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  super_admin_approval TEXT DEFAULT 'pending' CHECK (super_admin_approval IN ('pending', 'approved', 'rejected')),
  approved_by_super_admin UUID,
  super_admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- تحديث جدول partner_approvals لدعم موافقات من Frid
ALTER TABLE public.partner_approvals
ADD COLUMN IF NOT EXISTS frid_approvals JSONB DEFAULT '[]'::jsonb;

-- جدول تاريخ الموافقات
CREATE TABLE IF NOT EXISTS public.partner_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_name TEXT,
  admin_role TEXT CHECK (admin_role IN ('regional_manager', 'super_admin')),
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- خطوة 4: تفعيل Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_approval_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- خطوة 5: إنشاء RLS Policies
-- ============================================================

-- سياسات admin_assignments
DROP POLICY IF EXISTS "admin_see_own_assignments" ON public.admin_assignments;
DROP POLICY IF EXISTS "super_admin_see_all_assignments" ON public.admin_assignments;

CREATE POLICY "admin_see_own_assignments" ON public.admin_assignments
  FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "super_admin_see_all_assignments" ON public.admin_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات admin_logs
DROP POLICY IF EXISTS "admin_see_own_logs" ON public.admin_logs;
DROP POLICY IF EXISTS "super_admin_see_all_logs" ON public.admin_logs;

CREATE POLICY "admin_see_own_logs" ON public.admin_logs
  FOR SELECT USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_assignments aa
      WHERE aa.admin_id = auth.uid()
      AND aa.partner_id = admin_logs.entity_id
      AND admin_logs.entity_type = 'partner'
    )
  );

CREATE POLICY "super_admin_see_all_logs" ON public.admin_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات admin_commissions
DROP POLICY IF EXISTS "admin_see_assigned_commissions" ON public.admin_commissions;
DROP POLICY IF EXISTS "super_admin_see_all_commissions" ON public.admin_commissions;

CREATE POLICY "admin_see_assigned_commissions" ON public.admin_commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_assignments
      WHERE admin_id = auth.uid()
      AND partner_id = admin_commissions.partner_id
    )
  );

CREATE POLICY "super_admin_see_all_commissions" ON public.admin_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات partner_approvals
DROP POLICY IF EXISTS "admin_see_assigned_approvals" ON public.partner_approvals;
DROP POLICY IF EXISTS "admin_update_assigned_approvals" ON public.partner_approvals;
DROP POLICY IF EXISTS "super_admin_all_approvals" ON public.partner_approvals;

CREATE POLICY "admin_see_assigned_approvals" ON public.partner_approvals
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "admin_update_assigned_approvals" ON public.partner_approvals
  FOR UPDATE USING (assigned_to = auth.uid());

CREATE POLICY "super_admin_all_approvals" ON public.partner_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات admin_invitations
DROP POLICY IF EXISTS "super_admin_see_all_invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "frid_admin_see_own_invitations" ON public.admin_invitations;

CREATE POLICY "super_admin_see_all_invitations" ON public.admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "frid_admin_see_own_invitations" ON public.admin_invitations
  FOR SELECT USING (
    invited_by = auth.uid() AND admin_type = 'regular_admin'
  );

-- سياسات partner_approval_history
DROP POLICY IF EXISTS "anyone_see_approval_history" ON public.partner_approval_history;

CREATE POLICY "anyone_see_approval_history" ON public.partner_approval_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- خطوة 6: تفعيل حساب Super Admin
-- ============================================================

-- قم بتغيير البريد الإلكتروني حسب الحاجة
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'malmaghrabi77@gmail.com' AND role != 'super_admin';

-- ============================================================
-- تم الانتهاء! ✅
-- ============================================================

-- الآن يمكنك:
-- 1. الدخول من /admin
-- 2. الذهاب إلى /admin/admin-management/invite-frid
-- 3. بدء دعوة مديري الفرائد!
