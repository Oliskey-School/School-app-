-- Fix 1: Secure auth_accounts view by filtering in the definition
-- (RLS not supported on views directly in this version/context)

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
    au.id = auth.uid() -- Self access
    OR EXISTS ( -- Admin access
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'super_admin', 'proprietor')
    );

-- Fix 2 & 3: Optimize RLS and Add Indexes

-- Table: users
CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users USING btree (school_id);

-- Optimize users policies
DROP POLICY IF EXISTS "Self Access" ON "public"."users";
CREATE POLICY "Self Access" ON "public"."users"
AS PERMISSIVE FOR ALL
TO public
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Tenant Isolation" ON "public"."users";
CREATE POLICY "Tenant Isolation" ON "public"."users"
AS PERMISSIVE FOR ALL
TO public
USING (school_id = (select get_school_id()));

-- Table: class_teachers
CREATE INDEX IF NOT EXISTS idx_class_teachers_school_id ON public.class_teachers USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON public.class_teachers USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_class_id ON public.class_teachers USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_subject_id ON public.class_teachers USING btree (subject_id);


-- Optimize class_teachers policies
DROP POLICY IF EXISTS "Admins manage class assignments" ON "public"."class_teachers";
CREATE POLICY "Admins manage class assignments" ON "public"."class_teachers"
AS PERMISSIVE FOR ALL
TO public
USING (
  (school_id = (SELECT users.school_id FROM users WHERE users.id = (select auth.uid()))) 
  AND (EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
);

DROP POLICY IF EXISTS "Teachers can view own class assignments" ON "public"."class_teachers";
CREATE POLICY "Teachers can view own class assignments" ON "public"."class_teachers"
AS PERMISSIVE FOR SELECT
TO public
USING (
  (school_id = (SELECT users.school_id FROM users WHERE users.id = (select auth.uid()))) 
  AND (
    (teacher_id = (SELECT teachers.id FROM teachers WHERE teachers.user_id = (select auth.uid()))) 
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  )
);

-- Table: school_permissions_catalog
-- Optimize school_permissions_catalog policies
DROP POLICY IF EXISTS "perm_catalog_select_any" ON "public"."school_permissions_catalog";
CREATE POLICY "perm_catalog_select_any" ON "public"."school_permissions_catalog"
AS PERMISSIVE FOR SELECT
TO public
USING ((select auth.uid()) IS NOT NULL);

-- Table: health_logs (Example of another table mentioned in general bottleneck, though specifics weren't detailed, adding helpful indexes)
CREATE INDEX IF NOT EXISTS idx_health_logs_school_id ON public.health_logs USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_student_id ON public.health_logs USING btree (student_id);

-- Fix 4: Secure Functions (Mutable search_path)

CREATE OR REPLACE FUNCTION public.generate_school_id(p_school_id uuid, p_branch_id uuid, p_role text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    v_school_code text;
    v_branch_code text;
    v_role_code text;
    v_seq_num integer;
    v_new_id text;
BEGIN
    -- Get School Code
    SELECT code INTO v_school_code FROM public.schools WHERE id = p_school_id;
    IF v_school_code IS NULL THEN v_school_code := 'SCH'; END IF;

    -- Get Branch Code
    IF p_branch_id IS NOT NULL THEN
        SELECT code INTO v_branch_code FROM public.branches WHERE id = p_branch_id;
    END IF;
    IF v_branch_code IS NULL THEN v_branch_code := 'HQS'; END IF; -- HeadQuarters/Default

    -- Determine Role Code (STD, TCH, PAR, ADM)
    CASE 
        WHEN p_role ILIKE 'student' THEN v_role_code := 'STD';
        WHEN p_role ILIKE 'teacher' THEN v_role_code := 'TCH';
        WHEN p_role ILIKE 'parent' THEN v_role_code := 'PAR';
        WHEN p_role ILIKE 'admin' THEN v_role_code := 'ADM';
        WHEN p_role ILIKE 'superadmin' THEN v_role_code := 'SAD';
        ELSE v_role_code := 'USR';
    END CASE;

    -- Get Next Sequence (Atomic Increment)
    INSERT INTO public.school_id_sequences (school_id, role, current_val)
    VALUES (p_school_id, v_role_code, 1)
    ON CONFLICT (school_id, role)
    DO UPDATE SET current_val = school_id_sequences.current_val + 1
    RETURNING current_val INTO v_seq_num;

    -- Format: SCHOOL_BRANCH_ROLE_0000
    v_new_id := UPPER(FORMAT('%s_%s_%s_%s', 
        v_school_code, 
        v_branch_code, 
        v_role_code, 
        LPAD(v_seq_num::text, 4, '0')
    ));

    RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_custom_id_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    IF NEW.custom_id IS NULL THEN
        NEW.custom_id := public.generate_school_id(NEW.school_id, NEW.branch_id, NEW.role);
    END IF;
    RETURN NEW;
END;
$function$;
