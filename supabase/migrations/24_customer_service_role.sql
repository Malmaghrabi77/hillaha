-- Migration 24: Customer Service Role + Invitation Updates
-- ═══════════════════════════════════════════════════════════════

-- 1. Add 'customer_service' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer_service';

-- 2. Drop old CHECK constraint on profiles if exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Update admin_invitations admin_type constraint
DO $$ BEGIN
  ALTER TABLE public.admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_admin_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'admin_invitations' AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%admin_type%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.admin_invitations DROP CONSTRAINT ' || r.constraint_name;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.admin_invitations ADD CONSTRAINT admin_invitations_admin_type_check
  CHECK (admin_type IN ('regional_manager', 'regular_admin', 'accountant', 'customer_service'));

-- 4. RLS policies using role::text cast to avoid enum commit issue
DO $$ BEGIN
  CREATE POLICY "cs_reads_all_tickets" ON public.support_tickets FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cs_updates_tickets" ON public.support_tickets FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cs_reads_all_support_messages" ON public.support_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cs_sends_support_messages" ON public.support_messages FOR INSERT
    WITH CHECK (sender_type = 'support' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cs_reads_all_messages" ON public.messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'customer_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Done
