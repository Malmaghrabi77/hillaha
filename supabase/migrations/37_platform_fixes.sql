-- =====================================================================================
-- Migration 37: Platform fixes — RPC security, indexes, schema fixes
-- =====================================================================================
-- Note: payment_methods table already exists from migration 26 with columns:
-- (code, name, name_ar, icon, description, description_ar, category, commission_rate, is_enabled, requires_config)
-- Migration 27 added: receiving_phone, receiving_account, receiving_name, instructions_ar

-- 1. Ensure additional payment methods exist
INSERT INTO public.payment_methods (name, name_ar, code, icon, description, description_ar, category, commission_rate, is_enabled, requires_config) VALUES
  ('Vodafone Cash', 'فودافون كاش', 'vodafone_cash', '📱', 'Vodafone Cash wallet', 'محفظة فودافون كاش', 'wallet', 0.020, false, false),
  ('Orange Cash',   'اورانج كاش',  'orange_money',  '📱', 'Orange Cash wallet',   'محفظة اورانج كاش',  'wallet', 0.020, false, false),
  ('Fawry',         'فوري',        'fawry',         '🏪', 'Fawry payment',        'دفع فوري',          'other',  0.020, false, false),
  ('Credit Card',   'بطاقة بنكية', 'credit_card',   '💳', 'PayMob card payment',  'دفع بالبطاقة عبر PayMob', 'card', 0.025, true, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Add caller identity verification to claim_order_for_driver
CREATE OR REPLACE FUNCTION public.claim_order_for_driver(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Verify the caller is the driver they claim to be
  IF auth.uid() IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Lock the row and check it's available
  SELECT id, driver_id, status, delivery_type
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_order.status NOT IN ('ready', 'accepted', 'preparing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الطلب لا تسمح بالاستلام');
  END IF;

  IF v_order.delivery_type = 'self' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب توصيل ذاتي من المتجر');
  END IF;

  IF v_order.driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم قبول هذا الطلب بواسطة سائق آخر');
  END IF;

  UPDATE public.orders
  SET driver_id    = p_driver_id,
      status       = 'picked_up',
      picked_up_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Fix dashboard pending count: add index for common partner queries
CREATE INDEX IF NOT EXISTS idx_orders_partner_status ON public.orders (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages (order_id);
CREATE INDEX IF NOT EXISTS idx_messages_partner_id ON public.messages (partner_id);

-- 4. Add updated_at column to payment_methods if missing, and auto-update trigger
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_methods_updated_at();
