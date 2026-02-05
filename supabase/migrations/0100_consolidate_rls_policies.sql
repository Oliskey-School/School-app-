-- Migration: 0100 Consolidate RLS Policies
-- Description: Resolves "Multiple Permissive Policies" linter warnings by merging redundant policies.

BEGIN;

-- ==============================================================================
-- 1. Table: public.permissions
-- ==============================================================================
-- Conflicting: {permissions_select_all, permissions_unified_read}
DROP POLICY IF EXISTS "permissions_select_all" ON public.permissions;
-- Ensure permissions_unified_read exists and is correct
DROP POLICY IF EXISTS "permissions_unified_read" ON public.permissions;
CREATE POLICY "permissions_unified_read" ON public.permissions 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- ==============================================================================
-- 2. Table: public.users
-- ==============================================================================
-- Conflicting: {"Users insert unified", "Users select unified", users_unified}
DROP POLICY IF EXISTS "Users insert unified" ON public.users;
DROP POLICY IF EXISTS "Users select unified" ON public.users;
-- users_unified was already created/updated in 0098, it covers ALL commands for authenticated users.

-- ==============================================================================
-- 3. Table: public.schools
-- ==============================================================================

-- A. Cleanup SELECT Policies
-- Conflicting: {"Public can view schools", "Public read schools"}
DROP POLICY IF EXISTS "Public can view schools" ON public.schools;
DROP POLICY IF EXISTS "Public read schools" ON public.schools;
CREATE POLICY "Public read schools" ON public.schools
    FOR SELECT
    TO public
    USING (true);

-- B. Cleanup UPDATE Policies  
-- Conflicting: {"Admins can update schools", "School admins can update school"}
DROP POLICY IF EXISTS "Admins can update schools" ON public.schools;
DROP POLICY IF EXISTS "School admins can update school" ON public.schools;
CREATE POLICY "School admins can update school" ON public.schools
    FOR UPDATE
    TO authenticated
    USING (public.is_school_admin(id))
    WITH CHECK (public.is_school_admin(id));

-- C. Cleanup DELETE Policies
-- Conflicting: {"Admins can delete schools", "Only admins can delete schools"}
DROP POLICY IF EXISTS "Admins can delete schools" ON public.schools;
DROP POLICY IF EXISTS "Only admins can delete schools" ON public.schools;
CREATE POLICY "Only admins can delete schools" ON public.schools
    FOR DELETE
    TO authenticated
    USING (public.is_school_admin(id));

COMMIT;
