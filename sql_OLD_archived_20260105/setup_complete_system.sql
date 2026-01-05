-- ============================================
-- COMPLETE SETUP: Classes and Subjects
-- Nigerian School System - Database Population
-- FIXED VERSION - Works with existing tables
-- ============================================

-- ============================================
-- STEP 1: CREATE OR UPDATE SUBJECTS TABLE
-- ============================================

-- Drop and recreate subjects table to ensure correct structure
DROP TABLE IF EXISTS subjects CASCADE;

CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    grade_level VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    category VARCHAR(100),
    is_compulsory BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: POPULATE CLASSES
-- ============================================

-- Clear existing classes
DELETE FROM classes;

-- EARLY YEARS
INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
-- Pre-Nursery
('PreNursery-A', 'General', 0, 'A', 'Early Years', 0),
('PreNursery-B', 'General', 0, 'B', 'Early Years', 0),

-- Nursery 1
('Nursery1-A', 'General', 1, 'A', 'Early Years', 0),
('Nursery1-B', 'General', 1, 'B', 'Early Years', 0),

-- Nursery 2
('Nursery2-A', 'General', 2, 'A', 'Early Years', 0),
('Nursery2-B', 'General', 2, 'B', 'Early Years', 0),

-- PRIMARY (BASIC 1-6)
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

-- JUNIOR SECONDARY (JSS 1-3)
-- JSS 1
('JSS1-A', 'General', 9, 'A', 'Junior Secondary', 0),
('JSS1-B', 'General', 9, 'B', 'Junior Secondary', 0),
('JSS1-C', 'General', 9, 'C', 'Junior Secondary', 0),

-- JSS 2
('JSS2-A', 'General', 10, 'A', 'Junior Secondary', 0),
('JSS2-B', 'General', 10, 'B', 'Junior Secondary', 0),
('JSS2-C', 'General', 10, 'C', 'Junior Secondary', 0),

-- JSS 3
('JSS3-A', 'General', 11, 'A', 'Junior Secondary', 0),
('JSS3-B', 'General', 11, 'B', 'Junior Secondary', 0),
('JSS3-C', 'General', 11, 'C', 'Junior Secondary', 0),

-- SENIOR SECONDARY (SSS 1-3)
-- SSS 1 - Science
('SSS1-A-Science', 'Science', 12, 'A', 'Science', 0),
('SSS1-B-Science', 'Science', 12, 'B', 'Science', 0),
('SSS1-C-Science', 'Science', 12, 'C', 'Science', 0),

-- SSS 1 - Arts
('SSS1-A-Arts', 'Arts', 12, 'A', 'Arts', 0),
('SSS1-B-Arts', 'Arts', 12, 'B', 'Arts', 0),
('SSS1-C-Arts', 'Arts', 12, 'C', 'Arts', 0),

-- SSS 1 - Commercial
('SSS1-A-Commercial', 'Commercial', 12, 'A', 'Commercial', 0),
('SSS1-B-Commercial', 'Commercial', 12, 'B', 'Commercial', 0),
('SSS1-C-Commercial', 'Commercial', 12, 'C', 'Commercial', 0),

-- SSS 2 - Science
('SSS2-A-Science', 'Science', 13, 'A', 'Science', 0),
('SSS2-B-Science', 'Science', 13, 'B', 'Science', 0),
('SSS2-C-Science', 'Science', 13, 'C', 'Science', 0),

-- SSS 2 - Arts
('SSS2-A-Arts', 'Arts', 13, 'A', 'Arts', 0),
('SSS2-B-Arts', 'Arts', 13, 'B', 'Arts', 0),
('SSS2-C-Arts', 'Arts', 13, 'C', 'Arts', 0),

-- SSS 2 - Commercial
('SSS2-A-Commercial', 'Commercial', 13, 'A', 'Commercial', 0),
('SSS2-B-Commercial', 'Commercial', 13, 'B', 'Commercial', 0),
('SSS2-C-Commercial', 'Commercial', 13, 'C', 'Commercial', 0),

-- SSS 3 - Science
('SSS3-A-Science', 'Science', 14, 'A', 'Science', 0),
('SSS3-B-Science', 'Science', 14, 'B', 'Science', 0),
('SSS3-C-Science', 'Science', 14, 'C', 'Science', 0),

