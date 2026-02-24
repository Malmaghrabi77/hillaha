-- ============================================================
-- Hillaha — Migration 003: Complete Self-Contained Setup
-- آمن على قاعدة بيانات فارغة أو موجودة (idempotent)
-- كل ADD COLUMN في DO block مستقل — فشل عمود لا يوقف الباقين
-- شغّله في Supabase SQL Editor
-- ============================================================

-- ─── helpers: add column safely ──────────────────────────────────────────────
-- (reused pattern: each column is its own DO block with EXCEPTION WHEN OTHERS)

-- ─── 1. Profiles ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  phone      text,
  role       text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users can read own profile') THEN
    CREATE POLICY "users can read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users can update own profile') THEN
    CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Drop NOT NULL on legacy columns that may block profile insertion
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='country_code') THEN
    ALTER TABLE public.profiles ALTER COLUMN country_code DROP NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─── 2. Partners ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_ar         text,
  description_ar  text,
  cover_image     text,
  category        text NOT NULL DEFAULT 'مطاعم',
  type            text NOT NULL DEFAULT 'restaurant',
  address         text,
  city            text DEFAULT 'قنا',
  logo_url        text,
  is_open         boolean DEFAULT true,
  is_featured     boolean NOT NULL DEFAULT false,
  rating          numeric(2,1) DEFAULT 4.5,
  review_count    integer NOT NULL DEFAULT 0,
  delivery_time   text DEFAULT '30-45 دقيقة',
  delivery_fee    numeric(6,2) NOT NULL DEFAULT 15,
  min_order       numeric(8,2) NOT NULL DEFAULT 0,
  tags            text[],
  lat             numeric,
  lng             numeric,
  commission_rate numeric(4,3) NOT NULL DEFAULT 0.10,
  created_at      timestamptz DEFAULT now()
);

-- Each column in its own DO block — failures are isolated
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS user_id uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS name_ar text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS description_ar text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS cover_image text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS category text DEFAULT 'مطاعم'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS type text DEFAULT 'restaurant'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS city text DEFAULT 'قنا'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 4.5; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS delivery_time text DEFAULT '30-45 دقيقة'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS delivery_fee numeric(6,2) DEFAULT 15; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS min_order numeric(8,2) DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS tags text[]; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS lat numeric; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS lng numeric; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS commission_rate numeric(4,3) DEFAULT 0.10; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS logo_url text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS address text; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Drop NOT NULL on legacy columns from full_migration.sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='partners' AND column_name='partner_type') THEN
    ALTER TABLE public.partners ALTER COLUMN partner_type DROP NOT NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='partners' AND column_name='city_id') THEN
    ALTER TABLE public.partners ALTER COLUMN city_id DROP NOT NULL;
  END IF;
END $$;

-- Fill name_ar from name where missing
UPDATE public.partners SET name_ar = name WHERE name_ar IS NULL;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='anyone can read partners') THEN
    CREATE POLICY "anyone can read partners" ON public.partners FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='partner can update own store') THEN
    CREATE POLICY "partner can update own store" ON public.partners FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ─── 3. Menu Items ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.menu_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  name         text NOT NULL,
  name_ar      text,
  description  text,
  price        numeric(10,2) NOT NULL,
  image        text,
  category     text,
  emoji        text DEFAULT '🍽️',
  available    boolean DEFAULT true,
  is_available boolean NOT NULL DEFAULT true,
  is_popular   boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS name_ar text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS description text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS category text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS emoji text DEFAULT '🍽️'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS available boolean DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END $$;

UPDATE public.menu_items SET name_ar = name WHERE name_ar IS NULL;
UPDATE public.menu_items SET is_available = COALESCE(available, true) WHERE is_available IS NULL;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='menu_items' AND policyname='anyone can read menu items') THEN
    CREATE POLICY "anyone can read menu items" ON public.menu_items FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='menu_items' AND policyname='partner can manage own menu') THEN
    CREATE POLICY "partner can manage own menu" ON public.menu_items FOR ALL
      USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
  END IF;
END $$;


-- ─── 4. Orders ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id        uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  driver_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_address  text NOT NULL DEFAULT '',
  delivery_city     text DEFAULT 'قنا',
  customer_phone    text,
  customer_note     text,
  items             jsonb NOT NULL DEFAULT '[]',
  subtotal          numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee      numeric(10,2) NOT NULL DEFAULT 10,
  discount          numeric(10,2) NOT NULL DEFAULT 0,
  total             numeric(10,2) NOT NULL DEFAULT 0,
  payment_method    text NOT NULL DEFAULT 'cash',
  payment_proof_url text,
  status            text NOT NULL DEFAULT 'pending',
  driver_lat        numeric,
  driver_lng        numeric,
  driver_heading    numeric,
  created_at        timestamptz DEFAULT now(),
  accepted_at       timestamptz,
  ready_at          timestamptz,
  picked_up_at      timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text
);

DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_city text DEFAULT 'قنا'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) DEFAULT 10; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total numeric(10,2) DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_lat numeric; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_lng numeric; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_heading numeric; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason text; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_at timestamptz; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at timestamptz; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Convert enum columns → text (from full_migration.sql)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='status' AND data_type='USER-DEFINED') THEN
    ALTER TABLE public.orders ALTER COLUMN status TYPE text;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_method' AND data_type='USER-DEFINED') THEN
    ALTER TABLE public.orders ALTER COLUMN payment_method TYPE text;
  END IF;
END $$;

-- Drop NOT NULL on legacy columns
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='user_id') THEN
    ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='city_id') THEN
    ALTER TABLE public.orders ALTER COLUMN city_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='customer sees own orders') THEN
    CREATE POLICY "customer sees own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='customer creates orders') THEN
    CREATE POLICY "customer creates orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='partner sees store orders') THEN
    CREATE POLICY "partner sees store orders" ON public.orders FOR SELECT
      USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='partner updates store orders') THEN
    CREATE POLICY "partner updates store orders" ON public.orders FOR UPDATE
      USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='driver sees ready orders') THEN
    CREATE POLICY "driver sees ready orders" ON public.orders FOR SELECT
      USING (status = 'ready' OR auth.uid() = driver_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='driver updates own orders') THEN
    CREATE POLICY "driver updates own orders" ON public.orders FOR UPDATE
      USING (auth.uid() = driver_id OR status = 'ready');
  END IF;
END $$;


-- ─── 5. Loyalty Points ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  points      int NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_points' AND policyname='customer sees own points') THEN
    CREATE POLICY "customer sees own points" ON public.loyalty_points FOR SELECT USING (auth.uid() = customer_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF new.status = 'delivered' AND old.status != 'delivered' THEN
    INSERT INTO public.loyalty_points(customer_id, order_id, points, description)
    VALUES (
      new.customer_id, new.id,
      GREATEST(0, FLOOR(new.total / 250)::int),
      'نقاط طلب #' || SUBSTRING(new.id::text, 1, 8)
    );
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.award_loyalty_points();


-- ─── 6. Platform Settings ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

DO $$ BEGIN ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS value text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Drop label/updated_at NOT NULL if from schema.sql version
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_settings' AND column_name='label') THEN
    ALTER TABLE public.platform_settings ALTER COLUMN label DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='platform_settings' AND policyname='anyone can read settings') THEN
    CREATE POLICY "anyone can read settings" ON public.platform_settings FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='platform_settings' AND policyname='super_admin can update settings') THEN
    CREATE POLICY "super_admin can update settings" ON public.platform_settings FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
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


