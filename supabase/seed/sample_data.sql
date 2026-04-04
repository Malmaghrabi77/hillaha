-- Sample Data for Testing (اختياري - للاختبار فقط)
-- تشغيل هذا الملف بعد إنشاء الجداول

-- ===== Sample Admin Assignments =====
-- (استبدل UUIDs بـ IDs الحقيقية من مشروعك)

-- INSERT INTO admin_assignments (admin_id, partner_id, status)
-- VALUES
--   ('admin-uuid-here', 'partner-uuid-1', 'active'),
--   ('admin-uuid-here', 'partner-uuid-2', 'active');

-- ===== Sample Admin Logs =====
-- INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
-- VALUES
--   ('admin-uuid-here', 'approved_partner', 'partner', 'partner-uuid-1', '{"reason": "documents verified"}'::jsonb),
--   ('admin-uuid-here', 'rejected_order', 'order', 'order-uuid-1', '{"reason": "payment issue"}'::jsonb),
--   ('admin-uuid-here', 'updated_driver', 'driver', 'driver-uuid-1', '{"field": "rating", "old_value": 4.5, "new_value": 4.8}'::jsonb);

-- ===== Sample Profiles (فقط للتعديل - إذا كانت الجداول موجودة) =====
-- UPDATE profiles
-- SET phone = '+966501234567', is_active = true
-- WHERE role = 'driver' AND id = 'driver-uuid-here';

-- ===== Sample Partners Data =====
-- INSERT INTO partners (name, email, phone, is_open)
-- VALUES
--   ('متاجر الأحلام', 'contact@dreams.com', '+966501111111', true),
--   ('سوبر ماركت النجم', 'info@alstar.com', '+966502222222', true),
--   ('كافيه الجودة', 'cafe@quality.com', '+966503333333', true);

-- ===== Sample Orders Data =====
-- INSERT INTO orders (customer_name, partner_id, total, status, created_at)
-- VALUES
--   ('محمد علي', 'partner-uuid-1', 150.00, 'delivered', NOW()),
--   ('فاطمة أحمد', 'partner-uuid-1', 200.50, 'pending', NOW() - INTERVAL '1 day'),
--   ('علي محمود', 'partner-uuid-2', 350.00, 'delivered', NOW() - INTERVAL '2 days'),
--   ('سارة خالد', 'partner-uuid-2', 175.75, 'cancelled', NOW() - INTERVAL '3 days');

-- ===== Sample Drivers Data =====
-- UPDATE profiles
-- SET
--   phone = '+966501234567',
--   rating = 4.5,
--   completed_orders = 120,
--   total_earnings = 5000.00,
--   is_active = true
-- WHERE role = 'driver' AND id = 'driver-uuid-here';

-- ===== التحقق من البيانات =====

-- عرض جميع admin assignments
-- SELECT
--   aa.id,
--   a.full_name as admin_name,
--   p.name as partner_name,
--   aa.status,
--   aa.assigned_at
-- FROM admin_assignments aa
-- JOIN profiles a ON aa.admin_id = a.id
-- JOIN partners p ON aa.partner_id = p.id
-- ORDER BY aa.assigned_at DESC;

-- عرض آخر الأنشطة الإدارية
-- SELECT
--   al.id,
--   p.full_name as admin_name,
--   al.action,
--   al.entity_type,
--   al.created_at,
--   al.details
-- FROM admin_logs al
-- JOIN profiles p ON al.admin_id = p.id
-- ORDER BY al.created_at DESC
-- LIMIT 20;

-- إحصائيات الشركاء
-- SELECT
--   p.name as partner_name,
--   COUNT(o.id) as order_count,
--   SUM(o.total) as total_revenue,
--   AVG(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivery_rate
-- FROM partners p
-- LEFT JOIN orders o ON p.id = o.partner_id
-- GROUP BY p.id, p.name;

-- إحصائيات المندوبين
-- SELECT
--   full_name,
--   phone,
--   rating,
--   completed_orders,
--   total_earnings,
--   is_active
-- FROM profiles
-- WHERE role = 'driver'
-- ORDER BY total_earnings DESC;

-- عرض المديرين الإقليميين والشركاء المسندة لهم
-- SELECT
--   admin.full_name as manager_name,
--   COUNT(aa.partner_id) as assigned_partners,
--   STRING_AGG(p.name, ', ') as partner_names
-- FROM profiles admin
-- LEFT JOIN admin_assignments aa ON admin.id = aa.admin_id AND aa.status = 'active'
-- LEFT JOIN partners p ON aa.partner_id = p.id
-- WHERE admin.role IN ('admin', 'regional_manager')
-- GROUP BY admin.id, admin.full_name
-- ORDER BY COUNT(aa.partner_id) DESC;

-- ===== ملاحظات مهمة =====
-- 1. استبدل جميع 'uuid-here' بـ UUIDs الحقيقية من مشروعك
-- 2. هذه البيانات للاختبار فقط - امسحها قبل الإنتاج
-- 3. تأكد من أن جميع الجداول موجودة قبل إدراج البيانات
-- 4. استخدم RETURNING * بعد INSERT للتحقق من النتائج
