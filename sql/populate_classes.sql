-- ============================================
-- Populate Classes - Nigerian School System
-- Complete structure from Pre-Nursery to SSS 3
-- ============================================

-- Clear existing classes (optional - comment out if you want to keep existing data)
-- DELETE FROM classes;

-- ============================================
-- EARLY YEARS
-- ============================================

-- Pre-Nursery (Playgroup)
INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
('PreNursery-A', 'General', 0, 'A', 'Early Years', 0),
('PreNursery-B', 'General', 0, 'B', 'Early Years', 0),

-- Nursery 1
('Nursery1-A', 'General', 1, 'A', 'Early Years', 0),
('Nursery1-B', 'General', 1, 'B', 'Early Years', 0),

-- Nursery 2
('Nursery2-A', 'General', 2, 'A', 'Early Years', 0),
('Nursery2-B', 'General', 2, 'B', 'Early Years', 0),

-- ============================================
-- PRIMARY (BASIC 1-6)
-- ============================================

-- Basic 1
('Basic1-A', 'General', 3, 'A', 'Primary', 0),
('Basic1-B', 'General', 3, 'B', 'Primary', 0),
('Basic1-C', 'General', 3, 'C', 'Primary', 0),

-- Basic 2
('Basic2-A', 'General', 4, 'A', 'Primary', 0),
('Basic2-B', 'General', 4, 'B', 'Primary', 0),
('Basic2-C', 'General', 4, 'C', 'Primary', 0),

-- Basic 3
('Basic3-A', 'General', 5, 'A', 'Primary', 0),
('Basic3-B', 'General', 5, 'B', 'Primary', 0),
('Basic3-C', 'General', 5, 'C', 'Primary', 0),

-- Basic 4
('Basic4-A', 'General', 6, 'A', 'Primary', 0),
('Basic4-B', 'General', 6, 'B', 'Primary', 0),
('Basic4-C', 'General', 6, 'C', 'Primary', 0),

-- Basic 5
('Basic5-A', 'General', 7, 'A', 'Primary', 0),
('Basic5-B', 'General', 7, 'B', 'Primary', 0),
('Basic5-C', 'General', 7, 'C', 'Primary', 0),

-- Basic 6
('Basic6-A', 'General', 8, 'A', 'Primary', 0),
('Basic6-B', 'General', 8, 'B', 'Primary', 0),
('Basic6-C', 'General', 8, 'C', 'Primary', 0),

-- ============================================
-- JUNIOR SECONDARY SCHOOL (JSS 1-3)
-- ============================================

-- JSS 1 (Grade 9)
('JSS1-A', 'General', 9, 'A', 'Junior Secondary', 0),
('JSS1-B', 'General', 9, 'B', 'Junior Secondary', 0),
('JSS1-C', 'General', 9, 'C', 'Junior Secondary', 0),

-- JSS 2 (Grade 10)
('JSS2-A', 'General', 10, 'A', 'Junior Secondary', 0),
('JSS2-B', 'General', 10, 'B', 'Junior Secondary', 0),
('JSS2-C', 'General', 10, 'C', 'Junior Secondary', 0),

-- JSS 3 (Grade 11)
('JSS3-A', 'General', 11, 'A', 'Junior Secondary', 0),
('JSS3-B', 'General', 11, 'B', 'Junior Secondary', 0),
('JSS3-C', 'General', 11, 'C', 'Junior Secondary', 0),

-- ============================================
-- SENIOR SECONDARY SCHOOL (SSS 1-3)
-- With Science, Arts, and Commercial Departments
-- ============================================

-- SSS 1 (Grade 12) - Science
('SSS1-A-Science', 'Science', 12, 'A', 'Science', 0),
('SSS1-B-Science', 'Science', 12, 'B', 'Science', 0),
('SSS1-C-Science', 'Science', 12, 'C', 'Science', 0),

-- SSS 1 (Grade 12) - Arts
('SSS1-A-Arts', 'Arts', 12, 'A', 'Arts', 0),
('SSS1-B-Arts', 'Arts', 12, 'B', 'Arts', 0),
('SSS1-C-Arts', 'Arts', 12, 'C', 'Arts', 0),

-- SSS 1 (Grade 12) - Commercial
('SSS1-A-Commercial', 'Commercial', 12, 'A', 'Commercial', 0),
('SSS1-B-Commercial', 'Commercial', 12, 'B', 'Commercial', 0),
('SSS1-C-Commercial', 'Commercial', 12, 'C', 'Commercial', 0),

