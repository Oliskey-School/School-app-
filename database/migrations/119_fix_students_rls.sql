-- Migration: 0153_fix_students_rls.sql
-- Description: Fixes overly permissive RLS on students table by dropping all policies and enforcing strict context-aware isolation.

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on students to ensure no leaks
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'students' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', pol.policyname);
    END LOOP;
END $$;

-- 3. Re-apply strict "Context-Aware Branch Isolation"
-- Copied from 0146 migration but applied specifically to students to ensure it's the ONLY policy.
CREATE POLICY "Context-Aware Branch Isolation" ON public.students
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
    );

-- 4. Verify no anonymous access exists
-- (Implicit by TO authenticated above)

COMMIT;
