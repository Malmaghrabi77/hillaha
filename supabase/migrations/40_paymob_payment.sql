-- Migration 23: PayMob Payment Support
-- Adds payment_status tracking to orders

-- Add payment_status column to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paymob_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN paymob_order_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paymob_transaction_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN paymob_transaction_id TEXT;
  END IF;
END $$;

-- Index for PayMob order lookups
CREATE INDEX IF NOT EXISTS idx_orders_paymob_order_id ON orders (paymob_order_id) WHERE paymob_order_id IS NOT NULL;
