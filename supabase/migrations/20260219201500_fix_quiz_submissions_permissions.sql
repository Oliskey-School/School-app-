-- Allow students to submit quizzes and teachers to view them
-- Current state: RLS enabled, NO policies => No access.

DROP POLICY IF EXISTS "tenant_isolation_quiz_submissions" ON "public"."quiz_submissions";

CREATE POLICY "tenant_isolation_quiz_submissions"
ON "public"."quiz_submissions"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (school_id = get_school_id()) AND (
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text])) OR 
    (student_id IN (
        SELECT id FROM students WHERE user_id = auth.uid()
    )) OR
    -- Parents can read if linked
    (get_role() = 'parent' AND EXISTS (
        SELECT 1 FROM students s 
        JOIN student_parent_links spl ON s.user_id = spl.student_user_id
        WHERE s.id = quiz_submissions.student_id 
        AND spl.parent_user_id = auth.uid()
    ))
  )
)
WITH CHECK (
  (school_id = get_school_id()) AND (
    -- Teachers/Admins can grade/update
    (get_role() = ANY (ARRAY['proprietor'::text, 'super_admin'::text, 'admin'::text, 'teacher'::text])) OR
    -- Students can insert their own submission
    (student_id IN (
        SELECT id FROM students WHERE user_id = auth.uid()
    ))
  )
);
