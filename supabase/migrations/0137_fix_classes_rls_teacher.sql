-- Enable teachers to view details of classes they are assigned to
-- This policy allows any authenticated user to select rows from classes
-- where the class ID is present in class_teachers for one of their teacher profiles.

CREATE POLICY "teachers_view_assigned_classes" ON "public"."classes"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT class_id FROM class_teachers 
    WHERE teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  )
);
