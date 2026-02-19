-- ============================================================
-- URGENT: WIPE AND RE-SECURE OFFENDING TABLES
-- ============================================================

-- 1. DROP ALL OLD POLICIES (Aggressive Cleanup)
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('students', 'teachers', 'classes', 'parents')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. FORCE ENABLE RLS
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;
ALTER TABLE public.teachers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parents FORCE ROW LEVEL SECURITY;

-- 3. APPLY THE "FORTRESS" POLICY
DO $$ 
DECLARE 
    t text;
    tables_to_secure text[] := ARRAY['students', 'teachers', 'classes', 'parents'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        EXECUTE format('
            CREATE POLICY tenant_isolation_%I ON public.%I
            FOR ALL TO authenticated
            USING (
                school_id = public.get_school_id() 
                AND (
                    branch_id = public.get_branch_id() 
                    OR public.get_role() IN (''proprietor'', ''super_admin'', ''admin'')
                )
            )', t, t);
    END LOOP;
END $$;

-- 4. VERIFY NO REMAINING PUBLIC ACCESS
REVOKE ALL ON public.students FROM anon;
REVOKE ALL ON public.teachers FROM anon;
REVOKE ALL ON public.classes FROM anon;
REVOKE ALL ON public.parents FROM anon;

-- Grant only basic usage (needed for the system to function)
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.teachers TO authenticated;
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.parents TO authenticated;
