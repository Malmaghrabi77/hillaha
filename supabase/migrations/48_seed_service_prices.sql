-- Migration 48: Ensure service_prices are seeded in production
-- Seeds all predefined services for P2P delivery, cleaning, and electrical

INSERT INTO public.service_prices (category, service_key, label_ar, description_ar, icon, price, price_unit, sort_order) VALUES
  -- P2P Delivery
  ('delivery_p2p', 'small',  'صغير',   'يحمله بيد واحدة — مستندات، ملابس',         '📦', 25,  'per_trip', 1),
  ('delivery_p2p', 'medium', 'متوسط',  'كرتونة صغيرة — أجهزة صغيرة، هدايا',        '📫', 40,  'per_trip', 2),
  ('delivery_p2p', 'large',  'كبير',   'كرتونة كبيرة — أجهزة كبيرة، أثاث خفيف',    '🗃️', 60,  'per_trip', 3),
  -- Cleaning
  ('cleaning', 'basic',   'تنظيف أساسي',     'غرفة + حمام',            '🧹', 120, 'per_visit', 1),
  ('cleaning', 'full',    'تنظيف شامل',      'الشقة كاملة',            '✨', 250, 'per_visit', 2),
  ('cleaning', 'deep',    'تنظيف عميق',      'شامل الأثاث والزجاج',    '🫧', 400, 'per_visit', 3),
  ('cleaning', 'curtain', 'غسيل ستائر',      'لكل الغرف',              '🪟', 180, 'per_visit', 4),
  ('cleaning', 'carpet',  'تنظيف موكيت',     'لكل قطعة',               '🏠', 80,  'per_visit', 5),
  ('cleaning', 'move',    'تنظيف بعد إسكان', 'إزالة أتربة البناء',      '🔑', 500, 'per_visit', 6),
  -- Electrical
  ('electrical', 'ac_service',   'صيانة مكيف',       'فحص وتنظيف وإصلاح',     '❄️', 150, 'per_visit', 1),
  ('electrical', 'ac_install',   'تركيب مكيف',       'تركيب احترافي مضمون',    '🔧', 250, 'per_visit', 2),
  ('electrical', 'ac_gas',       'شحن فريون',        'شحن كامل للمكيف',        '💨', 200, 'per_visit', 3),
  ('electrical', 'elec_fix',     'إصلاح كهرباء',    'أقسام ووصلات كهربائية',  '⚡', 100, 'per_visit', 4),
  ('electrical', 'elec_install', 'تركيب إضاءة',     'ليدات وإضاءة منزلية',    '💡', 80,  'per_visit', 5),
  ('electrical', 'safety',       'فحص أمان كهربائي', 'تقرير شامل للمنزل',      '🛡️', 120, 'per_visit', 6)
ON CONFLICT (category, service_key) DO NOTHING;
