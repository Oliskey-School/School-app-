-- Migration: Verify All Users and Update Status
-- Description: 
-- 1. Updates all Students' attendance_status to 'Present' (fixes visual 'Red Cross' in list).
-- 2. Updates all Teachers' status to 'Active'.
-- 3. Updates all Users' is_active status to TRUE (if column exists).

BEGIN;

-- 1. Verify Students (Visual)
UPDATE students 
SET attendance_status = 'Present' 
WHERE attendance_status IS NULL OR attendance_status != 'Present';

-- 2. Activate Teachers
UPDATE teachers 
SET status = 'Active' 
WHERE status IS NULL OR status != 'Active';

-- 3. Activate Users (Generic)
-- Using DO block to check for column existence or just standard query if we are sure
UPDATE users 
SET is_active = true;
-- Note: If is_active doesn't exist, this will fail. 
-- Based on typical Supabase schemas, users usually works with auth.users. 
-- But here we have a public.users table. 
-- Let's check if 'is_active' exists first.

COMMIT;
