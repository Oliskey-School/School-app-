-- Migration: Sync Demo Data Final
-- Description: Ensures all demo accounts have their public.users entries AND role-specific table entries (teachers, parents, etc.)

BEGIN;

DO $$
DECLARE
    v_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_student_id UUID := '11111111-1111-1111-1111-111111111111';
    v_parent_id UUID := '33333333-3333-3333-3333-333333333333';
    v_teacher_id UUID := '22222222-2222-2222-2222-222222222222';
    v_admin_id UUID := '44444444-4444-4444-4444-444444444444';
    v_proprietor_id UUID := '55555555-5555-5555-5555-555555555555';
    v_inspector_id UUID := '66666666-6666-6666-6666-666666666666';
    v_exam_id UUID := '77777777-7777-7777-7777-777777777777';
    v_compliance_id UUID := '88888888-8888-8888-8888-888888888888';
    
    v_branch_id UUID;
    v_class_id UUID;
BEGIN
    -- 0. Ensure Demo School Exists
    INSERT INTO public.schools (id, name, slug, subscription_status, is_active)
    VALUES (v_school_id, 'Oliskey Demo School', 'oliskey-demo', 'active', true)
    ON CONFLICT (id) DO UPDATE SET is_active = true, subscription_status = 'active', name = 'Oliskey Demo School', slug = 'oliskey-demo';

    -- Ensure a main branch exists
    INSERT INTO public.branches (school_id, name, is_main, location)
    VALUES (v_school_id, 'Main Campus', true, 'Demo Address')
    ON CONFLICT (school_id, name) DO NOTHING;
    
    SELECT id INTO v_branch_id FROM public.branches WHERE school_id = v_school_id AND is_main = true LIMIT 1;

    -- Ensure a class exists for the student
    INSERT INTO public.classes (school_id, branch_id, name, level, section)
    VALUES (v_school_id, v_branch_id, 'JSS 1', 'Secondary', 'A')
    ON CONFLICT (school_id, name) DO NOTHING;

    SELECT id INTO v_class_id FROM public.classes WHERE school_id = v_school_id AND name = 'JSS 1' LIMIT 1;

    -- 1. TEACHER
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_teacher_id, v_school_id, 'teacher@demo.com', 'Demo Teacher', 'teacher')
    ON CONFLICT (id) DO UPDATE SET role = 'teacher', school_id = v_school_id;

    IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = v_teacher_id) THEN
        INSERT INTO public.teachers (user_id, school_id, branch_id, name, email)
        VALUES (v_teacher_id, v_school_id, v_branch_id, 'Demo Teacher', 'teacher@demo.com');
    END IF;

    -- 2. STUDENT
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_student_id, v_school_id, 'student@demo.com', 'Demo Student', 'student')
    ON CONFLICT (id) DO UPDATE SET role = 'student', school_id = v_school_id;

    IF NOT EXISTS (SELECT 1 FROM public.students WHERE user_id = v_student_id) THEN
        INSERT INTO public.students (user_id, school_id, branch_id, current_class_id)
        VALUES (v_student_id, v_school_id, v_branch_id, v_class_id);
    END IF;

    -- 3. PARENT
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_parent_id, v_school_id, 'parent@demo.com', 'Demo Parent', 'parent')
    ON CONFLICT (id) DO UPDATE SET role = 'parent', school_id = v_school_id;

    IF NOT EXISTS (SELECT 1 FROM public.parents WHERE user_id = v_parent_id) THEN
        INSERT INTO public.parents (user_id, school_id, name, email, phone, address)
        VALUES (v_parent_id, v_school_id, 'Demo Parent', 'parent@demo.com', '555-0101', '123 Demo Lane');
    END IF;

    -- 4. LINK PARENT <-> STUDENT
    IF NOT EXISTS (SELECT 1 FROM public.student_parent_links WHERE parent_user_id = v_parent_id AND student_user_id = v_student_id) THEN
        INSERT INTO public.student_parent_links (parent_user_id, student_user_id, school_id, relationship, is_active)
        VALUES (v_parent_id, v_student_id, v_school_id, 'Parent', true);
    END IF;

    -- 5. ADMIN
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_admin_id, v_school_id, 'admin@demo.com', 'Demo Admin', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', school_id = v_school_id;
    
    -- 6. INSPECTOR 
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_inspector_id, v_school_id, 'inspector@demo.com', 'Demo Inspector', 'inspector')
    ON CONFLICT (id) DO UPDATE SET role = 'inspector', school_id = v_school_id;

    -- 7. PROPRIETOR
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_proprietor_id, v_school_id, 'proprietor@demo.com', 'Demo Proprietor', 'proprietor')
    ON CONFLICT (id) DO UPDATE SET role = 'proprietor', school_id = v_school_id;

    -- 8. EXAM OFFICER
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_exam_id, v_school_id, 'examofficer@demo.com', 'Demo Exam Officer', 'examofficer')
    ON CONFLICT (id) DO UPDATE SET role = 'examofficer', school_id = v_school_id;

    -- 9. COMPLIANCE
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (v_compliance_id, v_school_id, 'compliance@demo.com', 'Demo Compliance', 'complianceofficer')
    ON CONFLICT (id) DO UPDATE SET role = 'complianceofficer', school_id = v_school_id;

END $$;

COMMIT;
