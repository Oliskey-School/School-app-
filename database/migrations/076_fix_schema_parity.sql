-- Migration: Fix Schema-to-UI Parity Gaps
-- Description: Adds missing columns and constraints to align database with frontend forms
-- Reference: Schema Parity Gap Report 2026-02-05

BEGIN;

-- =============================================================================
-- STUDENTS TABLE - Add Missing Columns
-- =============================================================================

DO $$ BEGIN
    -- Add grade column (CRITICAL - required by form)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'grade') THEN
        ALTER TABLE students ADD COLUMN grade INTEGER;
        RAISE NOTICE 'Added grade column to students table';
    END IF;

    -- Add section column (CRITICAL - required by form)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'section') THEN
        ALTER TABLE students ADD COLUMN section TEXT;
        RAISE NOTICE 'Added section column to students table';
    END IF;

    -- Add department column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'department') THEN
        ALTER TABLE students ADD COLUMN department TEXT;
        RAISE NOTICE 'Added department column to students table';
    END IF;

    -- Add avatar_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'avatar_url') THEN
        ALTER TABLE students ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to students table';
    END IF;

    -- Add attendance_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'attendance_status') THEN
        ALTER TABLE students ADD COLUMN attendance_status TEXT DEFAULT 'Present';
        RAISE NOTICE 'Added attendance_status column to students table';
    END IF;
END $$;

-- Add CHECK constraints
ALTER TABLE students DROP CONSTRAINT IF EXISTS check_student_gender;
ALTER TABLE students ADD CONSTRAINT check_student_gender CHECK (gender IN ('Male', 'Female') OR gender IS NULL);

ALTER TABLE students DROP CONSTRAINT IF EXISTS check_student_status;
ALTER TABLE students ADD CONSTRAINT check_student_status CHECK (status IN ('Active', 'Inactive', 'Suspended'));

ALTER TABLE students DROP CONSTRAINT IF EXISTS check_student_attendance_status;
ALTER TABLE students ADD CONSTRAINT check_student_attendance_status CHECK (attendance_status IN ('Present', 'Absent', 'Late', 'Leave'));

ALTER TABLE students DROP CONSTRAINT IF EXISTS check_student_department;
ALTER TABLE students ADD CONSTRAINT check_student_department CHECK (department IN ('Science', 'Commercial', 'Arts') OR department IS NULL);

ALTER TABLE students DROP CONSTRAINT IF EXISTS check_student_grade;
ALTER TABLE students ADD CONSTRAINT check_student_grade CHECK (grade >= 1 AND grade <= 12 OR grade IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
CREATE INDEX IF NOT EXISTS idx_students_school_grade ON students(school_id, grade);

-- =============================================================================
-- TEACHERS TABLE - Add Missing Columns
-- =============================================================================

DO $$ BEGIN
    -- Add avatar_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'avatar_url') THEN
        ALTER TABLE teachers ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to teachers table';
    END IF;

    -- Add curriculum_eligibility column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'curriculum_eligibility') THEN
        ALTER TABLE teachers ADD COLUMN curriculum_eligibility TEXT[];
        RAISE NOTICE 'Added curriculum_eligibility column to teachers table';
    END IF;

    -- Add compliance_documents column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'compliance_documents') THEN
        ALTER TABLE teachers ADD COLUMN compliance_documents JSONB;
        RAISE NOTICE 'Added compliance_documents column to teachers table';
    END IF;
END $$;

-- Add CHECK constraint for teacher status
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS check_teacher_status;
ALTER TABLE teachers ADD CONSTRAINT check_teacher_status CHECK (status IN ('Active', 'Inactive', 'On Leave'));

-- =============================================================================
-- PARENTS TABLE - Add Missing Columns
-- =============================================================================

DO $$ BEGIN
    -- Add avatar_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parents' AND column_name = 'avatar_url') THEN
        ALTER TABLE parents ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to parents table';
    END IF;

    -- Add relationship column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parents' AND column_name = 'relationship') THEN
        ALTER TABLE parents ADD COLUMN relationship TEXT;
        RAISE NOTICE 'Added relationship column to parents table';
    END IF;

    -- Add emergency_contact column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parents' AND column_name = 'emergency_contact') THEN
        ALTER TABLE parents ADD COLUMN emergency_contact TEXT;
        RAISE NOTICE 'Added emergency_contact column to parents table';
    END IF;
END $$;

-- Add CHECK constraint for relationship
ALTER TABLE parents DROP CONSTRAINT IF EXISTS check_parent_relationship;
ALTER TABLE parents ADD CONSTRAINT check_parent_relationship CHECK (relationship IN ('Mother', 'Father', 'Guardian', 'Other') OR relationship IS NULL);

-- =============================================================================
-- DATA BACKFILL for existing records
-- =============================================================================

-- Set default values for existing students
UPDATE students SET attendance_status = 'Present' WHERE attendance_status IS NULL;

COMMIT;
