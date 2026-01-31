-- Migration: School Templating Logic
-- Description: Clones data from a Template School to new Schools

-- 1. Create Cloning Function
CREATE OR REPLACE FUNCTION public.clone_school_data(p_source_id UUID, p_target_id UUID)
RETURNS VOID AS $$
DECLARE
    v_class_record RECORD;
    v_new_branch_id UUID;
BEGIN
    -- Get Main Branch of Target School
    SELECT id INTO v_new_branch_id FROM public.branches WHERE school_id = p_target_id AND is_main = true LIMIT 1;

    -- A. Copy Subjects
    -- We copy name, code, category, coefficients. We do NOT copy assigned teachers.
    INSERT INTO public.subjects (school_id, name, code, category, is_active, coefficient)
    SELECT p_target_id, name, code, category, is_active, coefficient
    FROM public.subjects
    WHERE school_id = p_source_id;

    -- B. Copy Classes (Arms/Levels)
    -- We map them to the new school's main branch
    INSERT INTO public.classes (school_id, branch_id, name, level, arm, capacity)
    SELECT p_target_id, v_new_branch_id, name, level, arm, capacity
    FROM public.classes
    WHERE school_id = p_source_id;
    
    -- C. Copy Grading Scales (Assessment Configuration)
    INSERT INTO public.grading_scales (school_id, name, min_score, max_score, grade, remark, is_active)
    SELECT p_target_id, name, min_score, max_score, grade, remark, is_active
    FROM public.grading_scales
    WHERE school_id = p_source_id;

    -- D. Copy Assessment Types (if table exists)
    -- Assuming 'assessment_types' table exists, otherwise skip
    BEGIN
        INSERT INTO public.assessment_types (school_id, name, max_score, weight, category)
        SELECT p_target_id, name, max_score, weight, category
        FROM public.assessment_types
        WHERE school_id = p_source_id;
    EXCEPTION WHEN undefined_table THEN
        NULL; -- Table doesn't exist, skip
    END;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error cloning school data: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the Signup Trigger to USE the Template
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
    BEGIN
        v_generated_id := generate_school_role_id('ADM');
    EXCEPTION WHEN OTHERS THEN
        v_generated_id := 'ADM-' || substring(NEW.id::text, 1, 8);
    END;

    INSERT INTO public.users (id, school_id, email, full_name, name, role, school_generated_id)
    VALUES (NEW.id, v_school_id, NEW.email, v_admin_name, v_admin_name, 'admin', v_generated_id);

    -- 4. Update Auth Metadata
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'),
        '{school_id}', to_jsonb(v_school_id::text)
    )
    WHERE id = NEW.id;

    -- =========================================================
    -- 5. CLONE TEMPLATE DATA (New Logic)
    -- =========================================================
    -- Look for a school with specific ID or slug 'demo'
    -- HARDCODED TEMPLATE ID: d0ff3e95-9b4c-4c12-989c-e5640d3cacd1 (Demo Academy)
    -- Fallback to name search if ID not found
    
    SELECT id INTO v_template_school_id FROM public.schools 
    WHERE id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' OR slug LIKE '%demo%' 
    LIMIT 1;

    IF v_template_school_id IS NOT NULL THEN
        PERFORM public.clone_school_data(v_template_school_id, v_school_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
