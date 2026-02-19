-- Migration: Fix Attendance Constraints
-- Description: Adds unique constraint to student_attendance and ensures school_id default.

BEGIN;

-- 1. Ensure student_attendance table has correct structure
-- We assume it already exists from 0046_ensure_schema.sql

-- 2. Add Unique Constraint for Upsert (student_id, date)
-- This is critical for the .upsert() logic to work correctly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'student_attendance_student_id_date_key'
    ) THEN
        ALTER TABLE public.student_attendance 
        ADD CONSTRAINT student_attendance_student_id_date_key UNIQUE (student_id, date);
    END IF;
END $$;

-- 3. Ensure school_id has a reasonable default for backend service calls
-- We use public.get_school_id() which handles JWT extraction
ALTER TABLE public.student_attendance 
ALTER COLUMN school_id SET DEFAULT public.get_school_id();

-- 4. Enable RLS and verify policies (Standardized from 0061)
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.student_attendance;
CREATE POLICY "Tenant Isolation Policy" ON public.student_attendance 
FOR ALL 
USING (
    school_id = public.get_school_id()
);

COMMIT;
