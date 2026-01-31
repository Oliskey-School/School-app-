-- Migration: Final UI Visibility Fix V3
-- Description: Ensures all demo accounts have profiles, memberships (with mapped roles), and correct role data alignment.

BEGIN;

DO $$
DECLARE
    v_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_branch_id UUID;
    v_class_id UUID;
    v_user RECORD;
    v_base_role TEXT;
BEGIN
    -- 1. Get correct branch and class IDs
    SELECT id INTO v_branch_id FROM public.branches WHERE school_id = v_school_id AND is_main = true LIMIT 1;
    SELECT id INTO v_class_id FROM public.classes WHERE school_id = v_school_id AND name = 'JSS 1' LIMIT 1;

    -- 2. Ensure all demo users have profiles and correct school_id
    FOR v_user IN 
        SELECT id, email, full_name, role FROM public.users WHERE email LIKE '%@demo.com'
    LOOP
        -- Create/Update Profile
        INSERT INTO public.profiles (id, school_id, full_name, role)
        VALUES (v_user.id, v_school_id, v_user.full_name, v_user.role)
        ON CONFLICT (id) DO UPDATE SET 
            school_id = v_school_id,
            role = v_user.role,
            full_name = v_user.full_name;

        -- Map roles to allowed school_memberships.base_role values
        v_base_role := CASE 
            WHEN v_user.role IN ('student', 'parent', 'teacher') THEN v_user.role
            WHEN v_user.role IN ('admin', 'school_admin') THEN 'school_admin'
            WHEN v_user.role IN ('proprietor', 'principal') THEN 'principal'
            WHEN v_user.role IN ('inspector', 'examofficer', 'complianceofficer', 'staff') THEN 'staff'
            ELSE 'staff'
        END;

        -- Create/Update Membership
        INSERT INTO public.school_memberships (school_id, user_id, base_role, is_active)
        VALUES (v_school_id, v_user.id, v_base_role, true)
        ON CONFLICT (school_id, user_id) DO UPDATE SET 
            base_role = EXCLUDED.base_role,
            is_active = true;
    END LOOP;

    -- 3. Sync Student Branch/Class assignments
    UPDATE public.students
    SET branch_id = v_branch_id,
        current_class_id = v_class_id
    WHERE school_id = v_school_id;

    -- 4. Sync Teacher Branch assignments
    UPDATE public.teachers
    SET branch_id = v_branch_id
    WHERE school_id = v_school_id;

END $$;

COMMIT;
