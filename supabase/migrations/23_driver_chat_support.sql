-- Migration 23: Driver Chat & Support
-- ═══════════════════════════════════════════════════════════════
-- 1. Create messages table (if not exists) — order chat
-- 2. Create support_tickets table (if not exists)
-- 3. Create support_messages table (if not exists)
-- 4. RLS policies for drivers on all chat tables
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. MESSAGES TABLE (order chat: customer ↔ driver)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id   UUID,
  message      TEXT NOT NULL,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('customer', 'driver', 'partner')),
  sender_id    UUID REFERENCES auth.users(id),
  sender_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_partner_id ON public.messages(partner_id, created_at);

-- Customer reads messages for their orders
DO $$ BEGIN
  CREATE POLICY "customer_reads_order_messages"
    ON public.messages FOR SELECT
    USING (
      order_id IN (
        SELECT id FROM public.orders WHERE customer_id = auth.uid()
      )
      OR partner_id IN (
        SELECT id FROM public.partners WHERE id = partner_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customer sends messages
DO $$ BEGIN
  CREATE POLICY "customer_sends_messages"
    ON public.messages FOR INSERT
    WITH CHECK (
      sender_type = 'customer' AND sender_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Driver reads messages for their orders
DO $$ BEGIN
  CREATE POLICY "driver_reads_order_messages"
    ON public.messages FOR SELECT
    USING (
      order_id IN (
        SELECT id FROM public.orders WHERE driver_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Driver sends messages
DO $$ BEGIN
  CREATE POLICY "driver_sends_order_messages"
    ON public.messages FOR INSERT
    WITH CHECK (
      sender_type = 'driver'
      AND sender_id = auth.uid()
      AND order_id IN (
        SELECT id FROM public.orders WHERE driver_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partner reads messages for their store
DO $$ BEGIN
  CREATE POLICY "partner_reads_messages"
    ON public.messages FOR SELECT
    USING (
      partner_id IN (
        SELECT id FROM public.partners WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partner sends messages
DO $$ BEGIN
  CREATE POLICY "partner_sends_messages"
    ON public.messages FOR INSERT
    WITH CHECK (
      sender_type = 'partner' AND sender_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin reads all messages
DO $$ BEGIN
  CREATE POLICY "admin_reads_all_messages"
    ON public.messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 2. SUPPORT TICKETS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, status);

-- User reads own tickets (covers both customers and drivers)
DO $$ BEGIN
  CREATE POLICY "user_reads_own_tickets"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User creates tickets
DO $$ BEGIN
  CREATE POLICY "user_creates_tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin reads all tickets
DO $$ BEGIN
  CREATE POLICY "admin_reads_all_tickets"
    ON public.support_tickets FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin updates tickets (close/resolve)
DO $$ BEGIN
  CREATE POLICY "admin_updates_tickets"
    ON public.support_tickets FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 3. SUPPORT MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('customer', 'driver', 'partner', 'support')),
  sender_id    UUID REFERENCES auth.users(id),
  sender_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

-- User reads messages of own tickets
DO $$ BEGIN
  CREATE POLICY "user_reads_ticket_messages"
    ON public.support_messages FOR SELECT
    USING (
      ticket_id IN (
        SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User sends messages on own tickets
DO $$ BEGIN
  CREATE POLICY "user_sends_ticket_messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (
      sender_id = auth.uid()
      AND ticket_id IN (
        SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin/support reads all messages
DO $$ BEGIN
  CREATE POLICY "admin_reads_all_support_messages"
    ON public.support_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin/support sends messages on any ticket
DO $$ BEGIN
  CREATE POLICY "admin_sends_support_messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (
      sender_type = 'support'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- ENABLE REALTIME FOR CHAT TABLES
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════
COMMENT ON TABLE public.messages IS 'Order chat messages between customer, driver, and partner';
COMMENT ON TABLE public.support_tickets IS 'Support tickets for customers and drivers';
COMMENT ON TABLE public.support_messages IS 'Messages within support tickets';
