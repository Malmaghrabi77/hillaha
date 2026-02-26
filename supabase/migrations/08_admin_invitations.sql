-- Migration: Create admin invitations and update partner approvals
-- إنشاء جدول دعوات الأدمن وتحديث نظام موافقات الشركاء

-- ============================================================
-- جدول admin_invitations (تتبع دعوات الأدمن)
-- ============================================================
CREATE TABLE public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- معلومات المدعو
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- نوع الدعوة (frid_admin أو regular_admin)
  admin_type TEXT NOT NULL CHECK (admin_type IN ('frid_admin', 'regular_admin')),

  -- من أرسل الدعوة
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- حالة الدعوة
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),

  -- موافقة Super Admin (مطلوبة فقط للـ regular_admin)
  super_admin_approval TEXT DEFAULT 'pending' CHECK (super_admin_approval IN ('pending', 'approved', 'rejected')),
  approved_by_super_admin UUID,
  super_admin_notes TEXT,

  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,

  -- معرّف المستخدم (بعد قبول الدعوة)
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE(email)
);

-- ============================================================
-- تحديث جدول partner_approvals لدعم موافقات متعددة من Frid
-- ============================================================
ALTER TABLE public.partner_approvals
ADD COLUMN frid_approvals JSONB DEFAULT '[]'::jsonb;

-- مثال: frid_approvals = [
--   { admin_id: 'xxx', name: 'أحمد علي', status: 'approved', approved_at: '...' },
--   { admin_id: 'yyy', name: 'محمد إبراهيم', status: 'pending', approved_at: null }
-- ]

-- ============================================================
-- جدول partner_approval_history (تتبع سجل الموافقات)
-- ============================================================
CREATE TABLE public.partner_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  -- من وافق/رفض
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_name TEXT,
  admin_role TEXT, -- 'frid_admin' أو 'super_admin'

  -- الإجراء
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  notes TEXT,

  -- التاريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_partner_id (partner_id),
  INDEX idx_admin_id (admin_id)
);

-- ============================================================
-- RLS Policies للجداول الجديدة
-- ============================================================

-- تفعيل RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_approval_history ENABLE ROW LEVEL SECURITY;

-- سياسات admin_invitations
-- السوبر أدمن يرى جميع الدعوات
CREATE POLICY "super_admin_see_all_invitations" ON public.admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- الفريد أدمن يرى فقط الدعوات التي أرسلها (للـ regular_admin)
CREATE POLICY "frid_admin_see_own_invitations" ON public.admin_invitations
  FOR SELECT USING (
    invited_by = auth.uid() AND admin_type = 'regular_admin'
  );

-- سياسات partner_approval_history
-- الجميع يرى السجل
CREATE POLICY "anyone_see_approval_history" ON public.partner_approval_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
