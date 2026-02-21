-- ================================================
-- Hillaha — Role Constraints
-- تشغّل مرة واحدة بس بعد schema.sql
-- ================================================

-- 1. إضافة unique_admin للـ enum
alter type public.user_role add value if not exists 'unique_admin';

-- ================================================
-- 2. Trigger — منع أكتر من 1 super_admin
--              ومنع أكتر من 3 unique_admins
-- ================================================
create or replace function public.enforce_role_limits()
returns trigger as $$
begin
  if new.role = 'super_admin' then
    if (
      select count(*) from public.profiles
      where role = 'super_admin' and id != new.id
    ) >= 1 then
      raise exception 'يوجد super_admin بالفعل — لا يمكن إنشاء أكثر من واحد.';
    end if;
  end if;

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

drop trigger if exists trg_enforce_role_limits on public.profiles;
create trigger trg_enforce_role_limits
  before insert or update on public.profiles
  for each row execute function public.enforce_role_limits();

-- ================================================
-- 3. Trigger — منع حذف super_admin
-- ================================================
create or replace function public.prevent_super_admin_delete()
returns trigger as $$
begin
  if old.role = 'super_admin' then
    raise exception 'لا يمكن حذف حساب الـ super_admin — محمي على مستوى قاعدة البيانات.';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_super_admin_delete on public.profiles;
create trigger trg_prevent_super_admin_delete
  before delete on public.profiles
  for each row execute function public.prevent_super_admin_delete();
