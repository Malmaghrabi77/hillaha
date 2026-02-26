-- ============================================================
-- PROMOTIONS & OFFERS MANAGEMENT
-- نظام إدارة العروض والموافقات
-- ============================================================

-- جدول العروض الرئيسية
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  promotion_type TEXT CHECK (promotion_type IN ('percentage', 'fixed_amount', 'bogo', 'free_delivery', 'custom')),
  discount_value NUMERIC(10,2),
  discount_percentage NUMERIC(5,2),
  code TEXT UNIQUE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  min_order_amount NUMERIC(10,2),
  max_discount_amount NUMERIC(10,2),
  applicable_to TEXT CHECK (applicable_to IN ('all', 'specific_partners', 'specific_categories', 'specific_users')),
  applicable_ids JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول عروض الشركاء
CREATE TABLE IF NOT EXISTS public.partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  offer_type TEXT CHECK (offer_type IN ('percentage', 'fixed_amount', 'bogo', 'free_delivery', 'custom')),
  discount_value NUMERIC(10,2),
  discount_percentage NUMERIC(5,2),
  code TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  min_order_amount NUMERIC(10,2),
  max_discount_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول سجل الموافقات على العروض
CREATE TABLE IF NOT EXISTS public.offer_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role TEXT CHECK (admin_role IN ('super_admin', 'frid_admin')),
  action TEXT CHECK (action IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل Row Level Security
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_approval_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  -- Promotions: Public read for active, Admin manage all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotions' AND policyname='public read active promotions') THEN
    CREATE POLICY "public read active promotions" ON public.promotions FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotions' AND policyname='admin manage promotions') THEN
    CREATE POLICY "admin manage promotions" ON public.promotions
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
  END IF;

  -- Partner Offers: Partners read own, Admins manage all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_offers' AND policyname='partners read own offers') THEN
    CREATE POLICY "partners read own offers" ON public.partner_offers FOR SELECT
      USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_offers' AND policyname='partners create own offers') THEN
    CREATE POLICY "partners create own offers" ON public.partner_offers FOR INSERT
      WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_offers' AND policyname='admin manage partner offers') THEN
    CREATE POLICY "admin manage partner offers" ON public.partner_offers FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
  END IF;

  -- Approval Logs: Admins only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='offer_approval_logs' AND policyname='admin read approval logs') THEN
    CREATE POLICY "admin read approval logs" ON public.offer_approval_logs FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
  END IF;
END $$;

-- إدراج عروض افتراضية
INSERT INTO public.promotions (title, title_ar, description, description_ar, promotion_type, discount_percentage, code, start_date, end_date, is_active, usage_limit, min_order_amount, applicable_to, created_by)
SELECT
  'Welcome Offer', 'عرض الترحيب', 'Welcome discount for new users', 'خصم ترحيب للمستخدمين الجدد', 'percentage', 20, 'WELCOME20', NOW(), NOW() + INTERVAL '30 days', true, 1000, 50, 'all',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.promotions WHERE code = 'WELCOME20');
