-- SECURITY LOCKDOWN: Fix Critical RLS Gaps in student_fees and assignments
-- Priority 0 in Master Task Matrix

-- ==============================================================================
-- 1. SECURING STUDENT_FEES
-- ==============================================================================

-- Drop the insecure "Enable all access" policy
DROP POLICY IF EXISTS "Enable all access for all users" ON public.student_fees;
DROP POLICY IF EXISTS "fees_read_all" ON public.student_fees;

-- Explicitly drop new policies to ensure idempotency (in case of partial failures)
DROP POLICY IF EXISTS "fees_admin_all" ON public.student_fees;
DROP POLICY IF EXISTS "fees_student_read_own" ON public.student_fees;
DROP POLICY IF EXISTS "fees_parent_read_linked" ON public.student_fees;

-- A. Admin Access: Full Access
CREATE POLICY "fees_admin_all" ON public.student_fees
FOR ALL USING (
    public.is_school_admin(school_id)
);

-- B. Student Self Access: Read Own Fees
-- Links auth.uid() -> students.user_id -> students.id -> student_fees.student_id
CREATE POLICY "fees_student_read_own" ON public.student_fees
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND s.user_id = (SELECT auth.uid())
    )
);

-- C. Parent Access: Read Linked Child's Fees
-- Links auth.uid() -> student_parent_links -> student_user_id -> students.user_id -> students.id -> student_fees.student_id
CREATE POLICY "fees_parent_read_linked" ON public.student_fees
FOR SELECT USING (
    EXISTS (
        SELECT 1 
        FROM public.students s
        JOIN public.student_parent_links spl ON spl.student_user_id = s.user_id
        WHERE s.id = student_fees.student_id
        AND spl.parent_user_id = (SELECT auth.uid())
    )
);

-- ==============================================================================
-- 2. SECURING ASSIGNMENTS
-- ==============================================================================

-- Drop insecure "Public read" policy
DROP POLICY IF EXISTS "Public read assignments" ON public.assignments;

-- Drop new policies if they exist
DROP POLICY IF EXISTS "assignments_staff_all" ON public.assignments;
DROP POLICY IF EXISTS "assignments_read_school_members" ON public.assignments;

-- A. Admin & Teacher Access: Full Access for School Members
CREATE POLICY "assignments_staff_all" ON public.assignments
FOR ALL USING (
    public.is_school_admin(school_id)
    OR
    EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = (SELECT auth.uid())
        AND sm.school_id = assignments.school_id
        AND sm.base_role = 'teacher'
        AND sm.is_active = true
    )
);

-- Policy: Students & Parents Read-Only
CREATE POLICY "assignments_read_school_members" ON public.assignments
FOR SELECT USING (
    public.is_school_member(school_id)
);

-- ==============================================================================
-- 3. FINAL CLEANUP
-- ==============================================================================
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
