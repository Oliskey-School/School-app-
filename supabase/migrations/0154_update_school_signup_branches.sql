-- Migration: Update School Signup to handle multiple branches
-- Description: Updates the handle_new_school_signup function to create multiple branches if provided in metadata.

CREATE OR REPLACE FUNCTION public.handle_new_school_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_slug TEXT;
    v_school_name TEXT;
    v_admin_name TEXT;
    v_motto TEXT;
    v_address TEXT;
    v_generated_id TEXT;
    v_branch_names TEXT[];
    v_branch_name TEXT;
    v_is_first_branch BOOLEAN := true;
BEGIN
    -- Check metadata for 'school_name' to identify School Signups
    v_school_name := NEW.raw_user_meta_data->>'school_name';
    
    IF v_school_name IS NULL THEN
        RETURN NEW;
    END IF;

    v_admin_name := NEW.raw_user_meta_data->>'full_name';
    v_motto := NEW.raw_user_meta_data->>'motto';
    v_address := NEW.raw_user_meta_data->>'address';
    
    -- Extract branch names from metadata
    IF NEW.raw_user_meta_data ? 'branch_names' THEN
        v_branch_names := ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'branch_names'));
    ELSE
        v_branch_names := ARRAY['Main Campus'];
    END IF;
    
    -- Generate Slug
    v_slug := lower(regexp_replace(v_school_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_slug || '-' || substring(md5(random()::text), 1, 4);

    -- 1. Create School
    INSERT INTO public.schools (name, slug, subscription_status, motto, address, contact_email)
    VALUES (
        v_school_name,
        v_slug,
        'trial',
        v_motto,
        v_address,
        NEW.email
    )
    RETURNING id INTO v_school_id;

    -- 2. Create Branches
    FOREACH v_branch_name IN ARRAY v_branch_names
    LOOP
        INSERT INTO public.branches (school_id, name, is_main, location)
        VALUES (v_school_id, v_branch_name, v_is_first_branch, COALESCE(v_address, 'Address not set'));
        v_is_first_branch := false;
    END LOOP;

    -- 3. Generate Custom ID
    BEGIN
        v_generated_id := generate_school_role_id('ADM');
    EXCEPTION WHEN OTHERS THEN
        v_generated_id := 'ADM-' || substring(NEW.id::text, 1, 8);
    END;

    -- 4. Create Admin Profile in public.users
    INSERT INTO public.users (id, school_id, email, full_name, name, role, school_generated_id)
    VALUES (
        NEW.id,
        v_school_id,
        NEW.email,
        v_admin_name,
        v_admin_name,
        'admin',
        v_generated_id
    );

    -- 5. Update Auth Metadata
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        jsonb_set(
            COALESCE(raw_app_meta_data, '{}'::jsonb),
            '{role}',
            '"admin"'
        ),
        '{school_id}',
        to_jsonb(v_school_id::text)
    )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
