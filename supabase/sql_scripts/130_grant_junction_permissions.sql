-- Grant SELECT permissions on junction tables for anon and authenticated roles
-- This allows the frontend to fetch teachers with their subjects/classes and parents with children

-- Teacher junction tables
GRANT SELECT ON public.teacher_subjects TO anon, authenticated;
GRANT SELECT ON public.teacher_classes TO anon, authenticated;

-- Parent junction tables
GRANT SELECT ON public.parent_children TO anon, authenticated;

-- If these tables don't exist, check for alternatives
GRANT SELECT ON public.student_parent_links TO anon, authenticated;
GRANT SELECT ON public.class_teachers TO anon, authenticated;
GRANT SELECT ON public.teacher_assignments TO anon, authenticated;
