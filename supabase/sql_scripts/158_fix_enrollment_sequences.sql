-- Migration: Fix Enrollment Sequences
-- Description: Creates missing sequences required for automated ID generation triggers on students, teachers, parents, and staff.

BEGIN;

-- Create missing sequences for standardized ID generation
DO $$
BEGIN
    -- Global Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_global_id_seq') THEN
        CREATE SEQUENCE school_global_id_seq MINVALUE 0 START 0;
    END IF;

    -- Student Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_student_id_seq') THEN
        CREATE SEQUENCE school_student_id_seq MINVALUE 0 START 0;
    END IF;

    -- Teacher Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_teacher_id_seq') THEN
        CREATE SEQUENCE school_teacher_id_seq MINVALUE 0 START 0;
    END IF;

    -- Parent Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_parent_id_seq') THEN
        CREATE SEQUENCE school_parent_id_seq MINVALUE 0 START 0;
    END IF;

    -- Staff Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_staff_id_seq') THEN
        CREATE SEQUENCE school_staff_id_seq MINVALUE 0 START 0;
    END IF;
END $$;

-- Grant permissions to roles to ensure triggers can access nextval()
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, anon;

COMMIT;
