# Database Migration Guide

## Migration Order

Run migrations in this exact order:

### Already Applied (if you've set up the database before):
1. ~~`001_create_profiles.sql`~~ (Creates profiles table and trigger)
2. ~~`002_enable_rls_policies.sql`~~ (RLS policies for existing tables)

### New Migrations to Apply:

**Week 2 - Authentication:**
```sql
-- In Supabase SQL Editor
-- Run: sql/003_add_verification.sql
```

**Week 3 - Notifications:**
```sql
-- Run: sql/004_notification_system.sql
```

**Week 4 - Messaging:**
```sql
-- Run: sql/005_messaging_channels.sql
```

**Week 5 - Attendance:**
```sql
-- Run: sql/006_enhanced_attendance.sql
```

## If You Get "Already Exists" Errors

If you see errors like:
- `trigger "..." already exists`
- `table "..." already exists`
- `function "..." already exists`

**Solution 1: Skip that specific statement**
- Comment out or skip the line causing the error
- The object already exists, which is fine

**Solution 2: Add IF NOT EXISTS (recommended for future)**
For triggers, use:
```sql
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...
```

## Current Status Check

Run this to see what tables you have:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables after all migrations:
- `profiles`
- `students`, `teachers`, `parents`, `users`
- `verification_codes`
- `id_verification_requests`
- `verification_audit_log`
- `notifications`
- `messaging_channels`
- `channel_members`
- `channel_messages`
- `message_delivery`
- `message_read_receipts`
- `attendance_analytics`
- `attendance_statistics`
- `dropout_alerts`
- `qr_scan_logs`
- `bulk_attendance_batches`

## Quick Fix for Your Current Error

Since the trigger already exists from migration 001, you can safely skip it. The migrations 003-006 don't try to recreate that trigger, so you should be able to run them without issue.

**Which file are you running that gave the error?** 

If it's one of the new files (003-006), they shouldn't be trying to create that trigger. Let me know which migration file you're running and I'll fix it.
