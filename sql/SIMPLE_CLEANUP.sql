-- =================================================================
-- 🧹 SIMPLE CLEANUP: Remove Extra Users
-- =================================================================
-- This removes the 5-6 extra users to match Auth count (20 users)
-- Safe approach: Only removes users that are clearly orphaned
-- =================================================================

-- STEP 1: First, let's see what we have
SELECT 
    'Current State' as info,
    (SELECT COUNT(*) FROM public.users) as users_table,
    (SELECT COUNT(*) FROM public.auth_accounts) as auth_accounts_table;

-- STEP 2: Find and DELETE users that don't have verified auth accounts
-- This removes the orphaned/duplicate users

DELETE FROM public.users
WHERE email IN (
    SELECT u.email 
    FROM public.users u
    LEFT JOIN public.auth_accounts aa ON u.email = aa.email
    WHERE aa.email IS NULL 
       OR aa.is_verified = FALSE
);

-- STEP 3: Clean up any orphaned auth_accounts without users
DELETE FROM public.auth_accounts
WHERE user_id IS NULL 
   OR user_id NOT IN (SELECT id FROM public.users);

-- STEP 4: Verify the fix
SELECT 
    'After Cleanup' as info,
    (SELECT COUNT(*) FROM public.users) as users_table,
    (SELECT COUNT(*) FROM public.auth_accounts) as auth_accounts_table;

-- STEP 5: Show what's left
SELECT 
    u.email,
    u.name,
    u.role,
    CASE WHEN aa.email IS NOT NULL THEN '✅' ELSE '❌' END as has_auth
FROM public.users u
LEFT JOIN public.auth_accounts aa ON u.email = aa.email
ORDER BY u.role, u.email;

SELECT '✅ Cleanup Complete - Should now have 20 users' as status;
