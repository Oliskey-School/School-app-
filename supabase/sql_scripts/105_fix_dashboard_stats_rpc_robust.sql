-- Migration: Fix Dashboard Stats RPC Totals
-- Description: Ensures get_dashboard_stats returns the actual totals from tables, correctly handling parents without children and branch filtering.

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
    -- 1. Count Students
    -- Includes all students regardless of status (Active/Pending/etc)
    SELECT count(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 2. Count Teachers
    SELECT count(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 3. Count Parents
    -- If branch is specified, count parents who have at least one child in that branch.
    -- If branch is NOT specified, count all parents in the school.
    IF p_branch_id IS NULL THEN
        SELECT count(*) INTO v_total_parents
        FROM public.parents
        WHERE school_id = p_school_id;
    ELSE
        SELECT count(DISTINCT p.id) INTO v_total_parents
        FROM public.parents p
        JOIN public.parent_children pc ON p.id = pc.parent_id
        JOIN public.students s ON pc.student_id = s.id
        WHERE p.school_id = p_school_id
        AND s.branch_id = p_branch_id;
    END IF;

    -- 4. Calculate Overdue Fees
    -- Sum of remaining balance for 'Overdue' fees
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
        'totalTeachers', v_total_teachers,
        'totalParents', v_total_parents,
        'overdueFees', v_overdue_fees
    );
END;
$$;

COMMIT;
