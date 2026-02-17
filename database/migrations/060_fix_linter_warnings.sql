-- Migration: 0098 Fix Database Linter Warnings
-- Description: Optimizes RLS policies and consolidates duplicates to resolve reported performance and redundancy issues.

BEGIN;

-- 1. Fix Users Table Policies (auth_rls_initplan & multiple_permissive_policies)
-- Consolidate into a single optimized policy using (select auth.uid())
DROP POLICY IF EXISTS "Admins can create users in their school" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles in same school" ON public.users;
DROP POLICY IF EXISTS "users_unified" ON public.users;
DROP POLICY IF EXISTS "Allow initial setup" ON public.users;
DROP POLICY IF EXISTS "Self-management" ON public.users;

CREATE POLICY "users_unified" ON public.users
    FOR ALL
    TO authenticated
    USING (
        id = (select auth.uid()) 
        OR school_id = (SELECT public.get_school_id())
        OR public.is_school_admin(school_id)
    )
    WITH CHECK (
        id = (select auth.uid())
        OR public.is_school_admin(school_id)
    );

-- 2. Fix Parents Table Policy (auth_rls_initplan)
-- Update existing policy to use (select auth.uid()) for subqueries
DROP POLICY IF EXISTS parents_unified ON public.parents;

CREATE POLICY "parents_unified" ON public.parents
    FOR ALL
    TO authenticated
    USING (
        public.is_school_admin(school_id)
        OR (user_id = (select auth.uid()))
        OR EXISTS (
            SELECT 1 
            FROM public.student_parent_links spl 
            WHERE spl.parent_user_id = parents.user_id 
            AND spl.student_user_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1
            FROM public.teachers t
            WHERE t.user_id = (select auth.uid())
            AND t.school_id = parents.school_id
        )
    );

-- 3. Remove Duplicate Indexes (duplicate_index)
DROP INDEX IF EXISTS public.idx_fee_payments_student_id;

-- 4. Refresh Statistics
ANALYZE public.users;
ANALYZE public.parents;
ANALYZE public.fee_payments;
ANALYZE public.student_parent_links;
ANALYZE public.teachers;
ANALYZE public.school_memberships;

COMMIT;
