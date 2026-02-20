-- Consolidated fix for CBT and Assignments Permissions
-- Timestamp: 20260219200000

-- PART 1: QUIZZES
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

-- PART 2: ASSIGNMENTS
ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignment_submissions" ENABLE ROW LEVEL SECURITY;

-- Assignments Policies
DROP POLICY IF EXISTS "tenant_isolation_assignments" ON "public"."assignments";

CREATE POLICY "tenant_isolation_assignments"
ON "public"."assignments"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text])) OR 
    (branch_id = get_branch_id()) OR 
    (get_branch_id() IS NULL) OR
    -- Allow students and parents to READ
    (get_role() IN ('student', 'parent'))
  )
)
WITH CHECK (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text]))
  )
);

-- Assignment Submissions Policies
DROP POLICY IF EXISTS "tenant_isolation_submissions" ON "public"."assignment_submissions";

CREATE POLICY "tenant_isolation_submissions"
ON "public"."assignment_submissions"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text])) OR 
    (student_user_id = auth.uid()) OR
    -- Parents can read their child's submissions
    (get_role() = 'parent' AND EXISTS (
        SELECT 1 FROM students s 
        JOIN student_parent_links spl ON s.user_id = spl.student_user_id
        WHERE s.id = assignment_submissions.student_id 
        AND spl.parent_user_id = auth.uid()
    ))
  )
)
WITH CHECK (
  (school_id = get_school_id()) AND (
    -- Teachers/Admins can grade (UPDATE)
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text])) OR
    -- Students can submit (INSERT/UPDATE own)
    (student_user_id = auth.uid())
  )
);
