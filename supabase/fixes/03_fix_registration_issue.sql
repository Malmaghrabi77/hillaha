-- ================================================
-- Fix Registration Issue - حل مشكلة التسجيل الجديد
-- تشغّل هذا بعد إنشاء جداول البيانات الأساسية
-- ================================================

-- 1. تأكد من وجود جميع INSERT/UPDATE policies على profiles
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_insert_self" on public.profiles
for insert
to authenticated, anon
with check (true);

create policy "profiles_update_own" on public.profiles
for update
to authenticated
using (id = auth.uid());

-- 2. تحديث الـ trigger ليكون أكثر موثوقية
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    role,
    created_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(new.raw_user_meta_data->>'full_name', profiles.full_name),
    phone = coalesce(new.raw_user_meta_data->>'phone', profiles.phone),
    role = coalesce(new.raw_user_meta_data->>'role', profiles.role);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. تأكد من استقرار RLS على profiles
alter table public.profiles enable row level security;

-- 4. تنظيف: حذف أي policies متكررة
drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;

-- 5. إضافة READ policy إذا لم تكن موجودة
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
for select using (id = auth.uid());

-- ================================================
-- تأكيد: تعطيل multi-trigger conflicts
-- ================================================
-- تحقق من أن trigger واحد فقط موجود
select count(*) as trigger_count
from information_schema.triggers
where trigger_name = 'on_auth_user_created';
