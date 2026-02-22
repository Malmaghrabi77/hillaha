-- ============================================================
--  حلّها Platform — Database Schema
--  تشغّل هذا الملف في Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text check (role in ('customer','partner','driver')) not null default 'customer',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "users can read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 2. PARTNERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.partners (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  category   text not null,
  address    text,
  city       text default 'القاهرة',
  logo_url   text,
  is_open    boolean default true,
  rating     numeric(2,1) default 4.5,
  created_at timestamptz default now()
);
alter table public.partners enable row level security;
create policy "anyone can read partners"      on public.partners for select using (true);
create policy "partner can update own store"  on public.partners for update using (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 3. MENU ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete cascade,
  name       text not null,
  description text,
  price      numeric(10,2) not null,
  category   text,
  emoji      text default '🍽️',
  available  boolean default true,
  created_at timestamptz default now()
);
alter table public.menu_items enable row level security;
create policy "anyone can read menu items"    on public.menu_items for select using (true);
create policy "partner can manage own menu"   on public.menu_items for all
  using (partner_id in (select id from public.partners where user_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- 4. ORDERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid references auth.users(id) on delete set null,
  partner_id       uuid references public.partners(id) on delete set null,
  driver_id        uuid references auth.users(id) on delete set null,
  delivery_address text not null,
  delivery_city    text default 'القاهرة',
  customer_phone   text,
  customer_note    text,
  items            jsonb not null default '[]',
  subtotal         numeric(10,2) not null default 0,
  delivery_fee     numeric(10,2) not null default 10,
  discount         numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  payment_method    text not null default 'cash',
  payment_proof_url text,                          -- رابط صورة إثبات الدفع (InstaPay/E& إلزامي)
  status            text not null default 'pending'
    check (status in ('pending','accepted','preparing','ready','picked_up','delivered','cancelled')),
  created_at       timestamptz default now(),
  accepted_at      timestamptz,
  ready_at         timestamptz,
  picked_up_at     timestamptz,
  delivered_at     timestamptz,
  cancelled_at     timestamptz,
  cancel_reason    text
);
alter table public.orders enable row level security;

create policy "customer sees own orders"      on public.orders for select using (auth.uid() = customer_id);
create policy "customer creates orders"       on public.orders for insert  with check (auth.uid() = customer_id);
create policy "partner sees store orders"     on public.orders for select  using (partner_id in (select id from public.partners where user_id = auth.uid()));
create policy "partner updates store orders"  on public.orders for update  using (partner_id in (select id from public.partners where user_id = auth.uid()));
create policy "driver sees ready orders"      on public.orders for select  using (status = 'ready' or auth.uid() = driver_id);
create policy "driver updates own orders"     on public.orders for update  using (auth.uid() = driver_id or status = 'ready');


-- ────────────────────────────────────────────────────────────
-- 5. LOYALTY POINTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.loyalty_points (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  points      int not null,
  description text,
  created_at  timestamptz default now()
);
alter table public.loyalty_points enable row level security;
create policy "customer sees own points" on public.loyalty_points for select using (auth.uid() = customer_id);

create or replace function public.award_loyalty_points()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'delivered' and old.status != 'delivered' then
    insert into public.loyalty_points(customer_id, order_id, points, description)
    values (new.customer_id, new.id, GREATEST(0, floor(new.total / 250)::int),
            'نقاط طلب #' || substring(new.id::text, 1, 8));
  end if;
  return new;
end;
$$;
drop trigger if exists on_order_delivered on public.orders;
create trigger on_order_delivered
  after update on public.orders for each row execute procedure public.award_loyalty_points();


-- ────────────────────────────────────────────────────────────
-- 6. PLATFORM SETTINGS (حسابات الاستلام وإعدادات المنصة)
-- ────────────────────────────────────────────────────────────
create table if not exists public.platform_settings (
  key        text primary key,
  value      text not null default '',
  label      text not null default '',
  updated_at timestamptz default now()
);

insert into public.platform_settings (key, value, label) values
  ('instapay_account', '@malmaghrabi77', 'حساب InstaPay'),
  ('etisalat_phone',   '01107549225',    'رقم E& (اتصالات)'),
  ('vodafone_phone',   '',               'رقم Vodafone Cash')
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

create policy "anyone can read settings"
  on public.platform_settings for select using (true);

create policy "super_admin can update settings"
  on public.platform_settings for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );
