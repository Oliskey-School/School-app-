-- ============================================================================
-- 🚀 MIGRATION: ADD STRUCTURED SCHOOL IDs
-- ============================================================================

-- 1. Create Sequences for each role
CREATE SEQUENCE IF NOT EXISTS student_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS teacher_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS parent_id_seq START WITH 1 INCREMENT BY 1;

-- 2. Create ID Generation Function
CREATE OR REPLACE FUNCTION generate_school_id(role_type TEXT)
RETURNS TEXT AS $$
DECLARE
    seq_val INTEGER;
    prefix TEXT;
BEGIN
    IF role_type = 'student' THEN
        seq_val := nextval('student_id_seq');
        prefix := 'SCH-STU-';
    ELSIF role_type = 'teacher' THEN
        seq_val := nextval('teacher_id_seq');
        prefix := 'SCH-TEA-';
    ELSIF role_type = 'parent' THEN
        seq_val := nextval('parent_id_seq');
        prefix := 'SCH-PAR-';
    ELSE
        RAISE EXCEPTION 'Invalid role type';
    END IF;

    -- Return formatted ID (e.g., SCH-STU-001)
    RETURN prefix || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Alter Tables to add the column with DEFAULT value
-- We use a volatile default to ensure it calls the function for each row

-- Students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS school_generated_id TEXT UNIQUE DEFAULT generate_school_id('student');

-- Teachers
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS school_generated_id TEXT UNIQUE DEFAULT generate_school_id('teacher');

-- Parents
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS school_generated_id TEXT UNIQUE DEFAULT generate_school_id('parent');

-- 4. Backfill existing records (The DEFAULT modification above might not backfill automatically if not specified, 
-- but in Postgres adding a column with DEFAULT fills existing rows IF it's not a volatile function issue. 
-- To be safe and explicit for existing rows if they end up NULL):

UPDATE students SET school_generated_id = generate_school_id('student') WHERE school_generated_id IS NULL;
UPDATE teachers SET school_generated_id = generate_school_id('teacher') WHERE school_generated_id IS NULL;
UPDATE parents SET school_generated_id = generate_school_id('parent') WHERE school_generated_id IS NULL;

-- 5. Return status
SELECT '✅ School IDs Added Successfully' as status;
