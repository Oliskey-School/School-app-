-- Migration: Performance Tuning & Security Hardening
-- Description: Adds missing indexes, updates statistics, and secures the authenticate_user function.

BEGIN;

-- 1. Create targeted indexes for RLS and Auth
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_public_users_email ON public.users(email);

-- 2. Update table statistics for the query planner
ANALYZE public.users;
ANALYZE public.school_memberships;
ANALYZE public.students;
ANALYZE public.teachers;
ANALYZE public.profiles;

-- 3. Hardening authenticate_user function
-- We check if it exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'authenticate_user') THEN
        ALTER FUNCTION public.authenticate_user(TEXT, TEXT) SET search_path = public;
    END IF;
END $$;

COMMIT;
