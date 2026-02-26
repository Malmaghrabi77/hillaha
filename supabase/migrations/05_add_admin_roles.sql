-- Migration: Expand roles to include admin roles
-- يضيف أدوار إدارية للنظام

-- الخطوة 1: حذف القيد الحالي على الأدوار
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- الخطوة 2: إضافة القيد الجديد مع الأدوار الإدارية
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'partner', 'driver', 'admin', 'super_admin'));
