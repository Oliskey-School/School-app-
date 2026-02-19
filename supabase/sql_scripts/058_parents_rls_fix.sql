-- Migration: Parents RLS Optimization
-- Description: Replaces the inefficient parents_unified policy with a streamlined, high-performance version.

BEGIN;

-- 1. Drop the old messy policy
DROP POLICY IF EXISTS parents_unified ON public.parents;

-- 2. Create the new clean policy
-- Logic:
-- - School admins can see all parents in their school
-- - Parents can see their own profile
-- - Students can see their own linked parent profile
-- - Teachers can see all parents in their assigned school (standard practice for communication)
CREATE POLICY parents_unified ON public.parents
    FOR ALL
    TO authenticated
    USING (
        is_school_admin(school_id)
        OR (user_id = auth.uid())
        OR EXISTS (
            SELECT 1 
            FROM public.student_parent_links spl 
            WHERE spl.parent_user_id = parents.user_id 
            AND spl.student_user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.teachers t
            WHERE t.user_id = auth.uid()
            AND t.school_id = parents.school_id
        )
    );

-- 3. Run ANALYZE to update statistics for the new policy join paths
ANALYZE public.parents;
ANALYZE public.student_parent_links;

COMMIT;
