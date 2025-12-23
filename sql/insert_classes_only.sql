-- ============================================
-- QUICK CHECK: Verify Classes Exist
-- Run this in Supabase SQL Editor
-- ============================================

-- Check if classes table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'classes'
) as classes_table_exists;

-- Count classes
SELECT COUNT(*) as total_classes FROM classes;

-- Show first 10 classes
SELECT * FROM classes LIMIT 10;

-- If count is 0, run the insert below:
-- ============================================
-- INSERT CLASSES (Run this if count is 0)
-- ============================================

INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
-- EARLY YEARS
('PreNursery-A', 'General', 0, 'A', 'Early Years', 0),
('PreNursery-B', 'General', 0, 'B', 'Early Years', 0),
('Nursery1-A', 'General', 1, 'A', 'Early Years', 0),
('Nursery1-B', 'General', 1, 'B', 'Early Years', 0),
('Nursery2-A', 'General', 2, 'A', 'Early Years', 0),
('Nursery2-B', 'General', 2, 'B', 'Early Years', 0),

-- PRIMARY (BASIC 1-6)
('Basic1-A', 'General', 3, 'A', 'Primary', 0),
('Basic1-B', 'General', 3, 'B', 'Primary', 0),
('Basic1-C', 'General', 3, 'C', 'Primary', 0),
('Basic2-A', 'General', 4, 'A', 'Primary', 0),
('Basic2-B', 'General', 4, 'B', 'Primary', 0),
('Basic2-C', 'General', 4, 'C', 'Primary', 0),
('Basic3-A', 'General', 5, 'A', 'Primary', 0),
('Basic3-B', 'General', 5, 'B', 'Primary', 0),
('Basic3-C', 'General', 5, 'C', 'Primary', 0),
('Basic4-A', 'General', 6, 'A', 'Primary', 0),
('Basic4-B', 'General', 6, 'B', 'Primary', 0),
('Basic4-C', 'General', 6, 'C', 'Primary', 0),
('Basic5-A', 'General', 7, 'A', 'Primary', 0),
('Basic5-B', 'General', 7, 'B', 'Primary', 0),
('Basic5-C', 'General', 7, 'C', 'Primary', 0),
('Basic6-A', 'General', 8, 'A', 'Primary', 0),
('Basic6-B', 'General', 8, 'B', 'Primary', 0),
('Basic6-C', 'General', 8, 'C', 'Primary', 0),

-- JUNIOR SECONDARY (JSS 1-3)
('JSS1-A', 'General', 9, 'A', 'Junior Secondary', 0),
('JSS1-B', 'General', 9, 'B', 'Junior Secondary', 0),
('JSS1-C', 'General', 9, 'C', 'Junior Secondary', 0),
('JSS2-A', 'General', 10, 'A', 'Junior Secondary', 0),
('JSS2-B', 'General', 10, 'B', 'Junior Secondary', 0),
('JSS2-C', 'General', 10, 'C', 'Junior Secondary', 0),
('JSS3-A', 'General', 11, 'A', 'Junior Secondary', 0),
('JSS3-B', 'General', 11, 'B', 'Junior Secondary', 0),
('JSS3-C', 'General', 11, 'C', 'Junior Secondary', 0),

-- SENIOR SECONDARY (SSS 1-3)
-- SSS 1
('SSS1-A-Science', 'Science', 12, 'A', 'Science', 0),
('SSS1-B-Science', 'Science', 12, 'B', 'Science', 0),
('SSS1-C-Science', 'Science', 12, 'C', 'Science', 0),
('SSS1-A-Arts', 'Arts', 12, 'A', 'Arts', 0),
('SSS1-B-Arts', 'Arts', 12, 'B', 'Arts', 0),
('SSS1-C-Arts', 'Arts', 12, 'C', 'Arts', 0),
('SSS1-A-Commercial', 'Commercial', 12, 'A', 'Commercial', 0),
('SSS1-B-Commercial', 'Commercial', 12, 'B', 'Commercial', 0),
('SSS1-C-Commercial', 'Commercial', 12, 'C', 'Commercial', 0),

-- SSS 2
('SSS2-A-Science', 'Science', 13, 'A', 'Science', 0),
('SSS2-B-Science', 'Science', 13, 'B', 'Science', 0),
('SSS2-C-Science', 'Science', 13, 'C', 'Science', 0),
('SSS2-A-Arts', 'Arts', 13, 'A', 'Arts', 0),
('SSS2-B-Arts', 'Arts', 13, 'B', 'Arts', 0),
('SSS2-C-Arts', 'Arts', 13, 'C', 'Arts', 0),
('SSS2-A-Commercial', 'Commercial', 13, 'A', 'Commercial', 0),
('SSS2-B-Commercial', 'Commercial', 13, 'B', 'Commercial', 0),
('SSS2-C-Commercial', 'Commercial', 13, 'C', 'Commercial', 0),

-- SSS 3
('SSS3-A-Science', 'Science', 14, 'A', 'Science', 0),
('SSS3-B-Science', 'Science', 14, 'B', 'Science', 0),
('SSS3-C-Science', 'Science', 14, 'C', 'Science', 0),
('SSS3-A-Arts', 'Arts', 14, 'A', 'Arts', 0),
('SSS3-B-Arts', 'Arts', 14, 'B', 'Arts', 0),
('SSS3-C-Arts', 'Arts', 14, 'C', 'Arts', 0),
('SSS3-A-Commercial', 'Commercial', 14, 'A', 'Commercial', 0),
('SSS3-B-Commercial', 'Commercial', 14, 'B', 'Commercial', 0),
('SSS3-C-Commercial', 'Commercial', 14, 'C', 'Commercial', 0)

ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as total_classes FROM classes;
SELECT 'SUCCESS! Classes inserted!' as message;