-- ─── 7. Categories ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  name_ar    text NOT NULL,
  icon       text,
  type       text NOT NULL DEFAULT 'food',
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO public.categories (id, name, name_ar, icon, type, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Burgers',            'برجر',               '🍔', 'food', 1),
  ('00000000-0000-0000-0000-000000000002', 'Shawarma',           'شاورما',             '🌯', 'food', 2),
  ('00000000-0000-0000-0000-000000000003', 'Pizza',              'بيتزا',              '🍕', 'food', 3),
  ('00000000-0000-0000-0000-000000000004', 'Chicken',            'فراخ',               '🍗', 'food', 4),
  ('00000000-0000-0000-0000-000000000005', 'Healthy',            'صحي',                '🥗', 'food', 5),
  ('00000000-0000-0000-0000-000000000006', 'Coffee & Desserts',  'قهوة وحلويات',       '☕', 'food', 6),
  ('00000000-0000-0000-0000-000000000007', 'Koshary & Egyptian', 'كشري ومأكولات مصرية','🥘', 'food', 7)
ON CONFLICT (id) DO NOTHING;


-- ─── 8. Seed Partners ─────────────────────────────────────────────────────────

INSERT INTO public.partners
  (id, name, name_ar, description_ar, cover_image, category, type,
   rating, review_count, delivery_time, delivery_fee, min_order,
   is_open, is_featured, tags, city, commission_rate)
VALUES
  ('10000000-0000-0000-0000-000000000001','El Sharkawy','الشرقاوي','أشهر مطعم كشري في قنا — منذ 1980','https://images.unsplash.com/photo-1567360425618-1594206637d2?w=900&q=90','كشري ومصري','restaurant',4.8,1850,'20-30 دقيقة',10,30,true,true,ARRAY['كشري','مصري'],'قنا',0.10),
  ('10000000-0000-0000-0000-000000000002','Shawarma El Reem','شاورما الريم','شاورما مشوية طازجة يومياً','https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=900&q=90','شاورما','restaurant',4.6,1200,'25-35 دقيقة',12,50,true,true,ARRAY['شاورما','مشويات'],'قنا',0.10),
  ('10000000-0000-0000-0000-000000000003','Burger House','برجر هاوس','برجر أمريكي كلاسيك وسماش برجر','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=90','برجر','restaurant',4.5,780,'30-40 دقيقة',15,80,true,true,ARRAY['برجر','أمريكي'],'قنا',0.10),
  ('10000000-0000-0000-0000-000000000004','Pizza Planet','بيتزا بلانيت','بيتزا إيطالية بعجينة رقيقة طازجة','https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=90','بيتزا','restaurant',4.4,560,'30-45 دقيقة',15,90,true,false,ARRAY['بيتزا','إيطالي'],'قنا',0.10),
  ('10000000-0000-0000-0000-000000000005','Chicken Master','تشيكن ماستر','فراخ مقرمشة وكريسبي بأفضل الأسعار','https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&q=90','فراخ','restaurant',4.7,920,'25-35 دقيقة',12,60,true,true,ARRAY['فراخ','كريسبي'],'قنا',0.10),
  ('10000000-0000-0000-0000-000000000006','Cafe Nile','كافيه النيل','قهوة مختصة وحلويات شرقية بإطلالة النيل','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=90','قهوة وحلويات','restaurant',4.9,1100,'15-25 دقيقة',12,40,true,true,ARRAY['قهوة','حلويات'],'قنا',0.10)
ON CONFLICT (id) DO UPDATE SET
  name_ar        = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  cover_image    = EXCLUDED.cover_image,
  rating         = EXCLUDED.rating,
  review_count   = EXCLUDED.review_count,
  delivery_time  = EXCLUDED.delivery_time,
  delivery_fee   = EXCLUDED.delivery_fee;


-- ─── 9. Seed Menu Items ───────────────────────────────────────────────────────

INSERT INTO public.menu_items (partner_id, name, name_ar, description, price, image, category, is_available, is_popular) VALUES
  ('10000000-0000-0000-0000-000000000001','Koshary Large','كشري كبير','كشري بالأرز والعدس والمكرونة — حجم كبير',20,'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80','الأطباق الرئيسية',true,true),
  ('10000000-0000-0000-0000-000000000001','Koshary Medium','كشري وسط','كشري بالأرز والعدس والمكرونة — حجم وسط',15,'https://images.unsplash.com/photo-1567360425618-1594206637d2?w=300&q=80','الأطباق الرئيسية',true,true),
  ('10000000-0000-0000-0000-000000000001','Ful Medames','فول مدمس','فول إسكندراني بالزيت والليمون والثوم',12,'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=300&q=80','الإضافات',true,false),
  ('10000000-0000-0000-0000-000000000001','Falafel','طعمية','6 قطع طعمية مقرمشة',10,'https://images.unsplash.com/photo-1614273888655-602f7b97ed4e?w=300&q=80','الإضافات',true,false),
  ('10000000-0000-0000-0000-000000000001','Pepsi Can','بيبسي','علبة 330 مل',10,'https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=300&q=80','مشروبات',true,false),
  ('10000000-0000-0000-0000-000000000002','Chicken Shawarma','شاورما دجاج','شاورما دجاج بالخبز العربي والثوم والخيار',45,'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&q=80','الشاورما',true,true),
  ('10000000-0000-0000-0000-000000000002','Meat Plate','طبق شاورما لحم','طبق أرز وشاورما لحم مع سلطة',75,'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&q=80','الأطباق',true,true),
  ('10000000-0000-0000-0000-000000000002','Mixed Grills','مشكل مشويات','تشكيلة لحوم ودجاج مشوية',110,'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80','الأطباق',true,false),
  ('10000000-0000-0000-0000-000000000002','Hummus','حمص بالطحينة','حمص ناعم بزيت الزيتون والبابريكا',25,'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=300&q=80','الإضافات',true,false),
  ('10000000-0000-0000-0000-000000000003','Classic Burger','برجر كلاسيك','لحمة بقري مشوية مع جبن وخس وطماطم',85,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80','البرجر',true,true),
  ('10000000-0000-0000-0000-000000000003','Double Smash','دبل سماش','بطتين لحمة مع جبن مزدوج وصوص سري',130,'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&q=80','البرجر',true,true),
  ('10000000-0000-0000-0000-000000000003','Loaded Fries','بطاطس محملة','بطاطس مقرمشة مع جبن وبيكون وجالابينو',55,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&q=80','الجانبية',true,false),
  ('10000000-0000-0000-0000-000000000003','Oreo Milkshake','ميلك شيك أوريو','مشروب كريمي بالأوريو والشوكولاتة',60,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80','مشروبات',true,false),
  ('10000000-0000-0000-0000-000000000004','Margherita','مارجريتا','طماطم وجبن موزاريلا وريحان طازج',90,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80','البيتزا',true,true),
  ('10000000-0000-0000-0000-000000000004','Pepperoni','بيبروني','بيبروني وموزاريلا وصوص طماطم',110,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80','البيتزا',true,true),
  ('10000000-0000-0000-0000-000000000004','Garlic Bread','خبز بالثوم','خبز فرنسي بالثوم والزبدة والجبن',35,'https://images.unsplash.com/photo-1619531040576-f9416740661e?w=300&q=80','الإضافات',true,false),
  ('10000000-0000-0000-0000-000000000005','Crispy Meal','وجبة كريسبي','فراخ كريسبي مع بطاطس وعصير',80,'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&q=80','الوجبات',true,true),
  ('10000000-0000-0000-0000-000000000005','Grilled Chicken','دجاج مشوي','نصف دجاجة مشوية مع أرز وسلطة',95,'https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=300&q=80','الوجبات',true,false),
  ('10000000-0000-0000-0000-000000000005','Chicken Wings','أجنحة دجاج','8 أجنحة بالصوص الحار أو البارد',70,'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=300&q=80','الوجبات',true,true),
  ('10000000-0000-0000-0000-000000000006','Spanish Latte','سبانش لاتيه','إسبريسو مع حليب مكثف بالسكر',55,'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80','المشروبات',true,true),
  ('10000000-0000-0000-0000-000000000006','Turkish Coffee','قهوة تركي','قهوة تركية على الرمال الساخنة',25,'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&q=80','المشروبات',true,false),
  ('10000000-0000-0000-0000-000000000006','Kunafa','كنافة','كنافة بالجبن والقطر الساخن',60,'https://images.unsplash.com/photo-1567380177-1d2bf7a3bd6b?w=300&q=80','الحلويات',true,true),
  ('10000000-0000-0000-0000-000000000006','Basbousa','بسبوسة','بسبوسة بالقشطة والقطر',30,'https://images.unsplash.com/photo-1575853121743-60c24f0a7502?w=300&q=80','الحلويات',true,false)
ON CONFLICT DO NOTHING;

-- ─── 10. Service Bookings (تنظيف + كهرباء) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type   text NOT NULL,               -- 'cleaning' | 'electrical'
  service_name   text NOT NULL,
  price          numeric(8,2) NOT NULL DEFAULT 0,
  address        text NOT NULL DEFAULT '',
  scheduled_time text,
  notes          text,
  status         text NOT NULL DEFAULT 'pending',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='service_bookings' AND policyname='customer sees own bookings') THEN
    CREATE POLICY "customer sees own bookings" ON public.service_bookings
      FOR SELECT USING (auth.uid() = customer_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='service_bookings' AND policyname='customer creates bookings') THEN
    CREATE POLICY "customer creates bookings" ON public.service_bookings
      FOR INSERT WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;


-- ─── 11. Delivery Requests (P2P) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  package_size    text NOT NULL DEFAULT 'small',  -- 'small' | 'medium' | 'large'
  from_address    text NOT NULL DEFAULT '',
  to_address      text NOT NULL DEFAULT '',
  sender_name     text,
  sender_phone    text NOT NULL DEFAULT '',
  receiver_name   text,
  receiver_phone  text NOT NULL DEFAULT '',
  delivery_fee    numeric(6,2) NOT NULL DEFAULT 25,
  status          text NOT NULL DEFAULT 'pending',
  tracking_code   text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  picked_up_at    timestamptz,
  delivered_at    timestamptz
);

ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_requests' AND policyname='sender sees own requests') THEN
    CREATE POLICY "sender sees own requests" ON public.delivery_requests
      FOR SELECT USING (auth.uid() = sender_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_requests' AND policyname='sender creates requests') THEN
    CREATE POLICY "sender creates requests" ON public.delivery_requests
      FOR INSERT WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_requests' AND policyname='driver sees available requests') THEN
    CREATE POLICY "driver sees available requests" ON public.delivery_requests
      FOR SELECT USING (status = 'pending' OR auth.uid() = driver_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_requests' AND policyname='driver updates assigned requests') THEN
    CREATE POLICY "driver updates assigned requests" ON public.delivery_requests
      FOR UPDATE USING (auth.uid() = driver_id OR status = 'pending');
  END IF;
END $$;


-- ============================================================
-- Done ✓ — كل الجداول والبيانات جاهزة
-- ============================================================
