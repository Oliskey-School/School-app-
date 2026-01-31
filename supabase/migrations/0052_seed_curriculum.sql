-- Migration: Seed Standard Curriculum (Classes & Subjects)
-- Date: 2026-01-28
-- Description: Creates ‘subjects’ table and populates standard WAEC/NECO classes and subjects for the demo school.

DO $$
DECLARE
    -- Use the demo school ID (or replace with target school ID)
    target_school_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

-- 1. Ensure 'subjects' table exists
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT, -- 'Core', 'Science', 'Art', 'Commercial', 'General'
    grade_level_category TEXT, -- 'Junior', 'Senior', 'All'
    is_core BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- Enable RLS on subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for reading subjects (if not exists)
IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Tenant Isolation Policy'
) THEN
    CREATE POLICY "Tenant Isolation Policy" ON subjects
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
END IF;


    -- Ensure 'department' and 'section' columns exist in 'classes' table
    BEGIN
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS department TEXT;
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS section TEXT;
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT; -- Ensure level exists
        
        -- Redefine the constraint to ensure we know what is allowed
        ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;
        ALTER TABLE classes ADD CONSTRAINT classes_level_check CHECK (level IN ('Preschool', 'Primary', 'Secondary', 'Tertiary'));

        -- Ensure 'subjects' table columns exist (handle schema drift)
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade_level_category TEXT;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT false;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

-- 2. Seed Classes (JSS 1 - SSS 3)
INSERT INTO classes (name, grade, section, department, level, school_id)
VALUES 
    -- Junior Secondary
    ('JSS 1', 7, 'A', 'Junior', 'Secondary', target_school_id),
    ('JSS 2', 8, 'A', 'Junior', 'Secondary', target_school_id),
    ('JSS 3', 9, 'A', 'Junior', 'Secondary', target_school_id),
    -- Senior Secondary
    ('SSS 1', 10, 'A', 'Senior', 'Secondary', target_school_id),
    ('SSS 2', 11, 'A', 'Senior', 'Secondary', target_school_id),
    ('SSS 3', 12, 'A', 'Senior', 'Secondary', target_school_id)
ON CONFLICT DO NOTHING;


-- 3. Seed Subjects

-- JUNIOR SECONDARY (Core)
INSERT INTO subjects (school_id, name, category, grade_level_category, is_core)
VALUES
    (target_school_id, 'Mathematics', 'General', 'Junior', true),
    (target_school_id, 'English Studies', 'General', 'Junior', true),
    (target_school_id, 'Basic Science', 'Science', 'Junior', true),
    (target_school_id, 'Basic Technology', 'Science', 'Junior', true),
    (target_school_id, 'Social Studies', 'Art', 'Junior', true),
    (target_school_id, 'Civic Education', 'Art', 'Junior', true),
    (target_school_id, 'Creative Arts', 'Art', 'Junior', true),
    (target_school_id, 'Agricultural Science', 'Science', 'Junior', false),
    (target_school_id, 'Business Studies', 'Commercial', 'Junior', false),
    (target_school_id, 'French', 'Art', 'Junior', false),
    (target_school_id, 'Computer Studies', 'Science', 'Junior', true),
    (target_school_id, 'Christian Religious Studies', 'Art', 'Junior', false),
    (target_school_id, 'Islamic Religious Studies', 'Art', 'Junior', false)
ON CONFLICT (school_id, name) DO NOTHING;

-- SENIOR SECONDARY (Core for All Streams)
INSERT INTO subjects (school_id, name, category, grade_level_category, is_core)
VALUES
    (target_school_id, 'Mathematics', 'General', 'Senior', true),
    (target_school_id, 'English Language', 'General', 'Senior', true),
    (target_school_id, 'Civic Education', 'General', 'Senior', true),
    (target_school_id, 'Economics', 'Commercial', 'Senior', false), -- Often core but treated as stream-specific sometimes
    (target_school_id, 'Computer Studies', 'Science', 'Senior', false)
ON CONFLICT (school_id, name) DO NOTHING;

-- SENIOR SECONDARY (Science Stream)
INSERT INTO subjects (school_id, name, category, grade_level_category, is_core)
VALUES
    (target_school_id, 'Physics', 'Science', 'Senior', false),
    (target_school_id, 'Chemistry', 'Science', 'Senior', false),
    (target_school_id, 'Biology', 'Science', 'Senior', false), -- Often core for science
    (target_school_id, 'Further Mathematics', 'Science', 'Senior', false),
    (target_school_id, 'Agricultural Science', 'Science', 'Senior', false),
    (target_school_id, 'Technical Drawing', 'Science', 'Senior', false),
    (target_school_id, 'Geography', 'Science', 'Senior', false)
ON CONFLICT (school_id, name) DO NOTHING;

-- SENIOR SECONDARY (Commercial Stream)
INSERT INTO subjects (school_id, name, category, grade_level_category, is_core)
VALUES
    (target_school_id, 'Financial Accounting', 'Commercial', 'Senior', false),
    (target_school_id, 'Commerce', 'Commercial', 'Senior', false),
    (target_school_id, 'Office Practice', 'Commercial', 'Senior', false),
    (target_school_id, 'Insurance', 'Commercial', 'Senior', false),
    (target_school_id, 'Bookkeeping', 'Commercial', 'Senior', false)
ON CONFLICT (school_id, name) DO NOTHING;

-- SENIOR SECONDARY (Art Stream)
INSERT INTO subjects (school_id, name, category, grade_level_category, is_core)
VALUES
    (target_school_id, 'Literature in English', 'Art', 'Senior', false),
    (target_school_id, 'Government', 'Art', 'Senior', false),
    (target_school_id, 'History', 'Art', 'Senior', false),
    (target_school_id, 'Christian Religious Studies', 'Art', 'Senior', false),
    (target_school_id, 'Islamic Religious Studies', 'Art', 'Senior', false),
    (target_school_id, 'Visual Arts', 'Art', 'Senior', false),
    (target_school_id, 'Music', 'Art', 'Senior', false)
ON CONFLICT (school_id, name) DO NOTHING;

END $$;
