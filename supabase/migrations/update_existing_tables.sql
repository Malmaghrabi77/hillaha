-- Ensure profiles table has required columns for drivers and managers
-- Add columns if they don't exist (safe to run multiple times)

-- Add phone column if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add rating column if not exists (for drivers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

-- Add completed_orders column if not exists (for drivers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;

-- Add total_earnings column if not exists (for drivers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;

-- Create index on role for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ===== PARTNERS TABLE UPDATES =====

-- Ensure partners table has required columns
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- Create indexes for partners
CREATE INDEX IF NOT EXISTS idx_partners_is_open ON partners(is_open);

-- ===== ORDERS TABLE UPDATES =====

-- Ensure orders table has required columns
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS partner_id UUID;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled'));

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add foreign key constraint if it doesn't exist
ALTER TABLE orders
ADD CONSTRAINT fk_orders_partner_id
FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
ON CONFLICT DO NOTHING;

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_partner_id ON orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ===== VERIFICATION QUERIES =====
-- Run these to verify all columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name='profiles';
-- SELECT column_name FROM information_schema.columns WHERE table_name='partners';
-- SELECT column_name FROM information_schema.columns WHERE table_name='orders';
