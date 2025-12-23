-- =================================================================
-- 🔍 ACTUAL STATE CHECK
-- =================================================================
-- Let's see exactly what we have and why counts don't match
-- =================================================================

-- 1. Count everything
SELECT 'Users in public.users' as what, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Auth accounts', COUNT(*) FROM public.auth_accounts
UNION ALL
SELECT 'Students', COUNT(*) FROM public.students  
UNION ALL
SELECT 'Teachers', COUNT(*) FROM public.teachers
UNION ALL
SELECT 'Parents', COUNT(*) FROM public.parents;

-- 2. Show ALL users with their details
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    aa.is_verified,
    aa.user_id as auth_user_id,
    CASE 
        WHEN u.id = aa.user_id AND aa.is_verified THEN '✅ Valid'
        WHEN aa.email IS NULL THEN '❌ No Auth'
        WHEN u.id != aa.user_id THEN '⚠️ ID Mismatch'
        WHEN NOT aa.is_verified THEN '⚠️ Not Verified'
        ELSE '❓ Unknown'
    END as status
FROM public.users u
LEFT JOIN public.auth_accounts aa ON u.email = aa.email
ORDER BY u.role, u.email;

-- 3. The REAL issue: Check if we have more than 20 in Auth too
-- We need to count actual auth.users, but we can't query it directly
-- So let's count users by email domain to spot test accounts

SELECT 
    CASE 
        WHEN email LIKE '%@student.school.com' THEN 'Students'
        WHEN email LIKE '%@school.com' THEN 'Staff'
        WHEN email LIKE '%@parent.school.com' THEN 'Parents'
        WHEN email LIKE '%@example.com' THEN 'Test/Example'
        ELSE 'Other'
    END as type,
    COUNT(*) as count
FROM public.users
GROUP BY type
ORDER BY count DESC;
