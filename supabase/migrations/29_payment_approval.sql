-- Migration 29: High-value order payment approval workflow
-- Orders > 1000 EGP with wallet transfer must be approved by accountant/regional manager

-- 1. Add payment_approval_status to orders
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_approval_status TEXT DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_approval_check
    CHECK (payment_approval_status IS NULL OR payment_approval_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add approval metadata columns
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_approved_by UUID DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_approved_at TIMESTAMPTZ DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Index for pending payment approvals
CREATE INDEX IF NOT EXISTS idx_orders_payment_approval
  ON public.orders(payment_approval_status)
  WHERE payment_approval_status = 'pending';

-- 4. Function to approve high-value payment
CREATE OR REPLACE FUNCTION public.approve_order_payment(
  p_order_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND payment_approval_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في انتظار اعتماد الدفع');
  END IF;

  UPDATE public.orders SET
    payment_approval_status = 'approved',
    payment_approved_by     = p_admin_id,
    payment_approved_at     = now(),
    status                  = 'pending'  -- now visible to partner
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Function to reject high-value payment
CREATE OR REPLACE FUNCTION public.reject_order_payment(
  p_order_id UUID,
  p_admin_id UUID,
  p_reason   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND payment_approval_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو ليس في انتظار اعتماد الدفع');
  END IF;

  UPDATE public.orders SET
    payment_approval_status = 'rejected',
    payment_approved_by     = p_admin_id,
    payment_approved_at     = now(),
    payment_rejection_reason = p_reason,
    status                   = 'cancelled'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
