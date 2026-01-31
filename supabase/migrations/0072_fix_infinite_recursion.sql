-- FIX INFINITE RECURSION IN RLS POLICIES
-- The issue causes "infinite recursion detected in policy for relation" errors.
-- We fix this by making role-checking functions SECURITY DEFINER (bypassing RLS) and using them in policies.

-- 1. Update is_super_admin to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select exists (
    select 1
    from public.school_memberships sm
    where sm.user_id = (select auth.uid())
      and sm.base_role = 'super_admin'
      and sm.is_active = true
  );
$function$;

-- 2. Update is_school_admin to be SECURITY DEFINER and include ALL admin types
-- Previous definition only checked 'school_admin'. We add 'admin', 'proprietor'.
CREATE OR REPLACE FUNCTION public.is_school_admin(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select public.is_super_admin()
  or exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = (select auth.uid())
      and sm.base_role IN ('school_admin', 'admin', 'proprietor')
      and sm.is_active = true
  );
$function$;

-- 3. Replace the recursive policy on school_memberships
DROP POLICY IF EXISTS "memberships_select_own_or_admin" ON public.school_memberships;

CREATE POLICY "memberships_select_own_or_admin" ON public.school_memberships
FOR SELECT USING (
    (user_id = (SELECT auth.uid())) 
    OR 
    (public.is_school_admin(school_id))
);

-- 4. Apply similar fixes to other helper functions for completeness
CREATE OR REPLACE FUNCTION public.is_school_member(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select public.is_super_admin()
  or exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  );
$function$;
