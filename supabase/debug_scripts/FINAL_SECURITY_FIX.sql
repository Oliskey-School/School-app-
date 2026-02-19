-- ============================================================
-- FINAL PRODUCTION SECURITY HARDENING (VER 3 - ROBUST)
-- Fixes: Case-insensitive roles, Admin branch-bypass.
-- ============================================================

-- 1. ENABLE RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- 2. CREATE HELPERS (Improved)
CREATE OR REPLACE FUNCTION public.get_school_id() RETURNS uuid AS $$
BEGIN
  RETURN (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'school_id', ''))::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_branch_id() RETURNS uuid AS $$
BEGIN
  RETURN (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'branch_id', ''))::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_role() RETURNS text AS $$
BEGIN
  -- Force lower-case for comparison consistency
  RETURN LOWER(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role');
EXCEPTION WHEN OTHERS THEN RETURN 'guest';
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. CORE POLICIES
DROP POLICY IF EXISTS "tenant_isolation_schools" ON public.schools;
CREATE POLICY "tenant_isolation_schools" ON public.schools FOR SELECT TO authenticated USING (id = public.get_school_id());

DROP POLICY IF EXISTS "branch_isolation_branches" ON public.branches;
CREATE POLICY "branch_isolation_branches" ON public.branches FOR SELECT TO authenticated USING (school_id = public.get_school_id());

DROP POLICY IF EXISTS "school_isolation_profiles" ON public.profiles;
CREATE POLICY "school_isolation_profiles" ON public.profiles FOR SELECT TO authenticated USING (school_id = public.get_school_id());

-- 4. SMART BULK APPLY (Admin Bypass Fixed)
DO $$ 
DECLARE 
    t text;
    has_branch_col boolean;
    tables_to_secure text[] := ARRAY['students', 'teachers', 'classes', 'parents', 'payments', 'student_fees', 'student_attendance', 'notices', 'transport_buses', 'quizzes', 'quiz_questions'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t 
            AND column_name = 'branch_id'
        ) INTO has_branch_col;

        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON public.%I', t, t);

        IF has_branch_col THEN
            -- Admin can see ALL branches in their school.
            -- Non-admins only see their assigned branch.
            EXECUTE format('
                CREATE POLICY tenant_isolation_%I ON public.%I 
                FOR ALL TO authenticated 
                USING (
                    school_id = public.get_school_id() 
                    AND (
                        public.get_role() IN (''proprietor'', ''super_admin'', ''admin'')
                        OR branch_id = public.get_branch_id()
                    )
                )', t, t);
        ELSE
            -- Basic school isolation for global tables
            EXECUTE format('CREATE POLICY tenant_isolation_%I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_school_id())', t, t);
        END IF;
    END LOOP;
END $$;

-- 5. GRANTS
GRANT EXECUTE ON FUNCTION public.get_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role() TO authenticated;
