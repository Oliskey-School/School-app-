-- Migration: 166_branch_isolation_rls.sql
-- Phase 4: Branch Isolation Hardening
--
-- Fixes:
--   1. RLS helper functions queried `profiles` but new users only exist in `users`.
--      Updated helpers to use `users` as the source of truth.
--   2. `get_school_id()` had a copy-paste bug — step 2 re-read app_metadata instead
--      of user_metadata.
--   3. Added `is_main_school_admin()` to distinguish the school-level admin (no
--      branch_id) from a branch admin (branch_id set).  Branch admins should not
--      bypass branch filtering in RLS.
--   4. Updated RLS on students / teachers / classes to use `is_main_school_admin`.
--   5. Added trigger to keep `profiles` in sync with `users` for backward
--      compatibility with any code that still references `profiles`.
--   6. Fixed 2 demo classes that had NULL branch_id (assigned to main branch).

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Fix get_school_id() — use users table, fix user_metadata fallback
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_school_id()
RETURNS UUID AS $$
DECLARE
    _school_id UUID;
BEGIN
    -- 1. app_metadata (set by backend / onboarding)
    _school_id := (NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''))::UUID;
    IF _school_id IS NOT NULL THEN RETURN _school_id; END IF;

    -- 2. user_metadata (set at sign-up time)
    _school_id := (NULLIF(auth.jwt() -> 'user_metadata' ->> 'school_id', ''))::UUID;
    IF _school_id IS NOT NULL THEN RETURN _school_id; END IF;

    -- 3. Physical lookup in users table (source of truth for profiles)
    SELECT school_id INTO _school_id FROM public.users WHERE id = auth.uid();
    IF _school_id IS NOT NULL THEN RETURN _school_id; END IF;

    -- 4. Fallback to profiles table (legacy)
    SELECT school_id INTO _school_id FROM public.profiles WHERE id = auth.uid();

    RETURN COALESCE(_school_id, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Fix get_branch_id() — use users table, not profiles
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_branch_id()
RETURNS UUID AS $$
DECLARE
    claims JSONB := current_setting('request.jwt.claims', true)::JSONB;
    bid TEXT;
BEGIN
    -- 1. app_metadata (authoritative — set by backend)
    bid := COALESCE(
        claims -> 'app_metadata' ->> 'branch_id',
        claims -> 'app_metadata' ->> 'active_branch_id'
    );

    -- 2. Lookup in users table (more up-to-date than JWT for branch changes)
    IF (bid IS NULL OR bid = '') AND auth.uid() IS NOT NULL THEN
        SELECT branch_id::TEXT INTO bid FROM public.users WHERE id = auth.uid();
    END IF;

    -- 3. Legacy profiles fallback
    IF (bid IS NULL OR bid = '') AND auth.uid() IS NOT NULL THEN
        SELECT branch_id::TEXT INTO bid FROM public.profiles WHERE id = auth.uid();
    END IF;

    -- NOTE: user_metadata is intentionally NOT used — users could self-set it.

    RETURN NULLIF(bid, '')::UUID;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Fix is_school_admin() — use users table, not profiles
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_school_admin(p_school_id UUID)
RETURNS BOOLEAN AS $$
    SELECT public.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.school_id = p_school_id
          AND sm.user_id = auth.uid()
          AND sm.base_role IN ('school_admin', 'admin', 'proprietor')
          AND sm.is_active = TRUE
    )
    OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.school_id = p_school_id
          AND u.role IN ('admin', 'school_admin', 'proprietor')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. NEW: is_main_school_admin()
--    Returns true only for the school-level admin (no branch_id restriction).
--    Branch admins have branch_id set on their users row and should NOT bypass
--    branch filtering.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_main_school_admin(p_school_id UUID)
RETURNS BOOLEAN AS $$
    SELECT public.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.school_id = p_school_id
          AND u.role IN ('admin', 'school_admin', 'proprietor')
          AND u.branch_id IS NULL   -- main admin has no branch restriction
    )
    OR EXISTS (
        SELECT 1 FROM public.school_memberships sm
        JOIN public.users u ON u.id = sm.user_id
        WHERE sm.school_id = p_school_id
          AND sm.user_id = auth.uid()
          AND sm.base_role IN ('school_admin', 'admin', 'proprietor')
          AND sm.is_active = TRUE
          AND u.branch_id IS NULL   -- only if not branch-scoped
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Update RLS on students — branch admins must not bypass branch filter
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation" ON public.students;

CREATE POLICY "tenant_isolation" ON public.students
    FOR ALL USING (
        school_id = current_school_id()
        AND (
            is_main_school_admin(school_id)     -- main admin: sees all branches
            OR branch_id IS NULL                -- unscoped records visible to all
            OR branch_id = current_branch_id()  -- branch-scoped record matches user
        )
    );

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Update RLS on teachers
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation" ON public.teachers;

CREATE POLICY "tenant_isolation" ON public.teachers
    FOR ALL USING (
        school_id = current_school_id()
        AND (
            is_main_school_admin(school_id)
            OR branch_id IS NULL
            OR branch_id = current_branch_id()
        )
    );

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Update RLS on classes
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation" ON public.classes;

CREATE POLICY "tenant_isolation" ON public.classes
    FOR ALL USING (
        school_id = current_school_id()
        AND (
            is_main_school_admin(school_id)
            OR branch_id IS NULL
            OR branch_id = current_branch_id()
        )
    );

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Keep profiles in sync with users (backward compatibility)
--    Any upsert on users also upserts the matching profiles row.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_users_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, email, full_name, school_id, branch_id, role, school_generated_id, is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.full_name, NEW.name),
        NEW.school_id,
        NEW.branch_id,
        NEW.role,
        NEW.school_generated_id,
        COALESCE(NEW.is_active, TRUE)
    )
    ON CONFLICT (id) DO UPDATE SET
        email              = EXCLUDED.email,
        full_name          = EXCLUDED.full_name,
        school_id          = EXCLUDED.school_id,
        branch_id          = EXCLUDED.branch_id,
        role               = EXCLUDED.role,
        school_generated_id = EXCLUDED.school_generated_id,
        is_active          = EXCLUDED.is_active,
        updated_at         = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_sync_users_to_profiles ON public.users;
CREATE TRIGGER tr_sync_users_to_profiles
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_users_to_profiles();

-- Backfill existing users → profiles
INSERT INTO public.profiles (
    id, email, full_name, school_id, branch_id, role, school_generated_id, is_active
)
SELECT
    u.id,
    u.email,
    COALESCE(u.full_name, u.name),
    u.school_id,
    u.branch_id,
    u.role,
    u.school_generated_id,
    COALESCE(u.is_active, TRUE)
FROM public.users u
ON CONFLICT (id) DO UPDATE SET
    email              = EXCLUDED.email,
    full_name          = EXCLUDED.full_name,
    school_id          = EXCLUDED.school_id,
    branch_id          = EXCLUDED.branch_id,
    role               = EXCLUDED.role,
    school_generated_id = EXCLUDED.school_generated_id,
    is_active          = EXCLUDED.is_active,
    updated_at         = NOW();

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Fix demo classes with NULL branch_id
-- ───────────────────────────────────────────────────────────────────────────
UPDATE public.classes
SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
  AND branch_id IS NULL;

COMMIT;
