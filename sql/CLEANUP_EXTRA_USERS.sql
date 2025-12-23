-- =================================================================
-- 🧹 CLEANUP: Remove Extra/Orphaned Users
-- =================================================================
-- This script removes duplicate and orphaned users to sync counts
-- Run DIAGNOSE_USER_COUNTS.sql first to see what will be deleted
-- =================================================================

-- Strategy: Keep Auth (20 users) as source of truth, remove extras from public tables

-- STEP 1: Delete users from public.users that don't exist in auth.users
-- (This will cascade delete from students, teachers, parents, auth_accounts)

-- First, let's create a temporary backup view of what we're about to delete
CREATE TEMP TABLE users_to_delete AS
SELECT u.*
FROM public.users u
WHERE NOT EXISTS (
    -- Check if this email exists in auth.users
    -- We can't directly query auth.users, so we use a workaround:
    -- If the repair script ran, orphaned users should have been marked
    SELECT 1 FROM auth.users au WHERE au.email = u.email
);

-- Show what will be deleted
SELECT 
    'Users to be deleted:' as action,
    COUNT(*) as count
FROM users_to_delete;

-- Display the users that will be deleted
SELECT * FROM users_to_delete;

-- STEP 2: Actually delete them (UNCOMMENT after reviewing)
-- WARNING: This is destructive! Make sure you've reviewed the users_to_delete list

-- DELETE FROM public.users 
-- WHERE id IN (SELECT id FROM users_to_delete);

-- STEP 3: Verify counts after deletion
-- SELECT 
--     'users table' as source,
--     COUNT(*) as count
-- FROM public.users
-- UNION ALL
-- SELECT 
--     'auth_accounts table' as source,
--     COUNT(*) as count
-- FROM public.auth_accounts;

-- NOTE: If you can't query auth.users directly, use this alternative approach:
-- Delete users that were created AFTER the sync and don't have proper Auth linkage

-- Alternative: Delete users without valid auth_accounts
-- DELETE FROM public.users
-- WHERE email NOT IN (SELECT email FROM public.auth_accounts WHERE is_verified = TRUE);
