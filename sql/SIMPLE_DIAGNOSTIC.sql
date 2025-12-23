-- ============================================
-- 🔍 SIMPLE DIAGNOSTIC: Check Student Data
-- ============================================
-- Run this first to see what's actually in the database

-- Check how many students exist
SELECT 
    'Total students' as metric,
    COUNT(*) as count
FROM public.students;

-- Show all students with their grade and section
SELECT 
    s.id,
    u.name,
    u.email,
    s.grade,
    s.section,
    s.attendance_status
FROM public.students s
JOIN public.users u ON s.user_id = u.id
ORDER BY s.id
LIMIT 20;

-- Check for students with grade = 0 or NULL
SELECT 
    'Students with grade = 0' as issue,
    COUNT(*) as count
FROM public.students
WHERE grade = 0;

SELECT 
    'Students with grade IS NULL' as issue,
    COUNT(*) as count
FROM public.students
WHERE grade IS NULL;

-- Check for students with empty section
SELECT 
    'Students with empty section' as issue,
    COUNT(*) as count
FROM public.students
WHERE section = '' OR section IS NULL;
