-- ============================================
-- CHECK STUDENT GRADES AND SECTIONS
-- ============================================
-- This script checks if students have proper grade and section assignments

-- 1. Check all students with their grade and section
SELECT 
    s.id,
    u.name,
    u.email,
    s.grade,
    s.section,
    s.status
FROM public.students s
JOIN public.users u ON s.user_id = u.id
ORDER BY s.grade, s.section, u.name;

-- 2. Count students per grade
SELECT 
    grade,
    COUNT(*) as student_count
FROM public.students
GROUP BY grade
ORDER BY grade;

-- 3. Count students per grade and section
SELECT 
    grade,
    section,
    COUNT(*) as student_count
FROM public.students
GROUP BY grade, section
ORDER BY grade, section;

-- 4. Find students with NULL or empty grade/section
SELECT 
    s.id,
    u.name,
    u.email,
    s.grade,
    s.section
FROM public.students s
JOIN public.users u ON s.user_id = u.id
WHERE s.grade IS NULL 
   OR s.section IS NULL 
   OR s.grade = '' 
   OR s.section = '';
