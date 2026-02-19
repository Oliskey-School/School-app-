-- Migration: 0124 Fix Dashboard RPC
-- Description: Updates get_dashboard_stats to query correct tables (teachers, parents) instead of deprecated users table.

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
    -- Count Students
    SELECT count(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- Count Teachers (from public.teachers table)
    SELECT count(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- Count Parents (from public.parents table)
    SELECT count(*) INTO v_total_parents
    FROM public.parents
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- Calculate Overdue Fees
    SELECT COALESCE(SUM(total_fee - paid_amount), 0) INTO v_overdue_fees
    FROM public.student_fees
    WHERE school_id = p_school_id
    AND status = 'Overdue'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- Return as JSON
    RETURN jsonb_build_object(
        'totalStudents', v_total_students,
        'totalTeachers', v_total_teachers,
        'totalParents', v_total_parents,
        'overdueFees', v_overdue_fees
    );
END;
$$;

-- Explicitly grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO authenticated;

COMMIT;
