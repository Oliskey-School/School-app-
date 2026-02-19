-- Migration: 0143_strict_isolation_reinforcement.sql
-- Description: Implements strict multi-tenant and branch isolation foundations.

BEGIN;

-- 1. Create User-Branch Permissions Matrix
CREATE TABLE IF NOT EXISTS public.user_branch_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);

-- Enable RLS on the access table
ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;

-- 2. Update Security Helpers
-- get_school_id() already exists, let's ensure get_active_branch_id() is robust
CREATE OR REPLACE FUNCTION public.get_active_branch_id()
RETURNS UUID AS $$
    -- Extract active_branch_id from JWT app_metadata
    -- This is set during the "Context Switch"
    SELECT (NULLIF(auth.jwt() -> 'app_metadata' ->> 'active_branch_id', ''))::UUID;
$$ LANGUAGE sql STABLE;

-- 3. Mandatory Column Audit & Injection
-- Ensure all core tables have both school_id and branch_id
DO $$
DECLARE
    t text;
    tables_to_audit text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 'timetable', 
        'assignments', 'grades', 'attendance_records', 'student_fees', 
        'report_cards', 'health_logs', 'student_attendance', 'transport_buses',
        'messages', 'notices', 'quizzes', 'quiz_questions', 'quiz_submissions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_audit LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Check school_id
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'school_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE', t);
            END IF;
            -- Check branch_id
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'branch_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL', t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 4. Global RLS Enforcement Pattern (The "Bouncer")
-- We will recreate policies for all audited tables using the strict isolation rule.
DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 'timetable', 
        'assignments', 'grades', 'attendance_records', 'student_fees', 
        'report_cards', 'health_logs', 'student_attendance', 'transport_buses',
        'messages', 'notices', 'quizzes', 'quiz_questions', 'quiz_submissions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Drop ALL existing policies to ensure no legacy leakage
            EXECUTE (
                SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, t), '; ')
                FROM pg_policies 
                WHERE tablename = t AND schemaname = 'public'
            );

            -- Create the "Double-Lock" Policy
            -- 1. Must match School ID (Tenant Isolation)
            -- 2. Must match Active Branch OR user is Super Admin (Branch Isolation)
            EXECUTE format(
                'CREATE POLICY "Strict Zero-Trust Isolation" ON public.%I
                FOR ALL 
                TO authenticated
                USING (
                    school_id = public.get_school_id() 
                    AND (
                        -- Super Admin / Proprietor with no branch context sees all
                        public.get_active_branch_id() IS NULL 
                        OR 
                        -- Context-switched admin or standard staff/student must match branch
                        branch_id = public.get_active_branch_id()
                    )
                )', t
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
