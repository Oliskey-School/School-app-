
-- TEMP ALLOW ANON INSERT
-- WARNING: This is for debugging only.
-- If this works, it means the frontend is definitely not sending the Auth Token correctly.

BEGIN;

-- 1. Grant INSERT to anon
GRANT INSERT ON TABLE public.teachers TO anon;
GRANT INSERT ON TABLE public.students TO anon;
GRANT INSERT ON TABLE public.parents TO anon;
GRANT INSERT ON TABLE public.users TO anon; -- Legacy users

-- 2. Update RLS Policy to allow anon for ALL operations (if school_id matches)
DROP POLICY IF EXISTS "teachers_write_policy" ON public.teachers;

CREATE POLICY "teachers_write_policy" ON public.teachers
FOR ALL
TO authenticated, anon -- ADDED ANON
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

-- Same for Students
DROP POLICY IF EXISTS "students_write_policy" ON public.students;

CREATE POLICY "students_write_policy" ON public.students
FOR ALL
TO authenticated, anon
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

-- Same for Parents
DROP POLICY IF EXISTS "parents_write_policy" ON public.parents;

CREATE POLICY "parents_write_policy" ON public.parents
FOR ALL
TO authenticated, anon
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
