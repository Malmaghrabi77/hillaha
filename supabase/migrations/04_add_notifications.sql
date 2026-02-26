-- Migration: Add push notifications support to partners table
-- يضيف دعم الإشعارات الفورية لجدول الشركاء

-- إضافة الأعمدة الجديدة
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "new_order": true,
  "order_updates": true,
  "reviews": true,
  "settlements": true,
  "system_updates": true
}'::jsonb;

-- إنشاء جدول سجل الإشعارات
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_notification_logs_partner_id
ON public.notification_logs(partner_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
ON public.notification_logs(created_at);

-- إضافة RLS policies للإشعارات
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- الشريك يمكنه رؤية إشعاراته فقط
CREATE POLICY "partners_read_own_notifications" ON public.notification_logs
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

-- Super admin يمكنه رؤية وتعديل كل الإشعارات
CREATE POLICY "super_admin_manage_notifications" ON public.notification_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
