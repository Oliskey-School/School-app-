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

-- 2. CREATE HELPERS
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
  RETURN current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role';
EXCEPTION WHEN OTHERS THEN RETURN 'guest';
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. CORE POLICIES
DROP POLICY IF EXISTS "tenant_isolation_schools" ON public.schools;
CREATE POLICY "tenant_isolation_schools" ON public.schools FOR SELECT TO authenticated USING (id = public.get_school_id());

DROP POLICY IF EXISTS "branch_isolation_branches" ON public.branches;
CREATE POLICY "branch_isolation_branches" ON public.branches FOR SELECT TO authenticated USING (school_id = public.get_school_id());

DROP POLICY IF EXISTS "school_isolation_profiles" ON public.profiles;
CREATE POLICY "school_isolation_profiles" ON public.profiles FOR SELECT TO authenticated USING (school_id = public.get_school_id());

-- 4. SMART BULK APPLY (Checks for column existence)
DO $$ 
DECLARE 
    t text;
    has_branch_col boolean;
    tables_to_secure text[] := ARRAY['students', 'teachers', 'classes', 'parents', 'payments', 'student_fees', 'student_attendance', 'notices', 'transport_buses', 'quizzes', 'quiz_questions'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        -- Check if table has branch_id column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t 
            AND column_name = 'branch_id'
        ) INTO has_branch_col;

        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON public.%I', t, t);

        IF has_branch_col THEN
            -- Apply School + Branch Isolation
            EXECUTE format('CREATE POLICY tenant_isolation_%I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_school_id() AND (branch_id = public.get_branch_id() OR public.get_role() IN (''proprietor'', ''super_admin'', ''admin'')))', t, t);
            RAISE NOTICE 'Applied Branch isolation to %', t;
        ELSE
            -- Apply School-only Isolation
            EXECUTE format('CREATE POLICY tenant_isolation_%I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_school_id())', t, t);
            RAISE NOTICE 'Applied School-only isolation to % (No branch_id column)', t;
        END IF;
    END LOOP;
END $$;

-- 5. GRANTS
GRANT EXECUTE ON FUNCTION public.get_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role() TO authenticated;
