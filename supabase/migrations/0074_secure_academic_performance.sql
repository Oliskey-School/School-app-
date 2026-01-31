-- SECURE ACADEMIC PERFORMANCE (GRADES)
-- Priority 1 in Teacher Task Matrix

-- 1. Drop insecure policies
DROP POLICY IF EXISTS "Public read academic_performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Admin manage academic_performance" ON public.academic_performance;

-- Explicitly drop new policies to ensure idempotency
DROP POLICY IF EXISTS "grades_admin_all" ON public.academic_performance;
DROP POLICY IF EXISTS "grades_teacher_manage" ON public.academic_performance;
DROP POLICY IF EXISTS "grades_student_read_own" ON public.academic_performance;
DROP POLICY IF EXISTS "grades_parent_read_linked" ON public.academic_performance;

-- 2. Verify Table Ownership (Tenant Isolation)
-- Ensure RLS is enabled
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;

-- 3. Define New Policies

-- A. ADMIN: Full Access within School
CREATE POLICY "grades_admin_all" ON public.academic_performance
FOR ALL USING (
    public.is_school_admin(school_id)
);

-- B. TEACHER: Manage Grades (Insert/Update/Select)
-- For now, allowing all teachers in the school to manage grades to avoid blocking valid work.
-- Future refinement: Scope to specific classes via teacher_classes table.
CREATE POLICY "grades_teacher_manage" ON public.academic_performance
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = (SELECT auth.uid())
        AND sm.school_id = academic_performance.school_id
        AND sm.base_role = 'teacher'
        AND sm.is_active = true
    )
);

-- C. STUDENT: Read Own Grades
CREATE POLICY "grades_student_read_own" ON public.academic_performance
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = academic_performance.student_id
        AND s.user_id = (SELECT auth.uid())
    )
);

-- D. PARENT: Read Linked Child's Grades
CREATE POLICY "grades_parent_read_linked" ON public.academic_performance
FOR SELECT USING (
    EXISTS (
        SELECT 1 
        FROM public.students s
        JOIN public.student_parent_links spl ON spl.student_user_id = s.user_id
        WHERE s.id = academic_performance.student_id
        AND spl.parent_user_id = (SELECT auth.uid())
    )
);
