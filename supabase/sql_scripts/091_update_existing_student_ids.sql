-- Migration: Standardize all existing school_generated_ids
-- Description: Iterates through all users and updates their school_generated_id if it doesn't match the new standard.

DO $$
DECLARE
    v_rec RECORD;
    v_new_id TEXT;
BEGIN
    -- 1. Update Students
    FOR v_rec IN (SELECT id, school_id, branch_id FROM public.students) LOOP
        v_new_id := public.generate_school_id(v_rec.school_id, v_rec.branch_id, 'student');
        UPDATE public.students SET school_generated_id = v_new_id WHERE id = v_rec.id;
    END LOOP;

    -- 2. Update Teachers
    FOR v_rec IN (SELECT id, school_id, branch_id FROM public.teachers) LOOP
        v_new_id := public.generate_school_id(v_rec.school_id, v_rec.branch_id, 'teacher');
        UPDATE public.teachers SET school_generated_id = v_new_id WHERE id = v_rec.id;
    END LOOP;

    -- 3. Update Parents
    FOR v_rec IN (SELECT id, school_id FROM public.parents) LOOP
        -- Parents often don't have a branch_id column or it's NULL
        v_new_id := public.generate_school_id(v_rec.school_id, NULL, 'parent');
        UPDATE public.parents SET school_generated_id = v_new_id WHERE id = v_rec.id;
    END LOOP;

    -- 4. Update Admin Profiles (if they have school_generated_id)
    -- Checking profiles for Admins
    FOR v_rec IN (SELECT id, school_id FROM public.profiles WHERE role ILIKE 'admin' OR role ILIKE 'Admin') LOOP
        v_new_id := public.generate_school_id(v_rec.school_id, NULL, 'admin');
        UPDATE public.profiles SET school_generated_id = v_new_id WHERE id = v_rec.id;
    END LOOP;

END $$;
