-- Check auth_accounts vs users count mismatch
SELECT 'auth_accounts' as table_name, COUNT(*) as count
FROM public.auth_accounts
UNION ALL
SELECT 'users', COUNT(*)
FROM public.users;

-- Show which auth_accounts don't have matching users
SELECT 
    aa.id,
    aa.email,
    aa.username,
    aa.user_type,
    aa.user_id,
    u.id as actual_user_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ ORPHANED - No user exists'
        WHEN aa.user_id != u.id THEN '⚠️ WRONG user_id'
        ELSE '✅ Valid'
    END as status
FROM public.auth_accounts aa
LEFT JOIN public.users u ON aa.email = u.email
ORDER BY status, aa.email;

-- Delete orphaned auth_accounts
DELETE FROM public.auth_accounts
WHERE email NOT IN (SELECT email FROM public.users);

-- Verify
SELECT 'After cleanup' as info, COUNT(*) as count
FROM public.auth_accounts;