-- SSS 2 (Grade 13) - Science
('SSS2-A-Science', 'Science', 13, 'A', 'Science', 0),
('SSS2-B-Science', 'Science', 13, 'B', 'Science', 0),
('SSS2-C-Science', 'Science', 13, 'C', 'Science', 0),

-- SSS 2 (Grade 13) - Arts
('SSS2-A-Arts', 'Arts', 13, 'A', 'Arts', 0),
('SSS2-B-Arts', 'Arts', 13, 'B', 'Arts', 0),
('SSS2-C-Arts', 'Arts', 13, 'C', 'Arts', 0),

-- SSS 2 (Grade 13) - Commercial
('SSS2-A-Commercial', 'Commercial', 13, 'A', 'Commercial', 0),
('SSS2-B-Commercial', 'Commercial', 13, 'B', 'Commercial', 0),
('SSS2-C-Commercial', 'Commercial', 13, 'C', 'Commercial', 0),

-- SSS 3 (Grade 14) - Science
('SSS3-A-Science', 'Science', 14, 'A', 'Science', 0),
('SSS3-B-Science', 'Science', 14, 'B', 'Science', 0),
('SSS3-C-Science', 'Science', 14, 'C', 'Science', 0),

-- SSS 3 (Grade 14) - Arts
('SSS3-A-Arts', 'Arts', 14, 'A', 'Arts', 0),
('SSS3-B-Arts', 'Arts', 14, 'B', 'Arts', 0),
('SSS3-C-Arts', 'Arts', 14, 'C', 'Arts', 0),

-- SSS 3 (Grade 14) - Commercial
('SSS3-A-Commercial', 'Commercial', 14, 'A', 'Commercial', 0),
('SSS3-B-Commercial', 'Commercial', 14, 'B', 'Commercial', 0),
('SSS3-C-Commercial', 'Commercial', 14, 'C', 'Commercial', 0)

ON CONFLICT (id) DO NOTHING;

-- Update student counts based on existing students
UPDATE classes c
SET student_count = (
    SELECT COUNT(*)
    FROM students s
    WHERE s.grade = c.grade 
    AND s.section = c.section
    AND (c.department IS NULL OR s.department = c.department)
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all classes by level
SELECT 
    CASE 
        WHEN grade = 0 THEN 'Pre-Nursery'
        WHEN grade = 1 THEN 'Nursery 1'
        WHEN grade = 2 THEN 'Nursery 2'
        WHEN grade = 3 THEN 'Basic 1'
        WHEN grade = 4 THEN 'Basic 2'
        WHEN grade = 5 THEN 'Basic 3'
        WHEN grade = 6 THEN 'Basic 4'
        WHEN grade = 7 THEN 'Basic 5'
        WHEN grade = 8 THEN 'Basic 6'
        WHEN grade = 9 THEN 'JSS 1'
        WHEN grade = 10 THEN 'JSS 2'
        WHEN grade = 11 THEN 'JSS 3'
        WHEN grade = 12 THEN 'SSS 1'
        WHEN grade = 13 THEN 'SSS 2'
        WHEN grade = 14 THEN 'SSS 3'
    END as level,
    section,
    subject,
    department,
    student_count
FROM classes 
ORDER BY grade, section, subject;

-- Count classes by level
SELECT 
    CASE 
        WHEN department = 'Early Years' THEN 'Early Years'
        WHEN department = 'Primary' THEN 'Primary (Basic 1-6)'
        WHEN department = 'Junior Secondary' THEN 'Junior Secondary (JSS 1-3)'
        WHEN department IN ('Science', 'Arts', 'Commercial') THEN 'Senior Secondary (SSS 1-3)'
    END as school_level,
    COUNT(*) as class_count
FROM classes 
GROUP BY school_level
ORDER BY MIN(grade);

-- Total count
SELECT COUNT(*) as total_classes FROM classes;

-- Summary
SELECT 
    'Early Years (Pre-Nursery to Nursery 2)' as level, 
    COUNT(*) as classes 
FROM classes 
WHERE department = 'Early Years'
UNION ALL
SELECT 
    'Primary (Basic 1-6)' as level, 
    COUNT(*) as classes 
FROM classes 
WHERE department = 'Primary'
UNION ALL
SELECT 
    'Junior Secondary (JSS 1-3)' as level, 
    COUNT(*) as classes 
FROM classes 
WHERE department = 'Junior Secondary'
UNION ALL
SELECT 
    'Senior Secondary (SSS 1-3)' as level, 
    COUNT(*) as classes 
FROM classes 
WHERE department IN ('Science', 'Arts', 'Commercial');
