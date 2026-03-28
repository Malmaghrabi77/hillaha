-- Migration: Update default commission rate to 15% (drops to 12% after 1000 orders/month)
-- Previous: 10% base, 8% after target

ALTER TABLE public.partners
  ALTER COLUMN commission_rate SET DEFAULT 0.15;

ALTER TABLE public.orders
  ALTER COLUMN commission_rate SET DEFAULT 0.15;

-- Update existing partners still on old 10% default to new 15%
UPDATE public.partners
  SET commission_rate = 0.15
  WHERE commission_rate = 0.10;
