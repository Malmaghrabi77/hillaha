-- =====================================================================================
-- Migration 35: Fix RLS policies + add missing columns
-- =====================================================================================
-- Fixes:
--   1. Drop broken RLS policies from migration 30 (reference nonexistent columns)
--   2. Add preparing_at column to orders table
--   3. Fix customer_reads_order_messages RLS tautology
-- =====================================================================================

-- ─── 1. Drop broken RLS policies ──────────────────────────────────────────────

-- messages_select_own references receiver_id which doesn't exist
DROP POLICY IF EXISTS messages_select_own ON public.messages;

-- support_messages_select_own references user_id which doesn't exist
DROP POLICY IF EXISTS support_messages_select_own ON public.support_messages;

-- ─── 2. Fix customer_reads_order_messages tautology ────────────────────────────
-- The old policy had: partner_id IN (SELECT id FROM partners WHERE id = partner_id)
-- which is a tautology (always true for non-null partner_id)

DROP POLICY IF EXISTS customer_reads_order_messages ON public.messages;

CREATE POLICY customer_reads_order_messages ON public.messages
  FOR SELECT USING (
    -- Customer can read messages for orders they own
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = messages.order_id
      AND o.customer_id = auth.uid()
    )
    OR
    -- Or messages they sent
    sender_id = auth.uid()
  );

-- ─── 3. Add preparing_at column to orders ─────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── 4. Ensure delivery_type column exists ─────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'platform';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
