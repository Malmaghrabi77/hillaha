-- ============================================================
-- Inventory, Staff Management & Enhanced Notifications
-- ============================================================
-- This migration adds:
-- 1. Inventory Management System
-- 2. Staff/Employee Management System
-- 3. Enhanced Notifications System
-- Created: 2026-02-27

-- ============================================================
-- PART 1: INVENTORY MANAGEMENT TABLES
-- ============================================================

-- Inventory items/products (raw materials or stock items)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT NOT NULL,
  unit_type TEXT DEFAULT 'piece' CHECK (unit_type IN ('piece', 'kg', 'liter', 'box', 'pack', 'gram')),
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) DEFAULT 10,
  maximum_stock DECIMAL(10,2) DEFAULT 100,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  category TEXT,
  supplier_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(partner_id, sku)
);

-- Inventory transactions (stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'waste', 'adjustment', 'return')),
  quantity DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock alerts when inventory reaches minimum levels
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PART 2: STAFF/EMPLOYEE MANAGEMENT TABLES
-- ============================================================

-- Staff/Employees table
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT NOT NULL,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
  salary_type TEXT CHECK (salary_type IN ('hourly', 'daily', 'monthly')),
  base_salary DECIMAL(10,2),
  hire_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  permissions JSONB DEFAULT '[]', -- Array of permissions this staff member has
  is_manager BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff attendance tracking
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, attendance_date)
);

-- Staff schedules/shifts
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, day_of_week)
);

-- Staff roles/positions with specific permissions
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission keys
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(partner_id, role_name)
);

-- Staff performance records
CREATE TABLE IF NOT EXISTS staff_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  rating_month DATE NOT NULL,
  performance_score DECIMAL(3,2),
  attendance_score DECIMAL(3,2),
  quality_score DECIMAL(3,2),
  feedback TEXT,
  reviewer_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, rating_month)
);

-- ============================================================
-- PART 3: ENHANCED NOTIFICATIONS SYSTEM
-- ============================================================

-- Notifications table (core notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'payment', 'inventory', 'staff', 'system', 'message', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data like order_id, staff_id, etc.
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Notification delivery tracking
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('in_app', 'email', 'push', 'sms')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_partner_id ON inventory_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(partner_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_partner_id ON inventory_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_partner_id ON inventory_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item_id ON inventory_alerts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_resolved ON inventory_alerts(is_resolved);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_staff_partner_id ON staff(partner_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_position ON staff(position);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status ON staff_attendance(status);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_day ON staff_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_roles_partner_id ON staff_roles(partner_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_rating_month ON staff_performance(rating_month);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);

-- ============================================================
-- PART 5: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 6: CREATE RLS POLICIES
-- ============================================================

-- Inventory policies
DROP POLICY IF EXISTS "partners_view_own_inventory" ON inventory_items;
CREATE POLICY "partners_view_own_inventory"
  ON inventory_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = inventory_items.partner_id
      AND p.id IN (
        SELECT partner_id FROM admin_assignments
        WHERE admin_id = auth.uid()
        UNION
        SELECT id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    )
  );

-- Staff policies
DROP POLICY IF EXISTS "partners_view_own_staff" ON staff;
CREATE POLICY "partners_view_own_staff"
  ON staff FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = staff.partner_id
      AND p.id IN (
        SELECT partner_id FROM admin_assignments
        WHERE admin_id = auth.uid()
        UNION
        SELECT id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
      )
    )
  );

-- Notification policies - users can only see their own notifications
DROP POLICY IF EXISTS "users_view_own_notifications" ON notifications;
CREATE POLICY "users_view_own_notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_notification_preferences" ON notification_preferences;
CREATE POLICY "users_manage_notification_preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- PART 7: VERIFICATION QUERIES
-- ============================================================

-- تشغيل هذه الاستعلامات للتحقق من تطبيق الـ migration بنجاح:

-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('inventory_items', 'inventory_transactions', 'staff', 'staff_attendance', 'notifications', 'notification_preferences');

-- SELECT COUNT(*) as inventory_items_count FROM inventory_items;
-- SELECT COUNT(*) as staff_count FROM staff;
-- SELECT COUNT(*) as notifications_count FROM notifications;
