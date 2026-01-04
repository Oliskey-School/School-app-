-- FORCE CLEANUP TRIGGERS & USERS
-- Run this in Supabase SQL Editor
-- This will fix the "Database error loading user" and allow you to start fresh.

BEGIN;

-- 1. Disable triggers temporarily to avoid errors during deletion
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- 2. Delete the broken demo users by ID or Email
-- These are the UUIDs from our previous script
DELETE FROM auth.users WHERE email IN (
    'admin@demo.com',
    'teacher@demo.com',
    'parent@demo.com',
    'student@demo.com'
);

-- Also try deleting by the UUIDs we hardcoded, just in case
DELETE FROM auth.users WHERE id IN (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004'
);

-- 3. Re-enable triggers
ALTER TABLE auth.users ENABLE TRIGGER ALL;

COMMIT;

SELECT '✅ Broken users deleted directly from database.' as status;
SELECT 'Now you can safely create them in the Dashboard!' as next_step;
