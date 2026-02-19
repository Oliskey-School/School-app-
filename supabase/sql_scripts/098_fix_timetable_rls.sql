-- Enable RLS
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies to clean up
DROP POLICY IF EXISTS "School staff manage timetables" ON public.timetable;
DROP POLICY IF EXISTS "timetable_unified" ON public.timetable;
DROP POLICY IF EXISTS "Staff manage timetables" ON public.timetable;

-- Create comprehensive policy for Staff (Admin, Teacher, etc)
CREATE POLICY "Staff manage timetables"
ON public.timetable
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = timetable.school_id
    AND profiles.role IN ('admin', 'teacher', 'proprietor', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = timetable.school_id
    AND profiles.role IN ('admin', 'teacher', 'proprietor', 'super_admin')
  )
);

-- Ensure students/parents can only SELECT published timetables
DROP POLICY IF EXISTS "Students/Parents view published timetables" ON public.timetable;

CREATE POLICY "Students/Parents view published timetables"
ON public.timetable
FOR SELECT
TO authenticated
USING (
  status = 'Published'
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
);
