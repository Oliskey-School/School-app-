-- Migration: Link existing Demo Parent to a Demo Student
-- Purpose: Ensure the parent account has a child to view on the dashboard

DO $$
DECLARE
    v_parent_id UUID;
    v_student_id UUID;
    v_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    -- 1. Get the existing Parent User ID
    SELECT user_id INTO v_parent_id
    FROM public.school_memberships
    WHERE school_id = v_school_id
    AND base_role = 'parent'
    LIMIT 1;

    -- 2. Get a random Student User ID
    SELECT user_id INTO v_student_id
    FROM public.students
    WHERE school_id = v_school_id
    AND user_id IS NOT NULL
    LIMIT 1;

    -- 3. Link them if both exist and not already linked
    IF v_parent_id IS NOT NULL AND v_student_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.student_parent_links 
            WHERE parent_user_id = v_parent_id AND student_user_id = v_student_id
        ) THEN
            INSERT INTO public.student_parent_links (parent_user_id, student_user_id, relationship, school_id)
            VALUES (v_parent_id, v_student_id, 'Parent', v_school_id);
            
            RAISE NOTICE 'Linked Parent % to Student %', v_parent_id, v_student_id;
        ELSE
            RAISE NOTICE 'Link already exists';
        END IF;
    ELSE
        RAISE NOTICE 'Missing Parent or Student data. Parent: %, Student: %', v_parent_id, v_student_id;
    END IF;
END $$;
