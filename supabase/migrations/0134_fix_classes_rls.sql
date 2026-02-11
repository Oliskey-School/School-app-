-- Fix "No classes assigned" error for teachers linked to template classes
-- The 'classes_unified' policy logic for demo users is complex and might be failing.
-- We will broaden the policy to explicitly allow reading template classes (school_id = 00000000-0000-0000-0000-000000000000) for all authenticated users.

DROP POLICY IF EXISTS "classes_unified" ON "public"."classes";

CREATE POLICY "classes_unified" ON "public"."classes"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  is_school_member(school_id) 
  OR (
    -- Allow access if it's the template school
    school_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
  OR (
    -- Original logic: Allow demo users to access other demo schools
    is_demo_user(auth.uid()) AND (school_id IN ( SELECT schools.id FROM schools WHERE schools.is_demo_mode = true))
  )
);
