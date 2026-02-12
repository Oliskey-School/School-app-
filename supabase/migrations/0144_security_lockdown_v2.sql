-- Migration: 0144_security_lockdown_v2.sql
-- Description: Strictly enforces RLS and removes all permissive legacy policies.

BEGIN;

-- 1. List of all tables to secure
DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 'timetable', 
        'assignments', 'grades', 'attendance_records', 'student_fees', 
        'report_cards', 'health_logs', 'student_attendance', 'transport_buses',
        'messages', 'notices', 'quizzes', 'quiz_questions', 'quiz_submissions',
        'schools', 'users', 'profiles', 'branches'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
            -- FORCE ENABLE RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t); -- Even for owners (optional but strict)

            -- DROP ALL EXISTING POLICIES ON THIS TABLE
            -- This is the only way to be 100% sure no legacy "Allow all" exists
            EXECUTE (
                SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, t), '; ')
                FROM pg_policies 
                WHERE tablename = t AND schemaname = 'public'
            );
        END IF;
    END LOOP;
END $$;

-- 2. RE-ESTABLISH ZERO-TRUST POLICIES (AUTHENTICATED ONLY)

-- A. Schools (Read-only for identification)
CREATE POLICY "Schools are viewable by anyone authenticated" ON public.schools 
FOR SELECT TO authenticated USING (true);

-- B. Branches (Contextual)
CREATE POLICY "Branches are viewable by school members" ON public.branches
FOR SELECT TO authenticated USING (school_id = public.get_school_id());

-- C. General Entity Policy (The Bouncer)
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
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
            -- INSERT/UPDATE/DELETE/SELECT Policy
            EXECUTE format(
                'CREATE POLICY "Strict Isolation Enforcement" ON public.%I
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

-- D. Users / Profiles (Self-Access + Admin View)
CREATE POLICY "Users Self Access" ON public.users FOR ALL TO authenticated 
USING (id = auth.uid() OR role = 'admin') 
WITH CHECK (id = auth.uid() OR role = 'admin');

CREATE POLICY "Profiles Self Access" ON public.profiles FOR ALL TO authenticated 
USING (id = auth.uid() OR role = 'admin') 
WITH CHECK (id = auth.uid() OR role = 'admin');

-- 3. REVOKE ALL FROM ANON
-- This ensures the "Hacker Test" (using anon key) will ALWAYS fail with 403 or RLS block
-- except for specific safe operations if any.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.schools TO anon; -- Allow identifying school for login

COMMIT;
