-- ============================================================
-- Migration 51: Seed Paymob config keys in platform_settings
-- Allows Super Admin to manage PayMob gateway config from UI
-- ============================================================

INSERT INTO public.platform_settings (key, value, label)
VALUES
  ('paymob_secret_key',      '', 'المفتاح السري لبايموب'),
  ('paymob_public_key',      '', 'المفتاح العام لبايموب'),
  ('paymob_integration_id',  '', 'معرف التكامل (Integration ID)'),
  ('paymob_hmac_secret',     '', 'مفتاح HMAC لبايموب'),
  ('paymob_iframe_id',       '', 'معرف الـ iFrame (اختياري)'),
  ('paymob_test_mode',       'true', 'وضع الاختبار لبايموب')
ON CONFLICT (key) DO NOTHING;
