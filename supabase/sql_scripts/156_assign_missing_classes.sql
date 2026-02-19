-- Fix Student Class Assignments
-- 1. Backfill grade/section for students who have a class_id but missing grade/section
-- 2. Backfill class_id for students who have grade/section but missing class_id
-- 3. Ensure all students have a valid class linkage

BEGIN;

-- 1. Update students who have a class_id but missing grade or section
-- (This fixes the 80 newly created students)
UPDATE students s
SET 
    grade = c.grade,
    section = c.section
FROM classes c
WHERE s.class_id = c.id
AND (s.grade IS NULL OR s.section IS NULL);

-- 2. Update students who have grade/section but missing class_id
-- We try to find a matching class. 
-- Note: 'classes' table uses 'grade' (integer) and 'section' (text).
UPDATE students s
SET 
    class_id = c.id,
    current_class_id = c.id
FROM classes c
WHERE s.class_id IS NULL
AND s.grade = c.grade
AND s.section = c.section
AND c.school_id = s.school_id;

-- 3. Verify Remaining Orphans
-- If there are still students with null class_id, we might need to assign them to a default class or leave them (but user wants them fixed).
-- Let's try to assign any lingering orphans to the first available class for their grade level (if section doesn't match).

WITH default_classes AS (
    SELECT DISTINCT ON (grade) grade, id
    FROM classes
    ORDER BY grade, section
)
UPDATE students s
SET 
    class_id = dc.id,
    current_class_id = dc.id
FROM default_classes dc
WHERE s.class_id IS NULL
AND s.grade = dc.grade;

COMMIT;

-- Verification Query (Uncomment to test manually)
-- SELECT count(*) as orphans FROM students WHERE class_id IS NULL;
-- SELECT count(*) as null_grades FROM students WHERE grade IS NULL;
