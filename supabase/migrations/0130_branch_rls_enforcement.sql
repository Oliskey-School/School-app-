-- Migration: Branch RLS Enforcement
-- Description: Adds branch isolation policies to ensure users can only see data from their assigned branch.

BEGIN;

-- 1. Create/Update Security Helper for Branch ID
CREATE OR REPLACE FUNCTION public.get_branch_id()
RETURNS UUID AS $$
    -- Extract branch_id from JWT claims
    SELECT (NULLIF(auth.jwt() ->> 'branch_id', ''))::UUID;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_branch_id() TO public;

-- 2. Add Branch Isolation Policies
-- We apply this to core tables where isolation is required.
DO $$
DECLARE
    t text;
    tables_to_isolate text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 'timetable', 
        'assignments', 'grades', 'attendance_records', 'student_fees', 
        'report_cards', 'health_logs', 'student_attendance'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_isolate LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Drop existing "Branch Isolation" policy if it exists
            EXECUTE format('DROP POLICY IF EXISTS "Branch Isolation" ON public.%I', t);
            
            -- Create new policy
            -- Logic: Allow if (record.branch_id matches user.branch_id) OR (user.branch_id IS NULL)
            -- We assume users with NULL branch_id are Main Admins/Proprietors.
            EXECUTE format(
                'CREATE POLICY "Branch Isolation" ON public.%I FOR ALL USING (
                    school_id = public.get_school_id() AND (
                        branch_id IS NULL OR 
                        branch_id = public.get_branch_id() OR 
                        public.get_branch_id() IS NULL
                    )
                )', t
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
