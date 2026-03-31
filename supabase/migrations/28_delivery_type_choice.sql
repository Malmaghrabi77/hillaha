-- Migration 28: Partner delivery type choice + commission adjustment
-- Partners can now choose "platform" (app driver) or "self" (own employee) delivery when accepting orders

-- 1. Add delivery_type column to orders
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'platform';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_type_check
    CHECK (delivery_type IN ('platform', 'self'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ensure app_commission and commission_rate columns exist on orders
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS app_commission NUMERIC(10,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.15;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Add self_delivery_commission_rate to partners (10% default — lower than platform 15%)
DO $$ BEGIN
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS self_delivery_commission_rate NUMERIC(4,3) DEFAULT 0.10;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Indexes for driver queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON public.orders(delivery_type);

CREATE INDEX IF NOT EXISTS idx_orders_driver_available
  ON public.orders(status, driver_id, delivery_type)
  WHERE status = 'ready' AND driver_id IS NULL AND delivery_type = 'platform';

-- 5. SECURITY DEFINER function: accept order with delivery type choice
CREATE OR REPLACE FUNCTION public.accept_order_with_delivery_type(
  p_order_id UUID,
  p_delivery_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_partner RECORD;
  v_rate NUMERIC;
  v_commission NUMERIC;
BEGIN
  -- Validate delivery type
  IF p_delivery_type NOT IN ('platform', 'self') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع توصيل غير صالح');
  END IF;

  -- Fetch order (must be pending)
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في حالة انتظار');
  END IF;

  -- Fetch partner for commission rates
  SELECT * INTO v_partner FROM public.partners WHERE id = v_order.partner_id;

  IF p_delivery_type = 'self' THEN
    -- Self delivery: reduced commission on subtotal only, partner keeps delivery fee
    v_rate := COALESCE(v_partner.self_delivery_commission_rate, 0.10);
    v_commission := v_order.subtotal * v_rate;
  ELSE
    -- Platform delivery: full commission on subtotal + delivery_fee
    v_rate := COALESCE(v_partner.commission_rate, 0.15);
    v_commission := (v_order.subtotal + v_order.delivery_fee) * v_rate;
  END IF;

  -- Update the order
  UPDATE public.orders SET
    status          = 'accepted',
    delivery_type   = p_delivery_type,
    commission_rate = v_rate,
    app_commission  = ROUND(v_commission, 2),
    accepted_at     = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'delivery_type', p_delivery_type,
    'commission_rate', v_rate,
    'app_commission', ROUND(v_commission, 2)
  );
END;
$$;
