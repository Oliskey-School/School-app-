-- ==========================================
-- SECURITY HARDENING: MULTI-TENANT ISOLATION (FIXED)
-- Objective: School A cannot see School B.
--            Branch A cannot see Branch B (unless Proprietor).
-- ==========================================

-- 1. CREATE HELPER FUNCTIONS IN PUBLIC SCHEMA
CREATE OR REPLACE FUNCTION public.get_school_id() 
RETURNS uuid AS $$
BEGIN
  RETURN (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'school_id', ''))::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_branch_id() 
RETURNS uuid AS $$
BEGIN
  RETURN (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'branch_id', ''))::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_role() 
RETURNS text AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role';
EXCEPTION WHEN OTHERS THEN
  RETURN 'guest';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. ENABLE RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. APPLY POLICIES

-- SCHOOLS
DROP POLICY IF EXISTS "tenant_isolation_schools" ON public.schools;
CREATE POLICY "tenant_isolation_schools" ON public.schools
FOR SELECT TO authenticated
USING (id = public.get_school_id());

-- BRANCHES
DROP POLICY IF EXISTS "branch_isolation_branches" ON public.branches;
CREATE POLICY "branch_isolation_branches" ON public.branches
FOR SELECT TO authenticated
USING (
    school_id = public.get_school_id() 
    AND (
        id = public.get_branch_id() 
        OR public.get_role() IN ('proprietor', 'super_admin', 'admin')
    )
);

-- STUDENTS
DROP POLICY IF EXISTS "branch_isolation_students" ON public.students;
CREATE POLICY "branch_isolation_students" ON public.students
FOR ALL TO authenticated
USING (
    school_id = public.get_school_id() 
    AND (
        branch_id = public.get_branch_id() 
        OR public.get_role() IN ('proprietor', 'super_admin')
    )
);

-- PROFILES
DROP POLICY IF EXISTS "school_isolation_profiles" ON public.profiles;
CREATE POLICY "school_isolation_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (school_id = public.get_school_id());

-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role() TO authenticated;
