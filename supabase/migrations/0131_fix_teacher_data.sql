-- Fix teacher data for "New Teacher" to enable appointment booking and assignment creation
-- Linking "New Teacher" (f1391659-8083-468a-9ba8-c2874edb9128) to auth user "student18@demo.com" (905eb60a-b29e-4e0d-bf6c-9cb42a65a82b)

DO $$
DECLARE
    v_teacher_id uuid := 'f1391659-8083-468a-9ba8-c2874edb9128';
    v_user_id uuid := '905eb60a-b29e-4e0d-bf6c-9cb42a65a82b'; -- student18@demo.com repurposed
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_class_id uuid := '88ac1f81-48db-45ad-b1cf-24045607906a'; -- Grade 10
    v_subject_id uuid := 'af359025-22b8-4e77-9336-743961ddfc8a'; -- Mathematics (or maybe create a new one like English if needed, but Math is fine for test)
BEGIN
    -- 1. Link Teacher to Auth User
    UPDATE public.teachers
    SET user_id = v_user_id,
        status = 'Active' -- Ensure active
    WHERE id = v_teacher_id;

    -- 2. Assign a class to this teacher (Grade 10 Math) so "Create Assignment" works
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
    
    -- 3. Update teacher subjects array
    UPDATE public.teachers
    SET subjects = array_append(subjects, 'Mathematics')
    WHERE id = v_teacher_id
    AND NOT ('Mathematics' = ANY(subjects));

END $$;
