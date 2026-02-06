-- Migration: Seed Demo Connectivity
-- Description: Ensures all demo users are linked to the same school and have proper role entries.

BEGIN;

DO $$
DECLARE
    v_school_id uuid;
    v_admin_id uuid;
    v_proprietor_id uuid;
    v_teacher_id uuid;
    v_student_id uuid;
    v_parent_id uuid;
BEGIN
    -- 1. Get or Create "Demo School"
    SELECT id INTO v_school_id FROM public.schools WHERE name = 'Demo School' LIMIT 1;
    
    IF v_school_id IS NULL THEN
        INSERT INTO public.schools (name, slug, subscription_status, plan_type)
        VALUES ('Demo School', 'demo-school', 'active', 'premium')
        RETURNING id INTO v_school_id;
    END IF;

    -- 2. Link Admin (admin@demo.com)
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@demo.com';
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, school_id, email, full_name, role)
        VALUES (v_admin_id, v_school_id, 'admin@demo.com', 'Demo Admin', 'super_admin')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id, role = 'super_admin';
    END IF;

    -- 3. Link Teacher (teacher@demo.com)
    SELECT id INTO v_teacher_id FROM auth.users WHERE email = 'teacher@demo.com';
    IF v_teacher_id IS NOT NULL THEN
        -- Profile
        INSERT INTO public.profiles (id, school_id, email, full_name, role)
        VALUES (v_teacher_id, v_school_id, 'teacher@demo.com', 'Demo Teacher', 'teacher')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id, role = 'teacher';

        -- Cleanup potential conflict: delete if email exists but ID is different
        DELETE FROM public.teachers WHERE email = 'teacher@demo.com' AND id != v_teacher_id;

        -- Teacher Record
        INSERT INTO public.teachers (id, user_id, school_id, name, email, subject_specialization)
        VALUES (v_teacher_id, v_teacher_id, v_school_id, 'Demo Teacher', 'teacher@demo.com', '{"General"}')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id;
    END IF;

    -- 4. Link Student (student@demo.com)
    SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@demo.com';
    IF v_student_id IS NOT NULL THEN
        -- Profile
        INSERT INTO public.profiles (id, school_id, email, full_name, role)
        VALUES (v_student_id, v_school_id, 'student@demo.com', 'Demo Student', 'student')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id, role = 'student';

        -- Cleanup potential conflict
        DELETE FROM public.students WHERE email = 'student@demo.com' AND id != v_student_id;

        -- Student Record
        INSERT INTO public.students (id, user_id, school_id, name, email, grade, section)
        VALUES (v_student_id, v_student_id, v_school_id, 'Demo Student', 'student@demo.com', 10, 'A')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id;
    END IF;

    -- 5. Link Parent (parent@demo.com)
    SELECT id INTO v_parent_id FROM auth.users WHERE email = 'parent@demo.com';
    IF v_parent_id IS NOT NULL THEN
        -- Profile
        INSERT INTO public.profiles (id, school_id, email, full_name, role)
        VALUES (v_parent_id, v_school_id, 'parent@demo.com', 'Demo Parent', 'parent')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id, role = 'parent';

        -- Cleanup potential conflict
        DELETE FROM public.parents WHERE email = 'parent@demo.com' AND id != v_parent_id;

        -- Parent Record
        INSERT INTO public.parents (id, user_id, school_id, name, email, phone)
        VALUES (v_parent_id, v_parent_id, v_school_id, 'Demo Parent', 'parent@demo.com', '555-0100')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id;

        -- Link Parent to Student
        IF v_student_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM public.parent_children WHERE parent_id = v_parent_id AND student_id = v_student_id) THEN
                INSERT INTO public.parent_children (parent_id, student_id, school_id)
                VALUES (v_parent_id, v_student_id, v_school_id);
            END IF;
        END IF;
    END IF;

    -- 6. Link Proprietor (proprietor@demo.com)
    SELECT id INTO v_proprietor_id FROM auth.users WHERE email = 'proprietor@demo.com';
    IF v_proprietor_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, school_id, email, full_name, role)
        VALUES (v_proprietor_id, v_school_id, 'proprietor@demo.com', 'Demo Proprietor', 'proprietor')
        ON CONFLICT (id) DO UPDATE SET school_id = v_school_id, role = 'proprietor';
    END IF;

END $$;

COMMIT;
