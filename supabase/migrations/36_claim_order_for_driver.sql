-- =====================================================================================
-- Migration 36: Atomic driver order claiming RPC
-- =====================================================================================
-- Prevents race condition where two drivers claim the same order simultaneously.
-- Uses SECURITY DEFINER + row-level locking (FOR UPDATE) for atomicity.
-- =====================================================================================

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
  -- Lock the row and check it's available
  SELECT id, driver_id, status, delivery_type
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  -- Only ready orders with platform delivery can be claimed
  IF v_order.status NOT IN ('ready', 'accepted', 'preparing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الطلب لا تسمح بالاستلام');
  END IF;

  IF v_order.delivery_type = 'self' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب توصيل ذاتي من المتجر');
  END IF;

  IF v_order.driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم قبول هذا الطلب بواسطة سائق آخر');
  END IF;

  -- Claim the order
  UPDATE public.orders
  SET driver_id    = p_driver_id,
      status       = 'picked_up',
      picked_up_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated users (drivers)
GRANT EXECUTE ON FUNCTION public.claim_order_for_driver(UUID, UUID) TO authenticated;
