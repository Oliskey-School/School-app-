-- Check if the new user was created at all
SELECT 'oliskeylee@gmail.com in users?' as check_type, COUNT(*) as found
FROM public.users
WHERE email = 'oliskeylee@gmail.com'

UNION ALL

SELECT 'oliskeylee@gmail.com in auth_accounts?', COUNT(*)
FROM public.auth_accounts
WHERE email = 'oliskeylee@gmail.com'

UNION ALL

SELECT 'oliskeylee@gmail.com in parents?', COUNT(*)
FROM public.parents
WHERE email = 'oliskeylee@gmail.com';

-- Check total counts
SELECT 'Total users' as info, COUNT(*) FROM public.users
UNION ALL
SELECT 'Total auth_accounts', COUNT(*) FROM public.auth_accounts
UNION ALL
SELECT 'Total parents', COUNT(*) FROM public.parents;

-- Show the most recent user creation
SELECT 
    u.email,
    u.name,
    u.role,
    u.created_at,
    'Most recent user' as info
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 5;
