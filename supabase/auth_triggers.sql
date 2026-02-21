-- ================================================
-- Hillaha — Auth Triggers
-- شغّل ده بعد constraints.sql
-- ================================================

-- ================================================
-- 1. Seed — الدول (مصر + السعودية)
-- ================================================
insert into public.countries (code, name_ar, name_en, currency, vat_rate, vat_inclusive) values
  ('EG', 'مصر',        'Egypt',        'EGP', 0.14, false),
  ('SA', 'السعودية',   'Saudi Arabia', 'SAR', 0.15, true)
on conflict (code) do nothing;

-- ================================================
-- 2. Trigger — إنشاء profile تلقائي عند التسجيل
--             + تعيين super_admin لصاحب الإيميل
-- ================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role    public.user_role := 'customer';
  v_country text             := 'EG';
begin
  -- super_admin: فقط لصاحب الإيميل المرخص
  if new.email = 'malmaghrabi77@gmail.com' then
    v_role := 'super_admin';
  end if;

  -- country_code من بيانات التسجيل لو موجودة
  if new.raw_user_meta_data->>'country_code' is not null then
    v_country := new.raw_user_meta_data->>'country_code';
  end if;

  insert into public.profiles (id, full_name, role, country_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_country
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================
-- 3. تحديث enforce_role_limits
--    super_admin = الإيميل المرخص فقط
-- ================================================
create or replace function public.enforce_role_limits()
returns trigger as $$
declare
  v_email text;
begin
  -- super_admin: إيميل واحد فقط مرخص
  if new.role = 'super_admin' then
    select email into v_email from auth.users where id = new.id;
    if v_email != 'malmaghrabi77@gmail.com' then
      raise exception 'هذا الإيميل غير مرخص لصلاحية super_admin.';
    end if;
    if (
      select count(*) from public.profiles
      where role = 'super_admin' and id != new.id
    ) >= 1 then
      raise exception 'يوجد super_admin بالفعل — لا يمكن إنشاء أكثر من واحد.';
    end if;
  end if;

  -- unique_admin: 3 كحد أقصى
  if new.role = 'unique_admin' then
    if (
      select count(*) from public.profiles
      where role = 'unique_admin' and id != new.id
    ) >= 3 then
      raise exception 'الحد الأقصى للـ unique_admins هو 3.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