-- SSS 3 - Arts
('SSS3-A-Arts', 'Arts', 14, 'A', 'Arts', 0),
('SSS3-B-Arts', 'Arts', 14, 'B', 'Arts', 0),
('SSS3-C-Arts', 'Arts', 14, 'C', 'Arts', 0),

-- SSS 3 - Commercial
('SSS3-A-Commercial', 'Commercial', 14, 'A', 'Commercial', 0),
('SSS3-B-Commercial', 'Commercial', 14, 'B', 'Commercial', 0),
('SSS3-C-Commercial', 'Commercial', 14, 'C', 'Commercial', 0)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 3: POPULATE SUBJECTS
-- ============================================

-- EARLY YEARS SUBJECTS (Activity Areas)
INSERT INTO subjects (name, code, grade_level, category, is_compulsory) VALUES
('Numeracy (Number Work)', 'NUM', 'Early Years', 'Activity Areas', true),
('Literacy (Letter Work/Phonics)', 'LIT', 'Early Years', 'Activity Areas', true),
('Discovery Science', 'SCI', 'Early Years', 'Activity Areas', true),
('Social Habits', 'SOC', 'Early Years', 'Activity Areas', true),
('Health Habits', 'HLT', 'Early Years', 'Activity Areas', true),
('Creative Arts', 'ART', 'Early Years', 'Activity Areas', true),
('Rhymes/Poems', 'RHY', 'Early Years', 'Activity Areas', true),
('Handwriting', 'HND', 'Early Years', 'Activity Areas', true),
('Religious Knowledge', 'REL', 'Early Years', 'Activity Areas', true);

-- PRIMARY SUBJECTS
INSERT INTO subjects (name, code, grade_level, category, is_compulsory) VALUES
-- Core Subjects
('English Studies', 'ENG', 'Primary', 'Core', true),
('Mathematics', 'MTH', 'Primary', 'Core', true),
('Basic Science and Technology', 'BST', 'Primary', 'Core', true),
('Social Studies', 'SOS', 'Primary', 'Core', true),
('Civic Education', 'CIV', 'Primary', 'Core', true),
('Security Education', 'SEC', 'Primary', 'Core', true),

-- Languages & Arts
('Cultural and Creative Arts (CCA)', 'CCA', 'Primary', 'Arts & Languages', true),
('Nigerian Language', 'NGL', 'Primary', 'Arts & Languages', true),
('French Language', 'FRE', 'Primary', 'Arts & Languages', false),

-- Religion
('Christian Religious Studies (CRS)', 'CRS', 'Primary', 'Religion', false),
('Islamic Studies (IRS)', 'IRS', 'Primary', 'Religion', false),

-- Practical
('Physical and Health Education (PHE)', 'PHE', 'Primary', 'Practical', true),
('Computer Studies/ICT', 'ICT', 'Primary', 'Practical', true),
('Agriculture/Home Economics', 'AGR', 'Primary', 'Practical', true);

-- JSS SUBJECTS
INSERT INTO subjects (name, code, grade_level, category, is_compulsory) VALUES
-- Core Compulsory
('English Language', 'ENG', 'JSS', 'Core Compulsory', true),
('Mathematics', 'MTH', 'JSS', 'Core Compulsory', true),
('Basic Science', 'BSC', 'JSS', 'Core Compulsory', true),
('Social Studies', 'SOS', 'JSS', 'Core Compulsory', true),
('Civic Education', 'CIV', 'JSS', 'Core Compulsory', true),

-- Vocational/Technical
('Basic Technology', 'BTE', 'JSS', 'Vocational/Technical', true),
('Agricultural Science', 'AGR', 'JSS', 'Vocational/Technical', true),
('Home Economics', 'HEC', 'JSS', 'Vocational/Technical', true),
('Business Studies', 'BUS', 'JSS', 'Vocational/Technical', true),

-- Arts & Languages
('Cultural & Creative Arts (CCA)', 'CCA', 'JSS', 'Arts & Languages', true),
('French Language', 'FRE', 'JSS', 'Arts & Languages', true),
('Nigerian Language', 'NGL', 'JSS', 'Arts & Languages', true),
('Music', 'MUS', 'JSS', 'Arts & Languages', false),

-- Religion
('Christian Religious Studies (CRS)', 'CRS', 'JSS', 'Religion', false),
('Islamic Studies (IRS)', 'IRS', 'JSS', 'Religion', false),

-- Digital
('Computer Studies', 'COM', 'JSS', 'Digital', true);

