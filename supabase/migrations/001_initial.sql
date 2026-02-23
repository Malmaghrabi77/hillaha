-- ============================================================
-- Hillaha Platform — Supabase Migration v1
-- Source: adapted from Hillaha-Services/shared/schema.ts
-- Run this in Supabase SQL Editor to set up the full schema.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type partner_type       as enum ('restaurant', 'store', 'pharmacy', 'clinic');
create type order_status       as enum ('pending', 'confirmed', 'preparing', 'delivering', 'done', 'cancelled');
create type payment_method     as enum ('cash', 'wallet_transfer', 'card');
create type payment_status     as enum ('pending', 'paid', 'failed');
create type price_unit         as enum ('per_hour', 'per_visit', 'per_wash', 'per_trip');
create type admin_role         as enum ('admin', 'master');
create type vehicle_type       as enum ('motorcycle', 'bicycle', 'car');
create type category_type      as enum ('food', 'service');

-- ─── Categories ───────────────────────────────────────────────────────────────

create table categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  name_ar     text not null,
  icon        text not null default '🍽️',
  image       text,
  type        category_type not null default 'food',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── Customers ────────────────────────────────────────────────────────────────
-- Links to Supabase Auth (auth.users).

create table customers (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text not null default '',
  name_ar          text,
  phone            text,
  email            text,
  address          text,
  city             text not null default 'Qena',
  loyalty_points   int not null default 0,
  total_spent      numeric(10, 2) not null default 0,
  total_orders     int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─── Partners ─────────────────────────────────────────────────────────────────

create table partners (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  name_ar           text not null,
  description       text,
  description_ar    text,
  image             text,
  cover_image       text,
  category_id       uuid references categories(id) on delete set null,
  type              partner_type not null default 'restaurant',
  rating            numeric(3, 2) not null default 0,
  review_count      int not null default 0,
  delivery_time     text not null default '30-45 دقيقة',
  delivery_fee      numeric(8, 2) not null default 15,
  min_order         numeric(8, 2) not null default 0,
  is_open           boolean not null default true,
  is_featured       boolean not null default false,
  tags              text[] not null default '{}',
  address           text,
  city              text not null default 'Qena',
  country           text not null default 'EG',
  phone             text,
  email             text,
  password_hash     text,
  commission_rate   numeric(5, 4) not null default 0.10,
  total_orders      int not null default 0,
  total_revenue     numeric(12, 2) not null default 0,
  is_approved       boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ─── Drivers ─────────────────────────────────────────────────────────────────

create table drivers (
  id                 uuid primary key default uuid_generate_v4(),
  name               text not null,
  name_ar            text,
  phone              text unique not null,
  email              text,
  vehicle_type       vehicle_type,
  vehicle_plate      text,
  national_id        text,
  city               text not null default 'Qena',
  commission_rate    numeric(5, 4) not null default 0.10,
  total_deliveries   int not null default 0,
  total_earnings     numeric(12, 2) not null default 0,
  is_online          boolean not null default false,
  is_approved        boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- ─── Menu Items ───────────────────────────────────────────────────────────────

create table menu_items (
  id               uuid primary key default uuid_generate_v4(),
  partner_id       uuid not null references partners(id) on delete cascade,
  name             text not null,
  name_ar          text not null,
  description      text,
  description_ar   text,
  price            numeric(10, 2) not null,
  image            text,
  category         text,
  is_available     boolean not null default true,
  is_popular       boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ─── Services ─────────────────────────────────────────────────────────────────

create table services (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  name_ar          text not null,
  description      text,
  description_ar   text,
  icon             text not null default '🔧',
  image            text,
  base_price       numeric(10, 2) not null,
  price_unit       price_unit not null default 'per_visit',
  rating           numeric(3, 2) not null default 0,
  is_available     boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─── Orders ───────────────────────────────────────────────────────────────────

create table orders (
  id                     uuid primary key default uuid_generate_v4(),
  customer_id            uuid references customers(id) on delete set null,
  partner_id             uuid references partners(id) on delete set null,
  driver_id              uuid references drivers(id) on delete set null,
  status                 order_status not null default 'pending',
  items                  jsonb not null default '[]',
  subtotal               numeric(10, 2) not null default 0,
  delivery_fee           numeric(8, 2) not null default 15,
  discount               numeric(8, 2) not null default 0,
  total                  numeric(10, 2) not null default 0,
  app_commission         numeric(10, 2) not null default 0,
  commission_rate        numeric(5, 4) not null default 0.10,
  loyalty_points_earned  int not null default 0,
  loyalty_points_used    int not null default 0,
  payment_method         payment_method not null default 'cash',
  payment_status         payment_status not null default 'pending',
  payment_proof_url      text,
  delivery_address       text not null default '',
  customer_phone         text,
  customer_note          text,
  customer_name          text,
  created_at             timestamptz not null default now()
);

-- ─── Admins ───────────────────────────────────────────────────────────────────

create table admins (
  id            uuid primary key default uuid_generate_v4(),
  username      text unique not null,
  password_hash text not null,
  name          text not null,
  name_ar       text,
  email         text,
  role          admin_role not null default 'admin',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── Platform Settings ────────────────────────────────────────────────────────
-- Dynamic config — editable from super admin dashboard.

create table platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index idx_partners_category   on partners(category_id);
create index idx_partners_featured   on partners(is_featured) where is_featured = true;
create index idx_partners_open       on partners(is_open) where is_open = true;
create index idx_menu_items_partner  on menu_items(partner_id);
create index idx_menu_items_popular  on menu_items(is_popular) where is_popular = true;
create index idx_orders_customer     on orders(customer_id);
create index idx_orders_partner      on orders(partner_id);
create index idx_orders_driver       on orders(driver_id);
create index idx_orders_status       on orders(status);
create index idx_orders_created_at   on orders(created_at desc);

-- Full-text search on partners
create index idx_partners_search on partners using gin(
  to_tsvector('arabic', coalesce(name_ar, '') || ' ' || coalesce(name, ''))
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table customers         enable row level security;
alter table orders            enable row level security;
alter table categories        enable row level security;
alter table partners          enable row level security;
alter table menu_items        enable row level security;
alter table services          enable row level security;
alter table platform_settings enable row level security;
alter table admins            enable row level security;
alter table drivers           enable row level security;

-- Public read for catalog
create policy "Public read categories"    on categories        for select using (true);
create policy "Public read partners"      on partners          for select using (is_approved = true);
create policy "Public read menu_items"    on menu_items        for select using (is_available = true);
create policy "Public read services"      on services          for select using (is_available = true);
create policy "Public read settings"      on platform_settings for select using (true);

-- Customer: own row only
create policy "Customer own row"          on customers         for all   using (auth.uid() = id);
create policy "Customer own orders"       on orders            for select using (auth.uid() = customer_id);
create policy "Customer insert orders"    on orders            for insert with check (auth.uid() = customer_id);

-- ─── Storage Buckets ─────────────────────────────────────────────────────────
-- Run separately in Supabase dashboard or Storage API:
-- bucket: payment-proofs  (public: false, file size: 5MB)
-- bucket: partner-images  (public: true,  file size: 10MB)
-- bucket: menu-images     (public: true,  file size: 5MB)
