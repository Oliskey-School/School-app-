-- Allow teachers to manage quizzes
-- Current policies only allowed admin/proprietor.

DROP POLICY IF EXISTS "tenant_isolation_quizzes" ON "public"."quizzes";

CREATE POLICY "tenant_isolation_quizzes"
ON "public"."quizzes"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text])) OR 
    (get_role() = 'teacher'::text) OR
    (branch_id = get_branch_id()) OR 
    (get_branch_id() IS NULL)
  )
)
WITH CHECK (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text])) OR 
    (get_role() = 'teacher'::text) OR
    (branch_id = get_branch_id()) OR 
    (get_branch_id() IS NULL)
  )
);

-- Similarly for quiz_questions
DROP POLICY IF EXISTS "tenant_isolation_quiz_questions" ON "public"."quiz_questions";

CREATE POLICY "tenant_isolation_quiz_questions"
ON "public"."quiz_questions"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text])) OR 
    (get_role() = 'teacher'::text) OR
    (branch_id = get_branch_id()) OR 
    (get_branch_id() IS NULL)
  )
)
WITH CHECK (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text])) OR 
    (get_role() = 'teacher'::text) OR
    (branch_id = get_branch_id()) OR 
    (get_branch_id() IS NULL)
  )
);
