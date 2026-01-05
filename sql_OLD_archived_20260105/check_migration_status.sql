-- ============================================
-- CHECK MIGRATION STATUS
-- Run this to see what migrations have been applied
-- ============================================

-- Check which tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'students', 'teachers', 'parents') THEN '001 - Initial Setup'
    WHEN table_name IN ('verification_codes', 'id_verification_requests', 'verification_audit_log') THEN '003 - Verification (Week 2)'
    WHEN table_name IN ('notifications') THEN '004 - Notifications (Week 3)'
    WHEN table_name IN ('messaging_channels', 'channel_members', 'channel_messages', 'message_delivery', 'message_read_receipts') THEN '005 - Messaging (Week 4)'
    WHEN table_name IN ('attendance_analytics', 'attendance_statistics', 'dropout_alerts', 'qr_scan_logs', 'bulk_attendance_batches') THEN '006 - Attendance (Week 5)'
    ELSE 'Other'
  END as migration_group
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if specific columns exist (indicates migration applied)
SELECT 
  column_name,
  table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('phone', 'phone_verified', 'fcm_token', 'notification_preferences')) OR
    (table_name = 'students' AND column_name IN ('qr_code', 'qr_code_generated_at'))
  )
ORDER BY table_name, column_name;

-- Summary
SELECT 
  'Migration Status Summary' as info,
  COUNT(CASE WHEN table_name IN ('verification_codes', 'id_verification_requests') THEN 1 END) > 0 as week2_verification_applied,
  COUNT(CASE WHEN table_name = 'notifications' THEN 1 END) > 0 as week3_notifications_applied,
  COUNT(CASE WHEN table_name IN ('messaging_channels', 'channel_members') THEN 1 END) > 0 as week4_messaging_applied,
  COUNT(CASE WHEN table_name IN ('attendance_analytics', 'dropout_alerts') THEN 1 END) > 0 as week5_attendance_applied
FROM information_schema.tables 
WHERE table_schema = 'public';
