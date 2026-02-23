-- ============================================================
-- Hillaha Platform — Seed Data v1
-- Source: adapted from Hillaha-Services/server/seed.ts
-- Run AFTER 001_initial.sql
-- ============================================================

-- ─── Platform Settings ────────────────────────────────────────────────────────

insert into platform_settings (key, value) values
  ('instapay_account',   '@malmaghrabi77'),
  ('etisalat_phone',     '01107549225'),
  ('vodafone_phone',     ''),
  ('delivery_fee_base',  '15'),
  ('min_order_default',  '0'),
  ('loyalty_per_egp',    '250'),
  ('loyalty_min_redeem', '20')
on conflict (key) do update set value = excluded.value;

-- ─── Categories ───────────────────────────────────────────────────────────────

insert into categories (id, name, name_ar, icon, type, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Burgers',           'برجر',             '🍔', 'food', 1),
  ('00000000-0000-0000-0000-000000000002', 'Shawarma',          'شاورما',           '🌯', 'food', 2),
  ('00000000-0000-0000-0000-000000000003', 'Pizza',             'بيتزا',            '🍕', 'food', 3),
  ('00000000-0000-0000-0000-000000000004', 'Chicken',           'فراخ',             '🍗', 'food', 4),
  ('00000000-0000-0000-0000-000000000005', 'Healthy',           'صحي',              '🥗', 'food', 5),
  ('00000000-0000-0000-0000-000000000006', 'Coffee & Desserts', 'قهوة وحلويات',     '☕', 'food', 6),
  ('00000000-0000-0000-0000-000000000007', 'Koshary & Egyptian','كشري ومأكولات مصرية','🥘','food', 7)
on conflict (id) do nothing;

-- ─── Partners ────────────────────────────────────────────────────────────────

insert into partners (id, name, name_ar, description_ar, cover_image, category_id, type, rating, review_count, delivery_time, delivery_fee, min_order, is_open, is_featured, tags, city, commission_rate) values
  (
    '10000000-0000-0000-0000-000000000001',
    'El Sharkawy', 'الشرقاوي',
    'أشهر مطعم كشري في قنا — منذ 1980',
    'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=900&q=90',
    '00000000-0000-0000-0000-000000000007',
    'restaurant', 4.8, 1850, '20-30 دقيقة', 10, 30,
    true, true, ARRAY['كشري','مصري','الأكثر طلباً'], 'Qena', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Shawarma El Reem', 'شاورما الريم',
    'شاورما مشوية طازجة يومياً',
    'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=900&q=90',
    '00000000-0000-0000-0000-000000000002',
    'restaurant', 4.6, 1200, '25-35 دقيقة', 12, 50,
    true, true, ARRAY['شاورما','مشويات'], 'Qena', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Burger House', 'برجر هاوس',
    'برجر أمريكي كلاسيك وسماش برجر',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=90',
    '00000000-0000-0000-0000-000000000001',
    'restaurant', 4.5, 780, '30-40 دقيقة', 15, 80,
    true, true, ARRAY['برجر','أمريكي'], 'Qena', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Pizza Planet', 'بيتزا بلانيت',
    'بيتزا إيطالية بعجينة رقيقة طازجة',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=90',
    '00000000-0000-0000-0000-000000000003',
    'restaurant', 4.4, 560, '30-45 دقيقة', 15, 90,
    true, false, ARRAY['بيتزا','إيطالي'], 'Qena', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Chicken Master', 'تشيكن ماستر',
    'فراخ مقرمشة وكريسبي بأفضل الأسعار',
    'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&q=90',
    '00000000-0000-0000-0000-000000000004',
    'restaurant', 4.7, 920, '25-35 دقيقة', 12, 60,
    true, true, ARRAY['فراخ','كريسبي','وجبات'], 'Qena', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'Cafe Nile', 'كافيه النيل',
    'قهوة مختصة وحلويات شرقية بإطلالة النيل',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=90',
    '00000000-0000-0000-0000-000000000006',
    'restaurant', 4.9, 1100, '15-25 دقيقة', 12, 40,
    true, true, ARRAY['قهوة','حلويات','كافيه'], 'Qena', 0.10
  )
on conflict (id) do nothing;

-- ─── Menu Items ───────────────────────────────────────────────────────────────

-- الشرقاوي
insert into menu_items (partner_id, name, name_ar, description_ar, price, image, category, is_available, is_popular) values
  ('10000000-0000-0000-0000-000000000001', 'Koshary Large',  'كشري كبير',   'كشري بالأرز والعدس والمكرونة — حجم كبير',  20, 'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80', 'الأطباق الرئيسية', true, true),
  ('10000000-0000-0000-0000-000000000001', 'Koshary Medium', 'كشري وسط',    'كشري بالأرز والعدس والمكرونة — حجم وسط',  15, 'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80', 'الأطباق الرئيسية', true, true),
  ('10000000-0000-0000-0000-000000000001', 'Ful Medames',    'فول مدمس',     'فول إسكندراني بالزيت والليمون والثوم',     12, 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=300&q=80', 'الإضافات', true, false),
  ('10000000-0000-0000-0000-000000000001', 'Falafel',        'طعمية',        '6 قطع طعمية مقرمشة',                       10, 'https://images.unsplash.com/photo-1614273888655-602f7b97ed4e?w=300&q=80', 'الإضافات', true, false),
  ('10000000-0000-0000-0000-000000000001', 'Pepsi Can',      'بيبسي',        'علبة 330 مل',                               10, 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=300&q=80', 'مشروبات', true, false);

-- شاورما الريم
insert into menu_items (partner_id, name, name_ar, description_ar, price, image, category, is_available, is_popular) values
  ('10000000-0000-0000-0000-000000000002', 'Chicken Shawarma Wrap','شاورما دجاج',      'شاورما دجاج بالخبز العربي والثوم والخيار', 45, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&q=80', 'الشاورما', true, true),
  ('10000000-0000-0000-0000-000000000002', 'Meat Shawarma Plate',  'طبق شاورما لحم',  'طبق أرز وشاورما لحم مع سلطة',             75, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&q=80', 'الأطباق', true, true),
  ('10000000-0000-0000-0000-000000000002', 'Mixed Grills',          'مشكل مشويات',     'تشكيلة لحوم ودجاج مشوية',                110, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80', 'الأطباق', true, false),
  ('10000000-0000-0000-0000-000000000002', 'Hummus',                'حمص بالطحينة',    'حمص ناعم بزيت الزيتون والبابريكا',        25, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=300&q=80', 'الإضافات', true, false);

-- برجر هاوس
insert into menu_items (partner_id, name, name_ar, description_ar, price, image, category, is_available, is_popular) values
  ('10000000-0000-0000-0000-000000000003', 'Classic Burger',  'برجر كلاسيك',    'لحمة بقري مشوية مع جبن وخس وطماطم',       85, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', 'البرجر', true, true),
  ('10000000-0000-0000-0000-000000000003', 'Double Smash',    'دبل سماش برجر',  'بطتين لحمة مع جبن مزدوج وصوص سري',       130, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&q=80', 'البرجر', true, true),
  ('10000000-0000-0000-0000-000000000003', 'Loaded Fries',    'بطاطس محملة',    'بطاطس مقرمشة مع جبن وبيكون وجالابينو',    55, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&q=80', 'الجانبية', true, false),
  ('10000000-0000-0000-0000-000000000003', 'Oreo Milkshake',  'ميلك شيك أوريو','مشروب كريمي بالأوريو والشوكولاتة',         60, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', 'مشروبات', true, false);

-- بيتزا بلانيت
insert into menu_items (partner_id, name, name_ar, description_ar, price, image, category, is_available, is_popular) values
  ('10000000-0000-0000-0000-000000000004', 'Margherita',     'مارجريتا',       'طماطم وجبن موزاريلا وريحان طازج',           90, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80', 'البيتزا', true, true),
  ('10000000-0000-0000-0000-000000000004', 'Pepperoni',      'بيبروني',        'بيبروني وموزاريلا وصوص طماطم',             110, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80', 'البيتزا', true, true),
  ('10000000-0000-0000-0000-000000000004', 'Garlic Bread',   'خبز بالثوم',     'خبز فرنسي بالثوم والزبدة والجبن',           35, 'https://images.unsplash.com/photo-1619531040576-f9416740661e?w=300&q=80', 'الإضافات', true, false);

-- تشيكن ماستر
insert into menu_items (partner_id, name, name_ar, description_ar, price, image, category, is_available, is_popular) values
  ('10000000-0000-0000-0000-000000000005', 'Crispy Meal',    'وجبة كريسبي',    'فراخ كريسبي مع بطاطس وعصير',               80, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&q=80', 'الوجبات', true, true),
  ('10000000-0000-0000-0000-000000000005', 'Grilled Chicken','دجاج مشوي',      'نصف دجاجة مشوية مع أرز وسلطة',             95, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=300&q=80', 'الوجبات', true, false),
  ('10000000-0000-0000-0000-000000000005', 'Chicken Wings',  'أجنحة دجاج',     '8 أجنحة بالصوص الحار أو البارد',            70, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=300&q=80', 'الوجبات', true, true);

-- كافيه النيل
insert into menu_items (partner_id, name, name_ar, description_ar, price, image, category, is_available, is_popular) values
  ('10000000-0000-0000-0000-000000000006', 'Spanish Latte',   'سبانش لاتيه',    'إسبريسو مع حليب بالسكر حليب المكثف',       55, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80', 'المشروبات', true, true),
  ('10000000-0000-0000-0000-000000000006', 'Kunafa',           'كنافة',          'كنافة بالجبن والقطر الساخن',                60, 'https://images.unsplash.com/photo-1567380177-1d2bf7a3bd6b?w=300&q=80', 'الحلويات', true, true),
  ('10000000-0000-0000-0000-000000000006', 'Basbousa',         'بسبوسة',         'بسبوسة بالقشطة والقطر',                     30, 'https://images.unsplash.com/photo-1575853121743-60c24f0a7502?w=300&q=80', 'الحلويات', true, false),
  ('10000000-0000-0000-0000-000000000006', 'Turkish Coffee',   'قهوة تركي',      'قهوة تركية على الرمال الساخنة',             25, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&q=80', 'المشروبات', true, false);

-- ─── Services ─────────────────────────────────────────────────────────────────

insert into services (name, name_ar, description_ar, icon, base_price, price_unit, rating, is_available) values
  ('Home Cleaning',    'تنظيف المنازل',  'تنظيف شامل للمنزل بأفضل المواد',           '🧹', 150, 'per_hour',  4.8, true),
  ('Plumbing',         'سباكة',           'إصلاح وتركيب جميع أعمال السباكة',          '🔧', 100, 'per_visit', 4.6, true),
  ('AC Service',       'تكييف وتبريد',   'تنظيف وصيانة وإصلاح التكييفات',           '❄️', 200, 'per_visit', 4.7, true),
  ('Electrical Work',  'كهرباء',          'أعمال كهربائية وتمديدات آمنة',             '⚡', 120, 'per_visit', 4.5, true),
  ('Car Wash',         'غسيل سيارات',    'غسيل خارجي وداخلي احترافي',               '🚗',  60, 'per_wash',  4.4, true),
  ('Moving & Packing', 'نقل وتعبئة',     'نقل الأثاث مع التعبئة والفك والتركيب',   '📦', 500, 'per_trip',  4.3, true)
on conflict do nothing;
