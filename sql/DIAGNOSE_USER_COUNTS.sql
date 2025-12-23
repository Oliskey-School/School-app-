-- =================================================================
-- 🔍 DIAGNOSTIC: User Count Mismatch Analysis
-- =================================================================
-- Run this in Supabase SQL Editor to diagnose the count difference
-- =================================================================

-- 1. Show current counts
SELECT 
    'users table' as source,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT 
    'auth_accounts table' as source,
    COUNT(*) as count
FROM public.auth_accounts

UNION ALL

SELECT 
    'students table' as source,
    COUNT(*) as count
FROM public.students

UNION ALL

SELECT 
    'teachers table' as source,
    COUNT(*) as count
FROM public.teachers

UNION ALL

SELECT 
    'parents table' as source,
    COUNT(*) as count
FROM public.parents;

-- 2. Check for duplicate emails in users table
SELECT 
    email,
    COUNT(*) as occurrences
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Find users without matching auth_accounts
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    'NO AUTH ACCOUNT' as issue
FROM public.users u
LEFT JOIN public.auth_accounts aa ON u.email = aa.email
WHERE aa.email IS NULL
ORDER BY u.created_at DESC;

-- 4. Find auth_accounts without matching users
SELECT 
    aa.id,
    aa.email,
    aa.username,
    aa.user_type,
    aa.user_id,
    'NO USER RECORD' as issue
FROM public.auth_accounts aa
LEFT JOIN public.users u ON aa.email = u.email
WHERE u.email IS NULL;

-- 5. Find users with mismatched user_id in auth_accounts
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.role,
    aa.user_id as auth_account_user_id,
    'USER_ID MISMATCH' as issue
FROM public.users u
INNER JOIN public.auth_accounts aa ON u.email = aa.email
WHERE u.id != aa.user_id;

-- 6. Show role breakdown
SELECT 
    role,
    COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY count DESC;

-- 7. List all users (for manual review)
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    CASE 
        WHEN aa.email IS NULL THEN '❌ No Auth Account'
        WHEN u.id != aa.user_id THEN '⚠️ User ID Mismatch'
        ELSE '✅ OK'
    END as status
FROM public.users u
LEFT JOIN public.auth_accounts aa ON u.email = aa.email
ORDER BY u.created_at DESC;
