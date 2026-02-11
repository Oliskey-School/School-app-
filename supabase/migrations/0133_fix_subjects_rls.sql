-- Fix "No subjects assigned" error for demo teachers linked to template subjects
-- The 'subjects_unified' policy currently only allows 'is_school_member(school_id)'.
-- Template subjects (school_id = 00000000-0000-0000-0000-000000000000) are not visible to teachers in other schools.
-- We need to broaden the policy to allow reading template subjects.

DROP POLICY IF EXISTS "subjects_unified" ON "public"."subjects";

CREATE POLICY "subjects_unified" ON "public"."subjects"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  is_school_member(school_id) OR (school_id = '00000000-0000-0000-0000-000000000000'::uuid)
);
