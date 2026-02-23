-- ============================================================
-- Hillaha — Migration 002: App Compatibility Layer
-- يضيف الأعمدة الناقصة على الـ schema القائم ويحقن بيانات البذر
-- شغّله في Supabase SQL Editor
-- ============================================================

-- ─── 1. Partners — أعمدة إضافية ──────────────────────────────────────────────

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS name_ar         text,
  ADD COLUMN IF NOT EXISTS description_ar  text,
  ADD COLUMN IF NOT EXISTS cover_image     text,
  ADD COLUMN IF NOT EXISTS type            text NOT NULL DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS review_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_time   text DEFAULT '30-45 دقيقة',
  ADD COLUMN IF NOT EXISTS delivery_fee    numeric(6,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS min_order       numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags            text[],
  ADD COLUMN IF NOT EXISTS commission_rate numeric(4,3) NOT NULL DEFAULT 0.10;

-- Set name_ar = name for existing rows that don't have it yet
UPDATE public.partners SET name_ar = name WHERE name_ar IS NULL;

-- ─── 2. Menu items — أعمدة إضافية ────────────────────────────────────────────

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar      text,
  ADD COLUMN IF NOT EXISTS image        text,
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_popular   boolean NOT NULL DEFAULT false;

-- Backfill name_ar
UPDATE public.menu_items SET name_ar = name WHERE name_ar IS NULL;

-- Rename `available` → `is_available` if old column exists (safe, idempotent)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='menu_items' AND column_name='available'
  ) THEN
    UPDATE public.menu_items SET is_available = available WHERE is_available IS NULL;
  END IF;
END $$;

-- ─── 3. Platform Settings ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_settings'
      AND policyname = 'public read settings'
  ) THEN
    CREATE POLICY "public read settings" ON public.platform_settings
      FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO public.platform_settings (key, value) VALUES
  ('instapay_account',   '@malmaghrabi77'),
  ('etisalat_phone',     '01107549225'),
  ('vodafone_phone',     ''),
  ('delivery_fee_base',  '15'),
  ('min_order_default',  '0'),
  ('loyalty_per_egp',    '250'),
  ('loyalty_min_redeem', '20')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ─── 4. Categories ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  name_ar    text NOT NULL,
  icon       text,
  type       text NOT NULL DEFAULT 'food',
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO public.categories (id, name, name_ar, icon, type, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Burgers',           'برجر',             '🍔', 'food', 1),
  ('00000000-0000-0000-0000-000000000002', 'Shawarma',          'شاورما',           '🌯', 'food', 2),
  ('00000000-0000-0000-0000-000000000003', 'Pizza',             'بيتزا',            '🍕', 'food', 3),
  ('00000000-0000-0000-0000-000000000004', 'Chicken',           'فراخ',             '🍗', 'food', 4),
  ('00000000-0000-0000-0000-000000000005', 'Healthy',           'صحي',              '🥗', 'food', 5),
  ('00000000-0000-0000-0000-000000000006', 'Coffee & Desserts', 'قهوة وحلويات',     '☕', 'food', 6),
  ('00000000-0000-0000-0000-000000000007', 'Koshary & Egyptian','كشري ومأكولات مصرية','🥘','food', 7)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Seed Partners (UUIDs ثابتة تطابق الكود) ──────────────────────────────

INSERT INTO public.partners
  (id, name, name_ar, description_ar, cover_image, category, type,
   rating, review_count, delivery_time, delivery_fee, min_order,
   is_open, is_featured, tags, city, commission_rate)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'El Sharkawy', 'الشرقاوي',
    'أشهر مطعم كشري في قنا — منذ 1980',
    'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=900&q=90',
    'كشري ومصري', 'restaurant', 4.8, 1850, '20-30 دقيقة', 10, 30,
    true, true, ARRAY['كشري','مصري'], 'قنا', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Shawarma El Reem', 'شاورما الريم',
    'شاورما مشوية طازجة يومياً',
    'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=900&q=90',
    'شاورما', 'restaurant', 4.6, 1200, '25-35 دقيقة', 12, 50,
    true, true, ARRAY['شاورما','مشويات'], 'قنا', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Burger House', 'برجر هاوس',
    'برجر أمريكي كلاسيك وسماش برجر',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=90',
    'برجر', 'restaurant', 4.5, 780, '30-40 دقيقة', 15, 80,
    true, true, ARRAY['برجر','أمريكي'], 'قنا', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Pizza Planet', 'بيتزا بلانيت',
    'بيتزا إيطالية بعجينة رقيقة طازجة',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=90',
    'بيتزا', 'restaurant', 4.4, 560, '30-45 دقيقة', 15, 90,
    true, false, ARRAY['بيتزا','إيطالي'], 'قنا', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Chicken Master', 'تشيكن ماستر',
    'فراخ مقرمشة وكريسبي بأفضل الأسعار',
    'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&q=90',
    'فراخ', 'restaurant', 4.7, 920, '25-35 دقيقة', 12, 60,
    true, true, ARRAY['فراخ','كريسبي'], 'قنا', 0.10
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'Cafe Nile', 'كافيه النيل',
    'قهوة مختصة وحلويات شرقية بإطلالة النيل',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=90',
    'قهوة وحلويات', 'restaurant', 4.9, 1100, '15-25 دقيقة', 12, 40,
    true, true, ARRAY['قهوة','حلويات'], 'قنا', 0.10
  )
ON CONFLICT (id) DO UPDATE SET
  name_ar        = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  cover_image    = EXCLUDED.cover_image,
  rating         = EXCLUDED.rating,
  review_count   = EXCLUDED.review_count,
  delivery_time  = EXCLUDED.delivery_time,
  delivery_fee   = EXCLUDED.delivery_fee;

