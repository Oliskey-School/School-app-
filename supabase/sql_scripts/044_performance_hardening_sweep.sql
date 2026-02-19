-- Migration: Performance Hardening Sweep & Redundant Policy Cleanup (Final Definitive - Polished - Syntax Corrected)
-- Goal: Fix auth_rls_initplan and multiple_permissive_policies across ALL tables in public schema

-- ==============================================================================
-- 1. INFRA & SEQUENCES
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated Member Access" ON public.school_id_sequences;
CREATE POLICY "Authenticated Member Access" ON public.school_id_sequences FOR ALL TO authenticated USING ( (select auth.role()) = 'authenticated' );

-- ==============================================================================
-- 2. DYNAMIC UNIFICATION & CLEANUP
-- ==============================================================================
DO $$
DECLARE
    t_name text;
    cols text[];
    has_school_id boolean;
    has_user_id boolean;
    pol record;
BEGIN
    FOR t_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('school_id_sequences', 'spatial_ref_sys', 'permissions') -- Skip infra and manually handled
    LOOP
        -- Enable RLS on all tables
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);

        -- Get columns for the table
        SELECT array_agg(column_name) INTO cols 
        FROM information_schema.columns 
        WHERE table_name = t_name AND table_schema = 'public';

        has_school_id := 'school_id' = ANY(cols);
        has_user_id := 'user_id' = ANY(cols);

        -- 1. DROP ALL OLD POLICIES
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t_name LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t_name);
        END LOOP;

        -- 2. APPLY UNIFIED POLICY (Standard catch-all)
        IF t_name IN ('users', 'profiles', 'students', 'teachers', 'parents') THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ( (is_school_admin(school_id) OR (SELECT id FROM public.users WHERE id = (select auth.uid())) = public.%I.id OR (SELECT user_id FROM public.students WHERE id = public.%I.id) = (select auth.uid()) OR (SELECT user_id FROM public.teachers WHERE id = public.%I.id) = (select auth.uid()) OR (SELECT user_id FROM public.parents WHERE id = public.%I.id) = (select auth.uid())))', t_name || '_unified', t_name, t_name, t_name, t_name, t_name);
        ELSIF has_school_id THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ( is_school_member(school_id) )', t_name || '_unified', t_name);
        ELSIF has_user_id AND t_name = 'activity_logs' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ( user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = (select auth.uid()) AND base_role = ''admin'') )', t_name || '_unified', t_name);
        ELSIF 'student_id' = ANY(cols) AND NOT has_school_id AND t_name = 'student_progress' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ( EXISTS (SELECT 1 FROM public.students s WHERE s.id = public.%I.student_id AND (s.user_id = (select auth.uid()) OR is_school_admin(s.school_id))) )', t_name || '_unified', t_name, t_name);
        ELSE
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ( true )', t_name || '_unified', t_name);
        END IF;

    END LOOP;
END $$;

-- ==============================================================================
-- 3. SPECIFIC OVERRIDES FOR COMPLEX TABLES
-- ==============================================================================

-- PERMISSIONS (Split SELECT and DML to avoid multiple permissive policies)
DROP POLICY IF EXISTS "permissions_unified_read" ON public.permissions;
DROP POLICY IF EXISTS "permissions_admin_insert" ON public.permissions;
DROP POLICY IF EXISTS "permissions_admin_update" ON public.permissions;
DROP POLICY IF EXISTS "permissions_admin_delete" ON public.permissions;

CREATE POLICY "permissions_unified_read" ON public.permissions FOR SELECT TO authenticated USING ( true );

CREATE POLICY "permissions_admin_insert" ON public.permissions FOR INSERT TO authenticated WITH CHECK ( EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = (select auth.uid()) AND base_role = 'admin') );
CREATE POLICY "permissions_admin_update" ON public.permissions FOR UPDATE TO authenticated USING ( EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = (select auth.uid()) AND base_role = 'admin') ) WITH CHECK ( EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = (select auth.uid()) AND base_role = 'admin') );
CREATE POLICY "permissions_admin_delete" ON public.permissions FOR DELETE TO authenticated USING ( EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = (select auth.uid()) AND base_role = 'admin') );

-- EXAM RESULTS (Student/Parent access)
DROP POLICY IF EXISTS "exam_results_unified" ON public.exam_results;
CREATE POLICY "exam_results_unified" ON public.exam_results FOR ALL TO authenticated USING ( is_school_admin(school_id) OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = exam_results.student_id AND s.user_id = (select auth.uid())) OR EXISTS (SELECT 1 FROM public.student_parent_links spl JOIN public.students s ON s.user_id = spl.student_user_id WHERE s.id = exam_results.student_id AND spl.parent_user_id = (select auth.uid())) );

-- NOTIFICATIONS (User specific access)
DROP POLICY IF EXISTS "notifications_unified" ON public.notifications;
CREATE POLICY "notifications_unified" ON public.notifications FOR ALL TO authenticated USING ( (user_id = (select auth.uid())) OR is_school_admin(school_id) );
