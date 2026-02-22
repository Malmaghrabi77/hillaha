-- =============================================================
-- migration: payment proof & platform settings
-- تاريخ: 2026-02-22
-- =============================================================

-- 1. أضف عمود رابط إثبات الدفع لجدول الطلبات
alter table public.orders
  add column if not exists payment_proof_url text;

-- 2. جدول إعدادات المنصة (حسابات الاستلام وغيرها)
create table if not exists public.platform_settings (
  key        text primary key,
  value      text not null default '',
  label      text not null default '',
  updated_at timestamptz default now()
);

-- 3. القيم الافتراضية
insert into public.platform_settings (key, value, label) values
  ('instapay_account',  '@malmaghrabi77', 'حساب InstaPay'),
  ('etisalat_phone',    '01107549225',    'رقم E& (اتصالات)'),
  ('vodafone_phone',    '',               'رقم Vodafone Cash')
on conflict (key) do nothing;

-- 4. RLS — السوبر أدمن فقط يعدّل، الجميع يقرأ
alter table public.platform_settings enable row level security;

drop policy if exists "anyone can read settings" on public.platform_settings;
create policy "anyone can read settings"
  on public.platform_settings for select
  using (true);

drop policy if exists "super_admin can update settings" on public.platform_settings;
create policy "super_admin can update settings"
  on public.platform_settings for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'super_admin'
    )
  );

-- 5. Storage bucket: payment-proofs
-- قم بتنفيذ هذا في Supabase Dashboard → Storage → New bucket
-- Bucket name: payment-proofs   |   Public: false
-- أو نفّذ:
-- insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
-- on conflict do nothing;
