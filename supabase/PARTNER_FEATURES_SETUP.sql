-- ============================================================
-- PARTNER DASHBOARD NEW FEATURES SETUP
-- إضافة جداول الميزات الجديدة (Promotions, Reviews, Drivers)
-- ============================================================

-- ============================================================
-- PHASE 1: Create Enums for New Features
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.promotion_status AS ENUM ('active', 'paused', 'expired', 'draft');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_assignment_status AS ENUM ('active', 'inactive', 'on_leave', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PHASE 1.5: Menu Items Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT DEFAULT '🍔',
  available BOOLEAN DEFAULT true,

  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT menu_items_price_positive CHECK (price > 0),
  UNIQUE(partner_id, name)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_partner_id ON public.menu_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(available);

-- RLS Policies for menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own menu items" ON public.menu_items
  FOR SELECT USING (auth.uid() = (SELECT id FROM public.partners WHERE id = partner_id));

CREATE POLICY "Partners can insert menu items" ON public.menu_items
  FOR INSERT WITH CHECK (auth.uid() = (SELECT id FROM public.partners WHERE id = partner_id));

CREATE POLICY "Partners can update their menu items" ON public.menu_items
  FOR UPDATE USING (auth.uid() = (SELECT id FROM public.partners WHERE id = partner_id));

CREATE POLICY "Partners can delete their menu items" ON public.menu_items
  FOR DELETE USING (auth.uid() = (SELECT id FROM public.partners WHERE id = partner_id));

-- ============================================================
-- PHASE 2: Promotions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  -- Promotion Details
  name TEXT NOT NULL,
  description TEXT,
  status public.promotion_status DEFAULT 'draft',

  -- Discount Configuration
  discount_type public.discount_type NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_value NUMERIC(10, 2) DEFAULT 0,
  max_discount_amount NUMERIC(10, 2),

  -- Date Range
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Coupon Code (Optional)
  coupon_code TEXT UNIQUE,

  -- Application Settings
  apply_to_all_items BOOLEAN DEFAULT true,
  product_ids TEXT[], -- JSON array of menu item IDs

  -- Usage Limits
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  max_uses_per_customer INTEGER,

  -- Management
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validation
  CONSTRAINT valid_discount_value CHECK (discount_value > 0),
  CONSTRAINT valid_min_order CHECK (min_order_value >= 0),
  CONSTRAINT valid_dates CHECK (start_date < end_date),
  CONSTRAINT unique_promotion_per_partner_name UNIQUE (partner_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_partner_id ON public.promotions(partner_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_coupon_code ON public.promotions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(start_date, end_date);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can see and manage their own promotions
DO $$ BEGIN
  CREATE POLICY "promotions_partner_read_own" ON public.promotions
    FOR SELECT USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "promotions_partner_insert" ON public.promotions
    FOR INSERT WITH CHECK (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "promotions_partner_update" ON public.promotions
    FOR UPDATE USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PHASE 3: Reviews Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,

  -- Images/Attachments
  image_urls TEXT[],

  -- Response from Partner
  response TEXT,
  response_by UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMPTZ,

  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_helpful_count INTEGER DEFAULT 0,
  is_unhelpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rating_valid CHECK (rating >= 1 AND rating <= 5)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_partner_id ON public.reviews(partner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can see reviews for their store
DO $$ BEGIN
  CREATE POLICY "reviews_partner_read_own" ON public.reviews
    FOR SELECT USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policy: Partners can update responses
DO $$ BEGIN
  CREATE POLICY "reviews_partner_update_response" ON public.reviews
    FOR UPDATE USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PHASE 4: Driver Assignment Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Status
  status public.driver_assignment_status DEFAULT 'active',

  -- Performance Metrics
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  average_rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  -- Assignment Tracking
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),

  -- Earnings
  total_earnings NUMERIC(10, 2) DEFAULT 0,
  commission_rate NUMERIC(5, 3) DEFAULT 0.15,

  -- Management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_assignment UNIQUE (partner_id, driver_id),
  CONSTRAINT valid_commission CHECK (commission_rate >= 0 AND commission_rate <= 1),
  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_assignments_partner_id ON public.driver_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_id ON public.driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_status ON public.driver_assignments(status);

-- Enable RLS
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can see their driver assignments
DO $$ BEGIN
  CREATE POLICY "driver_assignments_partner_read" ON public.driver_assignments
    FOR SELECT USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policy: Partners can update assignments
DO $$ BEGIN
  CREATE POLICY "driver_assignments_partner_update" ON public.driver_assignments
    FOR UPDATE USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PHASE 5: Driver Schedule Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.driver_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  -- Day and Time
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_times CHECK (start_time < end_time),
  CONSTRAINT unique_schedule UNIQUE (driver_id, partner_id, day_of_week)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_schedule_driver_id ON public.driver_schedule(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedule_partner_id ON public.driver_schedule(partner_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedule_day ON public.driver_schedule(day_of_week);

-- Enable RLS
ALTER TABLE public.driver_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can see and manage their driver schedules
DO $$ BEGIN
  CREATE POLICY "driver_schedule_partner_read" ON public.driver_schedule
    FOR SELECT USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "driver_schedule_partner_write" ON public.driver_schedule
    FOR INSERT, UPDATE, DELETE USING (
      partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PHASE 6: Promotion Usage Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id),

  -- Discount Applied
  discount_amount NUMERIC(10, 2) NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON public.promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_order_id ON public.promotion_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer_id ON public.promotion_usage(customer_id);

-- ============================================================
-- ✅ NEW FEATURES TABLES CREATED
-- جميع جداول الميزات الجديدة تم إنشاؤها بنجاح
-- ============================================================
