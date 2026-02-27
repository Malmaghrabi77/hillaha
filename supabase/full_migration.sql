-- Hillaha — Full Migration (schema + policies)

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

-- Create types safely (drop if exists to avoid conflicts)
DO $$ BEGIN
  -- Drop existing types if they exist (CASCADE to drop dependent objects)
  DROP TYPE IF EXISTS public.user_role CASCADE;
  DROP TYPE IF EXISTS public.partner_type CASCADE;
  DROP TYPE IF EXISTS public.partner_role CASCADE;
  DROP TYPE IF EXISTS public.consent_type CASCADE;
  DROP TYPE IF EXISTS public.order_status CASCADE;
  DROP TYPE IF EXISTS public.delivery_type CASCADE;
  DROP TYPE IF EXISTS public.payment_method CASCADE;
EXCEPTION WHEN OTHERS THEN
  -- If there's an error, continue anyway
  NULL;
END $$;

-- Now create the types
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

-- Policies (RLS)
-- Safely drop existing policies first
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
  DROP POLICY IF EXISTS "addresses_owner_all" ON public.addresses;
  DROP POLICY IF EXISTS "consents_owner_read" ON public.user_consents;
  DROP POLICY IF EXISTS "consents_owner_insert" ON public.user_consents;
  DROP POLICY IF EXISTS "orders_customer_read" ON public.orders;
  DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

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
