-- Create admin_assignments table for regional manager partner assignments
CREATE TABLE IF NOT EXISTS admin_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: each admin can only be assigned to a partner once
  UNIQUE(admin_id, partner_id)
);

-- Create index for faster queries
CREATE INDEX idx_admin_assignments_admin_id ON admin_assignments(admin_id);
CREATE INDEX idx_admin_assignments_partner_id ON admin_assignments(partner_id);
CREATE INDEX idx_admin_assignments_status ON admin_assignments(status);

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_entity_type ON admin_logs(entity_type);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view their own assignments
CREATE POLICY "admins_view_own_assignments"
  ON admin_assignments FOR SELECT
  USING (admin_id = auth.uid());

-- RLS Policy: Super admins can view all assignments
CREATE POLICY "super_admin_view_all_assignments"
  ON admin_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Super admins can manage assignments
CREATE POLICY "super_admin_manage_assignments"
  ON admin_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Admins can view their own logs
CREATE POLICY "admins_view_own_logs"
  ON admin_logs FOR SELECT
  USING (admin_id = auth.uid());

-- RLS Policy: Super admins can view all logs
CREATE POLICY "super_admin_view_all_logs"
  ON admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Super admins can create logs
CREATE POLICY "super_admin_create_logs"
  ON admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
