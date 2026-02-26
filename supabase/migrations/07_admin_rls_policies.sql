-- Migration: Set up Row Level Security policies for admin tables
-- تفعيل سياسات الأمان على مستوى الصفوف للجداول الإدارية

-- تفعيل RLS للجداول الإدارية
ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_approvals ENABLE ROW LEVEL SECURITY;

-- سياسات جدول admin_assignments
-- المديرين يرون فقط إسناداتهم الخاصة
CREATE POLICY "admin_see_own_assignments" ON public.admin_assignments
  FOR SELECT USING (
    admin_id = auth.uid()
  );

-- السوبر أدمن يرى جميع الإسناديات
CREATE POLICY "super_admin_see_all_assignments" ON public.admin_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات جدول admin_logs
-- المديرين يرون السجلات الخاصة بهم والشركاء المسندة لهم
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

-- السوبر أدمن يرى جميع السجلات
CREATE POLICY "super_admin_see_all_logs" ON public.admin_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات جدول admin_commissions
-- المديرين يرون العمولات فقط للشركاء المسندة لهم
CREATE POLICY "admin_see_assigned_commissions" ON public.admin_commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_assignments
      WHERE admin_id = auth.uid()
      AND partner_id = admin_commissions.partner_id
    )
  );

-- السوبر أدمن يرى جميع العمولات
CREATE POLICY "super_admin_see_all_commissions" ON public.admin_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات جدول partner_approvals
-- المديرين يرون فقط الموافقات المسندة لهم
CREATE POLICY "admin_see_assigned_approvals" ON public.partner_approvals
  FOR SELECT USING (
    assigned_to = auth.uid()
  );

-- سياسات التعديل للموافقات
CREATE POLICY "admin_update_assigned_approvals" ON public.partner_approvals
  FOR UPDATE USING (
    assigned_to = auth.uid()
  );

-- السوبر أدمن يرى ويعدل جميع الموافقات
CREATE POLICY "super_admin_all_approvals" ON public.partner_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
