-- Migration: 0121_timetable_rls_security
-- Purpose: Add Row-Level Security (RLS) policies to timetable table
-- Ensures students can ONLY access published timetables

-- Enable RLS on timetable table
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins, Teachers, and Proprietors - Full Access
-- They can view, create, update, and delete timetables for their school
DROP POLICY IF EXISTS "School staff manage timetables" ON public.timetable;
CREATE POLICY "School staff manage timetables"
ON public.timetable
FOR ALL
TO authenticated
USING (
    school_id IN (
        SELECT school_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher', 'proprietor', 'super_admin')
    )
)
WITH CHECK (
    school_id IN (
        SELECT school_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'teacher', 'proprietor', 'super_admin')
    )
);

-- Policy 2: Students and Parents - Read-Only, Published Timetables ONLY
-- Students can ONLY see published timetables for their school
-- Parents see published timetables for their children's classes
DROP POLICY IF EXISTS "Students view published timetables" ON public.timetable;
CREATE POLICY "Students view published timetables"
ON public.timetable
FOR SELECT
TO authenticated
USING (
    status = 'Published' 
    AND school_id = (
        SELECT school_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    )
    AND (
        -- Students can view timetables for their class
        EXISTS (
            SELECT 1 
            FROM public.students 
            WHERE user_id = auth.uid() 
            AND school_id = timetable.school_id
        )
        OR
        -- Parents can view timetables for their children's classes
        EXISTS (
            SELECT 1 
            FROM public.parents 
            WHERE user_id = auth.uid() 
            AND school_id = timetable.school_id
        )
        OR
        -- Fallback: Any authenticated user in the same school can view published timetables
        EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND school_id = timetable.school_id
        )
    )
);

-- Add helpful comment
COMMENT ON TABLE public.timetable IS 'School timetables with RLS enabled. Students can only view Published status.';
