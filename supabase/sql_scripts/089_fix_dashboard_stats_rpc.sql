
-- Migration: 0126_fix_dashboard_stats_rpc.sql
-- Description: Fixes get_dashboard_stats RPC crash by correctly handling tables without branch_id column (parents, student_fees).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_school_id UUID, p_branch_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$   
DECLARE
    v_total_students INTEGER;
    v_total_teachers INTEGER;
    v_total_parents INTEGER;
    v_overdue_fees NUMERIC;
BEGIN
    -- 1. Count Students (Has branch_id)
    SELECT count(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 2. Count Teachers (Has branch_id)
    SELECT count(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 3. Count Parents (No branch_id, join via students)
    -- We count unique parents who have at least one child in the target branch/school
    SELECT count(DISTINCT p.id) INTO v_total_parents
    FROM public.parents p
    JOIN public.parent_children pc ON p.id = pc.parent_id
    JOIN public.students s ON pc.student_id = s.id
    WHERE p.school_id = p_school_id
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id);

    -- 4. Calculate Overdue Fees (No branch_id, join via students)
    -- Fees are linked to students, so we filter by the student's branch
    SELECT COALESCE(SUM(sf.amount - sf.paid_amount), 0) INTO v_overdue_fees
    FROM public.student_fees sf
    JOIN public.students s ON sf.student_id = s.id
    WHERE sf.school_id = p_school_id
    AND sf.status = 'Overdue'
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id);

    -- Return as JSON
    RETURN jsonb_build_object(
        'totalStudents', v_total_students,
        'totalTeachers', v_total_teachers,
        'totalParents', v_total_parents,
        'overdueFees', v_overdue_fees
    );
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO service_role;

COMMIT;
