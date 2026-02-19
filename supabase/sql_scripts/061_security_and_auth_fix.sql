-- Migration: 0099 Security Hardening and Auth Fix
-- Description: Sets search_path for internal functions and implements missing authenticate_user RPC.

BEGIN;

-- 1. Tighten schools RLS policy
-- The "Allow school creation via RPC" was too permissive (WITH CHECK true)
DROP POLICY IF EXISTS "Allow school creation via RPC" ON public.schools;
CREATE POLICY "Allow school creation via RPC" ON public.schools
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- 2. Implement missing authenticate_user function
-- This is used by lib/auth.ts to allow login via username/password against auth_accounts
CREATE OR REPLACE FUNCTION public.authenticate_user(username_input TEXT, password_input TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    school_id UUID,
    user_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.user_id as id,
        a.email,
        lower(a.user_type) as role,
        a.school_id,
        a.user_id
    FROM public.auth_accounts a
    WHERE lower(a.username) = lower(username_input)
      AND a.password = password_input
      AND a.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT) TO anon, authenticated, service_role;

-- 3. Hardening: Set search_path for remaining functions reported by linter
-- This prevents search path hijacking attacks.

-- check_tenant_user_limit()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_tenant_user_limit') THEN
        ALTER FUNCTION public.check_tenant_user_limit() SET search_path = public, pg_temp;
    END IF;
END $$;

-- clone_school_data(uuid,uuid)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'clone_school_data') THEN
        ALTER FUNCTION public.clone_school_data(UUID, UUID) SET search_path = public, pg_temp;
    END IF;
END $$;

-- ensure_user_school_id()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ensure_user_school_id') THEN
        ALTER FUNCTION public.ensure_user_school_id() SET search_path = public, pg_temp;
    END IF;
END $$;

-- generate_school_role_id(text)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_school_role_id') THEN
        ALTER FUNCTION public.generate_school_role_id(TEXT) SET search_path = public, pg_temp;
    END IF;
END $$;

-- get_my_school_id()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_school_id') THEN
        ALTER FUNCTION public.get_my_school_id() SET search_path = public, pg_temp;
    END IF;
END $$;

-- handle_new_user()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
    END IF;
END $$;

-- link_student_to_parent(text,text)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'link_student_to_parent') THEN
        ALTER FUNCTION public.link_student_to_parent(TEXT, TEXT) SET search_path = public, pg_temp;
    END IF;
END $$;

-- set_parent_generated_id()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_parent_generated_id') THEN
        ALTER FUNCTION public.set_parent_generated_id() SET search_path = public, pg_temp;
    END IF;
END $$;

-- set_student_generated_id()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_student_generated_id') THEN
        ALTER FUNCTION public.set_student_generated_id() SET search_path = public, pg_temp;
    END IF;
END $$;

-- set_teacher_generated_id()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_teacher_generated_id') THEN
        ALTER FUNCTION public.set_teacher_generated_id() SET search_path = public, pg_temp;
    END IF;
END $$;

-- update_school_user_count()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_school_user_count') THEN
        ALTER FUNCTION public.update_school_user_count() SET search_path = public, pg_temp;
    END IF;
END $$;

-- update_updated_at_column()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
    END IF;
END $$;

COMMIT;
