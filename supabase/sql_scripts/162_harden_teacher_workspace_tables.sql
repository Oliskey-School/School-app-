-- Migration: Harden Teacher Workspace Tables
-- Description: Ensures generated_resources, leave_requests, and lesson_notes are properly isolated by school and branch.

BEGIN;

-- 1. Ensure columns exist and have appropriate types/constraints
DO $$
DECLARE
    t text;
    tables_to_audit text[] := ARRAY['generated_resources', 'leave_requests', 'lesson_notes'];
BEGIN
    FOREACH t IN ARRAY tables_to_audit LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- school_id
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'school_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE', t);
            END IF;
            
            -- branch_id
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'branch_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL', t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 2. Enable RLS and Apply Strict Isolation Policies
DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY['generated_resources', 'leave_requests', 'lesson_notes'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            
            -- Drop existing policies
            EXECUTE (
                SELECT COALESCE(string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, t), '; '), 'SELECT 1')
                FROM pg_policies 
                WHERE tablename = t AND schemaname = 'public'
            );

            -- Create "Strict Zero-Trust Isolation" Policy
            -- Logic matches 106_strict_isolation_reinforcement.sql
            EXECUTE format(
                'CREATE POLICY "Strict Zero-Trust Isolation" ON public.%I
                FOR ALL 
                TO authenticated
                USING (
                    school_id = public.get_school_id() 
                    AND (
                        public.get_active_branch_id() IS NULL 
                        OR 
                        branch_id = public.get_active_branch_id()
                    )
                )', t
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
