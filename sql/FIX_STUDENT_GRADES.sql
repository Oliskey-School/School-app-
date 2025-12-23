-- ============================================
-- FIX STUDENT GRADES AND SECTIONS
-- ============================================
-- This script assigns proper grade and section values to all students
-- Based on the image showing "Grade 10A" in Manage Students

-- STEP 1: Check current state
SELECT 
    COUNT(*) as total_students,
    COUNT(CASE WHEN grade IS NULL OR grade = '' THEN 1 END) as missing_grade,
    COUNT(CASE WHEN section IS NULL OR section = '' THEN 1 END) as missing_section
FROM public.students;

-- STEP 2: Show all students with their current grade/section
SELECT 
    s.id,
    u.name,
    u.email,
    s.grade,
    s.section,
    s.created_at
FROM public.students s
JOIN public.users u ON s.user_id = u.id
ORDER BY s.created_at;

-- STEP 3: Based on the screenshot showing "Grade 10A" with 19 students,
-- let's assign all students to Grade 10, Section A as a starting point
-- You can modify this after running to distribute students across different grades

UPDATE public.students
SET 
    grade = '10',
    section = 'A'
WHERE grade IS NULL OR grade = '' OR section IS NULL OR section = '';

-- STEP 4: Verify the update
SELECT 
    s.id,
    u.name,
    s.grade,
    s.section
FROM public.students s
JOIN public.users u ON s.user_id = u.id
ORDER BY s.grade, s.section, u.name;

-- STEP 5: Count students per grade and section
SELECT 
    grade,
    section,
    COUNT(*) as student_count
FROM public.students
GROUP BY grade, section
ORDER BY grade, section;

-- ============================================
-- OPTIONAL: Distribute students across grades
-- ============================================
-- If you want to spread students across different grades instead of all in 10A,
-- uncomment and modify the sections below:

-- Assign first 3 students to Grade 8A
-- UPDATE public.students
-- SET grade = '8', section = 'A'
-- WHERE id IN (SELECT id FROM public.students ORDER BY id LIMIT 3);

-- Assign next 3 students to Grade 9A
-- UPDATE public.students
-- SET grade = '9', section = 'A'
-- WHERE id IN (SELECT id FROM public.students ORDER BY id LIMIT 3 OFFSET 3);

-- Keep remaining in Grade 10A (already set above)

-- ============================================
-- NOTES
-- ============================================
-- After running this script:
-- 1. Go to the "Student Reports" screen
-- 2. You should see students appearing in their assigned grades
-- 3. The "Manage Students" screen will also reflect these grade assignments
