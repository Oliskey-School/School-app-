-- Migration: Fix get_dashboard_stats to include NULL branch_id in branch counts
-- Description: Updates the branch filtering to include records where branch_id is NULL, matching frontend behavior.

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
    -- 1. Students Count (Match logic: specific branch OR null branch)
    SELECT COUNT(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);

    -- 2. Teachers Count
    SELECT COUNT(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);

    -- 3. Parents Count
    SELECT COUNT(*) INTO v_total_parents
    FROM public.parents
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);

    -- 4. Classes Count
    SELECT COUNT(*) INTO v_total_classes
    FROM public.classes
    WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);

    -- 5. Overdue Fees Count
    SELECT COUNT(*) INTO v_overdue_fees
    FROM public.student_fees
    WHERE school_id = p_school_id
    AND status = 'Overdue'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);

    -- 6. Unpublished Reports Count
    SELECT COUNT(*) INTO v_unpublished_reports
    FROM public.report_cards
    WHERE school_id = p_school_id
    AND status = 'Draft'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);

    -- 7. Trends (Student Trend)
    SELECT COUNT(*) INTO v_student_trend
    FROM public.students
    WHERE school_id = p_school_id
    AND created_at > (NOW() - INTERVAL '30 days')
    AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL);
    
    v_teacher_trend := 0;
    v_parent_trend := 0;
    v_class_trend := 0;

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

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO service_role;
