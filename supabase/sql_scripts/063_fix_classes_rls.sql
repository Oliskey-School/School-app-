-- Migration: 0100 Fix Classes RLS
-- Description: Sets strict tenant isolation for the 'classes' table.
-- Ensures that authenticated users can only see classes belonging to their school.

BEGIN;

-- 1. Enable RLS on classes (if not already enabled)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 2. Drop the overly permissive policy
DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON public.classes;
DROP POLICY IF EXISTS "Users can view classes in their school" ON public.classes;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;

-- 3. Create a strict tenant isolation policy
-- We use get_my_school_id() which is defined in 0049 and updated in 0099
-- It retrieves the school_id from the user's JWT metadata.
CREATE POLICY "Tenant Isolation Policy" ON public.classes
    FOR SELECT
    TO authenticated
    USING (school_id = get_my_school_id());

-- Also add policies for INSERT/UPDATE/DELETE for admins
CREATE POLICY "Admins can manage classes" ON public.classes
    FOR ALL
    TO authenticated
    USING (
        school_id = get_my_school_id() 
        AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'principal')
    )
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'principal')
    );

COMMIT;
