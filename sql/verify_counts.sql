-- Quick verification query to check counts in tables
-- Run this in Supabase SQL Editor to verify your data

SELECT 
    'students' as table_name,
    COUNT(*) as total_count
FROM students

UNION ALL

SELECT 
    'teachers' as table_name,
    COUNT(*) as total_count
FROM teachers

UNION ALL

SELECT 
    'parents' as table_name,
    COUNT(*) as total_count
FROM parents

UNION ALL

SELECT 
    'users' as table_name,
    COUNT(*) as total_count
FROM users

UNION ALL

SELECT 
    'auth_accounts' as table_name,
    COUNT(*) as total_count
FROM auth_accounts;
