
-- 1. Create the student_enrollments junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, class_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- 3. Create School Isolation Policy
DROP POLICY IF EXISTS "School Isolation: Student Enrollments" ON public.student_enrollments;
CREATE POLICY "School Isolation: Student Enrollments"
ON public.student_enrollments
FOR ALL
TO authenticated
USING (
  school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
)
WITH CHECK (
  school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
);

-- 4. Initial Data Migration: Populate enrollments from existing students.class_id
-- This ensures that all currently enrolled students keep their primary class assignment.
INSERT INTO public.student_enrollments (student_id, class_id, school_id, branch_id, is_primary)
SELECT 
    id as student_id,
    class_id,
    school_id,
    branch_id,
    true as is_primary
FROM public.students
WHERE class_id IS NOT NULL
ON CONFLICT (student_id, class_id) DO NOTHING;

-- 5. Add comments for documentation
COMMENT ON TABLE public.student_enrollments IS 'Junction table for many-to-many enrollment of students into classes.';
COMMENT ON COLUMN public.student_enrollments.is_primary IS 'Indicates the primary class for UI display and backward compatibility.';
