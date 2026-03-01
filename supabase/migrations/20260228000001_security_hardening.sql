-- ==========================================
-- COMPREHENSIVE SECURITY HARDENING
-- ==========================================
-- Fixes critical data leaks and insecure RLS policies
-- identified by Supabase Linter.

-- 1. DROP INSECURE VIEWS THAT EXPOSE auth.users
DROP VIEW IF EXISTS public.user_password_last_changed_view CASCADE;
DROP VIEW IF EXISTS public.auth_accounts CASCADE;

-- 2. ENABLE RLS ON VULNERABLE TABLES
ALTER TABLE public.cbt_submissions ENABLE ROW LEVEL SECURITY;

-- 3. FIX INSECURE RLS POLICIES (REMOVE user_metadata REFERENCES)
-- We'll replace them with joins to profiles table or check against profiles.

-- Helper function to safely get authenticated school_id
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS uuid AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Re-implement forum_topics RLS
DROP POLICY IF EXISTS "School isolation for forum_topics" ON public.forum_topics;
CREATE POLICY "School isolation for forum_topics" ON public.forum_topics
FOR ALL TO authenticated
USING (school_id = public.get_auth_school_id());

-- Re-implement forum_posts RLS
DROP POLICY IF EXISTS "School isolation for forum_posts" ON public.forum_posts;
CREATE POLICY "School isolation for forum_posts" ON public.forum_posts
FOR ALL TO authenticated
USING (school_id = public.get_auth_school_id());

-- Fix cbt_submissions policies
DROP POLICY IF EXISTS "Authenticated users can manage cbt_submissions" ON public.cbt_submissions;
CREATE POLICY "Authenticated users can manage cbt_submissions" ON public.cbt_submissions
FOR ALL TO authenticated
USING (
  student_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

-- 4. FIX ALWAYS-TRUE POLICY FOR report_card_records
DROP POLICY IF EXISTS "Authenticated users can manage report card records" ON public.report_card_records;
CREATE POLICY "Authenticated users can manage report card records" ON public.report_card_records
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'proprietor')
  )
);

-- 5. FIX exam_bodies and exam_registrations
DROP POLICY IF EXISTS "exam_bodies_isolation" ON public.exam_bodies;
CREATE POLICY "exam_bodies_isolation" ON public.exam_bodies
FOR SELECT TO authenticated
USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "exam_registrations_isolation" ON public.exam_registrations;
CREATE POLICY "exam_registrations_isolation" ON public.exam_registrations
FOR ALL TO authenticated
USING (school_id = public.get_auth_school_id());

-- 6. ENSURE RLS FOR ALL PUBLIC TABLES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND NOT rowsecurity
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'Enabled RLS on public.%', r.tablename;
    END LOOP;
END $$;