-- SSS CORE SUBJECTS (All Tracks)
INSERT INTO subjects (name, code, grade_level, category, is_compulsory) VALUES
('English Language', 'ENG', 'SSS', 'Core Compulsory', true),
('General Mathematics', 'MTH', 'SSS', 'Core Compulsory', true),
('Civic Education', 'CIV', 'SSS', 'Core Compulsory', true),
('Data Processing', 'DTP', 'SSS', 'Core Compulsory', true),
('Biology', 'BIO', 'SSS', 'Core Compulsory', true);

-- SSS SCIENCE TRACK
INSERT INTO subjects (name, code, grade_level, department, category, is_compulsory) VALUES
('Physics', 'PHY', 'SSS', 'Science', 'Science Electives', true),
('Chemistry', 'CHE', 'SSS', 'Science', 'Science Electives', true),
('Further Mathematics', 'FMT', 'SSS', 'Science', 'Science Electives', false),
('Geography', 'GEO', 'SSS', 'Science', 'Science Electives', false),
('Agricultural Science', 'AGR', 'SSS', 'Science', 'Science Electives', false),
('Technical Drawing', 'TDR', 'SSS', 'Science', 'Science Electives', false);

-- SSS ARTS TRACK
INSERT INTO subjects (name, code, grade_level, department, category, is_compulsory) VALUES
('Literature-in-English', 'LIT', 'SSS', 'Arts', 'Arts Electives', true),
('Government', 'GOV', 'SSS', 'Arts', 'Arts Electives', true),
('History', 'HIS', 'SSS', 'Arts', 'Arts Electives', false),
('Christian Religious Studies (CRS)', 'CRS', 'SSS', 'Arts', 'Arts Electives', false),
('Islamic Studies (IRS)', 'IRS', 'SSS', 'Arts', 'Arts Electives', false),
('Nigerian Language', 'NGL', 'SSS', 'Arts', 'Arts Electives', false),
('Fine Arts', 'FAR', 'SSS', 'Arts', 'Arts Electives', false),
('Geography', 'GEO', 'SSS', 'Arts', 'Arts Electives', false);

-- SSS COMMERCIAL TRACK
INSERT INTO subjects (name, code, grade_level, department, category, is_compulsory) VALUES
('Financial Accounting', 'ACC', 'SSS', 'Commercial', 'Commercial Electives', true),
('Commerce', 'COM', 'SSS', 'Commercial', 'Commercial Electives', true),
('Economics', 'ECO', 'SSS', 'Commercial', 'Commercial Electives', true),
('Government', 'GOV', 'SSS', 'Commercial', 'Commercial Electives', false),
('Marketing', 'MKT', 'SSS', 'Commercial', 'Commercial Electives', false),
('Office Practice', 'OFP', 'SSS', 'Commercial', 'Commercial Electives', false),
('Business Studies', 'BUS', 'SSS', 'Commercial', 'Commercial Electives', false);

-- ============================================
-- STEP 4: ENABLE REALTIME (Optional but recommended)
-- ============================================

-- Enable realtime for classes table (skip if already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE classes;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'classes table already in realtime publication';
END $$;

-- Enable realtime for subjects table (skip if already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE subjects;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'subjects table already in realtime publication';
END $$;

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Count classes
SELECT 'Classes Created:' as info, COUNT(*) as count FROM classes;

-- Count subjects
SELECT 'Subjects Created:' as info, COUNT(*) as count FROM subjects;

-- View classes by level
SELECT 
    CASE 
        WHEN grade BETWEEN 0 AND 2 THEN 'Early Years'
        WHEN grade BETWEEN 3 AND 8 THEN 'Primary'
        WHEN grade BETWEEN 9 AND 11 THEN 'JSS'
        WHEN grade BETWEEN 12 AND 14 THEN 'SSS'
    END as level,
    COUNT(*) as class_count
FROM classes
GROUP BY level
ORDER BY MIN(grade);

-- View subjects by level
SELECT 
    grade_level,
    COUNT(*) as subject_count
FROM subjects
GROUP BY grade_level
ORDER BY 
    CASE grade_level
        WHEN 'Early Years' THEN 1
        WHEN 'Primary' THEN 2
        WHEN 'JSS' THEN 3
        WHEN 'SSS' THEN 4
    END;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 
    '✅ Setup Complete!' as status,
    (SELECT COUNT(*) FROM classes) as total_classes,
    (SELECT COUNT(*) FROM subjects) as total_subjects,
    'Your app should now show all classes!' as message;
