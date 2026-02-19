-- Migration: Fix Function Search Path Mutable Warnings
-- Description: Sets explicit search_path for functions to prevent hijacking.

BEGIN;

-- 1. set_teacher_generated_id
ALTER FUNCTION public.set_teacher_generated_id() SET search_path = public;

-- 2. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 3. set_student_generated_id
ALTER FUNCTION public.set_student_generated_id() SET search_path = public;

-- 4. set_parent_generated_id
ALTER FUNCTION public.set_parent_generated_id() SET search_path = public;

-- 5. link_student_to_parent
ALTER FUNCTION public.link_student_to_parent(TEXT, TEXT) SET search_path = public;

-- 6. generate_school_role_id
ALTER FUNCTION public.generate_school_role_id(TEXT) SET search_path = public;

-- 7. clone_school_data
ALTER FUNCTION public.clone_school_data(UUID, UUID) SET search_path = public;

-- 8. handle_new_school_signup
ALTER FUNCTION public.handle_new_school_signup() SET search_path = public;

COMMIT;
