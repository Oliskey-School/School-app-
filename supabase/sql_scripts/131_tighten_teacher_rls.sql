-- Tighten RLS Policies for Teachers
-- Description: Enforces that teachers can only see/access data assigned to them by an Admin.
-- This version uses dynamic SQL to avoid errors if columns like 'teacher_id' are missing.

SET search_path TO public;

BEGIN;

-- 1. Helper Functions (Ensure they exist and are robust)
CREATE OR REPLACE FUNCTION public.get_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Classes RLS
DROP POLICY IF EXISTS "teachers_view_assigned_classes" ON public.classes;
CREATE POLICY "teachers_view_assigned_classes"
ON public.classes FOR SELECT
TO authenticated
USING (
  (public.get_role() = 'admin') OR
  (public.get_role() = 'teacher' AND (
    EXISTS (SELECT 1 FROM public.class_teachers ct WHERE ct.class_id = public.classes.id AND ct.teacher_id = public.get_teacher_id()) OR
    EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.class_name = public.classes.name AND tc.teacher_id = public.get_teacher_id())
  ))
);

-- 3. Subjects RLS
DROP POLICY IF EXISTS "teachers_view_assigned_subjects" ON public.subjects;
CREATE POLICY "teachers_view_assigned_subjects"
ON public.subjects FOR SELECT
TO authenticated
USING (
  (public.get_role() = 'admin') OR
  (public.get_role() = 'teacher' AND (
    EXISTS (SELECT 1 FROM public.class_teachers ct WHERE ct.subject_id = public.subjects.id AND ct.teacher_id = public.get_teacher_id()) OR
    EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.subject = public.subjects.name AND ts.teacher_id = public.get_teacher_id())
  ))
);

-- 4. Dynamic RLS for Teacher-Owned Tables
DO $$ 
DECLARE 
    t text;
    has_teacher_id boolean;
    tables_to_secure text[] := ARRAY['assignments', 'exams', 'lesson_notes', 'quizzes', 'cbt_exams'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            
            -- Check if table has teacher_id column
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = t 
                AND column_name = 'teacher_id'
            ) INTO has_teacher_id;

            -- Drop existing policies
            EXECUTE format('DROP POLICY IF EXISTS teachers_manage_own_%I ON public.%I', t, t);

            IF has_teacher_id THEN
                -- Apply Policy using teacher_id
                EXECUTE format('
                    CREATE POLICY teachers_manage_own_%I ON public.%I FOR ALL TO authenticated 
                    USING (
                        (public.get_role() = ''admin'') OR 
                        (public.get_role() = ''teacher'' AND teacher_id = public.get_teacher_id())
                    )
                    WITH CHECK (
                        (public.get_role() = ''admin'') OR 
                        (public.get_role() = ''teacher'' AND teacher_id = public.get_teacher_id())
                    )', t, t);
                RAISE NOTICE 'Applied teacher_id RLS to %', t;
            ELSE
                -- Fallback: Basic school-level isolation if teacher_id is missing
                EXECUTE format('
                    CREATE POLICY teachers_manage_own_%I ON public.%I FOR ALL TO authenticated 
                    USING (
                        (public.get_role() = ''admin'') OR 
                        (public.get_role() = ''teacher'' AND school_id = public.get_school_id())
                    )
                    WITH CHECK (
                        (public.get_role() = ''admin'') OR 
                        (public.get_role() = ''teacher'' AND school_id = public.get_school_id())
                    )', t, t);
                RAISE NOTICE 'Applied school_id only RLS to % (No teacher_id column)', t;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 5. Student Attendance RLS
DROP POLICY IF EXISTS "teachers_manage_assigned_attendance" ON public.student_attendance;
CREATE POLICY "teachers_manage_assigned_attendance"
ON public.student_attendance FOR ALL
TO authenticated
USING (
  (public.get_role() = 'admin') OR
  (public.get_role() = 'teacher' AND (
    EXISTS (SELECT 1 FROM public.class_teachers ct WHERE ct.class_id = public.student_attendance.class_id AND ct.teacher_id = public.get_teacher_id())
  ))
)
WITH CHECK (
  (public.get_role() = 'admin') OR
  (public.get_role() = 'teacher' AND (
    EXISTS (SELECT 1 FROM public.class_teachers ct WHERE ct.class_id = public.student_attendance.class_id AND ct.teacher_id = public.get_teacher_id())
  ))
);

-- 6. Academic Performance RLS
DROP POLICY IF EXISTS "teachers_manage_assigned_performance" ON public.academic_performance;
CREATE POLICY "teachers_manage_assigned_performance"
ON public.academic_performance FOR ALL
TO authenticated
USING (
  (public.get_role() = 'admin') OR
  (public.get_role() = 'teacher' AND (
    EXISTS (
        SELECT 1 FROM public.class_teachers ct 
        JOIN public.subjects sub ON ct.subject_id = sub.id
        WHERE sub.name = public.academic_performance.subject 
        AND ct.teacher_id = public.get_teacher_id()
    ) OR
    EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.subject = public.academic_performance.subject AND ts.teacher_id = public.get_teacher_id())
  ))
)
WITH CHECK (
  (public.get_role() = 'admin') OR
  (public.get_role() = 'teacher' AND (
    EXISTS (
        SELECT 1 FROM public.class_teachers ct 
        JOIN public.subjects sub ON ct.subject_id = sub.id
        WHERE sub.name = public.academic_performance.subject 
        AND ct.teacher_id = public.get_teacher_id()
    ) OR
    EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.subject = public.academic_performance.subject AND ts.teacher_id = public.get_teacher_id())
  ))
);

COMMIT;
