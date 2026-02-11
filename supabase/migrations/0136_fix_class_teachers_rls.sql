-- Enable teachers to view their own class assignments
-- This policy allows any authenticated user to select rows from class_teachers
-- where the teacher_id corresponds to a teacher profile linked to their user_id.

CREATE POLICY "teachers_view_own_assignments" ON "public"."class_teachers"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);
