-- ================================================
-- Hillaha — Seed Cities + Zones
-- ================================================

-- ================================================
-- مدن مصر
-- ================================================
insert into public.cities (country_code, code, name_ar, name_en) values
  ('EG', 'qena',          'قنا',          'Qena'),
  ('EG', 'cairo',         'القاهرة',      'Cairo'),
  ('EG', 'giza',          'الجيزة',       'Giza'),
  ('EG', 'alexandria',    'الإسكندرية',   'Alexandria'),
  ('EG', 'aswan',         'أسوان',        'Aswan'),
  ('EG', 'luxor',         'الأقصر',       'Luxor'),
  ('EG', 'sohag',         'سوهاج',        'Sohag'),
  ('EG', 'asyut',         'أسيوط',        'Asyut')
on conflict (country_code, code) do nothing;

-- ================================================
-- مدن السعودية
-- ================================================
insert into public.cities (country_code, code, name_ar, name_en) values
  ('SA', 'riyadh',        'الرياض',       'Riyadh'),
  ('SA', 'jeddah',        'جدة',          'Jeddah'),
  ('SA', 'makkah',        'مكة المكرمة',  'Makkah'),
  ('SA', 'madinah',       'المدينة المنورة', 'Madinah'),
  ('SA', 'dammam',        'الدمام',       'Dammam')
on conflict (country_code, code) do nothing;

-- ================================================
-- مناطق قنا (أول مدينة تشغيلية)
-- ================================================
insert into public.zones (city_id, name_ar, name_en)
select c.id, z.name_ar, z.name_en
from public.cities c
cross join (values
  ('وسط المدينة',  'City Center'),
  ('الحي الغربي',  'West District'),
  ('الحي الشرقي',  'East District'),
  ('نجع حمادي',    'Nag Hammadi')
) as z(name_ar, name_en)
where c.code = 'qena'
on conflict do nothing;

-- ================================================
-- نطاقات التوصيل — قنا
-- ================================================
insert into public.delivery_bands (city_id, min_km, max_km, fee, app_commission_rate, sort)
select c.id, b.min_km, b.max_km, b.fee, b.rate, b.sort
from public.cities c
cross join (values
  (0,    3,    15, 0.10, 1),
  (3,    7,    20, 0.10, 2),
  (7,    15,   30, 0.10, 3),
  (15,   null, 45, 0.10, 4)
) as b(min_km, max_km, fee, rate, sort)
where c.code = 'qena'
on conflict do nothing;
