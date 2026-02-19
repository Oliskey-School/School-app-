-- Function to safely link a parent to a student using the student's unique ID code
CREATE OR REPLACE FUNCTION link_student_to_parent(
    p_student_code TEXT,
    p_relationship TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_student_user_id UUID;
    v_school_id UUID;
    v_parent_user_id UUID;
    v_existing_link_id UUID;
BEGIN
    -- Get the calling user's ID (the parent)
    v_parent_user_id := auth.uid();
    IF v_parent_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find the student by their school_generated_id (e.g., SCH-001-STU-1001)
    SELECT id, user_id, school_id 
    INTO v_student_id, v_student_user_id, v_school_id
    FROM public.students
    WHERE school_generated_id = p_student_code;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found with that ID');
    END IF;

    -- Check if link already exists
    SELECT id INTO v_existing_link_id
    FROM public.student_parent_links
    WHERE parent_user_id = v_parent_user_id AND student_user_id = v_student_user_id;

    IF v_existing_link_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already linked to this student');
    END IF;

    -- Create the link
    INSERT INTO public.student_parent_links (
        parent_user_id,
        student_user_id,
        relationship,
        school_id,
        is_active,
        is_primary
    ) VALUES (
        v_parent_user_id,
        v_student_user_id,
        p_relationship,
        v_school_id,
        true,
        false -- Default to false, can be updated later
    );

    RETURN jsonb_build_object('success', true, 'message', 'Successfully linked to student');
END;
$$;
