-- Assign classes to Demo Teacher to fix "Classes Taught" and "Total Students" counts
DO $$
DECLARE
    v_teacher_id UUID;
    v_school_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Get the teacher ID
    SELECT id INTO v_teacher_id FROM public.teachers WHERE email = 'teacher@demo.com';

    -- Proceed only if teacher exists
    IF v_teacher_id IS NOT NULL THEN
        
        -- Delete existing class assignments for this teacher to avoid duplicates if re-run
        DELETE FROM public.teacher_classes WHERE teacher_id = v_teacher_id;

        -- Assign Class 10A
        INSERT INTO public.teacher_classes (teacher_id, class_name, school_id)
        VALUES (v_teacher_id, '10A', v_school_id);

        -- Assign Class 10B (since we saw students in 10B too)
        INSERT
         INTO public.teacher_classes (teacher_id, class_name, school_id)
        VALUES (v_teacher_id, '10B', v_school_id);
        
        -- Also ensure teacher_subjects is populated for completeness (though not strictly asked)
        INSERT INTO public.teacher_subjects (teacher_id, subject)
        SELECT v_teacher_id, 'Mathematics'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.teacher_subjects 
            WHERE teacher_id = v_teacher_id AND subject = 'Mathematics'
        );

    END IF;
END $$;
