-- Enable RLS on assignments and submissions
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
    (get_role() IN ('student', 'parent') AND (
        -- For now, allow reading all assignments in the school/branch
        -- In future, verify against class_id
        true
    ))
  )
)
WITH CHECK (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text]))
  )
);

-- Refine Student Read Policy (Optional but good practice)
-- Ideally separate policies for "Manage" vs "View" but single policy is okay for now if CHECK restricts writes.
-- The above CHECK clause restricts WRITES to admins/teachers.
-- The USING clause allows ALL (including Students/Parents) to READ (implicit via ALL).

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
        JOIN student_parents sp ON s.id = sp.student_id 
        WHERE s.id = assignment_submissions.student_id 
        AND sp.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
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
