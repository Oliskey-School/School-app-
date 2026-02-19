-- ============================================================
-- DEMO BYPASS FIX (VER 2): ALLOW VISIBILITY FOR OLISKEY SCHOOL
-- ============================================================

-- 1. GRANT BASIC PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 2. APPLY THE BYPASS TO ALL DATA TABLES
DO $$ 
DECLARE 
    t text;
    oliskey_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    -- List of tables that have a 'school_id' column
    tables_to_fix text[] := ARRAY['students', 'teachers', 'classes', 'parents', 'branches', 'payments', 'student_fees'];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        -- Remove old policy to prevent conflicts
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON public.%I', t, t);

        -- Create the new Hybrid Policy:
        -- Allows access if the row belongs to Oliskey School OR matches the user's JWT school_id
        EXECUTE format('
            CREATE POLICY tenant_isolation_%I ON public.%I 
            FOR ALL TO anon, authenticated 
            USING (
                school_id = %L 
                OR school_id = public.get_school_id()
            )', t, t, oliskey_id);
            
        -- Ensure RLS is active
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 3. FIX FOR SCHOOLS TABLE (Uses 'id' instead of 'school_id')
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_schools ON public.schools;
CREATE POLICY tenant_isolation_schools ON public.schools 
FOR SELECT TO anon, authenticated 
USING (id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' OR id = public.get_school_id());
