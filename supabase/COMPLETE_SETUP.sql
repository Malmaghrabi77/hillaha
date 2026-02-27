-- ============================================================
-- HILLAHA COMPLETE SETUP
-- ملف تثبيت شامل - جميع الجداول والسياسات والبيانات الافتراضية
-- تشغيل ملف واحد لإعداد النظام بالكامل
--
-- ⚠️ تنبيه: هذا الملف يحذف جميع الجداول القديمة ويعيد إنشاء كل شيء من الصفر
-- ============================================================

-- ============================================================
-- PHASE 0: Clean up existing objects
-- ============================================================

-- Drop all policies first (safely)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
  END LOOP;
END $$;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.permission_audit_logs;
DROP TABLE IF EXISTS public.admin_restrictions;
DROP TABLE IF EXISTS public.partner_restrictions;
DROP TABLE IF EXISTS public.admin_permissions;
DROP TABLE IF EXISTS public.offer_approval_logs;
DROP TABLE IF EXISTS public.partner_offers;
DROP TABLE IF EXISTS public.promotions;
DROP TABLE IF EXISTS public.payment_method_logs;
DROP TABLE IF EXISTS public.payment_method_configs;
DROP TABLE IF EXISTS public.payment_methods;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.driver_profiles;
DROP TABLE IF EXISTS public.partner_users;
DROP TABLE IF EXISTS public.partners;
DROP TABLE IF EXISTS public.user_consents;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.delivery_bands;
DROP TABLE IF EXISTS public.zones;
DROP TABLE IF EXISTS public.cities;
DROP TABLE IF EXISTS public.countries;

-- Drop all types (in order)
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.partner_type CASCADE;
DROP TYPE IF EXISTS public.partner_role CASCADE;
DROP TYPE IF EXISTS public.consent_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.delivery_type CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;

-- ============================================================
-- PHASE 1: Foundation Tables & Types
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.countries (
  code text primary key,
  name_ar text not null,
  name_en text not null,
  currency text not null,
  vat_rate numeric not null default 0,
  vat_inclusive boolean not null default false
);

create table if not exists public.cities (
  id uuid primary key default uuid_generate_v4(),
  country_code text not null references public.countries(code) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  unique(country_code, code)
);

create table if not exists public.zones (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true
);

create table if not exists public.delivery_bands (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id) on delete cascade,
  min_km numeric not null,
  max_km numeric null,
  fee numeric not null,
  app_commission_rate numeric not null default 0.10,
  sort int not null default 0
);

-- Create types (these should not exist after drop above)
create type public.user_role as enum ('customer','driver','partner','super_admin','admin','frid_admin');
create type public.partner_type as enum ('restaurant','store','pharmacy','clinic');
create type public.partner_role as enum ('owner','manager','cashier','kitchen','support');
create type public.consent_type as enum ('customer_terms','partner_terms','driver_terms','medical_terms');
create type public.order_status as enum ('pending','accepted','preparing','out_for_delivery','delivered','cancelled');
create type public.delivery_type as enum ('platform','self');
create type public.payment_method as enum ('cash','wallet_transfer','card');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  country_code text not null references public.countries(code) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.user_consents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type public.consent_type not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  country_code text not null references public.countries(code) on delete restrict,
  role public.user_role not null,
  unique(user_id, consent_type, version)
);

