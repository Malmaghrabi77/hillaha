-- Migration: Create admin management tables
-- ينشئ جداول إدارة المديرين والموافقات والعمولات

-- جدول 1: تسجيل إسناد المديرين للشركاء
CREATE TABLE IF NOT EXISTS public.admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(admin_id, partner_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول 2: سجل إجراءات المديرين
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('partner', 'user', 'order', 'payment')),
  entity_id UUID,
  old_data JSONB DEFAULT '{}',
  new_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول 3: تتبع العمولات الشهرية
CREATE TABLE IF NOT EXISTS public.admin_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_commission NUMERIC(10, 2),
  override_commission NUMERIC(10, 2),
  earned_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  settled_amount NUMERIC(12, 2) DEFAULT 0,
  settled_date TIMESTAMPTZ,
  settled_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, month)
);

-- جدول 4: طلبات الموافقة على الشركاء
CREATE TABLE IF NOT EXISTS public.partner_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id)
);

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_admin_assignments_admin_id
ON public.admin_assignments(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_assignments_partner_id
ON public.admin_assignments(partner_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id
ON public.admin_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_entity_id
ON public.admin_logs(entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at
ON public.admin_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_commissions_partner_id
ON public.admin_commissions(partner_id);

CREATE INDEX IF NOT EXISTS idx_admin_commissions_month
ON public.admin_commissions(month);

CREATE INDEX IF NOT EXISTS idx_partner_approvals_status
ON public.partner_approvals(status);

CREATE INDEX IF NOT EXISTS idx_partner_approvals_assigned_to
ON public.partner_approvals(assigned_to);
