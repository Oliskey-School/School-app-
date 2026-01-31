-- Migration: Link Demo Student to Demo Parent (Final - Schema & Case Correct)
-- Purpose: Ensure the demo accounts have proper profiles and relationships for testing

DO $$
DECLARE
    v_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_student_user_id UUID := '11111111-1111-1111-1111-111111111111';
    v_parent_user_id UUID := '33333333-3333-3333-3333-333333333333';
    v_student_id UUID;
BEGIN
    -- 1. Ensure Demo Parent Profile exists (TITLECASE 'Parent' for profiles)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_parent_user_id) THEN
        INSERT INTO public.profiles (id, full_name, role, school_id)
        VALUES (v_parent_user_id, 'Demo Parent', 'Parent', v_school_id);
        RAISE NOTICE 'Created demo parent profile';
    ELSE
        UPDATE public.profiles SET role = 'Parent', school_id = v_school_id WHERE id = v_parent_user_id;
    END IF;

    -- 2. Ensure Demo Student Profile exists (TITLECASE 'Student' for profiles)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_student_user_id) THEN
        INSERT INTO public.profiles (id, full_name, role, school_id)
        VALUES (v_student_user_id, 'Demo Student', 'Student', v_school_id);
        RAISE NOTICE 'Created demo student profile';
    ELSE
        UPDATE public.profiles SET role = 'Student', school_id = v_school_id WHERE id = v_student_user_id;
    END IF;

    -- 3. Ensure Demo Parent has School Membership (LOWERCASE 'parent' for memberships)
    IF NOT EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = v_parent_user_id) THEN
        INSERT INTO public.school_memberships (school_id, user_id, base_role, is_active, member_public_id)
        VALUES (v_school_id, v_parent_user_id, 'parent', true, 'DEMPAR87199819');
        RAISE NOTICE 'Added parent to school memberships';
    END IF;

    -- 4. Ensure Demo Student has School Membership (LOWERCASE 'student' for memberships)
    IF NOT EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = v_student_user_id) THEN
        INSERT INTO public.school_memberships (school_id, user_id, base_role, is_active, member_public_id)
        VALUES (v_school_id, v_student_user_id, 'student', true, 'DEMSTU92837482');
        RAISE NOTICE 'Added student to school memberships';
    END IF;

    -- 5. Ensure Demo Student is in Students table
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE user_id = v_student_user_id) THEN
        INSERT INTO public.students (school_id, user_id, name, email, admission_number)
        VALUES (v_school_id, v_student_user_id, 'Demo Student', 'student@demo.com', 'STU-DEMO-001')
        RETURNING id INTO v_student_id;
        RAISE NOTICE 'Added student to students table';
    ELSE
        SELECT id INTO v_student_id FROM public.students WHERE user_id = v_student_user_id LIMIT 1;
        UPDATE public.students SET name = 'Demo Student', email = 'student@demo.com' WHERE id = v_student_id;
    END IF;

    -- 6. Link them in student_parent_links
    IF NOT EXISTS (
        SELECT 1 FROM public.student_parent_links 
        WHERE parent_user_id = v_parent_user_id AND student_user_id = v_student_user_id
    ) THEN
        INSERT INTO public.student_parent_links (parent_user_id, student_user_id, relationship, school_id, is_active, is_primary)
        VALUES (v_parent_user_id, v_student_user_id, 'Parent', v_school_id, true, true);
        RAISE NOTICE 'Linked Demo Parent to Demo Student';
    ELSE
        RAISE NOTICE 'Link already exists';
    END IF;

END $$;