create table if not exists public.partners (
  id uuid primary key default uuid_generate_v4(),
  partner_type public.partner_type not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  zone_id uuid references public.zones(id) on delete set null,
  name text not null,
  phone text,
  address_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_users (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_role public.partner_role not null default 'manager',
  is_active boolean not null default true,
  unique(partner_id, user_id)
);

create table if not exists public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict,
  zone_id uuid references public.zones(id) on delete set null,
  is_active boolean not null default true,
  vehicle_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  lat numeric,
  lng numeric,
  city_id uuid references public.cities(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  address_line text,
  landmark text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  partner_id uuid not null references public.partners(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  zone_id uuid references public.zones(id) on delete set null,
  address_id uuid references public.addresses(id) on delete set null,
  status public.order_status not null default 'pending',
  delivery_type public.delivery_type not null default 'platform',
  assigned_driver_id uuid references public.driver_profiles(user_id) on delete set null,
  payment_method public.payment_method not null default 'cash',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  order_commission_rate numeric not null default 0.10,
  order_commission_amount numeric not null default 0,
  delivery_commission_rate numeric not null default 0.10,
  delivery_commission_amount numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null,
  unit_price numeric not null,
  quantity int not null default 1
);

create table if not exists public.partner_monthly_stats (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  month text not null,
  completed_orders_count int not null default 0,
  current_commission_rate numeric not null default 0.10,
  unique(partner_id, month)
);

-- ============================================================
-- PHASE 2: RLS Policies for Foundation Tables
-- ============================================================

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.user_consents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles_read_own" on public.profiles
for select using (id = auth.uid());

create policy "addresses_owner_all" on public.addresses
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "consents_owner_read" on public.user_consents
for select using (user_id = auth.uid());

create policy "consents_owner_insert" on public.user_consents
for insert with check (user_id = auth.uid());

create policy "orders_customer_read" on public.orders
for select using (user_id = auth.uid());

create policy "orders_customer_insert" on public.orders
for insert with check (user_id = auth.uid());

-- ============================================================
-- PHASE 3: Payment Methods Management
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.payment_method_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT CHECK (action IN ('enabled', 'disabled', 'configured', 'tested')),
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read enabled payment methods" ON public.payment_methods FOR SELECT USING (is_enabled = true);
CREATE POLICY "admin can manage payment methods" ON public.payment_methods
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
CREATE POLICY "admin can manage payment configs" ON public.payment_method_configs
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

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

-- ============================================================
-- PHASE 4: Promotions & Offers Management
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.offer_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role TEXT CHECK (admin_role IN ('super_admin', 'frid_admin')),
  action TEXT CHECK (action IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active promotions" ON public.promotions FOR SELECT USING (is_active = true);
CREATE POLICY "admin manage promotions" ON public.promotions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
CREATE POLICY "partners read own offers" ON public.partner_offers FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE POLICY "partners create own offers" ON public.partner_offers FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE POLICY "admin manage partner offers" ON public.partner_offers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
CREATE POLICY "admin read approval logs" ON public.offer_approval_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

INSERT INTO public.promotions (title, title_ar, description, description_ar, promotion_type, discount_percentage, code, start_date, end_date, is_active, usage_limit, min_order_amount, applicable_to, created_by)
SELECT
  'Welcome Offer', 'عرض الترحيب', 'Welcome discount for new users', 'خصم ترحيب للمستخدمين الجدد', 'percentage', 20, 'WELCOME20', NOW(), NOW() + INTERVAL '30 days', true, 1000, 50, 'all',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.promotions WHERE code = 'WELCOME20');

-- ============================================================
-- PHASE 5: Admin Permissions & Restrictions Management
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_admin_id UUID NOT NULL REFERENCES auth.users(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type TEXT CHECK (change_type IN ('permission_granted', 'permission_revoked', 'restriction_added', 'restriction_removed')),
  change_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manage permissions" ON public.admin_permissions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "super_admin manage restrictions" ON public.admin_restrictions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "admin manage partner restrictions" ON public.partner_restrictions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
CREATE POLICY "super_admin read audit logs" ON public.permission_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

INSERT INTO public.admin_permissions (admin_id, permission_code, permission_name, permission_name_ar, description, is_granted)
SELECT
  au.id,
  permission_codes.code,
  permission_codes.name,
  permission_codes.name_ar,
  permission_codes.desc,
  true
FROM auth.users au
CROSS JOIN (
  SELECT 'view_dashboard' as code, 'View Dashboard' as name, 'عرض لوحة القيادة' as name_ar, 'Can view admin dashboard' as desc
  UNION ALL
  SELECT 'manage_payments', 'Manage Payment Methods', 'إدارة طرق الدفع', 'Can enable/disable payment methods'
  UNION ALL
  SELECT 'manage_promotions', 'Manage Promotions', 'إدارة العروض', 'Can create and manage promotions'
  UNION ALL
  SELECT 'approve_offers', 'Approve Partner Offers', 'اعتماد عروض الشركاء', 'Can approve/reject partner offers'
  UNION ALL
  SELECT 'manage_partners', 'Manage Partners', 'إدارة الشركاء', 'Can manage partner accounts'
  UNION ALL
  SELECT 'manage_users', 'Manage Users', 'إدارة المستخدمين', 'Can manage customer accounts'
  UNION ALL
  SELECT 'view_analytics', 'View Analytics', 'عرض التحليلات', 'Can view analytics and reports'
  UNION ALL
  SELECT 'manage_admins', 'Manage Admins', 'إدارة الادمنة', 'Can invite and manage admin accounts'
) as permission_codes
WHERE au.id IN (
  SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
)
AND NOT EXISTS (
  SELECT 1 FROM public.admin_permissions
  WHERE admin_id = au.id AND permission_code = permission_codes.code
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PHASE 6: Super Admin Setup
-- إعداد السوبر أدمن: malmaghrabi77@gmail.com
-- ============================================================

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

-- ============================================================
-- ✅ SETUP COMPLETE
-- جميع الجداول والسياسات والبيانات الافتراضية تم إعدادها بنجاح
-- ============================================================
