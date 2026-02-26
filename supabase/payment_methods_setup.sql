-- ============================================================
-- Payment Methods Management
-- جداول إدارة طرق الدفع والمحافظ الإلكترونية
-- ============================================================

-- إنشاء جدول طرق الدفع المتاحة
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT CHECK (category IN ('card', 'wallet', 'bank', 'other')),
  is_enabled BOOLEAN DEFAULT false,
  commission_rate NUMERIC(5,3) DEFAULT 0.025,
  min_amount NUMERIC(10,2) DEFAULT 0,
  max_amount NUMERIC(10,2),
  requires_config BOOLEAN DEFAULT false,
  config_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول إعدادات طرق الدفع
CREATE TABLE IF NOT EXISTS public.payment_method_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id) ON DELETE CASCADE,
  merchant_id TEXT,
  api_key TEXT,
  secret_key TEXT,
  webhook_url TEXT,
  test_mode BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_method_id)
);

-- إنشاء جدول سجل تفعيل طرق الدفع
CREATE TABLE IF NOT EXISTS public.payment_method_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT CHECK (action IN ('enabled', 'disabled', 'configured', 'tested')),
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل Row Level Security
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_logs ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_methods' AND policyname='public can read enabled payment methods') THEN
    CREATE POLICY "public can read enabled payment methods" ON public.payment_methods FOR SELECT USING (is_enabled = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_methods' AND policyname='super_admin can manage payment methods') THEN
    CREATE POLICY "super_admin can manage payment methods" ON public.payment_methods
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_method_configs' AND policyname='super_admin can manage payment configs') THEN
    CREATE POLICY "super_admin can manage payment configs" ON public.payment_method_configs
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
END $$;

-- إدراج طرق الدفع الافتراضية
INSERT INTO public.payment_methods (name, name_ar, code, icon, description, description_ar, category, commission_rate, is_enabled, config_fields)
VALUES
  ('Credit Card', 'بطاقة ائتمان', 'credit_card', '💳', 'Visa, Mastercard, Amex', 'فيزا، ماستركارد، أمريكان إكسبريس', 'card', 0.03, false, '{"merchant_id":"", "api_key":""}'),
  ('Debit Card', 'بطاقة خصم', 'debit_card', '💳', 'Debit card payments', 'الدفع ببطاقة الخصم', 'card', 0.025, false, '{"merchant_id":"", "api_key":""}'),
  ('Vodafone Cash', 'فودافون كاش', 'vodafone_cash', '📱', 'Vodafone Cash wallet', 'محفظة فودافون كاش', 'wallet', 0.02, false, '{"merchant_id":"", "service_id":"", "reference_id":""}'),
  ('Orange Money', 'أورانج كاش', 'orange_money', '📱', 'Orange Money wallet', 'محفظة أورانج موني', 'wallet', 0.02, false, '{"merchant_id":"", "api_key":""}'),
  ('Fawry', 'فوري', 'fawry', '💰', 'Fawry payment gateway', 'بوابة دفع فوري', 'other', 0.02, false, '{"merchant_code":"", "security_key":""}'),
  ('Bank Transfer', 'تحويل بنكي', 'bank_transfer', '🏦', 'Direct bank transfer', 'تحويل بنكي مباشر', 'bank', 0.01, false, '{"bank_account":"", "bank_name":""}'),
  ('Apple Pay', 'Apple Pay', 'apple_pay', '🍎', 'Apple Pay', 'Apple Pay', 'wallet', 0.03, false, '{"merchant_id":""}'),
  ('Google Pay', 'Google Pay', 'google_pay', '🔵', 'Google Pay', 'Google Pay', 'wallet', 0.03, false, '{"merchant_id":""}')
ON CONFLICT (code) DO NOTHING;
