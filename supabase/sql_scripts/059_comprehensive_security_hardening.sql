-- Migration: 0097 Comprehensive Security Hardening
-- Description: Sets explicit search_path for all public SQL functions to prevent path hijacking.

BEGIN;

-- 1. invite_staff_member
ALTER FUNCTION public.invite_staff_member(UUID, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;

-- 2. handle_invited_user
ALTER FUNCTION public.handle_invited_user() SET search_path = public, pg_temp;

-- 3. handle_new_school_signup
ALTER FUNCTION public.handle_new_school_signup() SET search_path = public, pg_temp;

-- 4. get_user_dashboard_route
ALTER FUNCTION public.get_user_dashboard_route(UUID) SET search_path = public, pg_temp;

-- 5. initialize_school_settings
ALTER FUNCTION public.initialize_school_settings(UUID) SET search_path = public, pg_temp;

-- 6. create_school_and_admin
ALTER FUNCTION public.create_school_and_admin(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;

-- 7. get_school_id
ALTER FUNCTION public.get_school_id() SET search_path = public, pg_temp;

-- 8. sync_user_metadata
ALTER FUNCTION public.sync_user_metadata(UUID) SET search_path = public, pg_temp;

-- 9. on_school_id_change_sync
ALTER FUNCTION public.on_school_id_change_sync() SET search_path = public, pg_temp;

-- 10. authenticate_user
-- Note: Already has SET search_path = public in 0095, upgrading to include pg_temp
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'authenticate_user') THEN
        ALTER FUNCTION public.authenticate_user(TEXT, TEXT) SET search_path = public, pg_temp;
    END IF;
END $$;

-- 11. clone_school_data
-- Note: Already has SET search_path = public in 0091, upgrading to include pg_temp
ALTER FUNCTION public.clone_school_data(UUID, UUID) SET search_path = public, pg_temp;

-- 12. link_student_to_parent
-- Note: Already has SET search_path = public in 0091, upgrading to include pg_temp
ALTER FUNCTION public.link_student_to_parent(TEXT, TEXT) SET search_path = public, pg_temp;

COMMIT;
