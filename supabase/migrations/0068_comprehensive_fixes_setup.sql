-- COMPREHENSIVE DATABASE OPTIMIZATION V2 (Performance & Security)

-- ==============================================================================
-- 1. HELPER FUNCTIONS: Optimize with cached auth.uid()
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_school_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    _school_id UUID;
BEGIN
    -- Check JWT metadata first (Most efficient)
    -- Using (SELECT ...) to ensure single evaluation per statement
    _school_id := (NULLIF((SELECT auth.jwt() -> 'user_metadata' ->> 'school_id'), ''))::UUID;
    
    IF _school_id IS NOT NULL THEN
        RETURN _school_id;
    END IF;

    -- Check JWT app_metadata fallback
    _school_id := (NULLIF((SELECT auth.jwt() -> 'app_metadata' ->> 'school_id'), ''))::UUID;
    
    IF _school_id IS NOT NULL THEN
        RETURN _school_id;
    END IF;

    -- Search Database as last resort
    SELECT u.school_id INTO _school_id
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
    LIMIT 1;

    RETURN COALESCE(_school_id, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
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

CREATE OR REPLACE FUNCTION public.is_school_admin(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select public.is_super_admin()
  or exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.user_id = (select auth.uid())
      and sm.base_role = 'school_admin'
      and sm.is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_school_member(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
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

CREATE OR REPLACE FUNCTION public.has_school_permission(p_school_id uuid, p_permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select public.is_school_admin(p_school_id)
  or exists (
    select 1
    from public.school_user_roles sur
    join public.school_role_permissions srp
      on srp.role_id = sur.role_id
    where sur.school_id = p_school_id
      and sur.user_id = (select auth.uid())
      and srp.permission_key = p_permission_key
  );
$function$;

-- ==============================================================================
-- 2. INDEXES: Cleanup duplicates
-- ==============================================================================

DROP INDEX IF EXISTS public.fk_students_user_id_user_id_idx;
DROP INDEX IF EXISTS public.fk_teachers_user_id_user_id_idx;
DROP INDEX IF EXISTS public.idx_users_school_id;

-- ==============================================================================
-- 3. RLS POLICIES: Optimized Sweep (select auth.uid())
-- ==============================================================================

-- Helper to optimize a list of common policies found in logs
-- Note: We use DROP/CREATE to ensure clean state.

-- Table: public.users
DROP POLICY IF EXISTS "Allow initial setup" ON "public"."users";
CREATE POLICY "Allow initial setup" ON "public"."users"
FOR INSERT WITH CHECK (
    (id = (SELECT auth.uid())) 
    OR 
    (EXISTS (SELECT 1 FROM public.school_memberships sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.base_role = 'super_admin'))
);

DROP POLICY IF EXISTS "Self-management" ON "public"."users";
CREATE POLICY "Self-management" ON "public"."users"
FOR ALL USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Table: public.school_user_roles
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON "public"."school_user_roles";
CREATE POLICY "user_roles_select_own_or_admin" ON "public"."school_user_roles"
FOR SELECT USING (
  (user_id = (SELECT auth.uid())) 
  OR 
  (public.is_school_admin(school_id))
);

-- Table: public.student_parent_links
DROP POLICY IF EXISTS "parent_links_select_own_or_admin_or_student" ON "public"."student_parent_links";
CREATE POLICY "parent_links_select_own_or_admin_or_student" ON "public"."student_parent_links"
FOR SELECT USING (
  public.is_school_admin(school_id) 
  OR (parent_user_id = (SELECT auth.uid())) 
  OR (student_user_id = (SELECT auth.uid()))
);

-- Table: public.score_components
DROP POLICY IF EXISTS "scores_select_scoped" ON "public"."score_components";
CREATE POLICY "scores_select_scoped" ON "public"."score_components"
FOR SELECT USING (
  public.is_school_admin(school_id) 
  OR (student_user_id = (SELECT auth.uid())) 
  OR (EXISTS (SELECT 1 FROM public.student_parent_links spl WHERE spl.student_user_id = score_components.student_user_id AND spl.parent_user_id = (SELECT auth.uid())))
  OR (EXISTS (SELECT 1 FROM public.teacher_assignments ta WHERE ta.class_section_id = score_components.class_section_id AND ta.subject_id = score_components.subject_id AND ta.teacher_user_id = (SELECT auth.uid()) AND ta.is_active = true))
);

-- Table: public.permissions
DROP POLICY IF EXISTS "permissions_select_all" ON "public"."permissions";
CREATE POLICY "permissions_select_all" ON "public"."permissions"
FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

-- Table: public.assignments
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON "public"."assignments";
CREATE POLICY "Tenant Isolation Policy" ON "public"."assignments"
FOR ALL USING (school_id = (SELECT public.get_school_id()));

-- Table: public.attendance_records
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON "public"."attendance_records";
CREATE POLICY "Tenant Isolation Policy" ON "public"."attendance_records"
FOR ALL USING (school_id = (SELECT public.get_school_id()));

-- Generic sweep for tables using "Tenant Isolation Policy" with unoptimized get_school_id()
-- We redefine get_school_id() above with optimization, but we should wrap it in (SELECT ...) in policies too.

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_policies 
        WHERE policyname = 'Tenant Isolation Policy' 
        AND qual LIKE '%get_school_id()%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant Isolation Policy" ON public.%I FOR ALL USING (school_id = (SELECT public.get_school_id()))', t);
    END LOOP;
END $$;


-- ==============================================================================
-- 4. SECURITY: Final Hardening
-- ==============================================================================

-- Re-secure auth_accounts view with optimized pattern
CREATE OR REPLACE VIEW "public"."auth_accounts" AS 
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data ->> 'username'::text, au.raw_user_meta_data ->> 'full_name'::text, au.email::text) AS username,
    COALESCE(au.raw_user_meta_data ->> 'full_name'::text, 'Unknown'::text) AS name,
    COALESCE(au.raw_user_meta_data ->> 'role'::text, au.raw_user_meta_data ->> 'user_type'::text, 'student'::text) AS user_type,
    COALESCE(au.raw_user_meta_data ->> 'role'::text, 'student'::text) AS role,
    COALESCE((au.raw_user_meta_data ->> 'school_id'::text)::uuid, NULL::uuid) AS school_id,
    true AS is_active,
    au.created_at,
    au.id AS user_id
FROM auth.users au
WHERE 
    au.id = (SELECT auth.uid()) -- Self access
    OR EXISTS ( -- Admin access
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = (SELECT auth.uid()) 
        AND sm.base_role IN ('admin', 'super_admin', 'school_admin')
        AND sm.is_active = true
    );
