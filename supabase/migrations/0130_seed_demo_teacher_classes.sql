-- Seed class_teachers for teacher@demo.com
-- Teacher ID (Note: The schema uses teacher_id, which likely refers to the `teachers` table ID, NOT the `auth.users` ID directly if they are separate entities.
-- HOWEVER, in many schemas here, they are used interchangeably or mapped. 
-- Let's check if we need the `teachers.id` or `auth.users.id`.
-- The column is `teacher_id`. Often this is the UUID from the `teachers` table.
-- Let's first get the teacher ID from the teachers table using the user_id.

DO $$
DECLARE
    v_teacher_id uuid;
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_class_id uuid := '88ac1f81-48db-45ad-b1cf-24045607906a'; -- Grade 10
    v_subject_id uuid := 'af359025-22b8-4e77-9336-743961ddfc8a'; -- Mathematics
BEGIN
    -- Get the teacher ID from the teachers table for the demo user
    SELECT id INTO v_teacher_id
    FROM public.teachers
    WHERE user_id = '22222222-2222-2222-2222-222222222222';

    -- If no teacher record exists, we might need to create one or handle it. 
    -- Assuming the teacher record exists from previous steps.
    
    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO public.class_teachers (
            school_id,
            class_id,
            teacher_id,
            subject_id,
            is_class_teacher,
            academic_year
        )
        VALUES (
            v_school_id,
            v_class_id,
            v_teacher_id,
            v_subject_id,
            false,
            '2025-2026'
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Also update the teachers table subjects array
    UPDATE public.teachers
    SET subjects = array_append(subjects, 'Mathematics')
    WHERE id = v_teacher_id
    AND NOT ('Mathematics' = ANY(subjects));
END $$;
