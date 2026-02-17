-- Migration: 0146_fix_rls_for_null_branch.sql
-- Description: Updates RLS policies to be more permissive during the context-switching phase.
-- This ensures that if no branch is selected (NULL context), data is still visible to authorized school members.

BEGIN;

-- 1. Re-define the helper to handle potential string/null issues from JWT
CREATE OR REPLACE FUNCTION public.get_active_branch_id()
RETURNS UUID AS $$
DECLARE
    raw_id text;
BEGIN
    raw_id := auth.jwt() -> 'app_metadata' ->> 'active_branch_id';
    IF raw_id IS NULL OR raw_id = '' OR raw_id = 'all' THEN
        RETURN NULL;
    END IF;
    RETURN raw_id::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Update the Global Isolation Policy for all core tables
DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 'timetable', 
        'assignments', 'grades', 'attendance_records', 'student_fees', 
        'report_cards', 'health_logs', 'student_attendance', 'transport_buses',
        'messages', 'notices', 'quizzes', 'quiz_questions', 'quiz_submissions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Drop the previous strict policy
            EXECUTE format('DROP POLICY IF EXISTS "Strict Isolation Enforcement" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Strict Zero-Trust Isolation" ON public.%I', t);

            -- Create a "Flexible Branch Isolation" Policy
            -- Rule: Must match School ID.
            -- Rule: IF user has an active branch context, MUST match branch.
            -- Rule: IF user has NO active branch context, show all within school (Super Admin/Main Admin mode).
            EXECUTE format(
                'CREATE POLICY "Context-Aware Branch Isolation" ON public.%I
                FOR ALL 
                TO authenticated
                USING (
                    school_id = public.get_school_id() 
                    AND (
                        public.get_active_branch_id() IS NULL 
                        OR 
                        branch_id = public.get_active_branch_id()
                    )
                )
                WITH CHECK (
                    school_id = public.get_school_id() 
                    AND (
                        public.get_active_branch_id() IS NULL 
                        OR 
                        branch_id = public.get_active_branch_id()
                    )
                )', t
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
