-- Migration 27: Add receiving account fields to payment_methods
-- يضيف حقول حساب الاستلام لكل طريقة دفع

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS receiving_account TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS receiving_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS receiving_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instructions_ar TEXT DEFAULT '';

-- Seed existing account data from platform_settings into payment_methods
UPDATE public.payment_methods
  SET receiving_account = (SELECT value FROM platform_settings WHERE key = 'instapay_account'),
      instructions_ar = 'افتح تطبيق InstaPay وحوّل المبلغ إلى الحساب التالي'
  WHERE code = 'instapay';

UPDATE public.payment_methods
  SET receiving_phone = (SELECT value FROM platform_settings WHERE key = 'etisalat_phone'),
      instructions_ar = 'حوّل المبلغ عبر خدمة E& (اتصالات) إلى الرقم التالي'
  WHERE code = 'etisalat_cash';

UPDATE public.payment_methods
  SET receiving_phone = (SELECT value FROM platform_settings WHERE key = 'vodafone_phone'),
      instructions_ar = 'حوّل المبلغ عبر فودافون كاش إلى الرقم التالي'
  WHERE code = 'vodafone_cash';

-- Set default instructions for other wallets
UPDATE public.payment_methods SET instructions_ar = 'حوّل المبلغ عبر محفظة أورانج إلى الرقم التالي' WHERE code = 'orange_money' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'حوّل المبلغ عبر محفظة WE إلى الرقم التالي' WHERE code = 'we_pay' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع عبر فوري باستخدام الرقم المرجعي التالي' WHERE code = 'fawry' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع بالبطاقة البنكية عبر بوابة الدفع الآمنة' WHERE code = 'credit_card' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع بالبطاقة عبر بوابة الدفع الآمنة' WHERE code = 'debit_card' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع عبر بطاقة ميزة الرقمية' WHERE code = 'meeza' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'ادفع نقداً للمندوب عند الاستلام' WHERE code = 'cash' AND instructions_ar = '';
UPDATE public.payment_methods SET instructions_ar = 'سيتم خصم المبلغ من رصيد محفظتك' WHERE code = 'wallet' AND instructions_ar = '';

-- Allow admin role to read all payment methods (not just enabled)
DROP POLICY IF EXISTS "public can read enabled payment methods" ON public.payment_methods;
CREATE POLICY "public can read enabled payment methods" ON public.payment_methods
  FOR SELECT USING (
    is_enabled = true
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );
