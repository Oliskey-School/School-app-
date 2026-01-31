
-- Migration: Fix Signup Conflicts
-- Description: Ensures handle_new_user ignores new_school signups to avoid conflicts with handle_new_school_signup.

BEGIN;

-- 1. Modify handle_new_user to strictly ignore 'new_school' signup flows
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_school_id UUID;
    v_signup_type TEXT;
BEGIN
    -- Check for explicit skip flags
    v_signup_type := new.raw_user_meta_data->>'signup_type';
    
    -- IMPORTANT: If this is a new school signup, DO NOT create a user here.
    -- The handle_new_school_signup trigger will handle it atomically.
    IF v_signup_type = 'new_school' THEN
        RETURN new;
    END IF;

    IF (new.raw_user_meta_data->>'skip_user_creation')::boolean = true THEN
        RETURN new;
    END IF;

    -- Normal flow for invited users or students
    v_role := lower(COALESCE(
        new.raw_user_meta_data->>'role', 
        new.raw_user_meta_data->>'user_type', 
        'student'
    ));

    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;

    IF v_school_id IS NOT NULL THEN
        INSERT INTO public.users (id, school_id, email, full_name, role)
        VALUES (
            new.id,
            v_school_id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', new.email),
            v_role
        )
        ON CONFLICT (id) DO UPDATE SET
            school_id = EXCLUDED.school_id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
