-- Migration: Update get_dashboard_stats to include unpublished reports count
-- Description: Adds overdueFees and unpublishedReports count to the dashboard statistics RPC.

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_school_id UUID, p_branch_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_total_students INT;
    v_total_teachers INT;
    v_total_parents INT;
    v_total_classes INT;
    v_overdue_fees INT;
    v_unpublished_reports INT;
    v_student_trend INT;
    v_teacher_trend INT;
    v_parent_trend INT;
    v_class_trend INT;
BEGIN
    -- 1. Students Count
    SELECT COUNT(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 2. Teachers Count
    SELECT COUNT(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 3. Parents Count
    SELECT COUNT(*) INTO v_total_parents
    FROM public.parents
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 4. Classes Count
    SELECT COUNT(*) INTO v_total_classes
    FROM public.classes
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 5. Overdue Fees Count (Simplified)
    SELECT COUNT(*) INTO v_overdue_fees
    FROM public.student_fees
    WHERE school_id = p_school_id
    AND status = 'Overdue'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 6. Unpublished (Submitted) Reports Count
    SELECT COUNT(*) INTO v_unpublished_reports
    FROM public.report_cards
    WHERE school_id = p_school_id
    AND status = 'Submitted'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    -- 7. Trends (Mocked for now as we don't have historical snapshot table yet)
    v_student_trend := 5;
    v_teacher_trend := 2;
    v_parent_trend := 4;
    v_class_trend := 1;

    RETURN jsonb_build_object(
        'totalStudents', v_total_students,
        'studentTrend', v_student_trend,
        'totalTeachers', v_total_teachers,
        'teacherTrend', v_teacher_trend,
        'totalParents', v_total_parents,
        'parentTrend', v_parent_trend,
        'totalClasses', v_total_classes,
        'classTrend', v_class_trend,
        'overdueFees', v_overdue_fees,
        'unpublishedReports', v_unpublished_reports
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
