ALTER TABLE public.students FORCE ROW LEVEL SECURITY;
ALTER TABLE public.teachers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parents FORCE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('students', 'teachers', 'classes', 'parents')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

DO $$ 
DECLARE 
    t text;
    tables_to_secure text[] := ARRAY['students', 'teachers', 'classes', 'parents'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        EXECUTE format('CREATE POLICY tenant_isolation_%I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_school_id() AND (branch_id = public.get_branch_id() OR public.get_role() IN (''proprietor'', ''super_admin'', ''admin'')))', t, t);
    END LOOP;
END $$;
