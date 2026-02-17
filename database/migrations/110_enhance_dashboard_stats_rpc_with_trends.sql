-- Migration: 0145_enhance_dashboard_stats_rpc_with_trends.sql
-- Description: Adds 30-day trends to get_dashboard_stats for students, teachers, and parents.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_school_id UUID, p_branch_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$   
DECLARE
    v_total_students INTEGER;
    v_new_students INTEGER;
    v_total_teachers INTEGER;
    v_new_teachers INTEGER;
    v_total_parents INTEGER;
    v_new_parents INTEGER;
    v_overdue_fees NUMERIC;
    v_thirty_days_ago TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
    -- 1. Students & Trends
    SELECT count(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    SELECT count(*) INTO v_new_students
    FROM public.students
    WHERE school_id = p_school_id
    AND created_at > v_thirty_days_ago
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 2. Teachers & Trends
    SELECT count(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    SELECT count(*) INTO v_new_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND created_at > v_thirty_days_ago
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 3. Parents & Trends
    -- Count parents in the school
    SELECT count(*) INTO v_total_parents
    FROM public.parents
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    SELECT count(*) INTO v_new_parents
    FROM public.parents
    WHERE school_id = p_school_id
    AND created_at > v_thirty_days_ago
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 4. Overdue Fees
    SELECT COALESCE(SUM(sf.amount - sf.paid_amount), 0) INTO v_overdue_fees
    FROM public.student_fees sf
    WHERE sf.school_id = p_school_id
    AND sf.status = 'Overdue'
    AND (p_branch_id IS NULL OR EXISTS (
        SELECT 1 FROM public.students s 
        WHERE s.id = sf.student_id AND s.branch_id = p_branch_id
    ));

    -- Return as JSON
    RETURN jsonb_build_object(
        'totalStudents', v_total_students,
        'studentTrend', v_new_students,
        'totalTeachers', v_total_teachers,
        'teacherTrend', v_new_teachers,
        'totalParents', v_total_parents,
        'parentTrend', v_new_parents,
        'overdueFees', v_overdue_fees
    );
END;
$$;

COMMIT;
