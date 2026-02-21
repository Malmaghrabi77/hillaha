-- Migration: update loyalty rules
-- 1 point per 250 EGP spent
-- Minimum redemption: 20 points = 20 EGP discount

CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF new.status = 'delivered' AND old.status != 'delivered' THEN
    -- 1 نقطة لكل 250 جنيه مشتريات
    INSERT INTO public.loyalty_points(customer_id, order_id, points, description)
    VALUES (
      new.customer_id,
      new.id,
      GREATEST(0, floor(new.total / 250)::int),
      'نقاط طلب #' || substring(new.id::text, 1, 8)
    );
  END IF;
  RETURN new;
END;
$$;

-- Redemption function: validate minimum 20 points before redeeming
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_customer_id uuid,
  p_points      int,
  p_description text DEFAULT 'استبدال نقاط'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance int;
  v_discount numeric;
BEGIN
  -- Check minimum redemption threshold
  IF p_points < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للاستبدال هو 20 نقطة');
  END IF;

  -- Calculate current balance
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.loyalty_points
  WHERE customer_id = p_customer_id;

  IF v_balance < p_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد النقاط غير كافٍ');
  END IF;

  -- Deduct points (negative entry)
  INSERT INTO public.loyalty_points(customer_id, points, description)
  VALUES (p_customer_id, -p_points, p_description);

  -- Calculate discount: 1 point = 1 EGP
  v_discount := p_points;

  RETURN jsonb_build_object(
    'success',   true,
    'discount',  v_discount,
    'remaining', v_balance - p_points
  );
END;
$$;

COMMENT ON FUNCTION public.award_loyalty_points() IS '1 نقطة لكل 250 جنيه مشتريات';
COMMENT ON FUNCTION public.redeem_loyalty_points(uuid, int, text) IS 'استبدال نقاط — الحد الأدنى 20 نقطة = 20 جنيه خصم';
