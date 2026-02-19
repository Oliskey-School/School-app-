
-- Fix RLS Permissions and Grants
-- Target: Ensure 'authenticated' users can insert/update for the Demo School

BEGIN;

-- 1. Grant Usage/Execute defaults (Fix potential Trigger/Sequence issues)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 2. Explicitly Grant Table Permissions (redundant but safe)
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.teachers TO authenticated;
GRANT ALL ON TABLE public.parents TO authenticated;
GRANT ALL ON TABLE public.users TO authenticated; -- Legacy users table

-- 3. Recreate RLS Policies for TEACHERS
DROP POLICY IF EXISTS "tenant_isolation_teachers" ON public.teachers;
DROP POLICY IF EXISTS "teachers_select_policy" ON public.teachers;
DROP POLICY IF EXISTS "teachers_write_policy" ON public.teachers;

-- Policy for SELECT (Read)
CREATE POLICY "teachers_select_policy" ON public.teachers
FOR SELECT
TO authenticated, anon
USING (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
);

-- Policy for ALL (Insert/Update/Delete) - Explicitly checking School ID provided in row
CREATE POLICY "teachers_write_policy" ON public.teachers
FOR ALL
TO authenticated
USING (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
)
WITH CHECK (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
);


-- 4. Recreate RLS Policies for STUDENTS
DROP POLICY IF EXISTS "tenant_isolation_students" ON public.students;
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
DROP POLICY IF EXISTS "students_write_policy" ON public.students;

CREATE POLICY "students_select_policy" ON public.students
FOR SELECT
TO authenticated, anon
USING (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
);

CREATE POLICY "students_write_policy" ON public.students
FOR ALL
TO authenticated
USING (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
)
WITH CHECK (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
);


-- 5. Recreate RLS Policies for PARENTS
DROP POLICY IF EXISTS "tenant_isolation_parents" ON public.parents;
DROP POLICY IF EXISTS "parents_select_policy" ON public.parents;
DROP POLICY IF EXISTS "parents_write_policy" ON public.parents;

CREATE POLICY "parents_select_policy" ON public.parents
FOR SELECT
TO authenticated, anon
USING (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
);

CREATE POLICY "parents_write_policy" ON public.parents
FOR ALL
TO authenticated
USING (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
)
WITH CHECK (
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid 
    OR 
    school_id = get_school_id()
);

COMMIT;
