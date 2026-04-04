-- Migration 30: Add missing RLS policies for unprotected tables
-- All blocks wrapped with EXCEPTION to safely skip if table/column doesn't exist

-- 1. messages table
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY messages_insert_own ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 2. support_messages table
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY support_messages_select_own ON support_messages FOR SELECT USING (auth.uid() = sender_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY support_messages_insert_own ON support_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 3. reviews table
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY reviews_select_all ON reviews FOR SELECT USING (true);
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY reviews_insert_own ON reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY reviews_update_own ON reviews FOR UPDATE USING (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 4. addresses table
ALTER TABLE IF EXISTS addresses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY addresses_select_own ON addresses FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY addresses_insert_own ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY addresses_update_own ON addresses FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY addresses_delete_own ON addresses FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 5. service_bookings table
ALTER TABLE IF EXISTS service_bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_bookings_select_own ON service_bookings FOR SELECT USING (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY service_bookings_insert_own ON service_bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 6. doctor_bookings table
ALTER TABLE IF EXISTS doctor_bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY doctor_bookings_select_own ON doctor_bookings FOR SELECT USING (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY doctor_bookings_insert_own ON doctor_bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 7. prescription_requests table
ALTER TABLE IF EXISTS prescription_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY prescription_requests_select_own ON prescription_requests FOR SELECT USING (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY prescription_requests_insert_own ON prescription_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 8. delivery_requests table
ALTER TABLE IF EXISTS delivery_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY delivery_requests_select_own ON delivery_requests FOR SELECT USING (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY delivery_requests_insert_own ON delivery_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 9. user_coupons table
ALTER TABLE IF EXISTS user_coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY user_coupons_select_own ON user_coupons FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY user_coupons_insert_own ON user_coupons FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 10. referral_codes table
ALTER TABLE IF EXISTS referral_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY referral_codes_select_own ON referral_codes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY referral_codes_insert_own ON referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- 11. analytics_events table
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY analytics_events_insert_auth ON analytics_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;

-- 12. driver_registrations table
ALTER TABLE IF EXISTS driver_registrations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY driver_registrations_select_own ON driver_registrations FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY driver_registrations_insert_own ON driver_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY driver_registrations_update_own ON driver_registrations FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table OR duplicate_object OR undefined_column THEN NULL;
END $$;

-- Admin override: super_admin and admin can access all rows
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'messages', 'support_messages', 'reviews', 'addresses',
    'service_bookings', 'doctor_bookings', 'prescription_requests',
    'delivery_requests', 'user_coupons', 'referral_codes',
    'analytics_events', 'driver_registrations'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      BEGIN
        EXECUTE format(
          'CREATE POLICY %I ON %I FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'', ''super_admin''))
          )',
          tbl || '_admin_full_access',
          tbl
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;