-- ─── 6. Seed Menu Items ───────────────────────────────────────────────────────

-- الشرقاوي
INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Koshary Large',  'كشري كبير',   'كشري بالأرز والعدس والمكرونة — حجم كبير',  20, 'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80', 'الأطباق الرئيسية', true, true),
  ('10000000-0000-0000-0000-000000000001', 'Koshary Medium', 'كشري وسط',    'كشري بالأرز والعدس والمكرونة — حجم وسط',  15, 'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80', 'الأطباق الرئيسية', true, true),
  ('10000000-0000-0000-0000-000000000001', 'Ful Medames',    'فول مدمس',     'فول إسكندراني بالزيت والليمون والثوم',     12, 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=300&q=80', 'الإضافات', true, false),
  ('10000000-0000-0000-0000-000000000001', 'Falafel',        'طعمية',        '6 قطع طعمية مقرمشة',                       10, 'https://images.unsplash.com/photo-1614273888655-602f7b97ed4e?w=300&q=80', 'الإضافات', true, false),
  ('10000000-0000-0000-0000-000000000001', 'Pepsi Can',      'بيبسي',        'علبة 330 مل',                               10, 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=300&q=80', 'مشروبات',  true, false)
ON CONFLICT DO NOTHING;

-- شاورما الريم
INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000002', 'Chicken Shawarma', 'شاورما دجاج',      'شاورما دجاج بالخبز العربي والثوم والخيار', 45, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&q=80', 'الشاورما', true, true),
  ('10000000-0000-0000-0000-000000000002', 'Meat Plate',       'طبق شاورما لحم',   'طبق أرز وشاورما لحم مع سلطة',             75, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&q=80', 'الأطباق',  true, true),
  ('10000000-0000-0000-0000-000000000002', 'Mixed Grills',     'مشكل مشويات',      'تشكيلة لحوم ودجاج مشوية',                110, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80', 'الأطباق',  true, false),
  ('10000000-0000-0000-0000-000000000002', 'Hummus',           'حمص بالطحينة',     'حمص ناعم بزيت الزيتون والبابريكا',        25, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=300&q=80', 'الإضافات', true, false)
ON CONFLICT DO NOTHING;

-- برجر هاوس
INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000003', 'Classic Burger', 'برجر كلاسيك',   'لحمة بقري مشوية مع جبن وخس وطماطم',       85,  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', 'البرجر',   true, true),
  ('10000000-0000-0000-0000-000000000003', 'Double Smash',   'دبل سماش',      'بطتين لحمة مع جبن مزدوج وصوص سري',       130,  'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&q=80', 'البرجر',   true, true),
  ('10000000-0000-0000-0000-000000000003', 'Loaded Fries',   'بطاطس محملة',   'بطاطس مقرمشة مع جبن وبيكون وجالابينو',    55,  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&q=80', 'الجانبية', true, false),
  ('10000000-0000-0000-0000-000000000003', 'Oreo Milkshake', 'ميلك شيك أوريو','مشروب كريمي بالأوريو والشوكولاتة',         60,  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', 'مشروبات',  true, false)
ON CONFLICT DO NOTHING;

-- بيتزا بلانيت
INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000004', 'Margherita',   'مارجريتا',     'طماطم وجبن موزاريلا وريحان طازج',           90, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80', 'البيتزا',  true, true),
  ('10000000-0000-0000-0000-000000000004', 'Pepperoni',    'بيبروني',      'بيبروني وموزاريلا وصوص طماطم',             110, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80', 'البيتزا',  true, true),
  ('10000000-0000-0000-0000-000000000004', 'Garlic Bread', 'خبز بالثوم',   'خبز فرنسي بالثوم والزبدة والجبن',           35, 'https://images.unsplash.com/photo-1619531040576-f9416740661e?w=300&q=80', 'الإضافات', true, false)
ON CONFLICT DO NOTHING;

-- تشيكن ماستر
INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000005', 'Crispy Meal',    'وجبة كريسبي',  'فراخ كريسبي مع بطاطس وعصير',              80, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&q=80', 'الوجبات', true, true),
  ('10000000-0000-0000-0000-000000000005', 'Grilled Chicken','دجاج مشوي',    'نصف دجاجة مشوية مع أرز وسلطة',            95, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=300&q=80', 'الوجبات', true, false),
  ('10000000-0000-0000-0000-000000000005', 'Chicken Wings',  'أجنحة دجاج',   '8 أجنحة بالصوص الحار أو البارد',           70, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=300&q=80', 'الوجبات', true, true)
ON CONFLICT DO NOTHING;

-- كافيه النيل
INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000006', 'Spanish Latte',  'سبانش لاتيه',  'إسبريسو مع حليب مكثف بالسكر',              55, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80', 'المشروبات', true, true),
  ('10000000-0000-0000-0000-000000000006', 'Turkish Coffee', 'قهوة تركي',    'قهوة تركية على الرمال الساخنة',             25, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&q=80', 'المشروبات', true, false),
  ('10000000-0000-0000-0000-000000000006', 'Kunafa',         'كنافة',        'كنافة بالجبن والقطر الساخن',                60, 'https://images.unsplash.com/photo-1567380177-1d2bf7a3bd6b?w=300&q=80', 'الحلويات',  true, true),
  ('10000000-0000-0000-0000-000000000006', 'Basbousa',       'بسبوسة',       'بسبوسة بالقشطة والقطر',                     30, 'https://images.unsplash.com/photo-1575853121743-60c24f0a7502?w=300&q=80', 'الحلويات',  true, false)
ON CONFLICT DO NOTHING;
