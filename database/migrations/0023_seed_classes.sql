-- Seeding Classes Table with Default Grades and Sections
-- Dependencies: 0020_consolidated_schema_fixes.sql (defines classes table)

-- 1. Ensure Access Rights (RLS Policies)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Allow publicly (or at least authenticated + anon) to view classes for now to ensure data visibility
DROP POLICY IF EXISTS "select_classes_authenticated" ON classes;
DROP POLICY IF EXISTS "Public read classes" ON classes;
CREATE POLICY "Public read classes" ON classes
    FOR SELECT USING (true);

-- Allow modifications for authenticated users
DROP POLICY IF EXISTS "modify_classes_authenticated" ON classes;
CREATE POLICY "modify_classes_authenticated" ON classes
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
    
-- 2. Seed Data
DO $$
BEGIN
    -- Helper temp table or just direct inserts with checks

    -- Early Years
    INSERT INTO classes (grade, section, department)
    SELECT g, 'A', NULL
    FROM unnest(ARRAY[0, 1, 2]) AS g
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE grade = g AND section = 'A' AND department IS NULL);

    -- Primary (Basic 1-6)
    INSERT INTO classes (grade, section, department)
    SELECT g, 'A', NULL
    FROM unnest(ARRAY[3, 4, 5, 6, 7, 8]) AS g
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE grade = g AND section = 'A' AND department IS NULL);

    -- Junior Secondary (JSS 1-3)
    INSERT INTO classes (grade, section, department)
    SELECT g, 'A', NULL
    FROM unnest(ARRAY[9, 10, 11]) AS g
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE grade = g AND section = 'A' AND department IS NULL);

    -- Senior Secondary (SSS 1-3) - Science
    INSERT INTO classes (grade, section, department)
    SELECT g, 'A', 'Science'
    FROM unnest(ARRAY[12, 13, 14]) AS g
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE grade = g AND section = 'A' AND department = 'Science');

    -- Senior Secondary (SSS 1-3) - Arts
    INSERT INTO classes (grade, section, department)
    SELECT g, 'A', 'Arts'
    FROM unnest(ARRAY[12, 13, 14]) AS g
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE grade = g AND section = 'A' AND department = 'Arts');

    -- Senior Secondary (SSS 1-3) - Commercial
    INSERT INTO classes (grade, section, department)
    SELECT g, 'A', 'Commercial'
    FROM unnest(ARRAY[12, 13, 14]) AS g
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE grade = g AND section = 'A' AND department = 'Commercial');

END $$;
