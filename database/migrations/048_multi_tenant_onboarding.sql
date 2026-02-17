-- Migration: Multi-Tenant Onboarding Triggers
-- Description: Automates School and Admin creation on auth.signup

-- 1. Function to handle new school registration
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
BEGIN
    -- Check metadata for 'school_name' to identify School Signups
    v_school_name := NEW.raw_user_meta_data->>'school_name';
    
    IF v_school_name IS NULL THEN
        -- Not a school signup
        RETURN NEW;
    END IF;

    v_admin_name := NEW.raw_user_meta_data->>'full_name';
    v_motto := NEW.raw_user_meta_data->>'motto';
    v_address := NEW.raw_user_meta_data->>'address';
    
    -- Generate Slug (lowercase, hyphenated, plus random suffix for uniqueness)
    v_slug := lower(regexp_replace(v_school_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_slug || '-' || substring(md5(random()::text), 1, 4);

    -- 1. Create School
    INSERT INTO public.schools (name, slug, subscription_status, motto, address, contact_email)
    VALUES (
        v_school_name,
        v_slug,
        'trial', -- Default to trial
        v_motto,
        v_address,
        NEW.email
    )
    RETURNING id INTO v_school_id;

    -- 2. Create Main Branch
    INSERT INTO public.branches (school_id, name, is_main, location)
    VALUES (v_school_id, 'Main Campus', true, COALESCE(v_address, 'Main Address'));

    -- 3. Generate Custom ID (if function exists, else fallback)
    -- We assume generate_school_role_id exists from 0084 migration
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

    -- 5. Update Auth Metadata (so session has school_id immediately)
    -- We use a simplified update here to avoid recursion if there are other triggers
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

-- 2. Trigger Definition
DROP TRIGGER IF EXISTS on_auth_user_created_school ON auth.users;
CREATE TRIGGER on_auth_user_created_school
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_school_signup();

-- 3. Ensure generate_school_role_id handles generic inputs if not already doing so
-- (Re-applying or ensuring it exists logic is good practice)
-- Explicitly granting permissions ensuring standard roles can trigger this via signup
GRANT EXECUTE ON FUNCTION public.handle_new_school_signup TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_school_signup TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_school_signup TO supabase_auth_admin;
