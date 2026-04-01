-- Migration 33: Order notification triggers
-- Automatically sends push notifications when orders are created or status changes.
-- Uses Supabase Database Webhooks as the primary mechanism.
-- Also provides pg_net function as alternative if the extension is enabled.

-- ─── Trigger function using pg_net (if available) ──────────────────────────

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Determine what changed
  IF TG_OP = 'INSERT' THEN
    v_status := 'new_order';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_status := NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  -- Try pg_net async HTTP call
  BEGIN
    SELECT current_setting('app.settings.supabase_url', true) INTO v_url;
    SELECT current_setting('app.settings.service_role_key', true) INTO v_key;

    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/order-status-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'order_id', NEW.id::text,
          'new_status', v_status
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or settings not configured — silently skip
    -- Use Supabase Database Webhooks as fallback (configured via dashboard)
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- ─── Trigger on orders table ────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_order_status_notify ON public.orders;
CREATE TRIGGER trg_order_status_notify
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- ─── Instructions for Supabase Dashboard Webhook (alternative) ─────────────
-- If pg_net is not enabled, create a Database Webhook from the Supabase Dashboard:
--   1. Go to Database → Webhooks
--   2. Create webhook:
--      - Name: order-status-notify
--      - Table: orders
--      - Events: INSERT, UPDATE
--      - Type: Supabase Edge Function
--      - Function: order-status-notify
--      - Headers: Authorization: Bearer {SERVICE_ROLE_KEY}
