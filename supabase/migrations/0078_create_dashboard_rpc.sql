-- Migration: Create get_dashboard_stats RPC function
-- Purpose: Efficiently fetch dashboard counts in a single network request

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    WHERE school_id = p_school_id;

    -- Count Teachers (using school_memberships base_role)
    SELECT count(*) INTO v_total_teachers
    FROM public.school_memberships
    WHERE school_id = p_school_id
    AND base_role = 'teacher'
    AND is_active = true;

    -- Count Parents (using school_memberships base_role)
    SELECT count(*) INTO v_total_parents
    FROM public.school_memberships
    WHERE school_id = p_school_id
    AND base_role = 'parent'
    AND is_active = true;

    -- Calculate Overdue Fees (Sum of unpaid amounts where due_date < now)
    SELECT COALESCE(SUM(total_fee - paid_amount), 0) INTO v_overdue_fees
    FROM public.student_fees
    WHERE school_id = p_school_id
    AND status = 'Overdue';

    -- Return as JSON
    RETURN jsonb_build_object(
        'totalStudents', v_total_students,
        'totalTeachers', v_total_teachers,
        'totalParents', v_total_parents,
        'overdueFees', v_overdue_fees
    );
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
