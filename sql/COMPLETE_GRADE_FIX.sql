-- ============================================
-- 🔧 COMPREHENSIVE FIX: STUDENT GRADE ASSIGNMENTS
-- ============================================
-- This script diagnoses and fixes student grade/section assignments
-- so they appear correctly in both "Manage Students" and "Student Reports"
-- ============================================

-- STEP 1: DIAGNOSIS - Check current state
-- ============================================
SELECT '📊 CURRENT STATE' as status;

SELECT 
    'Total students in database' as metric,
    COUNT(*) as value
FROM public.students;

SELECT 
    'Students with invalid grade (0 or NULL)' as metric,
    COUNT(*) as value
FROM public.students
WHERE grade = 0 OR grade IS NULL;

SELECT 
    'Students with missing section' as metric,
    COUNT(*) as value
FROM public.students
WHERE section IS NULL OR section = '';

-- Show all students with their current assignments
SELECT 
    s.id,
    s.user_id,
    u.name,
    u.email,
    s.grade,
    s.section,
    s.attendance_status,
    s.created_at
FROM public.students s
JOIN public.users u ON s.user_id = u.id
ORDER BY s.created_at, s.id;

-- ============================================
-- STEP 2: FIX - Assign proper grades and sections
-- ============================================
SELECT '🔧 APPLYING FIX' as status;

-- Update all students that have invalid or missing grade/section
-- Assign them to Grade 10, Section A by default
-- You can modify these values based on your needs
UPDATE public.students
SET 
    grade = 10,
    section = 'A'
WHERE grade = 0 
   OR grade IS NULL 
   OR section IS NULL 
   OR section = '';

-- ============================================
-- STEP 3: VERIFICATION - Check after fix
-- ============================================
SELECT '✅ VERIFICATION' as status;

-- Count students per grade and section
SELECT 
    'Distribution after fix:' as info,
    grade,
    section,
    COUNT(*) as student_count
FROM public.students
GROUP BY grade, section
ORDER BY 
    grade,
    section;

-- Show all students with their updated assignments
SELECT 
    s.id,
    u.name,
    s.grade,
    s.section,
    s.attendance_status
FROM public.students s
JOIN public.users u ON s.user_id = u.id
ORDER BY 
    s.grade,
    s.section,
    u.name;

-- ============================================
-- OPTIONAL: CUSTOM DISTRIBUTION
-- ============================================
-- If you want to distribute students across different grades,
-- uncomment and modify the sections below:

-- Example: Distribute students evenly across grades 8-12
/*
WITH numbered_students AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY id) as row_num,
        COUNT(*) OVER () as total_count
    FROM public.students
)
UPDATE public.students s
SET 
    grade = CASE 
        WHEN ns.row_num <= ns.total_count / 5 THEN 8
        WHEN ns.row_num <= ns.total_count * 2 / 5 THEN 9
        WHEN ns.row_num <= ns.total_count * 3 / 5 THEN 10
        WHEN ns.row_num <= ns.total_count * 4 / 5 THEN 11
        ELSE 12
    END,
    section = CASE 
        WHEN (ns.row_num % 3) = 1 THEN 'A'
        WHEN (ns.row_num % 3) = 2 THEN 'B'
        ELSE 'C'
    END
FROM numbered_students ns
WHERE s.id = ns.id;
*/

-- ============================================
-- FINAL STATUS
-- ============================================
SELECT 
    '✅ FIX COMPLETE!' as status,
    'All students now have grade and section assignments' as message;

SELECT 
    'Total students: ' || COUNT(*) as summary
FROM public.students;

SELECT 
    'Grade ' || grade || section || ': ' || COUNT(*) || ' students' as class_summary
FROM public.students
GROUP BY grade, section
ORDER BY grade, section;

-- ============================================
-- NEXT STEPS
-- ============================================
-- After running this script:
-- 1. Go to "Manage Students" - you should see students organized by grade/section
-- 2. Go to "Student Reports" - click on the grade card and you should see students
-- 3. If you want custom distribution, uncomment the OPTIONAL section above and re-run
