-- =================================================================
-- 🎯 TARGETED CLEANUP: Remove 5 Orphaned Users
-- =================================================================
-- Removes users that exist in public tables but NOT in Supabase Auth
-- =================================================================

-- STEP 1: Find the most recently created users (likely the orphans)
-- These are probably test users or failed signups
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 10;

-- STEP 2: The safest approach - Delete users created AFTER your initial data
-- Assuming your original 20 users were created first, 
-- the newest 5 are the orphans

-- First, let's see dates
SELECT 
    'Oldest user' as info,
    MIN(created_at) as date
FROM public.users
UNION ALL
SELECT 
    'Newest user',
    MAX(created_at)
FROM public.users;

-- STEP 3: Delete the 5 newest users (the ones NOT in Auth)
-- Adjust the date threshold based on what you see above

-- OPTION A: Delete by specific emails (SAFEST - manually review first)
-- Uncomment and add the 5 emails you want to remove:
/*
DELETE FROM public.users WHERE email IN (
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
    'user4@example.com',
    'user5@example.com'
);
*/

-- OPTION B: Delete the 5 newest users automatically
-- Use this if you're confident the newest 5 are the orphans
DELETE FROM public.users 
WHERE id IN (
    SELECT id 
    FROM public.users 
    ORDER BY created_at DESC 
    LIMIT 5
);

-- STEP 4: Verify we now have 20 users
SELECT 
    'After cleanup' as info,
    COUNT(*) as total_users,
    SUM(CASE WHEN role = 'Student' THEN 1 ELSE 0 END) as students,
    SUM(CASE WHEN role IN ('Teacher', 'Admin') THEN 1 ELSE 0 END) as staff,
    SUM(CASE WHEN role = 'Parent' THEN 1 ELSE 0 END) as parents
FROM public.users;

SELECT '✅ Should now have 20 users total' as status;
