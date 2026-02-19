-- ============================================================
-- FINAL HYBRID SECURITY FIX (VER 6 - ULTIMATE RESILIENCE + ROLE)
-- Fixes: Metadata mismatch, Case-insensitivity, Auth refresh.
-- ============================================================

-- 1. SUPER-SMART HELPERS (Checks App and User Metadata)
CREATE OR REPLACE FUNCTION public.get_school_id() RETURNS uuid AS $$
DECLARE
  claims jsonb := current_setting('request.jwt.claims', true)::jsonb;
  sid text;
BEGIN
  -- Try App Metadata first, then User Metadata
  sid := COALESCE(
    claims -> 'app_metadata' ->> 'school_id',
    claims -> 'user_metadata' ->> 'school_id',
    claims ->> 'school_id'
  );
  
  -- If JWT is empty/missing (possible during specialized auth flows), fallback to profile
  -- BUT ONLY if the JWT claim is actually missing, to avoid extra DB hits.
  IF sid IS NULL OR sid = '' THEN
    SELECT school_id::text INTO sid FROM public.profiles WHERE id = auth.uid();
  END IF;

  RETURN NULLIF(sid, '')::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_branch_id() RETURNS uuid AS $$
DECLARE
  claims jsonb := current_setting('request.jwt.claims', true)::jsonb;
  bid text;
BEGIN
  bid := COALESCE(
    claims -> 'app_metadata' ->> 'branch_id',
    claims -> 'user_metadata' ->> 'branch_id',
    claims -> 'app_metadata' ->> 'active_branch_id',
    claims -> 'user_metadata' ->> 'active_branch_id'
  );
  RETURN NULLIF(bid, '')::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_role() RETURNS text AS $$
DECLARE
  claims jsonb := current_setting('request.jwt.claims', true)::jsonb;
  r text;
BEGIN
  -- 1. Try JWT
  r := COALESCE(
    claims -> 'app_metadata' ->> 'role',
    claims -> 'user_metadata' ->> 'role',
    claims ->> 'role'
  );
  
  -- 2. Fallback to DB if missing or generic
  -- We treat 'authenticated' or 'user' as generic Supabase roles, not our App roles.
  IF r IS NULL OR r = '' OR r = 'authenticated' OR r = 'user' THEN 
      SELECT role::text INTO r FROM public.profiles WHERE id = auth.uid();
  END IF;

  RETURN LOWER(COALESCE(r, 'guest'));
EXCEPTION WHEN OTHERS THEN RETURN 'guest';
END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. RESET ALL POLICIES (Start Clean)
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. APPLY RESILIENT POLICIES
DO $$ 
DECLARE 
    t text;
    has_branch_col boolean;
    tables_to_secure text[] := ARRAY['students', 'teachers', 'classes', 'parents', 'payments', 'student_fees', 'student_attendance', 'notices', 'transport_buses', 'quizzes', 'quiz_questions'];
BEGIN
    -- Special Case: Profiles
    CREATE POLICY tenant_isolation_profiles ON public.profiles FOR ALL TO authenticated USING (school_id = public.get_school_id());
    
    -- Special Case: Schools
    CREATE POLICY tenant_isolation_schools ON public.schools FOR SELECT TO authenticated USING (id = public.get_school_id());

    -- Special Case: Branches
    CREATE POLICY tenant_isolation_branches ON public.branches FOR SELECT TO authenticated USING (school_id = public.get_school_id());

    FOREACH t IN ARRAY tables_to_secure LOOP
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'branch_id') INTO has_branch_col;

        IF has_branch_col THEN
            EXECUTE format('
                CREATE POLICY tenant_isolation_%I ON public.%I 
                FOR ALL TO authenticated 
                USING (
                    school_id = public.get_school_id() 
                    AND (
                        public.get_role() IN (''proprietor'', ''super_admin'', ''admin'')
                        OR branch_id = public.get_branch_id()
                        OR public.get_branch_id() IS NULL -- Allow view if no branch context set
                    )
                )', t, t);
        ELSE
            EXECUTE format('CREATE POLICY tenant_isolation_%I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_school_id())', t, t);
        END IF;
    END LOOP;
END $$;

-- 4. FINAL PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role() TO authenticated;

-- Force Enable RLS globally
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;
ALTER TABLE public.teachers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parents FORCE ROW LEVEL SECURITY;
