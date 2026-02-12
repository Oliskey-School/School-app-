-- Migration: Add Teacher Analytics RPC
-- Description: Adds a function to calculate real-time analytics for teachers (Attendance, Students, Classes, Performance).

CREATE OR REPLACE FUNCTION public.get_teacher_analytics(
  p_teacher_id UUID,
  p_school_id UUID
)
RETURNS TABLE (
  total_students BIGINT,
  total_classes BIGINT,
  attendance_rate NUMERIC,
  avg_student_score NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_students BIGINT;
  v_total_classes BIGINT;
  v_attendance_rate NUMERIC;
  v_avg_student_score NUMERIC;
  v_total_attendance_days BIGINT;
  v_present_days BIGINT;
BEGIN
  -- 1. Total Classes
  SELECT COUNT(*)
  INTO v_total_classes
  FROM public.class_teachers
  WHERE teacher_id = p_teacher_id;

  -- 2. Total Students
  -- Count unique students in the classes assigned to this teacher
  SELECT COUNT(DISTINCT s.id)
  INTO v_total_students
  FROM public.students s
  JOIN public.class_teachers ct ON s.current_class_id = ct.class_id
  WHERE ct.teacher_id = p_teacher_id
  AND s.school_id = p_school_id
  AND s.status = 'Active';

  -- 3. Attendance Rate
  -- Calculate percentage of 'Present' or 'Late' vs total records
  SELECT COUNT(*)
  INTO v_total_attendance_days
  FROM public.teacher_attendance
  WHERE teacher_id = p_teacher_id
  AND school_id = p_school_id;

  IF v_total_attendance_days > 0 THEN
    SELECT COUNT(*)
    INTO v_present_days
    FROM public.teacher_attendance
    WHERE teacher_id = p_teacher_id
    AND school_id = p_school_id
    AND status IN ('Present', 'Late'); -- Late counts as present for rate? Or maybe half? Let's count as present for now.
    
    v_attendance_rate := (v_present_days::NUMERIC / v_total_attendance_days::NUMERIC) * 100;
  ELSE
    v_attendance_rate := NULL; -- No data
  END IF;

  -- 4. Avg Student Score
  -- Average score of all exam results for students in classes taught by this teacher
  -- This is a bit heavy, maybe optimize later.
  -- Strategy: Get average score of students in the classes this teacher teaches
  SELECT AVG(er.score)
  INTO v_avg_student_score
  FROM public.exam_results er
  JOIN public.students s ON er.student_id = s.id
  JOIN public.class_teachers ct ON s.current_class_id = ct.class_id
  WHERE ct.teacher_id = p_teacher_id
  AND er.school_id = p_school_id;

  RETURN QUERY SELECT 
    COALESCE(v_total_students, 0),
    COALESCE(v_total_classes, 0),
    ROUND(COALESCE(v_attendance_rate, 100), 1), -- Default to 100% if no data? Or 0? Let's say 100 for morale if new.
    ROUND(COALESCE(v_avg_student_score, 0), 1);
END;
$$;
