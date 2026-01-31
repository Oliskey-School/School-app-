
-- Migration: Fix Column Name in Signup Trigger
-- Description: Updates handle_new_school_signup to use 'custom_id' instead of non-existent 'school_generated_id'.

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
    v_template_school_id UUID;
BEGIN
    -- Wrap in block to catch errors
    BEGIN
        -- Check metadata
        v_school_name := NEW.raw_user_meta_data->>'school_name';
        IF v_school_name IS NULL THEN
            RETURN NEW;
        END IF;

        v_admin_name := NEW.raw_user_meta_data->>'full_name';
        v_motto := NEW.raw_user_meta_data->>'motto';
        v_address := NEW.raw_user_meta_data->>'address';
        
        -- Generate Slug
        v_slug := lower(regexp_replace(v_school_name, '[^a-zA-Z0-9]', '-', 'g'));
        v_slug := v_slug || '-' || substring(md5(random()::text), 1, 4);

        -- 1. Create School
        INSERT INTO public.schools (name, slug, subscription_status, motto, address, contact_email)
        VALUES (v_school_name, v_slug, 'trial', v_motto, v_address, NEW.email)
        RETURNING id INTO v_school_id;

        -- 2. Create Main Branch
        INSERT INTO public.branches (school_id, name, is_main, location)
        VALUES (v_school_id, 'Main Campus', true, COALESCE(v_address, 'Main Address'));

        -- 3. Create Admin Profile
        -- Generate temporary ID (Trigger tr_set_custom_id might override or use this if allowed)
        v_generated_id := 'ADM-' || substring(NEW.id::text, 1, 8);

        -- FIXED: Used 'custom_id' instead of 'school_generated_id'
        INSERT INTO public.users (id, school_id, email, full_name, name, role, custom_id)
        VALUES (NEW.id, v_school_id, NEW.email, v_admin_name, v_admin_name, 'admin', v_generated_id);

        -- 4. Update Auth Metadata
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
            jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'),
            '{school_id}', to_jsonb(v_school_id::text)
        )
        WHERE id = NEW.id;

        -- 5. Template Cloning
        SELECT id INTO v_template_school_id FROM public.schools 
        WHERE id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' OR slug LIKE '%demo%' 
        LIMIT 1;

        IF v_template_school_id IS NOT NULL THEN
            PERFORM public.clone_school_data(v_template_school_id, v_school_id);
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Signup Trigger Failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
